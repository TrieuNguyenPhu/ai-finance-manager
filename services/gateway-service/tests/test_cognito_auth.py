import json
import time
from typing import Any

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials

import gateway.auth as auth
from gateway.settings import settings


class _StaticJwksClient:
    def __init__(self, signing_key: jwt.PyJWK) -> None:
        self._signing_key = signing_key

    def get_signing_key_from_jwt(self, token: str) -> jwt.PyJWK:
        return self._signing_key


class _UnavailableJwksClient:
    def get_signing_key_from_jwt(self, token: str) -> jwt.PyJWK:
        raise jwt.PyJWKClientConnectionError("provider unavailable")


def _cognito_token(
    client_id: str,
    *,
    issuer: str = "https://issuer.example",
    token_use: str = "access",
    expires_in: int = 300,
) -> tuple[str, jwt.PyJWK]:
    private_key = rsa.generate_private_key(public_exponent=65_537, key_size=2048)
    jwk_data = json.loads(jwt.algorithms.RSAAlgorithm.to_jwk(private_key.public_key()))
    jwk_data["kid"] = "test-key"
    signing_key = jwt.PyJWK.from_dict(jwk_data)
    now = int(time.time())
    token = jwt.encode(
        {
            "sub": "cognito-user",
            "iss": issuer,
            "client_id": client_id,
            "token_use": token_use,
            "iat": now,
            "exp": now + expires_in,
        },
        private_key,
        algorithm="RS256",
        headers={"kid": "test-key"},
    )
    return token, signing_key


def test_cognito_access_token_is_verified(monkeypatch: Any) -> None:
    token, signing_key = _cognito_token("web-client")
    monkeypatch.setattr(settings, "auth_dev_mode", False)
    monkeypatch.setattr(settings, "cognito_issuer", "https://issuer.example")
    monkeypatch.setattr(settings, "cognito_client_id", "web-client")
    monkeypatch.setattr(auth, "_jwks_client", lambda issuer: _StaticJwksClient(signing_key))

    user = auth.require_user(
        HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
    )

    assert user.user_id == "cognito-user"


def test_cognito_access_token_rejects_wrong_app_client(monkeypatch: Any) -> None:
    token, signing_key = _cognito_token("another-client")
    monkeypatch.setattr(settings, "auth_dev_mode", False)
    monkeypatch.setattr(settings, "cognito_issuer", "https://issuer.example")
    monkeypatch.setattr(settings, "cognito_client_id", "web-client")
    monkeypatch.setattr(auth, "_jwks_client", lambda issuer: _StaticJwksClient(signing_key))

    with pytest.raises(HTTPException) as captured:
        auth.require_user(HTTPAuthorizationCredentials(scheme="Bearer", credentials=token))

    assert captured.value.status_code == 401


@pytest.mark.parametrize(
    ("token_kwargs", "expected_status"),
    [
        ({"issuer": "https://wrong-issuer.example"}, 401),
        ({"token_use": "id"}, 401),
        ({"expires_in": -1}, 401),
    ],
)
def test_cognito_access_token_rejects_invalid_claims(
    monkeypatch: Any,
    token_kwargs: dict[str, Any],
    expected_status: int,
) -> None:
    token, signing_key = _cognito_token("web-client", **token_kwargs)
    monkeypatch.setattr(settings, "auth_dev_mode", False)
    monkeypatch.setattr(settings, "cognito_issuer", "https://issuer.example")
    monkeypatch.setattr(settings, "cognito_client_id", "web-client")
    monkeypatch.setattr(auth, "_jwks_client", lambda issuer: _StaticJwksClient(signing_key))

    with pytest.raises(HTTPException) as captured:
        auth.require_user(HTTPAuthorizationCredentials(scheme="Bearer", credentials=token))

    assert captured.value.status_code == expected_status


def test_cognito_jwks_outage_is_temporary_unavailability(monkeypatch: Any) -> None:
    token, _ = _cognito_token("web-client")
    monkeypatch.setattr(settings, "auth_dev_mode", False)
    monkeypatch.setattr(settings, "cognito_issuer", "https://issuer.example")
    monkeypatch.setattr(settings, "cognito_client_id", "web-client")
    monkeypatch.setattr(auth, "_jwks_client", lambda issuer: _UnavailableJwksClient())

    with pytest.raises(HTTPException) as captured:
        auth.require_user(HTTPAuthorizationCredentials(scheme="Bearer", credentials=token))

    assert captured.value.status_code == 503


def test_non_https_cognito_issuer_is_not_ready(monkeypatch: Any) -> None:
    monkeypatch.setattr(settings, "auth_dev_mode", False)
    monkeypatch.setattr(settings, "cognito_issuer", "http://issuer.example")
    monkeypatch.setattr(settings, "cognito_client_id", "web-client")

    assert auth.auth_is_configured() is False
