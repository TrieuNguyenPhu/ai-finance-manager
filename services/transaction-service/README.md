# transaction-service (Java / Spring Boot)

Ledger **source of truth** for ai-finance-manager: accounts, categories, income/expense/transfers.
Publishes domain events via transactional outbox (SQS later).

Money: integer minor units + ISO currency. Prefer reversal over destructive delete.

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

Deploy as Lambda + SnapStart (Spring Cloud Function adapter) per ADR 0004.
