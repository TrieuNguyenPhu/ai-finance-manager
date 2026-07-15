# AGENTS.md

## Mission
Build **ai-finance-manager** — a secure, cost-aware personal finance website with microservices (Java + Go + Python + Next.js). See `.cursor/context/*` and `docs/adr/0004-full-services-naming.md`.

## Working agreement
1. Read `.cursor/context/project.md`, `.cursor/context/architecture.md`, and scoped rules before editing.
2. Inspect existing code/tests before changing.
3. Plan first for multi-file work.
4. Change only required files.
5. Never invent APIs, env vars, columns, events, or infra — verify in repo.
6. Never place secrets or real financial PII in code/logs/commits.
7. Smallest relevant validation first.
8. Report files changed, tests run, assumptions, risks.
9. Do not claim success when tests were not run or failed.
10. Prefer simple explicit code.

## Architecture reminders
- Product name: **ai-finance-manager** (folders `services/*-service`).
- Browser → **gateway-service** only (BFF). Domain logic in other `*-service` modules.
- `transaction-service` owns the ledger; AI never posts entries.
- Confirm-before-save for NL drafts.
- Integer minor units + currency; JWT `sub` authorization.
- Java on Lambda + SnapStart (ADR 0004).
