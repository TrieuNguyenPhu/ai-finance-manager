from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from gateway.settings import settings

app = FastAPI(
    title="ai-finance-manager gateway-service",
    version="0.1.0",
    description=(
        "BFF for ai-finance-manager. Browser talks only here. "
        "Domain writes go to transaction-service after explicit UI confirmation."
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "gateway-service"}
