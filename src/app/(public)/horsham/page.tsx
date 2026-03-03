import HomePageContent from '@/components/HomePageContent'

export const metadata = {
  title: 'Vouchee Horsham — Local Cleaning Services',
  description: 'Find vetted local cleaners in Horsham, RH12 & RH13. Weekly, fortnightly, or monthly cleans. DBS checked, insured, satisfaction guaranteed.',
  alternates: {
    canonical: 'https://www.vouchee.co.uk/horsham',
  },
  openGraph: {
    title: 'Vouchee Horsham — Local Cleaning Services',
    description: 'Find vetted local cleaners in Horsham. Weekly, fortnightly, or monthly cleans.',
    url: 'https://www.vouchee.co.uk/horsham',
  },
}

export default function HorshamPage() {
  return <HomePageContent location="Horsham" />
}
