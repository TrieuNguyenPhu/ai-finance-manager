# gateway-service (FastAPI BFF)

**Backend for Frontend** for `apps/web` in **ai-finance-manager**.

## What it is for
| Does | Does not |
|---|---|
| Single public API the browser calls | Own a domain database schema |
| Validate JWT / authorize from `sub` | Replace Amazon Cognito |
| Compose calls to identity / transaction / budget / analytics / ai | Be called instead of AWS API Gateway in prod (API Gateway sits **in front**) |
| Hide internal service URLs and AI keys | Write ledger entries itself |

Domain logic lives in `*-service` folders. This service only orchestrates.

## Requirements

- Python **3.13+**
- [uv](https://docs.astral.sh/uv/)

## Commands

```bash
uv sync --extra dev
uv run uvicorn gateway.main:app --reload --app-dir src --host 127.0.0.1 --port 8000
uv run pytest
```

Health: `GET http://127.0.0.1:8000/health`

## Edge protections

- JWT (HS256 local stub) with `exp`/`iat` required; dev tokens via `POST /api/v1/auth/dev-token` when `AUTH_DEV_MODE=true`.
- Security headers, per-IP rate limit (`RATE_LIMIT_PER_MINUTE`), request-size limit (`MAX_REQUEST_BODY_BYTES`).
- Shared Redis rate-limit buckets when `REDIS_URL` is configured; local in-process fallback if Redis is unavailable.
- Shared pooled HTTP client with timeouts; upstream errors return generic 502.

## Upstream ports (local)

| Service | URL |
|---|---|
| identity-service | http://127.0.0.1:8080 |
| transaction-service | http://127.0.0.1:8081 |
| budget-service | http://127.0.0.1:8082 |
| analytics-service | http://127.0.0.1:8083 |
| notification-service | http://127.0.0.1:8084 |
| ai-service | http://127.0.0.1:8001 |

List endpoints accept `limit=1..100` and default to `50` to keep response and
database work bounded.
