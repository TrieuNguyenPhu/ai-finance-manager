# AI providers

Interface lives in `services/ai-service`.

## Order
1. Rule-based
2. Gemini Flash / Flash-Lite
3. Groq fallback

## Safety
Pre-aggregate in analytics-service / transaction-service; LLM narrates only.
Quota, cache, redact PII; never put keys in `apps/web`.
