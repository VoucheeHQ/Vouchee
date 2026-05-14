// Thin PostHog wrapper — safe to call before consent is granted (posthog-js
// no-ops when not loaded). Use this everywhere outside the PostHogProvider
// component so call sites don't have to worry about init order.

import posthog from 'posthog-js'

export function trackEvent(name: string, props?: Record<string, any>) {
  if (typeof window === 'undefined') return
  if (!(posthog as any).__loaded) return
  try {
    posthog.capture(name, props)
  } catch (e) {
    // Analytics must never fail the app.
  }
}
