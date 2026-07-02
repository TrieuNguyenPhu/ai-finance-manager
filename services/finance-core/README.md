# finance-core

Java / Spring Boot modular service for ledger, accounts, budgets, and related domain logic.

This foundation commit exposes `/health` only. No ledger or auth features yet.

## Requirements

- JDK 21+
- Maven Wrapper (`./mvnw`) generated on first bootstrap, or Maven 3.9+

## Commands

```bash
./mvnw test
./mvnw spring-boot:run
```

Default port: `8081` (`FINANCE_CORE_PORT`).
