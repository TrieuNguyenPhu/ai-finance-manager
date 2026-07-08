# ai-finance-manager

Personal finance website with controlled microservices: Java (identity + ledger), Go (budget / analytics / notification), Python (gateway BFF + AI), Next.js UI.

## Architecture (ADR 0004)

```text
Browser → apps/web (Next.js)
            ↓
       gateway-service (Python BFF)  ← only public app API
            ├── identity-service (Java)
            ├── transaction-service (Java)   ← ledger SoT
            ├── budget-service (Go)
            ├── analytics-service (Go)
            ├── ai-service (Python)
            └── notification-service (Go, async SQS)
```

### Why `gateway-service`?
It is the **Backend for Frontend (BFF)** — not a domain service and not Amazon API Gateway.

- Browser has **one** backend URL.
- Validates JWT and takes `userId` from token `sub`.
- Composes dashboard calls across services.
- Hides internal ports and AI keys.

In AWS, **API Gateway** sits in front of `gateway-service`. Domain services stay private.

| Path | Role |
|---|---|
| [`apps/web`](apps/web) | Website UI |
| [`services/gateway-service`](services/gateway-service) | BFF |
| [`services/identity-service`](services/identity-service) | Profile / prefs (Cognito auth) |
| [`services/transaction-service`](services/transaction-service) | Ledger |
| [`services/budget-service`](services/budget-service) | Budgets |
| [`services/analytics-service`](services/analytics-service) | Dashboard aggregates |
| [`services/ai-service`](services/ai-service) | NL drafts / insights |
| [`services/notification-service`](services/notification-service) | Email / in-app |
| [`packages`](packages) | Shared contracts later |
| [`infra`](infra) | Compose / Terraform later |
| [`docs`](docs) | ADRs |

**Rules:** AI never posts ledger entries; money = integer minor units + currency; authorize from JWT `sub`.

## Runtime versions (2026-07)

| Runtime | Pin | Status |
|---|---|---|
| Node.js | **22+** (prefer **24** LTS) | Current |
| Next.js / React | **16.2.x** / **19.2.x** | Latest stable npm |
| TypeScript | **5.9.x** | Keep 5.x until Next/ESLint ecosystem adopts TS 7 |
| Python | **3.13+** | Current supported line |
| Java | **25 LTS** | Newest LTS |
| Spring Boot | **4.1.x** | Current (3.5 OSS ended 2026-06) |
| Go | **1.26.x** | Current stable toolchain |
| Postgres | **16+** | Planned Compose |

AWS: Java services on **Lambda + SnapStart**; Go/Python on Lambda. See [ADR 0004](docs/adr/0004-full-services-naming.md).

## AI providers

1. **Groq** (`AI_PROVIDER=groq` + `GROQ_API_KEY`) — live LLM drafts, falls back to rules on any error.
2. **Rules** (default) — deterministic parser, no network.
3. Gemini — reserved, not wired yet.

AI output is always a *draft* with confidence + provenance; the user must confirm before anything reaches the ledger.

## Run locally

### Prerequisites

| Tool | Version | Used by |
|---|---|---|
| Docker Desktop | any recent | PostgreSQL 16 |
| Node.js + pnpm | Node 22+, pnpm 9+ | `apps/web` |
| Python + uv | Python 3.13+, uv 0.5+ | gateway-service, ai-service |
| Go | 1.26+ | budget / analytics / notification |
| JDK + Maven | JDK 25, Maven 3.9+ (`JAVA_HOME` set) | identity / transaction |

### 1. Environment

```bash
cp .env.example .env
```

Optional AI (Groq): edit `.env` and set `AI_PROVIDER=groq`, `GROQ_API_KEY=<your key>`.
The ai-service reads its own `services/ai-service/.env` if you run it from that folder —
same two variables. Without a key everything still works using the rules provider.
Never commit `.env` (already gitignored).

### 2. Database

```bash
make up          # docker compose: PostgreSQL 16 + schemas + per-service roles
```

### 3. Backend services (each in its own terminal)

| # | Service | Directory | Command | Port |
|---|---|---|---|---|
| 1 | identity-service | `services/identity-service` | `mvn spring-boot:run` | 8080 |
| 2 | transaction-service | `services/transaction-service` | `mvn spring-boot:run` | 8081 |
| 3 | budget-service | `services/budget-service` | `go run ./cmd/server` | 8082 |
| 4 | analytics-service | `services/analytics-service` | `go run ./cmd/server` | 8083 |
| 5 | notification-service | `services/notification-service` | `go run ./cmd/worker` | 8084 |
| 6 | ai-service | `services/ai-service` | `uv sync && uv run uvicorn ai.main:app --app-dir src --port 8001` | 8001 |
| 7 | gateway-service | `services/gateway-service` | `uv sync && uv run uvicorn gateway.main:app --app-dir src --port 8000` | 8000 |

Health check: `GET http://127.0.0.1:<port>/health` on every service.

### 4. Web

```bash
cd apps/web
pnpm install
pnpm dev
```

Open http://localhost:3000 — the UI auto-mints a local dev JWT (`AUTH_DEV_MODE`) and talks only to the gateway on port 8000.

### Verify

```bash
make test        # all service test suites
make verify      # tests + web build
```

## Security (local stub vs production)

- Browser only ever reaches **gateway-service**; it validates the JWT (HS256 local stub with `exp`/`iat`, Cognito later) and forwards identity via `X-User-Id`.
- Gateway adds security headers, per-IP rate limiting, and request-size limits.
- `POST /internal/events` (outbox delivery) requires a shared `X-Internal-Token` (`INTERNAL_EVENTS_TOKEN`).
- AI keys stay server-side in `ai-service`; the web app never sees them.

## Not wired yet

Real Cognito JWT (local uses HS256 stub via `AUTH_DEV_MODE`), production Terraform apply, Gemini SDK calls, SQS instead of HTTP outbox relay.

## Contributing

Humans: this README + `docs/`. Agents: `AGENTS.md` + `.cursor/context/*`.
