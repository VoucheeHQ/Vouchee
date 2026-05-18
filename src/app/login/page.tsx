'use client'

import { useState, Suspense, type CSSProperties } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff } from 'lucide-react'
import VoucheeLogoText from '@/assets/vouchee-logo-text.svg'
import '../auth/auth-card.css'

type Role = 'cleaner' | 'customer'
type Provider = 'google' | 'facebook' | 'apple'

/**
 * Safe-redirect helper.
 * Accepts only same-origin relative paths starting with a single "/".
 * Rejects:
 *   - absolute URLs (https://..., http://...)
 *   - protocol-relative URLs (//evil.com — some browsers treat these as absolute)
 *   - any path that doesn't start with "/"
 *   - bare "/" or empty values (fall back to role default)
 */
function sanitiseRedirect(raw: string | null): string | null {
  if (!raw) return null
  const trimmed = raw.trim()
  if (!trimmed.startsWith('/')) return null
  if (trimmed.startsWith('//')) return null
  if (trimmed.length < 2) return null
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return null
  return trimmed
}

// ─── Brand logos (inline SVG, no external deps) ─────────────────────────────

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}

function FacebookLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" fill="#1877F2"/>
    </svg>
  )
}

function AppleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" fill="currentColor"/>
    </svg>
  )
}

const PROVIDER_LABELS: Record<Provider, string> = {
  google: 'Continue with Google',
  facebook: 'Continue with Facebook',
  // Apple's brand guidelines require this exact wording
  apple: 'Sign in with Apple',
}

function ProviderLogo({ provider }: { provider: Provider }) {
  if (provider === 'google') return <GoogleLogo />
  if (provider === 'facebook') return <FacebookLogo />
  return <AppleLogo />
}

// ─── Page ────────────────────────────────────────────────────────────────────

function LoginPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTarget = sanitiseRedirect(searchParams?.get('redirect') ?? null)

  const [role, setRole] = useState<Role>('customer')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState<Provider | null>(null)
  const [error, setError] = useState<string | null>(null)

  // ─── OAuth handler ─────────────────────────────────────────────────────────
  // Hands off to Supabase, which redirects to the provider's consent screen,
  // then back to /auth/callback. The callback exchanges the code for a session
  // and routes by role; we pass redirectTarget as `next` so the original
  // destination (e.g. /request/preview) is preserved across the OAuth round-trip.
  const handleOAuth = async (provider: Provider) => {
    setError(null)
    setOauthLoading(provider)
    try {
      const supabase = createClient()
      const callbackBase = `${window.location.origin}/auth/callback`
      const redirectTo = redirectTarget
        ? `${callbackBase}?next=${encodeURIComponent(redirectTarget)}`
        : callbackBase
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo },
      })
      if (oauthError) throw oauthError
      // On success the browser is already navigating away — no further work here.
    } catch (err: any) {
      setOauthLoading(null)
      const msg = err?.message ?? 'Could not start sign-in. Please try again.'
      // Common case: provider not yet configured in Supabase Auth dashboard
      if (/provider .* (is not enabled|not enabled)/i.test(msg)) {
        setError(`${provider.charAt(0).toUpperCase() + provider.slice(1)} sign-in isn't quite ready yet. Use email + password for now.`)
      } else {
        setError(msg)
      }
    }
  }

  // ─── Email/password login ──────────────────────────────────────────────────
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

      const { data: profile } = await (supabase as any)
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single()

      const actualRole = profile?.role

      // Admin can log in via either form — skip role mismatch check
      if (actualRole !== 'admin') {
        if (role === 'cleaner' && actualRole !== 'cleaner') {
          await supabase.auth.signOut()
          throw new Error("We couldn't find a cleaner account with those details. If you're a customer, switch to 'Customer' instead.")
        }
        if (role === 'customer' && actualRole !== 'customer') {
          await supabase.auth.signOut()
          throw new Error("We couldn't find a customer account with those details. If you're a cleaner, switch to 'Cleaner' instead.")
        }
      }

      if (redirectTarget) {
        router.push(redirectTarget)
      } else if (actualRole === 'admin') {
        router.push('/admin/dashboard')
      } else if (actualRole === 'cleaner') {
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

  // ─── Styles ───────────────────────────────────────────────────────────────
  const inputStyle = (hasError?: boolean): CSSProperties => ({
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

  const ssoButtonStyle = (provider: Provider, isLoading: boolean): CSSProperties => ({
    width: '100%',
    padding: '12px 16px',
    background: provider === 'apple' ? '#0f172a' : 'white',
    color: provider === 'apple' ? 'white' : '#0f172a',
    border: `1.5px solid ${provider === 'apple' ? '#0f172a' : '#e2e8f0'}`,
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: isLoading || oauthLoading !== null ? 'not-allowed' : 'pointer',
    fontFamily: 'DM Sans, sans-serif',
    opacity: isLoading || (oauthLoading !== null && oauthLoading !== provider) ? 0.5 : 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    transition: 'background 0.15s, border-color 0.15s',
  })

  const isAuthInFlight = loading || oauthLoading !== null

  // ─── New-account destination ───────────────────────────────────────────────
  // Customers always create accounts through the wizard (so their first
  // request and account are made together). Cleaners go through the
  // application funnel at /cleaner. Either way, "Create account" routes
  // the user into the funnel for the role they've selected here.
  const createAccountHref = role === 'cleaner' ? '/cleaner' : '/request/property'
  const createAccountLabel = role === 'cleaner' ? 'Apply as a cleaner' : 'Create an account'

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
        <a href="/" style={{ textDecoration: 'none', marginBottom: '28px' }}>
          <VoucheeLogoText width={140} height={36} />
        </a>

        <div className="vouchee-auth-card" style={{
          background: 'white',
          borderRadius: '24px',
          padding: '36px',
          width: '100%',
          maxWidth: '440px',
          boxShadow: '0 4px 32px rgba(0,0,0,0.07)',
          border: '1.5px solid rgba(255,255,255,0.9)',
        }}>
          <h1 style={{ fontFamily: 'Lora, serif', fontSize: '24px', fontWeight: 700, color: '#0f172a', margin: '0 0 6px', lineHeight: 1.25 }}>
            Welcome back
          </h1>
          <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 22px', lineHeight: 1.55 }}>
            Sign in to manage your Vouchee account.
          </p>

          {redirectTarget && (
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '10px 12px', marginBottom: '18px', fontSize: '12px', color: '#1e40af', lineHeight: 1.5 }}>
              💡 We'll take you to where you were going right after sign-in.
            </div>
          )}

          {/* ── SSO buttons ───────────────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '18px' }}>
            {(['google', 'facebook', 'apple'] as Provider[]).map(p => (
              <button
                key={p}
                type="button"
                onClick={() => handleOAuth(p)}
                disabled={isAuthInFlight}
                style={ssoButtonStyle(p, oauthLoading === p)}
              >
                <ProviderLogo provider={p} />
                <span>{oauthLoading === p ? 'Redirecting…' : PROVIDER_LABELS[p]}</span>
              </button>
            ))}
          </div>

          {/* ── OR divider ────────────────────────────────────────── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '8px 0 18px' }}>
            <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>or</span>
            <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
          </div>

          {/* ── Role toggle ───────────────────────────────────────── */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', padding: '4px', background: '#f1f5f9', borderRadius: '12px' }}>
            {(['customer', 'cleaner'] as Role[]).map(r => (
              <button
                key={r}
                type="button"
                onClick={() => { setRole(r); setError(null) }}
                style={{
                  flex: 1, padding: '9px', borderRadius: '9px', border: 'none',
                  background: role === r ? 'white' : 'transparent',
                  color: role === r ? '#0f172a' : '#64748b',
                  fontSize: '13px', fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
                  boxShadow: role === r ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.15s',
                }}
              >
                {r === 'customer' ? '🏠 Customer' : '🧹 Cleaner'}
              </button>
            ))}
          </div>

          {/* ── Email/password form ───────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '6px' }}>
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
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Password
                </label>
                <a href="/forgot-password" style={{ fontSize: '12px', color: '#3b82f6', fontWeight: 600, textDecoration: 'none' }}>
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
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center', padding: '4px' }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div style={{ background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: '10px', padding: '11px 13px' }}>
                <p style={{ fontSize: '13px', color: '#dc2626', margin: 0, fontWeight: 500, lineHeight: 1.5 }}>⚠ {error}</p>
              </div>
            )}

            <button
              onClick={handleLogin}
              disabled={isAuthInFlight || !email.trim() || !password}
              style={{
                width: '100%',
                padding: '14px',
                background: isAuthInFlight || !email.trim() || !password
                  ? '#e2e8f0'
                  : role === 'cleaner'
                    ? 'linear-gradient(135deg, #3b82f6, #6366f1)'
                    : 'linear-gradient(135deg, #22c55e, #16a34a)',
                color: isAuthInFlight || !email.trim() || !password ? '#94a3b8' : 'white',
                border: 'none',
                borderRadius: '14px',
                fontSize: '15px',
                fontWeight: 700,
                cursor: isAuthInFlight || !email.trim() || !password ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                boxShadow: isAuthInFlight || !email.trim() || !password
                  ? 'none'
                  : role === 'cleaner'
                    ? '0 4px 16px rgba(59,130,246,0.3)'
                    : '0 4px 16px rgba(34,197,94,0.3)',
                fontFamily: 'DM Sans, sans-serif',
                marginTop: '4px',
              }}
            >
              {loading ? 'Signing in…' : `Sign in as ${role === 'cleaner' ? 'cleaner' : 'customer'}`}
            </button>
          </div>

          {/* ── Create account CTA ────────────────────────────────── */}
          <div style={{ marginTop: '22px', paddingTop: '18px', borderTop: '1px solid #f1f5f9' }}>
            <p style={{ fontSize: '13px', color: '#64748b', textAlign: 'center', margin: '0 0 12px' }}>
              {role === 'cleaner'
                ? 'Not yet a Vouchee cleaner?'
                : "Don't have an account?"}
            </p>
            <a
              href={createAccountHref}
              style={{
                display: 'block', width: '100%', textAlign: 'center', boxSizing: 'border-box',
                padding: '12px', borderRadius: '12px',
                background: 'white',
                color: '#0f172a',
                border: '1.5px solid #0f172a',
                fontSize: '14px', fontWeight: 700,
                textDecoration: 'none', fontFamily: 'DM Sans, sans-serif',
                transition: 'background 0.15s, color 0.15s',
              }}
            >
              {createAccountLabel} →
            </a>
          </div>
        </div>

        <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '20px', textAlign: 'center' }}>
          Need help?{' '}
          <a href="mailto:support@vouchee.co.uk" style={{ color: '#3b82f6', fontWeight: 600, textDecoration: 'none' }}>support@vouchee.co.uk</a>
        </p>
      </div>
    </>
  )
}

// useSearchParams requires Suspense in Next.js 14 App Router
export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Sans, sans-serif' }}>
        <p style={{ color: '#64748b' }}>Loading…</p>
      </div>
    }>
      <LoginPageInner />
    </Suspense>
  )
}
