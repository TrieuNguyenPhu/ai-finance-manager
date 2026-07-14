# ai-insight

Python / FastAPI service for AI-assisted insights and classification.

This foundation commit exposes `/health` only. AI providers and insight features are not implemented yet.

AI must never directly mutate the ledger.

## Requirements

- Python 3.12+
- [uv](https://github.com/astral-sh/uv)

## Commands

```bash
uv sync
uv run ruff check .
uv run mypy .
uv run pytest
uv run uvicorn ai_insight.main:app --reload --port 8082
```

Default port: `8082` (`AI_INSIGHT_PORT`).
