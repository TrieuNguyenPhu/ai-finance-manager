# Repository orchestration. Prefer these targets over ad-hoc commands.
.PHONY: help up down build lint test verify \
	build-finance-core build-gateway build-ai-insight build-web \
	lint-finance-core lint-gateway lint-ai-insight lint-web lint-terraform \
	test-finance-core test-gateway test-ai-insight test-web

# CURDIR is required: paths with spaces break $(lastword $(MAKEFILE_LIST)).
ROOT := $(CURDIR)/
COMPOSE := docker compose -f "$(ROOT)infra/docker-compose.yml" --env-file "$(ROOT).env.example"

# Relative wildcards avoid Make path splitting on spaces in CURDIR.
ifneq ($(wildcard .tools/jdk-21/bin/java.exe)$(wildcard .tools/jdk-21/bin/java),)
  export JAVA_HOME := $(CURDIR)/.tools/jdk-21
  ifeq ($(OS),Windows_NT)
    export PATH := $(JAVA_HOME)/bin;$(PATH)
  else
    export PATH := $(JAVA_HOME)/bin:$(PATH)
  endif
endif

ifeq ($(OS),Windows_NT)
  ifneq ($(wildcard services/finance-core/mvnw.cmd),)
    MVN := mvnw.cmd
  else
    MVN := mvn
  endif
else
  ifneq ($(wildcard services/finance-core/mvnw),)
    MVN := ./mvnw
  else
    MVN := mvn
  endif
endif

help:
	@echo "AI Finance Manager - foundation targets"
	@echo ""
	@echo "  make up                 Start local PostgreSQL"
	@echo "  make down               Stop local dependencies"
	@echo "  make build              Build all components"
	@echo "  make lint               Lint/format-check all components"
	@echo "  make test               Test all components"
	@echo "  make verify             lint + test + build"
	@echo ""
	@echo "Per-component: build-/lint-/test- + finance-core, gateway, ai-insight, web"
	@echo "               lint-terraform"

up:
	$(COMPOSE) up -d
	$(COMPOSE) ps

down:
	$(COMPOSE) down

build: build-finance-core build-gateway build-ai-insight build-web

lint: lint-finance-core lint-gateway lint-ai-insight lint-web lint-terraform

test: test-finance-core test-gateway test-ai-insight test-web

verify: lint test build
	@echo verify: ok

build-finance-core:
	cd "$(ROOT)services/finance-core" && $(MVN) -q -DskipTests package

lint-finance-core:
	cd "$(ROOT)services/finance-core" && $(MVN) -q -DskipTests validate

test-finance-core:
	cd "$(ROOT)services/finance-core" && $(MVN) -q test

build-gateway:
	cd "$(ROOT)services/gateway" && go build -o bin/gateway .

lint-gateway:
	cd "$(ROOT)services/gateway" && go vet ./...

test-gateway:
	cd "$(ROOT)services/gateway" && go test ./...

build-ai-insight:
	cd "$(ROOT)services/ai-insight" && uv sync
	cd "$(ROOT)services/ai-insight" && uv build

lint-ai-insight:
	cd "$(ROOT)services/ai-insight" && uv sync
	cd "$(ROOT)services/ai-insight" && uv run ruff check .
	cd "$(ROOT)services/ai-insight" && uv run ruff format --check .
	cd "$(ROOT)services/ai-insight" && uv run mypy .

test-ai-insight:
	cd "$(ROOT)services/ai-insight" && uv sync
	cd "$(ROOT)services/ai-insight" && uv run pytest

build-web:
	cd "$(ROOT)apps/web" && pnpm install --frozen-lockfile
	cd "$(ROOT)apps/web" && pnpm build

lint-web:
	cd "$(ROOT)apps/web" && pnpm install --frozen-lockfile
	cd "$(ROOT)apps/web" && pnpm lint
	cd "$(ROOT)apps/web" && pnpm typecheck

test-web:
	cd "$(ROOT)apps/web" && pnpm install --frozen-lockfile
	cd "$(ROOT)apps/web" && pnpm test

lint-terraform:
	cd "$(ROOT)infra/terraform" && terraform fmt -check -recursive
	cd "$(ROOT)infra/terraform/envs/dev" && terraform init -backend=false -input=false
	cd "$(ROOT)infra/terraform/envs/dev" && terraform validate
