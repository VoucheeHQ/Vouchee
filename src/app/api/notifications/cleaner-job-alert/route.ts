import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { jobAlertHtml, JobAlertCard } from '@/lib/emails/cleaner-job-alert'

const resend = new Resend(process.env.RESEND_API_KEY)
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.vouchee.co.uk'

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/notifications/cleaner-job-alert
//
// Fires immediately when a customer publishes a new clean_request. Looks up
// approved cleaners with job_notify=true whose zones overlap the new listing's
// zone. Sends each one an email with the new job. Logs to the dedupe table
// so this can't fire twice for the same cleaner+request pair.
//
// Body: { requestId: string }
//
// Auth pattern: caller must be logged in AND own the listing (or be admin).
// Mirrors the dismiss/read notification routes' auth approach.
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // ─── Auth ────────────────────────────────────────────────────────────────
  const supabase = await createClient()
  const { data: { user }, error: userErr } = await supabase.auth.getUser()
  if (userErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ─── Parse body ──────────────────────────────────────────────────────────
  let body: { requestId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (!body.requestId) {
    return NextResponse.json({ error: 'requestId required' }, { status: 400 })
  }

  // ─── Service-role client for the work ────────────────────────────────────
  // We need to bypass RLS to read all approved cleaners and write to the
  // dedupe table. Auth was already enforced above.
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // ─── Load the request and verify ownership ──────────────────────────────
  const { data: req, error: reqErr } = await admin
    .from('clean_requests')
    .select('id, customer_id, zone, service_type, bedrooms, bathrooms, hours_per_session, hourly_rate, frequency, preferred_days, time_of_day, status, hidden')
    .eq('id', body.requestId)
    .single() as { data: any, error: any }

  if (reqErr || !req) {
    return NextResponse.json({ error: 'Request not found' }, { status: 404 })
  }

  // Only fire for active, non-hidden listings. If the customer publishes
  // and the listing has somehow already been hidden or moved to another
  // status, we skip silently (no error — caller doesn't need to know).
  if (req.status !== 'active' || req.hidden) {
    return NextResponse.json({ ok: true, skipped: 'not active', emailsSent: 0 })
  }

  // Ownership check — caller must own the listing (or be admin)
  const { data: callerProfile } = await admin
    .from('profiles').select('role').eq('id', user.id).single() as { data: { role: string | null } | null }
  const isAdmin = callerProfile?.role === 'admin'

  if (!isAdmin) {
    const { data: customer } = await admin
      .from('customers').select('id').eq('profile_id', user.id).single() as { data: { id: string } | null }
    if (!customer || customer.id !== req.customer_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  if (!req.zone) {
    // Listing has no zone — nothing to match against. Soft fail.
    return NextResponse.json({ ok: true, skipped: 'no zone on listing', emailsSent: 0 })
  }

  // ─── Find approved cleaners whose zones include this listing's zone ──────
  // Postgres array containment via .contains() — finds rows where zones
  // array contains the given value. With <50 cleaners this is cheap; if
  // the cleaner pool grows we'd index zones with GIN.
  const { data: cleaners, error: cleanersErr } = await admin
    .from('cleaners')
    .select('id, profile_id, zones, job_notify, application_status')
    .eq('application_status', 'approved')
    .eq('job_notify', true)
    .contains('zones', [req.zone]) as { data: any[] | null, error: any }

  if (cleanersErr) {
    console.error('[cleaner-job-alert] cleaners fetch failed:', cleanersErr)
    return NextResponse.json({ error: 'Lookup failed' }, { status: 500 })
  }
  if (!cleaners || cleaners.length === 0) {
    return NextResponse.json({ ok: true, skipped: 'no eligible cleaners', emailsSent: 0 })
  }

  // ─── Filter out cleaners who've already been emailed about this request ──
  // Defensive — shouldn't happen since this fires on listing creation, but
  // protects against a customer hitting publish twice in rapid succession
  // (rare, but possible with double-click on slow connections).
  const cleanerIds = cleaners.map(c => c.id)
  const { data: alreadySent } = await admin
    .from('cleaner_job_alerts_sent')
    .select('cleaner_id')
    .eq('request_id', body.requestId)
    .in('cleaner_id', cleanerIds) as { data: { cleaner_id: string }[] | null }

  const alreadySentSet = new Set((alreadySent ?? []).map(r => r.cleaner_id))
  const cleanersToEmail = cleaners.filter(c => !alreadySentSet.has(c.id))

  if (cleanersToEmail.length === 0) {
    return NextResponse.json({ ok: true, skipped: 'all cleaners already notified', emailsSent: 0 })
  }

  // ─── Look up emails ──────────────────────────────────────────────────────
  const profileIds = cleanersToEmail.map(c => c.profile_id)
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, full_name, email')
    .in('id', profileIds) as { data: { id: string; full_name: string | null; email: string | null }[] | null }

  const profileMap = new Map((profiles ?? []).map(p => [p.id, p]))

  // ─── Build the job card once — same listing for everyone ─────────────────
  const card: JobAlertCard = {
    request_id: req.id,
    zone: req.zone,
    service_type: req.service_type,
    bedrooms: req.bedrooms,
    bathrooms: req.bathrooms,
    hours_per_session: req.hours_per_session,
    hourly_rate: req.hourly_rate,
    frequency: req.frequency,
    preferred_days: req.preferred_days,
    time_of_day: req.time_of_day,
  }

  // ─── Send emails in parallel + log dedupe rows on success ────────────────
  const sendResults = await Promise.allSettled(
    cleanersToEmail.map(async (cleaner) => {
      const profile = profileMap.get(cleaner.profile_id)
      if (!profile?.email) {
        return { cleanerId: cleaner.id, ok: false, reason: 'no_email' }
      }

      const firstName = (profile.full_name ?? 'there').trim().split(' ')[0]

      try {
        const { error: sendErr } = await resend.emails.send({
          from: 'Vouchee <cleaners@vouchee.co.uk>',
          to: profile.email,
          subject: '🧹 New job in your area',
          html: jobAlertHtml({ firstName, jobs: [card], appUrl: APP_URL }),
        })

        if (sendErr) {
          console.error(`[cleaner-job-alert] Send failed for ${profile.email}:`, sendErr)
          return { cleanerId: cleaner.id, ok: false, reason: 'send_failed' }
        }
        return { cleanerId: cleaner.id, ok: true }
      } catch (err: any) {
        console.error(`[cleaner-job-alert] Send threw for ${profile.email}:`, err?.message)
        return { cleanerId: cleaner.id, ok: false, reason: 'send_threw' }
      }
    })
  )

  // ─── Log dedupe rows for successful sends only ───────────────────────────
  // Failed sends don't get logged → next manual retry (e.g. customer
  // republishing, or admin force-firing) can still email them.
  const successfulCleanerIds = sendResults
    .filter((r): r is PromiseFulfilledResult<{ cleanerId: string; ok: boolean }> =>
      r.status === 'fulfilled' && r.value.ok)
    .map(r => r.value.cleanerId)

  let dedupeLogged = 0
  if (successfulCleanerIds.length > 0) {
    const dedupeRows = successfulCleanerIds.map(cleaner_id => ({
      cleaner_id,
      request_id: body.requestId!,
    }))

    const { error: insertErr } = await (admin.from('cleaner_job_alerts_sent') as any)
      .upsert(dedupeRows, { onConflict: 'cleaner_id,request_id', ignoreDuplicates: true })

    if (insertErr) {
      console.error('[cleaner-job-alert] Dedupe log insert failed:', insertErr)
    } else {
      dedupeLogged = dedupeRows.length
    }
  }

  return NextResponse.json({
    ok: true,
    cleanersChecked: cleaners.length,
    cleanersToEmail: cleanersToEmail.length,
    emailsSent: successfulCleanerIds.length,
    dedupeLogged,
  })
}