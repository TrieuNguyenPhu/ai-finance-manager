# Infrastructure

Local Docker Compose and Terraform for **ai-finance-manager**.

## Planned local
Postgres (schemas per domain service), LocalStack SQS/S3, Mailpit.

## AWS (after local green)
API Gateway → gateway-service; Cognito; Lambda + SnapStart (Java); Lambda (Go/Python); Amplify or S3+CF; one RDS; SQS; SES; SSM; CloudWatch.

Avoid EKS / NAT / multi-RDS until measured need. See ADR 0004.
