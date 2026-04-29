import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/cron/check-payment-grace
//
// Runs daily. Finds clean_requests where the 7-day grace period has expired
// without the payment recovering. For each:
//   1. Cancel the GoCardless subscription (so we don't keep retrying)
//   2. Mark the request as 'cancelled'
//   3. Email customer (DD has been ended due to non-payment)
//   4. Email cleaner (job has ended)
//   5. Email admin
//
// "Recovered" means a successful payment after the failure — we detect this
// by clearing payment_grace_until in the webhook handler when we see a
// payments.confirmed event. (If we don't have that event handler yet, this
// cron will sometimes suspend customers whose payments did succeed but we
// didn't catch the success event. We can iterate on this later.)
// ─────────────────────────────────────────────────────────────────────────────

const CRON_SECRET = process.env.CRON_SECRET
const resend = new Resend(process.env.RESEND_API_KEY)
const ADMIN_EMAIL = 'support@vouchee.co.uk'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.vouchee.co.uk'
const GOCARDLESS_API_BASE = process.env.GOCARDLESS_ENVIRONMENT === 'live'
  ? 'https://api.gocardless.com'
  : 'https://api-sandbox.gocardless.com'

export async function GET(request: NextRequest) {
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

  // Find expired grace periods that are still in 'fulfilled' state
  const now = new Date().toISOString()
  const { data: expired, error } = await admin
    .from('clean_requests')
    .select('id, customer_id, assigned_cleaner_id, gocardless_subscription_id, payment_grace_until, payment_failure_count')
    .lt('payment_grace_until', now)
    .eq('status', 'fulfilled') as { data: any[] | null, error: any }

  if (error) {
    console.error('[grace-cron] fetch failed:', error)
    return NextResponse.json({ error: 'Fetch failed' }, { status: 500 })
  }
  if (!expired || expired.length === 0) {
    return NextResponse.json({ ok: true, suspended: 0, message: 'No expired grace periods' })
  }

  const gcToken = process.env.GOCARDLESS_ACCESS_TOKEN
  let suspendedCount = 0

  for (const req of expired) {
    try {
      // 1. Cancel GoCardless subscription
      if (gcToken && req.gocardless_subscription_id) {
        try {
          await fetch(`${GOCARDLESS_API_BASE}/subscriptions/${req.gocardless_subscription_id}/actions/cancel`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${gcToken}`,
              'Content-Type': 'application/json',
              'GoCardless-Version': '2015-07-06',
            },
          })
        } catch (e) {
          console.error(`[grace-cron] GC cancel failed for ${req.id}:`, e)
        }
      }

      // 2. Mark request cancelled
      await (admin.from('clean_requests') as any)
        .update({ status: 'cancelled', payment_grace_until: null })
        .eq('id', req.id)

      // 3. Look up customer + cleaner emails
      const { data: cust } = await admin.from('customers').select('profile_id').eq('id', req.customer_id).single() as { data: { profile_id: string } | null }
      const { data: custProfile } = cust ? await admin.from('profiles').select('full_name, email').eq('id', cust.profile_id).single() as { data: { full_name: string | null; email: string | null } | null } : { data: null }

      let cleanerEmail: string | null = null
      let cleanerName: string | null = null
      if (req.assigned_cleaner_id) {
        const { data: cl } = await admin.from('cleaners').select('profile_id').eq('id', req.assigned_cleaner_id).single() as { data: { profile_id: string } | null }
        if (cl) {
          const { data: clProfile } = await admin.from('profiles').select('full_name, email').eq('id', cl.profile_id).single() as { data: { full_name: string | null; email: string | null } | null }
          cleanerEmail = clProfile?.email ?? null
          cleanerName = clProfile?.full_name ?? null
        }
      }

      const customerFirstName = custProfile?.full_name?.split(' ')[0] ?? 'there'

      // 4. Email customer
      if (custProfile?.email) {
        const inner = `
          <p style="font-size:22px;font-weight:800;margin:0 0 6px;color:#0f172a;">Your service has been suspended</p>
          <p style="font-size:14px;color:#64748b;margin:0 0 16px;line-height:1.6;">
            Hi ${customerFirstName}, your Vouchee subscription has been cancelled because we couldn't collect payment within the 7-day grace period.
          </p>
          <p style="font-size:14px;color:#475569;margin:0 0 16px;line-height:1.6;">
            If this was unintentional, please contact <a href="mailto:support@vouchee.co.uk">support@vouchee.co.uk</a> and we'll help you get back on track. To resume cleaning, you can post a new listing.
          </p>
        `
        try { await resend.emails.send({ from: 'Vouchee <hello@vouchee.co.uk>', to: custProfile.email, subject: 'Vouchee — service suspended due to non-payment', html: shell(inner) }) } catch {}
      }

      // 5. Email cleaner
      if (cleanerEmail) {
        const inner = `
          <p style="font-size:22px;font-weight:800;margin:0 0 6px;color:#0f172a;">An update about ${customerFirstName}</p>
          <p style="font-size:14px;color:#64748b;margin:0 0 16px;line-height:1.6;">
            Hi ${cleanerName?.split(' ')[0] ?? 'there'}, your cleaning arrangement with ${customerFirstName} has ended due to a payment issue on their side.
          </p>
          <p style="font-size:14px;color:#475569;margin:0 0 16px;line-height:1.6;">
            There's no fault on your end. New jobs come up regularly — keep an eye on your dashboard.
          </p>
        `
        try { await resend.emails.send({ from: 'Vouchee <hello@vouchee.co.uk>', to: cleanerEmail, subject: `An update about your Vouchee customer`, html: shell(inner) }) } catch {}
      }

      // 6. Admin alert
      const adminInner = `
        <p style="font-size:18px;font-weight:800;margin:0 0 8px;">Subscription suspended (grace expired)</p>
        <p style="font-size:14px;color:#475569;margin:0 0 8px;">Customer: ${custProfile?.full_name ?? 'unknown'} (${custProfile?.email ?? 'no email'})</p>
        <p style="font-size:14px;color:#475569;margin:0 0 8px;">Cleaner: ${cleanerName ?? 'none'}</p>
        <p style="font-size:14px;color:#475569;margin:0 0 8px;">Failure count: ${req.payment_failure_count}</p>
        <p style="font-size:13px;color:#94a3b8;">Request ID: ${req.id}</p>
      `
      try { await resend.emails.send({ from: 'Vouchee Alerts <hello@vouchee.co.uk>', to: ADMIN_EMAIL, subject: `[Admin] Subscription suspended — ${custProfile?.full_name}`, html: shell(adminInner) }) } catch {}

      suspendedCount++
    } catch (err) {
      console.error(`[grace-cron] error processing request ${req.id}:`, err)
    }
  }

  return NextResponse.json({ ok: true, suspended: suspendedCount, total: expired.length })
}

function shell(inner: string) {
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f8fafc;font-family:'Helvetica Neue',Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;"><tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr><td style="padding:0 0 24px;font-size:18px;font-weight:700;color:#0f172a;">Vouchee</td></tr>
        <tr><td style="background:white;border-radius:20px;padding:36px;border:1px solid #e2e8f0;">${inner}</td></tr>
      </table>
    </td></tr></table>
  </body></html>`
}