'use client'

import { useState } from 'react'

type ServiceType = 'deep_clean' | 'end_of_tenancy' | 'oven_clean'

interface Service {
  id: ServiceType
  emoji: string
  title: string
  description: string
}

const SERVICES: Service[] = [
  {
    id: 'deep_clean',
    emoji: '✨',
    title: 'Deep clean',
    description: 'A thorough top-to-bottom clean, ideal as a reset or before guests arrive.',
  },
  {
    id: 'end_of_tenancy',
    emoji: '🔑',
    title: 'End of tenancy',
    description: 'Detailed clean to meet landlord and letting agent standards on move-out.',
  },
  {
    id: 'oven_clean',
    emoji: '🍳',
    title: 'Oven clean',
    description: 'Specialist deep-clean of your oven, hob and extractor — racks and trays included.',
  },
]

export default function OneOffPage() {
  const [serviceType, setServiceType] = useState<ServiceType | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [postcode, setPostcode] = useState('')
  const [neededBy, setNeededBy] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSubmit = !!serviceType && !!name.trim() && !!email.trim() && !!phone.trim() && !!postcode.trim() && !!neededBy.trim()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/one-off-enquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          postcode: postcode.trim().toUpperCase(),
          serviceType,
          neededBy: neededBy.trim(),
          notes: notes.trim(),
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Something went wrong — please try again.')
      }
      setSubmitted(true)
    } catch (err: any) {
      setError(err.message ?? 'Could not send your enquiry. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div style={{ background: 'linear-gradient(160deg, #eff6ff 0%, #f0fdf4 50%, #fefce8 100%)', minHeight: '100%' }}>
        <div style={{ maxWidth: '560px', margin: '0 auto', padding: '80px 24px', textAlign: 'center' }}>
          <div style={{ background: 'white', borderRadius: '20px', padding: '40px 32px', border: '1px solid #e2e8f0', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>✅</div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px', fontFamily: "'DM Sans', sans-serif" }}>Thanks — we&apos;ve got your enquiry</h1>
            <p style={{ fontSize: '15px', color: '#475569', lineHeight: 1.6, margin: '0 0 20px' }}>
              We&apos;ll be in touch shortly to confirm details and connect you with a specialist who can help.
            </p>
            <a href="/" style={{ display: 'inline-block', background: '#2563eb', color: 'white', textDecoration: 'none', borderRadius: '10px', padding: '12px 24px', fontSize: '14px', fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>Back to home</a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: 'linear-gradient(160deg, #eff6ff 0%, #f0fdf4 40%, #fefce8 70%, #f0fdf4 100%)', minHeight: '100%' }}>

      {/* Hero */}
      <div style={{ padding: '72px 24px 32px', textAlign: 'center' }}>
        <div style={{ maxWidth: '640px', margin: '0 auto' }}>
          <h1 style={{ fontSize: 'clamp(28px, 5vw, 44px)', fontWeight: 800, color: '#0f172a', margin: '0 0 16px', letterSpacing: '-0.5px', lineHeight: 1.1, fontFamily: "'DM Sans', sans-serif" }}>
            One-off cleans, by <span style={{ color: '#2563eb' }}>vetted specialists</span>
          </h1>
          <p style={{ fontSize: '17px', color: '#475569', lineHeight: 1.6, margin: 0, fontFamily: "'DM Sans', sans-serif" }}>
            We work with a small network of trusted local partners who specialise in deep cleans, end-of-tenancy and oven cleaning. Tell us what you need and we&apos;ll connect you with the right person.
          </p>
        </div>
      </div>

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '0 24px 80px', fontFamily: "'DM Sans', sans-serif" }}>

        {/* Service selection */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px', textAlign: 'center' }}>What do you need?</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
            {SERVICES.map(s => {
              const selected = serviceType === s.id
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setServiceType(s.id)}
                  style={{
                    cursor: 'pointer',
                    padding: '20px 16px',
                    borderRadius: '16px',
                    border: `2px solid ${selected ? '#2563eb' : '#e2e8f0'}`,
                    background: selected ? 'rgba(37,99,235,0.06)' : 'rgba(255,255,255,0.85)',
                    backdropFilter: 'blur(8px)',
                    textAlign: 'center',
                    fontFamily: 'inherit',
                    transition: 'all 0.15s ease',
                    boxShadow: selected ? '0 4px 16px rgba(37,99,235,0.15)' : '0 1px 4px rgba(0,0,0,0.03)',
                  }}
                >
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>{s.emoji}</div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>{s.title}</div>
                  <div style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.4 }}>{s.description}</div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          style={{
            background: 'rgba(255,255,255,0.85)',
            backdropFilter: 'blur(16px)',
            borderRadius: '20px',
            border: '1.5px solid rgba(255,255,255,0.9)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.05)',
            padding: '28px 24px',
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '14px' }}>Your details</div>

          <div style={{ display: 'grid', gap: '14px' }}>
            <Field label="Name" value={name} onChange={setName} placeholder="Jane Smith" />
            <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="jane@example.com" />
            <Field label="Phone" type="tel" value={phone} onChange={setPhone} placeholder="07700 900000" />
            <Field label="Postcode" value={postcode} onChange={setPostcode} placeholder="RH12 1AB" />
            <Field label="When do you need it by?" value={neededBy} onChange={setNeededBy} placeholder="e.g. by 28 May, or ASAP" />
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>Anything else? <span style={{ fontWeight: 400, color: '#94a3b8' }}>(optional)</span></label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                placeholder="Property size, access notes, anything specific to mention…"
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: '12px',
                  fontSize: '15px',
                  fontFamily: 'inherit',
                  color: '#0f172a',
                  background: 'white',
                  outline: 'none',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {error && (
            <div style={{ marginTop: '16px', padding: '12px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', fontSize: '13px', color: '#b91c1c' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!canSubmit || submitting}
            style={{
              marginTop: '20px',
              width: '100%',
              padding: '16px',
              borderRadius: '14px',
              border: 'none',
              background: canSubmit && !submitting ? 'linear-gradient(135deg, #2563eb, #3b82f6)' : '#cbd5e1',
              color: 'white',
              fontSize: '16px',
              fontWeight: 700,
              cursor: canSubmit && !submitting ? 'pointer' : 'not-allowed',
              fontFamily: 'inherit',
              transition: 'transform 0.15s, box-shadow 0.15s',
              boxShadow: canSubmit && !submitting ? '0 4px 20px rgba(37,99,235,0.3)' : 'none',
            }}
          >
            {submitting ? 'Sending…' : 'Send enquiry →'}
          </button>

          {!serviceType && (
            <p style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center', margin: '12px 0 0' }}>Pick a service above to enable submit.</p>
          )}
        </form>
      </div>
    </div>
  )
}

// ─── Field ───────────────────────────────────────────────────────────────────
function Field({
  label, value, onChange, placeholder, type = 'text',
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string
}) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: '12px 14px',
          border: '1.5px solid #e2e8f0',
          borderRadius: '12px',
          fontSize: '15px',
          fontFamily: 'inherit',
          color: '#0f172a',
          background: 'white',
          outline: 'none',
          boxSizing: 'border-box',
        }}
      />
    </div>
  )
}
