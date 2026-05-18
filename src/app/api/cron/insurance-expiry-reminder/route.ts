import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { insuranceExpiryReminderHtml } from '@/lib/emails/insurance-expiry-reminder'

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/cron/insurance-expiry-reminder   — daily at 08:30 UTC (see vercel.json)
//
// Reminds approved cleaners that their public liability insurance is due to
// expire within the next 30 days. One email per renewal cycle.
//
// Eligibility per cleaner:
//   - cleaners.application_status = 'approved'
//   - cleaners.insurance_expiry IS NOT NULL
//   - cleaners.insurance_expiry BETWEEN now() AND now() + 30 days
//   - cleaners.insurance_expiry > now()                 (not already expired)
//   - reminder_sent_at IS NULL
//     OR reminder_sent_at < insurance_expiry - INTERVAL '90 days'
//     (the 90-day gap re-arms the reminder when a cleaner renews — the new
//     expiry is ~1 year out so the old sent_at is well outside the window)
//
// On send: set insurance_expiry_reminder_sent_at = NOW() regardless of whether
// Resend actually delivered, mirroring the review-requests cron. Better to
// risk one missed reminder than nag the cleaner daily on a hard-failing
// recipient address.
// ─────────────────────────────────────────────────────────────────────────────

const CRON_SECRET = process.env.CRON_SECRET
const IS_PROD = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1'

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

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const resend = new Resend(process.env.RESEND_API_KEY!)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.vouchee.co.uk'

  const now = new Date()
  const horizon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  const horizonIso = horizon.toISOString().split('T')[0]
  const todayIso = now.toISOString().split('T')[0]

  // ── 1. Candidate cleaners ──────────────────────────────────────────────
  // Filter approved + expiry in window in SQL; the 90-day re-arm check is
  // done in JS because it compares two columns from the same row (Supabase
  // PostgREST doesn't support column-vs-column comparisons in filters).
  const { data: candidates, error: reqErr } = await admin
    .from('cleaners')
    .select('id, profile_id, insurance_expiry, insurance_expiry_reminder_sent_at')
    .eq('application_status', 'approved')
    .not('insurance_expiry', 'is', null)
    .gte('insurance_expiry', todayIso)
    .lte('insurance_expiry', horizonIso)
    .limit(200) as { data: Array<{ id: string; profile_id: string; insurance_expiry: string; insurance_expiry_reminder_sent_at: string | null }> | null; error: any }

  if (reqErr) {
    console.error('[insurance-expiry-reminder] candidate query failed:', reqErr)
    return NextResponse.json({ error: reqErr.message }, { status: 500 })
  }
  if (!candidates || candidates.length === 0) {
    return NextResponse.json({ checked: 0, emailed: 0 })
  }

  // ── 2. Re-arm gate — skip cleaners whose last reminder is still within
  //      the 90-day window of the current expiry. Renewed cover always has
  //      a new expiry date ~1 year out, so the old sent_at automatically
  //      falls outside the window and the reminder cycle re-fires.
  const eligible = candidates.filter(c => {
    if (!c.insurance_expiry_reminder_sent_at) return true
    const expiry = new Date(c.insurance_expiry).getTime()
    const lastSent = new Date(c.insurance_expiry_reminder_sent_at).getTime()
    return lastSent < expiry - 90 * 24 * 60 * 60 * 1000
  })

  if (eligible.length === 0) {
    return NextResponse.json({ checked: candidates.length, emailed: 0 })
  }

  // ── 3. Batch-fetch profiles for name + email ────────────────────────────
  const profileIds = Array.from(new Set(eligible.map(c => c.profile_id)))
  const { data: profiles } = await admin
    .from('profiles').select('id, full_name, email').in('id', profileIds) as { data: Array<{ id: string; full_name: string | null; email: string | null }> | null }
  const profileById = new Map((profiles ?? []).map(p => [p.id, p]))

  // ── 4. Send one email per eligible cleaner ──────────────────────────────
  let emailed = 0
  const errors: string[] = []
  const successIds: string[] = []

  for (const c of eligible) {
    const profile = profileById.get(c.profile_id)
    if (!profile?.email) {
      errors.push(`cleaner ${c.id}: no email`)
      continue
    }

    const expiryDate = new Date(c.insurance_expiry)
    const daysUntilExpiry = Math.max(0, Math.ceil((expiryDate.getTime() - now.getTime()) / 86400000))
    const firstName = profile.full_name?.split(' ')[0] ?? 'there'

    try {
      await resend.emails.send({
        from: 'Vouchee <cleaners@vouchee.co.uk>',
        to: profile.email,
        subject: `Renew your Vouchee insurance — expires in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? '' : 's'}`,
        html: insuranceExpiryReminderHtml({ appUrl, firstName, expiryDate, daysUntilExpiry }),
      })
      emailed++
      successIds.push(c.id)
    } catch (e: any) {
      errors.push(`cleaner ${c.id}: send failed — ${e?.message ?? 'unknown'}`)
      // Still mark sent_at so we don't loop daily on a hard-failing recipient
      successIds.push(c.id)
    }
  }

  // ── 5. Mark sent_at to prevent re-sending until the next renewal cycle ──
  if (successIds.length > 0) {
    await admin
      .from('cleaners')
      .update({ insurance_expiry_reminder_sent_at: new Date().toISOString() } as any)
      .in('id', successIds)
  }

  return NextResponse.json({
    checked: candidates.length,
    eligible: eligible.length,
    emailed,
    errors: errors.length > 0 ? errors : undefined,
  })
}
