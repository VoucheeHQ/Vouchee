import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Cleaning Jobs in Horsham, Browse Open Requests',
  description: 'Browse open cleaning jobs from homeowners in Horsham and surrounding areas. Set your own rate, choose your hours, work directly with customers. Vouchee never takes a cut of your pay.',
  alternates: { canonical: '/jobs' },
  // Pre-launch: page shows seed/marketing listings with placeholder timestamps
  // ("6d ago"). Noindex until launch on 2026-06-01 so Google doesn't index
  // stale-looking content. Remove this block when going live.
  robots: {
    index: false,
    follow: true,
  },
  openGraph: {
    title: 'Cleaning Jobs in Horsham',
    description: 'Browse open cleaning jobs from homeowners in Horsham. Set your own rate, choose your hours.',
    url: '/jobs',
    images: ['/og-image.jpg'],
  },
}

export default function JobsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
