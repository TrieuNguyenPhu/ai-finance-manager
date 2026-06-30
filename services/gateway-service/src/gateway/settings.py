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


settings = Settings()
