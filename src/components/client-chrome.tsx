'use client'

import dynamic from 'next/dynamic'

// ─────────────────────────────────────────────────────────────────────────────
// ClientChrome — single client-component entry point for the non-critical
// site furniture that previously mounted eagerly on every page load:
//
//   - AuthListener:  Supabase auth-state listener that triggers router.refresh()
//                    on login/logout. Useful but not critical for first paint.
//   - PostHogProvider: analytics provider, gated by cookie consent. Component
//                      mounts on every page even before consent is given.
//   - ReferralCapture: parses ?ref= from the URL and stows it in a cookie.
//                      Runs once per visit, no need to be in the critical path.
//   - CookieBanner:    consent banner; appears on first visit only.
//
// All four are dynamic-imported with ssr:false so their JS is deferred until
// after first paint + hydration. Cuts ~430 lines of client JS off the
// critical path. Each one is its own chunk so even on subsequent visits the
// browser can cache them independently.
//
// The ChatWidget gets its own gate (chat-widget-gate.tsx) because it's
// session-gated and ~3x bigger than these four combined.
// ─────────────────────────────────────────────────────────────────────────────

const AuthListener = dynamic(
  () => import('@/components/auth-listener').then(m => ({ default: m.AuthListener })),
  { ssr: false, loading: () => null }
)

const PostHogProvider = dynamic(
  () => import('@/components/posthog-provider').then(m => ({ default: m.PostHogProvider })),
  { ssr: false, loading: () => null }
)

const ReferralCapture = dynamic(
  () => import('@/components/referral-capture').then(m => ({ default: m.ReferralCapture })),
  { ssr: false, loading: () => null }
)

const CookieBanner = dynamic(
  () => import('@/components/cookie-banner').then(m => ({ default: m.CookieBanner })),
  { ssr: false, loading: () => null }
)

export function ClientChrome() {
  return (
    <>
      <AuthListener />
      <PostHogProvider />
      <ReferralCapture />
      <CookieBanner />
    </>
  )
}
