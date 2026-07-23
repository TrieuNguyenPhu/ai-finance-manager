from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]
    identity_base_url: str = "http://127.0.0.1:8080"
    transaction_base_url: str = "http://127.0.0.1:8081"
    budget_base_url: str = "http://127.0.0.1:8082"
    analytics_base_url: str = "http://127.0.0.1:8083"
    ai_base_url: str = "http://127.0.0.1:8001"
    notification_base_url: str = "http://127.0.0.1:8084"
    redis_url: str | None = None

    auth_dev_mode: bool = False
    auth_jwt_secret: str = ""
    auth_jwt_issuer: str = "ai-finance-manager-local"
    auth_token_ttl_seconds: int = 8 * 60 * 60
    cognito_issuer: str | None = None
    cognito_client_id: str | None = None

    # Simple per-client-IP throttle (requests per minute). Protects local stack
    # and gives a sane default before real infra-level rate limiting exists.
    rate_limit_per_minute: int = 240
    max_request_body_bytes: int = 64 * 1024


settings = Settings()
