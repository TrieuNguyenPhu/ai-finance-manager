# Architecture Decisions

## Status
**LOCKED** per [docs/adr/0004-full-services-naming.md](../../docs/adr/0004-full-services-naming.md).

## Core principles
- `transaction-service` owns ledger balances.
- `ai-service` never mutates the ledger; NL drafts need UI confirm-before-save.
- Browser talks **only** to `gateway-service` (BFF). AWS API Gateway fronts it in prod.
- Sync REST + OpenAPI; async outbox → SQS for budget / analytics / notification.
- Idempotent creates (`Idempotency-Key`). Money = minor units + currency. JWT `sub` only.

## Deployables

| Unit | Tech | Responsibility |
|---|---|---|
| `apps/web` | Next.js 16 | UI |
| `services/gateway-service` | Python FastAPI | BFF composition; no domain schema |
| `services/identity-service` | Java 25 Spring Boot 4.1 | Profile / prefs |
| `services/transaction-service` | Java 25 Spring Boot 4.1 | Ledger + outbox |
| `services/budget-service` | Go 1.26 | Budgets |
| `services/analytics-service` | Go 1.26 | Aggregates read model |
| `services/ai-service` | Python FastAPI | Drafts / insights |
| `services/notification-service` | Go 1.26 | Alerts worker |

## gateway-service purpose
Application BFF — not Amazon API Gateway. Single browser entry, JWT edge, hides internal URLs/keys, composes multi-service reads. Domain ownership stays in `*-service` modules.

## Deploy / cost
Local-complete before AWS. Java on **Lambda + SnapStart**; Go/Python on Lambda; one RDS; SSM; short log retention; AWS Budgets. No EKS/NAT/ElastiCache for MVP.
