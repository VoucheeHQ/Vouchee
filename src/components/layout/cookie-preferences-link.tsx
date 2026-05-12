'use client'

import { openPreferences } from '@/lib/cookie-consent'

/**
 * Footer link that re-opens the cookie preferences modal.
 * Styled to match the existing footer Legal links (className passed in).
 */
export function CookiePreferencesLink({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={openPreferences}
      className={className}
      style={{
        background: 'transparent',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        font: 'inherit',
        textAlign: 'left',
      }}
    >
      Cookie preferences
    </button>
  )
}
