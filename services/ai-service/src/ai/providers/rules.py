"""Deterministic rules-first draft parser. No network calls."""

from __future__ import annotations

import re
from typing import Literal

from ai.providers import AIProvider, DraftRequest, DraftResponse


class RulesProvider(AIProvider):
    _amount = re.compile(
        r"(?P<amount>\d[\d.,]*)\s*(?P<unit>k|nghìn|nghin|usd|vnd|\$)?",
        re.IGNORECASE,
    )

    async def draft(self, request: DraftRequest) -> DraftResponse:
        text = request.text.strip()
        lower = text.lower()
        entry_type: Literal["INCOME", "EXPENSE", "TRANSFER"] = "EXPENSE"
        if any(w in lower for w in ("salary", "lương", "income", "received", "refund")):
            entry_type = "INCOME"
        elif any(w in lower for w in ("transfer", "chuyển", "move to")):
            entry_type = "TRANSFER"

        amount_minor = 0
        match = self._amount.search(text.replace(",", ""))
        if match:
            raw = match.group("amount").replace(",", "").split(".", 1)[0]
            try:
                value = int(raw)
            except ValueError:
                value = 0
            unit = (match.group("unit") or "").lower()
            if unit in {"k", "nghìn", "nghin"}:
                value *= 1000
            # MVP: treat major units as minor units for VND-like currencies.
            amount_minor = value

        category = None
        for hint, words in (
            ("Food", ("coffee", "café", "cafe", "lunch", "ăn", "phở")),
            ("Transport", ("grab", "taxi", "uber", "xăng", "fuel")),
            ("Shopping", ("shopee", "lazada", "mall")),
        ):
            if any(w in lower for w in words):
                category = hint
                break

        confidence = 0.55
        if amount_minor > 0:
            confidence += 0.25
        if category:
            confidence += 0.1

        return DraftResponse(
            entryType=entry_type,
            amountMinor=max(amount_minor, 0),
            currency=request.defaultCurrency.upper(),
            memo=text[:500],
            categoryHint=category,
            confidence=min(confidence, 0.95),
            provenance="rules",
        )
