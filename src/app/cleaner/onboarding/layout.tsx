import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Apply to Join Vouchee | Cleaning Jobs in Horsham',
  description: 'Apply to join Vouchee and connect with reliable customers in Horsham who need regular cleaning. Set your own rate, choose your hours, work on your terms.',
}

export default function CleanerOnboardingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
