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
  // GoCardless DD confirmation. Fires from /api/gocardless/confirm and
  // /api/gocardless/confirm-switch — the "Direct Debit confirmed, start
  // date X" message. Service is about to begin.
  | { type: 'system'; event: 'gocardless_confirmed' }
  // Cover-clean confirmation. Fires from /api/gocardless/create-flow's
  // cover branch (which actually skips GoCardless and fulfils directly).
  // Service is about to begin — same UX trigger as the DD case, different
  // event name preserved so analytics can distinguish.
  | { type: 'system'; event: 'cover_clean_confirmed' }

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

// Matches only the DD confirmation event. Kept for back-compat and any
// caller that specifically needs to distinguish the DD case from cover.
export function isGoCardlessConfirmedMessage(metadata: unknown): boolean {
  return (
    isSystemMessage(metadata) &&
    'event' in (metadata as object) &&
    (metadata as { event: unknown }).event === 'gocardless_confirmed'
  )
}

// Matches any service-confirmation event — DD or cover clean. This is
// the guard the chat widget uses to fire post-confirmation suggested
// replies, because the customer + cleaner are about to meet for the first
// time in either case and the UX prompts apply equally.
export function isServiceConfirmedMessage(metadata: unknown): boolean {
  if (!isSystemMessage(metadata)) return false
  const evt = (metadata as { event?: unknown }).event
  return evt === 'gocardless_confirmed' || evt === 'cover_clean_confirmed'
}
