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
  },
  {
    frequency: 'fortnightly' as FrequencyType,
    title: 'Fortnightly',
    pricePerSession: 14.99,
    monthlyCharge: 32.48,
    description: 'Every 2 weeks',
    sessionsPerMonth: '~2.17',
    popular: true,
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

export default function RequestFrequencyPage() {
  const router = useRouter()
  const [requestData, setRequestData] = useState<RequestData | null>(null)
  const [selectedFrequency, setSelectedFrequency] = useState<FrequencyType | null>('fortnightly')
  const [hourlyRate, setHourlyRate] = useState('16.50')

  useEffect(() => {
    const stored = sessionStorage.getItem('cleanRequest')
    if (!stored) { router.push('/request/property'); return }
    setRequestData(JSON.parse(stored))
  }, [router])

  const handleContinue = () => {
    if (!selectedFrequency || !requestData) return
    sessionStorage.setItem('cleanRequest', JSON.stringify({
      ...requestData,
      frequency: selectedFrequency,
      hourlyRate: parseFloat(hourlyRate),
    }))
    router.push('/request/terms')
  }

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
        .vou-input { width: 100%; background: rgba(255,255,255,0.8); border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 11px 14px; font-family: 'DM Sans', sans-serif; font-size: 14px; color: #1e293b; }
        .vou-input:focus { outline: none; border-color: #3b82f6; background: white; }
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

          {/* ── Hourly rate ── */}
          <div style={{ background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(16px)', borderRadius: '20px', border: '1.5px solid rgba(255,255,255,0.9)', boxShadow: '0 2px 16px rgba(0,0,0,0.05)', padding: '24px', marginBottom: '12px' }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginBottom: '16px' }}>
              💷 Offered hourly rate
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <span style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a' }}>£</span>
              <input
                className="vou-input"
                type="number"
                step="0.10"
                min="10"
                max="50"
                value={hourlyRate}
                onChange={e => {
                  const val = parseFloat(e.target.value)
                  if (!isNaN(val)) setHourlyRate(val.toFixed(2))
                  else setHourlyRate(e.target.value)
                }}
                onBlur={e => {
                  const val = parseFloat(e.target.value)
                  if (!isNaN(val)) setHourlyRate(val.toFixed(2))
                }}
                style={{ maxWidth: '120px', fontSize: '28px', fontWeight: 800, textAlign: 'center', padding: '10px 12px' }}
              />
              <span style={{ fontSize: '15px', color: '#64748b', fontWeight: 500 }}>per hour</span>
            </div>
            <div style={{ padding: '12px 14px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px' }}>
              <p style={{ fontSize: '13px', fontWeight: 600, color: '#1e40af', margin: '0 0 4px' }}>
                💡 Suggested range: £14.20 – £19.50
              </p>
              <p style={{ fontSize: '12px', color: '#3b82f6', margin: 0 }}>
                A higher rate gives you a broader choice of cleaners.
                Based on your area: {requestData.sector || requestData.postcode}.
              </p>
            </div>
            <p style={{ fontSize: '12px', color: '#94a3b8', margin: '10px 0 0' }}>
              This is an offer — your cleaner may discuss the rate with you before agreeing to start.
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

            {/* DD reassurance */}
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
