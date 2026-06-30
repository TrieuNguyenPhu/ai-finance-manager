# identity-service (Java / Spring Boot)

User profile, default currency, timezone/locale, notification prefs, Cognito subject linkage.
**Does not store passwords** — Amazon Cognito owns sign-up/sign-in/JWT.

## Requirements

- JDK **25** (LTS)
- Maven 3.9+
- Spring Boot **4.1.x**

## Commands

```bash
mvn test
mvn spring-boot:run
```

Health: `GET http://127.0.0.1:8080/health`

## AWS

Lambda + SnapStart (same pattern as transaction-service).
