from fastapi import FastAPI

from ai.settings import settings

app = FastAPI(
    title="ai-finance-manager ai-service",
    version="0.1.0",
    description=(
        "AI drafts and insights only. Never posts ledger entries. "
        "Deterministic money math stays in transaction-service / analytics-service."
    ),
)


@app.get("/health")
def health() -> dict[str, str]:
    return {
        "status": "ok",
        "service": "ai-service",
        "provider": settings.ai_provider,
    }
