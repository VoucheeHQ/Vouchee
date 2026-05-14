import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

// ─────────────────────────────────────────────────────────────────────────────
// Admin key/value settings.
//
//   GET  /api/admin/settings              → { settings: { key: value, … } }
//   POST /api/admin/settings              → { key: string, value: any }
//
// Currently used for the hourly_violation_digest toggle. Designed generically
// so future toggles can reuse the same endpoint without new routes.
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
    .from('admin_settings')
    .select('key, value')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const settings = Object.fromEntries(((data as any[]) ?? []).map(r => [r.key, r.value]))
  return NextResponse.json({ settings })
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response
  const body = await request.json().catch(() => null) as { key?: unknown; value?: unknown } | null
  const key = typeof body?.key === 'string' ? body.key.trim() : ''
  if (!key) return NextResponse.json({ error: 'Missing key' }, { status: 400 })
  // value is jsonb so any JSON-shaped value is fine; reject undefined only
  if (body?.value === undefined) return NextResponse.json({ error: 'Missing value' }, { status: 400 })

  const admin = adminClient()
  const { error } = await admin
    .from('admin_settings')
    .upsert({ key, value: body.value, updated_at: new Date().toISOString(), updated_by: auth.userId }, { onConflict: 'key' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
