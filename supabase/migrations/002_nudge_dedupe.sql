-- =====================================================
-- Cron nudge dedupe columns + atomic payment-failure increment
-- =====================================================
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- Then click "RUN" to execute.
--
-- Why this exists:
-- The nudge cron jobs (nudge-missed-messages and nudge-pending-applications)
-- previously had no record of which rows they had already nudged. If Vercel
-- retried a cron run after a partial failure (e.g. a Resend network blip
-- midway through the batch), every successfully-nudged customer would be
-- re-emailed on the retry.
--
-- Adding a `last_nudge_sent_at` column on each table lets the cron skip rows
-- that have been nudged within the last 22 hours, regardless of which run
-- did the nudging.
--
-- The cron code already handles the absence of these columns gracefully
-- (try/catch around the filter and UPDATE), so applying this migration is
-- non-blocking — the dedupe activates as soon as the columns exist.
-- =====================================================

ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS last_nudge_sent_at TIMESTAMPTZ;

ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS last_nudge_sent_at TIMESTAMPTZ;

-- Partial index on rows that have been nudged — used by the "skip if nudged
-- in last 22h" filter. Most rows will have NULL last_nudge_sent_at, so a
-- partial index keeps it small.
CREATE INDEX IF NOT EXISTS idx_applications_last_nudge_sent_at
  ON applications(last_nudge_sent_at)
  WHERE last_nudge_sent_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_conversations_last_nudge_sent_at
  ON conversations(last_nudge_sent_at)
  WHERE last_nudge_sent_at IS NOT NULL;

-- =====================================================
-- Atomic increment for payment_failure_count
-- =====================================================
-- The webhook previously did read-then-write on payment_failure_count, which
-- lost counts when two payments.failed events for the same request arrived
-- concurrently (both read 0, both wrote 1, final value 1 instead of 2). This
-- RPC does the increment server-side in a single UPDATE so there is no gap
-- between read and write.
--
-- The function also stamps payment_failed_at and payment_grace_until in the
-- same statement so the three fields move as one.

CREATE OR REPLACE FUNCTION public.increment_payment_failure(
  p_request_id UUID,
  p_grace_until TIMESTAMPTZ
) RETURNS INTEGER LANGUAGE plpgsql AS $$
DECLARE
  new_count INTEGER;
BEGIN
  UPDATE clean_requests
  SET payment_failure_count = COALESCE(payment_failure_count, 0) + 1,
      payment_failed_at = NOW(),
      payment_grace_until = p_grace_until
  WHERE id = p_request_id
  RETURNING payment_failure_count INTO new_count;
  RETURN new_count;
END;
$$;
