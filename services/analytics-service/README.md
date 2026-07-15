# analytics-service (Go)

Read model for dashboard: income/expense totals, cash flow, top categories, period comparisons.
Consumes `transaction.*` events; does **not** own the ledger.

Money: `int64` minor units. Aggregates are deterministic code — LLM only narrates later via ai-service.

## Requirements

- Go **1.26+**

## Commands

```bash
go mod tidy
go test ./...
go run ./cmd/server
```

Health: `GET http://127.0.0.1:8083/health`
