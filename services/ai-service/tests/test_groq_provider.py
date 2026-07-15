"""GroqProvider unit tests. No real network calls — Groq API is stubbed."""

import asyncio
from typing import Any

from ai.providers import DraftRequest
from ai.providers.groq import GroqProvider
from ai.providers.rules import RulesProvider


def _provider() -> GroqProvider:
    return GroqProvider(
        api_key="test-key",
        model="test-model",
        timeout_seconds=1.0,
        fallback=RulesProvider(),
    )


def test_groq_falls_back_to_rules_on_error(monkeypatch: Any) -> None:
    provider = _provider()

    async def boom(request: DraftRequest) -> dict[str, Any]:
        raise RuntimeError("network down")

    monkeypatch.setattr(provider, "_call_groq", boom)
    draft = asyncio.run(provider.draft(DraftRequest(text="coffee 45k", defaultCurrency="VND")))
    assert draft.provenance == "rules"
    assert draft.amountMinor == 45000


def test_groq_sanitizes_model_output(monkeypatch: Any) -> None:
    provider = _provider()

    async def fake(request: DraftRequest) -> dict[str, Any]:
        return {
            "entryType": "expense",
            "amountMinor": 45000.0,
            "currency": "vnd",
            "memo": "coffee",
            "categoryHint": "Food",
            "confidence": 1.7,
        }

    monkeypatch.setattr(provider, "_call_groq", fake)
    draft = asyncio.run(provider.draft(DraftRequest(text="coffee 45k", defaultCurrency="VND")))
    assert draft.entryType == "EXPENSE"
    assert draft.amountMinor == 45000
    assert draft.currency == "VND"
    assert draft.confidence <= 0.99
    assert draft.provenance == "groq:test-model"


def test_groq_rejects_invalid_fields(monkeypatch: Any) -> None:
    provider = _provider()

    async def fake(request: DraftRequest) -> dict[str, Any]:
        return {
            "entryType": "DELETE_LEDGER",
            "amountMinor": "lots",
            "currency": "DONG!",
            "confidence": "high",
        }

    monkeypatch.setattr(provider, "_call_groq", fake)
    draft = asyncio.run(provider.draft(DraftRequest(text="mua sách", defaultCurrency="VND")))
    assert draft.entryType == "EXPENSE"
    assert draft.amountMinor == 0
    assert draft.currency == "VND"
    assert draft.confidence == 0.5
