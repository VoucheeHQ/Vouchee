import HomePageContent from '@/components/HomePageContent'

export const metadata = {
  title: 'Cleaners in Horsham — Vetted Local Cleaning Services',
  description: 'Find vetted local cleaners in Horsham, RH12 & RH13. Weekly, fortnightly, or monthly cleans. DBS checked, insured, satisfaction guaranteed.',
  alternates: {
    canonical: '/horsham',
  },
  openGraph: {
    title: 'Cleaners in Horsham — Vetted Local Cleaning Services',
    description: 'Find vetted local cleaners in Horsham. Weekly, fortnightly, or monthly cleans.',
    url: '/horsham',
    images: ['/og-image.jpg'],
  },
}

export default function HorshamPage() {
  return <HomePageContent location="Horsham" />
}
