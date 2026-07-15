CREATE TABLE IF NOT EXISTS budgets (
    id UUID PRIMARY KEY,
    user_id VARCHAR(128) NOT NULL,
    category_name VARCHAR(120) NOT NULL,
    year_month CHAR(7) NOT NULL,
    limit_minor BIGINT NOT NULL CHECK (limit_minor >= 0),
    currency CHAR(3) NOT NULL,
    threshold_percent INT NOT NULL DEFAULT 80 CHECK (threshold_percent BETWEEN 1 AND 100),
    spent_minor BIGINT NOT NULL DEFAULT 0 CHECK (spent_minor >= 0),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, category_name, year_month)
);

CREATE INDEX IF NOT EXISTS idx_budgets_user_month ON budgets (user_id, year_month);

CREATE TABLE IF NOT EXISTS processed_events (
    event_id UUID PRIMARY KEY,
    processed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
