import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { ids?: string[]; all?: boolean }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Resolve the cleaner ID for this user
  const { data: cleaner } = await supabase
    .from('cleaners')
    .select('id')
    .eq('profile_id', user.id)
    .single()

  if (!cleaner) return NextResponse.json({ error: 'No cleaner profile' }, { status: 404 })

  // RLS ensures only their own notifications can be updated, but we scope
  // explicitly as defense in depth.
  let query = (supabase.from('notifications') as any)
    .update({ read: true })
    .eq('cleaner_id', (cleaner as any).id)

  if (body.all) {
    query = query.eq('read', false)
  } else if (Array.isArray(body.ids) && body.ids.length > 0) {
    query = query.in('id', body.ids)
  } else {
    return NextResponse.json({ error: 'Provide ids[] or all=true' }, { status: 400 })
  }

  const { error } = await query
  if (error) {
    console.error('Mark notifications read failed:', error)
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}