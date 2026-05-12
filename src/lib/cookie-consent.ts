// Cookie consent storage and helpers.
//
// Vouchee uses two consent categories:
//   - essential: always true, cannot be disabled. Auth, session, payment-flow.
//   - analytics: opt-in only. Currently gates PostHog (once installed).
//
// Stored in localStorage under 'vouchee_cookie_consent_v1' — bump the suffix
// if the consent shape changes meaningfully and you need to re-prompt
// existing users.
//
// Expiry: per ICO guidance, re-prompt after 12 months. The banner shows
// again automatically once a stored consent record is older than that.

export const CONSENT_STORAGE_KEY = 'vouchee_cookie_consent_v1'
export const CONSENT_TTL_MS = 365 * 24 * 60 * 60 * 1000 // 12 months

export type CookieConsent = {
  version: 1
  timestamp: string // ISO of when consent was recorded
  essential: true   // typed as `true` literal — never false
  analytics: boolean
}

/** Read consent from localStorage. Returns null if missing/invalid/expired. */
export function readConsent(): CookieConsent | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(CONSENT_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CookieConsent
    if (parsed.version !== 1) return null
    if (!parsed.timestamp) return null
    const age = Date.now() - new Date(parsed.timestamp).getTime()
    if (age > CONSENT_TTL_MS) return null
    return parsed
  } catch {
    return null
  }
}

/** Persist consent and fire an event so listeners (e.g. PostHog provider) react. */
export function writeConsent(consent: Omit<CookieConsent, 'timestamp'>): CookieConsent {
  const record: CookieConsent = {
    ...consent,
    timestamp: new Date().toISOString(),
  }
  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(record))
    // Custom event so listeners in the same tab can react.
    // (storage events don't fire in the originating tab for own-tab changes.)
    window.dispatchEvent(new CustomEvent('vouchee:consent-change', { detail: record }))
  } catch {
    // localStorage can throw in private browsing or when full. Best-effort.
  }
  return record
}

/** Convenience: accept all categories. */
export function acceptAll(): CookieConsent {
  return writeConsent({ version: 1, essential: true, analytics: true })
}

/** Convenience: reject all non-essential. */
export function rejectAll(): CookieConsent {
  return writeConsent({ version: 1, essential: true, analytics: false })
}

/** Trigger the banner/modal to re-open (used by the footer "Cookie preferences" link). */
export function openPreferences(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('vouchee:open-cookie-preferences'))
}