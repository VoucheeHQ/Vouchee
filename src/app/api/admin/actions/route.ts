import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  // Verify caller is admin
  const supabaseUser = await createClient()
  const { data: { user } } = await supabaseUser.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: profile } = await supabaseUser
    .from('profiles').select('role').eq('id', user.id).single()
  if (!profile || (profile as any).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Use service role to bypass RLS for all admin writes
  const admin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const body = await request.json()
  const { action } = body

  // ── Suspend / reinstate user ──────────────────────────────────────────────
  if (action === 'suspend_user') {
    const { userId, suspended } = body
    if (!userId || typeof suspended !== 'boolean') {
      return NextResponse.json({ error: 'Missing userId or suspended' }, { status: 400 })
    }
    const { error } = await admin.from('profiles').update({ suspended }).eq('id', userId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  // ── Hide / unhide listing ─────────────────────────────────────────────────
  if (action === 'hide_listing') {
    const { listingId, hidden } = body
    if (!listingId || typeof hidden !== 'boolean') {
      return NextResponse.json({ error: 'Missing listingId or hidden' }, { status: 400 })
    }
    const { error } = await admin.from('clean_requests').update({ hidden }).eq('id', listingId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  // ── Delete listing ────────────────────────────────────────────────────────
  if (action === 'delete_listing') {
    const { listingId } = body
    if (!listingId) {
      return NextResponse.json({ error: 'Missing listingId' }, { status: 400 })
    }
    const { error } = await admin.from('clean_requests').update({ status: 'deleted' }).eq('id', listingId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}