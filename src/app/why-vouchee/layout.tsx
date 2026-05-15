import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Why Choose Vouchee — Vetted Cleaners, No Commission',
  description: 'Why Horsham homeowners and cleaners choose Vouchee — DBS-checked and insured cleaners, no commission on cleaner pay, no booking fees, and direct relationships built on trust.',
  alternates: { canonical: '/why-vouchee' },
  openGraph: {
    title: 'Why Choose Vouchee',
    description: 'Vetted cleaners, no commission, no booking fees — Vouchee is built on trust.',
    url: '/why-vouchee',
    images: ['/og-image.jpg'],
  },
}

export default function WhyVoucheeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
