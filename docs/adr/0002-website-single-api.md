# ADR 0002: Website + single API (MVP)

## Status
**Superseded** by [0003-controlled-microservices.md](./0003-controlled-microservices.md). Kept for history: single FastAPI backend was an interim onboarding choice.

## Context
ADR 0001 locked six deployables (`web`, `gateway`, `transaction`, `budget`, `ai`, `notification`) plus multi-runtime practice. The repo had almost no application source, while local folders (`finance-core`, `ai-insight`, vendored JDK, orphaned `node_modules`) made clone/setup confusing. Product priority is a working **website** with a clear setup path.

## Decision
1. **MVP deployables:** `apps/web` (Next.js) + `services/api` (FastAPI) only.
2. **Frontend talks only to `services/api`.**
3. **AI remains non-authoritative:** drafts/suggestions only; explicit UI confirm before ledger writes.
4. **Money:** integer minor units + ISO currency over the wire; `Decimal` in Python; no float for money.
5. **Auth:** Cognito (or equivalent) JWT validated in API; authorize from `sub`; never trust body `userId`.
6. **Data:** one Postgres when introduced; single schema ownership by `services/api` for MVP (split schemas only if/when services are extracted).
7. **Local first;** AWS after local acceptance.
8. **Deferred extract:** gateway / transaction / budget / notification / identity as separate services only when complexity or team scale justifies it (new ADR).

## Consequences
- Faster onboarding and fewer moving parts for contributors.
- Less multi-language practice in MVP (Java/Go not required to run the product).
- Future service split will need careful boundary extraction and schema migration.

## Alternatives rejected
- Keep six empty microservice folders “for architecture completeness.”
- Next.js-only (API routes as sole backend) — keeps AI/ledger concerns harder to isolate and test.
- Reintroduce Java ledger as a second always-on service before first local vertical slice.
