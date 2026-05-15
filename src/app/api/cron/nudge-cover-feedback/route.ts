import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { coverFeedbackPromptHtml } from '@/lib/emails/cover-feedback-prompt'

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/cron/nudge-cover-feedback   — daily at 09:00 UTC (see vercel.json)
//
// Emails customers ~24h after a fulfilled cover clean (service_type='cover'),
// asking them to leave a review for the cover cleaner and optionally tell
// admin how it went. The review submitted from the landing page goes
// through the existing /api/reviews/submit endpoint and lands in the same
// reviews table as any other review — there is no parallel system.
//
// Eligibility per clean_request:
//   - service_type = 'cover'
//   - status = 'fulfilled'                       (the cover actually happened)
//   - assigned_cleaner_id IS NOT NULL            (we know who they're reviewing)
//   - cover_date IS NOT NULL AND cover_date <= today - 1 day
//   - cover_feedback_email_sent_at IS NULL       (one email per cover ever)
//
// One email per eligible cover. cover_feedback_email_sent_at is set
// regardless of whether the email actually sent — mirrors the
// review-requests cron — so a Resend blip doesn't turn into a daily nag.
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

  // 24h cutoff — cover_date is a DATE (no time). Anything on or before
  // yesterday is fair game.
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const cutoffDate = yesterday.toISOString().split('T')[0]

  // ── 1. Candidate cover requests ─────────────────────────────────────────
  const { data: candidates, error: reqErr } = await admin
    .from('clean_requests')
    .select('id, customer_id, assigned_cleaner_id, cover_date')
    .eq('service_type', 'cover')
    .eq('status', 'fulfilled')
    .not('assigned_cleaner_id', 'is', null)
    .not('cover_date', 'is', null)
    .lte('cover_date', cutoffDate)
    .is('cover_feedback_email_sent_at', null)
    .limit(200) as { data: Array<{ id: string; customer_id: string; assigned_cleaner_id: string; cover_date: string }> | null; error: any }

  if (reqErr) {
    console.error('nudge-cover-feedback: candidate query failed', reqErr)
    return NextResponse.json({ error: reqErr.message }, { status: 500 })
  }
  if (!candidates || candidates.length === 0) {
    return NextResponse.json({ checked: 0, emailed: 0 })
  }

  // ── 2. Batch-fetch customer + cleaner names + emails ────────────────────
  const customerIds = Array.from(new Set(candidates.map(c => c.customer_id)))
  const cleanerIds = Array.from(new Set(candidates.map(c => c.assigned_cleaner_id)))

  const [{ data: customers }, { data: cleaners }] = await Promise.all([
    admin.from('customers').select('id, profile_id').in('id', customerIds),
    admin.from('cleaners').select('id, profile_id').in('id', cleanerIds),
  ]) as [
    { data: Array<{ id: string; profile_id: string }> | null },
    { data: Array<{ id: string; profile_id: string }> | null },
  ]

  const customerById = new Map((customers ?? []).map(c => [c.id, c]))
  const cleanerById = new Map((cleaners ?? []).map(c => [c.id, c]))

  const allProfileIds = Array.from(new Set([
    ...((customers ?? []).map(c => c.profile_id)),
    ...((cleaners ?? []).map(c => c.profile_id)),
  ]))
  const { data: profiles } = await admin
    .from('profiles').select('id, full_name, email').in('id', allProfileIds) as { data: Array<{ id: string; full_name: string | null; email: string | null }> | null }
  const profileById = new Map((profiles ?? []).map(p => [p.id, p]))

  // ── 3. Send one email per eligible request ──────────────────────────────
  let emailed = 0
  const errors: string[] = []
  const successIds: string[] = []

  for (const c of candidates) {
    const customer = customerById.get(c.customer_id)
    const cleaner = cleanerById.get(c.assigned_cleaner_id)
    if (!customer || !cleaner) {
      errors.push(`request ${c.id}: missing customer/cleaner record`)
      continue
    }
    const customerProfile = profileById.get(customer.profile_id)
    const cleanerProfile = profileById.get(cleaner.profile_id)
    if (!customerProfile?.email) {
      errors.push(`request ${c.id}: customer has no email`)
      continue
    }

    const customerFirstName = customerProfile.full_name?.split(' ')[0] ?? ''
    const cleanerFirstName = cleanerProfile?.full_name?.split(' ')[0] ?? ''

    try {
      await resend.emails.send({
        from: 'Vouchee <hello@vouchee.co.uk>',
        to: customerProfile.email,
        subject: `How did your cover clean go${cleanerFirstName ? ` with ${cleanerFirstName}` : ''}?`,
        html: coverFeedbackPromptHtml({
          appUrl,
          customerFirstName,
          cleanerFirstName,
          cleanRequestId: c.id,
        }),
      })
      emailed++
      successIds.push(c.id)
    } catch (e: any) {
      errors.push(`request ${c.id}: send failed — ${e?.message ?? 'unknown'}`)
      // Still mark sent_at so we don't loop daily on a hard-failing recipient.
      successIds.push(c.id)
    }
  }

  // ── 4. Mark cover_feedback_email_sent_at to prevent re-sends ────────────
  if (successIds.length > 0) {
    await admin
      .from('clean_requests')
      .update({ cover_feedback_email_sent_at: new Date().toISOString() } as any)
      .in('id', successIds)
  }

  return NextResponse.json({
    checked: candidates.length,
    emailed,
    errors: errors.length > 0 ? errors : undefined,
  })
}
