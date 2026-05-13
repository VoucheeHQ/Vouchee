import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/launch-listings
//
// Flips every clean_request whose status is 'pre_launch_pending' to 'active'
// in one batch, then fires a cleaner-job-alert for each so the cleaner side
// gets notified about the queued-up listings on launch day.
//
// Admin-only — uses the standard auth pattern (session → profiles.role === 'admin').
// Idempotent: re-running once the bulk-flip is done is a no-op (no rows match).
//
// Pair with the NEXT_PUBLIC_LAUNCHED env var: flip the env var first (so new
// listings start coming in as 'active' automatically), then call this route
// to retro-flip the backlog.
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(_req: NextRequest) {
  const supabaseAuth = await createServerClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: profile } = await admin
    .from('profiles').select('role').eq('id', user.id).single() as { data: { role: string } | null }
  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Flip pre_launch_pending → active, but ONLY for listings the customer
  // has confirmed via the 24h reminder email. Unconfirmed pre-launch
  // listings stay where they are — customers can confirm any time after
  // launch and the /api/pre-launch-confirm endpoint auto-flips them then.
  //
  // The pre_launch_confirmed_at column is migration-gated (004); if it
  // doesn't exist yet, fall back to flipping everything so the admin's
  // launch button still works during the migration rollout window.
  let flipped: Array<{ id: string; zone: string | null }> | null = null
  let flipErr: any = null
  try {
    const result = await admin
      .from('clean_requests')
      .update({ status: 'active', goes_live_at: new Date().toISOString() } as any)
      .eq('status', 'pre_launch_pending')
      .not('pre_launch_confirmed_at', 'is', null)
      .select('id, zone') as { data: Array<{ id: string; zone: string | null }> | null; error: any }
    if (result.error) throw result.error
    flipped = result.data
  } catch (e: any) {
    console.warn('launch-listings: pre_launch_confirmed_at filter unavailable — apply migration 004. Flipping all pre_launch_pending rows as fallback.', e?.message ?? e)
    const result = await admin
      .from('clean_requests')
      .update({ status: 'active', goes_live_at: new Date().toISOString() } as any)
      .eq('status', 'pre_launch_pending')
      .select('id, zone') as { data: Array<{ id: string; zone: string | null }> | null; error: any }
    flipped = result.data
    flipErr = result.error
  }

  if (flipErr) {
    console.error('launch-listings: update failed', flipErr)
    return NextResponse.json({ error: flipErr.message ?? 'Update failed' }, { status: 500 })
  }

  const ids = (flipped ?? []).map(r => r.id)

  // Fire cleaner-job-alert for each flipped listing. Done sequentially to
  // avoid hammering Resend on a large backlog — the route itself dedupes via
  // cleaner_job_alerts_sent so partial retries are safe.
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.vouchee.co.uk'
  let alerted = 0
  for (const id of ids) {
    try {
      const res = await fetch(`${appUrl}/api/notifications/cleaner-job-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: id }),
      })
      if (res.ok) alerted++
    } catch (e) {
      console.error('launch-listings: alert failed for', id, e)
    }
  }

  return NextResponse.json({
    flipped: ids.length,
    alerted,
    ids,
  })
}
