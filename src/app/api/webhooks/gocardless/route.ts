import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import crypto from 'crypto'

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/webhooks/gocardless
//
// Receives webhook events from GoCardless. Verifies the signature, stores
// each event for idempotency, then processes the 7 actions we care about.
//
// IMPORTANT: This endpoint must respond 200 quickly. GoCardless retries
// non-200 responses, so any slow downstream work (email sends, DB updates)
// happens AFTER we've stored the event. If processing fails, we record
// processing_error and the event sits unprocessed — we'd write a separate
// retry cron later if this becomes a real problem.
//
// Event types handled:
//   payments.failed           — DD payment rejected by bank → 7-day grace
//   payments.paid_out         — money landed in our bank (informational)
//   payments.cancelled        — scheduled payment cancelled
//   mandates.cancelled        — customer revoked DD authorization
//   mandates.expired          — mandate hit 13-month dormancy
//   mandates.failed           — initial mandate setup failed
//   subscriptions.cancelled   — recurring subscription ended
//
// Setup:
//   1. Run migration-gocardless-webhooks.sql first
//   2. In GoCardless dashboard → Developers → Webhook endpoints, add
//      https://www.vouchee.co.uk/api/webhooks/gocardless
//   3. Copy the signing secret GoCardless gives you
//   4. Add GOCARDLESS_WEBHOOK_SECRET to Vercel env vars
//   5. Subscribe the endpoint to events: payments, mandates, subscriptions
// ─────────────────────────────────────────────────────────────────────────────

const resend = new Resend(process.env.RESEND_API_KEY)
const ADMIN_EMAIL = 'support@vouchee.co.uk'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.vouchee.co.uk'
const GRACE_DAYS = 7

// ─── Signature verification ───────────────────────────────────────────────────
// GoCardless signs the raw request body with HMAC-SHA256. The signature is
// hex-encoded in the Webhook-Signature header. We MUST compare against the
// raw bytes of the body — JSON.parse + re-stringify will fail validation.
function verifySignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature) return false
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
  // timingSafeEqual to avoid timing attacks
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
  } catch {
    return false
  }
}

// ─── Email helpers ────────────────────────────────────────────────────────────
// Kept inline for clarity. If they grow we extract to /lib/emails/.

function emailShell(inner: string, preheader: string) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Helvetica Neue',Arial,sans-serif;">
  <span style="display:none;">${preheader}</span>
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr><td style="padding:0 0 24px;font-size:18px;font-weight:700;color:#0f172a;">Vouchee</td></tr>
        <tr><td style="background:white;border-radius:20px;padding:36px;border:1px solid #e2e8f0;">${inner}</td></tr>
        <tr><td style="padding:24px 0;text-align:center;font-size:12px;color:#94a3b8;">© 2026 Vouchee · <a href="${APP_URL}" style="color:#94a3b8;">vouchee.co.uk</a></td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

async function sendEmail(to: string, subject: string, html: string, from = 'Vouchee <hello@vouchee.co.uk>') {
  try {
    const { error } = await resend.emails.send({ from, to, subject, html })
    if (error) console.error('[gc-webhook] email send failed:', error)
  } catch (e) {
    console.error('[gc-webhook] email send threw:', e)
  }
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const secret = process.env.GOCARDLESS_WEBHOOK_SECRET
  if (!secret) {
    console.error('[gc-webhook] GOCARDLESS_WEBHOOK_SECRET not set')
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  // Read raw body BEFORE parsing — needed for signature verification
  const rawBody = await request.text()
  const signature = request.headers.get('webhook-signature')

  if (!verifySignature(rawBody, signature, secret)) {
    console.warn('[gc-webhook] signature verification failed')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 498 })
  }

  let payload: any
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const events: any[] = payload.events ?? []
  if (!Array.isArray(events) || events.length === 0) {
    return NextResponse.json({ ok: true, processed: 0 })
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Process each event. Errors don't fail the whole batch — we log per-event
  // so GoCardless doesn't retry 100 events because one of them broke.
  let processedCount = 0
  for (const ev of events) {
    try {
      // Idempotency: insert with on conflict do nothing. If this event id
      // already exists, we skip processing.
      const { data: inserted } = await admin
        .from('gocardless_webhook_events')
        .insert({
          id: ev.id,
          resource_type: ev.resource_type,
          action: ev.action,
          links: ev.links ?? {},
          details: ev.details ?? {},
          raw_payload: ev,
        } as any)
        .select('id')
        .single() as { data: { id: string } | null }

      if (!inserted) {
        // Either insert failed or this event was already processed
        console.log(`[gc-webhook] event ${ev.id} already processed, skipping`)
        continue
      }

      await processEvent(admin, ev)

      await (admin.from('gocardless_webhook_events') as any)
        .update({ processed_at: new Date().toISOString() })
        .eq('id', ev.id)

      processedCount++
    } catch (err: any) {
      console.error(`[gc-webhook] processing event ${ev.id} failed:`, err)
      await (admin.from('gocardless_webhook_events') as any)
        .update({ processing_error: err?.message ?? String(err) })
        .eq('id', ev.id)
    }
  }

  return NextResponse.json({ ok: true, processed: processedCount, total: events.length })
}

// ─── Event router ─────────────────────────────────────────────────────────────

async function processEvent(admin: any, ev: any) {
  const key = `${ev.resource_type}.${ev.action}`
  switch (key) {
    case 'payments.failed':            return handlePaymentFailed(admin, ev)
    case 'payments.paid_out':          return handlePaymentPaidOut(admin, ev)
    case 'payments.cancelled':         return handlePaymentCancelled(admin, ev)
    case 'mandates.cancelled':         return handleMandateCancelled(admin, ev)
    case 'mandates.expired':           return handleMandateExpired(admin, ev)
    case 'mandates.failed':            return handleMandateFailed(admin, ev)
    case 'subscriptions.cancelled':    return handleSubscriptionCancelled(admin, ev)
    default:
      // Unhandled events are logged but acked — GoCardless docs explicitly
      // recommend acking unknown events to avoid retry storms.
      console.log(`[gc-webhook] unhandled event: ${key}`)
  }
}

// ─── Helper: lookup customer + cleaner from a mandate or subscription ─────────
// Most events reference a mandate or subscription. We look up the linked
// clean_request, then derive the customer + cleaner profiles for emails.

async function findRequestContext(admin: any, opts: {
  mandateId?: string
  subscriptionId?: string
}): Promise<{
  request: any
  customerEmail: string | null
  customerName: string | null
  cleanerEmail: string | null
  cleanerName: string | null
} | null> {
  let request: any = null

  if (opts.subscriptionId) {
    const { data } = await admin
      .from('clean_requests')
      .select('*')
      .eq('gocardless_subscription_id', opts.subscriptionId)
      .single()
    request = data
  }
  if (!request && opts.mandateId) {
    // mandate → customer.gocardless_mandate_id → customer → most recent active request
    const { data: cust } = await admin
      .from('customers')
      .select('id')
      .eq('gocardless_mandate_id', opts.mandateId)
      .single() as { data: { id: string } | null }
    if (cust) {
      const { data: reqs } = await admin
        .from('clean_requests')
        .select('*')
        .eq('customer_id', cust.id)
        .in('status', ['fulfilled', 'active', 'pending'])
        .order('created_at', { ascending: false })
        .limit(1) as { data: any[] | null }
      request = reqs?.[0] ?? null
    }
  }

  if (!request) return null

  // Customer profile
  const { data: cust } = await admin
    .from('customers').select('profile_id').eq('id', request.customer_id).single() as { data: { profile_id: string } | null }
  const { data: custProfile } = cust ? await admin
    .from('profiles').select('full_name, email').eq('id', cust.profile_id).single() as { data: { full_name: string | null; email: string | null } | null }
    : { data: null }

  // Cleaner profile (if assigned)
  let cleanerEmail: string | null = null
  let cleanerName: string | null = null
  if (request.assigned_cleaner_id) {
    const { data: cl } = await admin
      .from('cleaners').select('profile_id').eq('id', request.assigned_cleaner_id).single() as { data: { profile_id: string } | null }
    if (cl) {
      const { data: clProfile } = await admin
        .from('profiles').select('full_name, email').eq('id', cl.profile_id).single() as { data: { full_name: string | null; email: string | null } | null }
      cleanerEmail = clProfile?.email ?? null
      cleanerName = clProfile?.full_name ?? null
    }
  }

  return {
    request,
    customerEmail: custProfile?.email ?? null,
    customerName: custProfile?.full_name ?? null,
    cleanerEmail,
    cleanerName,
  }
}

// ─── payments.failed — 7-day grace, email customer + admin ────────────────────
async function handlePaymentFailed(admin: any, ev: any) {
  const ctx = await findRequestContext(admin, {
    mandateId: ev.links?.mandate,
    subscriptionId: ev.links?.subscription,
  })
  if (!ctx) {
    console.warn(`[gc-webhook] payments.failed for ${ev.id}: no matching request`)
    return
  }
  const { request, customerEmail, customerName, cleanerEmail } = ctx
  const customerFirstName = customerName?.split(' ')[0] ?? 'there'
  const graceUntil = new Date(Date.now() + GRACE_DAYS * 24 * 60 * 60 * 1000).toISOString()

  // Update the request — mark failed + start grace period
  await (admin.from('clean_requests') as any)
    .update({
      payment_failed_at: new Date().toISOString(),
      payment_failure_count: (request.payment_failure_count ?? 0) + 1,
      payment_grace_until: graceUntil,
    })
    .eq('id', request.id)

  // In-app notification for customer
  await (admin.from('notifications') as any).insert({
    customer_id: request.customer_id,
    type: 'payment_failed',
    title: '⚠️ Your payment failed',
    body: 'Please update your bank details — your service will pause if not resolved within 7 days.',
    link: '/customer/dashboard',
  })

  // Customer email
  if (customerEmail) {
    const cause = ev.details?.cause ?? 'unknown'
    const description = ev.details?.description ?? 'Your bank declined the payment.'
    const inner = `
      <p style="margin:0 0 6px;font-size:22px;font-weight:800;color:#0f172a;">⚠️ Your payment didn't go through</p>
      <p style="margin:0 0 16px;font-size:14px;color:#64748b;line-height:1.6;">
        Hi ${customerFirstName}, your latest Vouchee payment was returned by your bank.
      </p>
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:14px 16px;margin-bottom:20px;">
        <p style="margin:0;font-size:13px;color:#991b1b;line-height:1.6;"><strong>Reason from your bank:</strong> ${description} <em>(${cause})</em></p>
      </div>
      <p style="margin:0 0 16px;font-size:14px;color:#475569;line-height:1.6;">
        We'll automatically retry the payment in a few days. If it fails again, we'll need to pause your cleaner. You have 7 days to resolve this — please make sure your bank account has sufficient funds and your Direct Debit is still active.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;"><tr><td align="center">
        <a href="${APP_URL}/customer/dashboard" style="display:inline-block;background:#0f172a;color:white;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px;">View dashboard →</a>
      </td></tr></table>
      <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.5;text-align:center;">Need help? Reply to this email or contact <a href="mailto:support@vouchee.co.uk">support@vouchee.co.uk</a></p>
    `
    await sendEmail(customerEmail, '⚠️ Vouchee — payment failed, please update', emailShell(inner, 'Your bank returned the payment'))
  }

  // Admin alert — you want to know about every failure during launch
  const adminInner = `
    <p style="font-size:18px;font-weight:800;margin:0 0 8px;">🚨 Payment failed</p>
    <p style="font-size:14px;color:#475569;margin:0 0 16px;">Customer: ${customerName ?? 'unknown'} (${customerEmail ?? 'no email'})</p>
    <p style="font-size:14px;color:#475569;margin:0 0 16px;">Reason: ${ev.details?.cause ?? 'unknown'} — ${ev.details?.description ?? ''}</p>
    <p style="font-size:14px;color:#475569;margin:0 0 16px;">Failure count: ${(request.payment_failure_count ?? 0) + 1}</p>
    <p style="font-size:14px;color:#475569;margin:0 0 16px;">Grace until: ${graceUntil}</p>
    <p style="font-size:13px;color:#94a3b8;margin:0;">Request ID: ${request.id}</p>
  `
  await sendEmail(ADMIN_EMAIL, `[Admin] Payment failed — ${customerName}`, emailShell(adminInner, 'Payment failure alert'))
}

// ─── payments.paid_out — informational, log only ──────────────────────────────
async function handlePaymentPaidOut(admin: any, ev: any) {
  // Could be expanded later for accounting integrations. For now, the
  // webhook event row itself is the audit trail.
  console.log(`[gc-webhook] payment paid out: ${ev.links?.payment}`)
}

// ─── payments.cancelled — admin only ──────────────────────────────────────────
async function handlePaymentCancelled(admin: any, ev: any) {
  const ctx = await findRequestContext(admin, {
    mandateId: ev.links?.mandate,
    subscriptionId: ev.links?.subscription,
  })
  const customerName = ctx?.customerName ?? 'unknown'
  const inner = `
    <p style="font-size:18px;font-weight:800;margin:0 0 8px;">Payment cancelled</p>
    <p style="font-size:14px;color:#475569;margin:0 0 16px;">Customer: ${customerName}</p>
    <p style="font-size:14px;color:#475569;margin:0 0 16px;">Payment: ${ev.links?.payment ?? 'unknown'}</p>
    <p style="font-size:14px;color:#475569;margin:0 0 16px;">Cause: ${ev.details?.cause ?? 'unknown'}</p>
  `
  await sendEmail(ADMIN_EMAIL, `[Admin] Payment cancelled — ${customerName}`, emailShell(inner, 'Payment cancelled'))
}

// ─── mandates.cancelled — customer revoked DD, kill the subscription ──────────
async function handleMandateCancelled(admin: any, ev: any) {
  const ctx = await findRequestContext(admin, { mandateId: ev.links?.mandate })
  if (!ctx) return
  const { request, customerEmail, customerName, cleanerEmail, cleanerName } = ctx
  const customerFirstName = customerName?.split(' ')[0] ?? 'there'
  const cleanerFirstName = cleanerName?.split(' ')[0] ?? 'there'

  // Cancel the request
  await (admin.from('clean_requests') as any)
    .update({ status: 'cancelled' })
    .eq('id', request.id)

  // Clear the customer's mandate reference
  await (admin.from('customers') as any)
    .update({ gocardless_mandate_id: null })
    .eq('id', request.customer_id)

  // Customer email
  if (customerEmail) {
    const inner = `
      <p style="font-size:22px;font-weight:800;margin:0 0 6px;">Your Direct Debit was cancelled</p>
      <p style="font-size:14px;color:#64748b;margin:0 0 16px;line-height:1.6;">
        Hi ${customerFirstName}, your Direct Debit with Vouchee has been cancelled by you or your bank. Your cleaning service has stopped.
      </p>
      <p style="font-size:14px;color:#475569;margin:0 0 16px;line-height:1.6;">
        If this was a mistake, you can post a new listing and set up Direct Debit again at any time.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;"><tr><td align="center">
        <a href="${APP_URL}/customer/dashboard" style="display:inline-block;background:#0f172a;color:white;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px;">View dashboard →</a>
      </td></tr></table>
    `
    await sendEmail(customerEmail, 'Your Vouchee Direct Debit was cancelled', emailShell(inner, 'Direct Debit cancelled'))
  }

  // Cleaner email
  if (cleanerEmail) {
    const inner = `
      <p style="font-size:22px;font-weight:800;margin:0 0 6px;">Update from ${customerFirstName}</p>
      <p style="font-size:14px;color:#64748b;margin:0 0 16px;line-height:1.6;">
        Hi ${cleanerFirstName}, ${customerFirstName} has cancelled their Direct Debit with Vouchee, so their service has ended.
      </p>
      <p style="font-size:14px;color:#475569;margin:0 0 16px;line-height:1.6;">
        We understand this isn't easy to hear. There's no fault assigned — sometimes circumstances change. New jobs come up regularly in your area.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;"><tr><td align="center">
        <a href="${APP_URL}/jobs" style="display:inline-block;background:#0f172a;color:white;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px;">Browse jobs →</a>
      </td></tr></table>
    `
    await sendEmail(cleanerEmail, `An update about your Vouchee customer`, emailShell(inner, 'Customer cancelled'))
  }

  // Admin alert
  const adminInner = `
    <p style="font-size:18px;font-weight:800;margin:0 0 8px;">Mandate cancelled</p>
    <p style="font-size:14px;color:#475569;margin:0 0 8px;">Customer: ${customerName ?? 'unknown'}</p>
    <p style="font-size:14px;color:#475569;margin:0 0 8px;">Cleaner notified: ${cleanerName ?? 'none assigned'}</p>
    <p style="font-size:14px;color:#475569;margin:0;">Cause: ${ev.details?.cause ?? 'unknown'} — ${ev.details?.description ?? ''}</p>
  `
  await sendEmail(ADMIN_EMAIL, `[Admin] Mandate cancelled — ${customerName}`, emailShell(adminInner, 'Mandate cancelled'))
}

// ─── mandates.expired — 13-month dormancy ─────────────────────────────────────
async function handleMandateExpired(admin: any, ev: any) {
  const ctx = await findRequestContext(admin, { mandateId: ev.links?.mandate })
  if (!ctx) return
  const { request, customerEmail, customerName } = ctx
  const customerFirstName = customerName?.split(' ')[0] ?? 'there'

  // Clear the mandate so a new one will be required
  await (admin.from('customers') as any)
    .update({ gocardless_mandate_id: null })
    .eq('id', request.customer_id)

  if (customerEmail) {
    const inner = `
      <p style="font-size:22px;font-weight:800;margin:0 0 6px;">Your Direct Debit has expired</p>
      <p style="font-size:14px;color:#64748b;margin:0 0 16px;line-height:1.6;">
        Hi ${customerFirstName}, your Vouchee Direct Debit has expired due to inactivity. To resume cleaning service, please post a new listing — setting up Direct Debit takes about 30 seconds.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;"><tr><td align="center">
        <a href="${APP_URL}/customer/dashboard" style="display:inline-block;background:#0f172a;color:white;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px;">View dashboard →</a>
      </td></tr></table>
    `
    await sendEmail(customerEmail, 'Your Vouchee Direct Debit has expired', emailShell(inner, 'Direct Debit expired'))
  }
}

// ─── mandates.failed — initial DD setup rejected ──────────────────────────────
async function handleMandateFailed(admin: any, ev: any) {
  const ctx = await findRequestContext(admin, { mandateId: ev.links?.mandate })
  if (!ctx) return
  const { customerEmail, customerName } = ctx
  const customerFirstName = customerName?.split(' ')[0] ?? 'there'

  if (customerEmail) {
    const inner = `
      <p style="font-size:22px;font-weight:800;margin:0 0 6px;">Direct Debit setup failed</p>
      <p style="font-size:14px;color:#64748b;margin:0 0 16px;line-height:1.6;">
        Hi ${customerFirstName}, your Direct Debit couldn't be set up. This is usually because of a typo in your bank details, or your bank doesn't support Direct Debit on that account.
      </p>
      <p style="font-size:14px;color:#475569;margin:0 0 16px;line-height:1.6;">
        Please go back to your dashboard and try again — most issues resolve on a second attempt.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;"><tr><td align="center">
        <a href="${APP_URL}/customer/dashboard" style="display:inline-block;background:#0f172a;color:white;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px;">Try again →</a>
      </td></tr></table>
      <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.5;text-align:center;">Stuck? Contact <a href="mailto:support@vouchee.co.uk">support@vouchee.co.uk</a></p>
    `
    await sendEmail(customerEmail, 'Direct Debit setup failed — please try again', emailShell(inner, 'Direct Debit setup failed'))
  }
}

// ─── subscriptions.cancelled — usually our own action, but log + verify ───────
async function handleSubscriptionCancelled(admin: any, ev: any) {
  const ctx = await findRequestContext(admin, { subscriptionId: ev.links?.subscription })
  if (!ctx) return
  const { request, customerName } = ctx

  // If our DB still shows this request as fulfilled but GC says cancelled,
  // that's a desync — usually fine (we'd already have cancelled the
  // subscription via API in our own code) but worth a check.
  if (request.status === 'fulfilled') {
    await (admin.from('clean_requests') as any)
      .update({ status: 'cancelled' })
      .eq('id', request.id)

    const adminInner = `
      <p style="font-size:18px;font-weight:800;margin:0 0 8px;">Subscription cancelled outside our app</p>
      <p style="font-size:14px;color:#475569;margin:0 0 16px;">Customer: ${customerName ?? 'unknown'}</p>
      <p style="font-size:14px;color:#475569;margin:0 0 16px;">Status was 'fulfilled', now updated to 'cancelled'.</p>
      <p style="font-size:13px;color:#94a3b8;">Cause: ${ev.details?.cause ?? 'unknown'}</p>
    `
    await sendEmail(ADMIN_EMAIL, `[Admin] Subscription cancelled outside app`, emailShell(adminInner, 'Subscription desync'))
  }
}