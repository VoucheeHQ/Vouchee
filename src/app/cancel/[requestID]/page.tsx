'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'

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

// ─── Cooling-off helpers (client-side mirror of the server check) ────────────
//
// We compute cooling-off state up front so we can show the right page layout
// before the user clicks "Cancel". Walking back through switch_from_request_id
// finds the contract anchor — same logic as the server.
//
// The actual route decision still happens server-side; this is just for UX.

interface CoolingOffState {
  inCoolingOff: boolean
  serviceHasBegun: boolean
  coolingOffUntil: string | null
}

async function computeCoolingOffState(supabase: any, requestId: string, startDate: string | null): Promise<CoolingOffState> {
  let nextId: string | null = requestId
  let coolingOffUntil: string | null = null
  let safety = 10
  while (nextId && safety > 0) {
    const { data } = await supabase.from('clean_requests')
      .select('id, switch_from_request_id, cooling_off_until')
      .eq('id', nextId)
      .single()
    if (!data) break
    if (data.cooling_off_until) coolingOffUntil = data.cooling_off_until
    nextId = data.switch_from_request_id
    safety--
  }
  const now = Date.now()
  const inCoolingOff = !!coolingOffUntil && new Date(coolingOffUntil).getTime() > now
  const serviceHasBegun = !!startDate && new Date(startDate).getTime() <= now
  return { inCoolingOff, serviceHasBegun, coolingOffUntil }
}

// ─── Route-aware success result type ─────────────────────────────────────────

type CancelRoute = 'cooling_off_full_refund' | 'cooling_off_partial_review' | 'standard_30_day' | 'already_cancelled'

interface CancelResult {
  route: CancelRoute
  refundedAmountPence?: number
}

export default function CancelPage({ params }: { params: { requestId: string } }) {
  const { requestId } = params
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)
  const [result, setResult] = useState<CancelResult | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [frequency, setFrequency] = useState('fortnightly')
  const [cleanerName, setCleanerName] = useState<string | null>(null)
  const [customerName, setCustomerName] = useState<string | null>(null)
  const [daysTogether, setDaysTogether] = useState(0)
  const [coolingOff, setCoolingOff] = useState<CoolingOffState>({ inCoolingOff: false, serviceHasBegun: false, coolingOffUntil: null })

  useEffect(() => {
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

        if (reqErr || !req) { setNotFound(true); setLoading(false); return }

        if (req.status !== 'fulfilled') {
          setLoading(false)
          router.replace('/customer/dashboard')
          return
        }

        setFrequency(req.frequency ?? 'fortnightly')
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

        // Compute cooling-off state for UI branching
        const co = await computeCoolingOffState(supabase, requestId, req.start_date)
        setCoolingOff(co)

        setLoading(false)
      } catch {
        setError('Could not load your subscription details.')
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
      const data = await res.json()
      if (!res.ok) {
        setError('Could not cancel — please contact accounts@vouchee.co.uk')
        setCancelling(false)
        return
      }
      setResult({
        route: (data.route ?? 'standard_30_day') as CancelRoute,
        refundedAmountPence: data.refundedAmountPence,
      })
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

  if (notFound || error) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif", padding: '24px' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#dc2626', fontSize: '14px', marginBottom: '16px' }}>{error ?? 'This subscription could not be found.'}</p>
          <button onClick={() => router.push('/customer/dashboard')} style={{ background: '#0f172a', color: 'white', border: 'none', borderRadius: '10px', padding: '10px 24px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Back to dashboard</button>
        </div>
      </div>
    )
  }

  // ─── Success state — branches on the API's route response ───────────────
  if (result) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'DM Sans', sans-serif", display: 'flex', flexDirection: 'column' }}>
        <Header userRole="customer" />
        <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
          <div style={{ maxWidth: '480px', width: '100%', textAlign: 'center' }}>
            {result.route === 'cooling_off_full_refund' && <CoolingOffFullRefundSuccess refundedAmountPence={result.refundedAmountPence ?? 0} />}
            {result.route === 'cooling_off_partial_review' && <CoolingOffPartialReviewSuccess />}
            {(result.route === 'standard_30_day' || result.route === 'already_cancelled') && <Standard30DaySuccess cleanerName={cleanerName} />}
            <button
              onClick={() => router.push('/customer/dashboard')}
              style={{ background: '#0f172a', color: 'white', border: 'none', borderRadius: '12px', padding: '14px 32px', fontSize: '15px', fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", marginTop: '24px' }}
            >
              Back to dashboard
            </button>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  // ─── Pre-cancel screen — branches on whether we're inside cooling-off ───
  if (coolingOff.inCoolingOff) {
    return (
      <CoolingOffCancelScreen
        customerName={customerName}
        cleanerName={cleanerName}
        coolingOffUntil={coolingOff.coolingOffUntil}
        serviceHasBegun={coolingOff.serviceHasBegun}
        cancelling={cancelling}
        error={error}
        onCancel={handleCancel}
        onBack={() => router.push('/customer/dashboard')}
      />
    )
  }

  return (
    <Standard30DayCancelScreen
      customerName={customerName}
      cleanerName={cleanerName}
      frequency={frequency}
      cancelling={cancelling}
      error={error}
      onCancel={handleCancel}
      onBack={() => router.push('/customer/dashboard')}
    />
  )
}

// ─── Pre-cancel: cooling-off layout ──────────────────────────────────────────
//
// Different from the standard 30-day flow: no retention messaging, clearer
// language about the statutory right, prominent display of the deadline.
// We don't want to manipulate someone exercising a legal right.

function CoolingOffCancelScreen({
  customerName, cleanerName, coolingOffUntil, serviceHasBegun, cancelling, error, onCancel, onBack,
}: {
  customerName: string | null
  cleanerName: string | null
  coolingOffUntil: string | null
  serviceHasBegun: boolean
  cancelling: boolean
  error: string | null
  onCancel: () => void
  onBack: () => void
}) {
  const deadline = coolingOffUntil
    ? new Date(coolingOffUntil).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : null

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'DM Sans', sans-serif", display: 'flex', flexDirection: 'column' }}>
      <Header userRole="customer" />
      <main style={{ flex: 1 }}>
        <div style={{ maxWidth: '560px', margin: '0 auto', padding: '48px 24px 80px' }}>

          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>🛡️</div>
            <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', margin: '0 0 10px', letterSpacing: '-0.3px' }}>
              {customerName ? `Cancel within your 14-day right, ${customerName}` : 'Cancel within your 14-day right'}
            </h1>
            <p style={{ fontSize: '15px', color: '#64748b', lineHeight: 1.7, margin: 0 }}>
              You&apos;re still inside the statutory cancellation period. You can cancel without giving a reason.
            </p>
          </div>

          {deadline && (
            <div style={{ background: 'white', borderRadius: '14px', border: '1.5px solid #e2e8f0', padding: '18px 22px', marginBottom: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px' }}>Cancellation deadline</div>
              <div style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>{deadline}</div>
            </div>
          )}

          {!serviceHasBegun ? (
            <div style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: '12px', padding: '20px 22px', marginBottom: '20px' }}>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>💷 What happens when you cancel</div>
              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', color: '#166534', lineHeight: 1.7 }}>
                <li>Your Direct Debit is cancelled immediately</li>
                <li>Any pending payments are cancelled</li>
                <li>Any payments already taken are refunded in full within 14 days</li>
                <li>{cleanerName ?? 'Your cleaner'} is notified that you&apos;ve cancelled</li>
              </ul>
            </div>
          ) : (
            <div style={{ background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: '12px', padding: '20px 22px', marginBottom: '20px' }}>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>⏳ What happens when you cancel</div>
              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', color: '#78350f', lineHeight: 1.7 }}>
                <li>Your Direct Debit is cancelled immediately — no further charges</li>
                <li>Because cleaning has already started under your express consent, we&apos;ll review the cleans completed and refund the unused portion of your fee</li>
                <li>We&apos;ll email you within 5 working days with the refund amount</li>
                <li>{cleanerName ?? 'Your cleaner'} is notified that you&apos;ve cancelled</li>
              </ul>
            </div>
          )}

          <p style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.6, textAlign: 'center', margin: '0 0 24px' }}>
            This cancellation is actioned under clause 11.2 of our <a href="/legal/terms/customer" target="_blank" rel="noopener noreferrer" style={{ color: '#94a3b8' }}>Customer Terms</a>.
          </p>

          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', fontSize: '13px', color: '#dc2626', textAlign: 'center' }}>{error}</div>
          )}

          <button
            onClick={onCancel}
            disabled={cancelling}
            style={{ width: '100%', background: cancelling ? '#94a3b8' : '#ef4444', color: 'white', border: 'none', borderRadius: '12px', padding: '16px', fontSize: '16px', fontWeight: 700, cursor: cancelling ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif", marginBottom: '12px' }}
          >
            {cancelling ? 'Cancelling…' : 'Cancel my subscription'}
          </button>

          <button
            onClick={onBack}
            disabled={cancelling}
            style={{ width: '100%', background: 'white', color: '#64748b', border: '1.5px solid #e2e8f0', borderRadius: '12px', padding: '14px', fontSize: '14px', fontWeight: 600, cursor: cancelling ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif" }}
          >
            Keep my subscription
          </button>

        </div>
      </main>
      <Footer />
    </div>
  )
}

// ─── Pre-cancel: standard 30-day notice layout (unchanged from existing) ────

function Standard30DayCancelScreen({
  customerName, cleanerName, frequency, cancelling, error, onCancel, onBack,
}: {
  customerName: string | null
  cleanerName: string | null
  frequency: string
  cancelling: boolean
  error: string | null
  onCancel: () => void
  onBack: () => void
}) {
  const monthlyFee = MONTHLY_FEE[frequency] ?? MONTHLY_FEE.fortnightly

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'DM Sans', sans-serif", display: 'flex', flexDirection: 'column' }}>
      <Header userRole="customer" />
      <main style={{ flex: 1 }}>
        <div style={{ maxWidth: '560px', margin: '0 auto', padding: '48px 24px 80px' }}>

          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <div style={{ fontSize: '44px', marginBottom: '16px' }}>😔</div>
            <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', margin: '0 0 10px', letterSpacing: '-0.3px' }}>
              {'Before you go, ' + (customerName ?? 'there') + '…'}
            </h1>
            <p style={{ fontSize: '15px', color: '#64748b', lineHeight: 1.7, margin: 0 }}>
              {cleanerName
                ? cleanerName + ' has been cleaning for you. We\'d love to keep that going.'
                : 'We\'d love to help you keep your home looking its best.'}
            </p>
          </div>

          <div style={{ background: 'white', borderRadius: '16px', border: '1.5px solid #e2e8f0', padding: '24px 28px', marginBottom: '16px' }}>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '18px' }}>
              What you&apos;d be giving up
            </div>
            {RETENTION_POINTS.map((point) => (
              <div key={point.icon} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '12px' }}>
                <span style={{ fontSize: '18px', flexShrink: 0, lineHeight: 1.4 }}>{point.icon}</span>
                <span style={{ fontSize: '14px', color: '#374151', lineHeight: 1.55 }}>{point.text}</span>
              </div>
            ))}
          </div>

          <div style={{ background: '#f0fdf4', borderRadius: '12px', border: '1.5px solid #bbf7d0', padding: '18px 22px', marginBottom: '16px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#15803d', marginBottom: '4px' }}>
              {'💰 You\'re only paying £' + (monthlyFee / 100).toFixed(2) + '/month for the Vouchee service fee'}
            </div>
            <div style={{ fontSize: '13px', color: '#166534', lineHeight: 1.6 }}>
              {'That\'s less than the cost of one coffee a week — and it keeps your cleaner accountable and your home covered.'}
            </div>
          </div>

          <div style={{ background: '#eff6ff', borderRadius: '12px', border: '1.5px solid #bfdbfe', padding: '20px 22px', marginBottom: '32px' }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e40af', marginBottom: '6px' }}>
              🤔 Not ready to commit right now?
            </div>
            <div style={{ fontSize: '13px', color: '#1e3a8a', lineHeight: 1.6, marginBottom: '14px' }}>
              You can pause your listing instead — your cleaner relationship stays intact and you can reactivate anytime.
            </div>
            <button
              onClick={onBack}
              style={{ background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 22px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
            >
              {'Go back to my dashboard →'}
            </button>
          </div>

          <button
            onClick={onBack}
            style={{ width: '100%', background: '#16a34a', color: 'white', border: 'none', borderRadius: '12px', padding: '16px', fontSize: '16px', fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", marginBottom: '12px' }}
          >
            Keep my cleaner ✓
          </button>

          <div style={{ background: '#fefce8', border: '1px solid #fde68a', borderRadius: '10px', padding: '14px 18px', marginBottom: '20px' }}>
            <p style={{ margin: 0, fontSize: '12px', color: '#854d0e', lineHeight: 1.6 }}>
              <strong>30-day notice period applies.</strong>
              {' If you cancel today, ' + (cleanerName ?? 'your cleaner') + ' may continue cleaning for up to 30 more days. Your Direct Debit will be cancelled immediately — no further Vouchee fee payments will be taken.'}
            </p>
          </div>

          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', fontSize: '13px', color: '#dc2626', textAlign: 'center' }}>
              {error}
            </div>
          )}

          <div style={{ textAlign: 'center' }}>
            <button
              onClick={onCancel}
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

// ─── Success components — one per route ──────────────────────────────────────

function CoolingOffFullRefundSuccess({ refundedAmountPence }: { refundedAmountPence: number }) {
  const amountLabel = `£${(refundedAmountPence / 100).toFixed(2)}`
  return (
    <>
      <div style={{ fontSize: '48px', marginBottom: '20px' }}>✅</div>
      <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', margin: '0 0 12px' }}>Subscription cancelled</h1>
      <p style={{ fontSize: '15px', color: '#64748b', lineHeight: 1.7, margin: '0 0 16px' }}>
        Your Direct Debit has been cancelled and you&apos;ve been removed from your cleaner&apos;s list.
      </p>
      {refundedAmountPence > 0 ? (
        <div style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: '12px', padding: '18px 22px', textAlign: 'left' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#15803d', marginBottom: '4px' }}>💷 Refund of {amountLabel} on its way</div>
          <div style={{ fontSize: '13px', color: '#166534', lineHeight: 1.6 }}>
            We&apos;ll refund this to the account your Direct Debit was set up from, within 14 days. You&apos;ll see it on your bank statement.
          </div>
        </div>
      ) : (
        <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.6, margin: 0 }}>
          No payments had been collected yet, so there&apos;s nothing to refund. We&apos;ve sent you a confirmation email.
        </p>
      )}
    </>
  )
}

function CoolingOffPartialReviewSuccess() {
  return (
    <>
      <div style={{ fontSize: '48px', marginBottom: '20px' }}>📨</div>
      <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', margin: '0 0 12px' }}>Cancellation received</h1>
      <p style={{ fontSize: '15px', color: '#64748b', lineHeight: 1.7, margin: '0 0 16px' }}>
        Your Direct Debit has been cancelled. We&apos;ll be in touch within 5 working days about a pro-rata refund for the unused portion of your service fee.
      </p>
      <div style={{ background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: '12px', padding: '14px 18px', textAlign: 'left' }}>
        <p style={{ margin: 0, fontSize: '12px', color: '#78350f', lineHeight: 1.6 }}>
          A confirmation email has been sent. If you have details that would help our review (such as dates of cleans completed), please reply to that email.
        </p>
      </div>
    </>
  )
}

function Standard30DaySuccess({ cleanerName }: { cleanerName: string | null }) {
  return (
    <>
      <div style={{ fontSize: '48px', marginBottom: '20px' }}>👋</div>
      <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', margin: '0 0 12px' }}>Subscription cancelled</h1>
      <p style={{ fontSize: '15px', color: '#64748b', lineHeight: 1.7, margin: '0 0 8px' }}>
        {cleanerName ? cleanerName + ' has been notified' : 'Your cleaner has been notified'} and will be in touch about any remaining cleans during the 30-day notice period.
      </p>
      <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.6, margin: 0 }}>
        Your Direct Debit has been cancelled. No further payments will be taken for the Vouchee service fee.
      </p>
    </>
  )
}
