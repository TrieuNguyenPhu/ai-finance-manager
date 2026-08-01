# Modernization baseline

This document separates the architecture that is already enforced from the
remaining migration work. It exists to prevent a visually polished build from
being mistaken for a production-ready financial system.

## Enforced now

- The browser calls `gateway-service` only.
- The gateway derives tenant identity from a verified JWT `sub`; local tokens
  are opt-in, while Cognito access tokens require RS256/JWKS, issuer,
  `token_use=access`, and app-client validation.
- `transaction-service` is the only ledger writer. AI creates an editable draft
  and the UI requires explicit confirmation before recording it.
- Ledger and budget write amounts cross API boundaries as safe integer minor
  units plus currency.
- Ledger corrections are linked reversals.
- Ledger writes, account creation, category creation, and budget creation use
  stable idempotency keys.
- Transaction events use an additive versioned contract with a canonical event
  ID and signed, order-independent projection deltas.
- Consumer inbox records and projection writes commit in the same database
  transaction.
- Database pools default to Lambda-safe sizes; local overrides remain explicit.
- Go migrations are serialized and recorded once per schema instead of running
  every DDL statement on each cold start.

## Internal dependency rule

The target for every service is:

```text
domain <- application/use cases <- ports <- HTTP, database, queue, provider adapters
```

The domain and application layers must not import HTTP frameworks, ORM models,
AWS SDKs, or transport DTOs. Adapters may depend inward; dependencies never point
outward. Cross-service sharing is limited to versioned contracts, not domain
models or database tables.

## Known structural debt

The repository does not yet satisfy that dependency rule everywhere:

- Java domain objects still carry JPA annotations, and application services
  still return web DTOs and depend directly on Spring Data repositories.
- Go budget, analytics, and notification use cases still depend directly on
  `database/sql`.
- The current scheduler/long-poll processes are suitable for local execution,
  not Lambda triggers. Lambda entry adapters and deployable artifacts are not
  implemented.
- The static web application can store/send a token but does not yet implement
  the Cognito hosted-login PKCE callback and refresh lifecycle.
- Domain services still trust the gateway-provided `X-User-Id`; production must
  enforce private/IAM invocation or a signed internal identity before any
  service is reachable beyond its trusted boundary.
- S3 + CloudFront remains a target, not a ready artifact: static export and the
  equivalent CloudFront response-security-header policy are not wired.
- Terraform environment wiring is intentionally disabled until those runtime
  adapters, secrets, private networking, backups, and cost alarms exist.
- List endpoints and screens are bounded but do not yet expose cursor-based
  pagination or load-more controls. The UI labels these values as loaded rows,
  not authoritative totals.
- The OpenAPI document validates the gateway route inventory and required
  idempotency headers, but request, response, and shared error schemas are not
  complete enough for generated-client or DTO drift checks.
- Projection schema v1 is enforced for new events, but there is no executable
  v0-to-v1 replay/backfill command yet.
- The HTTP outbox relay does not yet claim rows for multi-instance delivery, so
  duplicate sends remain possible during concurrent relay execution.
- Advisory locks, migrations, and projection race behavior still need tests
  against real PostgreSQL; H2 and unit tests do not prove PostgreSQL semantics.
- Account balances and projection totals can aggregate beyond JavaScript's safe
  integer range even though individual writes are bounded. Production contracts
  must either serialize aggregate minor units as decimal strings or enforce
  aggregate range limits before those values are exposed as JSON numbers.

These are release blockers, not optional polish. Refactoring them should proceed
one vertical slice at a time, preserving the contract and correctness tests
added by the modernization baseline.

## Cost-first production shape

For the current target of fewer than 100 users:

- Static web assets on S3 + CloudFront or Amplify.
- HTTP API Gateway in front of the BFF only.
- Lambda for compute; Java functions use SnapStart after real Lambda adapters
  are measured.
- One small, single-AZ RDS PostgreSQL instance initially, with schema and role
  ownership per service and automated backups.
- SQS standard queues with DLQs for projections; no always-on broker.
- No EKS or ElastiCache for the MVP. Avoid a NAT Gateway only after the
  gateway-to-domain invocation path and the outbox-to-SQS path are designed and
  costed with private Lambda invocation or VPC endpoints; the current local HTTP
  topology does not yet prove that saving.
- Edge throttling plus the gateway's bounded local fallback replaces a managed
  Redis dependency in production.
- Short log retention, AWS Budgets alerts, and explicit concurrency limits.

This topology should be load-tested before provisioning. Scale vertically or
add managed components only when measured latency, concurrency, or reliability
requires them.
