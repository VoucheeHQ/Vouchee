-- =====================================================
-- Customer referral scheme
-- =====================================================
-- Two-sided 1-month-free reward when a customer signs up via a referral
-- link and successfully starts cleans with a confirmed cleaner.
--
-- Trigger condition (enforced by /api/cron/referral-credits, not the DB):
--   referee has a fulfilled clean_request whose start_date + 24h is past,
--   AND now() is past cooling_off_until (UK consumer cancellation window),
--   AND referee customers.subscription_status = 'active'.
--
-- When the trigger fires:
--   1. Pause the referee's GoCardless subscription by 1 cycle (free month).
--   2. If the referrer's subscription is still active, pause theirs by 1
--      cycle too. If not, mark referrer_skipped_reason and leave them out
--      — no clawback, no waiting.
--   3. Update the referral_credits row: state='applied', timestamps.
--   4. Send two emails (one to each side).
--
-- Uncapped: each successful referral creates a separate referral_credits
-- row, and the cron applies them one cycle at a time, so a power-referrer
-- can stack 12+ free months sequentially. GoCardless pause_cycles is
-- stack-aware (we read remaining cycles before posting the new value).
-- =====================================================

-- ─── 1. Token + back-pointer on customers ───────────────────────────────

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS referral_token TEXT,
  ADD COLUMN IF NOT EXISTS referred_by_customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;

-- Unique constraint on token. Created idempotently so re-running doesn't
-- error if it already exists.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'customers_referral_token_key'
  ) THEN
    CREATE UNIQUE INDEX customers_referral_token_key
      ON customers(referral_token)
      WHERE referral_token IS NOT NULL;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_customers_referred_by_customer_id
  ON customers(referred_by_customer_id)
  WHERE referred_by_customer_id IS NOT NULL;

-- Trigger to auto-assign a 10-character hex token on insert when not set.
-- 16^10 = ~1 trillion combos, collision probability is negligible at our
-- scale. The UNIQUE index above is the safety net if a collision somehow
-- happens (insert will retry with a different token via the application).
CREATE OR REPLACE FUNCTION assign_referral_token()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.referral_token IS NULL THEN
    NEW.referral_token := lower(substring(encode(gen_random_bytes(8), 'hex'), 1, 10));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS assign_referral_token_trigger ON customers;
CREATE TRIGGER assign_referral_token_trigger
  BEFORE INSERT ON customers
  FOR EACH ROW EXECUTE FUNCTION assign_referral_token();

-- Backfill: existing customers don't have a token yet.
UPDATE customers
   SET referral_token = lower(substring(encode(gen_random_bytes(8), 'hex'), 1, 10))
 WHERE referral_token IS NULL;

-- ─── 2. referral_credits table ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS referral_credits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  referred_customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  -- State machine:
  --   pending → referee signed up via the link; cron polls until trigger fires
  --   applied → at least the referee side has been credited (pause applied)
  --   voided  → referee cancelled before trigger; no credits given
  state TEXT NOT NULL DEFAULT 'pending' CHECK (state IN ('pending', 'applied', 'voided')),
  -- Side-specific timestamps so we can tell "referrer skipped" apart from
  -- "applied to both". referrer_applied_at IS NULL after applied means the
  -- referrer side was skipped (see referrer_skipped_reason for why).
  referee_applied_at TIMESTAMPTZ,
  referrer_applied_at TIMESTAMPTZ,
  referrer_skipped_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  applied_at TIMESTAMPTZ,
  -- One credit per (referrer, referee) pair — same person can't be credited twice.
  UNIQUE (referrer_customer_id, referred_customer_id)
);

CREATE INDEX IF NOT EXISTS idx_referral_credits_state
  ON referral_credits(state)
  WHERE state = 'pending';

CREATE INDEX IF NOT EXISTS idx_referral_credits_referrer
  ON referral_credits(referrer_customer_id);

CREATE INDEX IF NOT EXISTS idx_referral_credits_referred
  ON referral_credits(referred_customer_id);

ALTER TABLE referral_credits ENABLE ROW LEVEL SECURITY;

-- Customers can read credits where they're either side (so the dashboard
-- tile can show "you referred N people"). Writes happen via service-role
-- through the API routes and cron.
DROP POLICY IF EXISTS "Customers can view credits they're part of" ON referral_credits;
CREATE POLICY "Customers can view credits they're part of"
  ON referral_credits FOR SELECT
  TO authenticated
  USING (
    referrer_customer_id IN (SELECT id FROM customers WHERE profile_id = auth.uid())
    OR referred_customer_id IN (SELECT id FROM customers WHERE profile_id = auth.uid())
  );
