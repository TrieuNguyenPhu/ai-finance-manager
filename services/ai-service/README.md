# ai-service (FastAPI)

Natural-language drafts, categorization, narrative insights for **ai-finance-manager**.
**Does not write the ledger** — gateway requires UI confirm-before-save.

## Providers

- `AI_PROVIDER=groq` + `GROQ_API_KEY` → Groq LLM (`GROQ_MODEL`, default `llama-3.3-70b-versatile`), falls back to rules on any error.
- `AI_PROVIDER=rules` (default) → deterministic parser, no network.
- Gemini reserved for later.

Configure via env vars or a local `.env` in this folder (gitignored).

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
