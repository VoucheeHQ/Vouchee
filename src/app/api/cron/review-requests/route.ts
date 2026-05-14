import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { reviewRequestHtml } from '@/lib/emails/review-request'

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/cron/review-requests   — daily at 10:00 UTC (see vercel.json)
//
// Emails customers ~14 days after their first clean's start_date, asking
// them to review the assigned cleaner. By 14 days, the first DD has fired,
// the first clean (or two) has happened, and the conversation feels
// natural — not "review us before you've even started" and not stale.
//
// Eligibility per clean_request:
//   - status IN ('fulfilled', 'active')
//   - start_date IS NOT NULL AND start_date + 14d <= now()
//   - review_email_sent_at IS NULL                  (one email per request)
//   - No review row exists for this clean_request   (customer already reviewed)
//   - assigned_cleaner_id IS NOT NULL               (we know who to review)
//
// One email per eligible clean_request. review_email_sent_at is set
// regardless of whether the email succeeded, to avoid the customer being
// nagged daily if Resend has a blip. (A missed email here is preferable
// to a daily nag.)
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

  // 14d cutoff — clean_requests whose start_date is on or before this date.
  const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()

  // ── 1. Candidate clean_requests ─────────────────────────────────────────
  const { data: candidates, error: reqErr } = await admin
    .from('clean_requests')
    .select('id, customer_id, assigned_cleaner_id, start_date')
    .in('status', ['fulfilled', 'active'])
    .not('start_date', 'is', null)
    .not('assigned_cleaner_id', 'is', null)
    .lte('start_date', cutoff)
    .is('review_email_sent_at', null)
    .limit(200) as { data: Array<{ id: string; customer_id: string; assigned_cleaner_id: string; start_date: string }> | null; error: any }

  if (reqErr) {
    console.error('review-requests: candidate query failed', reqErr)
    return NextResponse.json({ error: reqErr.message }, { status: 500 })
  }
  if (!candidates || candidates.length === 0) {
    return NextResponse.json({ checked: 0, emailed: 0 })
  }

  // ── 2. Filter out requests that already have a review ──────────────────
  const candidateIds = candidates.map(c => c.id)
  const { data: existingReviews } = await admin
    .from('reviews').select('clean_request_id').in('clean_request_id', candidateIds) as { data: Array<{ clean_request_id: string }> | null }
  const reviewedSet = new Set((existingReviews ?? []).map(r => r.clean_request_id))
  const eligible = candidates.filter(c => !reviewedSet.has(c.id))

  if (eligible.length === 0) {
    return NextResponse.json({ checked: candidates.length, emailed: 0 })
  }

  // ── 3. Batch-fetch customer + cleaner names + emails ────────────────────
  const customerIds = Array.from(new Set(eligible.map(c => c.customer_id)))
  const cleanerIds = Array.from(new Set(eligible.map(c => c.assigned_cleaner_id)))

  const [{ data: customers }, { data: cleaners }] = await Promise.all([
    admin.from('customers').select('id, profile_id').in('id', customerIds),
    admin.from('cleaners').select('id, profile_id, short_id').in('id', cleanerIds),
  ]) as [
    { data: Array<{ id: string; profile_id: string }> | null },
    { data: Array<{ id: string; profile_id: string; short_id: string | null }> | null },
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

  // ── 4. Send one email per eligible request ──────────────────────────────
  let emailed = 0
  const errors: string[] = []
  const successIds: string[] = []

  for (const c of eligible) {
    const customer = customerById.get(c.customer_id)
    const cleaner = cleanerById.get(c.assigned_cleaner_id)
    if (!customer || !cleaner || !cleaner.short_id) {
      errors.push(`request ${c.id}: missing customer/cleaner/short_id`)
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
        subject: `How's it going with ${cleanerFirstName || 'your cleaner'}?`,
        html: reviewRequestHtml({
          appUrl,
          customerFirstName,
          cleanerFirstName,
          cleanerShortId: cleaner.short_id,
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

  // ── 5. Mark review_email_sent_at to prevent re-sends ────────────────────
  if (successIds.length > 0) {
    await admin
      .from('clean_requests')
      .update({ review_email_sent_at: new Date().toISOString() } as any)
      .in('id', successIds)
  }

  return NextResponse.json({
    checked: candidates.length,
    eligible: eligible.length,
    emailed,
    errors: errors.length > 0 ? errors : undefined,
  })
}
