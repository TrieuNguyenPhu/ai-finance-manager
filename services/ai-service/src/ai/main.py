from fastapi import FastAPI, Header, HTTPException

from ai.providers import DraftRequest, DraftResponse, get_provider
from ai.settings import settings

app = FastAPI(
    title="ai-finance-manager ai-service",
    version="0.1.0",
    description=(
        "AI drafts and insights only. Never posts ledger entries. "
        "Deterministic money math stays in transaction-service / analytics-service."
    ),
)


def _effective_provider() -> str:
    if settings.ai_provider == "groq" and settings.groq_api_key:
        return "groq"
    return "rules"


@app.get("/health")
def health() -> dict[str, str]:
    return {
        "status": "ok",
        "service": "ai-service",
        "provider": _effective_provider(),
    }


@app.post("/drafts", response_model=DraftResponse)
async def create_draft(
    body: DraftRequest,
    x_user_id: str | None = Header(default=None, alias="X-User-Id"),
) -> DraftResponse:
    if not x_user_id or not x_user_id.strip():
        raise HTTPException(
            status_code=401,
            detail={"code": "UNAUTHORIZED", "message": "X-User-Id required"},
        )
    provider = get_provider(settings.ai_provider)
    return await provider.draft(body)
