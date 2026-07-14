-- Logical schemas for local development (single Postgres instance).
-- Production may use separate databases later; ownership boundaries remain per module.

CREATE SCHEMA IF NOT EXISTS finance_core;
CREATE SCHEMA IF NOT EXISTS ai_insight;
