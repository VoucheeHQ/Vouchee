-- =====================================================
-- Migration 013: Insurance expiry reminder tracking
-- =====================================================
-- Adds the single column the new daily reminder cron uses to dedupe.
--
-- Eligibility for /api/cron/insurance-expiry-reminder (one email per
-- expiry cycle):
--   - cleaners.application_status = 'approved'
--   - insurance_expiry IS NOT NULL
--   - insurance_expiry BETWEEN now() AND now() + INTERVAL '30 days'
--   - insurance_expiry_reminder_sent_at IS NULL
--     OR insurance_expiry_reminder_sent_at < insurance_expiry - INTERVAL '90 days'
--
-- The 90-day re-eligibility window means: when a cleaner renews their
-- cover (insurance_expiry jumps to a new date ~1 year out), the previous
-- reminder timestamp falls more than 90 days before the new expiry, so
-- the next reminder cycle naturally re-arms.
--
-- Partial index supports the hot lookup ("approved cleaners with an
-- upcoming expiry that still need a reminder") without scanning the
-- whole cleaners table every cron run.
-- =====================================================

ALTER TABLE cleaners
  ADD COLUMN IF NOT EXISTS insurance_expiry_reminder_sent_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_cleaners_insurance_expiry_reminder_pending
  ON cleaners(insurance_expiry)
  WHERE insurance_expiry IS NOT NULL
    AND application_status = 'approved';
