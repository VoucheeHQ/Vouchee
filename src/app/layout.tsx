import type { Metadata } from 'next'
import { DM_Sans } from 'next/font/google'
import './globals.css'
import { Toaster } from 'sonner'
import { AuthListener } from '@/components/auth-listener'
import { ChatWidget } from '@/components/chat-widget'
import { CookieBanner } from '@/components/cookie-banner'
import { PostHogProvider } from '@/components/posthog-provider'
import { ReferralCapture } from '@/components/referral-capture'

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL('https://www.vouchee.co.uk'),
  title: {
    default: 'Vouchee — Vetted Local Cleaners in Horsham',
    template: '%s | Vouchee',
  },
  description: 'Find trusted local cleaners in Horsham and surrounding areas. Weekly, fortnightly, or monthly cleaning services tailored to your needs.',
  keywords: ['cleaning service', 'local cleaners', 'Horsham cleaners', 'house cleaning', 'domestic cleaning'],
  authors: [{ name: 'Vouchee' }],
  creator: 'Vouchee',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_GB',
    url: 'https://www.vouchee.co.uk',
    title: 'Vouchee — Vetted Local Cleaners in Horsham',
    description: 'Find trusted local cleaners in Horsham and surrounding areas.',
    siteName: 'Vouchee',
    images: [
      {
        url: '/full-logo-black.png',
        width: 1200,
        height: 630,
        alt: 'Vouchee',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Vouchee — Vetted Local Cleaners in Horsham',
    description: 'Find trusted local cleaners in Horsham and surrounding areas.',
    images: ['/full-logo-black.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: '/favicon.svg',
  },
}

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  '@id': 'https://www.vouchee.co.uk/#business',
  name: 'Vouchee',
  url: 'https://www.vouchee.co.uk',
  logo: 'https://www.vouchee.co.uk/full-logo-black.png',
  image: 'https://www.vouchee.co.uk/full-logo-black.png',
  description: 'Vouchee connects homeowners in Horsham with vetted, DBS-checked, insured local cleaners for weekly, fortnightly, or monthly cleans.',
  email: 'support@vouchee.co.uk',
  areaServed: [
    { '@type': 'City', name: 'Horsham' },
    { '@type': 'Place', name: 'Broadbridge Heath' },
    { '@type': 'Place', name: 'Southwater' },
    { '@type': 'Place', name: 'Roffey' },
    { '@type': 'Place', name: 'Mannings Heath' },
    { '@type': 'Place', name: 'Warnham' },
    { '@type': 'Place', name: "Christ's Hospital" },
    { '@type': 'Place', name: 'Kilnwood Vale' },
  ],
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Horsham',
    addressRegion: 'West Sussex',
    addressCountry: 'GB',
  },
  priceRange: '££',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={dmSans.variable}>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <AuthListener />
        <PostHogProvider />
        <ReferralCapture />
        {children}
        <ChatWidget />
        <CookieBanner />
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  )
}
