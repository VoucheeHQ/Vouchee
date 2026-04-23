'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/header'

interface CleanerInfo {
  id: string
  short_id: string
  profile_id: string
  full_name: string
  created_at: string
  rating_average: number | null
  rating_count: number
  dbs_verified: boolean
  insurance_verified: boolean
  right_to_work_verified: boolean
  cleans_completed: number | null
}

interface Review {
  id: string
  stars: number
  body: string
  created_at: string
  customer_name: string | null
}

const MIN_REVIEW_CHARS = 50
const MAX_REVIEW_CHARS = 2000

function formatShortName(fullName: string) {
  const parts = fullName.trim().split(' ')
  return parts.length === 1 ? parts[0] : `${parts[0]} ${parts[parts.length - 1].charAt(0)}.`
}
function formatMonthYear(iso: string) { return new Date(iso).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) }
function getInitial(name: string) { return name.trim().charAt(0).toUpperCase() }

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
      {[1,2,3,4,5].map(i => (
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

  const [cleaner, setCleaner] = useState<CleanerInfo | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [authed, setAuthed] = useState<boolean | null>(null) // null = still checking
  const [viewerIsOwner, setViewerIsOwner] = useState(false)  // the cleaner viewing their own profile
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

  useEffect(() => {
    if (!shortId) return
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setAuthed(!!user)

      // Fetch viewer's role if logged in — used to decide what to show
      let currentViewerRole: string | null = null
      if (user) {
        const { data: viewerProfile } = await (supabase as any)
          .from('profiles').select('role').eq('id', user.id).single()
        currentViewerRole = (viewerProfile as any)?.role ?? null
        setViewerRole(currentViewerRole)
      }

      const { data: cleanerRow, error: cleanerErr } = await (supabase as any)
        .from('cleaners')
        .select('id, short_id, profile_id, created_at, rating_average, rating_count, dbs_verified, insurance_verified, right_to_work_verified, cleans_completed')
        .eq('short_id', shortId)
        .single()

      if (cleanerErr || !cleanerRow) {
        setNotFound(true); setLoading(false); return
      }

      const { data: p } = await (supabase as any)
        .from('profiles').select('full_name').eq('id', (cleanerRow as any).profile_id).single()

      setCleaner({
        id: (cleanerRow as any).id,
        short_id: (cleanerRow as any).short_id,
        profile_id: (cleanerRow as any).profile_id,
        full_name: (p as any)?.full_name ?? 'Cleaner',
        created_at: (cleanerRow as any).created_at,
        rating_average: (cleanerRow as any).rating_average,
        rating_count: (cleanerRow as any).rating_count,
        dbs_verified: (cleanerRow as any).dbs_verified,
        insurance_verified: (cleanerRow as any).insurance_verified,
        right_to_work_verified: (cleanerRow as any).right_to_work_verified,
        cleans_completed: (cleanerRow as any).cleans_completed,
      })

      // Flag whether the logged-in user IS the cleaner being viewed
      if (user && user.id === (cleanerRow as any).profile_id) {
        setViewerIsOwner(true)
      }

      const { data: reviewRows } = await (supabase as any)
        .from('reviews')
        .select('id, stars, body, created_at, customer_profile_id')
        .eq('cleaner_id', (cleanerRow as any).id)
        .eq('hidden', false)
        .order('created_at', { ascending: false })

      if (reviewRows) {
        const enriched = await Promise.all((reviewRows as any[]).map(async (r) => {
          const { data: cp } = await (supabase as any).from('profiles').select('full_name').eq('id', r.customer_profile_id).single()
          const full = (cp as any)?.full_name ?? null
          const display = full ? formatShortName(full) : 'Customer'
          return { id: r.id, stars: r.stars, body: r.body, created_at: r.created_at, customer_name: display } as Review
        }))
        setReviews(enriched)
      }
      setLoading(false)
    }
    load()
  }, [shortId])

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
        // Reload reviews so the new one shows immediately
        const supabase = createClient()
        if (cleaner) {
          const { data: reviewRows } = await (supabase as any)
            .from('reviews')
            .select('id, stars, body, created_at, customer_profile_id')
            .eq('cleaner_id', cleaner.id)
            .eq('hidden', false)
            .order('created_at', { ascending: false })
          if (reviewRows) {
            const enriched = await Promise.all((reviewRows as any[]).map(async (r) => {
              const { data: cp } = await (supabase as any).from('profiles').select('full_name').eq('id', r.customer_profile_id).single()
              const full = (cp as any)?.full_name ?? null
              const display = full ? formatShortName(full) : 'Customer'
              return { id: r.id, stars: r.stars, body: r.body, created_at: r.created_at, customer_name: display } as Review
            }))
            setReviews(enriched)
          }
          // Refresh cleaner aggregates
          const { data: c } = await (supabase as any)
            .from('cleaners').select('rating_average, rating_count').eq('id', cleaner.id).single()
          if (c) setCleaner({ ...cleaner, rating_average: (c as any).rating_average, rating_count: (c as any).rating_count })
        }
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

  if (notFound || !cleaner) {
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

  const shortName = formatShortName(cleaner.full_name)
  const memberSince = formatMonthYear(cleaner.created_at)
  const hasReviews = cleaner.rating_count > 0

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'DM Sans', sans-serif" }}>
      <Header />
      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '32px 24px 60px' }}>

        {/* ── Cleaner card (matches job-card visual vocabulary) ── */}
        <div style={{ background: 'white', borderRadius: '20px', border: '1.5px solid #e2e8f0', padding: '24px', marginBottom: '20px', boxShadow: '0 2px 16px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '16px' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: 800, color: 'white', flexShrink: 0 }}>
              {getInitial(cleaner.full_name)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.2px' }}>{shortName}</div>
              <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 500, margin: '2px 0 6px' }}>Member since {memberSince}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {hasReviews ? (
                  <>
                    <Stars value={cleaner.rating_average ?? 0} size={14} />
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>{cleaner.rating_average?.toFixed(1)}</span>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>· {cleaner.rating_count} {cleaner.rating_count === 1 ? 'review' : 'reviews'}</span>
                  </>
                ) : (
                  <>
                    {[1,2,3,4,5].map(s => <span key={s} style={{ fontSize: '12px', color: '#e2e8f0' }}>★</span>)}
                    <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, marginLeft: '4px' }}>New cleaner</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Trust badges — using VERIFIED status, not claims */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
            {cleaner.dbs_verified && <TrustBadge label="✓ DBS" />}
            {cleaner.insurance_verified && <TrustBadge label="✓ Insured" />}
            {cleaner.right_to_work_verified && <TrustBadge label="✓ Right to work" />}
            {cleaner.cleans_completed != null && cleaner.cleans_completed > 0 && (
              <TrustBadge label={`${cleaner.cleans_completed} ${cleaner.cleans_completed === 1 ? 'clean' : 'cleans'}`} color="blue" />
            )}
            {!cleaner.dbs_verified && !cleaner.insurance_verified && !cleaner.right_to_work_verified && (!cleaner.cleans_completed || cleaner.cleans_completed === 0) && (
              <span style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>No verified credentials yet</span>
            )}
          </div>
        </div>

        {/* ── Review submission form (branches by viewer) ── */}
        {viewerIsOwner ? (
          // This is the cleaner viewing their own profile
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
          // A different cleaner viewing another cleaner's profile — no review form
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
            <Link href={`/login?redirect=${encodeURIComponent(`/c/${cleaner.short_id}`)}`}
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
                {[1,2,3,4,5].map(n => {
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

            {/* Notice */}
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

        {/* ── Existing reviews ── */}
        <div style={{ background: 'white', borderRadius: '20px', border: '1.5px solid #e2e8f0', padding: '24px', boxShadow: '0 2px 16px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '16px' }}>
            Reviews ({cleaner.rating_count})
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

function TrustBadge({ label, color = 'green' }: { label: string; color?: 'green' | 'blue' }) {
  const cfg = color === 'blue'
    ? { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' }
    : { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' }
  return (
    <span style={{ background: cfg.bg, color: cfg.text, border: `1px solid ${cfg.border}`, borderRadius: '100px', padding: '3px 10px', fontSize: '11px', fontWeight: 700 }}>
      {label}
    </span>
  )
}
