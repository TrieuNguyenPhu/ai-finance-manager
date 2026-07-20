# Infrastructure

Local Docker Compose and Terraform for **ai-finance-manager**.

## Planned local
Postgres (schemas per domain service), Redis (rate limiting/cache), LocalStack
SQS/DLQ, S3, Mailpit.

LocalStack provisions the SQS queues and DLQs for the opt-in asynchronous path.
Set `OUTBOX_TRANSPORT=sqs` and `SQS_ENABLED=true` to use it locally; HTTP
outbox delivery remains the default.

## AWS (after local green)
API Gateway → gateway-service; Cognito; Lambda + SnapStart (Java); Lambda (Go/Python); Amplify or S3+CF; one RDS; SQS; SES; SSM; CloudWatch.

Avoid EKS / NAT / multi-RDS until measured need. See ADR 0004.
