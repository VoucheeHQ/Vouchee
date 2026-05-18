'use client'

import { useState, Suspense, type CSSProperties } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff } from 'lucide-react'
import VoucheeLogoText from '@/assets/vouchee-logo-text.svg'
import '../auth/auth-card.css'

type Mode = 'signup' | 'login'
type Provider = 'google' | 'facebook' | 'apple'

// ─── Helpers ────────────────────────────────────────────────────────────────

function sanitiseRedirect(raw: string | null): string | null {
  if (!raw) return null
  const trimmed = raw.trim()
  if (!trimmed.startsWith('/')) return null
  if (trimmed.startsWith('//')) return null
  if (trimmed.length < 2) return null
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return null
  return trimmed
}

// ─── Brand logos (inline SVG) ───────────────────────────────────────────────

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

  // Default to signup. Header's "Log in" link passes ?mode=login so existing
  // users land directly on the sign-in form. Any other entry point (the
  // wizard's "Sign in to publish" button, deep-link, etc.) defaults to the
  // signup view because the conversion-critical path is new customers
  // creating their account.
  const initialMode: Mode = searchParams?.get('mode') === 'login' ? 'login' : 'signup'
  const [mode, setMode] = useState<Mode>(initialMode)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [agreedTerms, setAgreedTerms] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState<Provider | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Post-signup "check your email" state. True only when signUp() returned
  // success AND email confirmation is required (no session).
  const [signupSentToEmail, setSignupSentToEmail] = useState<string | null>(null)

  const switchMode = (next: Mode) => {
    setMode(next)
    setError(null)
    setPassword('')
    setConfirmPassword('')
  }

  // ─── OAuth ─────────────────────────────────────────────────────────────────
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
    } catch (err: any) {
      setOauthLoading(null)
      const msg = err?.message ?? 'Could not start sign-in. Please try again.'
      if (/provider .* (is not enabled|not enabled)/i.test(msg)) {
        setError(`${provider.charAt(0).toUpperCase() + provider.slice(1)} sign-in isn't quite ready yet. Use email + password for now.`)
      } else {
        setError(msg)
      }
    }
  }

  // ─── Email signup ──────────────────────────────────────────────────────────
  const handleSignup = async () => {
    if (!email.trim() || !password) return
    setError(null)

    if (password.length < 8) {
      setError('Password needs to be at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.")
      return
    }
    if (!agreedTerms) {
      setError("Please agree to Vouchee's Terms and Privacy Policy.")
      return
    }

    setLoading(true)
    try {
      const supabase = createClient()
      const callbackBase = `${window.location.origin}/auth/callback`
      const emailRedirectTo = redirectTarget
        ? `${callbackBase}?next=${encodeURIComponent(redirectTarget)}`
        : `${callbackBase}?next=${encodeURIComponent('/request/property')}`

      const { data, error: signupError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo },
      })

      if (signupError) {
        const msg = signupError.message.toLowerCase()
        if (msg.includes('already registered') || msg.includes('user already')) {
          throw new Error('An account with this email already exists. Try signing in instead.')
        }
        throw new Error(signupError.message)
      }

      // No session = email confirmation required (Supabase default behaviour
      // when "Confirm email" is enabled in Auth settings).
      if (!data.session) {
        setSignupSentToEmail(email.trim())
        return
      }

      // Confirmation disabled in Supabase Auth → instant session → redirect
      router.push(redirectTarget ?? '/request/property')
    } catch (err: any) {
      setError(err?.message ?? 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ─── Email login ───────────────────────────────────────────────────────────
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
          throw new Error('Please check your inbox and confirm your email address before signing in.')
        }
        throw new Error(authError.message)
      }
      if (!data.user) throw new Error('Sign-in failed. Please try again.')

      const { data: profile } = await (supabase as any)
        .from('profiles').select('role').eq('id', data.user.id).single()
      const role = (profile as any)?.role

      if (redirectTarget) {
        router.push(redirectTarget)
      } else if (role === 'admin') {
        router.push('/admin/dashboard')
      } else if (role === 'cleaner') {
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

  // ─── Styles ────────────────────────────────────────────────────────────────
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

  // ─── Post-signup "check your email" view ───────────────────────────────────
  if (signupSentToEmail) {
    return (
      <CardShell>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#f0fdf4', border: '2px solid #bbf7d0', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>
            ✉️
          </div>
          <h1 style={{ fontFamily: 'Lora, serif', fontSize: '24px', fontWeight: 700, color: '#0f172a', margin: '0 0 8px' }}>
            Check your inbox
          </h1>
          <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 18px', lineHeight: 1.55 }}>
            We've sent a confirmation link to <strong style={{ color: '#0f172a' }}>{signupSentToEmail}</strong>. Click it to activate your account.
          </p>
          <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '14px 16px', marginBottom: '18px', textAlign: 'left' }}>
            <p style={{ fontSize: '12px', color: '#64748b', margin: 0, lineHeight: 1.55 }}>
              💡 Once your email is confirmed we'll take you straight to {redirectTarget ? 'where you were going' : 'the next step of your cleaning request'}.
            </p>
          </div>
          <button
            type="button"
            onClick={() => { setSignupSentToEmail(null); setMode('login') }}
            style={{ background: 'none', border: 'none', color: '#3b82f6', fontWeight: 600, fontSize: '13px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
          >
            Already confirmed? Sign in
          </button>
        </div>
      </CardShell>
    )
  }

  // ─── Main signup / login view ──────────────────────────────────────────────
  const isSignup = mode === 'signup'
  const ctaLabel = isSignup ? 'Create my customer account' : 'Sign in'
  const submitHandler = isSignup ? handleSignup : handleLogin
  const submitDisabled = isAuthInFlight || !email.trim() || !password || (isSignup && (!confirmPassword || !agreedTerms))

  return (
    <CardShell>
      {/* ── Heading ─────────────────────────────────────────── */}
      <div style={{ textAlign: 'center', marginBottom: '8px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '100px', padding: '4px 12px', marginBottom: '14px', fontSize: '11px', fontWeight: 700, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          <span>🏠</span>
          Customer account
        </div>
        <h1 style={{ fontFamily: 'Lora, serif', fontSize: '24px', fontWeight: 700, color: '#0f172a', margin: 0, lineHeight: 1.25 }}>
          {isSignup ? 'Sign up to publish your request' : 'Welcome back'}
        </h1>
      </div>

      {/* ── SSO ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', margin: '18px 0' }}>
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

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '14px 0 16px' }}>
        <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
        <span style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>or</span>
        <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
      </div>

      {/* ── Email/password fields ───────────────────────────── */}
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
            onKeyDown={e => e.key === 'Enter' && submitHandler()}
            autoComplete="email"
          />
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {isSignup ? 'Choose a password' : 'Password'}
            </label>
            {!isSignup && (
              <a href="/forgot-password" style={{ fontSize: '12px', color: '#3b82f6', fontWeight: 600, textDecoration: 'none' }}>
                Forgot password?
              </a>
            )}
          </div>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              style={{ ...inputStyle(!!error), paddingRight: '44px' }}
              placeholder={isSignup ? 'At least 8 characters' : 'Your password'}
              value={password}
              onChange={e => { setPassword(e.target.value); setError(null) }}
              onKeyDown={e => e.key === 'Enter' && submitHandler()}
              autoComplete={isSignup ? 'new-password' : 'current-password'}
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

        {isSignup && (
          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '6px' }}>
              Confirm password
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              style={inputStyle(!!error)}
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChange={e => { setConfirmPassword(e.target.value); setError(null) }}
              onKeyDown={e => e.key === 'Enter' && submitHandler()}
              autoComplete="new-password"
            />
          </div>
        )}

        {isSignup && (
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', color: '#475569', lineHeight: 1.5, cursor: 'pointer', marginTop: '4px' }}>
            <input
              type="checkbox"
              checked={agreedTerms}
              onChange={e => { setAgreedTerms(e.target.checked); setError(null) }}
              style={{ marginTop: '3px', width: '16px', height: '16px', cursor: 'pointer', accentColor: '#22c55e' }}
            />
            <span>
              I agree to Vouchee's{' '}
              <a href="/legal/terms/customer" target="_blank" style={{ color: '#3b82f6', fontWeight: 600, textDecoration: 'none' }}>Customer Terms</a>
              {' '}and{' '}
              <a href="/legal/privacy" target="_blank" style={{ color: '#3b82f6', fontWeight: 600, textDecoration: 'none' }}>Privacy Policy</a>.
            </span>
          </label>
        )}

        {error && (
          <div style={{ background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: '10px', padding: '11px 13px' }}>
            <p style={{ fontSize: '13px', color: '#dc2626', margin: 0, fontWeight: 500, lineHeight: 1.5 }}>⚠ {error}</p>
          </div>
        )}

        <button
          onClick={submitHandler}
          disabled={submitDisabled}
          style={{
            width: '100%',
            padding: '14px',
            background: submitDisabled
              ? '#e2e8f0'
              : 'linear-gradient(135deg, #22c55e, #16a34a)',
            color: submitDisabled ? '#94a3b8' : 'white',
            border: 'none',
            borderRadius: '14px',
            fontSize: '15px',
            fontWeight: 700,
            cursor: submitDisabled ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
            boxShadow: submitDisabled ? 'none' : '0 4px 16px rgba(34,197,94,0.3)',
            fontFamily: 'DM Sans, sans-serif',
            marginTop: '4px',
          }}
        >
          {loading ? (isSignup ? 'Creating your account…' : 'Signing in…') : ctaLabel}
        </button>
      </div>

      {/* ── Mode toggle (smaller, secondary) ─────────────────── */}
      <div style={{ marginTop: '22px', paddingTop: '18px', borderTop: '1px solid #f1f5f9', textAlign: 'center' }}>
        <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
          {isSignup ? 'Already have a Vouchee account?' : 'New to Vouchee?'}{' '}
          <button
            type="button"
            onClick={() => switchMode(isSignup ? 'login' : 'signup')}
            style={{ background: 'none', border: 'none', color: '#3b82f6', fontWeight: 700, fontSize: '13px', cursor: 'pointer', padding: 0, fontFamily: 'DM Sans, sans-serif', textDecoration: 'underline' }}
          >
            {isSignup ? 'Sign in' : 'Create an account'}
          </button>
        </p>
      </div>

      {/* ── Cleaner footer link ─────────────────────────────── */}
      <p style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'center', margin: '14px 0 0', lineHeight: 1.5 }}>
        Are you a cleaner? <a href="/cleaner" style={{ color: '#94a3b8', fontWeight: 600 }}>Cleaner sign-up is here</a>
      </p>
    </CardShell>
  )
}

function CardShell({ children }: { children: React.ReactNode }) {
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
          <VoucheeLogoText width={220} height={56} />
        </a>
        <div className="vouchee-auth-card" style={{
          background: 'white',
          borderRadius: '24px',
          padding: '32px',
          width: '100%',
          maxWidth: '440px',
          boxShadow: '0 4px 32px rgba(0,0,0,0.07)',
          border: '1.5px solid rgba(255,255,255,0.9)',
        }}>
          {children}
        </div>
        <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '20px', textAlign: 'center' }}>
          Need help? <a href="mailto:support@vouchee.co.uk" style={{ color: '#3b82f6', fontWeight: 600, textDecoration: 'none' }}>support@vouchee.co.uk</a>
        </p>
      </div>
    </>
  )
}

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
