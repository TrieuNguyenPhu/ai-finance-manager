-- Align column type with the JPA mapping (String length 3 -> VARCHAR).
-- Hibernate schema validation rejects Postgres CHAR (bpchar) for VARCHAR mappings.
-- SET DATA TYPE syntax works on both PostgreSQL and H2 (tests).
ALTER TABLE profiles ALTER COLUMN preferred_currency SET DATA TYPE VARCHAR(3);
