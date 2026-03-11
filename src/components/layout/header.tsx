'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const pathname = usePathname()

  useEffect(() => {
    const supabase = createClient()

    const loadUser = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        console.log('[Header] session:', session?.user?.id, 'error:', sessionError)

        if (!session?.user) {
          setUserRole(null)
          setLoading(false)
          return
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single()

        console.log('[Header] profile:', profile, 'error:', profileError)
        setUserRole(profile?.role ?? null)
      } catch (e) {
        console.error('[Header] error:', e)
        setUserRole(null)
      } finally {
        setLoading(false)
      }
    }

    loadUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log('[Header] auth change event, user:', session?.user?.id)
      if (!session?.user) {
        setUserRole(null)
        setLoading(false)
        return
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()
      setUserRole(profile?.role ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const dashboardHref = userRole === 'cleaner'
    ? '/cleaner/dashboard'
    : '/customer/dashboard'

  const navigation = [
    { name: 'How it works', href: '/how-it-works' },
    { name: 'Pricing', href: '/pricing' },
    { name: 'For cleaners', href: '/cleaner' },
    { name: 'FAQ', href: '/faq' },
    { name: 'View active requests', href: '/jobs' },
  ]

  return (
    <header className="sticky top-0 z-50 w-full border-b border-ink/5 bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/60">
      <nav className="container flex h-16 items-center justify-between">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
            <span className="text-lg font-bold text-white">V</span>
          </div>
          <span className="text-lg font-semibold text-ink">Vouchee</span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden items-center gap-6 md:flex">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'text-sm font-medium transition-colors hover:text-brand-600',
                pathname === item.href ? 'text-brand-600' : 'text-ink-secondary'
              )}
            >
              {item.name}
            </Link>
          ))}
        </div>

        {/* Desktop Auth */}
        <div className="hidden items-center gap-4 md:flex">
          {loading ? (
            // Placeholder to prevent layout shift while loading
            <div className="h-9 w-28 rounded-md bg-ink/5 animate-pulse" />
          ) : userRole ? (
            <Link
              href={dashboardHref}
              className="text-sm font-medium bg-brand-600 text-white px-4 py-2 rounded-md hover:bg-brand-700 transition-colors"
            >
              My dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className="text-sm font-medium text-ink-secondary hover:text-brand-600 transition-colors">
                Log in
              </Link>
              <Link href="/request/property" className="text-sm font-medium bg-brand-600 text-white px-4 py-2 rounded-md hover:bg-brand-700 transition-colors">
                Get started
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button type="button" className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? <X className="h-6 w-6 text-ink" /> : <Menu className="h-6 w-6 text-ink" />}
        </button>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="border-t border-ink/5 bg-surface md:hidden">
          <div className="container space-y-1 py-4">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'block rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  pathname === item.href ? 'bg-brand-50 text-brand-600' : 'text-ink-secondary hover:bg-surface-secondary hover:text-ink'
                )}
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}
            <div className="!mt-4 flex flex-col gap-2 border-t border-ink/5 pt-4">
              {loading ? (
                <div className="h-9 rounded-md bg-ink/5 animate-pulse" />
              ) : userRole ? (
                <Link
                  href={dashboardHref}
                  className="block rounded-lg px-3 py-2 text-sm font-medium bg-brand-600 text-white text-center"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  My dashboard
                </Link>
              ) : (
                <>
                  <Link href="/login" className="block rounded-lg px-3 py-2 text-sm font-medium text-ink-secondary hover:bg-surface-secondary" onClick={() => setMobileMenuOpen(false)}>
                    Log in
                  </Link>
                  <Link href="/request/property" className="block rounded-lg px-3 py-2 text-sm font-medium bg-brand-600 text-white text-center" onClick={() => setMobileMenuOpen(false)}>
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
