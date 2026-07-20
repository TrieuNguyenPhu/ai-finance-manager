# Plan: Redis, k6 và GitHub Actions

## Mục tiêu

Bổ sung nền tảng kiểm thử và vận hành cho `ai-finance-manager` theo hướng
local-first:

- Redis chạy local bằng Docker Compose, không thay thế PostgreSQL và không trở
  thành nguồn sự thật của ledger.
- k6 kiểm thử tải từ bên ngoài qua `gateway-service`, không gọi trực tiếp các
  domain service.
- GitHub Actions tự động kiểm tra các stack Java, Go, Python và Next.js; load
  test được kiểm soát riêng để không làm CI của pull request phụ thuộc vào
  môi trường production.

## Baseline đã xác nhận

- `infra/docker-compose.yml` hiện chỉ có PostgreSQL.
- `gateway-service` đang rate-limit bằng state trong process (`_windows`), nên
  nhiều instance sẽ không chia sẻ quota.
- Browser chỉ gọi `gateway-service`; gateway có `GET /health`, endpoint cấp
  dev token và các route authenticated dưới `/api/v1/*`.
- Makefile đã có các target `test`, `lint`, `build`, `verify`.
- Chưa có `.github/workflows/` hoặc thư mục k6.
- ADR 0004 yêu cầu local-complete trước AWS và hiện loại ElastiCache khỏi MVP.

## Quyết định thiết kế đề xuất

### Redis

1. Thêm một service Redis vào Compose với volume/retention tối thiểu phù hợp
   cho dữ liệu tạm và healthcheck. Không bật persistence như một yêu cầu khôi
   phục dữ liệu tài chính.
2. Ưu tiên dùng Redis cho distributed rate limiting của gateway, với TTL và
   hành vi fail-closed/fail-open được quyết định rõ trong implementation. Nếu
   Redis lỗi, phải có fallback an toàn cho local development và không làm thay
   đổi tính đúng đắn của ledger.
3. Chỉ thêm cache cho các read model phù hợp sau khi xác định endpoint, key
   theo `JWT sub`, TTL, invalidation và rủi ro dữ liệu cũ. Không cache các write
   ledger, idempotency record hoặc dữ liệu nhạy cảm nếu chưa có chính sách rõ.
4. Tên biến môi trường, client library và key namespace phải được chốt từ code
   hiện hữu trong lúc triển khai; không ghi secret Redis thật vào repo.
5. AWS/ElastiCache không nằm trong phase đầu. Nếu cần production Redis, tạo
   ADR hoặc cập nhật ADR 0004 sau khi có số liệu tải và quyết định chi phí.

### Khuyến nghị công nghệ cho công việc bất đồng bộ

#### Quyết định chính

Chọn **transactional outbox trên PostgreSQL → Amazon SQS → consumer Go/Lambda**
cho các event `transaction.*` gửi tới budget, analytics và notification. Đây là
lựa chọn khớp với ADR 0004, tận dụng outbox và bảng `processed_events` đã có,
đồng thời giữ chi phí và số thành phần thấp cho quy mô ban đầu dưới 100 user.

- `transaction-service` ghi ledger và outbox trong cùng transaction PostgreSQL.
- Một relay đọc outbox, publish cùng event envelope tới queue riêng cho từng
  consumer: budget, analytics và notification. Không dùng một queue dùng chung
  nếu cả ba consumer đều phải nhận mọi event.
- Dùng **SQS Standard** trước; chấp nhận at-least-once delivery và yêu cầu
  consumer idempotent bằng `eventId`/`processed_events`. Chỉ chuyển sang FIFO khi
  có yêu cầu ordering cụ thể được chứng minh bằng test hoặc production metrics.
- Mỗi queue có một **dead-letter queue (DLQ)**, visibility timeout, redrive
  policy và giới hạn retry. Poison message phải vào DLQ để điều tra, không retry
  vô hạn.
- Local dùng **LocalStack SQS** cùng Docker Compose. Các consumer Go có thể
  chạy như process worker để debug; production dùng Lambda event source mapping
  hoặc worker Go tùy giới hạn runtime của từng consumer.
- Giữ application handler độc lập với transport: HTTP `/internal/events` hiện
  có thể được dùng làm adapter chuyển tiếp trong phase migration, nhưng không
  phải contract async cuối cùng.

#### Phân công công nghệ

| Nhu cầu | Công nghệ đề xuất | Lý do / boundary |
|---|---|---|
| Bảo đảm ghi event cùng ledger | PostgreSQL transactional outbox | Không mất event giữa commit ledger và publish. |
| Durable transport | SQS Standard | Khớp AWS/Lambda, retry và DLQ; không cần broker tự vận hành. |
| Local async infra | LocalStack SQS | Mô phỏng contract SQS mà không cần AWS account trong local/CI. |
| Consumer hiện tại | Go service handler | Budget, analytics, notification đã là Go và có dedupe DB. |
| Production execution | Lambda + SQS event source mapping hoặc Go worker | Chọn theo timeout, throughput và chi phí thực đo. |
| Retry / poison message | SQS visibility timeout + DLQ | Tách lỗi tạm thời khỏi message cần điều tra. |
| Dedupe | `processed_events` trong DB của từng domain | At-least-once không tạo side effect lặp. |
| Scheduled async work sau này | EventBridge Scheduler → SQS/Lambda | Chỉ thêm khi có recurring jobs; không dùng GitHub Actions làm scheduler production. |

#### Những công nghệ chưa chọn

- **Redis Lists/Streams** không dùng làm durable queue cho domain events. Redis
  vẫn phục vụ rate limit/cache; Streams chỉ được xem xét cho workload latency
  thấp, mất được khi Redis reset, và phải có owner/retry semantics riêng.
- Không thêm Kafka, RabbitMQ, Celery hay Temporal ở phase này: chúng tăng vận
  hành, network và chi phí trong khi hệ thống đã có AWS target là SQS và chưa có
  workflow dài cần orchestration.
- Không dùng SNS/EventBridge làm lớp fan-out ban đầu. Có thể đánh giá lại khi số
  subscriber tăng hoặc cần content-based routing; hiện relay publish trực tiếp
  tới queue riêng sẽ đơn giản hơn.

#### Contract và reliability bắt buộc

- Giữ event envelope hiện có: `eventId`, `eventType`, `occurredAt`, `userId` và
  payload đã được các consumer dùng; không tự ý đổi tên field khi chuyển
  transport.
- Consumer phải xử lý lặp an toàn, commit side effect domain và dedupe record
  trong cùng transaction khi có thể.
- Chỉ acknowledge/delete message sau khi xử lý thành công. Với batch, chỉ retry
  record lỗi; message lỗi vĩnh viễn phải vào DLQ sau ngưỡng đã cấu hình.
- Theo dõi queue depth, oldest message age, receive count, DLQ depth, handler
  latency và failure rate. Không log payload tài chính đầy đủ hoặc token.

Tài liệu tham chiếu chính thức: [SQS với Lambda](https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html)
và [Redis Streams](https://redis.io/docs/latest/develop/data-types/streams/).

### k6

1. Tạo kịch bản smoke và baseline nhỏ trong một thư mục riêng ở root, dùng
   `BASE_URL` trỏ tới gateway.
2. Luồng kiểm thử dự kiến:
   - `GET /health` không cần auth;
   - lấy dev token chỉ khi chạy local/test mode được bật;
   - gọi một số GET authenticated đã có trong gateway như accounts, budgets,
     dashboard và notifications;
   - không tạo transaction thật trong load test mặc định vì ledger write cần
     idempotency và có thể làm bẩn dữ liệu test.
3. Khi cần kiểm thử write, dùng user/dataset disposable, `Idempotency-Key`
   duy nhất cho mỗi request và một profile chạy riêng; tuyệt đối không chạy
   bằng dữ liệu tài chính thật.
4. Đặt thresholds ban đầu theo mục tiêu local đã đo được, không tự nhận đó là
   SLO production. Kịch bản phải phân biệt lỗi auth, lỗi gateway và lỗi
   upstream; không coi mọi `502` là thành công.

### GitHub Actions

1. Tạo workflow CI cho pull request và branch chính, có concurrency và
   `permissions: contents: read` tối thiểu.
2. CI chạy các kiểm tra tương ứng với repo hiện tại:
   - Python: sync dependency, pytest, ruff và mypy nếu target hiện hữu yêu cầu;
   - Go: `go test ./...` cho từng service;
   - Java: Maven test cho identity và transaction;
   - web: install frozen lockfile, lint, typecheck và build.
3. Dùng cache/setup action chính thức phù hợp với các lockfile hiện có; pin
   action theo policy của repo khi triển khai.
4. Tách job k6:
   - smoke có thể chạy khi đã dựng local test stack;
   - baseline/load chạy bằng `workflow_dispatch` hoặc lịch riêng, có input
     rõ ràng về `BASE_URL`, profile và ngưỡng;
   - không truyền secret hoặc PII vào output, artifact hay summary.
5. Nếu workflow cần dựng application services, bổ sung một cách khởi động
   deterministic và teardown sạch; không giả định Docker Compose hiện tại đã
   chạy các application service vì file hiện chỉ chứa dependency local.

## Phạm vi file dự kiến thay đổi khi triển khai

- `infra/docker-compose.yml`: thêm Redis local và healthcheck.
- `.env.example`: thêm các cấu hình local đã được code xác nhận.
- `infra/README.md` và `README.md`: cách start/stop Redis, cách chạy k6 và
  giới hạn local-only.
- `Makefile`: target rõ ràng cho Redis, k6 smoke và các bước CI nếu cần.
- `services/gateway-service/pyproject.toml` cùng module settings/middleware:
  client Redis, lifecycle, rate-limit adapter, timeout và fallback.
- `services/gateway-service/tests/`: test adapter, key isolation theo user/IP,
  TTL, Redis unavailable và backward-compatible local behavior.
- `infra/docker-compose.yml`: LocalStack SQS với queue/DLQ theo consumer.
- `services/transaction-service/`: outbox publisher có HTTP và SQS adapter,
  giữ event envelope và retry publish an toàn.
- `services/budget-service/`, `services/analytics-service/`,
  `services/notification-service/`: SQS consumer adapter, ack/retry và tái sử
  dụng handler/dedupe hiện có.
- `infra/terraform/`: chỉ thêm SQS queues, DLQs và Lambda event mappings khi
  production async được bật sau local acceptance.
- `k6/README.md` và `k6/*.js`: script, biến đầu vào, thresholds và dữ liệu test.
- `.github/workflows/ci.yml`: quality gates cho các stack.
- `.github/workflows/k6.yml` (nếu tách workflow là cần thiết): smoke/baseline
  có kiểm soát.
- `docs/adr/` hoặc tài liệu vận hành: chỉ thêm/cập nhật khi quyết định Redis
  vượt ra ngoài local development hoặc ảnh hưởng đến kiến trúc đã khóa.

Không thêm dependency Redis vào mọi service theo kiểu đồng loạt. Mỗi service
chỉ nhận Redis nếu có use case và ownership được xác định; transaction-service
tiếp tục dùng PostgreSQL cho ledger, idempotency và outbox.

## Các phase triển khai

### Phase 1 — Local Redis foundation

- Chốt use case đầu tiên là distributed rate limiting của gateway.
- Thêm Redis Compose, cấu hình local không chứa secret thật và healthcheck.
- Thêm Redis client/lifecycle với timeout, namespace và fallback phù hợp.
- Giữ test gateway chạy được khi Redis không bật nếu đó là hành vi local đã
  chọn; ghi rõ behavior trong README.

### Phase 1.5 — Async foundation

- Bổ sung LocalStack SQS và queue/DLQ riêng cho budget, analytics và
  notification nếu local relay đã sẵn sàng.
- Giữ transactional outbox làm nguồn phát event; chuyển publisher sang adapter
  SQS nhưng không thay đổi ledger hoặc event envelope.
- Cho consumer Go đọc queue, dùng lại domain handler và `processed_events`; test
  duplicate, retry, timeout, DLQ và restart.
- Chỉ bật production Lambda/SQS mapping sau khi local flow chạy ổn định.

### Phase 2 — k6 smoke/baseline

- Xác định cách khởi động gateway và upstream tối thiểu từ repo hiện tại.
- Viết smoke cho health/authenticated reads và baseline nhẹ.
- Thêm thresholds dựa trên lần đo local đầu tiên.
- Xuất summary tối thiểu, không chứa token, header auth, body tài chính hoặc
  user identifier thật.

### Phase 3 — GitHub Actions CI

- Tạo quality-gate workflow chạy các lệnh canonical trong Makefile hoặc các
  target mới tương đương.
- Bật dependency caching và artifact test report khi hữu ích.
- Kiểm tra workflow bằng YAML validation và chạy lại các lệnh tương ứng local.

### Phase 4 — Controlled load testing và production decision

- Tách load profile khỏi PR CI; chỉ chạy manual/nightly trên môi trường test.
- So sánh p95/error rate và Redis resource usage với baseline.
- Chỉ sau khi có số liệu mới quyết định cache read model, Redis production hoặc
  AWS managed service; cập nhật ADR nếu boundary thay đổi.

## Tiêu chí nghiệm thu

- `docker compose -f infra/docker-compose.yml ... config` hợp lệ; Redis có
  healthcheck và không làm mất dữ liệu PostgreSQL hiện tại.
- Gateway rate limit hoạt động nhất quán giữa nhiều process khi Redis bật; key
  không trộn giữa client/user và có TTL.
- Redis bị dừng không làm ledger sai, không làm lộ dữ liệu và behavior fallback
  đúng với policy đã ghi trong tài liệu.
- `k6 smoke` chạy được bằng `BASE_URL`, chỉ đi qua gateway và fail khi có lỗi
  HTTP/threshold thực sự.
- Một transaction đã commit cuối cùng tạo được event trong outbox và consumer
  xử lý được qua SQS/LocalStack; duplicate event chỉ tạo một side effect.
- Message lỗi tạm thời được retry, message poison vào đúng DLQ; queue không bị
  mất im lặng khi consumer hoặc Redis restart.
- Pull request chạy được CI cho các stack hiện có; workflow không yêu cầu
  secret production.
- `make test`, `make lint`, `make build` hoặc các target tương đương vẫn giữ
  hành vi hiện tại; test mới bao phủ các nhánh Redis unavailable và auth.
- Không có token, secret, PII hay dữ liệu ledger thật trong log/artifact.

## Kiểm thử và xác minh

Chạy theo thứ tự nhỏ nhất:

1. Compose config + Redis healthcheck.
2. Test gateway và test Redis adapter/fallback.
3. `go test ./...`, Maven test, Python test/lint/typecheck và web lint/typecheck
   theo các target hiện có.
4. Async integration test với LocalStack: publish, consume, duplicate, retry,
   DLQ và restart.
5. k6 smoke với dataset local disposable.
6. Full `make verify` và kiểm tra YAML workflow trước khi mở PR.

## Rủi ro và giảm thiểu

| Rủi ro | Giảm thiểu |
|---|---|
| Redis bị dùng như nguồn sự thật | Ràng buộc ownership trong code/review; ledger vẫn ở PostgreSQL. |
| Cache trả dữ liệu tài chính cũ hoặc nhầm user | Key có `sub`, TTL ngắn, invalidation rõ; hoãn cache nếu chưa đủ. |
| Rate limit thay đổi behavior local | Giữ adapter interface và test cả Redis/fallback path. |
| k6 làm bẩn ledger hoặc lộ dữ liệu | Mặc định chỉ GET; write chỉ trên dataset disposable với idempotency. |
| CI quá chậm hoặc flaky | Cache dependency, tách load job, giới hạn concurrency và timeout. |
| Workflow dùng sai secret/quyền | Least privilege, không dùng production secret cho PR, redact output. |
| ADR mâu thuẫn với Redis production | Giới hạn phase đầu ở local; mọi mở rộng production cần ADR review. |
| SQS giao ít nhất một lần gây duplicate side effect | Dedupe bằng `eventId` trong transaction domain; test redelivery bắt buộc. |
| Outbox relay publish lỗi hoặc queue đầy | Retry có backoff, metric oldest outbox/queue message, DLQ và vận hành replay có kiểm soát. |
| Một queue dùng chung làm mất fan-out | Queue riêng cho từng consumer hoặc thêm fan-out service sau khi có nhu cầu. |

## Rollback

- Tắt job k6 trước nếu gây nhiễu CI; giữ lại artifact để điều tra.
- Tắt feature flag/cấu hình Redis rate limiter để quay về in-process fallback.
- Revert service Redis và dependency client khỏi Compose/code nếu local startup
  bị lỗi; PostgreSQL schema/ledger không bị migration hay mutation bởi Redis.
- Revert workflow độc lập với application code để khôi phục CI nhanh.
- Tắt SQS consumer mapping/worker và dừng relay publish mới; giữ outbox để
  replay sau khi sửa lỗi.
- Không xóa outbox, `processed_events`, DLQ hoặc volume PostgreSQL trong rollback
  nếu chưa có kế hoạch replay/đối soát.
- Không xóa volume PostgreSQL trong rollback.

## Câu hỏi cần chốt khi bắt đầu triển khai

- Rate limit khi Redis unavailable sẽ fail-open có giới hạn hay fail-closed?
- Có cần cache read model ngay phase 1 không, hay chỉ rate limit?
- k6 baseline chạy trong CI với application stack nào, và load test đầy đủ chạy
  trên môi trường test nào?
- Repository policy yêu cầu pin GitHub Actions theo tag hay commit SHA?
- LocalStack SQS có được chạy mặc định cùng `make up`, hay cần một target riêng
  để CI/local nhẹ hơn?
- Production consumer nào phù hợp Lambda trước, và consumer nào cần Go worker
  chạy liên tục do timeout/connection requirements?

## Trạng thái triển khai — 2026-07-21

Đã triển khai:

- Row lock theo thứ tự ổn định, optimistic version và unique guard cho ledger
  reversal.
- Outbox batch bounded, HTTP timeout và không giữ database transaction trong
  lúc gọi consumer.
- `limit=1..100` cho các endpoint list qua gateway và domain services.
- Redis distributed rate limit với TTL và in-process fallback.
- Go/JVM database pool bounds và `/ready` health checks.
- Redis, LocalStack SQS/DLQ, opt-in SQS outbox publisher/Go consumers, k6 smoke
  script và GitHub Actions CI/k6 workflow.

Còn cần phase tiếp theo:

- Production deployment wiring for SQS IAM policies, queue URLs and
  Lambda/worker autoscaling.
- Thêm metrics/tracing cho outbox age, queue depth, DB pool và request latency.
- Thêm Dockerfile multi-stage và deployment wiring cho application services.
- Chạy k6 trên một test stack disposable và hiệu chỉnh thresholds bằng số liệu,
  không dùng ngưỡng local hiện tại làm SLO production.
