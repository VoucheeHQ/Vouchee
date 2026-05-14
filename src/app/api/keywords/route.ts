import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/keywords
//
// Returns the active violation watchlist as a flat array of strings. The
// chat-widget fetches this once on mount and uses it for client-side warning
// detection. We don't gate by role — any authenticated user gets the same
// list, since the same warning appears for customers and cleaners.
//
// The server-side enforcement still lives in /api/log-violation, which
// re-runs the check against the same DB rows. The client list is just for
// "show the warning before they send" UX.
// ─────────────────────────────────────────────────────────────────────────────

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('violation_keywords')
    .select('keyword')
    .order('keyword', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const keywords = ((data as any[]) ?? []).map(r => r.keyword as string)
  return NextResponse.json({ keywords })
}
