import asyncio
import json

import httpx

from gateway.clients import UpstreamClient


def test_upstream_server_error_is_sanitized() -> None:
    async def scenario() -> None:
        def handler(request: httpx.Request) -> httpx.Response:
            return httpx.Response(
                500,
                json={"detail": "database password leaked"},
                request=request,
            )

        client = UpstreamClient()
        client._client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
        try:
            response = await client.request(
                "GET",
                "http://internal.example",
                "/accounts",
                user_id="user-a",
            )
        finally:
            await client.shutdown()

        assert response.status_code == 502
        body = json.loads(response.body)
        assert body["detail"]["code"] == "UPSTREAM_UNAVAILABLE"
        assert "password" not in response.body.decode()

    asyncio.run(scenario())
