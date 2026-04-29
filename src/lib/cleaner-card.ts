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
      cleans_completed: number
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