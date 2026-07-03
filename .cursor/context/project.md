# Project Context

## Product
A personal finance management platform that helps users:
- record income, expenses, transfers, budgets, and financial goals;
- categorize transactions;
- view cash-flow and spending analytics;
- receive AI-assisted insights without presenting them as professional financial advice.

## Current repository state
Foundation monorepo with health-check scaffolds only. No ledger, auth, budget, or AI business features yet.

## Verified stack (in repository)
- Java 21 + Spring Boot 3.4: `services/finance-core`
- Go 1.22+: `services/gateway`
- Python 3.12 + FastAPI (uv): `services/ai-insight`
- Next.js 15.3 + TypeScript (pnpm): `apps/web`
- PostgreSQL 16 via `infra/docker-compose.yml`
- Terraform skeleton under `infra/terraform` (no AWS resources applied)
- Root orchestration: `Makefile`

## Product constraints
- Initial traffic is expected to be below 100 users.
- Optimize for low fixed cost, clear service boundaries, and the ability to consolidate services if operations become too expensive.
- Financial calculations must use decimal/fixed-point representations, never binary floating point.
- AI output must be explainable, non-authoritative, and clearly separated from deterministic balances and ledger calculations.
- Redis, Kafka, EKS, and NAT Gateway are out of scope unless a measured need appears.
