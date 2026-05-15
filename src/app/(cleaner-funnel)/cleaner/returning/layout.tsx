import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Returning to Cleaning Work? Pick Up Local Customers',
  description: 'Coming back to cleaning after a break? Vouchee makes it easy to find local Horsham customers who fit around your schedule — without rebuilding your client list from scratch.',
  alternates: { canonical: '/cleaner/returning' },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
