import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Going Solo as a Cleaner — Find Your First Customers',
  description: 'Leaving an agency or company to go self-employed? Vouchee helps Horsham cleaners build a steady book of regular, local customers — keep 100% of what you earn.',
  alternates: { canonical: '/cleaner/going-solo' },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
