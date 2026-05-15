-- =====================================================
-- Cover-feedback email dedup column
-- =====================================================
-- Single column on clean_requests so the daily
-- /api/cron/nudge-cover-feedback cron can mark each cover request as
-- "prompt sent" exactly once. Same dedup pattern as
-- review_email_sent_at (migration 007).
--
-- Set when we email the customer ~24 hours after their cover_date asking
-- (1) to leave a review for the cover cleaner, and (2) optionally tell us
-- how it went. The page they land on submits the review via the existing
-- /api/reviews/submit endpoint, so cover reviews count toward the cover
-- cleaner's rating_average and rating_count exactly like any other
-- review — no parallel system.
-- =====================================================

ALTER TABLE clean_requests
  ADD COLUMN IF NOT EXISTS cover_feedback_email_sent_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_clean_requests_cover_feedback_email_sent_at
  ON clean_requests(cover_feedback_email_sent_at)
  WHERE cover_feedback_email_sent_at IS NULL;
