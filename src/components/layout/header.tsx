'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import VoucheeLogoText from '@/assets/vouchee-logo-text.svg'

interface HeaderProps {
  userRole?: string | null
}

export function Header({ userRole }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()

  const dashboardHref =
    userRole === 'admin'   ? '/admin/dashboard' :
    userRole === 'cleaner' ? '/cleaner/dashboard' :
    '/customer/dashboard'

  const navigation = [
    { name: 'How it works',      href: '/how-it-works' },
    { name: 'For cleaners',      href: '/cleaner' },
    { name: 'FAQ',               href: '/faq' },
    { name: 'Live jobs',         href: '/jobs' },
    { name: 'Blog',              href: '/blog' },
    { name: 'Cleaning Supplies', href: '/cleaning-supplies' },
  ]

  return (
    <header className="sticky top-0 z-50 w-full border-b border-ink/5 bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/60">
      <nav className="container flex h-16 items-center justify-between">

        {/* Logo */}
        <Link href="/" className="flex items-center flex-shrink-0" aria-label="Vouchee home">
          <VoucheeLogoText width={120} height={30} />
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden items-center gap-4 lg:flex">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'text-sm font-medium transition-colors hover:text-brand-600 whitespace-nowrap',
                pathname === item.href ? 'text-brand-600' : 'text-ink-secondary'
              )}
            >
              {item.name}
            </Link>
          ))}
        </div>

        {/* Desktop Auth */}
        <div className="hidden items-center gap-3 lg:flex flex-shrink-0">
          {userRole ? (
            <Link
              href={dashboardHref}
              className="text-sm font-semibold bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 transition-colors whitespace-nowrap"
            >
              My dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-medium text-ink-secondary hover:text-brand-600 transition-colors whitespace-nowrap"
              >
                Log in
              </Link>
              <Link
                href="/request/property"
                className="text-sm font-semibold bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 transition-colors whitespace-nowrap"
              >
                Get started
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          type="button"
          className="lg:hidden p-2 rounded-md text-ink-secondary hover:text-ink transition-colors"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="border-t border-ink/5 bg-surface lg:hidden">
          <div className="container space-y-1 py-4">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  pathname === item.href
                    ? 'bg-brand-50 text-brand-600'
                    : 'text-ink-secondary hover:bg-surface-secondary hover:text-ink'
                )}
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}

            {/* Mobile auth */}
            <div className="mt-4 flex flex-col gap-2 border-t border-ink/5 pt-4">
              {userRole ? (
                <Link
                  href={dashboardHref}
                  className="block rounded-lg px-3 py-2.5 text-sm font-semibold bg-brand-600 text-white text-center"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  My dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="block rounded-lg px-3 py-2.5 text-sm font-medium text-ink-secondary hover:bg-surface-secondary"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Log in
                  </Link>
                  <Link
                    href="/request/property"
                    className="block rounded-lg px-3 py-2.5 text-sm font-semibold bg-brand-600 text-white text-center"
                    onClick={() => setMobileMenuOpen(false)}
                  >
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
