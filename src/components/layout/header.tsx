'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import VoucheeLogoText from '@/assets/vouchee-logo-text.svg'

interface HeaderProps {
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

export function Header({ userRole }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const pathname = usePathname()

  const dashboardHref = userRole === 'admin' ? '/admin/dashboard' : userRole === 'cleaner' ? '/cleaner/dashboard' : '/customer/dashboard'

  // Fetch unread notification count for cleaners
  useEffect(() => {
    if (userRole !== 'cleaner') return

    let cancelled = false
    const supabase = createClient()

    const fetchCount = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: cleaner } = await supabase
        .from('cleaners')
        .select('id')
        .eq('profile_id', user.id)
        .single()
      if (!cleaner || cancelled) return

      const { count } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('cleaner_id', (cleaner as any).id)
        .eq('read', false)

      if (!cancelled && typeof count === 'number') setUnreadCount(count)
    }

    fetchCount()
    // Refresh periodically in case something changes in another tab
    const interval = setInterval(fetchCount, 60000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [userRole, pathname])

  const navigation = [
    { name: 'How it works', href: '/how-it-works' },
    { name: 'For cleaners', href: '/cleaner' },
    { name: 'FAQ', href: '/faq' },
    { name: 'Live jobs', href: '/jobs' },
    { name: 'Blog', href: '/blog' },
    { name: 'Cleaning Supplies', href: '/cleaning-supplies' },
  ]

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
          {userRole ? (
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
          {!mobileMenuOpen && userRole === 'cleaner' && <UnreadBadge count={unreadCount} />}
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
              {userRole ? (
                <Link
                  href={dashboardHref}
                  className="relative block rounded-lg px-3 py-2.5 text-base font-semibold bg-brand-600 text-white text-center"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  My dashboard
                  {userRole === 'cleaner' && unreadCount > 0 && (
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
