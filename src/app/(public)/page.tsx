import HomePageContent from '@/components/HomePageContent'

export const metadata = {
  title: {
    absolute: 'Vouchee — Vetted Local Cleaners in Horsham, West Sussex',
  },
  description: 'Connect with vetted, DBS-checked, insured local cleaners in Horsham and surrounding villages. Weekly, fortnightly, monthly, or one-off cleans — no commission, ever.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Vouchee — Vetted Local Cleaners in Horsham, West Sussex',
    description: 'Connect with vetted, DBS-checked, insured local cleaners in Horsham and surrounding villages. Weekly, fortnightly, monthly, or one-off cleans — no commission, ever.',
    url: '/',
  },
}

export default function HomePage() {
  return <HomePageContent location="Horsham" />
}
