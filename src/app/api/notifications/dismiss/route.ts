import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/notifications/dismiss
//
// Deletes a single notification owned by the current user. Used by the ✕
// button on each notification row in the dashboards.
//
// Body: { id: string }
//
// We scope by cleaner_id or customer_id (whichever owns this user) so a
// malicious caller can't delete someone else's notification by guessing IDs.
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { id?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  // Resolve the user's role record (cleaner or customer)
  const { data: cleaner } = await supabase
    .from('cleaners')
    .select('id')
    .eq('profile_id', user.id)
    .single()

  let scopeColumn: 'cleaner_id' | 'customer_id'
  let scopeId: string

  if (cleaner) {
    scopeColumn = 'cleaner_id'
    scopeId = (cleaner as any).id
  } else {
    const { data: customer } = await supabase
      .from('customers')
      .select('id')
      .eq('profile_id', user.id)
      .single()
    if (!customer) return NextResponse.json({ error: 'No cleaner or customer profile' }, { status: 404 })
    scopeColumn = 'customer_id'
    scopeId = (customer as any).id
  }

  const { error } = await (supabase.from('notifications') as any)
    .delete()
    .eq('id', body.id)
    .eq(scopeColumn, scopeId)

  if (error) {
    console.error('Dismiss notification failed:', error)
    return NextResponse.json({ error: 'Dismiss failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}