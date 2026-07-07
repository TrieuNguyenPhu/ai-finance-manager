from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from gateway.clients import upstream
from gateway.middleware import limit_body_size, rate_limit, security_headers
from gateway.routes import router
from gateway.settings import settings


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    await upstream.startup()
    yield
    await upstream.shutdown()


app = FastAPI(
    title="ai-finance-manager gateway-service",
    version="0.1.0",
    description=(
        "BFF for ai-finance-manager. Browser talks only here. "
        "Domain writes go to transaction-service after explicit UI confirmation."
    ),
    lifespan=lifespan,
)

# Middleware runs bottom-up: body limit -> rate limit -> security headers -> CORS.
app.middleware("http")(limit_body_size)
app.middleware("http")(rate_limit)
app.middleware("http")(security_headers)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type", "Idempotency-Key"],
)

app.include_router(router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "gateway-service"}
