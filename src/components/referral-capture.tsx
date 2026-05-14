'use client'

import { useEffect } from 'react'

// Mounted in root layout. First-touch attribution: when a visitor lands
// with ?ref=TOKEN in the URL, we store it for 30 days. If they already
// have a stored token, we DON'T overwrite — the first link they clicked
// gets credit. We also tolerate ?ref appearing on any page (not just /)
// so the referrer can paste the link with any path.

const COOKIE_NAME = 'vouchee_ref'
const COOKIE_MAX_AGE_DAYS = 30
const TOKEN_RE = /^[0-9a-f]{10}$/

function setRefCookie(token: string) {
  const maxAge = COOKIE_MAX_AGE_DAYS * 24 * 60 * 60
  // SameSite=Lax so the cookie survives the signup wizard's navigations,
  // but isn't shipped on third-party requests. Secure in prod only — local
  // dev runs on http.
  const secure = typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(token)}; Max-Age=${maxAge}; Path=/; SameSite=Lax${secure}`
}

function readRefCookie(): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.split('; ').find(c => c.startsWith(`${COOKIE_NAME}=`))
  if (!match) return null
  try {
    return decodeURIComponent(match.slice(COOKIE_NAME.length + 1))
  } catch {
    return null
  }
}

export function ReferralCapture() {
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const raw = params.get('ref')
      if (!raw) return
      const token = raw.trim().toLowerCase()
      if (!TOKEN_RE.test(token)) return
      // First-touch wins — don't overwrite an existing cookie.
      if (readRefCookie()) return
      setRefCookie(token)
    } catch (e) {
      // Don't break the page if URL parsing fails for any reason.
    }
  }, [])
  return null
}
