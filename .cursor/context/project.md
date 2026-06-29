# Project Context

## Product
A personal finance management platform that helps users:
- record income, expenses, transfers, budgets, and financial goals;
- categorize transactions;
- view cash-flow and spending analytics;
- receive AI-assisted insights without presenting them as professional financial advice.

## Proposed stack
- Java + Spring Boot: identity, user profile, ledger/transaction, budget, and other consistency-heavy domain services.
- Go: API gateway/BFF, notification or high-concurrency lightweight services.
- Python + FastAPI: AI insight, classification, forecasting, and data-processing services.
- Frontend: Next.js + TypeScript.
- Data: PostgreSQL per service; Redis only when a measured use case exists.
- Async integration: Amazon EventBridge or SQS/SNS; avoid Kafka for the initial low-traffic stage.
- AWS: ECS Fargate or App Runner initially, RDS PostgreSQL, S3, CloudFront, Cognito, Secrets Manager/SSM, CloudWatch.
- IaC: Terraform.
- Local development: Docker Compose.

## Product constraints
- Initial traffic is expected to be below 100 users.
- Optimize for low fixed cost, clear service boundaries, and the ability to consolidate services if operations become too expensive.
- Financial calculations must use decimal/fixed-point representations, never binary floating point.
- AI output must be explainable, non-authoritative, and clearly separated from deterministic balances and ledger calculations.
