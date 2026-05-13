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

import { CleanerCardData, getAvatarColor } from '@/lib/cleaner-card'

type Variant = 'full' | 'compact' | 'public'

interface Props {
  data: CleanerCardData
  variant?: Variant
  // Optional override for compact (chat) variant — cleaner-side shows a number
  // instead of the avatar initial. e.g. avatarOverride={{ label: '2', subtitle: 'Faygate / Kilnwood Vale' }}
  avatarOverride?: { label: string; subtitle?: string }
  // Optional contact block — shown only when the caller is a customer with a
  // fulfilled clean_request assigned to this cleaner. Backend enforces this in
  // /api/cleaners/[id]/card.
  contact?: { email: string | null; phone: string | null } | null
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

function Avatar({ label, color, size = 52 }: { label: string; color: string; size?: number }) {
  // Use a same-hue gradient so the avatar has subtle depth without being flat.
  // color-mix() darkens the base colour by 22% for the second stop.
  return (
    <div style={{
      width: `${size}px`, height: `${size}px`, borderRadius: '50%',
      background: `linear-gradient(135deg, ${color}, color-mix(in srgb, ${color}, #000 22%))`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: `${size * 0.42}px`, fontWeight: 800, color: 'white', flexShrink: 0,
      boxShadow: `0 2px 8px ${color}40`,
    }}>
      {label}
    </div>
  )
}

export function CleanerCard({ data, variant = 'full', avatarOverride, contact }: Props) {
  const { name_short, initial, member_since, credentials, stats, reviews } = data
  const ratingAvg = stats.rating_average ?? 0
  const hasRating = stats.rating_count > 0
  const showRealReviews = reviews.length > 0
  const jobsWon = stats.jobs_won
  // Each cleaner has a deterministic colour signature (assigned at signup via
  // hash of their cleaners.id). Used on the avatar and the Jobs won accent so
  // the card has a unified visual identity per cleaner.
  const avatarColor = getAvatarColor(data.id)

  // ─── Compact variant (chat widget header) ──────────────────────────────────
  if (variant === 'compact') {
    const avatarLabel = avatarOverride?.label ?? initial
    const subtitle = avatarOverride?.subtitle ?? ''
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
        <Avatar label={avatarLabel} color={avatarColor} size={32} />
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

  // ─── Header (matches cleaner dashboard layout: avatar + name + stars on left, JOBS box on right) ──────
  const Header = (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', minWidth: 0 }}>
        <Avatar label={initial} color={avatarColor} size={56} />
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
      {/* JOBS box — faded golden tile, matching the credential-badge aesthetic
          (50 bg + 200 border + 700 text, amber instead of green). */}
      <div style={{
        textAlign: 'center',
        background: '#fffbeb',
        border: '1px solid #fde68a',
        borderRadius: '14px',
        padding: '12px 16px',
        flexShrink: 0,
        minWidth: '78px',
      }}>
        <div style={{ fontSize: '26px', fontWeight: 900, color: '#b45309', lineHeight: 1, letterSpacing: '-0.02em' }}>{jobsWon}</div>
        <div style={{ fontSize: '10px', color: '#b45309', fontWeight: 700, marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Jobs won</div>
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

  // ─── Contact block — only when caller is authorised. Used by the customer
  // dashboard's confirmed-cleaner card so the customer can reach their cleaner
  // directly. /c/[shortId] passes contact={null} so this stays hidden there.
  const ContactBlock = contact && (contact.email || contact.phone) ? (
    <div style={{ marginTop: '14px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '14px 16px' }}>
      <div style={{ fontSize: '11px', fontWeight: 700, color: '#1e40af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Contact your cleaner</div>
      {contact.email && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: contact.phone ? '6px' : 0 }}>
          <span style={{ fontSize: '14px' }}>✉️</span>
          <a href={`mailto:${contact.email}`} style={{ fontSize: '14px', color: '#1e40af', fontWeight: 600, textDecoration: 'none', wordBreak: 'break-all' }}>{contact.email}</a>
        </div>
      )}
      {contact.phone && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '14px' }}>📞</span>
          <a href={`tel:${contact.phone}`} style={{ fontSize: '14px', color: '#1e40af', fontWeight: 600, textDecoration: 'none' }}>{contact.phone}</a>
        </div>
      )}
    </div>
  ) : null

  // ─── Public variant (/c/[shortId]) ──────────────────────────────────────────
  return (
    <div>
      {Header}
      {CredentialBadges}
      {ReviewsBlock}
      {ContactBlock}
    </div>
  )
}
