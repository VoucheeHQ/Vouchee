import HomePageContent from '@/components/HomePageContent'

export const metadata = {
  title: {
    absolute: 'Vouchee, Vetted Local Cleaners in Horsham, West Sussex',
  },
  description: 'Hire a vetted, DBS-checked, insured local cleaner in Horsham. Real reviews, fixed monthly fee, no commission. Weekly, fortnightly, monthly or one-off cleans.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Vouchee, Vetted Local Cleaners in Horsham, West Sussex',
    description: 'Hire a vetted, DBS-checked, insured local cleaner in Horsham. Real reviews, fixed monthly fee, no commission.',
    url: '/',
    images: ['/og-image.jpg'],
  },
}

export default function HomePage() {
  return <HomePageContent location="Horsham" />
}
