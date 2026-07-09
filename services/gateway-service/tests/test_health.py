import jwt
from fastapi.testclient import TestClient

from gateway.main import app
from gateway.settings import Settings, settings

client = TestClient(app)


def test_health() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "gateway-service"}


def test_security_headers_present() -> None:
    response = client.get("/health")
    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert response.headers["X-Frame-Options"] == "DENY"


def test_dev_token_disabled_when_env_is_absent(monkeypatch) -> None:
    monkeypatch.delenv("AUTH_DEV_MODE", raising=False)
    isolated_settings = Settings(_env_file=None)
    assert isolated_settings.auth_dev_mode is False

    monkeypatch.setattr(settings, "auth_dev_mode", isolated_settings.auth_dev_mode)
    response = client.post("/api/v1/auth/dev-token", json={"userId": "user-a"})
    assert response.status_code == 403
    assert response.json()["detail"]["code"] == "FORBIDDEN"


def test_dev_token_requires_an_explicit_strong_local_secret(monkeypatch) -> None:
    monkeypatch.setattr(settings, "auth_dev_mode", True)
    monkeypatch.setattr(settings, "auth_jwt_secret", "")

    response = client.post("/api/v1/auth/dev-token", json={"userId": "user-a"})

    assert response.status_code == 503
    assert response.json()["detail"]["code"] == "AUTH_NOT_CONFIGURED"


def test_local_secret_cannot_authorize_when_dev_mode_is_disabled(monkeypatch) -> None:
    local_secret = "test-only-secret-with-at-least-32-characters"
    monkeypatch.setattr(settings, "auth_dev_mode", False)
    token = jwt.encode(
        {
            "sub": "attacker",
            "iss": settings.auth_jwt_issuer,
            "aud": "ai-finance-manager",
            "iat": 1,
            "exp": 4_102_444_800,
        },
        local_secret,
        algorithm="HS256",
    )

    response = client.get("/api/v1/accounts", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 503
    assert response.json()["detail"]["code"] == "AUTH_NOT_CONFIGURED"


def test_dev_token_and_auth_required_when_explicitly_enabled(monkeypatch) -> None:
    monkeypatch.setenv("AUTH_DEV_MODE", "true")
    monkeypatch.setenv("AUTH_JWT_SECRET", "test-only-secret-with-at-least-32-characters")
    isolated_settings = Settings(_env_file=None)
    assert isolated_settings.auth_dev_mode is True
    monkeypatch.setattr(settings, "auth_dev_mode", isolated_settings.auth_dev_mode)
    monkeypatch.setattr(settings, "auth_jwt_secret", isolated_settings.auth_jwt_secret)

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


def test_expired_token_rejected(monkeypatch) -> None:
    import time

    local_secret = "test-only-secret-with-at-least-32-characters"
    monkeypatch.setattr(settings, "auth_dev_mode", True)
    monkeypatch.setattr(settings, "auth_jwt_secret", local_secret)
    expired = jwt.encode(
        {
            "sub": "user-a",
            "iss": settings.auth_jwt_issuer,
            "aud": "ai-finance-manager",
            "iat": int(time.time()) - 7200,
            "exp": int(time.time()) - 3600,
        },
        local_secret,
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


def test_malformed_gateway_write_body_is_validation_error(monkeypatch) -> None:
    local_secret = "test-only-secret-with-at-least-32-characters"
    monkeypatch.setattr(settings, "auth_dev_mode", True)
    monkeypatch.setattr(settings, "auth_jwt_secret", local_secret)
    token = jwt.encode(
        {
            "sub": "user-a",
            "iss": settings.auth_jwt_issuer,
            "aud": "ai-finance-manager",
            "iat": 1,
            "exp": 4_102_444_800,
        },
        local_secret,
        algorithm="HS256",
    )

    response = client.post(
        "/api/v1/accounts",
        content="{",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Idempotency-Key": "malformed-body",
        },
    )

    assert response.status_code == 422
