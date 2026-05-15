import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Cleaning Prices in Horsham — Transparent Service Fees',
  description: 'Simple, transparent pricing for cleaning in Horsham. £9.99 per weekly clean, £14.99 fortnightly, £24.99 monthly. No commission, no booking fees — you pay your cleaner directly.',
  alternates: { canonical: '/pricing' },
  openGraph: {
    title: 'Cleaning Prices in Horsham — Transparent Service Fees',
    description: 'Simple, transparent pricing for cleaning in Horsham. £9.99 per weekly clean, £14.99 fortnightly, £24.99 monthly.',
    url: '/pricing',
    images: ['/og-image.jpg'],
  },
}

const tiers = [
  {
    frequency: 'Weekly',
    perClean: '£9.99',
    monthly: '£39.96',
    monthlyNote: '(£9.99 × 4)',
    description: 'For homes that need regular upkeep',
    highlight: true,
  },
  {
    frequency: 'Fortnightly',
    perClean: '£14.99',
    monthly: '£29.98',
    monthlyNote: '(£14.99 × 2)',
    description: 'The most popular choice',
    highlight: false,
  },
  {
    frequency: 'Monthly',
    perClean: '£24.99',
    monthly: '£24.99',
    monthlyNote: '',
    description: 'For a regular reset',
    highlight: false,
  },
]

const pricingJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  serviceType: 'House cleaning service',
  provider: {
    '@type': 'LocalBusiness',
    name: 'Vouchee',
    url: 'https://www.vouchee.co.uk',
  },
  areaServed: { '@type': 'City', name: 'Horsham' },
  offers: [
    {
      '@type': 'Offer',
      name: 'Weekly cleaning — service fee',
      price: '9.99',
      priceCurrency: 'GBP',
      description: 'Vouchee service fee per weekly clean. You pay your cleaner directly.',
    },
    {
      '@type': 'Offer',
      name: 'Fortnightly cleaning — service fee',
      price: '14.99',
      priceCurrency: 'GBP',
      description: 'Vouchee service fee per fortnightly clean. You pay your cleaner directly.',
    },
    {
      '@type': 'Offer',
      name: 'Monthly cleaning — service fee',
      price: '24.99',
      priceCurrency: 'GBP',
      description: 'Vouchee service fee per monthly clean. You pay your cleaner directly.',
    },
  ],
}

export default function PricingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pricingJsonLd) }}
      />

      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)', borderBottom: '1px solid #e2e8f0', padding: '64px 24px 56px', textAlign: 'center', fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ maxWidth: '640px', margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '100px', padding: '6px 16px', fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '24px' }}>
            <span>💰</span> Simple, transparent pricing
          </div>
          <h1 style={{ fontSize: 'clamp(28px, 5vw, 48px)', fontWeight: 800, color: '#0f172a', margin: '0 0 16px', letterSpacing: '-0.4px', lineHeight: 1.15 }}>
            Cleaning prices in Horsham
          </h1>
          <p style={{ fontSize: '17px', color: '#64748b', margin: '0', lineHeight: 1.7, maxWidth: '520px', marginLeft: 'auto', marginRight: 'auto' }}>
            One small service fee. No commission on your cleaner's pay, no booking fees, no surprises.
          </p>
        </div>
      </div>

      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '64px 24px 80px', fontFamily: "'DM Sans', sans-serif" }}>

        {/* Pricing tiers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', marginBottom: '56px' }}>
          {tiers.map((tier) => (
            <div
              key={tier.frequency}
              style={{
                background: 'white',
                border: tier.highlight ? '2px solid #2563eb' : '1.5px solid #e2e8f0',
                borderRadius: '20px',
                padding: '32px 28px',
                textAlign: 'center',
                boxShadow: tier.highlight ? '0 8px 24px rgba(37,99,235,0.12)' : '0 2px 12px rgba(0,0,0,0.05)',
                position: 'relative',
              }}
            >
              {tier.highlight && (
                <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', background: '#2563eb', color: 'white', fontSize: '11px', fontWeight: 700, padding: '4px 12px', borderRadius: '100px', letterSpacing: '0.3px', textTransform: 'uppercase' }}>
                  Best value
                </div>
              )}
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#475569', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{tier.frequency}</div>
              <div style={{ fontSize: '44px', fontWeight: 800, color: '#0f172a', letterSpacing: '-1px', lineHeight: 1 }}>{tier.perClean}</div>
              <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '6px', marginBottom: '20px' }}>per clean</div>
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '16px', marginBottom: '20px' }}>
                <div style={{ fontSize: '14px', color: '#64748b' }}>
                  <strong style={{ color: '#0f172a' }}>{tier.monthly}/month</strong> {tier.monthlyNote && <span style={{ color: '#94a3b8' }}>{tier.monthlyNote}</span>}
                </div>
              </div>
              <p style={{ fontSize: '14px', color: '#64748b', lineHeight: 1.6, margin: 0 }}>{tier.description}</p>
            </div>
          ))}
        </div>

        {/* What's included */}
        <div style={{ background: 'white', border: '1.5px solid #e2e8f0', borderRadius: '20px', padding: '36px 32px', marginBottom: '32px', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: '0 0 20px', letterSpacing: '-0.2px' }}>What your service fee covers</h2>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
            {[
              'Cleaner vetting: DBS check, right to work, insurance',
              'Direct chat with your cleaner before you commit',
              'Switch cleaner anytime, no questions asked',
              'Verified reviews from real customers only',
              'Cover cleans if your regular cleaner is away',
              'UK-based support by email and chat',
            ].map((item) => (
              <li key={item} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', fontSize: '14px', color: '#334155', lineHeight: 1.55 }}>
                <span style={{ color: '#16a34a', fontWeight: 700, flexShrink: 0 }}>✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Cleaner pay note */}
        <div style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: '16px', padding: '24px 28px', marginBottom: '48px', display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '24px', flexShrink: 0 }}>💷</span>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#1e3a8a', marginBottom: '6px' }}>You pay your cleaner directly</div>
            <div style={{ fontSize: '14px', color: '#1e40af', lineHeight: 1.65 }}>
              Vouchee never takes a cut of what you pay your cleaner. You agree the hourly rate together (typically £15–£20/hr in Horsham), and pay them by cash or bank transfer however you arrange it.
            </div>
          </div>
        </div>

        {/* CTAs */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={{ background: 'white', border: '1.5px solid #e2e8f0', borderRadius: '20px', padding: '32px 28px', textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>🏠</div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>Ready to start?</h3>
            <p style={{ fontSize: '14px', color: '#64748b', lineHeight: 1.6, margin: '0 0 20px' }}>Post a request in under 4 minutes — pay nothing until you accept a cleaner.</p>
            <Link href="/request/property" style={{ display: 'inline-block', background: '#2563eb', color: 'white', borderRadius: '10px', padding: '12px 24px', fontSize: '14px', fontWeight: 700, textDecoration: 'none' }}>
              Post a request →
            </Link>
          </div>
          <div style={{ background: 'white', border: '1.5px solid #e2e8f0', borderRadius: '20px', padding: '32px 28px', textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>❓</div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>Got questions?</h3>
            <p style={{ fontSize: '14px', color: '#64748b', lineHeight: 1.6, margin: '0 0 20px' }}>See common questions about how Vouchee works, pricing, and the vetting process.</p>
            <Link href="/faq" style={{ display: 'inline-block', background: '#0f172a', color: 'white', borderRadius: '10px', padding: '12px 24px', fontSize: '14px', fontWeight: 700, textDecoration: 'none' }}>
              Read FAQ →
            </Link>
          </div>
        </div>

      </div>
    </>
  )
}
