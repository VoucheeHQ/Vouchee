'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import VoucheeLogoText from '@/assets/vouchee-logo-text.svg'

interface HeaderProps {
  /**
   * Optional explicit role override.
   *
   * - Pass a string ('admin' | 'cleaner' | 'customer') when you already know the
   *   role and want to skip an auth round-trip (e.g. from a server component
   *   or a page that already fetched the profile).
   * - Pass `null` to force the logged-out state even if there's a session.
   * - Pass `undefined` (or omit) to have the Header auto-detect auth itself.
   */
  userRole?: string | null
}

function UnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null
  const display = count > 9 ? '9+' : String(count)
  return (
    <span
      aria-label={`${count} unread notifications`}
      style={{
        position: 'absolute',
        top: '-6px',
        right: '-6px',
        minWidth: '20px',
        height: '20px',
        padding: count > 9 ? '0 5px' : '0',
        borderRadius: '100px',
        background: '#ef4444',
        color: 'white',
        fontSize: '11px',
        fontWeight: 800,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 0 0 2px white',
        lineHeight: 1,
      }}
    >
      {display}
    </span>
  )
}

export function Header({ userRole: explicitRole }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  // Auth auto-detection — only runs when explicitRole is undefined (not null, not a string)
  // `null` is an explicit "force logged-out". A string is an explicit role.
  const shouldAutoDetect = explicitRole === undefined
  const [detectedRole, setDetectedRole] = useState<string | null | undefined>(
    shouldAutoDetect ? undefined : null,
  )
  // Once detection runs, this is true — prevents flashing the logged-out
  // header on pages that just haven't finished fetching yet.
  const [detectionComplete, setDetectionComplete] = useState(!shouldAutoDetect)

  // Resolved role — explicit wins, otherwise use what we detected
  const effectiveRole: string | null = shouldAutoDetect
    ? (detectedRole ?? null)
    : (explicitRole ?? null)

  const pathname = usePathname()

  const dashboardHref =
    effectiveRole === 'admin' ? '/admin/dashboard'
    : effectiveRole === 'cleaner' ? '/cleaner/dashboard'
    : '/customer/dashboard'

  // ─── Auto-detect auth if no explicit role was passed ────────────────────
  useEffect(() => {
    if (!shouldAutoDetect) return
    let cancelled = false
    const supabase = createClient()

    const detect = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (cancelled) return
        if (!user) {
          setDetectedRole(null)
          setDetectionComplete(true)
          return
        }
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()
        if (cancelled) return
        setDetectedRole(((profile as any)?.role as string) ?? null)
        setDetectionComplete(true)
      } catch {
        if (!cancelled) {
          setDetectedRole(null)
          setDetectionComplete(true)
        }
      }
    }

    detect()

    // Re-detect on auth state changes (login/logout in another tab)
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      detect()
    })

    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [shouldAutoDetect, pathname])

  // ─── Unread notifications (cleaner + customer) ─────────────────────────
  // Both roles get badged. The notifications table has cleaner_id OR
  // customer_id set (never both); we look up the right ID and filter
  // accordingly.
  useEffect(() => {
    if (effectiveRole !== 'cleaner' && effectiveRole !== 'customer') return
    let cancelled = false
    const supabase = createClient()

    const fetchCount = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      let query
      if (effectiveRole === 'cleaner') {
        const { data: cleaner } = await supabase
          .from('cleaners')
          .select('id')
          .eq('profile_id', user.id)
          .single()
        if (!cleaner || cancelled) return
        query = supabase
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('cleaner_id', (cleaner as any).id)
          .eq('read', false)
      } else {
        const { data: customer } = await supabase
          .from('customers')
          .select('id')
          .eq('profile_id', user.id)
          .single()
        if (!customer || cancelled) return
        query = supabase
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('customer_id', (customer as any).id)
          .eq('read', false)
      }

      const { count } = await query
      if (!cancelled && typeof count === 'number') setUnreadCount(count)
    }

    fetchCount()
    const interval = setInterval(fetchCount, 60000)

    return () => { cancelled = true; clearInterval(interval) }
  }, [effectiveRole, pathname])

  const navigation = [
    { name: 'How it works', href: '/how-it-works' },
    { name: 'For cleaners', href: '/cleaner' },
    { name: 'FAQ', href: '/faq' },
    { name: 'Live jobs', href: '/jobs' },
    { name: 'Blog', href: '/blog' },
    { name: 'Cleaning Supplies', href: '/cleaning-supplies' },
  ]

  // While auto-detection is still running on a page that relies on it, render
  // the nav without the auth buttons (rather than flashing the logged-out
  // state and then swapping to logged-in). Pages passing explicit role skip
  // this entirely — they render instantly.
  const authSlotReady = detectionComplete

  return (
    <header className="sticky top-0 z-50 w-full border-b border-ink/5 bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/60">
      <nav className="max-w-screen-2xl mx-auto px-6 flex h-20 items-center justify-between w-full">
        <Link href="/" className="flex items-center flex-shrink-0" aria-label="Vouchee home">
          <VoucheeLogoText style={{ height: '36px', width: '140px', display: 'block', overflow: 'visible' }} />
        </Link>

        <div className="hidden items-center gap-2 lg:flex">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'text-base font-medium transition-colors hover:text-brand-600 whitespace-nowrap px-2 py-1',
                pathname === item.href ? 'text-brand-600' : 'text-ink-secondary'
              )}
            >
              {item.name}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-3 lg:flex flex-shrink-0">
          {!authSlotReady ? (
            // Auth is still being auto-detected — render a placeholder of the same
            // width so layout doesn't shift when the real button appears
            <div style={{ width: '150px', height: '44px' }} aria-hidden="true" />
          ) : effectiveRole ? (
            <Link
              href={dashboardHref}
              className="relative text-base font-semibold bg-brand-600 text-white px-5 py-2.5 rounded-lg hover:bg-brand-700 transition-colors whitespace-nowrap"
            >
              My dashboard
              <UnreadBadge count={unreadCount} />
            </Link>
          ) : (
            <>
              <Link href="/login" className="text-base font-medium text-ink-secondary hover:text-brand-600 transition-colors whitespace-nowrap">
                Log in
              </Link>
              <Link href="/request/property" className="text-base font-semibold bg-brand-600 text-white px-5 py-2.5 rounded-lg hover:bg-brand-700 transition-colors whitespace-nowrap">
                Get started
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="lg:hidden p-2 rounded-md text-ink-secondary hover:text-ink transition-colors relative"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          {!mobileMenuOpen && (effectiveRole === 'cleaner' || effectiveRole === 'customer') && <UnreadBadge count={unreadCount} />}
        </button>
      </nav>

      {mobileMenuOpen && (
        <div className="border-t border-ink/5 bg-surface lg:hidden">
          <div className="max-w-screen-2xl mx-auto px-6 space-y-1 py-4 w-full">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'block rounded-lg px-3 py-2.5 text-base font-medium transition-colors',
                  pathname === item.href ? 'bg-brand-50 text-brand-600' : 'text-ink-secondary hover:bg-surface-secondary hover:text-ink'
                )}
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}

            <div className="mt-4 flex flex-col gap-2 border-t border-ink/5 pt-4">
              {!authSlotReady ? (
                <div style={{ height: '44px' }} aria-hidden="true" />
              ) : effectiveRole ? (
                <Link
                  href={dashboardHref}
                  className="relative block rounded-lg px-3 py-2.5 text-base font-semibold bg-brand-600 text-white text-center"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  My dashboard
                  {(effectiveRole === 'cleaner' || effectiveRole === 'customer') && unreadCount > 0 && (
                    <span className="ml-2 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-xs font-bold">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Link>
              ) : (
                <>
                  <Link href="/login" className="block rounded-lg px-3 py-2.5 text-base font-medium text-ink-secondary hover:bg-surface-secondary" onClick={() => setMobileMenuOpen(false)}>
                    Log in
                  </Link>
                  <Link href="/request/property" className="block rounded-lg px-3 py-2.5 text-base font-semibold bg-brand-600 text-white text-center" onClick={() => setMobileMenuOpen(false)}>
                    Get started
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
