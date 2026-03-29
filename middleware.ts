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

  // Helper: get role once
  const getRole = async () => {
    if (!user) return null
    const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    return (data as any)?.role ?? null
  }

  // ── Admin routes — must be admin ──────────────────────────────────────────
  if (pathname.startsWith('/admin')) {
    if (!user) return NextResponse.redirect(new URL('/login', request.url))
    const role = await getRole()
    if (role !== 'admin') return NextResponse.redirect(new URL('/login', request.url))
  }

  // ── Cleaner routes — cleaner or admin ─────────────────────────────────────
  if (pathname.startsWith('/cleaner')) {
    if (!user) return NextResponse.redirect(new URL(`/login?redirect=${pathname}`, request.url))
    const role = await getRole()
    if (role !== 'cleaner' && role !== 'admin') {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  // ── Customer routes — customer or admin ───────────────────────────────────
  if (pathname.startsWith('/customer')) {
    if (!user) return NextResponse.redirect(new URL(`/login?redirect=${pathname}`, request.url))
    const role = await getRole()
    if (role !== 'customer' && role !== 'admin') {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return response
}

export const config = {
  matcher: ['/admin/:path*', '/cleaner/:path*', '/customer/:path*'],
}