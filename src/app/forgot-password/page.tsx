'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import VoucheeLogoText from '@/assets/vouchee-logo-text.svg'

export default function ForgotPasswordPage() {
  const router = useRouter()
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
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/auth/reset-password&type=recovery`,
        }
      )
      if (resetError) throw new Error(resetError.message)
      setSent(true)
    } catch (err: any) {
      setError(err?.message ?? 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: error ? '#fff5f5' : 'white',
    border: `1.5px solid ${error ? '#fca5a5' : '#e2e8f0'}`,
    borderRadius: '12px',
    padding: '13px 16px',
    fontSize: '15px',
    color: '#1e293b',
    fontFamily: 'DM Sans, sans-serif',
    boxSizing: 'border-box',
    outline: 'none',
    transition: 'border-color 0.15s',
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

        {/* Logo */}
        <a href="/" style={{ textDecoration: 'none', marginBottom: '40px' }}>
          <VoucheeLogoText width={140} height={36} />
        </a>

        {/* Card */}
        <div style={{
          background: 'white', borderRadius: '24px', padding: '40px',
          width: '100%', maxWidth: '420px',
          boxShadow: '0 4px 32px rgba(0,0,0,0.07)',
          border: '1.5px solid rgba(255,255,255,0.9)',
        }}>
          {sent ? (
            /* ── Success state ── */
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📬</div>
              <h1 style={{ fontFamily: 'Lora, serif', fontSize: '24px', fontWeight: 700, color: '#0f172a', margin: '0 0 12px', lineHeight: 1.25 }}>
                Check your inbox
              </h1>
              <p style={{ fontSize: '15px', color: '#64748b', lineHeight: 1.6, margin: '0 0 28px' }}>
                We've sent a password reset link to <strong style={{ color: '#0f172a' }}>{email}</strong>. It may take a minute or two to arrive.
              </p>
              <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>
                Didn't receive it?{' '}
                <button
                  onClick={() => { setSent(false); setEmail('') }}
                  style={{ background: 'none', border: 'none', color: '#3b82f6', fontWeight: 600, cursor: 'pointer', fontSize: '13px', fontFamily: 'DM Sans, sans-serif', padding: 0 }}
                >
                  Try again
                </button>
              </p>
            </div>
          ) : (
            /* ── Form state ── */
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
                <button
                  onClick={() => router.push('/login')}
                  style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', color: '#64748b', flexShrink: 0, fontFamily: 'DM Sans, sans-serif' }}
                  aria-label="Back to login"
                >←</button>
                <h1 style={{ fontFamily: 'Lora, serif', fontSize: '22px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  Reset password
                </h1>
              </div>

              <p style={{ fontSize: '15px', color: '#64748b', lineHeight: 1.6, margin: '0 0 28px' }}>
                Enter the email address for your account and we'll send you a reset link.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '8px' }}>
                    Email address
                  </label>
                  <input
                    type="email"
                    style={inputStyle}
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setError(null) }}
                    onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                    autoComplete="email"
                    autoFocus
                  />
                </div>

                {error && (
                  <div style={{ background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: '10px', padding: '12px 14px' }}>
                    <p style={{ fontSize: '13px', color: '#dc2626', margin: 0, fontWeight: 500, lineHeight: 1.5 }}>⚠ {error}</p>
                  </div>
                )}

                <button
                  onClick={handleSubmit}
                  disabled={loading || !email.trim()}
                  style={{
                    width: '100%', padding: '15px',
                    background: loading || !email.trim() ? '#e2e8f0' : 'linear-gradient(135deg, #3b82f6, #6366f1)',
                    color: loading || !email.trim() ? '#94a3b8' : 'white',
                    border: 'none', borderRadius: '14px', fontSize: '15px', fontWeight: 700,
                    cursor: loading || !email.trim() ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: loading || !email.trim() ? 'none' : '0 4px 16px rgba(59,130,246,0.3)',
                    fontFamily: 'DM Sans, sans-serif', marginTop: '4px',
                  }}
                >
                  {loading ? 'Sending…' : 'Send reset link →'}
                </button>
              </div>
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
