import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

// ─────────────────────────────────────────────────────────────────────────────
// Admin-only CRUD for the violation watchlist.
//
//   GET    /api/admin/keywords        → [{ id, keyword, created_at }]
//   POST   /api/admin/keywords        → { keyword: string }   (add one)
//   DELETE /api/admin/keywords?id=…   → remove one
//
// Same pattern as /api/admin/route.ts: re-check role server-side, then use
// service-role for the write (RLS is read-only for authenticated users).
// ─────────────────────────────────────────────────────────────────────────────

async function requireAdmin(): Promise<{ ok: true; userId: string } | { ok: false; response: NextResponse }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!profile || (profile as any).role !== 'admin') {
    return { ok: false, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { ok: true, userId: user.id }
}

function adminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response
  const admin = adminClient()
  const { data, error } = await admin
    .from('violation_keywords')
    .select('id, keyword, created_at, created_by')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ keywords: data ?? [] })
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  const body = await request.json().catch(() => null) as { keyword?: unknown } | null
  const raw = typeof body?.keyword === 'string' ? body.keyword : ''
  const keyword = raw.trim().toLowerCase()
  if (!keyword) {
    return NextResponse.json({ error: 'Keyword must be a non-empty string' }, { status: 400 })
  }
  if (keyword.length > 60) {
    return NextResponse.json({ error: 'Keyword too long (max 60 chars)' }, { status: 400 })
  }

  const admin = adminClient()
  const { data, error } = await admin
    .from('violation_keywords')
    .insert({ keyword, created_by: auth.userId })
    .select('id, keyword, created_at, created_by')
    .single()

  if (error) {
    // Unique-violation → friendly message
    if ((error as any).code === '23505') {
      return NextResponse.json({ error: 'That keyword already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ keyword: data })
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  const id = request.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const admin = adminClient()
  const { error } = await admin.from('violation_keywords').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
