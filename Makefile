# Repository orchestration. Prefer these targets over ad-hoc commands.
.PHONY: help up down build lint test verify \
	test-gateway-service test-ai-service test-budget-service test-analytics-service \
	test-notification-service test-identity-service test-transaction-service \
	build-web lint-web test-web lint-terraform k6-smoke compose-config

ROOT := $(CURDIR)/
COMPOSE := docker compose -f "$(ROOT)infra/docker-compose.yml" --env-file "$(ROOT).env.example"

help:
	@echo "ai-finance-manager targets"
	@echo ""
	@echo "  make up       Start local PostgreSQL"
	@echo "  make down     Stop local dependencies"
	@echo "  make test     Run available service tests"
	@echo "  make build    Build web"
	@echo "  make verify   test + build"
	@echo "  make k6-smoke Run the local gateway k6 smoke test"

up:
	$(COMPOSE) up -d
	$(COMPOSE) ps

down:
	$(COMPOSE) down

compose-config:
	$(COMPOSE) config

k6-smoke:
	k6 run k6/smoke.js

build: build-web

lint: lint-web

test: test-gateway-service test-ai-service test-budget-service test-analytics-service \
	test-notification-service test-identity-service test-transaction-service

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

test-identity-service:
	cd "$(ROOT)services/identity-service" && mvn -q test

test-transaction-service:
	cd "$(ROOT)services/transaction-service" && mvn -q test

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
