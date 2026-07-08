"""Security and throttling middleware for the BFF edge."""

import time
from collections import deque
from typing import Awaitable, Callable

from fastapi import Request, Response
from fastapi.responses import JSONResponse

from gateway.settings import settings

_SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Cache-Control": "no-store",
    "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
}

# client ip -> timestamps of recent requests (sliding 60s window)
_windows: dict[str, deque[float]] = {}


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
