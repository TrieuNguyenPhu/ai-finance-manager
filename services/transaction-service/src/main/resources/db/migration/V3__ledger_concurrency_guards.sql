ALTER TABLE accounts
    ADD COLUMN version BIGINT NOT NULL DEFAULT 0;

ALTER TABLE ledger_entries
    ADD CONSTRAINT uq_ledger_entries_reverses_entry UNIQUE (reverses_entry_id);
