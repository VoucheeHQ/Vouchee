import HomePageContent from '@/components/HomePageContent'

export const metadata = {
  title: {
    absolute: 'Vouchee — Vetted local cleaners in Horsham, no agency fees',
  },
  description: 'Find vetted local cleaners in Horsham. Set your own price, pick your hours, no agency fees. Direct Debit through GoCardless.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Vouchee — Vetted local cleaners in Horsham, no agency fees',
    description: 'Find vetted local cleaners in Horsham. Set your own price, pick your hours, no agency fees. Direct Debit through GoCardless.',
    url: '/',
    images: ['/og-image.jpg'],
  },
}

export default function HomePage() {
  return <HomePageContent location="Horsham" />
}
