-- =====================================================
-- First-clean-discount tracking for switch flow
-- =====================================================
-- When a customer switches cleaners, marketing promises "first clean
-- discounted automatically". The mechanic is: refund 1 × per-clean
-- platform fee against the FIRST successful direct-debit payment on
-- the new (switch-created) subscription. This refund is issued by the
-- GoCardless webhook handler on `payments.confirmed`.
--
-- Two columns on clean_requests track this so the credit is idempotent:
--   - first_clean_discount_credited_at — set the moment we commit to a
--     refund. Used as the CAS lock so two concurrent webhook deliveries
--     can't both fire a refund for the same request.
--   - first_clean_discount_amount_pence — the actual refunded amount, for
--     audit + cross-check against the marketing copy / customer queries.
--
-- Self-healing: if a refund attempt fails (network blip, GC outage), the
-- handler resets first_clean_discount_credited_at to NULL so the NEXT
-- payments.confirmed event for the same subscription retries it. Worst-
-- case the customer gets the discount on month 2 instead of month 1, but
-- they always get it without manual intervention.
--
-- Partial index supports the hot lookup path: "find switch-related
-- requests that still need their discount credited".
-- =====================================================

ALTER TABLE clean_requests
  ADD COLUMN IF NOT EXISTS first_clean_discount_credited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS first_clean_discount_amount_pence INTEGER;

CREATE INDEX IF NOT EXISTS idx_clean_requests_switch_discount_pending
  ON clean_requests(gocardless_subscription_id)
  WHERE is_switch = true
    AND first_clean_discount_credited_at IS NULL
    AND gocardless_subscription_id IS NOT NULL;
