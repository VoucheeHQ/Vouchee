import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Become a Vouchee Cleaner — Cleaning Jobs in Horsham',
  description: 'Join Vouchee and find regular local cleaning work in Horsham. Set your own rate, pick your hours, and keep 100% of what your customers pay you — no commission, ever.',
  alternates: { canonical: '/cleaner' },
  openGraph: {
    title: 'Become a Vouchee Cleaner — Cleaning Jobs in Horsham',
    description: 'Find regular local cleaning work. Set your own rate, pick your hours, keep 100% of customer pay.',
    url: '/cleaner',
  },
}

export default function CleanerFunnelLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
