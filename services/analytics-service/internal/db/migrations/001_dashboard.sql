CREATE TABLE IF NOT EXISTS monthly_totals (
    user_id VARCHAR(128) NOT NULL,
    year_month CHAR(7) NOT NULL,
    currency CHAR(3) NOT NULL,
    income_minor BIGINT NOT NULL DEFAULT 0,
    expense_minor BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, year_month, currency)
);

CREATE TABLE IF NOT EXISTS processed_events (
    event_id UUID PRIMARY KEY,
    processed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
