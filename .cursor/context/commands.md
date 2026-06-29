# Canonical Commands

## Root
- See `README.md` for run order (gateway-service first, then web).

## Web (`apps/web`)
- `pnpm install` / `pnpm dev` / `pnpm lint` / `pnpm typecheck` / `pnpm build`

## gateway-service
- `uv sync --extra dev`
- `uv run uvicorn gateway.main:app --reload --app-dir src --host 127.0.0.1 --port 8000`
- `uv run pytest`

## ai-service
- `uv sync --extra dev`
- `uv run uvicorn ai.main:app --reload --app-dir src --host 127.0.0.1 --port 8001`
- `uv run pytest`

## identity-service / transaction-service
- `mvn test`
- `mvn spring-boot:run` — ports **8080** / **8081**

## budget-service / analytics-service
- `go test ./...`
- `go run ./cmd/server` — ports **8082** / **8083**

## notification-service
- `go test ./...`
- `go run ./cmd/worker`
