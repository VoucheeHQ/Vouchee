'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [checked, setChecked] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session)
      setChecked(true)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session)
    })
    return () => subscription.unsubscribe()
  }, [])

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

        {/* Desktop Navigation */}
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

        {/* Desktop Auth Buttons */}
        <div className="hidden items-center gap-4 md:flex">
          {checked && (
            isLoggedIn ? (
              <Link
                href="/dashboard"
                className="text-sm font-medium bg-brand-600 text-white px-4 py-2 rounded-md hover:bg-brand-700 transition-colors"
              >
                My dashboard
              </Link>
            ) : (
              <>
                <Link href="/auth/login" className="text-sm font-medium text-ink-secondary hover:text-brand-600 transition-colors">
                  Log in
                </Link>
                <Link href="/auth/signup" className="text-sm font-medium bg-brand-600 text-white px-4 py-2 rounded-md hover:bg-brand-700 transition-colors">
                  Sign up
                </Link>
              </>
            )
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          type="button"
          className="md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? (
            <X className="h-6 w-6 text-ink" />
          ) : (
            <Menu className="h-6 w-6 text-ink" />
          )}
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
                  pathname === item.href
                    ? 'bg-brand-50 text-brand-600'
                    : 'text-ink-secondary hover:bg-surface-secondary hover:text-ink'
                )}
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}
            <div className="!mt-4 flex flex-col gap-2 border-t border-ink/5 pt-4">
              {checked && (
                isLoggedIn ? (
                  <Link
                    href="/dashboard"
                    className="block rounded-lg px-3 py-2 text-sm font-medium bg-brand-600 text-white text-center"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    My dashboard
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/auth/login"
                      className="block rounded-lg px-3 py-2 text-sm font-medium text-ink-secondary hover:bg-surface-secondary"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Log in
                    </Link>
                    <Link
                      href="/auth/signup"
                      className="block rounded-lg px-3 py-2 text-sm font-medium bg-brand-600 text-white text-center"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Sign up
                    </Link>
                  </>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
