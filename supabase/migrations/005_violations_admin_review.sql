-- =====================================================
-- Violations + admin review tracking
-- =====================================================
-- Three things in one migration because they're tightly coupled:
--
-- 1. violation_keywords — replaces the hardcoded WATCHLIST in chat-widget.tsx
--    with a DB-managed list the admin can edit on the fly. Seeded with the
--    current values; the chat-widget fetches via GET /api/keywords on mount
--    and the admin "Keywords" tab CRUDs via /api/admin/keywords.
--
-- 2. Per-tab "reviewed_at" timestamps on the rows that drive the work-queue
--    badges (cleaners needing approval, pending applications, hidden listings,
--    keyword_violations). The badge counts only rows where the relevant
--    reviewed_at IS NULL — admin can either act on the row (auto-clears) or
--    explicitly dismiss it. keyword_violations also gets emailed_at so the
--    hourly digest cron can skip already-emailed rows.
--
-- 3. admin_settings — a generic key/value store for toggles that don't
--    deserve their own table. Currently only used for the hourly_violation
--    _digest flag.
--
-- All ALTERs use IF NOT EXISTS so re-running is safe.
-- =====================================================

-- ─── 1. violation_keywords table ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS violation_keywords (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  keyword TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- Seed with the previous hardcoded WATCHLIST. ON CONFLICT keeps the migration
-- idempotent — re-running won't duplicate.
INSERT INTO violation_keywords (keyword) VALUES
  ('07'), ('+44'), ('whatsapp'), ('email'), ('@'), ('bank'),
  ('address'), ('go direct'), ('go private'), ('direct payment'), ('cash')
ON CONFLICT (keyword) DO NOTHING;

ALTER TABLE violation_keywords ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read keywords (chat-widget runs as the logged-in
-- user). Only admins write — enforced at the API route level via service-role.
DROP POLICY IF EXISTS "Authenticated users can read keywords" ON violation_keywords;
CREATE POLICY "Authenticated users can read keywords"
  ON violation_keywords FOR SELECT
  TO authenticated
  USING (true);

-- ─── 2. Reviewed-at flags for the work-queue badges ─────────────────────

-- keyword_violations exists in the DB but isn't in earlier migrations.
-- ALTER ... IF NOT EXISTS is safe even if the columns already exist.
ALTER TABLE keyword_violations
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS emailed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_keyword_violations_reviewed_at
  ON keyword_violations(reviewed_at)
  WHERE reviewed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_keyword_violations_emailed_at
  ON keyword_violations(emailed_at)
  WHERE emailed_at IS NULL;

ALTER TABLE cleaners
  ADD COLUMN IF NOT EXISTS submission_reviewed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_cleaners_submission_reviewed_at
  ON cleaners(submission_reviewed_at)
  WHERE submission_reviewed_at IS NULL;

ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS pending_reviewed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_applications_pending_reviewed_at
  ON applications(pending_reviewed_at)
  WHERE pending_reviewed_at IS NULL;

ALTER TABLE clean_requests
  ADD COLUMN IF NOT EXISTS hidden_reviewed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_clean_requests_hidden_reviewed_at
  ON clean_requests(hidden_reviewed_at)
  WHERE hidden_reviewed_at IS NULL;

-- ─── 3. admin_settings (generic key/value) ──────────────────────────────

CREATE TABLE IF NOT EXISTS admin_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- Default: hourly digest ON. Admin can toggle off via the dashboard.
-- When ON, /api/log-violation skips per-violation email and the hourly
-- /api/cron/violation-digest sends a roll-up instead.
INSERT INTO admin_settings (key, value) VALUES
  ('hourly_violation_digest', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;

ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

-- Read-only for authenticated users (so client can render current state).
-- Writes go through service-role API routes only.
DROP POLICY IF EXISTS "Authenticated users can read admin_settings" ON admin_settings;
CREATE POLICY "Authenticated users can read admin_settings"
  ON admin_settings FOR SELECT
  TO authenticated
  USING (true);
