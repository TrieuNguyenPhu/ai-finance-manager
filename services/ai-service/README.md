# ai-service (FastAPI)

Natural-language drafts, categorization, narrative insights for **ai-finance-manager**.
**Does not write the ledger** — gateway requires UI confirm-before-save.

## Providers

1. Rules → 2. Gemini Flash → 3. Groq fallback

## Requirements

- Python **3.13+**
- uv

## Commands

```bash
uv sync --extra dev
uv run uvicorn ai.main:app --reload --app-dir src --host 127.0.0.1 --port 8001
uv run pytest
```

Health: `GET http://127.0.0.1:8001/health`
