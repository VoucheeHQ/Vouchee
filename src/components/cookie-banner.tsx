'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  CookieConsent,
  acceptAll,
  rejectAll,
  readConsent,
  writeConsent,
} from '@/lib/cookie-consent'

/**
 * Cookie consent UI.
 *
 * - Shows a bottom-sticky banner if no valid consent record exists.
 * - "Accept all" and "Reject all" are equal-weight (per ICO 2023 guidance).
 * - No close (X) — dismissal-without-choice isn't valid consent.
 * - "Manage preferences" opens a modal with per-category toggles.
 * - Footer "Cookie preferences" link re-opens the modal anytime via the
 *   custom 'vouchee:open-cookie-preferences' event.
 */
export function CookieBanner() {
  // undefined = pre-hydration (don't render); null = no stored consent; object = stored.
  const [consent, setConsent] = useState<CookieConsent | null | undefined>(undefined)
  const [showPreferences, setShowPreferences] = useState(false)
  const [draftAnalytics, setDraftAnalytics] = useState(false)

  useEffect(() => {
    setConsent(readConsent())

    const onOpenPrefs = () => {
      setDraftAnalytics(readConsent()?.analytics ?? false)
      setShowPreferences(true)
    }
    window.addEventListener('vouchee:open-cookie-preferences', onOpenPrefs)
    return () => window.removeEventListener('vouchee:open-cookie-preferences', onOpenPrefs)
  }, [])

  // Pre-hydration: render nothing to avoid SSR mismatch
  if (consent === undefined) return null
  // Consent already given AND modal not open: nothing to show
  if (consent !== null && !showPreferences) return null

  const handleAcceptAll = () => {
    setConsent(acceptAll())
    setShowPreferences(false)
  }
  const handleRejectAll = () => {
    setConsent(rejectAll())
    setShowPreferences(false)
  }
  const handleSavePreferences = () => {
    const c = writeConsent({ version: 1, essential: true, analytics: draftAnalytics })
    setConsent(c)
    setShowPreferences(false)
  }
  const handleOpenPreferences = () => {
    setDraftAnalytics(consent?.analytics ?? false)
    setShowPreferences(true)
  }

  return (
    <>
      {/* Bottom-sticky banner — only when no valid consent recorded AND modal not currently up */}
      {consent === null && !showPreferences && (
        <div
          role="dialog"
          aria-label="Cookie preferences"
          style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 10001,
            padding: '12px', pointerEvents: 'none',
          }}
        >
          <div style={{
            maxWidth: '560px', margin: '0 auto',
            background: 'white', border: '1px solid #e2e8f0', borderRadius: '16px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
            padding: '20px 22px', pointerEvents: 'auto',
            fontFamily: "'DM Sans', sans-serif",
          }}>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>
              Cookies on Vouchee
            </div>
            <div style={{ fontSize: '13.5px', color: '#475569', lineHeight: 1.55, marginBottom: '16px' }}>
              We use essential cookies to keep you logged in and process payments. We&apos;d also like to set optional analytics cookies to understand how Vouchee is used and improve the platform.
              {' '}
              <Link href="/legal/cookies" style={{ color: '#2563eb', fontWeight: 600 }}>Read the cookie policy</Link>.
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button onClick={handleRejectAll} style={btnSecondary}>Reject all</button>
              <button onClick={handleOpenPreferences} style={btnGhost}>Manage preferences</button>
              <button onClick={handleAcceptAll} style={btnPrimary}>Accept all</button>
            </div>
          </div>
        </div>
      )}

      {/* Preferences modal */}
      {showPreferences && (
        <div
          role="dialog"
          aria-label="Cookie preferences"
          aria-modal="true"
          style={{
            position: 'fixed', inset: 0, zIndex: 10002,
            background: 'rgba(15,23,42,0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px',
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          <div style={{
            background: 'white', borderRadius: '20px',
            maxWidth: '520px', width: '100%', maxHeight: '90vh', overflow: 'auto',
            padding: '28px 26px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }}>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
              Cookie preferences
            </div>
            <div style={{ fontSize: '13.5px', color: '#475569', lineHeight: 1.55, marginBottom: '20px' }}>
              Choose which cookies Vouchee can set on your device. Essential cookies cannot be disabled — they are required for the site to function.
            </div>

            <Toggle
              title="Essential cookies"
              description="Required for login, session security, and payment processing. Cannot be disabled."
              checked={true}
              disabled={true}
              onChange={() => {}}
            />
            <Toggle
              title="Analytics cookies"
              description="Help us understand how visitors use Vouchee, so we can improve the experience. No personal data is shared with third parties for advertising."
              checked={draftAnalytics}
              disabled={false}
              onChange={setDraftAnalytics}
            />

            <div style={{ display: 'flex', gap: '8px', marginTop: '24px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button onClick={() => setShowPreferences(false)} style={btnGhost}>Cancel</button>
              <button onClick={handleSavePreferences} style={btnPrimary}>Save preferences</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function Toggle({
  title, description, checked, disabled, onChange,
}: {
  title: string
  description: string
  checked: boolean
  disabled: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div style={{
      background: disabled ? '#f8fafc' : 'white',
      border: '1px solid #e2e8f0', borderRadius: '12px',
      padding: '14px 16px', marginBottom: '10px',
      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '14px',
    }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>{title}</div>
        <div style={{ fontSize: '12.5px', color: '#64748b', lineHeight: 1.5 }}>{description}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={title}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        style={{
          flexShrink: 0,
          width: '40px', height: '22px', borderRadius: '999px',
          border: 'none',
          background: checked ? '#22c55e' : '#cbd5e1',
          opacity: disabled ? 0.6 : 1,
          cursor: disabled ? 'not-allowed' : 'pointer',
          position: 'relative',
          transition: 'background 0.15s',
        }}
      >
        <span style={{
          position: 'absolute',
          top: '2px',
          left: checked ? '20px' : '2px',
          width: '18px', height: '18px',
          background: 'white',
          borderRadius: '50%',
          transition: 'left 0.15s',
          boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
        }} />
      </button>
    </div>
  )
}

const btnBase: React.CSSProperties = {
  border: '1px solid transparent',
  padding: '10px 16px',
  borderRadius: '10px',
  fontSize: '13.5px',
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: 'inherit',
  whiteSpace: 'nowrap',
}
const btnPrimary: React.CSSProperties = { ...btnBase, background: '#0f172a', color: 'white' }
const btnSecondary: React.CSSProperties = { ...btnBase, background: 'white', color: '#0f172a', border: '1px solid #cbd5e1' }
const btnGhost: React.CSSProperties = { ...btnBase, background: 'transparent', color: '#475569' }
