'use client'

// ─────────────────────────────────────────────────────────────────────────────
// <CleanerCard /> — single source of truth for rendering a cleaner.
//
// Variants:
//   "full"    — used in the customer dashboard application card (avatar, name,
//                badges, stats row, reviews preview)
//   "compact" — used in the chat widget header (avatar + name + zone)
//   "public"  — used on /c/[shortId] (everything, expanded)
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

function StarRow({ rating, size = 12 }: { rating: number; size?: number }) {
  return (
    <span style={{ display: 'inline-flex', gap: '1px' }}>
      {[1,2,3,4,5].map(s => (
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

function Avatar({ label, color = '#2563eb', size = 52 }: { label: string; color?: string; size?: number }) {
  return (
    <div style={{
      width: `${size}px`, height: `${size}px`, borderRadius: '50%', background: color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: `${size * 0.42}px`, fontWeight: 800, color: 'white', flexShrink: 0,
    }}>
      {label}
    </div>
  )
}

export function CleanerCard({ data, variant = 'full', avatarOverride }: Props) {
  const { name_short, initial, member_since, credentials, stats, reviews } = data

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

  const showStats = stats.cleans_completed > 0 || stats.rating_count > 0
  const showRealReviews = reviews.length > 0
  const ratingAvg = stats.rating_average

  // ─── Shared header (used by full + public) ─────────────────────────────────
  const Header = (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
        <Avatar label={initial} size={52} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
            {name_short}
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '3px' }}>
            Member since {member_since}
          </div>
          {ratingAvg !== null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
              <StarRow rating={Math.round(ratingAvg)} size={12} />
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                {ratingAvg.toFixed(1)} ({stats.rating_count})
              </span>
            </div>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end', flexShrink: 0 }}>
        {credentials.dbs_checked && <CredentialBadge label="DBS checked" />}
        {credentials.right_to_work && <CredentialBadge label="Right to work" />}
        {credentials.has_insurance && <CredentialBadge label="Insured" />}
      </div>
    </div>
  )

  // ─── Stats strip (full + public, only if cleaner has any history) ──────────
  const StatsStrip = showStats ? (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '14px' }}>
      <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
        <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>{stats.cleans_completed}</div>
        <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cleans</div>
      </div>
      <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
        <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>{stats.unique_customers}</div>
        <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Customers</div>
      </div>
      <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
        <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
          {ratingAvg !== null ? ratingAvg.toFixed(1) : '—'}
          {ratingAvg !== null && <span style={{ fontSize: '12px', color: '#f59e0b', marginLeft: '2px' }}>★</span>}
        </div>
        <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rating</div>
      </div>
    </div>
  ) : null

  // ─── Reviews block ─────────────────────────────────────────────────────────
  // - Real reviews if any exist (blurred for "full" variant until accepted, fully visible for "public")
  // - Otherwise: trust panel explaining new-cleaner status
  const ReviewsBlock = (
    <div style={{ marginTop: '14px' }}>
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
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e40af', marginBottom: '4px' }}>
            ✨ New to Vouchee
          </div>
          <div style={{ fontSize: '12px', color: '#475569', lineHeight: 1.5 }}>
            This cleaner is new to Vouchee but don't worry — every cleaner is interviewed and verified before joining the platform, including their credentials.
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
        {StatsStrip}
        {ReviewsBlock}
      </div>
    )
  }

  // ─── Public variant (/c/[shortId]) ──────────────────────────────────────────
  // Same as full but reviews are unblurred and zones are shown
  return (
    <div>
      {Header}
      {StatsStrip}
      {data.zones.length > 0 && (
        <div style={{ marginTop: '14px' }}>
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
