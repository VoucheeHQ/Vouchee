import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request: { headers: request.headers } })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  // Helper: get role + suspended flag once. profiles.suspended is added later
  // in the live DB and may not be in older migrations — treat absence as
  // not-suspended rather than failing the request.
  const getProfile = async (): Promise<{ role: string | null; suspended: boolean }> => {
    if (!user) return { role: null, suspended: false }
    const { data } = await supabase.from('profiles').select('role, suspended').eq('id', user.id).single()
    const row = data as any
    return { role: row?.role ?? null, suspended: row?.suspended === true }
  }

  // Suspended-user landing page: bounces the user out with a clear signal.
  // Admin is never suspended (or shouldn't be) — admins skip this check.
  const suspendedRedirect = () => NextResponse.redirect(new URL('/login?suspended=1', request.url))

  // ── Admin routes — must be admin ──────────────────────────────────────────
  if (pathname.startsWith('/admin')) {
    if (!user) return NextResponse.redirect(new URL('/login', request.url))
    const { role } = await getProfile()
    if (role !== 'admin') return NextResponse.redirect(new URL('/login', request.url))
  }

  // ── Cleaner routes — cleaner or admin ─────────────────────────────────────
  if (pathname.startsWith('/cleaner')) {
    if (!user) return NextResponse.redirect(new URL(`/login?redirect=${pathname}`, request.url))
    const { role, suspended } = await getProfile()
    if (role !== 'cleaner' && role !== 'admin') {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    if (role === 'cleaner' && suspended) return suspendedRedirect()
  }

  // ── Customer routes — customer or admin ───────────────────────────────────
  if (pathname.startsWith('/customer')) {
    if (!user) return NextResponse.redirect(new URL(`/login?redirect=${pathname}`, request.url))
    const { role, suspended } = await getProfile()
    if (role !== 'customer' && role !== 'admin') {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    if (role === 'customer' && suspended) return suspendedRedirect()
  }

  return response
}

export const config = {
  matcher: ['/admin/:path*', '/cleaner/:path*', '/customer/:path*'],
}