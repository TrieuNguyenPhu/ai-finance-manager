# budget-service (Go)

Monthly category budgets and threshold alerts for **ai-finance-manager**.
Consumes ledger events through the authenticated local HTTP endpoint or the
opt-in SQS long-poll consumer. Money: `int64` minor units. A Lambda queue adapter
is still required before AWS deployment.

## Requirements

- Go **1.26+**

## Commands

```bash
go mod tidy
go test ./...
go run ./cmd/server
```

Health: `GET http://127.0.0.1:8082/health`

## Spend projection

Budget limits are stored separately from category spend. Ledger event payload v1
provides a canonical `categoryId` plus signed `categorySpendDeltaMinor`; duplicate
events are ignored by `processed_events`, and original/reversal order does not
change the final sum. Creating a budget reads the existing projection, so expenses
posted earlier in the month are included. New callers should provide `categoryId`;
`categoryName` remains available for the current UI during migration.
