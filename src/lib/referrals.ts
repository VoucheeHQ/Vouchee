import { trackEvent } from '@/lib/analytics'

// Client-side helpers for the customer referral scheme.
//
// The flow:
//   1. ReferralCapture component drops "vouchee_ref" cookie on landing with ?ref=
//   2. After a customer row is created in the signup wizard, attachReferralIfAny()
//      reads the cookie and POSTs to /api/referral/attach (service-role insert).
//   3. The daily /api/cron/referral-credits applies the credit once both
//      cooling-off and start_date + 24h have elapsed.

const COOKIE_NAME = 'vouchee_ref'
const TOKEN_RE = /^[0-9a-f]{10}$/

export function readReferralCookie(): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.split('; ').find(c => c.startsWith(`${COOKIE_NAME}=`))
  if (!match) return null
  try {
    const value = decodeURIComponent(match.slice(COOKIE_NAME.length + 1)).trim().toLowerCase()
    return TOKEN_RE.test(value) ? value : null
  } catch {
    return null
  }
}

export function clearReferralCookie() {
  if (typeof document === 'undefined') return
  document.cookie = `${COOKIE_NAME}=; Max-Age=0; Path=/; SameSite=Lax`
}

// Best-effort referral attachment. If anything fails (network, server,
// bad token), signup continues silently — a missed referral is preferable
// to a failed signup.
export async function attachReferralIfAny(): Promise<{ attached: boolean; reason?: string }> {
  const token = readReferralCookie()
  if (!token) return { attached: false, reason: 'no_cookie' }
  try {
    const res = await fetch('/api/referral/attach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
      credentials: 'include',
    })
    const json = await res.json().catch(() => ({})) as { attached?: boolean; reason?: string }
    if (json.attached) {
      clearReferralCookie()
      trackEvent('signup_with_ref', { token })
    }
    return { attached: !!json.attached, reason: json.reason }
  } catch (e) {
    return { attached: false, reason: 'network' }
  }
}
