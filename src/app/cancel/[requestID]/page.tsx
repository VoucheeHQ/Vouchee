'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'

const ZONE_LABELS: Record<string, string> = {
  central_south_east: 'Central / South East', north_west: 'North West',
  north_east_roffey: 'North East / Roffey', south_west: 'South West',
  warnham_north: 'Warnham / North', broadbridge_heath: 'Broadbridge Heath',
  mannings_heath: 'Mannings Heath', faygate_kilnwood_vale: 'Faygate / Kilnwood Vale',
  christs_hospital: "Christ's Hospital", southwater: 'Southwater',
}

const FREQUENCY_LABEL: Record<string, string> = {
  weekly: 'Weekly', fortnightly: 'Fortnightly', monthly: 'Monthly',
}

const MONTHLY_FEE: Record<string, number> = {
  weekly: 4333, fortnightly: 3248, monthly: 2499,
}

const RETENTION_POINTS: { icon: string; text: string }[] = [
  { icon: '🔐', text: 'A vetted, DBS-checked cleaner who already knows your home' },
  { icon: '📅', text: 'Regular cleans — no more thinking about it' },
  { icon: '💬', text: 'Direct contact with your cleaner through the platform' },
  { icon: '🛡️', text: 'Vouchee cover if anything ever goes wrong' },
  { icon: '⭐', text: 'The ability to leave a verified review for your cleaner' },
]

export default function CancelPage() {
  const router = useRouter()
  const params = useParams()
  const requestId = params?.requestId as string

  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)
  const [cancelled, setCancelled] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [frequency, setFrequency] = useState('fortnightly')
  const [zone, setZone] = useState('')
  const [cleanerName, setCleanerName] = useState<string | null>(null)
  const [customerName, setCustomerName] = useState<string | null>(null)
  const [daysTogether, setDaysTogether] = useState(0)

  useEffect(() => {
    if (!requestId) return
    const load = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.replace('/login'); return }

        const { data: profile } = await (supabase as any)
          .from('profiles').select('full_name, role').eq('id', user.id).single()
        if (!profile || (profile.role !== 'customer' && profile.role !== 'admin')) {
          router.replace('/login'); return
        }
        setCustomerName(profile.full_name?.split(' ')[0] ?? 'there')

        const { data: req, error: reqErr } = await (supabase as any)
          .from('clean_requests')
          .select('id, status, frequency, zone, start_date, assigned_cleaner_id')
          .eq('id', requestId)
          .single()

        if (reqErr || !req || req.status !== 'fulfilled') {
          router.replace('/customer/dashboard'); return
        }

        setFrequency(req.frequency ?? 'fortnightly')
        setZone(req.zone ?? '')
        setDaysTogether(req.start_date
          ? Math.max(0, Math.floor((Date.now() - new Date(req.start_date).getTime()) / (1000 * 60 * 60 * 24)))
          : 0
        )

        if (req.assigned_cleaner_id) {
          const { data: cleanerRecord } = await (supabase as any)
            .from('cleaners').select('profile_id').eq('id', req.assigned_cleaner_id).single()
          if (cleanerRecord) {
            const { data: cleanerProfile } = await (supabase as any)
              .from('profiles').select('full_name').eq('id', cleanerRecord.profile_id).single()
            setCleanerName(cleanerProfile?.full_name?.split(' ')[0] ?? null)
          }
        }
      } catch {
        setError('Could not load your subscription details.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [requestId, router])

  const handleCancel = async () => {
    setCancelling(true)
    setError(null)
    try {
      const res = await fetch('/api/gocardless/cancel-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId }),
      })
      if (!res.ok) {
        setError('Could not cancel — please contact hello@vouchee.co.uk')
        setCancelling(false)
        return
      }
      setCancelled(true)
    } catch {
      setError('Something went wrong — please try again')
      setCancelling(false)
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif" }}>
        <p style={{ color: '#64748b', fontSize: '14px' }}>Loading…</p>
      </div>
    )
  }

  if (cancelled) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'DM Sans', sans-serif", display: 'flex', flexDirection: 'column' }}>
        <Header userRole="customer" />
        <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
          <div style={{ maxWidth: '480px', width: '100%', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>👋</div>
            <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', margin: '0 0 12px' }}>Subscription cancelled</h1>
            <p style={{ fontSize: '15px', color: '#64748b', lineHeight: 1.7, margin: '0 0 8px' }}>
              {cleanerName ? cleanerName + ' has been notified' : 'Your cleaner has been notified'} and will be in touch about any remaining cleans during the 30-day notice period.
            </p>
            <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.6, margin: '0 0 32px' }}>
              Your Direct Debit has been cancelled. No further payments will be taken for the Vouchee service fee.
            </p>
            <button
              onClick={() => router.push('/customer/dashboard')}
              style={{ background: '#0f172a', color: 'white', border: 'none', borderRadius: '12px', padding: '14px 32px', fontSize: '15px', fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
            >
              Back to dashboard
            </button>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  const zoneLabel = ZONE_LABELS[zone] ?? zone
  const freqLabel = FREQUENCY_LABEL[frequency] ?? frequency
  const monthlyFee = MONTHLY_FEE[frequency] ?? MONTHLY_FEE.fortnightly

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'DM Sans', sans-serif", display: 'flex', flexDirection: 'column' }}>
      <Header userRole="customer" />
      <main style={{ flex: 1 }}>
        <div style={{ maxWidth: '560px', margin: '0 auto', padding: '48px 24px 80px' }}>

          {/* Heading */}
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <div style={{ fontSize: '44px', marginBottom: '16px' }}>😔</div>
            <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', margin: '0 0 10px', letterSpacing: '-0.3px' }}>
              {'Before you go, ' + (customerName ?? 'there') + '…'}
            </h1>
            <p style={{ fontSize: '15px', color: '#64748b', lineHeight: 1.7, margin: 0 }}>
              {cleanerName
                ? cleanerName + ' has been cleaning for you' + (daysTogether > 0 ? ' for ' + daysTogether + ' days' : '') + '. We\'d love to keep that going.'
                : 'We\'d love to help you keep your home looking its best.'}
            </p>
          </div>

          {/* What you'd be giving up */}
          <div style={{ background: 'white', borderRadius: '16px', border: '1.5px solid #e2e8f0', padding: '24px 28px', marginBottom: '16px' }}>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '18px' }}>
              What you'd be giving up
            </div>
            {RETENTION_POINTS.map((point) => (
              <div key={point.icon} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '12px' }}>
                <span style={{ fontSize: '18px', flexShrink: 0, lineHeight: 1.4 }}>{point.icon}</span>
                <span style={{ fontSize: '14px', color: '#374151', lineHeight: 1.55 }}>{point.text}</span>
              </div>
            ))}
          </div>

          {/* Fee reminder */}
          <div style={{ background: '#f0fdf4', borderRadius: '12px', border: '1.5px solid #bbf7d0', padding: '18px 22px', marginBottom: '16px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#15803d', marginBottom: '4px' }}>
              {'💰 You\'re only paying £' + (monthlyFee / 100).toFixed(2) + '/month for the Vouchee service fee'}
            </div>
            <div style={{ fontSize: '13px', color: '#166534', lineHeight: 1.6 }}>
              {'That\'s less than the cost of one coffee a week — and it keeps your cleaner accountable and your home covered.'}
            </div>
          </div>

          {/* Pause suggestion */}
          <div style={{ background: '#eff6ff', borderRadius: '12px', border: '1.5px solid #bfdbfe', padding: '20px 22px', marginBottom: '32px' }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e40af', marginBottom: '6px' }}>
              🤔 Not ready to commit right now?
            </div>
            <div style={{ fontSize: '13px', color: '#1e3a8a', lineHeight: 1.6, marginBottom: '14px' }}>
              You can pause your listing instead — your cleaner relationship stays intact and you can reactivate anytime.
            </div>
            <button
              onClick={() => router.push('/customer/dashboard')}
              style={{ background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 22px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
            >
              {'Go back to my dashboard →'}
            </button>
          </div>

          {/* Primary CTA */}
          <button
            onClick={() => router.push('/customer/dashboard')}
            style={{ width: '100%', background: '#16a34a', color: 'white', border: 'none', borderRadius: '12px', padding: '16px', fontSize: '16px', fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", marginBottom: '12px' }}
          >
            Keep my cleaner ✓
          </button>

          {/* 30-day notice warning */}
          <div style={{ background: '#fefce8', border: '1px solid #fde68a', borderRadius: '10px', padding: '14px 18px', marginBottom: '20px' }}>
            <p style={{ margin: 0, fontSize: '12px', color: '#854d0e', lineHeight: 1.6 }}>
              <strong>30-day notice period applies.</strong>
              {' If you cancel today, ' + (cleanerName ?? 'your cleaner') + ' may continue cleaning for up to 30 more days. Your Direct Debit will be cancelled immediately — no further Vouchee fee payments will be taken.'}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', fontSize: '13px', color: '#dc2626', textAlign: 'center' }}>
              {error}
            </div>
          )}

          {/* Cancel link */}
          <div style={{ textAlign: 'center' }}>
            <button
              onClick={handleCancel}
              disabled={cancelling}
              style={{ background: 'none', border: 'none', fontSize: '13px', color: '#94a3b8', cursor: cancelling ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif", textDecoration: 'underline', padding: '8px' }}
            >
              {cancelling ? 'Cancelling…' : 'Cancel my subscription anyway'}
            </button>
          </div>

        </div>
      </main>
      <Footer />
    </div>
  )
}
