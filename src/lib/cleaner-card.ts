// ─────────────────────────────────────────────────────────────────────────────
// Shared cleaner card type + helpers
//
// One source of truth for the shape of a cleaner as seen by the rest of the
// app. The API at /api/cleaners/[id]/card returns this exact shape, and the
// <CleanerCard /> component renders it. Anywhere else in the app that needs
// to show "a cleaner" should consume this type.
//
// If you find yourself adding a one-off cleaner field somewhere — add it here
// instead and update both the API + the component.
// ─────────────────────────────────────────────────────────────────────────────

export interface CleanerReview {
  id: string
  rating: number              // 1-5
  body: string
  customer_first_name: string // first name only, no surname for privacy
  created_at: string          // ISO
}

export interface CleanerCardData {
  // Identity
  id: string                  // cleaners.id (uuid)
  profile_id: string          // profiles.id (uuid)
  short_id: string | null     // public-facing slug for /c/<short_id>
  full_name: string           // 'Alison Cranston'
  name_short: string          // 'Alison C.' — first name + last initial
  first_name: string          // 'Alison'
  initial: string             // 'A'

  // Membership
  member_since: string        // 'March 2026' — display label
  member_since_iso: string    // raw ISO from cleaners.created_at

  // Credentials (binary flags shown as ✓ badges)
  credentials: {
    dbs_checked: boolean
    right_to_work: boolean
    has_insurance: boolean
  }

  // Aggregate stats
  stats: {
    jobs_won: number         // count of applications.status='accepted' AND clean_requests.status='fulfilled'
    rating_average: number | null  // null when rating_count = 0
    rating_count: number
    unique_customers: number
  }

  // Real reviews only — empty array if none. The component renders a
  // "New cleaner — verified credentials" panel when this is empty.
  reviews: CleanerReview[]

  // Service zones (lowercase keys, e.g. 'central_horsham')
  zones: string[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function formatNameShort(fullName: string | null | undefined): string {
  const parts = (fullName ?? '').trim().split(/\s+/)
  if (parts.length === 0 || !parts[0]) return 'Cleaner'
  if (parts.length === 1) return parts[0]
  return `${parts[0]} ${parts[parts.length - 1][0]}.`
}

export function formatFirstName(fullName: string | null | undefined): string {
  const first = (fullName ?? '').trim().split(/\s+/)[0]
  return first || 'Cleaner'
}

export function formatInitial(fullName: string | null | undefined): string {
  const first = (fullName ?? '').trim()[0]
  return (first ?? 'C').toUpperCase()
}

export function formatMemberSince(iso: string | null | undefined): string {
  if (!iso) return 'Recently'
  return new Date(iso).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}

// Each cleaner gets a deterministic colour from this palette at signup-time
// (the hash of their cleaners.id picks a slot). Used to colour their avatar
// and as the accent colour for trust-signal UI like the Jobs won box.
// Keep in sync with chat-widget.tsx AVATAR_COLORS — same palette so the
// cleaner has one identity across chat, dashboard, and public profile.
const AVATAR_COLORS = [
  '#e67e22', '#e74c3c', '#9b59b6', '#16a085', '#d35400',
  '#c0392b', '#8e44ad', '#2980b9', '#27ae60', '#f39c12',
]

export function getAvatarColor(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}