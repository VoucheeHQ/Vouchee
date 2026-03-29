'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!email.trim()) return
    setError(null)
    setLoading(true)
    try {
      const supabase = createClient()
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`,
      })
      if (resetError) throw resetError
      setSent(true)
    } catch (err: any) {
      setError(err?.message ?? 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href="https://fonts.googleapis.com/css2?family=Lora:wght@400;600;700&family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #f0f7ff 0%, #fefce8 50%, #f0fdf4 100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '24px', fontFamily: 'DM Sans, sans-serif',
      }}>
        <a href="/" style={{ textDecoration: 'none', marginBottom: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'linear-gradient(135deg, #3b82f6, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '20px', fontWeight: 800, color: 'white', fontFamily: 'Lora, serif' }}>V</span>
            </div>
            <span style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a', fontFamily: 'Lora, serif' }}>Vouchee</span>
          </div>
        </a>

        <div style={{ background: 'white', borderRadius: '24px', padding: '40px', width: '100%', maxWidth: '420px', boxShadow: '0 4px 32px rgba(0,0,0,0.07)', border: '1.5px solid rgba(255,255,255,0.9)' }}>

          {sent ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '40px', marginBottom: '16px' }}>📬</div>
              <h1 style={{ fontFamily: 'Lora, serif', fontSize: '22px', fontWeight: 700, color: '#0f172a', margin: '0 0 8px' }}>Check your inbox</h1>
              <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 24px', lineHeight: 1.6 }}>
                We've sent a password reset link to <strong>{email}</strong>. Check your inbox and click the link to set a new password.
              </p>
              <a href="/login" style={{ display: 'inline-block', background: '#0f172a', color: 'white', textDecoration: 'none', borderRadius: '12px', padding: '12px 24px', fontSize: '14px', fontWeight: 700 }}>
                Back to login
              </a>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
                <a href="/login" style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', color: '#64748b', textDecoration: 'none', flexShrink: 0 }}>←</a>
                <h1 style={{ fontFamily: 'Lora, serif', fontSize: '22px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Reset password</h1>
              </div>

              <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 24px', lineHeight: 1.6 }}>
                Enter the email address for your account and we'll send you a reset link.
              </p>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '8px' }}>
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(null) }}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  placeholder="you@example.com"
                  autoFocus
                  style={{
                    width: '100%', padding: '13px 16px', borderRadius: '12px',
                    border: `1.5px solid ${error ? '#fca5a5' : '#e2e8f0'}`,
                    fontSize: '15px', color: '#1e293b', fontFamily: 'DM Sans, sans-serif',
                    boxSizing: 'border-box', outline: 'none',
                  }}
                />
              </div>

              {error && (
                <div style={{ background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: '10px', padding: '12px 14px', marginBottom: '16px' }}>
                  <p style={{ fontSize: '13px', color: '#dc2626', margin: 0 }}>⚠ {error}</p>
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={loading || !email.trim()}
                style={{
                  width: '100%', padding: '15px', borderRadius: '14px', border: 'none',
                  background: loading || !email.trim() ? '#e2e8f0' : 'linear-gradient(135deg, #3b82f6, #6366f1)',
                  color: loading || !email.trim() ? '#94a3b8' : 'white',
                  fontSize: '15px', fontWeight: 700,
                  cursor: loading || !email.trim() ? 'not-allowed' : 'pointer',
                  fontFamily: 'DM Sans, sans-serif',
                }}
              >
                {loading ? 'Sending…' : 'Send reset link →'}
              </button>
            </>
          )}
        </div>

        <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '24px', textAlign: 'center' }}>
          Need help?{' '}
          <a href="mailto:support@vouchee.co.uk" style={{ color: '#3b82f6', fontWeight: 600, textDecoration: 'none' }}>support@vouchee.co.uk</a>
        </p>
      </div>
    </>
  )
}
