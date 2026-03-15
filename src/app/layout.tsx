import type { Metadata } from 'next'
import { Inter, Lora, DM_Sans } from 'next/font/google'
import './globals.css'
import { Toaster } from 'sonner'
import { AuthListener } from '@/components/auth-listener'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

const lora = Lora({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-lora',
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-dm-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Vouchee - Connect with Local Cleaners',
    template: '%s | Vouchee',
  },
  description: 'Find trusted local cleaners in Horsham and surrounding areas. Weekly, fortnightly, or monthly cleaning services tailored to your needs.',
  keywords: ['cleaning service', 'local cleaners', 'Horsham cleaners', 'house cleaning', 'domestic cleaning'],
  authors: [{ name: 'Vouchee' }],
  creator: 'Vouchee',
  openGraph: {
    type: 'website',
    locale: 'en_GB',
    url: 'https://vouchee.com',
    title: 'Vouchee - Connect with Local Cleaners',
    description: 'Find trusted local cleaners in Horsham and surrounding areas.',
    siteName: 'Vouchee',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Vouchee - Connect with Local Cleaners',
    description: 'Find trusted local cleaners in Horsham and surrounding areas.',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${lora.variable} ${dmSans.variable}`}>
      <body>
        <AuthListener />
        {children}
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  )
}
