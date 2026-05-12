'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import posthog from 'posthog-js'
import { CookieConsent, readConsent } from '@/lib/cookie-consent'

/**
 * PostHog provider — initializes analytics ONLY after the user consents.
 *
 * Wired up to listen for 'vouchee:consent-change' from the cookie banner, so
 * flipping the Analytics toggle immediately enables/disables tracking without
 * a page reload.
 *
 * Data goes to eu.posthog.com to keep it inside the EU/UK adequacy region —
 * cleaner privacy story for UK users and ICO registration.
 */
export function PostHogProvider() {
  const [consent, setConsent] = useState<CookieConsent | null>(null)
  const pathname = usePathname()

  // Read initial consent + subscribe to changes
  useEffect(() => {
    setConsent(readConsent())
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<CookieConsent>).detail
      setConsent(detail)
    }
    window.addEventListener('vouchee:consent-change', onChange as EventListener)
    return () => window.removeEventListener('vouchee:consent-change', onChange as EventListener)
  }, [])

  // React to consent state changes
  useEffect(() => {
    if (!consent) return
    if (consent.analytics) {
      initPostHog()
    } else {
      tearDownPostHog()
    }
  }, [consent])

  // Track route changes in the App Router.
  // PostHog's built-in pageview only fires on initial load; client-side
  // navigations don't trigger a full page reload, so we fire $pageview on
  // each pathname change. Without this, you'd only see landing pages, not
  // the funnel that follows.
  useEffect(() => {
    if (!pathname) return
    if (!consent?.analytics) return
    if (!(posthog as any).__loaded) return
    posthog.capture('$pageview')
  }, [pathname, consent?.analytics])

  return null
}

function initPostHog() {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (!key) {
    console.warn('PostHog: NEXT_PUBLIC_POSTHOG_KEY not set — skipping init')
    return
  }
  if ((posthog as any).__loaded) {
    // Already initialized — just re-enable capturing after a prior opt-out
    posthog.opt_in_capturing()
    return
  }
  posthog.init(key, {
    api_host: 'https://eu.i.posthog.com',
    capture_pageview: false,    // we handle this manually for App Router (see useEffect above)
    capture_pageleave: true,
    persistence: 'localStorage+cookie',
    autocapture: true,
  })
}

function tearDownPostHog() {
  if (!(posthog as any).__loaded) return
  posthog.opt_out_capturing()
}
