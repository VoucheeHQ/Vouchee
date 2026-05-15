import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Established Cleaner — Add New Customers in Horsham',
  description: 'Already running your own cleaning round? Vouchee helps experienced Horsham cleaners fill gaps in their schedule with vetted, paying customers — no commission, ever.',
  alternates: { canonical: '/cleaner/established' },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
