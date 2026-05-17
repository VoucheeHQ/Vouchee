-- =====================================================
-- Migration 011: Cancellation lifecycle + pro-rata refund tracking
-- =====================================================
-- Adds the columns needed to make the "30-day notice" promise real and
-- to automate the pro-rata refund at the end of the notice period.
--
-- Before this migration, the standard 30-day cancellation path
-- (Branch C in /api/gocardless/cancel-subscription) immediately
-- cancelled the GC subscription AND set status='cancelled', then told
-- the cleaner there was a 30-day notice. That made the notice a
-- fiction: no DDs fired, no cleans were billed for, no refund was
-- ever owed.
--
-- After this migration, Branch C:
--   1. Sets clean_requests.status='cancelled' immediately (UI reflects it)
--   2. Sets cancellation_completes_at = now + 30 days
--   3. PATCHes the GC subscription with end_date = cancellation_completes_at
--      so DDs continue through the notice but stop after
--   4. The new /api/cron/process-cancellation-refunds cron picks up
--      these rows at notice end, finds the last successful DD, computes
--      the unused-tail pro-rata refund, and issues it via GC /refunds
--
-- Three columns added:
--   - cancellation_completes_at TIMESTAMPTZ — date the 30-day notice
--     ends. Both the GC end_date target and the refund cron's trigger.
--   - prorata_refund_processed_at TIMESTAMPTZ — set when the cron has
--     handled this row (idempotency lock; null means "still pending").
--   - prorata_refund_amount_pence INTEGER — the actual refunded amount,
--     for audit and customer support lookups. Zero is a valid value
--     (means the last DD fully consumed the period, no refund owed).
--
-- Partial index supports the hot lookup path: "find cancelled requests
-- with notice ending today-or-earlier that still need processing".
-- =====================================================

ALTER TABLE clean_requests
  ADD COLUMN IF NOT EXISTS cancellation_completes_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS prorata_refund_processed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS prorata_refund_amount_pence INTEGER;

CREATE INDEX IF NOT EXISTS idx_clean_requests_cancellation_refund_pending
  ON clean_requests(cancellation_completes_at)
  WHERE cancellation_completes_at IS NOT NULL
    AND prorata_refund_processed_at IS NULL;
