"""Deterministic rules-first draft parser. No network calls."""

from __future__ import annotations

import re
from decimal import Decimal, InvalidOperation
from typing import Literal

from ai.providers import AIProvider, DraftRequest, DraftResponse

_MAX_SAFE_MINOR = 9_007_199_254_740_991
_ZERO_DECIMAL_CURRENCIES = frozenset(
    {
        "BIF",
        "CLP",
        "DJF",
        "GNF",
        "ISK",
        "JPY",
        "KMF",
        "KRW",
        "PYG",
        "RWF",
        "UGX",
        "VND",
        "VUV",
        "XAF",
        "XOF",
        "XPF",
    }
)
_THREE_DECIMAL_CURRENCIES = frozenset({"BHD", "IQD", "JOD", "KWD", "LYD", "OMR", "TND"})
_FOUR_DECIMAL_CURRENCIES = frozenset({"CLF", "UYW"})


class RulesProvider(AIProvider):
    _amount = re.compile(
        r"(?P<symbol>\$)?\s*(?P<amount>\d(?:[\d.,]*\d)?)\s*"
        r"(?P<unit>nghìn|nghin|ngàn|ngan|triệu|trieu|usd|vnd|k|tr)?(?!\w)",
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
        currency = request.defaultCurrency.upper()
        match = self._amount.search(text)
        if match:
            unit = (match.group("unit") or "").lower()
            if match.group("symbol") == "$" or unit == "usd":
                currency = "USD"
            elif unit == "vnd":
                currency = "VND"
            amount_minor = _major_text_to_minor(
                match.group("amount"),
                currency,
                unit_multiplier=_unit_multiplier(unit),
            )

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
            currency=currency,
            memo=text[:500],
            categoryHint=category,
            confidence=min(confidence, 0.95),
            provenance="rules",
        )


def _major_text_to_minor(raw: str, currency: str, *, unit_multiplier: int) -> int:
    exponent = _currency_exponent(currency)
    normalized = _normalize_number(
        raw,
        exponent=exponent,
        has_shorthand=unit_multiplier != 1,
    )
    if normalized is None:
        return 0

    try:
        major = Decimal(normalized)
    except InvalidOperation:
        return 0
    major *= unit_multiplier

    scaled = major * (Decimal(10) ** exponent)
    if scaled != scaled.to_integral_value():
        return 0
    amount_minor = int(scaled)
    if amount_minor < 0 or amount_minor > _MAX_SAFE_MINOR:
        return 0
    return amount_minor


def _normalize_number(raw: str, *, exponent: int, has_shorthand: bool) -> str | None:
    if not raw or not re.fullmatch(r"\d+(?:[.,]\d+)*", raw):
        return None

    has_comma = "," in raw
    has_dot = "." in raw
    if has_comma and has_dot:
        decimal_separator = "," if raw.rfind(",") > raw.rfind(".") else "."
        grouping_separator = "." if decimal_separator == "," else ","
        grouped = raw.replace(grouping_separator, "")
        if grouped.count(decimal_separator) != 1:
            return None
        return grouped.replace(decimal_separator, ".")

    separator = "," if has_comma else "." if has_dot else ""
    if not separator:
        return raw

    groups = raw.split(separator)
    if len(groups) > 2:
        if all(len(group) == 3 for group in groups[1:]):
            return "".join(groups)
        return None

    whole, fraction = groups
    if not whole or not fraction:
        return None
    if not has_shorthand and len(fraction) == 3 and (separator == "," or exponent == 0):
        return whole + fraction
    return f"{whole}.{fraction}"


def _unit_multiplier(unit: str) -> int:
    if unit in {"k", "nghìn", "nghin", "ngàn", "ngan"}:
        return 1_000
    if unit in {"triệu", "trieu", "tr"}:
        return 1_000_000
    return 1


def _currency_exponent(currency: str) -> int:
    if currency in _ZERO_DECIMAL_CURRENCIES:
        return 0
    if currency in _THREE_DECIMAL_CURRENCIES:
        return 3
    if currency in _FOUR_DECIMAL_CURRENCIES:
        return 4
    return 2
