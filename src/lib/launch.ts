// ─────────────────────────────────────────────────────────────────────────────
// Launch gate — single source of truth.
//
// The marketplace is "launched" if EITHER:
//   - NEXT_PUBLIC_LAUNCHED env var is 'true' (manual override), OR
//   - The current date is on/after LAUNCH_DATE
//
// On launch day:
//   1. The date check flips automatically at midnight BST on LAUNCH_DATE,
//      so new customer listings start being created as 'active' even if
//      nobody touches the env var.
//   2. An admin still needs to click "Launch all pending listings" on
//      /admin/dashboard once to retro-flip the backlog of pre-launch
//      listings already in the DB.
//
// To launch earlier than the scheduled date (e.g. for a surprise reveal),
// set NEXT_PUBLIC_LAUNCHED=true in Vercel — the env var wins.
//
// To delay past the scheduled date, push a code change moving LAUNCH_DATE.
// ─────────────────────────────────────────────────────────────────────────────

// Monday 1 June 2026, 00:00 BST (01:00 UTC during British Summer Time).
// UK is in BST (UTC+1) on this date.
export const LAUNCH_DATE = new Date('2026-06-01T00:00:00+01:00')

// Plain-English label used in customer-facing copy.
export const LAUNCH_DATE_LABEL = 'Monday 1st June'

/**
 * True when the marketplace is open to cleaners. Reads the env var first
 * (manual override) then falls back to the date comparison.
 *
 * Safe to call from both client and server. NEXT_PUBLIC_* env vars are
 * inlined at build time so the bundle contains the value, not a runtime
 * lookup. Re-deploy is required to change it.
 */
export function isLaunched(): boolean {
  if (process.env.NEXT_PUBLIC_LAUNCHED === 'true') return true
  return Date.now() >= LAUNCH_DATE.getTime()
}
