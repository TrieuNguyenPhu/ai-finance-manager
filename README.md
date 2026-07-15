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

1. Gemini Flash / Flash-Lite (primary free tier)
2. Groq (fallback)
3. Rules first

## Quick start

### 1. gateway-service

```bash
cd services/gateway-service
uv sync --extra dev
uv run uvicorn gateway.main:app --reload --app-dir src --host 127.0.0.1 --port 8000
```

### 2. Web

```bash
cd apps/web
pnpm install
pnpm dev
```

Open http://localhost:3000. Copy `.env.example` → `.env` when needed.

### Optional backends

| Service | Command | Port |
|---|---|---|
| ai-service | `uv run uvicorn ai.main:app --reload --app-dir src --port 8001` | 8001 |
| identity-service | `mvn spring-boot:run` (JDK 25) | 8080 |
| transaction-service | `mvn spring-boot:run` | 8081 |
| budget-service | `go run ./cmd/server` | 8082 |
| analytics-service | `go run ./cmd/server` | 8083 |

## Not wired yet

Cognito JWT, Postgres migrations, SQS/outbox, Terraform, real Gemini/Groq SDKs.

## Contributing

Humans: this README + `docs/`. Agents: `AGENTS.md` + `.cursor/context/*`.
