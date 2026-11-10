-- =============================================================
--  Migration: paise → rupees + customer column fix
--  Run ONCE on an existing 3rdEyeTech_DB:
--    psql -d 3rdEyeTech_DB -f scripts/migrate_v2.sql
-- =============================================================

-- 1. Change amount columns from INTEGER (paise) to NUMERIC(10,2) (rupees)
ALTER TABLE orders   ALTER COLUMN amount TYPE NUMERIC(10,2) USING (amount / 100.0);
ALTER TABLE payments ALTER COLUMN amount TYPE NUMERIC(10,2) USING (amount / 100.0);
ALTER TABLE refunds  ALTER COLUMN amount TYPE NUMERIC(10,2) USING (amount / 100.0);

-- 2. Update comments / descriptions
COMMENT ON COLUMN orders.amount   IS 'Amount in RUPEES (₹)';
COMMENT ON COLUMN payments.amount IS 'Amount in RUPEES (₹)';
COMMENT ON COLUMN refunds.amount  IS 'Amount in RUPEES (₹)';

-- 3. Backfill customer_name / customer_email / customer_phone
--    from the notes JSONB column for any rows already inserted as NULL.
UPDATE orders
SET
  customer_name  = COALESCE(customer_name,  notes->>'name'),
  customer_email = COALESCE(customer_email, notes->>'email'),
  customer_phone = COALESCE(customer_phone, notes->>'phone')
WHERE
  notes IS NOT NULL
  AND (customer_name IS NULL OR customer_email IS NULL OR customer_phone IS NULL);

-- 4. Clean up the notes column to keep ONLY the note ({ "purpose": ... })
UPDATE orders
SET notes = CASE
  WHEN notes->>'purpose' IS NOT NULL THEN jsonb_build_object('purpose', notes->>'purpose')
  ELSE NULL
END
WHERE
  notes IS NOT NULL
  AND (notes ? 'name' OR notes ? 'email' OR notes ? 'phone');

