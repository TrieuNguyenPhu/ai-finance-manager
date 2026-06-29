# ADR 0003: Controlled microservices (LOCKED)

## Status
**Superseded** by [0004-full-services-naming.md](./0004-full-services-naming.md) for deployable set, naming, and Spring-on-Lambda. Kept for history.

## Context
Product goals require practice with **Java + Go + Python**, AWS, event-driven flow, and AI-assisted input — while keeping cost viable for &lt;100 users. ADR 0002 collapsed to a single FastAPI backend for onboarding speed; that conflicts with the multi-runtime learning goal. A ChatGPT sketch proposed ~6 domain services plus Identity and Analytics; Spring-on-Lambda and early analytics workers inflate DevOps before product value.

## Decision
### MVP deployables (6)
| Unit | Tech | Role |
|---|---|---|
| `apps/web` | Next.js 16 + TypeScript + Tailwind | Website only; talks **only** to gateway |
| `services/gateway` | Python 3.13 + FastAPI | BFF: JWT edge, profile, aggregates for dashboard, orchestration |
| `services/transaction` | Java 21 + Spring Boot | Ledger source of truth: accounts, categories, transactions |
| `services/budget` | Go | Monthly budgets, thresholds; consumes `transaction.*` events |
| `services/ai` | Python 3.13 + FastAPI | NL draft, categorize, insights — **never** mutates ledger |
| `services/notification` | Go | Async alerts (SQS → SES / in-app) |

### Explicitly deferred
- Separate **Identity** Java service (Cognito owns auth; profile lives in gateway + `identity` schema).
- Separate **Analytics** service (dashboard totals computed in gateway/transaction code until volume justifies a read model).
- EKS, NAT Gateway, multi-RDS, Redis/ElastiCache, Secrets Manager sprawl, PWA, OCR, open banking.

### Cross-cutting rules
1. Frontend → **gateway only**. AI keys never in the browser.
2. AI drafts/suggests only; UI **confirm-before-save** before ledger writes.
3. Money: integer **minor units** + ISO currency on the wire; no `float`/`double`.
4. Authorize from JWT `sub`; never trust body `userId`.
5. One Postgres instance; **schema + DB user per service** (`identity`, `transaction`, `budget`, `notification`).
6. Sync REST between services; async via outbox → SQS/EventBridge for budget/notification.
7. **Local MVP first**; AWS after local acceptance.
8. Deploy bias: App Runner (or small container) for Java; Lambda OK for Go/Python workers; Amplify or S3+CloudFront for web.

### AI providers (MVP)
1. **Gemini** (Flash / Flash-Lite free tier) — primary.
2. **Groq** — fallback / low-latency classify.
3. **Rule-based** — merchant patterns before calling an LLM.

## Consequences
- Multi-language and microservice practice without Identity/Analytics overhead.
- Gateway is a deliberate BFF impurity (profile + composition).
- More local Compose surface than ADR 0002; still far cheaper than EKS.
- Extract analytics later needs events + schema (planned phase G2).

## Alternatives rejected
- Keep single FastAPI monolith (ADR 0002): insufficient for stated Java/Go practice.
- ChatGPT 6-domain + Identity + Analytics from day one: empty-service and cold-start tax.
- Spring Boot on Lambda as default for transaction service: cold start risk; prefer App Runner unless measured otherwise.
- 15–20 fine-grained services or EKS for MVP.
