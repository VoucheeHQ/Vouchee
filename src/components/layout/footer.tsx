import Link from 'next/link'
import VoucheeLogoText from '@/assets/vouchee-logo-text.svg'

export function Footer() {
  const currentYear = new Date().getFullYear()

  const footerLinks = {
    Product: [
      { name: 'How it works', href: '/how-it-works' },
      { name: 'Pricing', href: '/pricing' },
      { name: 'For cleaners', href: '/cleaner/apply' },
      { name: 'FAQ', href: '/faq' },
    ],
    Legal: [
      { name: 'Privacy Policy', href: '/legal/privacy' },
      { name: 'Terms of Service', href: '/legal/terms' },
      { name: 'Cookie Policy', href: '/legal/cookies' },
    ],
  }

  const contactLinks = [
    { label: 'General enquiries', email: 'hello@vouchee.co.uk' },
    { label: 'Customer support', email: 'support@vouchee.co.uk' },
    { label: 'Cleaner applications', email: 'cleaners@vouchee.co.uk' },
    { label: 'Legal', email: 'legal@vouchee.co.uk' },
  ]

  return (
    <footer className="border-t border-ink/5 bg-surface-secondary">
      <div className="container py-12 md:py-16">
        <div className="grid gap-8 md:grid-cols-4">
          {/* Brand */}
          <div>
            <Link href="/" className="mb-4 inline-block">
              <VoucheeLogoText width={120} height={30} />
            </Link>
            <p className="text-sm text-ink-secondary">
              Connecting trusted local cleaners with customers in Horsham and surrounding areas.
            </p>
          </div>

          {/* Product & Legal links */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h3 className="mb-4 text-sm font-semibold text-ink">{category}</h3>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="text-sm text-ink-secondary transition-colors hover:text-brand-600"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Contact */}
          <div>
            <h3 className="mb-4 text-sm font-semibold text-ink">Contact</h3>
            <ul className="space-y-3">
              {contactLinks.map(({ label, email }) => (
                <li key={email}>
                  <span className="block text-xs text-ink-secondary mb-0.5">{label}</span>
                  <a
                    href={`mailto:${email}`}
                    className="text-sm text-ink-secondary transition-colors hover:text-brand-600"
                  >
                    {email}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-ink/5 pt-8">
          <p className="text-center text-sm text-ink-secondary">
            © {currentYear} Vouchee. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
