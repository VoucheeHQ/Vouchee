'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/header'

interface CleanerPreview {
  id: string
  short_id: string
  full_name: string
}

function formatShortName(fullName: string) {
  const parts = fullName.trim().split(' ')
  return parts.length === 1 ? parts[0] : `${parts[0]} ${parts[parts.length - 1].charAt(0)}.`
}

export default function ReviewSubmitPage() {
  const params = useParams<{ shortId: string }>()
  const router = useRouter()
  const shortId = params?.shortId

  const [cleaner, setCleaner] = useState<CleanerPreview | null>(null)
  const [authChecking, setAuthChecking] = useState(true)
  const [authed, setAuthed] = useState(false)
  const [cleanerLoading, setCleanerLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

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
      setAuthChecking(false)

      const { data: cleanerRow, error: cleanerErr } = await (supabase as any)
        .from('cleaners').select('id, short_id, profile_id').eq('short_id', shortId).single()
      if (cleanerErr || !cleanerRow) { setNotFound(true); setCleanerLoading(false); return }

      const { data: p } = await (supabase as any)
        .from('profiles').select('full_name').eq('id', (cleanerRow as any).profile_id).single()

      setCleaner({
        id: (cleanerRow as any).id,
        short_id: (cleanerRow as any).short_id,
        full_name: (p as any)?.full_name ?? 'Cleaner',
      })
      setCleanerLoading(false)
    }
    load()
  }, [shortId])

  const handleSubmit = async () => {
    if (submitting) return
    setError(null)

    if (stars < 1) { setError('Please select a star rating.'); return }
    if (body.trim().length < 10) { setError('Please write at least 10 characters.'); return }

    setSubmitting(true)
    try {
      const res = await fetch('/api/reviews/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cleanerShortId: shortId,
          stars,
          reviewText: body.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong. Please try again.')
      } else {
        setSuccess(true)
      }
    } catch (e: any) {
      setError(e.message ?? 'Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (authChecking || cleanerLoading) {
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
          <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 20px' }}>This review link doesn't look right.</p>
          <Link href="/" style={{ background: '#0f172a', color: 'white', borderRadius: '10px', padding: '10px 24px', fontSize: '14px', fontWeight: 700, textDecoration: 'none' }}>Back to home</Link>
        </div>
      </div>
    )
  }

  if (!authed) {
    const redirectUrl = encodeURIComponent(`/c/${cleaner.short_id}/review`)
    return (
      <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'DM Sans', sans-serif" }}>
        <Header />
        <div style={{ maxWidth: '480px', margin: '60px auto', padding: '40px', textAlign: 'center', background: 'white', borderRadius: '20px', border: '1.5px solid #e2e8f0' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔒</div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>Log in to leave a review</h1>
          <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 24px', lineHeight: 1.6 }}>
            We verify reviews to make sure they're from real customers. Log in with the account you used to book <strong>{formatShortName(cleaner.full_name)}</strong>.
          </p>
          <Link href={`/login?redirect=${redirectUrl}`} style={{ display: 'inline-block', background: '#0f172a', color: 'white', borderRadius: '10px', padding: '12px 28px', fontSize: '14px', fontWeight: 700, textDecoration: 'none' }}>Log in</Link>
          <p style={{ fontSize: '12px', color: '#94a3b8', margin: '16px 0 0' }}>
            Don't have an account? <Link href={`/request/property`} style={{ color: '#3b82f6', fontWeight: 700 }}>Book a clean with Vouchee</Link>
          </p>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'DM Sans', sans-serif" }}>
        <Header />
        <div style={{ maxWidth: '520px', margin: '60px auto', padding: '40px', textAlign: 'center', background: 'white', borderRadius: '20px', border: '1.5px solid #bbf7d0', boxShadow: '0 2px 16px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎉</div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>Thanks for your review!</h1>
          <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 24px', lineHeight: 1.6 }}>
            Your review helps other customers find great cleaners on Vouchee.
          </p>
          <Link href={`/c/${cleaner.short_id}`} style={{ display: 'inline-block', background: '#0f172a', color: 'white', borderRadius: '10px', padding: '12px 28px', fontSize: '14px', fontWeight: 700, textDecoration: 'none' }}>
            View {formatShortName(cleaner.full_name)}'s profile →
          </Link>
        </div>
      </div>
    )
  }

  const shortName = formatShortName(cleaner.full_name)

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'DM Sans', sans-serif" }}>
      <Header />
      <div style={{ maxWidth: '560px', margin: '0 auto', padding: '32px 24px 60px' }}>
        <Link href={`/c/${cleaner.short_id}`} style={{ fontSize: '13px', color: '#64748b', textDecoration: 'none', display: 'inline-block', marginBottom: '16px' }}>← Back to {shortName}'s profile</Link>

        <div style={{ background: 'white', borderRadius: '20px', border: '1.5px solid #e2e8f0', padding: '32px', boxShadow: '0 2px 16px rgba(0,0,0,0.05)' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>Review {shortName}</h1>
          <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 28px', lineHeight: 1.6 }}>
            How was your experience? Your review helps other customers in Horsham find trusted cleaners.
          </p>

          {/* Stars */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '10px' }}>Rating</label>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              {[1, 2, 3, 4, 5].map(n => {
                const active = n <= (hoverStars || stars)
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setStars(n)}
                    onMouseEnter={() => setHoverStars(n)}
                    onMouseLeave={() => setHoverStars(0)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', fontSize: '34px', color: active ? '#f59e0b' : '#e2e8f0', lineHeight: 1, transition: 'color 0.1s' }}
                    aria-label={`${n} stars`}
                  >
                    {active ? '★' : '☆'}
                  </button>
                )
              })}
              {stars > 0 && (
                <span style={{ marginLeft: '12px', fontSize: '13px', color: '#64748b', fontWeight: 600 }}>
                  {stars === 5 ? 'Excellent' : stars === 4 ? 'Great' : stars === 3 ? 'Good' : stars === 2 ? 'Okay' : 'Poor'}
                </span>
              )}
            </div>
          </div>

          {/* Body */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '10px' }}>Your review</label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value.slice(0, 2000))}
              placeholder={`What was ${shortName} like? Did they turn up on time? What did they clean well?`}
              rows={6}
              style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #e2e8f0', borderRadius: '12px', fontSize: '14px', color: '#0f172a', resize: 'vertical', fontFamily: "'DM Sans', sans-serif", outline: 'none', boxSizing: 'border-box', lineHeight: 1.5 }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
              <div style={{ fontSize: '11px', color: body.trim().length < 10 ? '#94a3b8' : '#22c55e' }}>
                {body.trim().length < 10 ? `${10 - body.trim().length} more character${10 - body.trim().length === 1 ? '' : 's'} to go` : '✓ Looks good'}
              </div>
              <div style={{ fontSize: '11px', color: body.length >= 1800 ? '#f59e0b' : '#94a3b8' }}>{body.length}/2000</div>
            </div>
          </div>

          {/* Notice */}
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '10px 12px', fontSize: '12px', color: '#1e40af', marginBottom: '20px', lineHeight: 1.5 }}>
            💡 Your first name and last initial will be shown publicly. Reviews are permanent and visible to everyone — please be honest and fair.
          </div>

          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '10px 12px', fontSize: '13px', color: '#dc2626', marginBottom: '20px' }}>
              ⚠ {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting || stars < 1 || body.trim().length < 10}
            style={{
              width: '100%',
              padding: '14px',
              background: submitting || stars < 1 || body.trim().length < 10 ? '#cbd5e1' : '#0f172a',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '15px',
              fontWeight: 700,
              cursor: submitting || stars < 1 || body.trim().length < 10 ? 'not-allowed' : 'pointer',
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {submitting ? 'Submitting…' : 'Submit review'}
          </button>
        </div>
      </div>
    </div>
  )
}
