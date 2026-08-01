# Repository orchestration. Prefer these targets over ad-hoc commands.
.PHONY: help up down build lint test test-backend verify lint-contracts \
	test-gateway-service test-ai-service test-budget-service test-analytics-service \
	test-notification-service test-identity-service test-transaction-service \
	install-web build-web lint-web lint-python lint-gateway-service lint-ai-service test-web \
	lint-go lint-terraform k6-smoke compose-config

ROOT := $(CURDIR)/
ENV_FILE := $(if $(wildcard .env),.env,.env.example)
COMPOSE := docker compose -f "$(ROOT)infra/docker-compose.yml" --env-file "$(ROOT)$(ENV_FILE)"

help:
	@echo "ai-finance-manager targets"
	@echo ""
	@echo "  make up       Start local PostgreSQL, Redis, and LocalStack"
	@echo "  make down     Stop local dependencies"
	@echo "  make test     Run available service tests"
	@echo "  make lint     Run web, Python, and Go quality gates"
	@echo "  make build    Build web"
	@echo "  make verify   lint + test + build"
	@echo "  make k6-smoke Run the local gateway k6 smoke test"

up:
	$(COMPOSE) up -d --wait
	$(COMPOSE) ps

down:
	$(COMPOSE) down

compose-config:
	$(COMPOSE) config --quiet

k6-smoke:
	k6 run k6/smoke.js

build: build-web

lint: lint-web lint-python lint-go lint-contracts

lint-python: lint-gateway-service lint-ai-service

lint-go:
	cd "$(ROOT)services/budget-service" && go vet ./...
	cd "$(ROOT)services/analytics-service" && go vet ./...
	cd "$(ROOT)services/notification-service" && go vet ./...

lint-gateway-service:
	cd "$(ROOT)services/gateway-service" && uv sync --frozen --extra dev && uv run --frozen ruff check src tests && uv run --frozen mypy src

lint-ai-service:
	cd "$(ROOT)services/ai-service" && uv sync --frozen --extra dev && uv run --frozen ruff check src tests && uv run --frozen mypy src

lint-contracts:
	cd "$(ROOT)services/gateway-service" && uv sync --frozen --extra dev && uv run --frozen ruff check "$(ROOT)scripts/validate_contracts.py" && uv run --frozen python "$(ROOT)scripts/validate_contracts.py"

test: test-backend test-web

test-backend: test-gateway-service test-ai-service test-budget-service test-analytics-service \
	test-notification-service test-identity-service test-transaction-service

verify: lint test build
	@echo verify: ok

test-gateway-service:
	cd "$(ROOT)services/gateway-service" && uv sync --frozen --extra dev && uv run --frozen pytest

test-ai-service:
	cd "$(ROOT)services/ai-service" && uv sync --frozen --extra dev && uv run --frozen pytest

test-budget-service:
	cd "$(ROOT)services/budget-service" && go test ./...

test-analytics-service:
	cd "$(ROOT)services/analytics-service" && go test ./...

test-notification-service:
	cd "$(ROOT)services/notification-service" && go test ./...

test-identity-service:
	cd "$(ROOT)services/identity-service" && mvn -q test

test-transaction-service:
	cd "$(ROOT)services/transaction-service" && mvn -q test

install-web:
	cd "$(ROOT)apps/web" && pnpm install --frozen-lockfile

build-web: install-web
	cd "$(ROOT)apps/web" && pnpm build

lint-web: install-web
	cd "$(ROOT)apps/web" && pnpm lint
	cd "$(ROOT)apps/web" && pnpm typecheck

test-web: install-web
	cd "$(ROOT)apps/web" && pnpm test

lint-terraform:
	cd "$(ROOT)infra/terraform" && terraform fmt -check -recursive
	cd "$(ROOT)infra/terraform/envs/dev" && terraform init -backend=false -input=false -lockfile=readonly
	cd "$(ROOT)infra/terraform/envs/dev" && terraform validate
	cd "$(ROOT)infra/terraform/modules/cognito" && terraform init -backend=false -input=false -lockfile=readonly
	cd "$(ROOT)infra/terraform/modules/cognito" && terraform validate
	cd "$(ROOT)infra/terraform/modules/rds" && terraform init -backend=false -input=false -lockfile=readonly
	cd "$(ROOT)infra/terraform/modules/rds" && terraform validate
	cd "$(ROOT)infra/terraform/modules/lambda_placeholder" && terraform init -backend=false -input=false -lockfile=readonly
	cd "$(ROOT)infra/terraform/modules/lambda_placeholder" && terraform validate
