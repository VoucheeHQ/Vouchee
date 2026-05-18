-- =====================================================
-- Migration 012: Skip keyword audit for fulfilled conversations
-- =====================================================
-- The audit_message_keywords trigger (migration 007) logs every message
-- containing a watchlisted keyword to keyword_violations. Pre-fulfilment
-- that's the right behaviour: it catches off-platform-poach attempts.
-- Post-fulfilment it's noise — the customer is committed via GoCardless
-- mandate, the client-side filter has been lifted (see chat-widget.tsx
-- handleSend), and exchanging phone numbers / addresses between a
-- customer and their confirmed cleaner is legitimate.
--
-- This migration replaces the trigger function with a version that
-- short-circuits when the linked conversation's clean_request status
-- is 'fulfilled', returning NEW without writing to keyword_violations.
--
-- CREATE OR REPLACE means re-running is a no-op. The trigger binding
-- from migration 007 already points at this function — no need to
-- DROP / CREATE TRIGGER again.
--
-- Verification:
--   - Pre-fulfilment message containing "07700 900900" → row in keyword_violations
--   - Post-fulfilment message containing "07700 900900" → NO row in keyword_violations
-- =====================================================

CREATE OR REPLACE FUNCTION audit_message_keywords()
RETURNS TRIGGER AS $$
DECLARE
  normalised TEXT;
  matched TEXT[] := '{}';
  kw RECORD;
  needle TEXT;
  v_request_status TEXT;
BEGIN
  IF NEW.content IS NULL OR NEW.content = '' THEN RETURN NEW; END IF;

  -- ── Post-fulfilment short-circuit ────────────────────────────────────
  -- Look up the clean_request status linked to this conversation. If the
  -- arrangement is fulfilled (customer locked in via DD or cover-clean
  -- confirmed), legitimate contact-detail exchange is expected — skip
  -- the audit entirely.
  --
  -- Defensive: if the conversation_id is null, or the join returns no
  -- row (orphaned conversation, race during creation), v_request_status
  -- stays NULL and we proceed with the audit. Pre-fulfilment behaviour
  -- is preserved.
  IF NEW.conversation_id IS NOT NULL THEN
    SELECT cr.status INTO v_request_status
      FROM conversations c
      JOIN clean_requests cr ON cr.id = c.clean_request_id
     WHERE c.id = NEW.conversation_id
     LIMIT 1;

    IF v_request_status = 'fulfilled' THEN
      RETURN NEW;
    END IF;
  END IF;

  -- ── Existing audit logic (unchanged from migration 007) ──────────────
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
