# ai-finance-manager architecture overview

Canonical: [ADR 0004](../adr/0004-full-services-naming.md).

Implementation status and remaining release blockers:
[modernization baseline](./modernization.md).

## Target runtime diagram

```text
Browser → apps/web
            ↓
     AWS API Gateway (prod) / direct (local)
            ↓
     gateway-service (Python BFF)
        ├── identity-service (Java)
        ├── transaction-service (Java) ──outbox──▶ SQS
        ├── budget-service (Go) ◀─────────────────┘
        ├── analytics-service (Go) ◀──────────────┘
        ├── ai-service (Python)
        └── notification-service (Go) ◀── SQS
```

Local development currently uses the transaction outbox's HTTP relay by
default; SQS consumers are opt-in. Lambda adapters and production wiring remain
release blockers in the modernization baseline.

## gateway-service
BFF only: JWT, composition, hide internals. No owning schema. Domain DBs stay per service.

## Data ownership
| Schema | Owner |
|---|---|
| `identity` | identity-service |
| `transaction` | transaction-service |
| `budget` | budget-service |
| `analytics` | analytics-service |
| `notification` | notification-service |

## AWS target
Java → Lambda + SnapStart. Go/Python → Lambda. Web → Amplify or S3+CloudFront. One RDS. Cognito. SQS. SES. SSM.
