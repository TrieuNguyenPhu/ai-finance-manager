"""AI draft providers. Drafts are informational only and never post ledger entries."""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Literal

from pydantic import BaseModel, Field

DISCLAIMER = "Informational draft only. Confirm before saving to the ledger."


class DraftRequest(BaseModel):
    text: str = Field(min_length=1, max_length=2000)
    defaultCurrency: str = Field(default="VND", pattern=r"^[A-Z]{3}$")


class DraftResponse(BaseModel):
    entryType: Literal["INCOME", "EXPENSE", "TRANSFER"]
    amountMinor: int = Field(ge=0)
    currency: str
    memo: str | None
    categoryHint: str | None
    confidence: float = Field(ge=0.0, le=1.0)
    provenance: str
    disclaimer: str = DISCLAIMER


class AIProvider(ABC):
    @abstractmethod
    async def draft(self, request: DraftRequest) -> DraftResponse:
        raise NotImplementedError


def get_provider(name: str) -> AIProvider:
    from ai.providers.groq import GroqProvider
    from ai.providers.rules import RulesProvider
    from ai.settings import settings

    rules = RulesProvider()
    if name == "groq" and settings.groq_api_key:
        return GroqProvider(
            api_key=settings.groq_api_key,
            model=settings.groq_model,
            timeout_seconds=settings.groq_timeout_seconds,
            fallback=rules,
        )
    return rules
