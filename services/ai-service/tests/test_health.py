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
