import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Request a Cleaner',
  description: 'Post a cleaning request on Vouchee — describe your home, choose a frequency, and let local vetted cleaners apply to you.',
  robots: { index: false, follow: true },
}

export default function RequestLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
