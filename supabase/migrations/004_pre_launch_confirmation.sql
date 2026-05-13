-- =====================================================
-- Pre-launch confirmation tracking
-- =====================================================
-- Adds two columns to clean_requests:
--   pre_launch_confirmed_at   — set by /api/pre-launch-confirm when the
--                                customer clicks the "yes I'm ready" link
--                                in the 24-hour reminder email
--   pre_launch_24h_email_sent_at — set by the 24h reminder cron after
--                                successful Resend send, so cron retries
--                                don't re-email
--
-- On launch day, the admin "Launch all pending listings" button only flips
-- rows where pre_launch_confirmed_at IS NOT NULL. Unconfirmed pre-launch
-- listings stay in pre_launch_pending — the customer can confirm later
-- and the same endpoint auto-flips them to active retroactively.
--
-- The cron code handles missing columns gracefully (try/catch around the
-- filter and UPDATE), so this migration is non-blocking. Apply when
-- convenient; the dedupe and confirmation gate activate as soon as the
-- columns exist.
-- =====================================================

ALTER TABLE clean_requests
  ADD COLUMN IF NOT EXISTS pre_launch_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pre_launch_24h_email_sent_at TIMESTAMPTZ;

-- Partial indexes — most rows will be NULL, partial keeps it small.
CREATE INDEX IF NOT EXISTS idx_clean_requests_pre_launch_confirmed
  ON clean_requests(pre_launch_confirmed_at)
  WHERE pre_launch_confirmed_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_clean_requests_pre_launch_24h_sent
  ON clean_requests(pre_launch_24h_email_sent_at)
  WHERE pre_launch_24h_email_sent_at IS NOT NULL;
