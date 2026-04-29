'use client'

// ─────────────────────────────────────────────────────────────────────────────
// <CleanerCard /> — single source of truth for rendering a cleaner.
//
// Variants:
//   "full"    — used in the customer dashboard application card
//   "compact" — used in the chat widget header
//   "public"  — used on /c/[shortId]
//
// Always consume CleanerCardData from /lib/cleaner-card. Never compute name
// formatting inline — use the helpers there.
// ─────────────────────────────────────────────────────────────────────────────

import { CleanerCardData } from '@/lib/cleaner-card'

type Variant = 'full' | 'compact' | 'public'

interface Props {
  data: CleanerCardData
  variant?: Variant
  // Optional override for compact (chat) variant — cleaner-side shows a number
  // instead of the avatar initial. e.g. avatarOverride={{ label: '2', subtitle: 'Faygate / Kilnwood Vale' }}
  avatarOverride?: { label: string; subtitle?: string }
}

const ZONE_LABELS: Record<string, string> = {
  central_south_east: 'Central / South East',
  north_west: 'North West',
  north_east_roffey: 'North East / Roffey',
  south_west: 'South West',
  warnham_north: 'Warnham / North',
  broadbridge_heath: 'Broadbridge Heath',
  mannings_heath: 'Mannings Heath',
  faygate_kilnwood_vale: 'Faygate / Kilnwood Vale',
  christs_hospital: "Christ's Hospital",
  southwater: 'Southwater',
}

// 5-star row that always shows 5 stars — empty by default, filled up to `rating`.
// When rating === 0, all 5 stars are rendered as empty/grey for the "New cleaner" look.
function StarRow({ rating, size = 12 }: { rating: number; size?: number }) {
  return (
    <span style={{ display: 'inline-flex', gap: '1px' }}>
      {[1, 2, 3, 4, 5].map(s => (
        <span key={s} style={{ fontSize: `${size}px`, color: rating >= s ? '#f59e0b' : '#e2e8f0' }}>★</span>
      ))}
    </span>
  )
}

function CredentialBadge({ label }: { label: string }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: '3px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '100px', padding: '3px 8px', fontSize: '10px', fontWeight: 700, color: '#15803d', whiteSpace: 'nowrap' }}>
      ✓ {label}
    </span>
  )
}

function Avatar({ label, color = '#3b82f6', size = 52 }: { label: string; color?: string; size?: number }) {
  // Match the cleaner dashboard avatar — gradient blue-to-indigo, white text
  return (
    <div style={{
      width: `${size}px`, height: `${size}px`, borderRadius: '50%',
      background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: `${size * 0.42}px`, fontWeight: 800, color: 'white', flexShrink: 0,
    }}>
      {label}
    </div>
  )
}

export function CleanerCard({ data, variant = 'full', avatarOverride }: Props) {
  const { name_short, initial, member_since, credentials, stats, reviews } = data
  const ratingAvg = stats.rating_average ?? 0
  const hasRating = stats.rating_count > 0
  const showRealReviews = reviews.length > 0
  const cleansCompleted = stats.cleans_completed

  // ─── Compact variant (chat widget header) ──────────────────────────────────
  if (variant === 'compact') {
    const avatarLabel = avatarOverride?.label ?? initial
    const subtitle = avatarOverride?.subtitle ?? ''
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
        <Avatar label={avatarLabel} size={32} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'white', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {name_short}
          </div>
          {subtitle && (
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.2 }}>
              {subtitle}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ─── Header (matches cleaner dashboard layout: avatar + name + stars on left, CLEANS box on right) ──────
  const Header = (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', minWidth: 0 }}>
        <Avatar label={initial} size={56} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.2px' }}>
            {name_short}
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 500, margin: '2px 0 6px' }}>
            Member since {member_since}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <StarRow rating={hasRating ? Math.round(ratingAvg) : 0} size={12} />
            <span style={{ fontSize: '11px', color: hasRating ? '#64748b' : '#94a3b8', fontWeight: 600, marginLeft: '4px' }}>
              {hasRating
                ? `${ratingAvg.toFixed(1)} (${stats.rating_count})`
                : 'New cleaner'}
            </span>
          </div>
        </div>
      </div>
      {/* CLEANS box — always shown */}
      <div style={{ textAlign: 'center', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '12px', padding: '10px 14px', flexShrink: 0 }}>
        <div style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{cleansCompleted}</div>
        <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 700, marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cleans</div>
      </div>
    </div>
  )

  // ─── Credential badges (under the header, full-width row) ──────────────────
  const CredentialBadges = (
    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
      {credentials.dbs_checked && <CredentialBadge label="DBS checked" />}
      {credentials.right_to_work && <CredentialBadge label="Right to work" />}
      {credentials.has_insurance && <CredentialBadge label="Insured" />}
    </div>
  )

  // ─── Reviews block ─────────────────────────────────────────────────────────
  // - Real reviews if any exist (blurred until accept on "full")
  // - Otherwise: trust panel with new copy
  const ReviewsBlock = (
    <div>
      <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
        Reviews
      </div>
      {showRealReviews ? (
        <>
          <div style={{ filter: variant === 'full' ? 'blur(4px)' : 'none', pointerEvents: variant === 'full' ? 'none' : 'auto' }}>
            {reviews.slice(0, 2).map(r => (
              <div key={r.id} style={{ padding: '10px 12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '6px' }}>
                <StarRow rating={r.rating} size={12} />
                <div style={{ fontSize: '13px', color: '#475569', marginTop: '3px', lineHeight: 1.4 }}>{r.body}</div>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '3px' }}>— {r.customer_first_name}</div>
              </div>
            ))}
          </div>
          {variant === 'full' && (
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '8px', textAlign: 'center', fontStyle: 'italic' }}>
              🔒 Accept this application to unlock their full reviews
            </div>
          )}
        </>
      ) : (
        <div style={{ background: '#f8faff', border: '1px solid #e0e7ff', borderRadius: '10px', padding: '14px 16px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e40af', marginBottom: '6px' }}>
            ✨ New to Vouchee
          </div>
          <div style={{ fontSize: '12px', color: '#475569', lineHeight: 1.55 }}>
            This cleaner is new to Vouchee. But rest assured, every cleaner is interviewed and vetted before joining the platform, including all of their required documents. Feel free to ask them any questions — they don't bite!
          </div>
        </div>
      )}
    </div>
  )

  // ─── Full variant (customer dashboard application card) ─────────────────────
  if (variant === 'full') {
    return (
      <div>
        {Header}
        {CredentialBadges}
        {ReviewsBlock}
      </div>
    )
  }

  // ─── Public variant (/c/[shortId]) ──────────────────────────────────────────
  return (
    <div>
      {Header}
      {CredentialBadges}
      {data.zones.length > 0 && (
        <div style={{ marginBottom: '14px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
            Areas covered
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {data.zones.map(z => (
              <span key={z} style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '4px 10px', fontSize: '12px', fontWeight: 600 }}>
                {ZONE_LABELS[z] ?? z}
              </span>
            ))}
          </div>
        </div>
      )}
      {ReviewsBlock}
    </div>
  )
}
