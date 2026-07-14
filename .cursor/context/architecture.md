# Architecture Decisions

## Core principles
- The ledger is the source of truth for balances.
- AI never directly mutates the ledger.
- Each module/service owns its schema; start with one Postgres instance and separate schemas.
- Cross-service communication uses versioned APIs or events, not direct database access.
- Prefer idempotent commands and consumers.
- Every monetary amount includes currency.
- Store timestamps in UTC; convert only at system boundaries.
- Propagate correlation/trace IDs across HTTP and asynchronous messages.

## Initial deployables
1. `apps/web` — Next.js/TypeScript
2. `services/finance-core` — Java/Spring Boot modular service (accounts, ledger, budget later)
3. `services/gateway` — Go (thin gateway scaffold; BFF features deferred)
4. `services/ai-insight` — Python/FastAPI (insights later; read-only w.r.t. ledger)

Identity for production: prefer AWS Cognito (not implemented yet).

Local schemas: `finance_core`, `ai_insight` (see `infra/docker/postgres/init/01-schemas.sql`).

See `docs/adr/0001-initial-deployable-boundaries.md`.

## Data and API rules
- API contracts: OpenAPI 3.x (not yet published).
- Events must include: `eventId`, `eventType`, `eventVersion`, `occurredAt`, `correlationId`, and payload.
- Use additive schema evolution by default.
- Never reuse an event name for incompatible semantics.
- Use an outbox pattern when publishing events from a transactional write.
