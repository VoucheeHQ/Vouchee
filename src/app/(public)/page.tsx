import HomePageContent from '@/components/HomePageContent'

export const metadata = {
  title: {
    absolute: 'Vouchee — Vetted Local Cleaners in Horsham',
  },
  description: 'Connect with vetted, local cleaners in Horsham for weekly, fortnightly, or monthly services. DBS checked, insured, and satisfaction guaranteed.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Vouchee — Vetted Local Cleaners in Horsham',
    description: 'Connect with vetted, local cleaners in Horsham for weekly, fortnightly, or monthly services.',
    url: '/',
  },
}

export default function HomePage() {
  return <HomePageContent location="Horsham" />
}
