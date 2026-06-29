# ADR 0004: Full domain services + naming (LOCKED)

## Status
**Accepted** — supersedes deferred bounds in [0003-controlled-microservices.md](./0003-controlled-microservices.md). Product name is **ai-finance-manager**.

## Context
Stakeholders want the repository name and service layout aligned with the multi-runtime learning goal: all domain services from day one (including Identity and Analytics), Spring Boot on AWS Lambda, and folders named `*-service`. A Python **gateway-service** remains as BFF so the browser never calls domain services directly.

## Decision

### Product name
- Repo / system id: **`ai-finance-manager`**
- Display strings, health `service` fields, Maven `groupId`, Go module paths, and Python project names use this id (not FinMate).

### Folder naming
Every backend deployable lives under `services/<name>-service`.

### Deployables (8)
| Path | Tech | Role |
|---|---|---|
| `apps/web` | Next.js 16 + TypeScript + Tailwind | Website; talks **only** to gateway-service |
| `services/gateway-service` | Python 3.13 + FastAPI | **BFF**: JWT edge, request composition, no domain DB of its own |
| `services/identity-service` | Java 25 + Spring Boot 4 | Profile, prefs, Cognito linkage (auth still Cognito) |
| `services/transaction-service` | Java 25 + Spring Boot 4 | Ledger source of truth |
| `services/budget-service` | Go 1.26 | Budgets / thresholds; SQS consumer |
| `services/analytics-service` | Go 1.26 | Read model / dashboard aggregates; SQS consumer |
| `services/ai-service` | Python 3.13 + FastAPI | NL draft, categorize, insights — never mutates ledger |
| `services/notification-service` | Go 1.26 | SQS → SES / in-app |

### Why gateway-service exists
AWS **API Gateway** is the edge HTTP front door. **`gateway-service` is the application BFF**:
1. One public backend URL for `apps/web`.
2. Validates JWT and authorizes from `sub`.
3. Composes multi-service reads (dashboard) without teaching the browser every service URL.
4. Hides AI keys and internal ports.

Domain services are never browser-facing.

### AWS deploy (from the start)
- **Java** (`identity-service`, `transaction-service`): AWS Lambda + **SnapStart** + Spring Cloud Function (or equivalent thin adapter). Accept cold-start risk for the learning/architecture goal.
- **Go / Python**: Lambda (HTTP via Function URL or API Gateway integration; workers on SQS triggers).
- **Web**: Amplify or S3 + CloudFront.
- One RDS Postgres; schema + DB user per domain service. Gateway has no owning schema.
- Cognito for auth. SQS/EventBridge for async. SSM for secrets. No EKS / NAT for MVP.

### Runtime pins (current as of 2026-07)
| Runtime | Pin | Notes |
|---|---|---|
| Node.js | 22+ (prefer 24 LTS) | Next 16 requires Node 20+ |
| Next.js / React | 16.2.x / 19.2.x | Latest stable npm line |
| TypeScript | 5.9.x | Stay on 5.x until Next/ESLint ecosystem widely adopts TS 7 |
| Python | 3.13+ | uv-managed |
| Java | **25 LTS** | Newest LTS; Boot 4.1 supports it |
| Spring Boot | **4.1.x** | Boot 3.5 OSS ended 2026-06-30 |
| Go | **1.26.x** | Current stable on go.dev toolchain |
| Postgres | 16+ | Local Compose |

### Cross-cutting (unchanged)
- AI confirm-before-save; money = minor units + currency; no float; outbox → SQS; local-first before prod spend.

## Consequences
- More scaffolds and AWS wiring up front.
- Spring-on-Lambda needs SnapStart and careful packaging.
- Branding rename touches docs, packages, and health endpoints.

## Alternatives rejected
- Defer Identity/Analytics (ADR 0003): rejected by product decision.
- App Runner-only for Java: rejected in favor of Lambda+SnapStart learning path (containers remain an escape hatch if cold starts are unacceptable).
