-- ================================================================
--  Migration: Convert notes columns from JSONB → TEXT
--  Run once against your live database:
--    psql -U <user> -d <dbname> -f migrate_notes_to_text.sql
-- ================================================================

-- orders.notes: extract the "purpose" value from existing JSON rows
ALTER TABLE orders
  ALTER COLUMN notes TYPE TEXT
  USING (notes->>'purpose');

-- refunds.notes: extract the "purpose" value (or fall back to the whole JSON as text)
ALTER TABLE refunds
  ALTER COLUMN notes TYPE TEXT
  USING COALESCE(notes->>'purpose', notes::TEXT);
