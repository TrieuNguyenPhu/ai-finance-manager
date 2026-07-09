from typing import Any

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from pydantic import BaseModel, Field

from gateway.auth import AuthUser, auth_is_configured, create_dev_token, require_user
from gateway.clients import (
    ai_url,
    analytics_url,
    budget_url,
    identity_url,
    notification_url,
    transaction_url,
    upstream,
)
from gateway.settings import settings

router = APIRouter()


class DevTokenRequest(BaseModel):
    userId: str = Field(default="local-dev-user", min_length=1, max_length=64, pattern=r"^[\w.-]+$")


@router.post("/api/v1/auth/dev-token")
def issue_dev_token(body: DevTokenRequest) -> dict[str, str]:
    if not settings.auth_dev_mode:
        raise HTTPException(
            status_code=403,
            detail={"code": "FORBIDDEN", "message": "Dev token disabled"},
        )
    if not auth_is_configured():
        raise HTTPException(
            status_code=503,
            detail={
                "code": "AUTH_NOT_CONFIGURED",
                "message": "Development authentication is not configured",
            },
        )
    user_id = body.userId.strip()
    token = create_dev_token(user_id)
    return {"accessToken": token, "tokenType": "Bearer", "userId": user_id}


@router.get("/api/v1/profile")
async def get_profile(user: AuthUser = Depends(require_user)) -> Any:
    return await upstream.request("GET", identity_url(), "/profile", user_id=user.user_id)


@router.put("/api/v1/profile")
async def put_profile(body: dict[str, Any], user: AuthUser = Depends(require_user)) -> Any:
    return await upstream.request(
        "PUT", identity_url(), "/profile", user_id=user.user_id, json_body=body
    )


@router.get("/api/v1/accounts")
async def list_accounts(
    user: AuthUser = Depends(require_user), limit: int = Query(default=50, ge=1, le=100)
) -> Any:
    return await upstream.request(
        "GET", transaction_url(), "/accounts", user_id=user.user_id, params={"limit": str(limit)}
    )


@router.post("/api/v1/accounts")
async def create_account(
    body: dict[str, Any],
    user: AuthUser = Depends(require_user),
    idempotency_key: str = Header(alias="Idempotency-Key", min_length=1, max_length=128),
) -> Any:
    return await upstream.request(
        "POST",
        transaction_url(),
        "/accounts",
        user_id=user.user_id,
        json_body=body,
        headers={"Idempotency-Key": idempotency_key},
    )


@router.get("/api/v1/categories")
async def list_categories(
    user: AuthUser = Depends(require_user), limit: int = Query(default=50, ge=1, le=100)
) -> Any:
    return await upstream.request(
        "GET", transaction_url(), "/categories", user_id=user.user_id, params={"limit": str(limit)}
    )


@router.post("/api/v1/categories")
async def create_category(
    body: dict[str, Any],
    user: AuthUser = Depends(require_user),
    idempotency_key: str = Header(alias="Idempotency-Key", min_length=1, max_length=128),
) -> Any:
    return await upstream.request(
        "POST",
        transaction_url(),
        "/categories",
        user_id=user.user_id,
        json_body=body,
        headers={"Idempotency-Key": idempotency_key},
    )


@router.get("/api/v1/transactions")
async def list_transactions(
    user: AuthUser = Depends(require_user), limit: int = Query(default=50, ge=1, le=100)
) -> Any:
    return await upstream.request(
        "GET",
        transaction_url(),
        "/ledger-entries",
        user_id=user.user_id,
        params={"limit": str(limit)},
    )


@router.post("/api/v1/transactions")
async def create_transaction(
    body: dict[str, Any],
    user: AuthUser = Depends(require_user),
    idempotency_key: str = Header(alias="Idempotency-Key", min_length=1, max_length=128),
) -> Any:
    return await upstream.request(
        "POST",
        transaction_url(),
        "/ledger-entries",
        user_id=user.user_id,
        json_body=body,
        headers={"Idempotency-Key": idempotency_key},
    )


@router.post("/api/v1/transactions/{entry_id}/reversals")
async def reverse_transaction(
    entry_id: str,
    user: AuthUser = Depends(require_user),
    idempotency_key: str = Header(alias="Idempotency-Key", min_length=1, max_length=128),
) -> Any:
    return await upstream.request(
        "POST",
        transaction_url(),
        f"/ledger-entries/{entry_id}/reversals",
        user_id=user.user_id,
        headers={"Idempotency-Key": idempotency_key},
    )


@router.get("/api/v1/budgets")
async def list_budgets(
    user: AuthUser = Depends(require_user), limit: int = Query(default=50, ge=1, le=100)
) -> Any:
    return await upstream.request(
        "GET", budget_url(), "/budgets", user_id=user.user_id, params={"limit": str(limit)}
    )


@router.post("/api/v1/budgets")
async def create_budget(
    body: dict[str, Any],
    user: AuthUser = Depends(require_user),
    idempotency_key: str = Header(alias="Idempotency-Key", min_length=1, max_length=128),
) -> Any:
    return await upstream.request(
        "POST",
        budget_url(),
        "/budgets",
        user_id=user.user_id,
        json_body=body,
        headers={"Idempotency-Key": idempotency_key},
    )


@router.get("/api/v1/dashboard")
async def dashboard(
    user: AuthUser = Depends(require_user),
    yearMonth: str | None = None,
    limit: int = Query(default=50, ge=1, le=100),
) -> Any:
    params = {"limit": str(limit)}
    if yearMonth:
        params["yearMonth"] = yearMonth
    return await upstream.request(
        "GET",
        analytics_url(),
        "/dashboard",
        user_id=user.user_id,
        params=params,
    )


@router.get("/api/v1/notifications")
async def list_notifications(
    user: AuthUser = Depends(require_user), limit: int = Query(default=50, ge=1, le=100)
) -> Any:
    return await upstream.request(
        "GET",
        notification_url(),
        "/notifications",
        user_id=user.user_id,
        params={"limit": str(limit)},
    )


@router.post("/api/v1/ai/drafts")
async def ai_draft(body: dict[str, Any], user: AuthUser = Depends(require_user)) -> Any:
    return await upstream.request("POST", ai_url(), "/drafts", user_id=user.user_id, json_body=body)
