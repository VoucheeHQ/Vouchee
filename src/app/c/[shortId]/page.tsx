'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/header'

interface PublicCleaner {
  id: string
  short_id: string
  full_name: string
  created_at: string
  rating_average: number | null
  rating_count: number
  dbs_verified: boolean
  insurance_verified: boolean
  right_to_work_verified: boolean
  cleans_completed: number | null
  zones: string[] | null
}

interface Review {
  id: string
  stars: number
  body: string
  created_at: string
  customer_name: string | null
}

const ZONE_LABELS: Record<string, string> = {
  central_south_east: 'Central / South East', north_west: 'North West',
  north_east_roffey: 'North East / Roffey', south_west: 'South West',
  warnham_north: 'Warnham / Surrounding North', broadbridge_heath: 'Broadbridge Heath',
  mannings_heath: 'Mannings Heath', faygate_kilnwood_vale: 'Faygate / Kilnwood Vale',
  christs_hospital: 'Christs Hospital', southwater: 'Southwater',
}

function formatShortName(fullName: string) {
  const parts = fullName.trim().split(' ')
  return parts.length === 1 ? parts[0] : `${parts[0]} ${parts[parts.length - 1].charAt(0)}.`
}

function formatMonthYear(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
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

function Stars({ value, size = 18 }: { value: number; size?: number }) {
  const full = Math.floor(value)
  const half = value - full >= 0.5
  return (
    <span style={{ display: 'inline-flex', gap: '2px', alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map(i => {
        const filled = i <= full
        const isHalf = !filled && i === full + 1 && half
        return (
          <span key={i} style={{ fontSize: `${size}px`, color: filled || isHalf ? '#f59e0b' : '#e2e8f0', lineHeight: 1 }}>
            {filled ? '★' : isHalf ? '★' : '☆'}
          </span>
        )
      })}
    </span>
  )
}

export default function CleanerProfilePage() {
  const params = useParams<{ shortId: string }>()
  const router = useRouter()
  const shortId = params?.shortId
  const [cleaner, setCleaner] = useState<PublicCleaner | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!shortId) return
    const load = async () => {
      const supabase = createClient()

      const { data: cleanerRow, error: cleanerErr } = await (supabase as any)
        .from('cleaners')
        .select('id, short_id, profile_id, created_at, rating_average, rating_count, dbs_verified, insurance_verified, right_to_work_verified, cleans_completed, zones')
        .eq('short_id', shortId)
        .single()

      if (cleanerErr || !cleanerRow) {
        setNotFound(true); setLoading(false); return
      }

      const { data: p } = await (supabase as any)
        .from('profiles').select('full_name').eq('id', (cleanerRow as any).profile_id).single()

      const cleanerData: PublicCleaner = {
        id: (cleanerRow as any).id,
        short_id: (cleanerRow as any).short_id,
        full_name: (p as any)?.full_name ?? 'Cleaner',
        created_at: (cleanerRow as any).created_at,
        rating_average: (cleanerRow as any).rating_average,
        rating_count: (cleanerRow as any).rating_count,
        dbs_verified: (cleanerRow as any).dbs_verified,
        insurance_verified: (cleanerRow as any).insurance_verified,
        right_to_work_verified: (cleanerRow as any).right_to_work_verified,
        cleans_completed: (cleanerRow as any).cleans_completed,
        zones: (cleanerRow as any).zones,
      }
      setCleaner(cleanerData)

      const { data: reviewRows } = await (supabase as any)
        .from('reviews')
        .select('id, stars, body, created_at, customer_profile_id')
        .eq('cleaner_id', cleanerData.id)
        .eq('hidden', false)
        .order('created_at', { ascending: false })

      if (reviewRows) {
        // Fetch customer names in parallel (first name + initial only, for privacy)
        const enriched = await Promise.all((reviewRows as any[]).map(async (r) => {
          const { data: cp } = await (supabase as any).from('profiles').select('full_name').eq('id', r.customer_profile_id).single()
          const full = (cp as any)?.full_name ?? null
          const display = full ? formatShortName(full) : 'Customer'
          return {
            id: r.id, stars: r.stars, body: r.body, created_at: r.created_at, customer_name: display,
          } as Review
        }))
        setReviews(enriched)
      }

      setLoading(false)
    }
    load()
  }, [shortId])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif" }}>
        <p style={{ color: '#64748b' }}>Loading profile…</p>
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
          <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 20px' }}>This profile link doesn't look right. Check with your cleaner.</p>
          <Link href="/" style={{ background: '#0f172a', color: 'white', borderRadius: '10px', padding: '10px 24px', fontSize: '14px', fontWeight: 700, textDecoration: 'none' }}>Back to home</Link>
        </div>
      </div>
    )
  }

  const shortName = formatShortName(cleaner.full_name)
  const memberSince = formatMonthYear(cleaner.created_at)
  const hasReviews = cleaner.rating_count > 0
  const zones = (cleaner.zones ?? []).map(z => ZONE_LABELS[z] ?? z)

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'DM Sans', sans-serif" }}>
      <Header />

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '32px 24px 60px' }}>
        {/* Profile header */}
        <div style={{ background: 'white', borderRadius: '20px', border: '1.5px solid #e2e8f0', padding: '28px', marginBottom: '20px', boxShadow: '0 2px 16px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px', flexWrap: 'wrap' }}>
            <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: 800, color: 'white', flexShrink: 0 }}>
              {cleaner.full_name.trim().charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: '0 0 4px', letterSpacing: '-0.3px' }}>{shortName}</h1>
              <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 12px' }}>Member since {memberSince}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {hasReviews ? (
                  <>
                    <Stars value={cleaner.rating_average ?? 0} size={18} />
                    <span style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>{cleaner.rating_average?.toFixed(1)}</span>
                    <span style={{ fontSize: '13px', color: '#64748b' }}>· {cleaner.rating_count} {cleaner.rating_count === 1 ? 'review' : 'reviews'}</span>
                  </>
                ) : (
                  <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 600 }}>⭐ New cleaner — no reviews yet</span>
                )}
              </div>
            </div>
          </div>

          {/* Credentials (admin-verified only — not claims) */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #f1f5f9' }}>
            {cleaner.dbs_verified && <Badge label="✓ DBS verified" color="green" />}
            {cleaner.insurance_verified && <Badge label="✓ Insured" color="green" />}
            {cleaner.right_to_work_verified && <Badge label="✓ Right to work" color="green" />}
            {cleaner.cleans_completed != null && cleaner.cleans_completed > 0 && (
              <Badge label={`${cleaner.cleans_completed} ${cleaner.cleans_completed === 1 ? 'clean' : 'cleans'} on Vouchee`} color="blue" />
            )}
          </div>

          {zones.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Areas covered</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {zones.map(z => <span key={z} style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '3px 10px', fontSize: '12px', fontWeight: 600 }}>{z}</span>)}
              </div>
            </div>
          )}
        </div>

        {/* Leave a review CTA */}
        <div style={{ background: 'linear-gradient(135deg, #eff6ff, #f0fdf4)', borderRadius: '16px', border: '1.5px solid #bfdbfe', padding: '18px 22px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginBottom: '2px' }}>Had a clean with {shortName}?</div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>Share your experience with other customers.</div>
          </div>
          <button
            onClick={() => router.push(`/c/${cleaner.short_id}/review`)}
            style={{ background: '#0f172a', color: 'white', border: 'none', borderRadius: '10px', padding: '10px 20px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' }}
          >
            ⭐ Leave a review →
          </button>
        </div>

        {/* Reviews list */}
        <div style={{ background: 'white', borderRadius: '20px', border: '1.5px solid #e2e8f0', padding: '24px', boxShadow: '0 2px 16px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginBottom: '16px' }}>
            Reviews ({cleaner.rating_count})
          </div>

          {reviews.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>✨</div>
              <p style={{ fontSize: '14px', fontWeight: 600, color: '#475569', margin: '0 0 4px' }}>No reviews yet</p>
              <p style={{ fontSize: '13px', margin: 0 }}>Be the first to review this cleaner.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {reviews.map(r => (
                <div key={r.id} style={{ paddingBottom: '16px', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Stars value={r.stars} size={15} />
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>{r.customer_name}</span>
                    </div>
                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>{relativeDate(r.created_at)}</span>
                  </div>
                  <p style={{ fontSize: '14px', color: '#334155', margin: 0, lineHeight: 1.6 }}>{r.body}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Badge({ label, color }: { label: string; color: 'green' | 'blue' | 'gray' }) {
  const cfg = {
    green: { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
    blue: { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
    gray: { bg: '#f8fafc', text: '#64748b', border: '#e2e8f0' },
  }[color]
  return (
    <span style={{ background: cfg.bg, color: cfg.text, border: `1px solid ${cfg.border}`, borderRadius: '100px', padding: '3px 10px', fontSize: '11px', fontWeight: 700 }}>
      {label}
    </span>
  )
}
