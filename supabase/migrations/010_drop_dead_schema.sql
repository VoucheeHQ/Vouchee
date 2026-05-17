-- =====================================================
-- Migration 010: Drop dead schema content
-- =====================================================
-- Removes tables, columns, indexes, triggers, and enums that have
-- zero references in application code. Verified against codebase
-- master before running. Applied directly to production via
-- Supabase Studio on 2026-05-17; this file exists to keep the
-- migrations folder in sync with prod.
--
-- What this drops and why:
--   Tables (old Stripe subscription model, fully replaced by
--   marketplace model + applications + GoCardless):
--     - clean_sessions
--     - issues
--     - tier_pricing
--
--   Columns on clean_requests:
--     - property_type      (no app reads/writes)
--     - special_instructions (replaced by customer_notes)
--     - preferred_time     (replaced by time_of_day)
--
--   Columns on customers (all old Stripe model):
--     - stripe_customer_id
--     - stripe_subscription_id
--     - paused_until
--     - subscription_status
--
--   Enums (only used by dead tables/columns above):
--     - session_status
--     - issue_status
--     - subscription_status
--
-- Related code changes shipped in the same PR:
--   - src/types/database.types.ts regenerated against prod
--   - src/types/index.ts dead re-exports removed
--   - src/app/api/cron/referral-credits/route.ts: removed
--     dependence on customers.subscription_status
--   - src/app/request/{review,preview}/page.tsx: stopped writing
--     subscription_status on customer creation
--   - src/app/cleaner/dashboard/page.tsx: made CleanerProfile.full_name
--     nullable to match DB (latent bug fix surfaced by regen)
-- =====================================================

BEGIN;

DROP TABLE IF EXISTS clean_sessions CASCADE;
DROP TABLE IF EXISTS issues CASCADE;
DROP TABLE IF EXISTS tier_pricing CASCADE;

DROP TYPE IF EXISTS session_status;
DROP TYPE IF EXISTS issue_status;

ALTER TABLE clean_requests
  DROP COLUMN IF EXISTS property_type,
  DROP COLUMN IF EXISTS special_instructions,
  DROP COLUMN IF EXISTS preferred_time;

ALTER TABLE customers
  DROP COLUMN IF EXISTS stripe_customer_id,
  DROP COLUMN IF EXISTS stripe_subscription_id,
  DROP COLUMN IF EXISTS paused_until,
  DROP COLUMN IF EXISTS subscription_status;

DROP INDEX IF EXISTS idx_customers_stripe_customer_id;
DROP TYPE IF EXISTS subscription_status;

COMMIT;
