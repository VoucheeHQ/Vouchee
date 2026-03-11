'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff } from 'lucide-react'

type Role = 'cleaner' | 'customer' | null

export default function LoginPage() {
  const router = useRouter()
  const [role, setRole] = useState<Role>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async () => {
    if (!email.trim() || !password) return
    setError(null)
    setLoading(true)

    try {
      const supabase = createClient()
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (authError) {
        if (authError.message.toLowerCase().includes('invalid')) {
          throw new Error('Incorrect email or password. Please try again.')
        }
        if (authError.message.toLowerCase().includes('email not confirmed')) {
          throw new Error('Please check your inbox and confirm your email address before logging in.')
        }
        throw new Error(authError.message)
      }

      if (!data.user) throw new Error('Login failed. Please try again.')

      // Check their profile role matches what they selected
      const { data: profile } = await (supabase as any)
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single()

      const actualRole = profile?.role

      if (role === 'cleaner' && actualRole !== 'cleaner') {
        await supabase.auth.signOut()
        throw new Error("We couldn't find a cleaner account with those details. If you're a customer, select 'I'm a customer' instead.")
      }

      if (role === 'customer' && actualRole !== 'customer') {
        await supabase.auth.signOut()
        throw new Error("We couldn't find a customer account with those details. If you're a cleaner, select 'I'm a cleaner' instead.")
      }

      // Route by role
      if (actualRole === 'cleaner') {
        router.push('/cleaner/dashboard')
      } else {
        router.push('/customer/dashboard')
      }

    } catch (err: any) {
      setError(err?.message ?? 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = (hasError?: boolean): React.CSSProperties => ({
    width: '100%',
    background: hasError ? '#fff5f5' : 'white',
    border: `1.5px solid ${hasError ? '#fca5a5' : '#e2e8f0'}`,
    borderRadius: '12px',
    padding: '13px 16px',
    fontSize: '15px',
    color: '#1e293b',
    fontFamily: 'DM Sans, sans-serif',
    boxSizing: 'border-box',
    outline: 'none',
    transition: 'border-color 0.15s',
  })

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link
        href="https://fonts.googleapis.com/css2?family=Lora:wght@400;600;700&family=DM+Sans:wght@400;500;600;700;800&display=swap"
        rel="stylesheet"
      />

      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #f0f7ff 0%, #fefce8 50%, #f0fdf4 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        fontFamily: 'DM Sans, sans-serif',
      }}>

        {/* Logo */}
        <a href="/" style={{ textDecoration: 'none', marginBottom: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: '20px', fontWeight: 800, color: 'white', fontFamily: 'Lora, serif' }}>V</span>
            </div>
            <span style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a', fontFamily: 'Lora, serif' }}>Vouchee</span>
          </div>
        </a>

        {/* Card */}
        <div style={{
          background: 'white',
          borderRadius: '24px',
          padding: '40px',
          width: '100%',
          maxWidth: '420px',
          boxShadow: '0 4px 32px rgba(0,0,0,0.07)',
          border: '1.5px solid rgba(255,255,255,0.9)',
        }}>

          {/* ── Step 1: role selector ── */}
          {!role && (
            <>
              <h1 style={{
                fontFamily: 'Lora, serif',
                fontSize: '26px',
                fontWeight: 700,
                color: '#0f172a',
                margin: '0 0 8px',
                lineHeight: 1.25,
              }}>
                Welcome back
              </h1>
              <p style={{ fontSize: '15px', color: '#64748b', margin: '0 0 32px', lineHeight: 1.6 }}>
                How are you using Vouchee?
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

                {/* Cleaner option */}
                <button
                  onClick={() => setRole('cleaner')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '16px',
                    padding: '18px 20px',
                    background: '#f8faff',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: '16px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%',
                    transition: 'all 0.15s',
                    fontFamily: 'DM Sans, sans-serif',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = '#3b82f6'
                    ;(e.currentTarget as HTMLButtonElement).style.background = '#eff6ff'
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = '#e2e8f0'
                    ;(e.currentTarget as HTMLButtonElement).style.background = '#f8faff'
                  }}
                >
                  <div style={{
                    width: '48px', height: '48px', borderRadius: '14px',
                    background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '24px', flexShrink: 0,
                    border: '1px solid #bfdbfe',
                  }}>
                    🧹
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', marginBottom: '2px' }}>
                      I'm a cleaner
                    </div>
                    <div style={{ fontSize: '13px', color: '#64748b' }}>
                      Access your dashboard, jobs and profile
                    </div>
                  </div>
                  <span style={{ fontSize: '18px', color: '#cbd5e1' }}>›</span>
                </button>

                {/* Customer option */}
                <button
                  onClick={() => setRole('customer')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '16px',
                    padding: '18px 20px',
                    background: '#f8faff',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: '16px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%',
                    transition: 'all 0.15s',
                    fontFamily: 'DM Sans, sans-serif',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = '#22c55e'
                    ;(e.currentTarget as HTMLButtonElement).style.background = '#f0fdf4'
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = '#e2e8f0'
                    ;(e.currentTarget as HTMLButtonElement).style.background = '#f8faff'
                  }}
                >
                  <div style={{
                    width: '48px', height: '48px', borderRadius: '14px',
                    background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '24px', flexShrink: 0,
                    border: '1px solid #86efac',
                  }}>
                    🏠
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', marginBottom: '2px' }}>
                      I'm a customer
                    </div>
                    <div style={{ fontSize: '13px', color: '#64748b' }}>
                      Manage your cleaning requests and messages
                    </div>
                  </div>
                  <span style={{ fontSize: '18px', color: '#cbd5e1' }}>›</span>
                </button>

              </div>

              <p style={{ fontSize: '13px', color: '#94a3b8', textAlign: 'center', marginTop: '28px' }}>
                New to Vouchee?{' '}
                <a href="/request/property" style={{ color: '#3b82f6', fontWeight: 600, textDecoration: 'none' }}>Find a cleaner</a>
                {' '}or{' '}
                <a href="/cleaner" style={{ color: '#3b82f6', fontWeight: 600, textDecoration: 'none' }}>Apply as a cleaner</a>
              </p>
            </>
          )}

          {/* ── Step 2: login form ── */}
          {role && (
            <>
              {/* Back + heading */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
                <button
                  onClick={() => { setRole(null); setError(null); setEmail(''); setPassword('') }}
                  style={{
                    background: '#f1f5f9', border: 'none', borderRadius: '8px',
                    width: '32px', height: '32px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '16px', color: '#64748b', flexShrink: 0,
                    fontFamily: 'DM Sans, sans-serif',
                  }}
                  aria-label="Back"
                >
                  ←
                </button>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '20px' }}>{role === 'cleaner' ? '🧹' : '🏠'}</span>
                    <h1 style={{
                      fontFamily: 'Lora, serif',
                      fontSize: '22px',
                      fontWeight: 700,
                      color: '#0f172a',
                      margin: 0,
                    }}>
                      {role === 'cleaner' ? 'Cleaner log in' : 'Customer log in'}
                    </h1>
                  </div>
                </div>
              </div>

              {/* Role pill */}
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                background: role === 'cleaner' ? '#eff6ff' : '#f0fdf4',
                border: `1px solid ${role === 'cleaner' ? '#bfdbfe' : '#86efac'}`,
                borderRadius: '100px',
                padding: '5px 12px',
                fontSize: '12px',
                fontWeight: 700,
                color: role === 'cleaner' ? '#1d4ed8' : '#15803d',
                marginBottom: '24px',
              }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: role === 'cleaner' ? '#3b82f6' : '#22c55e', display: 'inline-block' }} />
                Logging in as a {role}
              </div>

              {/* Form */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

                <div>
                  <label style={{
                    fontSize: '12px', fontWeight: 700, color: '#64748b',
                    textTransform: 'uppercase', letterSpacing: '0.06em',
                    display: 'block', marginBottom: '8px',
                  }}>
                    Email address
                  </label>
                  <input
                    type="email"
                    style={inputStyle(!!error)}
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setError(null) }}
                    onKeyDown={e => e.key === 'Enter' && handleLogin()}
                    autoComplete="email"
                    autoFocus
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{
                      fontSize: '12px', fontWeight: 700, color: '#64748b',
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                    }}>
                      Password
                    </label>
                    <a
                      href="/forgot-password"
                      style={{ fontSize: '12px', color: '#3b82f6', fontWeight: 600, textDecoration: 'none' }}
                    >
                      Forgot password?
                    </a>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      style={{ ...inputStyle(!!error), paddingRight: '44px' }}
                      placeholder="Your password"
                      value={password}
                      onChange={e => { setPassword(e.target.value); setError(null) }}
                      onKeyDown={e => e.key === 'Enter' && handleLogin()}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      style={{
                        position: 'absolute', right: '12px', top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: '#94a3b8', display: 'flex', alignItems: 'center',
                        padding: '4px',
                      }}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div style={{
                    background: '#fef2f2', border: '1.5px solid #fecaca',
                    borderRadius: '10px', padding: '12px 14px',
                  }}>
                    <p style={{ fontSize: '13px', color: '#dc2626', margin: 0, fontWeight: 500, lineHeight: 1.5 }}>
                      ⚠ {error}
                    </p>
                  </div>
                )}

                {/* Submit */}
                <button
                  onClick={handleLogin}
                  disabled={loading || !email.trim() || !password}
                  style={{
                    width: '100%', padding: '15px',
                    background: loading || !email.trim() || !password
                      ? '#e2e8f0'
                      : role === 'cleaner'
                        ? 'linear-gradient(135deg, #3b82f6, #6366f1)'
                        : 'linear-gradient(135deg, #22c55e, #16a34a)',
                    color: loading || !email.trim() || !password ? '#94a3b8' : 'white',
                    border: 'none', borderRadius: '14px',
                    fontSize: '15px', fontWeight: 700,
                    cursor: loading || !email.trim() || !password ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: loading || !email.trim() || !password
                      ? 'none'
                      : role === 'cleaner'
                        ? '0 4px 16px rgba(59,130,246,0.3)'
                        : '0 4px 16px rgba(34,197,94,0.3)',
                    fontFamily: 'DM Sans, sans-serif',
                    marginTop: '4px',
                  }}
                >
                  {loading ? 'Logging in…' : `Log in as a ${role}`}
                </button>

              </div>

              {/* Footer links */}
              <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #f1f5f9', textAlign: 'center' }}>
                {role === 'cleaner' ? (
                  <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>
                    Not yet a Vouchee cleaner?{' '}
                    <a href="/cleaner" style={{ color: '#3b82f6', fontWeight: 600, textDecoration: 'none' }}>
                      Apply here
                    </a>
                  </p>
                ) : (
                  <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>
                    Don't have an account?{' '}
                    <a href="/request/property" style={{ color: '#22c55e', fontWeight: 600, textDecoration: 'none' }}>
                      Post a cleaning request
                    </a>
                  </p>
                )}
              </div>
            </>
          )}

        </div>

        {/* Help footer */}
        <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '24px', textAlign: 'center' }}>
          Need help?{' '}
          <a href="mailto:support@vouchee.co.uk" style={{ color: '#3b82f6', fontWeight: 600, textDecoration: 'none' }}>
            support@vouchee.co.uk
          </a>
        </p>

      </div>
    </>
  )
}
