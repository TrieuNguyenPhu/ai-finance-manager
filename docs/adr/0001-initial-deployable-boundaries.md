# ADR 0001: Initial deployable boundaries

## Status

Accepted

## Context

The platform must support Java, Go, Python, Next.js, and Terraform in one repository, stay cheap for fewer than 100 users, and keep the ledger as the source of truth. Full microservice extraction is unnecessary on day one.

## Decision

Initial deployables:

1. `apps/web` — Next.js frontend
2. `services/finance-core` — Java/Spring Boot modular service (ledger, budgets, profiles later)
3. `services/ai-insight` — Python/FastAPI (read-only AI insights later)
4. `services/gateway` — Go gateway scaffold (minimal routing later; deferred BFF complexity)

Identity for production will prefer AWS Cognito rather than a custom identity service.

Local development uses one PostgreSQL instance with separate schemas (`finance_core`, `ai_insight`). No Redis, Kafka, or Kubernetes in the foundation.

## Alternatives considered

- Seven independent microservices immediately — rejected for idle cost and operational overhead
- Modular monolith containing AI — rejected because Python AI runtime differs from Java domain services
- Deferring Go entirely — rejected because repository structure and team stack require a Go entry point; keep it a thin health scaffold for now

## Consequences

- Faster local startup and lower fixed AWS cost
- Clear extraction points when scaling or ownership requires it
- AI remains isolated and cannot own ledger writes
