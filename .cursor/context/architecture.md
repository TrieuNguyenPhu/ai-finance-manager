# Architecture Decisions

## Core principles
- The ledger is the source of truth for balances.
- AI never directly mutates the ledger.
- Each service owns its database and schema.
- Cross-service communication uses versioned APIs or events, not direct database access.
- Prefer idempotent commands and consumers.
- Every monetary amount includes currency.
- Store timestamps in UTC; convert only at system boundaries.
- Propagate correlation/trace IDs across HTTP and asynchronous messages.

## Suggested services
1. `gateway-service` — Go
2. `identity-service` — Java/Spring Boot or AWS Cognito integration
3. `ledger-service` — Java/Spring Boot
4. `budget-service` — Java/Spring Boot
5. `notification-service` — Go
6. `ai-insight-service` — Python/FastAPI
7. `web-app` — Next.js/TypeScript

Start with fewer deployable services when possible. A modular monolith is acceptable for tightly coupled early-stage domains; extraction must be driven by independent scaling, ownership, or release needs.

## Data and API rules
- API contracts: OpenAPI 3.x.
- Events must include: `eventId`, `eventType`, `eventVersion`, `occurredAt`, `correlationId`, and payload.
- Use additive schema evolution by default.
- Never reuse an event name for incompatible semantics.
- Use an outbox pattern when publishing events from a transactional write.
