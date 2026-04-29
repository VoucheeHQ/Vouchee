'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/header'
import { CleanerCard } from '@/components/cleaner-card'
import { CleanerCardData } from '@/lib/cleaner-card'

// ─────────────────────────────────────────────────────────────────────────────
// /c/[shortId] — public cleaner profile + review submission page.
//
// Layout:
//   1. <CleanerCard variant="public" /> — same canonical card customers see
//      when a cleaner applies, but with reviews unblurred + zones shown
//   2. Review submission form (or login prompt / owner banner / cleaner-viewing
//      message depending on viewer)
//   3. Existing reviews list
//
// Data source: /api/cleaners/[id]/card returns the canonical CleanerCardData.
// We do one short_id → uuid lookup, then fetch the full card via service role
// (bypasses RLS so credentials, stats, reviews all populate reliably).
// ─────────────────────────────────────────────────────────────────────────────

interface ReviewListItem {
  id: string
  stars: number
  body: string
  created_at: string
  customer_name: string
}

const MIN_REVIEW_CHARS = 50
const MAX_REVIEW_CHARS = 2000

function formatShortName(fullName: string) {
  const parts = (fullName ?? '').trim().split(' ')
  if (!parts[0]) return 'Customer'
  return parts.length === 1 ? parts[0] : `${parts[0]} ${parts[parts.length - 1].charAt(0)}.`
}

function relativeDate(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86400000)
  if (days < 1) return 'Today'
  if (days < 7) return `${days} ${days === 1 ? 'day' : 'days'} ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 5) return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months} ${months === 1 ? 'month' : 'months'} ago`
  return new Date(iso).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
}

function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span style={{ display: 'inline-flex', gap: '2px', alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} style={{ fontSize: `${size}px`, color: i <= value ? '#f59e0b' : '#e2e8f0', lineHeight: 1 }}>
          {i <= value ? '★' : '☆'}
        </span>
      ))}
    </span>
  )
}

export default function CleanerReviewPage() {
  const params = useParams<{ shortId: string }>()
  const shortId = params?.shortId

  const [cardData, setCardData] = useState<CleanerCardData | null>(null)
  const [reviews, setReviews] = useState<ReviewListItem[]>([])
  const [authed, setAuthed] = useState<boolean | null>(null)
  const [viewerIsOwner, setViewerIsOwner] = useState(false)
  const [viewerRole, setViewerRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  // Form state
  const [stars, setStars] = useState(0)
  const [hoverStars, setHoverStars] = useState(0)
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // ─── Fetch all the page data ──────────────────────────────────────────────
  // 1. Look up cleaner UUID + profile_id from short_id
  // 2. Fetch the full CleanerCardData from /api/cleaners/[id]/card (service role)
  // 3. Fetch the public reviews list (with customer first names)
  // 4. Detect viewer role to branch the review form / owner banner
  const loadPage = async () => {
    if (!shortId) return
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    setAuthed(!!user)

    let currentViewerRole: string | null = null
    if (user) {
      const { data: viewerProfile } = await (supabase as any)
        .from('profiles').select('role').eq('id', user.id).single()
      currentViewerRole = (viewerProfile as any)?.role ?? null
      setViewerRole(currentViewerRole)
    }

    // short_id → cleaner uuid + profile_id (we need profile_id to detect owner)
    const { data: cleanerLookup, error: lookupErr } = await (supabase as any)
      .from('cleaners')
      .select('id, profile_id')
      .eq('short_id', shortId)
      .single()

    if (lookupErr || !cleanerLookup) {
      setNotFound(true)
      setLoading(false)
      return
    }

    const cleanerUuid = (cleanerLookup as any).id as string
    const cleanerProfileId = (cleanerLookup as any).profile_id as string

    if (user && user.id === cleanerProfileId) setViewerIsOwner(true)

    // Fetch the canonical CleanerCardData via service role
    try {
      const res = await fetch(`/api/cleaners/${cleanerUuid}/card`)
      if (res.ok) {
        const { cleaner } = await res.json()
        setCardData(cleaner as CleanerCardData)
      } else {
        // 401/404 — show not-found state rather than a broken page
        setNotFound(true)
        setLoading(false)
        return
      }
    } catch (e) {
      console.error('Card fetch failed:', e)
      setNotFound(true)
      setLoading(false)
      return
    }

    // Fetch the visible reviews with customer first names so we can render
    // the list below the card (CleanerCardData includes only top 3 — we
    // want all of them on the public profile)
    const { data: reviewRows } = await (supabase as any)
      .from('reviews')
      .select('id, stars, body, created_at, customer_profile_id')
      .eq('cleaner_id', cleanerUuid)
      .eq('hidden', false)
      .order('created_at', { ascending: false })

    if (reviewRows && reviewRows.length > 0) {
      const enriched = await Promise.all((reviewRows as any[]).map(async (r) => {
        const { data: cp } = await (supabase as any)
          .from('profiles').select('full_name').eq('id', r.customer_profile_id).single()
        const fullName = (cp as any)?.full_name ?? null
        return {
          id: r.id,
          stars: r.stars,
          body: r.body,
          created_at: r.created_at,
          customer_name: fullName ? formatShortName(fullName) : 'Customer',
        } as ReviewListItem
      }))
      setReviews(enriched)
    }

    setLoading(false)
  }

  useEffect(() => { loadPage() }, [shortId])

  const handleSubmit = async () => {
    if (submitting) return
    setError(null)
    if (stars < 1) { setError('Please select a star rating.'); return }
    const trimmed = body.trim()
    if (trimmed.length < MIN_REVIEW_CHARS) {
      setError(`Please write at least ${MIN_REVIEW_CHARS} characters (${MIN_REVIEW_CHARS - trimmed.length} more to go).`)
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/reviews/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cleanerShortId: shortId, stars, reviewText: trimmed }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong. Please try again.')
      } else {
        setSuccess(true)
        // Reload the whole page state — the trigger will have updated
        // rating_average + rating_count, so the card recomputes too
        await loadPage()
      }
    } catch (e: any) {
      setError(e.message ?? 'Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif" }}>
        <p style={{ color: '#64748b' }}>Loading…</p>
      </div>
    )
  }

  if (notFound || !cardData) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'DM Sans', sans-serif" }}>
        <Header />
        <div style={{ maxWidth: '480px', margin: '60px auto', padding: '40px', textAlign: 'center', background: 'white', borderRadius: '20px', border: '1.5px solid #e2e8f0' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>🧹</div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', margin: '0 0 8px' }}>Cleaner not found</h1>
          <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 20px' }}>This link doesn't look right. Check with your cleaner.</p>
          <Link href="/" style={{ background: '#0f172a', color: 'white', borderRadius: '10px', padding: '10px 24px', fontSize: '14px', fontWeight: 700, textDecoration: 'none' }}>Back to home</Link>
        </div>
      </div>
    )
  }

  const shortName = cardData.name_short

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'DM Sans', sans-serif" }}>
      <Header />
      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '32px 24px 60px' }}>

        {/* ── Cleaner card — shared CleanerCard component, public variant ── */}
        <div style={{ background: 'white', borderRadius: '20px', border: '1.5px solid #e2e8f0', padding: '24px', marginBottom: '20px', boxShadow: '0 2px 16px rgba(0,0,0,0.04)' }}>
          <CleanerCard data={cardData} variant="public" />
        </div>

        {/* ── Review submission form (branches by viewer) ── */}
        {viewerIsOwner ? (
          <div style={{ background: 'linear-gradient(135deg, #eff6ff, #f0fdf4)', borderRadius: '20px', border: '1.5px solid #bfdbfe', padding: '22px 24px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{ fontSize: '22px', lineHeight: 1, flexShrink: 0 }}>👋</div>
              <div style={{ flex: 1 }}>
                <h2 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: '0 0 4px' }}>This is your public profile</h2>
                <p style={{ fontSize: '13px', color: '#475569', margin: '0 0 10px', lineHeight: 1.55 }}>
                  Customers who've booked you can use this link to leave a review. Share it with past customers from Vouchee — only those with a completed booking can review you.
                </p>
                <Link href="/cleaner/dashboard" style={{ fontSize: '12px', fontWeight: 700, color: '#1d4ed8', textDecoration: 'none' }}>
                  ← Back to your dashboard
                </Link>
              </div>
            </div>
          </div>
        ) : viewerRole === 'cleaner' ? (
          <div style={{ background: 'white', border: '1.5px solid #e2e8f0', borderRadius: '20px', padding: '22px 24px', marginBottom: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '20px', marginBottom: '6px' }}>🧹</div>
            <p style={{ fontSize: '13px', color: '#64748b', margin: 0, lineHeight: 1.5 }}>
              Only customers can leave reviews. You're viewing <strong>{shortName}</strong>'s public profile.
            </p>
          </div>
        ) : !authed ? (
          <div style={{ background: 'white', borderRadius: '20px', border: '1.5px solid #bfdbfe', padding: '28px', marginBottom: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', marginBottom: '10px' }}>🔒</div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>Log in to leave a review</h2>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 18px', lineHeight: 1.55 }}>
              We verify reviews to make sure they're from real customers. Log in with the account you used to book <strong>{shortName}</strong>.
            </p>
            <Link href={`/login?redirect=${encodeURIComponent(`/c/${cardData.short_id}`)}`}
              style={{ display: 'inline-block', background: '#0f172a', color: 'white', borderRadius: '10px', padding: '10px 24px', fontSize: '13px', fontWeight: 700, textDecoration: 'none' }}>
              Log in
            </Link>
          </div>
        ) : success ? (
          <div style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: '20px', padding: '28px', marginBottom: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '36px', marginBottom: '10px' }}>🎉</div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#15803d', margin: '0 0 6px' }}>Review submitted!</h2>
            <p style={{ fontSize: '13px', color: '#166534', margin: 0 }}>Thanks — it's now live on {shortName}'s profile below.</p>
          </div>
        ) : (
          <div style={{ background: 'white', borderRadius: '20px', border: '1.5px solid #e2e8f0', padding: '24px', marginBottom: '20px', boxShadow: '0 2px 16px rgba(0,0,0,0.04)' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: '0 0 4px' }}>Leave a review for {shortName}</h2>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 20px' }}>Share your experience to help other customers.</p>

            {/* Stars */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Rating</label>
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                {[1, 2, 3, 4, 5].map(n => {
                  const active = n <= (hoverStars || stars)
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setStars(n)}
                      onMouseEnter={() => setHoverStars(n)}
                      onMouseLeave={() => setHoverStars(0)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', fontSize: '30px', color: active ? '#f59e0b' : '#e2e8f0', lineHeight: 1, transition: 'color 0.1s' }}
                      aria-label={`${n} stars`}
                    >
                      {active ? '★' : '☆'}
                    </button>
                  )
                })}
                {stars > 0 && (
                  <span style={{ marginLeft: '10px', fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
                    {stars === 5 ? 'Excellent' : stars === 4 ? 'Great' : stars === 3 ? 'Good' : stars === 2 ? 'Okay' : 'Poor'}
                  </span>
                )}
              </div>
            </div>

            {/* Body */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Your review</label>
              <textarea
                value={body}
                onChange={e => setBody(e.target.value.slice(0, MAX_REVIEW_CHARS))}
                placeholder={`What was ${shortName} like? Did they turn up on time? What did they clean well?`}
                rows={5}
                style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #e2e8f0', borderRadius: '12px', fontSize: '14px', color: '#0f172a', resize: 'vertical', fontFamily: "'DM Sans', sans-serif", outline: 'none', boxSizing: 'border-box', lineHeight: 1.5 }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <div style={{ fontSize: '11px', color: body.trim().length < MIN_REVIEW_CHARS ? '#94a3b8' : '#22c55e' }}>
                  {body.trim().length < MIN_REVIEW_CHARS
                    ? `${MIN_REVIEW_CHARS - body.trim().length} more character${MIN_REVIEW_CHARS - body.trim().length === 1 ? '' : 's'} needed`
                    : '✓ Looks good'}
                </div>
                <div style={{ fontSize: '11px', color: body.length >= MAX_REVIEW_CHARS - 200 ? '#f59e0b' : '#94a3b8' }}>{body.length}/{MAX_REVIEW_CHARS}</div>
              </div>
            </div>

            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '10px 12px', fontSize: '12px', color: '#1e40af', marginBottom: '16px', lineHeight: 1.5 }}>
              💡 Your first name and last initial will be shown publicly. Reviews are permanent — please be honest and fair.
            </div>

            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '10px 12px', fontSize: '13px', color: '#dc2626', marginBottom: '16px' }}>
                ⚠ {error}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={submitting || stars < 1 || body.trim().length < MIN_REVIEW_CHARS}
              style={{
                width: '100%',
                padding: '12px',
                background: submitting || stars < 1 || body.trim().length < MIN_REVIEW_CHARS ? '#cbd5e1' : '#0f172a',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: 700,
                cursor: submitting || stars < 1 || body.trim().length < MIN_REVIEW_CHARS ? 'not-allowed' : 'pointer',
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {submitting ? 'Submitting…' : 'Submit review'}
            </button>
          </div>
        )}

        {/* ── All visible reviews (full list — CleanerCard only shows top 3) ── */}
        <div style={{ background: 'white', borderRadius: '20px', border: '1.5px solid #e2e8f0', padding: '24px', boxShadow: '0 2px 16px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '16px' }}>
            Reviews ({cardData.stats.rating_count})
          </div>
          {reviews.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '28px 16px', color: '#94a3b8' }}>
              <div style={{ fontSize: '24px', marginBottom: '6px' }}>✨</div>
              <p style={{ fontSize: '13px', fontWeight: 600, color: '#475569', margin: '0 0 4px' }}>No reviews yet</p>
              <p style={{ fontSize: '12px', margin: 0 }}>Be the first to review {shortName}.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {reviews.map((r, i) => (
                <div key={r.id} style={{ paddingBottom: i < reviews.length - 1 ? '14px' : 0, borderBottom: i < reviews.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Stars value={r.stars} size={13} />
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>{r.customer_name}</span>
                    </div>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>{relativeDate(r.created_at)}</span>
                  </div>
                  <p style={{ fontSize: '13px', color: '#334155', margin: 0, lineHeight: 1.55 }}>{r.body}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
