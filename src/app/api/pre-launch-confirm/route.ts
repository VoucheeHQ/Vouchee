import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isLaunched } from '@/lib/launch'

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/pre-launch-confirm?id=<request_id>
//
// One-click confirmation endpoint linked from the 24h reminder email. Marks
// the listing as confirmed (pre_launch_confirmed_at = now). Behaviour
// depends on whether the marketplace has launched yet:
//
//   - Pre-launch: just stamps the column. Admin's "Launch all pending"
//     button only flips rows with this column set, so confirmation is the
//     gate that decides which listings actually go live.
//
//   - Post-launch: stamps the column AND auto-flips status to 'active' so
//     late confirmers (anyone who clicks the link after 12 PM on launch
//     day) still get their listing live with a single click.
//
// No auth, no token — anyone with the URL can confirm a listing. This is
// intentional: the request_id UUID is effectively a 36-character random
// secret, and the worst-case "abuse" is someone confirming a customer's
// own listing for them, which is what the customer wants anyway.
//
// On success, redirects to the customer dashboard with a success flag.
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.vouchee.co.uk'

  if (!id) {
    return NextResponse.redirect(`${appUrl}/customer/dashboard?pre_launch_confirm=invalid`)
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Look up the listing first to decide which path we're on (pre or post
  // launch). Also defends against link-tampering — only real ids respond.
  const { data: row, error: lookupErr } = await admin
    .from('clean_requests')
    .select('id, status, pre_launch_confirmed_at')
    .eq('id', id)
    .single() as { data: { id: string; status: string; pre_launch_confirmed_at: string | null } | null; error: any }

  if (lookupErr || !row) {
    return NextResponse.redirect(`${appUrl}/customer/dashboard?pre_launch_confirm=notfound`)
  }

  // Already confirmed and live — idempotent success.
  if (row.status === 'active' && row.pre_launch_confirmed_at) {
    return NextResponse.redirect(`${appUrl}/customer/dashboard?pre_launch_confirm=already`)
  }

  const launched = isLaunched()
  const now = new Date().toISOString()

  if (launched && row.status === 'pre_launch_pending') {
    // Late confirmer — auto-flip to active and fire the cleaner job alert
    // so the listing surfaces immediately.
    const { error: flipErr } = await admin
      .from('clean_requests')
      .update({
        status: 'active',
        pre_launch_confirmed_at: now,
        goes_live_at: now,
      } as any)
      .eq('id', id)
      .eq('status', 'pre_launch_pending')
    if (flipErr) {
      console.error('pre-launch-confirm: flip failed', flipErr)
      return NextResponse.redirect(`${appUrl}/customer/dashboard?pre_launch_confirm=error`)
    }
    // Fire job alert — best-effort.
    try {
      await fetch(`${appUrl}/api/notifications/cleaner-job-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: id }),
      })
    } catch (e) {
      console.error('pre-launch-confirm: alert fire failed', e)
    }
    return NextResponse.redirect(`${appUrl}/customer/dashboard?pre_launch_confirm=live`)
  }

  // Pre-launch path: just stamp the column. The admin "Launch all pending"
  // button will flip this listing to active on launch day.
  if (row.status === 'pre_launch_pending') {
    const { error: stampErr } = await admin
      .from('clean_requests')
      .update({ pre_launch_confirmed_at: now } as any)
      .eq('id', id)
    if (stampErr) {
      console.error('pre-launch-confirm: stamp failed', stampErr)
      return NextResponse.redirect(`${appUrl}/customer/dashboard?pre_launch_confirm=error`)
    }
    return NextResponse.redirect(`${appUrl}/customer/dashboard?pre_launch_confirm=ok`)
  }

  // Anything else (already cancelled, deleted, etc.) — silent redirect.
  return NextResponse.redirect(`${appUrl}/customer/dashboard?pre_launch_confirm=stale`)
}
