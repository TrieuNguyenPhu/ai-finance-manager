# AI Finance Manager

Personal finance platform monorepo. This foundation commit provides structure, local PostgreSQL, and health-check scaffolds only — **no ledger, auth, budget, or AI features yet**.

## Layout

| Path | Stack | Role |
| --- | --- | --- |
| `apps/web` | Next.js + TypeScript | Frontend |
| `services/finance-core` | Java 21 + Spring Boot | Modular domain service (ledger/budget later) |
| `services/gateway` | Go | API gateway scaffold |
| `services/ai-insight` | Python 3.12 + FastAPI | AI insight scaffold (read-only later) |
| `infra/docker-compose.yml` | Docker Compose | Local PostgreSQL |
| `infra/terraform` | Terraform | Empty skeleton (no AWS resources) |
| `docs/adr` | Markdown | Architecture decisions |

See `docs/adr/0001-initial-deployable-boundaries.md`.

## Prerequisites

- Docker + Docker Compose
- Make
- JDK 21+ (or portable JDK under `.tools/jdk-21`, gitignored)
- Maven 3.9+ (or Maven Wrapper once generated)
- Go 1.22+
- Python 3.12+ and [uv](https://github.com/astral-sh/uv)
- Node.js 22+ and pnpm
- Terraform 1.5+ (for `make lint-terraform`)

## Quick start

```bash
cp .env.example .env
make up
make verify
```

Health endpoints (when each app is run locally):

- Gateway: `http://localhost:8080/health`
- Finance core: `http://localhost:8081/health`
- AI insight: `http://localhost:8082/health`
- Web: `http://localhost:3000/api/health`

## Root commands

| Target | Purpose |
| --- | --- |
| `make help` | List targets |
| `make up` / `make down` | Start/stop local PostgreSQL |
| `make build` | Build all components |
| `make lint` | Lint / format-check |
| `make test` | Unit tests |
| `make verify` | `lint` + `test` + `build` |

Per-component targets: `build-*`, `lint-*`, `test-*` for `finance-core`, `gateway`, `ai-insight`, `web`, plus `lint-terraform`.

## Security notes

- Do not commit `.env` or secrets
- Local Postgres password in `.env.example` is for development only
- AI must never write the ledger (enforced by product rules once features exist)
