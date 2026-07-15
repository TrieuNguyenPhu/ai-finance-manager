import jwt
from fastapi.testclient import TestClient

from gateway.main import app
from gateway.settings import settings

client = TestClient(app)


def test_health() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "gateway-service"}


def test_security_headers_present() -> None:
    response = client.get("/health")
    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert response.headers["X-Frame-Options"] == "DENY"


def test_dev_token_and_auth_required() -> None:
    token_res = client.post("/api/v1/auth/dev-token", json={"userId": "user-a"})
    assert token_res.status_code == 200
    token = token_res.json()["accessToken"]

    claims = jwt.decode(
        token,
        settings.auth_jwt_secret,
        algorithms=["HS256"],
        audience="ai-finance-manager",
        issuer=settings.auth_jwt_issuer,
    )
    assert claims["sub"] == "user-a"
    assert claims["exp"] > claims["iat"]

    denied = client.get("/api/v1/accounts")
    assert denied.status_code == 401

    # Upstream may be down; auth must pass first (502 or 200 both prove JWT accepted).
    authed = client.get("/api/v1/accounts", headers={"Authorization": f"Bearer {token}"})
    assert authed.status_code in {200, 502}


def test_dev_token_rejects_invalid_user_id() -> None:
    response = client.post("/api/v1/auth/dev-token", json={"userId": "../../etc/passwd"})
    assert response.status_code == 422


def test_expired_token_rejected() -> None:
    import time

    expired = jwt.encode(
        {
            "sub": "user-a",
            "iss": settings.auth_jwt_issuer,
            "aud": "ai-finance-manager",
            "iat": int(time.time()) - 7200,
            "exp": int(time.time()) - 3600,
        },
        settings.auth_jwt_secret,
        algorithm="HS256",
    )
    response = client.get("/api/v1/accounts", headers={"Authorization": f"Bearer {expired}"})
    assert response.status_code == 401
    assert response.json()["detail"]["code"] == "TOKEN_EXPIRED"


def test_oversized_body_rejected() -> None:
    big = "x" * (settings.max_request_body_bytes + 1)
    response = client.post(
        "/api/v1/auth/dev-token",
        content=big,
        headers={"Content-Type": "application/json"},
    )
    assert response.status_code == 413
