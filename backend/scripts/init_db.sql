-- =============================================================
--  3rdEyeTech_DB — PostgreSQL Schema
--  Run once to initialize the database:
--    node backend/scripts/init_db.js
-- =============================================================

-- ── Orders ───────────────────────────────────────────────────
-- Tracks every Razorpay order created by the backend.
CREATE TABLE IF NOT EXISTS orders (
  id                  SERIAL          PRIMARY KEY,
  razorpay_order_id   VARCHAR(64)     NOT NULL UNIQUE,
  amount              NUMERIC(10,2)   NOT NULL,          -- in RUPEES (₹)
  currency            VARCHAR(8)      NOT NULL DEFAULT 'INR',
  receipt             VARCHAR(128),
  status              VARCHAR(32)     NOT NULL DEFAULT 'created', -- created | paid | failed
  customer_name       VARCHAR(128),
  customer_email      VARCHAR(256),
  customer_phone      VARCHAR(20),
  notes               JSONB,
  created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- ── Payments ─────────────────────────────────────────────────
-- Records the Razorpay payment entity once a payment is verified.
CREATE TABLE IF NOT EXISTS payments (
  id                  SERIAL          PRIMARY KEY,
  razorpay_payment_id VARCHAR(64)     NOT NULL UNIQUE,
  razorpay_order_id   VARCHAR(64)     NOT NULL REFERENCES orders(razorpay_order_id) ON DELETE CASCADE,
  amount              NUMERIC(10,2)   NOT NULL,          -- in RUPEES (₹)
  currency            VARCHAR(8)      NOT NULL DEFAULT 'INR',
  status              VARCHAR(32)     NOT NULL DEFAULT 'captured',
  method              VARCHAR(64),                       -- card | upi | netbanking | wallet …
  email               VARCHAR(256),
  contact             VARCHAR(20),
  created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- ── Refunds ──────────────────────────────────────────────────
-- Records refunds issued against a payment.
CREATE TABLE IF NOT EXISTS refunds (
  id                  SERIAL          PRIMARY KEY,
  razorpay_refund_id  VARCHAR(64)     NOT NULL UNIQUE,
  razorpay_payment_id VARCHAR(64)     NOT NULL REFERENCES payments(razorpay_payment_id) ON DELETE CASCADE,
  amount              NUMERIC(10,2)   NOT NULL,          -- in RUPEES (₹)
  status              VARCHAR(32)     NOT NULL DEFAULT 'created', -- created | processed | failed
  speed               VARCHAR(16)     NOT NULL DEFAULT 'normal',
  notes               JSONB,
  created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- ── Auto-update updated_at on orders ─────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_orders_updated_at ON orders;
CREATE TRIGGER set_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── Indexes ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_orders_status          ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_customer_email  ON orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_payments_order_id      ON payments(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_refunds_payment_id     ON refunds(razorpay_payment_id);

