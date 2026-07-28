# notification-service (Go)

Stores in-app ledger notifications for **ai-finance-manager**. Events arrive
through the authenticated local HTTP endpoint or the opt-in SQS long-poll
consumer. SES/email delivery and a Lambda queue adapter are target work, not
implemented behavior. The browser reads notifications through the gateway only.

## Requirements

- Go **1.26+**

## Commands

```bash
go test ./...
go run ./cmd/worker
```
