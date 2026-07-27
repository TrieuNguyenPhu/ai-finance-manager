ALTER TABLE budgets
    ADD COLUMN IF NOT EXISTS category_id UUID;

ALTER TABLE budgets
    DROP CONSTRAINT IF EXISTS budgets_user_id_category_name_year_month_key;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM budgets
        WHERE category_id IS NULL
        GROUP BY user_id, LOWER(category_name), year_month, currency
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION
            'budget migration requires duplicate legacy category names to be merged first';
    END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_budgets_category_id_month_currency
    ON budgets (user_id, category_id, year_month, currency)
    WHERE category_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_budgets_legacy_name_month_currency
    ON budgets (user_id, LOWER(category_name), year_month, currency)
    WHERE category_id IS NULL;

ALTER TABLE processed_events
    ADD COLUMN IF NOT EXISTS event_version INT NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS category_spend (
    user_id VARCHAR(128) NOT NULL,
    category_id UUID NOT NULL,
    category_name VARCHAR(120) NOT NULL,
    year_month CHAR(7) NOT NULL,
    currency CHAR(3) NOT NULL,
    spent_minor BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, category_id, year_month, currency)
);

CREATE INDEX IF NOT EXISTS idx_category_spend_user_name_month
    ON category_spend (user_id, LOWER(category_name), year_month, currency);
