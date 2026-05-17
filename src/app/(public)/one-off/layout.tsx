import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'One-Off Cleans in Horsham: Deep Clean, End of Tenancy & Oven Cleaning',
  description: 'Book a one-off deep clean, end-of-tenancy clean or specialist oven clean in Horsham. Vetted, insured local cleaners. Get a bespoke quote in minutes.',
  alternates: { canonical: '/one-off' },
  openGraph: {
    title: 'One-Off Cleans in Horsham: Deep Clean, End of Tenancy, Oven Clean',
    description: 'Vetted, insured local cleaners for one-off jobs in Horsham. Get a quote in minutes.',
    url: '/one-off',
    images: ['/og-image.jpg'],
  },
}

export default function OneOffLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
