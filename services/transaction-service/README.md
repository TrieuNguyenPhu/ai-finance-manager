# transaction-service (Java / Spring Boot)

Ledger **source of truth** for ai-finance-manager: accounts, categories, income/expense/transfers.
Publishes domain events via a transactional outbox. HTTP fan-out is the default
local transport; SQS publisher mode is available with `OUTBOX_TRANSPORT=sqs`.

Money: integer minor units + ISO currency. Prefer reversal over destructive delete.

Outbox payloads for `transaction.ledger_entry.posted` follow
`packages/contracts/events/ledger-entry-posted-v1.schema.json`. Version 1 carries
canonical signed reporting/category deltas; a reversal emits the exact inverse of
the original entry in its original effective period.

## Requirements

- JDK **25** (LTS)
- Maven 3.9+
- Spring Boot **4.1.x**

## Commands

```bash
mvn test
mvn spring-boot:run
```

Health: `GET http://127.0.0.1:8081/health`

## AWS

Target: Lambda + SnapStart per ADR 0004. The current servlet application and
scheduled outbox relays are for local execution; a Lambda request adapter,
queue-triggered outbox publisher, published artifact, and measured SnapStart
configuration are still required.
