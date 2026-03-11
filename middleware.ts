import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  // First, refresh the session as before
  const response = await updateSession(request)

  const { pathname } = request.nextUrl

  // Only enforce role rules on protected paths
  const isCleanerPath = pathname.startsWith('/cleaner/dashboard')
  const isCustomerPath = pathname.startsWith('/customer/dashboard')

  if (isCleanerPath || isCustomerPath) {
    // Read the session from cookies
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll() },
          setAll() {},
        },
      }
    )

    const { data: { session } } = await supabase.auth.getSession()

    // Not logged in — send to login
    if (!session?.user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Get their role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()

    const role = (profile as any)?.role

    // Cleaner trying to access customer dashboard
    if (isCustomerPath && role === 'cleaner') {
      return NextResponse.redirect(new URL('/cleaner/dashboard', request.url))
    }

    // Customer trying to access cleaner dashboard
    if (isCleanerPath && role === 'customer') {
      return NextResponse.redirect(new URL('/customer/dashboard', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}