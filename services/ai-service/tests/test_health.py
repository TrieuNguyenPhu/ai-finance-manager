import asyncio

from fastapi.testclient import TestClient

from ai.main import app
from ai.providers import DraftRequest
from ai.providers.rules import RulesProvider

client = TestClient(app)


def test_health() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["provider"] in {"rules", "groq"}


def test_drafts_requires_user_header() -> None:
    response = client.post("/drafts", json={"text": "coffee 45k"})
    assert response.status_code == 401


def test_rules_draft_expense() -> None:
    draft = asyncio.run(
        RulesProvider().draft(DraftRequest(text="coffee 45k", defaultCurrency="VND"))
    )
    assert draft.entryType == "EXPENSE"
    assert draft.amountMinor == 45000
    assert draft.provenance == "rules"
    assert draft.confidence > 0.5


def test_rules_draft_income_vietnamese() -> None:
    draft = asyncio.run(
        RulesProvider().draft(DraftRequest(text="nhận lương 15,000,000 vnd", defaultCurrency="VND"))
    )
    assert draft.entryType == "INCOME"
    assert draft.amountMinor == 15_000_000


def test_rules_normalizes_vietnamese_shorthand() -> None:
    provider = RulesProvider()

    thousands = asyncio.run(
        provider.draft(DraftRequest(text="ăn trưa 45 ngàn", defaultCurrency="VND"))
    )
    millions = asyncio.run(
        provider.draft(DraftRequest(text="nhận lương 15 triệu", defaultCurrency="VND"))
    )

    assert thousands.amountMinor == 45_000
    assert millions.amountMinor == 15_000_000


def test_rules_converts_usd_major_units_to_cents_exactly() -> None:
    draft = asyncio.run(
        RulesProvider().draft(DraftRequest(text="coffee $4.50", defaultCurrency="VND"))
    )
    assert draft.currency == "USD"
    assert draft.amountMinor == 450


def test_rules_rejects_fraction_beyond_currency_precision() -> None:
    draft = asyncio.run(
        RulesProvider().draft(DraftRequest(text="coffee $4.505", defaultCurrency="USD"))
    )
    assert draft.amountMinor == 0


def test_rules_does_not_treat_sentence_punctuation_as_part_of_amount() -> None:
    draft = asyncio.run(
        RulesProvider().draft(DraftRequest(text="coffee $4.50.", defaultCurrency="VND"))
    )
    assert draft.currency == "USD"
    assert draft.amountMinor == 450
