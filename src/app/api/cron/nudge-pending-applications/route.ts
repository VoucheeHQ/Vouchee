import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/cron/nudge-pending-applications
//
// Runs daily (see vercel.json). Emails customers who have pending applications
// that have been sitting unactioned for between 1 and 7 days.
//
// Window: 1 day ≤ application age ≤ 7 days.
//   < 1 day → too soon, the customer may still be reviewing
//   > 7 days → customer has implicitly decided; further nudges would be spam
//              and would hurt our sending reputation
//
// One email per customer covering all their pending-application requests,
// to avoid spam when a customer has multiple active listings.
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
  // Fail-closed in production: missing CRON_SECRET means anyone can trigger
  // this endpoint. Hard 500 in prod, allow dev usage without.
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

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const resend = new Resend(process.env.RESEND_API_KEY!)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.vouchee.co.uk'

  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  // Skip applications nudged within the last 22h — protects against cron
  // retries (e.g. Vercel re-firing after a Resend network blip) double-emailing
  // the customer. 22h (rather than 24h) leaves headroom for cron drift.
  const dedupeCutoff = new Date(Date.now() - 22 * 60 * 60 * 1000).toISOString()

  // ── 1. Find pending applications aged 1–7 days ────────────────────────────
  // The `last_nudge_sent_at` filter is wrapped in try/catch because the
  // column is added by migration 002 and may not exist in older deployments.
  // If the filtered query errors, fall back to the unfiltered version (cron
  // continues to work, dedupe becomes a no-op until the migration is applied).
  type PendingApp = { id: string; cleaner_id: string; request_id: string; created_at: string }
  let pendingApps: PendingApp[] | null = null
  let dedupeActive = true
  try {
    const { data, error } = await admin
      .from('applications')
      .select('id, cleaner_id, request_id, created_at')
      .eq('status', 'pending')
      .lte('created_at', cutoff)
      .gte('created_at', sevenDaysAgo)
      .or(`last_nudge_sent_at.is.null,last_nudge_sent_at.lt.${dedupeCutoff}`) as { data: PendingApp[] | null; error: any }
    if (error) throw error
    pendingApps = data
  } catch (e: any) {
    console.warn('nudge-pending-applications: last_nudge_sent_at filter unavailable — apply migration 002. Falling back to unfiltered query.', e?.message ?? e)
    dedupeActive = false
    const { data, error: appErr } = await admin
      .from('applications')
      .select('id, cleaner_id, request_id, created_at')
      .eq('status', 'pending')
      .lte('created_at', cutoff)
      .gte('created_at', sevenDaysAgo) as { data: PendingApp[] | null; error: any }
    if (appErr) {
      console.log('nudge-pending-applications: query failed', appErr)
      return NextResponse.json({ nudged: 0 })
    }
    pendingApps = data
  }

  if (!pendingApps || pendingApps.length === 0) {
    console.log('nudge-pending-applications: no pending apps in the 1–7 day window')
    return NextResponse.json({ nudged: 0 })
  }

  // ── 2. Get the associated requests (active only) ──────────────────────────
  const requestIds = [...new Set(pendingApps.map(a => a.request_id))]
  const { data: requests } = await admin
    .from('clean_requests')
    .select('id, customer_id, zone')
    .in('id', requestIds)
    .in('status', ['active', 'pending']) as { data: Array<{ id: string; customer_id: string; zone: string }> | null }

  if (!requests?.length) return NextResponse.json({ nudged: 0 })

  const activeRequestIds = new Set(requests.map(r => r.id))
  const requestMap = new Map(requests.map(r => [r.id, r]))

  // Filter applications to only those on active requests
  const relevantApps = pendingApps.filter(a => activeRequestIds.has(a.request_id))
  if (!relevantApps.length) return NextResponse.json({ nudged: 0 })

  // ── 3. Get cleaner short names ────────────────────────────────────────────
  const cleanerIds = [...new Set(relevantApps.map(a => a.cleaner_id))]
  const { data: cleanerRecords } = await admin
    .from('cleaners')
    .select('id, profile_id')
    .in('id', cleanerIds) as { data: Array<{ id: string; profile_id: string }> | null }

  const cleanerIdToProfileId = new Map((cleanerRecords ?? []).map(c => [c.id, c.profile_id]))
  const cleanerProfileIds = (cleanerRecords ?? []).map(c => c.profile_id)

  const { data: cleanerProfiles } = await admin
    .from('profiles')
    .select('id, full_name')
    .in('id', cleanerProfileIds) as { data: Array<{ id: string; full_name: string | null }> | null }

  const cleanerProfileMap = new Map((cleanerProfiles ?? []).map(p => [p.id, p]))

  const getCleanerShortName = (cleanerId: string) => {
    const pid = cleanerIdToProfileId.get(cleanerId)
    const cp = pid ? cleanerProfileMap.get(pid) : null
    const name = cp?.full_name?.trim() ?? 'A cleaner'
    const parts = name.split(' ')
    return parts.length > 1 ? `${parts[0]} ${parts[parts.length-1][0]}.` : parts[0]
  }

  // ── 4. Group by customer and send one consolidated email each ─────────────
  const byCustomer = new Map<string, Array<{ requestId: string; zone: string; apps: typeof relevantApps }>>()
  for (const req of requests) {
    const appsForReq = relevantApps.filter(a => a.request_id === req.id)
    if (!appsForReq.length) continue
    const list = byCustomer.get(req.customer_id) ?? []
    list.push({ requestId: req.id, zone: req.zone, apps: appsForReq })
    byCustomer.set(req.customer_id, list)
  }

  // Get customer profiles (customer_id on clean_requests is customers.id, not profile_id)
  const customerRecordIds = [...byCustomer.keys()]
  const { data: customerRecords } = await admin
    .from('customers')
    .select('id, profile_id')
    .in('id', customerRecordIds) as { data: Array<{ id: string; profile_id: string }> | null }

  const customerIdToProfileId = new Map((customerRecords ?? []).map(c => [c.id, c.profile_id]))
  const customerProfileIds = (customerRecords ?? []).map(c => c.profile_id)

  const { data: customerProfiles } = await admin
    .from('profiles')
    .select('id, full_name, email')
    .in('id', customerProfileIds) as { data: Array<{ id: string; full_name: string | null; email: string | null }> | null }

  const customerProfileMap = new Map((customerProfiles ?? []).map(p => [p.id, p]))

  let nudged = 0
  for (const [customerId, requestGroups] of byCustomer) {
    const profileId = customerIdToProfileId.get(customerId)
    if (!profileId) continue
    const customer = customerProfileMap.get(profileId)
    if (!customer?.email) continue

    const firstName = customer.full_name?.split(' ')[0] ?? 'there'
    const totalApps = requestGroups.reduce((sum, g) => sum + g.apps.length, 0)

    // Build the applicant rows
    const applicantRows = requestGroups.flatMap(group => {
      const zoneLabel = ZONE_LABELS[group.zone] ?? group.zone
      return group.apps.map(app => {
        const name = getCleanerShortName(app.cleaner_id)
        const hoursAgo = Math.floor((Date.now() - new Date(app.created_at).getTime()) / 3600000)
        const timeLabel = hoursAgo < 24 ? `${hoursAgo}h ago` : `${Math.floor(hoursAgo / 24)}d ago`
        return `<tr>
          <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#0f172a;font-weight:700;">${name}</td>
          <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#475569;">${zoneLabel}</td>
          <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:11px;color:#94a3b8;text-align:right;">${timeLabel}</td>
        </tr>`
      }).join('')
    }).join('')

    const subject = totalApps === 1
      ? `👋 1 cleaner is waiting for your reply on Vouchee`
      : `👋 ${totalApps} cleaners are waiting for your reply on Vouchee`

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:40px 16px;">
  <tr><td align="center">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
    <tr><td style="background:#ffffff;padding:32px 40px;text-align:center;border-radius:16px 16px 0 0;">
      <img src="https://www.vouchee.co.uk/full-logo-black.png" width="220" height="50" alt="Vouchee" style="display:block;margin:0 auto 20px;max-width:100%;" />
      <div style="font-size:28px;font-weight:800;color:#0f172a;letter-spacing:-0.5px;">Cleaners waiting on you 👋</div>
    </td></tr>
    <tr><td style="background:white;padding:32px 40px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 16px 16px;">
      <p style="font-size:15px;color:#475569;line-height:1.7;margin:0 0 20px;">
        Hey ${firstName} — you have <strong>${totalApps} cleaner${totalApps > 1 ? 's' : ''}</strong> who${totalApps > 1 ? "'ve" : "'s"} applied to your listing${requestGroups.length > 1 ? 's' : ''} and ${totalApps > 1 ? 'are' : 'is'} waiting to hear from you.
      </p>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:4px 20px;margin-bottom:24px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <th style="padding:10px 0;font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.06em;text-align:left;">Cleaner</th>
            <th style="padding:10px 0;font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.06em;text-align:left;">Area</th>
            <th style="padding:10px 0;font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.06em;text-align:right;">Applied</th>
          </tr>
          ${applicantRows}
        </table>
      </div>
      <a href="${appUrl}/customer/dashboard" style="display:block;background:#16a34a;color:white;text-align:center;padding:15px;border-radius:10px;font-size:15px;font-weight:700;text-decoration:none;">Review applications →</a>
      <p style="font-size:13px;color:#64748b;text-align:center;margin:20px 0 0;line-height:1.6;">
        Review profiles, read their messages, and choose the cleaner that's right for you.
      </p>
      <p style="font-size:12px;color:#94a3b8;text-align:center;margin:20px 0 0;line-height:1.6;">
        Questions? <a href="mailto:hello@vouchee.co.uk" style="color:#94a3b8;">hello@vouchee.co.uk</a>
      </p>
    </td></tr>
    <tr><td style="padding:20px 0;text-align:center;">
      <p style="margin:0;font-size:12px;color:#94a3b8;">© 2026 Vouchee · <a href="https://www.vouchee.co.uk" style="color:#94a3b8;text-decoration:none;">vouchee.co.uk</a></p>
    </td></tr>
  </table>
  </td></tr>
</table>
</body>
</html>`

    try {
      await resend.emails.send({
        from: 'Vouchee <hello@vouchee.co.uk>',
        to: customer.email,
        subject,
        html,
      })
      nudged++
      console.log(`nudge-pending-applications: nudged ${customer.email} (${totalApps} apps)`)

      // Stamp last_nudge_sent_at on every application included in this email.
      // Done AFTER the email succeeds so a Resend failure doesn't silently
      // mark rows as nudged and starve them next cron run. Wrapped because
      // the column is migration-gated (see migration 002).
      if (dedupeActive) {
        const appIds = requestGroups.flatMap(g => g.apps.map(a => a.id))
        try {
          await admin
            .from('applications')
            .update({ last_nudge_sent_at: new Date().toISOString() } as any)
            .in('id', appIds)
        } catch (stampErr: any) {
          console.warn('nudge-pending-applications: stamp failed (non-fatal):', stampErr?.message ?? stampErr)
        }
      }
    } catch (e) {
      console.error(`nudge-pending-applications: failed for ${customer.email}:`, e)
    }
  }

  return NextResponse.json({ nudged, checked: customerRecordIds.length })
}