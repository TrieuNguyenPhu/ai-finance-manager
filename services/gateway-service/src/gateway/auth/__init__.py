import time
from dataclasses import dataclass
from functools import lru_cache
from typing import Any

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from gateway.settings import settings

_bearer = HTTPBearer(auto_error=False)

_AUDIENCE = "ai-finance-manager"


@dataclass(frozen=True)
class AuthUser:
    user_id: str


def create_dev_token(user_id: str) -> str:
    if not dev_auth_is_configured():
        raise RuntimeError("development authentication is not configured")
    now = int(time.time())
    return jwt.encode(
        {
            "sub": user_id,
            "iss": settings.auth_jwt_issuer,
            "aud": _AUDIENCE,
            "iat": now,
            "exp": now + settings.auth_token_ttl_seconds,
        },
        settings.auth_jwt_secret,
        algorithm="HS256",
    )


def dev_auth_is_configured() -> bool:
    return settings.auth_dev_mode and len(settings.auth_jwt_secret) >= 32


def auth_is_configured() -> bool:
    if settings.auth_dev_mode:
        return dev_auth_is_configured()
    issuer = _cognito_setting("issuer")
    return bool(issuer and issuer.startswith("https://") and _cognito_setting("client_id"))


def require_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> AuthUser:
    if not auth_is_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "code": "AUTH_NOT_CONFIGURED",
                "message": "Authentication is not configured for this environment",
            },
        )
    if credentials is None or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "UNAUTHORIZED", "message": "Bearer token required"},
        )
    payload = (
        _decode_dev_token(credentials.credentials)
        if settings.auth_dev_mode
        else _decode_cognito_access_token(credentials.credentials)
    )
    sub = payload.get("sub")
    if not isinstance(sub, str) or not sub.strip() or len(sub.strip()) > 128:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "UNAUTHORIZED", "message": "Token has an invalid sub"},
        )
    return AuthUser(user_id=sub.strip())


def _decode_dev_token(token: str) -> dict[str, Any]:
    try:
        return jwt.decode(
            token,
            settings.auth_jwt_secret,
            algorithms=["HS256"],
            audience=_AUDIENCE,
            issuer=settings.auth_jwt_issuer,
            options={"require": ["exp", "iat", "sub"]},
        )
    except jwt.ExpiredSignatureError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "TOKEN_EXPIRED", "message": "Token expired"},
        ) from exc
    except jwt.PyJWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "UNAUTHORIZED", "message": "Invalid token"},
        ) from exc


def _decode_cognito_access_token(token: str) -> dict[str, Any]:
    issuer = _cognito_setting("issuer")
    client_id = _cognito_setting("client_id")
    if not issuer or not client_id or not issuer.startswith("https://"):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "code": "AUTH_NOT_CONFIGURED",
                "message": "Authentication is not configured for this environment",
            },
        )
    try:
        signing_key = _jwks_client(issuer).get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            issuer=issuer,
            options={
                "require": ["exp", "iat", "sub", "token_use", "client_id"],
                "verify_aud": False,
            },
        )
    except jwt.ExpiredSignatureError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "TOKEN_EXPIRED", "message": "Token expired"},
        ) from exc
    except jwt.PyJWKClientConnectionError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "code": "AUTH_PROVIDER_UNAVAILABLE",
                "message": "Authentication provider unavailable",
            },
        ) from exc
    except jwt.PyJWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "UNAUTHORIZED", "message": "Invalid token"},
        ) from exc

    if payload.get("token_use") != "access" or payload.get("client_id") != client_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "UNAUTHORIZED", "message": "Invalid token"},
        )
    return payload


@lru_cache(maxsize=4)
def _jwks_client(issuer: str) -> jwt.PyJWKClient:
    return jwt.PyJWKClient(
        f"{issuer.rstrip('/')}/.well-known/jwks.json",
        cache_keys=True,
        lifespan=300,
        timeout=3,
    )


def _cognito_setting(name: str) -> str | None:
    raw = settings.cognito_issuer if name == "issuer" else settings.cognito_client_id
    value = raw.strip() if raw else ""
    return value.rstrip("/") if name == "issuer" and value else value or None
