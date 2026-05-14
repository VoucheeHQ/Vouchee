-- =====================================================
-- Review-request tracking + server-side keyword audit
-- =====================================================
-- Three things bundled because the work landed in the same session:
--
-- 1. clean_requests.review_email_sent_at — dedup column for the daily
--    /api/cron/review-requests cron. Set when we email the customer asking
--    for a review (~14 days after start_date). Never re-emailed once set.
--
-- 2. Retroactive CREATE TABLE for keyword_violations — the table was added
--    directly in Supabase during early dev and never made it into a
--    migration file. Adding it here for repo reproducibility (CREATE TABLE
--    IF NOT EXISTS, so re-running is a no-op).
--
-- 3. AFTER INSERT trigger on messages — server-side defence-in-depth for
--    the keyword filter. The chat-widget does the warning UX client-side,
--    but a malicious user could bypass it by POSTing directly to the
--    messages table. This trigger runs after every insert, normalises the
--    content, checks against violation_keywords, and logs a row if any
--    match. Dedup against the client-side log-violation path is via a
--    "no existing violation for same sender + content in last 1 minute"
--    guard inside the function.
-- =====================================================

-- ─── 1. Review email dedup column ───────────────────────────────────────

ALTER TABLE clean_requests
  ADD COLUMN IF NOT EXISTS review_email_sent_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_clean_requests_review_email_sent_at
  ON clean_requests(review_email_sent_at)
  WHERE review_email_sent_at IS NULL;

-- ─── 2. keyword_violations retroactive CREATE ──────────────────────────

CREATE TABLE IF NOT EXISTS keyword_violations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  message_content TEXT NOT NULL,
  triggered_keywords TEXT[] NOT NULL DEFAULT '{}',
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  sender_role TEXT NOT NULL,
  -- Reviewed-at columns added in migration 005 — re-declared here as IF
  -- NOT EXISTS so this file is also runnable in isolation.
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  emailed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Columns may already exist from migration 005; ALTER ... IF NOT EXISTS is
-- safe either way.
ALTER TABLE keyword_violations
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS emailed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_keyword_violations_conversation_id
  ON keyword_violations(conversation_id);

CREATE INDEX IF NOT EXISTS idx_keyword_violations_sender_id
  ON keyword_violations(sender_id);

CREATE INDEX IF NOT EXISTS idx_keyword_violations_created_at
  ON keyword_violations(created_at DESC);

ALTER TABLE keyword_violations ENABLE ROW LEVEL SECURITY;

-- Admin reads only (writes happen via service-role from /api/log-violation
-- and the audit trigger below).
DROP POLICY IF EXISTS "Admins can read keyword_violations" ON keyword_violations;
CREATE POLICY "Admins can read keyword_violations"
  ON keyword_violations FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ─── 3. Server-side audit trigger on messages ──────────────────────────

-- Mirrors the client-side normaliseForDetection in src/lib/violation-detect.ts:
--   - lowercase
--   - collapse whitespace runs
--   - strip single-character gaps between alphanumeric chars (so "w h a t s"
--     still matches "whats"). The regex pass is applied 4 times to handle
--     longer runs ("w h a t s a p p" → "whatsapp").
CREATE OR REPLACE FUNCTION normalise_for_keyword_audit(input TEXT)
RETURNS TEXT AS $$
DECLARE
  result TEXT;
  i INT;
BEGIN
  IF input IS NULL OR input = '' THEN RETURN ''; END IF;
  result := lower(input);
  result := regexp_replace(result, '\s+', ' ', 'g');
  FOR i IN 1..4 LOOP
    result := regexp_replace(result, '([a-z0-9]) (?=[a-z0-9])', '\1', 'g');
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- AFTER INSERT trigger function — defence-in-depth for the keyword filter.
-- The chat widget shows a warning client-side via /api/log-violation; this
-- trigger catches direct-to-DB inserts and double-logs to keyword_violations.
-- The dedup guard prevents duplicate rows when both paths fire for the same
-- message (the client log-violation path is faster, so it usually wins, and
-- this trigger then no-ops via the NOT EXISTS clause).
--
-- SECURITY DEFINER so the trigger can INSERT into keyword_violations even
-- when the sender's RLS context wouldn't normally allow it. The function
-- only writes one row per message, with values from the NEW record — no
-- user input is interpolated into SQL.
CREATE OR REPLACE FUNCTION audit_message_keywords()
RETURNS TRIGGER AS $$
DECLARE
  normalised TEXT;
  matched TEXT[] := '{}';
  kw RECORD;
  needle TEXT;
BEGIN
  IF NEW.content IS NULL OR NEW.content = '' THEN RETURN NEW; END IF;
  normalised := normalise_for_keyword_audit(NEW.content);

  FOR kw IN SELECT keyword FROM violation_keywords LOOP
    needle := normalise_for_keyword_audit(kw.keyword);
    IF needle <> '' AND position(needle IN normalised) > 0 THEN
      matched := matched || kw.keyword;
    END IF;
  END LOOP;

  IF array_length(matched, 1) > 0 THEN
    -- Dedup: don't double-log if the client-side path already wrote a row
    -- for this same sender + content in the last 60 seconds.
    IF NOT EXISTS (
      SELECT 1 FROM keyword_violations
       WHERE conversation_id = NEW.conversation_id
         AND sender_id = NEW.sender_id
         AND message_content = NEW.content
         AND created_at > NOW() - INTERVAL '60 seconds'
    ) THEN
      INSERT INTO keyword_violations (
        conversation_id, message_content, triggered_keywords,
        sender_id, sender_role
      ) VALUES (
        NEW.conversation_id, NEW.content, matched,
        NEW.sender_id, NEW.sender_role
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS audit_message_keywords_trigger ON messages;
CREATE TRIGGER audit_message_keywords_trigger
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION audit_message_keywords();
