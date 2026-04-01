import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function BlogLayout({
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
    <>
      <Header userRole={userRole} />
      <main>{children}</main>
      <Footer />
    </>
  )
}
