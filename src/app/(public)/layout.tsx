import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { CountdownBanner } from '@/components/countdown-banner'

// Note: this layout used to be `force-dynamic` + an awaited
// supabase.auth.getUser() + profile lookup, which added ~400-800ms of
// blocking time before any HTML streamed on mobile. Header is already
// designed to auto-detect auth client-side when no explicit userRole
// is passed (see header.tsx, the `shouldAutoDetect` path), so removing
// the server-side fetch costs nothing functionally and lets every
// public page render from Vercel's edge cache instantly.

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <CountdownBanner />
      <Header />
      <main>{children}</main>
      <Footer />
    </>
  )
}
