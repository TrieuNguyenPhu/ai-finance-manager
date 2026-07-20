"""Security and throttling middleware for the BFF edge."""

import time
from collections import deque
import logging
from typing import Awaitable, Callable, Literal

from fastapi import Request, Response
from fastapi.responses import JSONResponse
from redis.asyncio import Redis
from redis.exceptions import RedisError

from gateway.settings import settings

logger = logging.getLogger(__name__)

_SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Cache-Control": "no-store",
    "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
}

# client ip -> timestamps of recent requests (sliding 60s window)
_windows: dict[str, deque[float]] = {}
_redis: Redis | None = None


async def startup_rate_limit() -> None:
    global _redis
    if not settings.redis_url:
        return
    client = Redis.from_url(settings.redis_url, decode_responses=True, max_connections=20)
    try:
        await client.ping()
    except RedisError as exc:
        await client.aclose()
        logger.warning("Redis rate limiter unavailable; using local fallback: %s", exc)
        return
    _redis = client


async def shutdown_rate_limit() -> None:
    global _redis
    if _redis is not None:
        await _redis.aclose()
        _redis = None


async def _redis_rate_limit(client_ip: str) -> Response | Literal[True] | None:
    if _redis is None:
        return None
    bucket = int(time.time() // 60)
    key = f"afm:rate:{bucket}:{client_ip}"
    try:
        count = await _redis.incr(key)
        if count == 1:
            await _redis.expire(key, 120)
    except RedisError as exc:
        logger.warning("Redis rate limiter request failed; using local fallback: %s", exc)
        return None
    if count > settings.rate_limit_per_minute:
        return JSONResponse(
            status_code=429,
            content={"detail": {"code": "RATE_LIMITED", "message": "Too many requests"}},
            headers={"Retry-After": "60"},
        )
    return True


async def security_headers(
    request: Request, call_next: Callable[[Request], Awaitable[Response]]
) -> Response:
    response = await call_next(request)
    for name, value in _SECURITY_HEADERS.items():
        response.headers.setdefault(name, value)
    return response


async def rate_limit(
    request: Request, call_next: Callable[[Request], Awaitable[Response]]
) -> Response:
    client_ip = request.client.host if request.client else "unknown"
    redis_result = await _redis_rate_limit(client_ip)
    if redis_result is not None:
        if redis_result is True:
            return await call_next(request)
        return redis_result

    now = time.monotonic()
    window = _windows.setdefault(client_ip, deque())
    while window and now - window[0] > 60.0:
        window.popleft()
    if len(window) >= settings.rate_limit_per_minute:
        return JSONResponse(
            status_code=429,
            content={"detail": {"code": "RATE_LIMITED", "message": "Too many requests"}},
            headers={"Retry-After": "60"},
        )
    window.append(now)
    return await call_next(request)


async def limit_body_size(
    request: Request, call_next: Callable[[Request], Awaitable[Response]]
) -> Response:
    content_length = request.headers.get("content-length")
    if content_length is not None:
        try:
            if int(content_length) > settings.max_request_body_bytes:
                return JSONResponse(
                    status_code=413,
                    content={
                        "detail": {"code": "PAYLOAD_TOO_LARGE", "message": "Request body too large"}
                    },
                )
        except ValueError:
            return JSONResponse(
                status_code=400,
                content={"detail": {"code": "BAD_REQUEST", "message": "Invalid Content-Length"}},
            )
    return await call_next(request)
