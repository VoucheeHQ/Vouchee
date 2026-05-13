-- =====================================================
-- Pre-launch listing status
-- =====================================================
-- Adds 'pre_launch_pending' as a valid value for clean_requests.status.
--
-- Pre-launch listings are created by customers before NEXT_PUBLIC_LAUNCHED
-- has been flipped to 'true'. They are deliberately invisible to cleaners
-- (the /jobs query only shows 'pending', 'pending_review', 'active'), so a
-- customer can register and post BEFORE the marketplace is open without
-- being met by silence from a non-existent cleaner pool.
--
-- On launch day, the admin clicks "Launch listings" on /admin/dashboard
-- which bulk-flips every pre_launch_pending row to 'active' and fires
-- cleaner job alerts.
--
-- This block is wrapped in DO so it's safe on databases where:
--   - The value already exists (re-run of the migration)
--   - The column has been converted to TEXT out-of-band (the value works
--     anyway, the ALTER TYPE just becomes a no-op)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'request_status') THEN
    BEGIN
      ALTER TYPE request_status ADD VALUE IF NOT EXISTS 'pre_launch_pending';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'request_status alter skipped: %', SQLERRM;
    END;
  END IF;
END $$;
