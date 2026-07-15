# Services (`*-service`)

Browser never calls these except through **gateway-service**.

| Service | Port | Tech |
|---|---|---|
| [gateway-service](gateway-service) | 8000 | Python FastAPI BFF |
| [ai-service](ai-service) | 8001 | Python FastAPI |
| [identity-service](identity-service) | 8080 | Java Spring Boot |
| [transaction-service](transaction-service) | 8081 | Java Spring Boot |
| [budget-service](budget-service) | 8082 | Go |
| [analytics-service](analytics-service) | 8083 | Go |
| [notification-service](notification-service) | worker | Go |

Product: **ai-finance-manager**. See ADR 0004.
