# Project Context

## Product
**ai-finance-manager** — personal finance website for:
- income, expense, transfers across cash / bank / e-wallet accounts;
- categories (rules first, AI suggest second);
- monthly budgets; saving goals (post-core);
- cash-flow dashboard via **analytics-service**;
- natural-language transaction draft with **confirm-before-save**;
- alerts and AI insights that are informational, not professional advice.

AI drafts and explains only. It never posts ledger entries or initiates bank transfers.

## Locked stack (ADR 0004)
| Path | Role |
|---|---|
| `apps/web` | Next.js 16 + TypeScript + Tailwind. Node.js 22+ (prefer 24 LTS). |
| `services/gateway-service` | Python 3.13 + FastAPI — **BFF only** (JWT, composition). |
| `services/identity-service` | Java 25 + Spring Boot 4.1 — profile / prefs (Cognito auth). |
| `services/transaction-service` | Java 25 + Spring Boot 4.1 — ledger source of truth. |
| `services/budget-service` | Go 1.26 — budgets + thresholds. |
| `services/analytics-service` | Go 1.26 — dashboard read model. |
| `services/ai-service` | Python 3.13 + FastAPI — Gemini → Groq → rules. |
| `services/notification-service` | Go 1.26 — SQS → SES / in-app. |

- **Data:** one Postgres; schema + DB user per domain service (not gateway).
- **Auth:** Amazon Cognito. **AI keys:** ai-service / gateway only.
- **AWS:** Lambda + SnapStart for Java; Lambda for Go/Python; Amplify or S3+CF for web.
- **Repo:** `apps/web`, `services/*-service`, `packages/*`, `infra/*`, `docs/*`.

## Constraints
- Expected load &lt; 100 users; still avoid EKS/NAT/multi-RDS.
- Money: no float. Integer minor units on the wire.
- Ledger: atomic, auditable, idempotent; prefer **reversal**.
- **Local first**; AWS after local acceptance.
