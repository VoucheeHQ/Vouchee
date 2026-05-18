import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: { absolute: 'Become a cleaner — Vouchee' },
  description: 'Earn more cleaning in Horsham. Set your own rates, no agency fees, real customers in your area. Apply free.',
  alternates: { canonical: '/cleaner' },
  openGraph: {
    title: 'Become a cleaner — Vouchee',
    description: 'Earn more cleaning in Horsham. Set your own rates, no agency fees, real customers in your area. Apply free.',
    url: '/cleaner',
    images: ['/og-image.jpg'],
  },
}

export default function CleanerFunnelLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
