-- Align column types with the JPA mappings (String length 3 -> VARCHAR).
-- Hibernate schema validation rejects Postgres CHAR (bpchar) for VARCHAR mappings.
-- SET DATA TYPE syntax works on both PostgreSQL and H2 (tests).
ALTER TABLE accounts ALTER COLUMN currency SET DATA TYPE VARCHAR(3);
ALTER TABLE ledger_entries ALTER COLUMN currency SET DATA TYPE VARCHAR(3);
