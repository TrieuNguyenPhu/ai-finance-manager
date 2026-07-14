# Canonical Commands

Cursor must discover the actual commands from repository files before running them. Prefer these conventions when the project adopts them.

## Root
- `make help`
- `make lint`
- `make test`
- `make verify`
- `docker compose up -d`

## Java
- `./mvnw test`
- `./mvnw verify`
- or `./gradlew test`

## Go
- `go test ./...`
- `go vet ./...`
- `golangci-lint run`

## Python
- `uv sync`
- `ruff check .`
- `ruff format --check .`
- `mypy .`
- `pytest`

## Frontend
- `pnpm install --frozen-lockfile`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`

## Terraform
- `terraform fmt -check -recursive`
- `terraform validate`
- `tflint --recursive`
- `checkov -d .`
