'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import posthog from 'posthog-js'
import { CookieConsent, readConsent } from '@/lib/cookie-consent'
import { createClient } from '@/lib/supabase/client'

type SessionUser = {
  id: string
  email: string | null
  role: string | null
  full_name: string | null
}

/**
 * PostHog provider — initializes analytics ONLY after the user consents.
 *
 * Responsibilities:
 *  - Listen to 'vouchee:consent-change' from the cookie banner.
 *  - Subscribe to Supabase auth state and resolve the current logged-in user.
 *  - When analytics consent is granted, init PostHog and identify() the
 *    current session user (if any) so visits across sessions/devices stitch
 *    together as one PostHog person.
 *  - On logout, call posthog.reset() so the next visitor starts fresh.
 *  - Manually fire $pageview on App Router navigations (PostHog's built-in
 *    pageview only fires on initial page load).
 *
 * Data goes to eu.i.posthog.com (EU/UK adequacy region).
 */
export function PostHogProvider() {
  const [consent, setConsent] = useState<CookieConsent | null>(null)
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null)
  const sessionUserRef = useRef<SessionUser | null>(null)
  sessionUserRef.current = sessionUser
  const pathname = usePathname()

  // ── Consent state ────────────────────────────────────────────────────────
  useEffect(() => {
    setConsent(readConsent())
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<CookieConsent>).detail
      setConsent(detail)
    }
    window.addEventListener('vouchee:consent-change', onChange as EventListener)
    return () => window.removeEventListener('vouchee:consent-change', onChange as EventListener)
  }, [])

  // ── Auth state ───────────────────────────────────────────────────────────
  useEffect(() => {
    const supabase = createClient()

    const loadUser = async (userId: string | undefined) => {
      if (!userId) { setSessionUser(null); return }
      try {
        const { data } = await (supabase as any)
          .from('profiles')
          .select('id, email, role, full_name')
          .eq('id', userId)
          .single()
        setSessionUser(data ?? null)
      } catch {
        setSessionUser(null)
      }
    }

    // Initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      loadUser(session?.user?.id)
    })

    // Reactive updates
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setSessionUser(null)
      } else if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') {
        loadUser(session?.user?.id)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // ── PostHog init / teardown driven by consent ───────────────────────────
  useEffect(() => {
    if (!consent) return // still resolving

    if (!consent.analytics) {
      // No consent (or revoked) — opt out if PostHog is already loaded
      if ((posthog as any).__loaded) posthog.opt_out_capturing()
      return
    }

    // Consent granted
    if ((posthog as any).__loaded) {
      posthog.opt_in_capturing()
      identifyCurrent(sessionUserRef.current)
      return
    }

    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
    if (!key) {
      console.warn('PostHog: NEXT_PUBLIC_POSTHOG_KEY not set — skipping init')
      return
    }
    posthog.init(key, {
      api_host: 'https://eu.i.posthog.com',
      capture_pageview: false,    // we handle this manually for App Router
      capture_pageleave: true,
      persistence: 'localStorage+cookie',
      autocapture: true,
      loaded: () => {
        // Once PostHog is ready, identify the current user if we have one.
        // Use the ref so we get the latest value (sessionUser might have
        // resolved between init() and loaded()).
        identifyCurrent(sessionUserRef.current)
      },
    })
  }, [consent])

  // ── Identify / reset when the session user changes ───────────────────────
  useEffect(() => {
    if (!consent?.analytics) return
    if (!(posthog as any).__loaded) return
    if (sessionUser) {
      identifyCurrent(sessionUser)
    } else {
      // User logged out (or never logged in) — clear PostHog's distinct_id so
      // the next user doesn't inherit the previous one's identity.
      posthog.reset()
    }
  }, [sessionUser, consent?.analytics])

  // ── Track route changes (App Router) ─────────────────────────────────────
  useEffect(() => {
    if (!pathname) return
    if (!consent?.analytics) return
    if (!(posthog as any).__loaded) return
    posthog.capture('$pageview')
  }, [pathname, consent?.analytics])

  return null
}

/**
 * Call posthog.identify() with sensible defaults.
 * Safe to call multiple times — PostHog dedupes on (distinct_id, properties).
 */
function identifyCurrent(user: SessionUser | null) {
  if (!user) return
  if (!(posthog as any).__loaded) return
  posthog.identify(user.id, {
    email: user.email ?? undefined,
    role: user.role ?? undefined,
    full_name: user.full_name ?? undefined,
  })
}
