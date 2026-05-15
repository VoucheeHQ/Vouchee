import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'New to Cleaning? Start with Vouchee in Horsham',
  description: 'Thinking about becoming a self-employed cleaner in Horsham? Vouchee walks you through what you\'ll need — insurance, DBS check, and your first customers.',
  alternates: { canonical: '/cleaner/new-to-cleaning' },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
