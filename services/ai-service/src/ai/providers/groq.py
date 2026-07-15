"""Groq (OpenAI-compatible) draft provider with rules fallback.

The LLM only proposes a draft; deterministic validation happens here and the
ledger write always requires explicit user confirmation downstream.
"""

from __future__ import annotations

import json
import logging
from typing import Any

import httpx

from ai.providers import AIProvider, DraftRequest, DraftResponse

logger = logging.getLogger(__name__)

_GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

_SYSTEM_PROMPT = (
    "You extract a personal-finance transaction draft from user text "
    "(Vietnamese or English). Respond with ONLY a JSON object:\n"
    '{"entryType":"INCOME|EXPENSE|TRANSFER","amountMinor":<integer>,'
    '"currency":"<ISO 4217, uppercase>","memo":"<short summary, max 200 chars>",'
    '"categoryHint":"<one of Food, Transport, Shopping, Bills, Salary, Health, '
    'Entertainment, Other, or null>","confidence":<0.0-1.0>}\n'
    "amountMinor is the amount in minor units: VND has no minor unit so 45k VND = 45000; "
    "USD uses cents so $4.50 = 450. Numbers with k/nghìn mean thousands. "
    "If no amount is found use 0 and lower confidence. Never invent amounts."
)


class GroqProvider(AIProvider):
    def __init__(
        self,
        *,
        api_key: str,
        model: str,
        timeout_seconds: float,
        fallback: AIProvider,
    ) -> None:
        self._api_key = api_key
        self._model = model
        self._timeout = httpx.Timeout(timeout_seconds, connect=5.0)
        self._fallback = fallback

    async def draft(self, request: DraftRequest) -> DraftResponse:
        try:
            payload = await self._call_groq(request)
            return self._to_response(payload, request)
        except Exception:
            # Never fail user flow on provider errors; degrade to deterministic rules.
            logger.warning("groq draft failed, falling back to rules", exc_info=True)
            return await self._fallback.draft(request)

    async def _call_groq(self, request: DraftRequest) -> dict[str, Any]:
        body = {
            "model": self._model,
            "temperature": 0.0,
            "max_tokens": 300,
            "response_format": {"type": "json_object"},
            "messages": [
                {"role": "system", "content": _SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": (
                        f"Default currency: {request.defaultCurrency.upper()}\n"
                        f"Text: {request.text[:2000]}"
                    ),
                },
            ],
        }
        async with httpx.AsyncClient(timeout=self._timeout) as client:
            res = await client.post(
                _GROQ_URL,
                json=body,
                headers={"Authorization": f"Bearer {self._api_key}"},
            )
        res.raise_for_status()
        content = res.json()["choices"][0]["message"]["content"]
        parsed = json.loads(content)
        if not isinstance(parsed, dict):
            raise ValueError("Groq response is not a JSON object")
        return parsed

    def _to_response(self, payload: dict[str, Any], request: DraftRequest) -> DraftResponse:
        entry_type = str(payload.get("entryType", "EXPENSE")).upper()
        if entry_type not in {"INCOME", "EXPENSE", "TRANSFER"}:
            entry_type = "EXPENSE"

        amount_raw = payload.get("amountMinor", 0)
        # Amounts must be integers in minor units; reject floats/strings the model may emit.
        amount_minor = int(amount_raw) if isinstance(amount_raw, (int, float)) else 0
        amount_minor = max(amount_minor, 0)

        currency = str(payload.get("currency") or request.defaultCurrency).upper()
        if len(currency) != 3 or not currency.isalpha():
            currency = request.defaultCurrency.upper()

        memo = payload.get("memo")
        memo = str(memo)[:500] if memo else request.text[:500]

        category = payload.get("categoryHint")
        category = str(category)[:64] if category else None

        try:
            confidence = float(payload.get("confidence", 0.5))
        except (TypeError, ValueError):
            confidence = 0.5
        confidence = min(max(confidence, 0.0), 0.99)

        return DraftResponse(
            entryType=entry_type,  # type: ignore[arg-type]
            amountMinor=amount_minor,
            currency=currency,
            memo=memo,
            categoryHint=category,
            confidence=confidence,
            provenance=f"groq:{self._model}",
        )
