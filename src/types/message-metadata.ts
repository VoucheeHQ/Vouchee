// ─────────────────────────────────────────────────────────────────────────────
// Typed metadata for the messages.metadata jsonb column.
//
// The previous convention was a "__system__" prefix on the content string,
// which made every reader parse text to detect system messages and limited
// what richer message types we could add later. The metadata column replaces
// that: callers write a structured object, readers branch on the typed union
// via the guards below.
//
// Backfill (already applied in prod): every legacy "__system__" message had
// its content stripped of the marker and metadata = { type: 'system' } set.
// New messages should NEVER use the marker — use metadata instead.
//
// Future additions (booking action cards, payment-status pills, review
// prompts, etc.) extend this union in their own PRs.
// ─────────────────────────────────────────────────────────────────────────────

export type MessageMetadata =
  // Generic system announcement — legacy and most current.
  | { type: 'system' }
  // Confirmation event — the "Direct Debit confirmed, start date X" message
  // that fires from /api/gocardless/confirm and /api/gocardless/confirm-switch.
  // The chat widget reads this marker to trigger the post-confirmation
  // suggested-reply chips on both sides of the conversation.
  | { type: 'system'; event: 'gocardless_confirmed' }

// ─── Type guards ────────────────────────────────────────────────────────────
// These accept `unknown` because the column comes back as `Json | null` from
// Supabase, and we want to be defensive against malformed rows (e.g. an
// old row that somehow escaped the backfill).

export function isSystemMessage(metadata: unknown): boolean {
  return (
    typeof metadata === 'object' &&
    metadata !== null &&
    'type' in metadata &&
    (metadata as { type: unknown }).type === 'system'
  )
}

export function isGoCardlessConfirmedMessage(metadata: unknown): boolean {
  return (
    isSystemMessage(metadata) &&
    'event' in (metadata as object) &&
    (metadata as { event: unknown }).event === 'gocardless_confirmed'
  )
}
