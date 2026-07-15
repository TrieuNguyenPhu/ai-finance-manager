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

## Upstream ports (local)

| Service | URL |
|---|---|
| identity-service | http://127.0.0.1:8080 |
| transaction-service | http://127.0.0.1:8081 |
| budget-service | http://127.0.0.1:8082 |
| analytics-service | http://127.0.0.1:8083 |
| ai-service | http://127.0.0.1:8001 |
