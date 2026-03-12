import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'sonner'
import { Header } from '@/components/layout/header'
import { createClient } from '@/lib/supabase/server'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let userRole: string | null = null
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    userRole = (profile as any)?.role ?? null
  }

  return (
    <html lang="en" className={inter.variable}>
      <body>
        <Header userRole={userRole} />
        {children}
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  )
}
