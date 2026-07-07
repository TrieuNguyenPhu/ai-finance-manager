# AI providers

Interface lives in `services/ai-service` (`AIProvider` in `src/ai/providers`).

## Current state

| Provider | Status | Selection |
|---|---|---|
| Rules | Live (default) | `AI_PROVIDER=rules` or missing key |
| Groq | Live | `AI_PROVIDER=groq` + `GROQ_API_KEY` (`GROQ_MODEL` optional) |
| Gemini | Reserved | not wired |

Groq output is sanitized (entry type whitelist, integer minor units, ISO currency,
clamped confidence) and any provider error falls back to the rules parser, so the
draft flow never hard-fails on the LLM.

## Safety

Pre-aggregate in analytics-service / transaction-service; LLM narrates only.
Drafts carry `confidence`, `provenance`, and a disclaimer; the ledger write happens
only after explicit user confirmation via gateway → transaction-service.
Quota, cache, redact PII; never put keys in `apps/web`.
