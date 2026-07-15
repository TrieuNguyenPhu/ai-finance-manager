# Repository orchestration. Prefer these targets over ad-hoc commands.
.PHONY: help up down build lint test verify \
	test-gateway-service test-ai-service test-budget-service test-analytics-service \
	test-notification-service build-web lint-web test-web lint-terraform

ROOT := $(CURDIR)/
COMPOSE := docker compose -f "$(ROOT)infra/docker-compose.yml" --env-file "$(ROOT).env.example"

help:
	@echo "ai-finance-manager targets"
	@echo ""
	@echo "  make up       Start local PostgreSQL"
	@echo "  make down     Stop local dependencies"
	@echo "  make test     Run available service health tests"
	@echo "  make build    Build web"
	@echo "  make verify   test + build"

up:
	$(COMPOSE) up -d
	$(COMPOSE) ps

down:
	$(COMPOSE) down

build: build-web

lint: lint-web

test: test-gateway-service test-ai-service test-budget-service test-analytics-service test-notification-service

verify: test build
	@echo verify: ok

test-gateway-service:
	cd "$(ROOT)services/gateway-service" && uv sync --extra dev && uv run pytest

test-ai-service:
	cd "$(ROOT)services/ai-service" && uv sync --extra dev && uv run pytest

test-budget-service:
	cd "$(ROOT)services/budget-service" && go test ./...

test-analytics-service:
	cd "$(ROOT)services/analytics-service" && go test ./...

test-notification-service:
	cd "$(ROOT)services/notification-service" && go test ./...

build-web:
	cd "$(ROOT)apps/web" && pnpm install --frozen-lockfile
	cd "$(ROOT)apps/web" && pnpm build

lint-web:
	cd "$(ROOT)apps/web" && pnpm install --frozen-lockfile
	cd "$(ROOT)apps/web" && pnpm lint
	cd "$(ROOT)apps/web" && pnpm typecheck

test-web:
	@echo "web unit tests not configured yet"

lint-terraform:
	cd "$(ROOT)infra/terraform" && terraform fmt -check -recursive
	cd "$(ROOT)infra/terraform/envs/dev" && terraform init -backend=false -input=false
	cd "$(ROOT)infra/terraform/envs/dev" && terraform validate
