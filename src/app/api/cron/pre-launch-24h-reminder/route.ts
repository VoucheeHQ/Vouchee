import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { preLaunch24hHtml, preLaunch24hSubject } from '@/lib/emails/pre-launch-24h-reminder'
import { LAUNCH_DATE } from '@/lib/launch'

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/cron/pre-launch-24h-reminder
//
// Runs daily (see vercel.json). Sends the "Vouchee launches in 24 hours —
// confirm your listing" email to every customer whose listing is still
// pre_launch_pending and who hasn't already been sent the reminder.
//
// Time gate: only fires within the 30-hour window before LAUNCH_DATE. The
// daily cadence + the dedupe column mean each customer gets at most one
// reminder email regardless of when the cron actually runs (UTC midnight,
// late, or retried).
// ─────────────────────────────────────────────────────────────────────────────

const CRON_SECRET = process.env.CRON_SECRET
const IS_PROD = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1'

const ZONE_LABELS: Record<string, string> = {
  central_south_east: 'Central / South East', north_west: 'North West',
  north_east_roffey: 'North East / Roffey', south_west: 'South West',
  warnham_north: 'Warnham / North', broadbridge_heath: 'Broadbridge Heath',
  mannings_heath: 'Mannings Heath', faygate_kilnwood_vale: 'Faygate / Kilnwood Vale',
  christs_hospital: "Christ's Hospital", southwater: 'Southwater',
}

export async function GET(request: NextRequest) {
  if (IS_PROD && !CRON_SECRET) {
    console.error('CRON_SECRET is not configured — refusing to run cron')
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
  }
  if (CRON_SECRET) {
    const auth = request.headers.get('authorization')
    if (auth !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  // Time gate — only fire within the 30h window before launch. Outside that
  // window, no-op (so re-runs and retries before/after launch don't email).
  const msUntilLaunch = LAUNCH_DATE.getTime() - Date.now()
  const WINDOW_MS = 30 * 60 * 60 * 1000
  if (msUntilLaunch <= 0 || msUntilLaunch > WINDOW_MS) {
    return NextResponse.json({ ok: true, skipped: 'outside_window', msUntilLaunch })
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const resend = new Resend(process.env.RESEND_API_KEY!)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.vouchee.co.uk'

  // Find pre-launch listings that haven't been reminded yet. The column is
  // migration-gated, so wrap the filter in try/catch and fall back to
  // sending without dedupe (better to risk a duplicate than skip the
  // launch-day reminder entirely).
  type Row = { id: string; customer_id: string; zone: string | null }
  let rows: Row[] | null = null
  let dedupeActive = true
  try {
    const { data, error } = await admin
      .from('clean_requests')
      .select('id, customer_id, zone')
      .eq('status', 'pre_launch_pending')
      .is('pre_launch_24h_email_sent_at', null) as { data: Row[] | null; error: any }
    if (error) throw error
    rows = data
  } catch (e: any) {
    console.warn('pre-launch-24h: dedupe filter unavailable — apply migration 004. Falling back to unfiltered query.', e?.message ?? e)
    dedupeActive = false
    const { data } = await admin
      .from('clean_requests')
      .select('id, customer_id, zone')
      .eq('status', 'pre_launch_pending') as { data: Row[] | null }
    rows = data
  }

  if (!rows || rows.length === 0) {
    return NextResponse.json({ ok: true, sent: 0 })
  }

  // Batch-look-up customer profiles
  const customerIds = Array.from(new Set(rows.map(r => r.customer_id)))
  const { data: customers } = await admin
    .from('customers').select('id, profile_id').in('id', customerIds) as { data: Array<{ id: string; profile_id: string }> | null }
  const customerProfileMap = new Map((customers ?? []).map(c => [c.id, c.profile_id]))

  const profileIds = (customers ?? []).map(c => c.profile_id)
  const { data: profiles } = profileIds.length > 0
    ? await admin.from('profiles').select('id, full_name, email').in('id', profileIds) as { data: Array<{ id: string; full_name: string | null; email: string | null }> | null }
    : { data: [] as Array<{ id: string; full_name: string | null; email: string | null }> }
  const profileMap = new Map((profiles ?? []).map(p => [p.id, p]))

  let sent = 0
  for (const row of rows) {
    const profileId = customerProfileMap.get(row.customer_id)
    const profile = profileId ? profileMap.get(profileId) : null
    if (!profile?.email) continue

    const firstName = profile.full_name?.split(' ')[0] ?? 'there'
    const zoneLabel = row.zone ? (ZONE_LABELS[row.zone] ?? row.zone) : 'Horsham'
    const confirmUrl = `${appUrl}/api/pre-launch-confirm?id=${row.id}`

    try {
      await resend.emails.send({
        from: 'Vouchee <hello@vouchee.co.uk>',
        to: profile.email,
        subject: preLaunch24hSubject(),
        html: preLaunch24hHtml({
          customerFirstName: firstName,
          zoneLabel,
          confirmUrl,
          appUrl,
        }),
      })
      sent++
      if (dedupeActive) {
        try {
          await admin
            .from('clean_requests')
            .update({ pre_launch_24h_email_sent_at: new Date().toISOString() } as any)
            .eq('id', row.id)
        } catch (stampErr: any) {
          console.warn('pre-launch-24h: stamp failed (non-fatal):', stampErr?.message ?? stampErr)
        }
      }
    } catch (e) {
      console.error(`pre-launch-24h: send failed for ${profile.email}:`, e)
    }
  }

  return NextResponse.json({ ok: true, sent, candidates: rows.length })
}
