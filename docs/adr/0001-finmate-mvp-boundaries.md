# ADR 0001: FinMate AI MVP boundaries (LOCKED)

## Status
**Superseded** by [0003-controlled-microservices.md](./0003-controlled-microservices.md) (and previously narrowed by [0002](./0002-website-single-api.md)). Kept for history.

## Context
We need a personal finance platform (FinMate AI) with clear microservice boundaries, multi-language practice (Java/Go/Python/TS), AI-assisted input, and low AWS idle cost for &lt;100 users. An earlier sketch proposed 7–8 deployables (including Java identity + analytics) and Lambda-everywhere including Spring Boot, which risks cost, cold starts, and empty-service overhead before any product value.

## Decision
1. **MVP deployables:** `web`, `gateway`, `transaction`, `budget`, `ai`, `notification` (6 units). No Java identity service; no analytics service in MVP.
2. **Profile** owned by `gateway` + schema `identity` until extract criteria are met.
3. **Dashboard aggregates** computed by backend code via gateway/transaction — not LLM, not a separate analytics worker yet.
4. **Money over the wire:** integer minor units + currency.
5. **Ledger deletes:** reverse/compensate; do not silently destroy posted history.
6. **Local MVP first;** AWS apply only after local G3 acceptance.
7. **Java runtime on AWS:** prefer small App Runner (or SnapStart Lambda only if measured); Go/Python on Lambda.
8. **Repo layout:** `apps/web`, `services/<name>`, `packages/*`, `infra/*`, `docs/*`.
9. **Per-service clean architecture layers** (domain / application / adapters); shared contracts only.

## Consequences
- Faster path to a working product with less DevOps surface.
- Slight impurity: profile in gateway (acceptable BFF ownership for MVP).
- Analytics extract will require event consumers and a new schema later (planned G4).
- Team must resist adding Redis/LocalStack/EKS “for completeness” before need.

## Alternatives rejected
- 15–20 fine-grained services: cost and choreography explosion.
- Modular monolith only: weak fit for stated multi-runtime learning goals; harder to practice event boundaries.
- EKS for MVP: fixed control-plane and networking cost unjustified.
- Spring identity + Cognito both owning auth: duplicate auth surface.
