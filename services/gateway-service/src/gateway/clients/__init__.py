import logging
from typing import Any

import httpx
from fastapi import HTTPException, Response

from gateway.settings import settings

logger = logging.getLogger(__name__)


class UpstreamClient:
    """Shared async HTTP client with connection pooling for all upstream calls."""

    def __init__(self) -> None:
        self._client: httpx.AsyncClient | None = None

    async def startup(self) -> None:
        self._client = httpx.AsyncClient(
            timeout=httpx.Timeout(10.0, connect=3.0),
            limits=httpx.Limits(max_connections=100, max_keepalive_connections=20),
        )

    async def shutdown(self) -> None:
        if self._client is not None:
            await self._client.aclose()
            self._client = None

    async def request(
        self,
        method: str,
        base_url: str,
        path: str,
        *,
        user_id: str,
        json_body: Any | None = None,
        headers: dict[str, str] | None = None,
        params: dict[str, str] | None = None,
    ) -> Response:
        upstream_headers = {"X-User-Id": user_id, "Accept": "application/json"}
        if headers:
            upstream_headers.update(headers)
        url = f"{base_url.rstrip('/')}/{path.lstrip('/')}"
        client = self._client
        if client is None:  # e.g. TestClient without lifespan
            client = httpx.AsyncClient(timeout=httpx.Timeout(10.0, connect=3.0))
            try:
                return await self._send(client, method, url, json_body, upstream_headers, params)
            finally:
                await client.aclose()
        return await self._send(client, method, url, json_body, upstream_headers, params)

    async def _send(
        self,
        client: httpx.AsyncClient,
        method: str,
        url: str,
        json_body: Any | None,
        headers: dict[str, str],
        params: dict[str, str] | None,
    ) -> Response:
        try:
            upstream = await client.request(
                method, url, json=json_body, headers=headers, params=params
            )
        except httpx.HTTPError as exc:
            # Log details server-side only; never leak internal hosts/errors to clients.
            logger.warning("Upstream %s %s failed: %s", method, url, exc)
            raise HTTPException(
                status_code=502,
                detail={"code": "UPSTREAM_UNAVAILABLE", "message": "Upstream service unavailable"},
            ) from exc

        content_type = upstream.headers.get("content-type", "application/json")
        return Response(
            content=upstream.content,
            status_code=upstream.status_code,
            media_type=content_type,
        )


upstream = UpstreamClient()


def identity_url() -> str:
    return settings.identity_base_url


def transaction_url() -> str:
    return settings.transaction_base_url


def budget_url() -> str:
    return settings.budget_base_url


def analytics_url() -> str:
    return settings.analytics_base_url


def ai_url() -> str:
    return settings.ai_base_url


def notification_url() -> str:
    return settings.notification_base_url
