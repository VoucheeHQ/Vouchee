import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'No Website or Social Media? Get Cleaning Customers Anyway',
  description: 'You don\'t need a website, Facebook page, or marketing budget to find cleaning customers in Horsham. Vouchee gives you a profile, reviews, and direct enquiries from day one.',
  alternates: { canonical: '/cleaner/no-presence' },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
