# notification-service (Go)

Async worker: SQS → email (SES) / in-app for **ai-finance-manager**.
Not called synchronously from the browser.

## Requirements

- Go **1.26+**

## Commands

```bash
go test ./...
go run ./cmd/worker
```
