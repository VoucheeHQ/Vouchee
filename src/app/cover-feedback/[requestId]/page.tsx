'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/header'
import './cover-feedback.css'

// ─────────────────────────────────────────────────────────────────────────────
// /cover-feedback/[requestId] — landing page for the 24h post-cover-clean
// email. Auth-gated; only the customer who owns the cover request can submit.
//
// Layout:
//   1. Hero — "How did it go with [cleaner first name]?"
//   2. Primary form — 5 stars + review textarea (50 char min, 2000 max).
//      Submits via the existing /api/reviews/submit, so the cover cleaner's
//      review counts toward the same rating_average / rating_count as any
//      other review. No parallel review system.
//   3. Secondary optional chat — appears once a star rating is chosen.
//      The label adapts:
//        - 1–3★ → "What didn't go right?"  (private feedback to admin)
//        - 4–5★ → "What did you like about [name]?"
//      Text is preserved when stars change (per user spec). The chat
//      submits separately to /api/cover-feedback/submit — admin email only,
//      no DB row.
//
// Both submissions fire on the same "Submit" click. Either may fail without
// blocking the other (review submission is the user-visible result; chat is
// fire-and-forget admin signal).
// ─────────────────────────────────────────────────────────────────────────────

const MIN_REVIEW_CHARS = 50
const MAX_REVIEW_CHARS = 2000
const MAX_CHAT_CHARS = 1500

type LoadState =
  | { kind: 'loading' }
  | { kind: 'not_found' }
  | { kind: 'not_owner' }
  | { kind: 'not_logged_in' }
  | { kind: 'wrong_kind' } // request isn't a cover or isn't fulfilled
  | { kind: 'already_reviewed' }
  | { kind: 'ready'; cleanerShortId: string; cleanerFirstName: string; cleanerFullName: string; coverDate: string | null }

export default function CoverFeedbackPage() {
  const params = useParams<{ requestId: string }>()
  const router = useRouter()
  const requestId = params?.requestId

  const [state, setState] = useState<LoadState>({ kind: 'loading' })

  // Form state
  const [stars, setStars] = useState(0)
  const [hoverStars, setHoverStars] = useState(0)
  const [body, setBody] = useState('')
  const [chat, setChat] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // ─── Load: verify ownership + cover-kind, pull cleaner short_id + name ───
  useEffect(() => {
    if (!requestId) return
    let alive = true
    ;(async () => {
      const supabase = createClient()

      const { data: { user } } = await supabase.auth.getUser()
      if (!alive) return
      if (!user) { setState({ kind: 'not_logged_in' }); return }

      // 1. The cover clean_request
      const { data: req } = await (supabase as any)
        .from('clean_requests')
        .select('id, customer_id, assigned_cleaner_id, service_type, status, cover_date')
        .eq('id', requestId)
        .single()
      if (!alive) return
      if (!req) { setState({ kind: 'not_found' }); return }
      if (req.service_type !== 'cover' || req.status !== 'fulfilled') {
        setState({ kind: 'wrong_kind' }); return
      }
      if (!req.assigned_cleaner_id) {
        setState({ kind: 'wrong_kind' }); return
      }

      // 2. Verify the logged-in user owns this customer record
      const { data: customer } = await (supabase as any)
        .from('customers').select('id').eq('profile_id', user.id).single()
      if (!alive) return
      if (!customer || customer.id !== req.customer_id) {
        setState({ kind: 'not_owner' }); return
      }

      // 3. Look up cleaner short_id + name
      const { data: cleaner } = await (supabase as any)
        .from('cleaners').select('short_id, profile_id').eq('id', req.assigned_cleaner_id).single()
      if (!alive) return
      if (!cleaner?.short_id) { setState({ kind: 'not_found' }); return }

      const { data: cleanerProfile } = await (supabase as any)
        .from('profiles').select('full_name').eq('id', cleaner.profile_id).single()
      if (!alive) return

      const fullName = cleanerProfile?.full_name ?? 'your cleaner'
      const firstName = fullName.split(' ')[0] || 'your cleaner'

      // 4. Already-reviewed guard: /api/reviews/submit enforces a 6-month
      //    cool-off per cleaner+customer pair. If a review row already
      //    exists for this exact clean_request, show the thanks state
      //    instead of a re-submission form.
      const { data: existingReview } = await (supabase as any)
        .from('reviews')
        .select('id')
        .eq('clean_request_id', requestId)
        .limit(1)
      if (!alive) return
      if (existingReview && existingReview.length > 0) {
        setState({ kind: 'already_reviewed' }); return
      }

      setState({
        kind: 'ready',
        cleanerShortId: cleaner.short_id as string,
        cleanerFirstName: firstName,
        cleanerFullName: fullName,
        coverDate: req.cover_date ?? null,
      })
    })()
    return () => { alive = false }
  }, [requestId])

  // ─── Adaptive chat copy ──────────────────────────────────────────────────
  const chatLabel =
    stars === 0 ? null :
    stars <= 3 ? "Anything that didn't go right?" :
                 "What did you like about them?"
  const chatHelper =
    stars === 0 ? '' :
    stars <= 3
      ? "Just for us — your review covers the public side. We'll read every one."
      : "Just between us — your review covers the public thanks. We'd love to hear what stood out."
  const chatPlaceholder =
    stars === 0 ? '' :
    stars <= 3
      ? "e.g. arrived late, missed a couple of rooms…"
      : "e.g. thorough on the kitchen, friendly, paid attention to detail…"

  // ─── Submit ──────────────────────────────────────────────────────────────
  const trimmedBody = body.trim()
  const canSubmit =
    state.kind === 'ready' &&
    stars >= 1 &&
    trimmedBody.length >= MIN_REVIEW_CHARS &&
    !submitting

  const handleSubmit = async () => {
    if (!canSubmit || state.kind !== 'ready') return
    setError(null)
    setSubmitting(true)

    try {
      // 1. Submit the public review (the primary action)
      const reviewRes = await fetch('/api/reviews/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cleanerShortId: state.cleanerShortId,
          stars,
          reviewText: trimmedBody,
        }),
      })
      const reviewData = await reviewRes.json()
      if (!reviewRes.ok) {
        setError(reviewData.error ?? 'Could not save your review. Please try again.')
        setSubmitting(false)
        return
      }

      // 2. Fire-and-forget admin chat email (only if customer typed something)
      const trimmedChat = chat.trim()
      if (trimmedChat.length > 0) {
        try {
          await fetch('/api/cover-feedback/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              requestId,
              stars,
              text: trimmedChat,
            }),
          })
        } catch (e) {
          // Non-fatal — the review went through, which is what the customer
          // sees. Log only.
          console.error('Cover-feedback admin chat fire failed (non-fatal):', e)
        }
      }

      setSuccess(true)
    } catch (e: any) {
      setError(e?.message ?? 'Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────
  if (state.kind === 'loading') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif" }}>
        <p style={{ color: '#64748b' }}>Loading…</p>
      </div>
    )
  }

  if (state.kind === 'not_logged_in') {
    const redirect = `/cover-feedback/${encodeURIComponent(requestId ?? '')}`
    return (
      <PageShell>
        <div className="cover-feedback-card cover-feedback-card--centered">
          <div className="cover-feedback-icon">🔒</div>
          <h1 className="cover-feedback-title">Log in to leave your review</h1>
          <p className="cover-feedback-sub">Log in with the account you used to book this cover clean.</p>
          <Link href={`/login?redirect=${encodeURIComponent(redirect)}`} className="cover-feedback-btn cover-feedback-btn--primary">
            Log in
          </Link>
        </div>
      </PageShell>
    )
  }

  if (state.kind === 'not_found' || state.kind === 'wrong_kind') {
    return (
      <PageShell>
        <div className="cover-feedback-card cover-feedback-card--centered">
          <div className="cover-feedback-icon">🧹</div>
          <h1 className="cover-feedback-title">This link doesn't look right</h1>
          <p className="cover-feedback-sub">If you're trying to leave a review for a cover clean, check the link in your email.</p>
          <Link href="/customer/dashboard" className="cover-feedback-btn cover-feedback-btn--primary">Back to dashboard</Link>
        </div>
      </PageShell>
    )
  }

  if (state.kind === 'not_owner') {
    return (
      <PageShell>
        <div className="cover-feedback-card cover-feedback-card--centered">
          <div className="cover-feedback-icon">🚫</div>
          <h1 className="cover-feedback-title">This isn't yours to review</h1>
          <p className="cover-feedback-sub">Only the customer who booked this cover clean can leave a review here.</p>
          <Link href="/customer/dashboard" className="cover-feedback-btn cover-feedback-btn--primary">Back to dashboard</Link>
        </div>
      </PageShell>
    )
  }

  if (state.kind === 'already_reviewed') {
    return (
      <PageShell>
        <div className="cover-feedback-card cover-feedback-card--centered">
          <div className="cover-feedback-icon">✅</div>
          <h1 className="cover-feedback-title">You've already reviewed this clean</h1>
          <p className="cover-feedback-sub">Thanks — your review's live on the cleaner's profile.</p>
          <Link href="/customer/dashboard" className="cover-feedback-btn cover-feedback-btn--primary">Back to dashboard</Link>
        </div>
      </PageShell>
    )
  }

  if (success) {
    return (
      <PageShell>
        <div className="cover-feedback-card cover-feedback-card--success cover-feedback-card--centered">
          <div className="cover-feedback-icon">🎉</div>
          <h1 className="cover-feedback-title cover-feedback-title--success">Thanks for your feedback</h1>
          <p className="cover-feedback-sub cover-feedback-sub--success">
            Your review's live on {state.cleanerFirstName}'s profile{chat.trim().length > 0 ? ' — and we got your private note.' : '.'}
          </p>
          <Link href="/customer/dashboard" className="cover-feedback-btn cover-feedback-btn--primary">Back to dashboard</Link>
        </div>
      </PageShell>
    )
  }

  // state.kind === 'ready'
  const charsRemaining = MIN_REVIEW_CHARS - trimmedBody.length
  return (
    <PageShell>
      <div className="cover-feedback-card">
        <h1 className="cover-feedback-title">How did it go with {state.cleanerFirstName}?</h1>
        <p className="cover-feedback-sub">
          Your review helps other Horsham customers — and gives {state.cleanerFirstName} the credit they earned by stepping in.
        </p>

        {/* ── Stars ───────────────────────────────────────────────────── */}
        <div className="cover-feedback-block">
          <label className="cover-feedback-label">Rating</label>
          <div className="cover-feedback-stars-row">
            {[1, 2, 3, 4, 5].map(n => {
              const active = n <= (hoverStars || stars)
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => setStars(n)}
                  onMouseEnter={() => setHoverStars(n)}
                  onMouseLeave={() => setHoverStars(0)}
                  className="cover-feedback-star-btn"
                  style={{ color: active ? '#f59e0b' : '#e2e8f0' }}
                  aria-label={`${n} stars`}
                >
                  {active ? '★' : '☆'}
                </button>
              )
            })}
            {stars > 0 && (
              <span className="cover-feedback-star-label">
                {stars === 5 ? 'Excellent' : stars === 4 ? 'Great' : stars === 3 ? 'Good' : stars === 2 ? 'Okay' : 'Poor'}
              </span>
            )}
          </div>
        </div>

        {/* ── Review body ─────────────────────────────────────────────── */}
        <div className="cover-feedback-block">
          <label className="cover-feedback-label">Your review</label>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value.slice(0, MAX_REVIEW_CHARS))}
            placeholder={`What was ${state.cleanerFirstName} like? Did they turn up on time? What did they do well?`}
            rows={5}
            className="cover-feedback-textarea"
          />
          <div className="cover-feedback-meta-row">
            <div className={`cover-feedback-meta ${trimmedBody.length < MIN_REVIEW_CHARS ? '' : 'cover-feedback-meta--ok'}`}>
              {trimmedBody.length < MIN_REVIEW_CHARS
                ? `${charsRemaining} more character${charsRemaining === 1 ? '' : 's'} needed`
                : '✓ Looks good'}
            </div>
            <div className="cover-feedback-meta cover-feedback-meta--count">{body.length}/{MAX_REVIEW_CHARS}</div>
          </div>
        </div>

        <div className="cover-feedback-info">
          💡 Your first name and last initial will be shown publicly. Reviews are permanent — please be honest and fair.
        </div>

        {/* ── Adaptive optional chat (only after stars chosen) ────────── */}
        {chatLabel && (
          <div className="cover-feedback-block cover-feedback-private">
            <label className="cover-feedback-label cover-feedback-label--private">
              {chatLabel} <span className="cover-feedback-optional">(optional, private)</span>
            </label>
            <p className="cover-feedback-private-helper">{chatHelper}</p>
            <textarea
              value={chat}
              onChange={e => setChat(e.target.value.slice(0, MAX_CHAT_CHARS))}
              placeholder={chatPlaceholder}
              rows={3}
              className="cover-feedback-textarea cover-feedback-textarea--private"
            />
            <div className="cover-feedback-meta-row">
              <div className="cover-feedback-meta">Just between you and us — won't appear on the cleaner's profile.</div>
              <div className="cover-feedback-meta cover-feedback-meta--count">{chat.length}/{MAX_CHAT_CHARS}</div>
            </div>
          </div>
        )}

        {error && (
          <div className="cover-feedback-error">⚠ {error}</div>
        )}

        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={`cover-feedback-btn cover-feedback-btn--submit ${canSubmit ? '' : 'cover-feedback-btn--disabled'}`}
        >
          {submitting ? 'Submitting…' : 'Submit review'}
        </button>
      </div>
    </PageShell>
  )
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'DM Sans', sans-serif" }}>
      <Header />
      <div className="cover-feedback-page">{children}</div>
    </div>
  )
}
