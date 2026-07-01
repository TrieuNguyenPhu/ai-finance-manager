# budget-service (Go)

Monthly category budgets and threshold alerts for **ai-finance-manager**.
Consumes `transaction.*` events (SQS later). Money: `int64` minor units.

## Requirements

- Go **1.26+**

## Commands

```bash
go mod tidy
go test ./...
go run ./cmd/server
```

Health: `GET http://127.0.0.1:8082/health`
