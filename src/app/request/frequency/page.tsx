'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FrequencyType } from '@/types'
import { formatPrice } from '@/lib/utils'

interface RequestData {
  bedrooms: number
  bathrooms: number
  postcode: string
  sector: string
  tasks: string[]
  preferredDays?: string[]
  preferredTime?: string
  hoursPerSession?: number
}

const PRICING_TIERS = [
  {
    frequency: 'weekly' as FrequencyType,
    title: 'Weekly',
    pricePerSession: 9.99,
    monthlyCharge: 43.33,
    description: 'Every week',
    sessionsPerMonth: '~4.33',
    popular: true,
  },
  {
    frequency: 'fortnightly' as FrequencyType,
    title: 'Fortnightly',
    pricePerSession: 14.99,
    monthlyCharge: 32.48,
    description: 'Every 2 weeks',
    sessionsPerMonth: '~2.17',
  },
  {
    frequency: 'monthly' as FrequencyType,
    title: 'Monthly',
    pricePerSession: 19.99,
    monthlyCharge: 19.99,
    description: 'Once per month',
    sessionsPerMonth: '1',
  },
]

// Tasks that indicate a heavier-than-usual clean — matched to property page task IDs
const DEEP_CLEAN_TASKS = ['oven', 'bathroom_deep', 'kitchen_deep', 'fridge', 'mold']

const RATE_MIN = 13.00
const RATE_MAX = 25.00
const RATE_STEP = 0.50

function formatRate(rate: number): string {
  if (rate >= RATE_MAX) return '£25.00+'
  return `£${rate.toFixed(2)}`
}

interface RateSuggestion {
  low: number
  high: number
  defaultRate: string
  reason: string
}

// Property weight combines bedrooms and bathrooms into a single size signal.
// Bathrooms are a strong proxy for en-suites / house size (4 bed / 1 bath vs 4 bed / 3 bath).
function getPropertyWeight(bedrooms: number, bathrooms: number): number {
  return (bedrooms * 0.65) + (bathrooms * 0.35)
}

function getRateSuggestion(
  frequency: FrequencyType | null,
  bedrooms: number,
  bathrooms: number,
  tasks: string[]
): RateSuggestion {
  if (!frequency) {
    return {
      low: 15, high: 17.5,
      defaultRate: '16.00',
      reason: '', // empty = neutral, no frequency chosen yet
    }
  }

  const hasDeepCleanTasks = tasks.some(t => DEEP_CLEAN_TASKS.includes(t))
  const isMonthly = frequency === 'monthly'
  const weight = getPropertyWeight(bedrooms, bathrooms)

  // XL: e.g. 4 bed / 3 bath (weight ≥ 3.65), 5 bed / 2 bath (weight ≥ 3.95)
  const isXL = weight >= 3.6
  // Large: e.g. 4 bed / 1 bath (weight 2.95), 3 bed / 3 bath (weight 3.0)
  const isLarge = weight >= 2.8 && !isXL
  // Medium: e.g. 3 bed / 1-2 bath, 2 bed / 2 bath
  const isMedium = weight >= 1.9 && !isLarge && !isXL

  // Monthly or specialist tasks — higher band across all sizes
  if (hasDeepCleanTasks || isMonthly) {
    if (isXL) {
      return {
        low: 17.5, high: 20, defaultRate: '19.00',
        reason: `A large ${bedrooms}-bed / ${bathrooms}-bath property with ${isMonthly ? 'monthly' : 'specialist'} clean requirements. £17.50–20/hr reflects the substantial effort per visit.`,
      }
    }
    if (isLarge) {
      return {
        low: 18, high: 20, defaultRate: '18.50',
        reason: `A ${bedrooms}-bed / ${bathrooms}-bath property with ${isMonthly ? 'monthly' : 'specialist'} clean requirements. £18–20/hr reflects the extra work per visit.`,
      }
    }
    return {
      low: 17, high: 19, defaultRate: '18.00',
      reason: isMonthly
        ? `A ${bedrooms}-bed / ${bathrooms}-bath home on a monthly schedule. £17–19/hr reflects the extra work per visit compared to regular cleans.`
        : `Specialist tasks take additional time and skill. £17–19/hr reflects that fairly for your size property.`,
    }
  }

  // Regular cleans (weekly / fortnightly) — regularity is attractive to cleaners
  if (isXL) {
    return {
      low: 17.5, high: 20, defaultRate: '19.00',
      reason: `A large ${bedrooms}-bed / ${bathrooms}-bath home on a ${frequency} schedule. £17.50–20/hr reflects the size — the regular slot still makes this competitive for experienced cleaners.`,
    }
  }
  if (isLarge) {
    return {
      low: 16, high: 17.5, defaultRate: '16.50',
      reason: `A ${bedrooms}-bed / ${bathrooms}-bath home on a ${frequency} schedule. £16–17.50/hr is competitive in Horsham — the regular slot is a strong draw for good cleaners.`,
    }
  }
  if (isMedium) {
    return {
      low: 15, high: 17, defaultRate: '16.00',
      reason: `A ${bedrooms}-bed / ${bathrooms}-bath home on a ${frequency} schedule. £15–17/hr is the typical Horsham range — cleaners value the consistency of a regular booking.`,
    }
  }
  // Small (1–2 bed, 1 bath)
  return {
    low: 15, high: 16.5, defaultRate: '15.50',
    reason: `A smaller ${bedrooms}-bed / ${bathrooms}-bath property on a ${frequency} schedule. £15–16.50/hr is fair and competitive — regular work at a good rate attracts reliable cleaners.`,
  }
}

export default function RequestFrequencyPage() {
  const router = useRouter()
  const [requestData, setRequestData] = useState<RequestData | null>(null)
  const [selectedFrequency, setSelectedFrequency] = useState<FrequencyType | null>(null)
  const [hourlyRate, setHourlyRate] = useState(16.00)

  useEffect(() => {
    const stored = sessionStorage.getItem('cleanRequest')
    if (!stored) { router.push('/request/property'); return }
    const data = JSON.parse(stored) as RequestData
    setRequestData(data)
    const params = new URLSearchParams(window.location.search)
    const preset = params.get('preset')
    const freq = (preset === 'weekly' || preset === 'fortnightly' || preset === 'monthly')
      ? preset as FrequencyType
      : null
    if (freq) setSelectedFrequency(freq)
    // Always initialise rate from property data — use preset freq if available, else no-frequency fallback
    const s = getRateSuggestion(freq, data.bedrooms ?? 2, data.bathrooms ?? 1, data.tasks ?? [])
    setHourlyRate(parseFloat(s.defaultRate))
  }, [router])

  const handleContinue = () => {
    if (!selectedFrequency || !requestData) return
    sessionStorage.setItem('cleanRequest', JSON.stringify({
      ...requestData,
      frequency: selectedFrequency,
      hourlyRate: hourlyRate >= RATE_MAX ? RATE_MAX : hourlyRate,
    }))
    router.push('/request/terms')
  }

  const suggestion = requestData
    ? getRateSuggestion(selectedFrequency, requestData.bedrooms ?? 2, requestData.bathrooms ?? 1, requestData.tasks ?? [])
    : { low: 15, high: 20, defaultRate: '16.00', reason: '' }

  const rateInRange = hourlyRate >= suggestion.low && hourlyRate <= suggestion.high
  const rateLow = hourlyRate < suggestion.low
  const rateHigh = hourlyRate > suggestion.high

  if (!requestData) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ fontSize: '14px', color: '#94a3b8' }}>Loading…</div>
    </div>
  )

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
      <style>{`
        * { box-sizing: border-box; }
        .freq-card { transition: all 0.2s ease; cursor: pointer; }
        .freq-card:hover { transform: translateY(-2px); }
        .vou-select { width: 100%; background: rgba(255,255,255,0.9); border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 13px 16px; font-family: 'DM Sans', sans-serif; font-size: 16px; font-weight: 700; color: #0f172a; appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748b' d='M6 8L1 3h10z'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 16px center; cursor: pointer; transition: border-color 0.15s; }
        .vou-select:focus { outline: none; border-color: #3b82f6; background-color: white; }
        .rate-hint { transition: background 0.25s ease, border-color 0.25s ease; }
        .continue-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(59,130,246,0.35) !important; }
        .continue-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .back-btn:hover { color: #3b82f6; }
      `}</style>

      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #f0f7ff 0%, #fefce8 50%, #f0fdf4 100%)',
        fontFamily: "'DM Sans', sans-serif",
        padding: '24px 16px 48px',
      }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>

          {/* ── Step tracker ── */}
          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#3b82f6', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Step 2 of 4
              </div>
              <button className="back-btn" onClick={() => router.back()} style={{ fontSize: '13px', fontWeight: 600, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", transition: 'color 0.15s' }}>
                ← Back
              </button>
            </div>
            <div style={{ height: '4px', background: '#e2e8f0', borderRadius: '100px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: '50%', background: 'linear-gradient(90deg, #3b82f6 0%, #facc15 50%, #22c55e 100%)', borderRadius: '100px' }} />
            </div>
          </div>

          {/* ── Header ── */}
          <div style={{ marginBottom: '28px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px', lineHeight: 1.2 }}>
              Set your rate & frequency
            </h1>
            <p style={{ fontSize: '15px', color: '#64748b', lineHeight: 1.6, margin: 0 }}>
              You set the price — cleaners apply to your listing and you choose who you want.
            </p>
          </div>

          {/* ── Frequency ── */}
          <div style={{ background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(16px)', borderRadius: '20px', border: '1.5px solid rgba(255,255,255,0.9)', boxShadow: '0 2px 16px rgba(0,0,0,0.05)', padding: '24px', marginBottom: '12px' }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
              🔄 Choose your frequency
            </div>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px' }}>
              How often would you like your property cleaned?
            </p>

            <div style={{ padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', marginBottom: '16px', display: 'flex', gap: '8px' }}>
              <span style={{ fontSize: '14px', flexShrink: 0 }}>✅</span>
              <span style={{ fontSize: '13px', color: '#166534', fontWeight: 500 }}>
                Your Direct Debit doesn't start until you've selected your cleaner and confirmed a start date.
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              {PRICING_TIERS.map(tier => {
                const selected = selectedFrequency === tier.frequency
                return (
                  <div
                    key={tier.frequency}
                    className="freq-card"
                    onClick={() => setSelectedFrequency(tier.frequency)}
                    style={{
                      position: 'relative', padding: '18px 14px', borderRadius: '16px',
                      border: `2px solid ${selected ? '#3b82f6' : '#e2e8f0'}`,
                      background: selected ? 'rgba(59,130,246,0.06)' : 'rgba(255,255,255,0.7)',
                      textAlign: 'center',
                    }}
                  >
                    {tier.popular && (
                      <div style={{
                        position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%)',
                        background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                        color: 'white', fontSize: '10px', fontWeight: 700,
                        padding: '3px 10px', borderRadius: '100px', whiteSpace: 'nowrap',
                      }}>Most popular</div>
                    )}
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginBottom: '2px' }}>{tier.title}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '12px' }}>{tier.description}</div>
                    <div style={{ fontSize: '26px', fontWeight: 800, color: selected ? '#1e40af' : '#0f172a', lineHeight: 1 }}>
                      {formatPrice(tier.pricePerSession)}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '10px' }}>per session</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
                      {tier.sessionsPerMonth} sessions/mo
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: selected ? '#1e40af' : '#475569', marginTop: '2px' }}>
                      {formatPrice(tier.monthlyCharge)}/month
                    </div>
                    {selected && (
                      <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
                        <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <p style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'center', margin: '12px 0 0' }}>
              * Monthly charges based on 52 weeks ÷ 12 months = avg 4.33 weeks/month
            </p>
            <div style={{ textAlign: 'center', marginTop: '10px' }}>
              <a href="/why-vouchee" style={{ fontSize: '13px', color: '#3b82f6', fontWeight: 600, textDecoration: 'none' }}>
                Why find cleaners through Vouchee? →
              </a>
            </div>
          </div>

          {/* ── Hourly rate ── */}
          <div style={{ background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(16px)', borderRadius: '20px', border: '1.5px solid rgba(255,255,255,0.9)', boxShadow: '0 2px 16px rgba(0,0,0,0.05)', padding: '24px', marginBottom: '12px' }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
              💷 Offered hourly rate
            </div>
            {/* Stepper */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0', marginBottom: '12px', border: '1.5px solid #e2e8f0', borderRadius: '14px', overflow: 'hidden', background: 'rgba(255,255,255,0.9)' }}>
              <button
                type="button"
                onClick={() => setHourlyRate(r => Math.max(RATE_MIN, parseFloat((r - RATE_STEP).toFixed(2))))}
                disabled={hourlyRate <= RATE_MIN}
                style={{ width: '56px', height: '56px', fontSize: '24px', fontWeight: 300, color: hourlyRate <= RATE_MIN ? '#cbd5e1' : '#0f172a', background: 'transparent', border: 'none', cursor: hourlyRate <= RATE_MIN ? 'not-allowed' : 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '1.5px solid #e2e8f0' }}
              >−</button>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{formatRate(hourlyRate)}</div>
                <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500, marginTop: '2px' }}>per hour</div>
              </div>
              <button
                type="button"
                onClick={() => setHourlyRate(r => Math.min(RATE_MAX, parseFloat((r + RATE_STEP).toFixed(2))))}
                disabled={hourlyRate >= RATE_MAX}
                style={{ width: '56px', height: '56px', fontSize: '24px', fontWeight: 300, color: hourlyRate >= RATE_MAX ? '#cbd5e1' : '#0f172a', background: 'transparent', border: 'none', cursor: hourlyRate >= RATE_MAX ? 'not-allowed' : 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderLeft: '1.5px solid #e2e8f0' }}
              >+</button>
            </div>

                        {/* Live feedback hint */}
            <div className="rate-hint" style={{
              marginTop: '12px', padding: '12px 14px', borderRadius: '12px',
              background: !selectedFrequency ? '#f8fafc' : rateInRange ? '#eff6ff' : rateLow ? '#fefce8' : '#f0fdf4',
              border: `1px solid ${!selectedFrequency ? '#e2e8f0' : rateInRange ? '#bfdbfe' : rateLow ? '#fde68a' : '#bbf7d0'}`,
            }}>
              {!selectedFrequency && (
                <p style={{ fontSize: '13px', fontWeight: 500, color: '#94a3b8', margin: 0 }}>
                  💡 Select a frequency above and we’ll suggest a rate range for your property.
                </p>
              )}
              {selectedFrequency && rateInRange && (
                <>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: '#1e40af', margin: '0 0 4px' }}>
                    ✅ Within the suggested range — £{suggestion.low}–£{suggestion.high}/hr
                  </p>
                  <p style={{ fontSize: '12px', color: '#3b82f6', margin: 0, lineHeight: 1.55 }}>{suggestion.reason}</p>
                </>
              )}
              {selectedFrequency && rateLow && (
                <>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: '#92400e', margin: '0 0 3px' }}>
                    ⚠️ Below the suggested range of £{suggestion.low}–£{suggestion.high}/hr
                  </p>
                  <p style={{ fontSize: '12px', color: '#b45309', margin: 0, lineHeight: 1.5 }}>
                    A lower rate may reduce the number of cleaners who apply. You can always adjust once you’ve seen who’s interested.
                  </p>
                </>
              )}
              {selectedFrequency && rateHigh && (
                <>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: '#166534', margin: '0 0 3px' }}>
                    💚 Above the suggested range — you’ll attract a strong field of applicants
                  </p>
                  <p style={{ fontSize: '12px', color: '#16a34a', margin: 0, lineHeight: 1.5 }}>
                    Offering above the typical rate gives you the best pick of available cleaners in Horsham.
                  </p>
                </>
              )}
            </div>

            <p style={{ fontSize: '11px', color: '#94a3b8', margin: '10px 0 0', lineHeight: 1.5 }}>
              This is an offer — your cleaner may discuss the rate with you before agreeing to start.
            </p>
          </div>

          {/* ── Why Vouchee ── */}
          <div style={{ background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(16px)', borderRadius: '20px', border: '1.5px solid rgba(255,255,255,0.9)', boxShadow: '0 2px 16px rgba(0,0,0,0.05)', padding: '24px', marginBottom: '24px' }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginBottom: '14px' }}>
              What you can expect from Vouchee
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                'Local vetted and vouched cleaners',
                'All cleaners accreditations kept up-to-date',
                "You set the price you're happy to pay",
                "You choose which cleaners you'd like to chat with",
                'Last minute cover clean support',
                'Cancel anytime with only 30 days notice required',
              ].map((point, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                  <span style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5 }}>{point}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── CTA ── */}
          <button
            className="continue-btn"
            onClick={handleContinue}
            disabled={!selectedFrequency}
            style={{
              width: '100%', padding: '18px', borderRadius: '16px', border: 'none',
              background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
              color: 'white', fontSize: '17px', fontWeight: 700,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              cursor: selectedFrequency ? 'pointer' : 'not-allowed',
              boxShadow: '0 4px 20px rgba(37,99,235,0.3)',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
          >
            Continue →
          </button>

        </div>
      </div>
    </>
  )
}
