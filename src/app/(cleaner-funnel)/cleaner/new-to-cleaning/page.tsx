'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import VoucheeLogoText from '@/assets/vouchee-logo-text.svg'

function isValidEmail(email: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) }
function isValidPhone(phone: string) { const d = phone.replace(/[\s\-\(\)]/g, ''); return /^(\+44|0)7\d{9}$/.test(d) || /^(\+44|0)[1-9]\d{8,9}$/.test(d) }

export default function NewToCleaningPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', phone: '', email: '', message: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const set = (key: string, value: string) => {
    setForm(f => ({ ...f, [key]: value }))
    if (errors[key]) setErrors(e => { const n = { ...e }; delete n[key]; return n })
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = 'Please enter your name.'
    if (!form.phone.trim()) e.phone = 'Please enter your phone number.'
    else if (!isValidPhone(form.phone)) e.phone = 'Please enter a valid UK phone number.'
    if (!form.email.trim()) e.email = 'Please enter your email address.'
    else if (!isValidEmail(form.email)) e.email = 'Please enter a valid email address.'
    if (!form.message.trim()) e.message = 'Please tell us a little about yourself.'
    return e
  }

  const handleSubmit = async () => {
    setSubmitError(null)
    const e = validate()
    if (Object.keys(e).length > 0) { setErrors(e); return }
    setSubmitting(true)
    try {
      const res = await fetch('/api/new-to-cleaning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error('Failed to send')
      setSubmitted(true)
    } catch {
      setSubmitError('Something went wrong — please try again or email cleaners@vouchee.co.uk')
    } finally {
      setSubmitting(false)
    }
  }

  const inputStyle: React.CSSProperties = { width: '100%', background: 'rgba(255,255,255,0.7)', border: '1.5px solid #e2e8f0', borderRadius: '12px', padding: '12px 14px', fontSize: '14px', color: '#1e293b', fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box', outline: 'none' }
  const inputErrorStyle: React.CSSProperties = { ...inputStyle, borderColor: '#fca5a5', background: '#fff5f5' }
  const labelStyle: React.CSSProperties = { fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '8px' }
  const fieldErrorStyle: React.CSSProperties = { fontSize: '12px', color: '#dc2626', marginTop: '6px', fontWeight: 500 }

  if (submitted) {
    return (
      <div style={{ minHeight: '100vh', fontFamily: 'DM Sans, sans-serif', background: 'linear-gradient(160deg, #f0f7ff 0%, #fefce8 50%, #f0fdf4 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
        <div style={{ maxWidth: '480px', width: '100%', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '40px' }}>
            <VoucheeLogoText width={180} height={46} />
          </div>
          <div style={{ background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(16px)', borderRadius: '24px', padding: '48px 40px', boxShadow: '0 8px 40px rgba(0,0,0,0.08)', border: '1.5px solid rgba(255,255,255,0.9)' }}>
            <div style={{ fontSize: '56px', marginBottom: '16px' }}>🌱</div>
            <h1 style={{ fontFamily: 'Lora, serif', fontSize: '24px', fontWeight: 800, color: '#0f172a', marginBottom: '12px' }}>We've got your details!</h1>
            <p style={{ fontSize: '15px', color: '#64748b', lineHeight: 1.7, marginBottom: '24px' }}>
              We'll pass your information on to our partner network who can help you get started in cleaning. Someone will be in touch soon.
            </p>
            <a href="https://www.vouchee.co.uk" style={{ display: 'inline-block', background: '#0f172a', color: 'white', padding: '12px 28px', borderRadius: '12px', fontSize: '14px', fontWeight: 700, textDecoration: 'none' }}>
              Back to Vouchee
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href="https://fonts.googleapis.com/css2?family=Lora:wght@400;600;700&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <div style={{ minHeight: '100vh', fontFamily: 'DM Sans, sans-serif', background: 'linear-gradient(160deg, #f0f7ff 0%, #fefce8 50%, #f0fdf4 100%)' }}>

        {/* Header */}
        <div style={{ padding: '48px 20px 32px', textAlign: 'center' }}>
          <button onClick={() => router.back()} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#64748b', cursor: 'pointer', background: 'none', border: 'none', fontFamily: 'inherit', marginBottom: '32px', padding: 0 }}>← Back</button>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '32px' }}>
            <VoucheeLogoText width={180} height={46} />
          </div>
        </div>

        <div style={{ maxWidth: '600px', margin: '0 auto', padding: '0 20px 80px' }}>

          {/* Explanation card */}
          <div style={{ background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(16px)', borderRadius: '24px', padding: '36px 40px', boxShadow: '0 4px 24px rgba(0,0,0,0.06)', border: '1.5px solid rgba(255,255,255,0.9)', marginBottom: '20px' }}>
            <div style={{ fontSize: '40px', marginBottom: '16px', textAlign: 'center' }}>🌱</div>
            <h1 style={{ fontFamily: 'Lora, serif', fontSize: 'clamp(20px, 4vw, 26px)', fontWeight: 700, color: '#0f172a', marginBottom: '16px', lineHeight: 1.3, textAlign: 'center' }}>
              New to cleaning? We can still help.
            </h1>
            <p style={{ fontSize: '15px', color: '#475569', lineHeight: 1.75, marginBottom: '16px' }}>
              Vouchee is designed for experienced cleaners who are already self-employed or ready to go it alone. At this stage, we're not able to onboard cleaners who are just starting out.
            </p>
            <p style={{ fontSize: '15px', color: '#475569', lineHeight: 1.75, marginBottom: '0' }}>
              However, we work closely with partner organisations who are more open to new cleaners — including training, mentoring, and helping you get the right credentials in place. Leave your details below and we'll pass them on. Someone will be in touch to help you take the next step.
            </p>
          </div>

          {/* Form card */}
          <div style={{ background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(16px)', borderRadius: '24px', padding: '36px 40px', boxShadow: '0 4px 24px rgba(0,0,0,0.06)', border: '1.5px solid rgba(255,255,255,0.9)' }}>
            <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', marginBottom: '24px' }}>Your details</h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

              <div>
                <label style={labelStyle}>Full name</label>
                <input style={errors.name ? inputErrorStyle : inputStyle} placeholder="e.g. Sarah Mitchell" value={form.name} onChange={e => set('name', e.target.value)} />
                {errors.name && <p style={fieldErrorStyle}>⚠ {errors.name}</p>}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Phone number</label>
                  <input type="tel" style={errors.phone ? inputErrorStyle : inputStyle} placeholder="07700 000000" value={form.phone} onChange={e => set('phone', e.target.value)} />
                  {errors.phone && <p style={fieldErrorStyle}>⚠ {errors.phone}</p>}
                </div>
                <div>
                  <label style={labelStyle}>Email address</label>
                  <input type="email" style={errors.email ? inputErrorStyle : inputStyle} placeholder="sarah@example.com" value={form.email} onChange={e => set('email', e.target.value)} />
                  {errors.email && <p style={fieldErrorStyle}>⚠ {errors.email}</p>}
                </div>
              </div>

              <div>
                <label style={labelStyle}>A little about you</label>
                <textarea
                  style={{ ...( errors.message ? inputErrorStyle : inputStyle), minHeight: '120px', resize: 'vertical', lineHeight: 1.6 }}
                  placeholder="I want to get into cleaning because…"
                  value={form.message}
                  onChange={e => set('message', e.target.value)}
                />
                {errors.message && <p style={fieldErrorStyle}>⚠ {errors.message}</p>}
              </div>

            </div>

            {submitError && (
              <div style={{ background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: '12px', padding: '14px 16px', marginTop: '20px' }}>
                <p style={{ fontSize: '14px', color: '#dc2626', margin: 0, fontWeight: 600 }}>{submitError}</p>
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={submitting}
              style={{ width: '100%', marginTop: '24px', padding: '16px', background: submitting ? '#94a3b8' : 'linear-gradient(90deg, #3b82f6 0%, #22c55e 100%)', color: 'white', border: 'none', borderRadius: '14px', fontSize: '16px', fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: 'inherit', boxShadow: submitting ? 'none' : '0 4px 16px rgba(59,130,246,0.25)' }}
            >
              {submitting ? 'Sending…' : 'Send my details →'}
            </button>

            <p style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center', marginTop: '12px', lineHeight: 1.6 }}>
              Your details will only be shared with Vouchee's trusted partner network.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
