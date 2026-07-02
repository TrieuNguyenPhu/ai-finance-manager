# Canonical Commands

Verified against the foundation Makefile and package manifests. Prefer root targets.

## Root
- `make help`
- `make up` / `make down`
- `make build`
- `make lint`
- `make test`
- `make verify`
- `docker compose -f infra/docker-compose.yml --env-file .env.example up -d`

## Java (`services/finance-core`)
- `./mvnw test` (after wrapper generation) or `mvn test`
- `./mvnw -DskipTests package` or `mvn -DskipTests package`
- `make test-finance-core` / `make build-finance-core`

## Go (`services/gateway`)
- `go test ./...`
- `go vet ./...`
- `go build -o bin/gateway .`
- `make test-gateway` / `make lint-gateway` / `make build-gateway`

## Python (`services/ai-insight`)
- `uv sync`
- `uv run ruff check .`
- `uv run ruff format --check .`
- `uv run mypy .`
- `uv run pytest`
- `make lint-ai-insight` / `make test-ai-insight` / `make build-ai-insight`

## Frontend (`apps/web`)
- `pnpm install --frozen-lockfile`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `make lint-web` / `make test-web` / `make build-web`

## Terraform (`infra/terraform`)
- `make lint-terraform`
- `terraform fmt -check -recursive` (from `infra/terraform`)
- `terraform init -backend=false` then `terraform validate` (from `infra/terraform/envs/dev`)
- No `terraform apply` in foundation — no AWS resources declared.
