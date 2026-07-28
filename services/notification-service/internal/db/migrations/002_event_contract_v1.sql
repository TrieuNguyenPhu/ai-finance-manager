ALTER TABLE processed_events
    ADD COLUMN IF NOT EXISTS event_version INT NOT NULL DEFAULT 0;
