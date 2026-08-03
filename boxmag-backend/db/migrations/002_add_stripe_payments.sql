-- Adds Stripe payment tracking columns to the orders table.
-- Run once on existing databases that were created before Stripe checkout was added.

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS stripe_session_id VARCHAR(255) NULL AFTER status,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id VARCHAR(255) NULL AFTER stripe_session_id,
  ADD COLUMN IF NOT EXISTS payment_status VARCHAR(40) NOT NULL DEFAULT 'pending' AFTER stripe_payment_intent_id,
  ADD COLUMN IF NOT EXISTS total_amount_cents INT UNSIGNED NULL AFTER payment_status,
  ADD COLUMN IF NOT EXISTS currency VARCHAR(10) NULL AFTER total_amount_cents;

-- Helpful index for webhook lookups by Stripe session id.
ALTER TABLE orders
  ADD INDEX IF NOT EXISTS idx_orders_stripe_session_id (stripe_session_id);
