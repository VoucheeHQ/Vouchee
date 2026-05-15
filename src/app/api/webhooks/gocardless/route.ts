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

// Per-clean platform fee, mirrored from src/app/api/gocardless/confirm-switch/route.ts.
// Used by handlePaymentConfirmed to refund 1 × per-clean fee on the first
// successful payment of a switch-created subscription.
const PER_CLEAN_PENCE: Record<string, number> = {
  weekly: 999, fortnightly: 1499, monthly: 2499,
}

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
    case 'payments.confirmed':         return handlePaymentConfirmed(admin, ev)
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

// ─── payments.confirmed — auto-refund the "first clean discount" on switches ─
//
// When a customer switches cleaners, marketing promises "your first clean
// with a new cleaner will be discounted automatically" (see the email body
// in src/app/api/switch-cleaner/route.ts). The mechanic, owned entirely by
// this handler:
//
//   1. Identify the payment's subscription → clean_request
//   2. If the request was created via the switch flow (is_switch=true) AND
//      first_clean_discount_credited_at IS NULL, claim the credit with a
//      CAS update (single UPDATE ... IS NULL ... RETURNING id). The CAS
//      defends against two concurrent payments.confirmed events both
//      issuing a refund.
//   3. Call GoCardless POST /refunds against the just-confirmed payment for
//      1 × per-clean platform fee (capped at the payment's total amount so
//      monthly customers never receive more than they paid).
//   4. On refund failure (network, GC outage), back out the CAS lock so a
//      future payments.confirmed event for the SAME subscription can retry —
//      worst case the customer gets the discount on month 2 instead of
//      month 1, but they always get it without manual intervention. Admin
//      gets an alert email each time a refund fails.
//   5. On success, persist the refunded amount + email the customer.
//
// One-off payments (pro-rata at switch time, ad-hoc top-ups) carry no
// `links.subscription`, so they bypass this handler entirely on the first
// guard.
async function handlePaymentConfirmed(admin: any, ev: any) {
  const subscriptionId: string | undefined = ev.links?.subscription
  const paymentId: string | undefined = ev.links?.payment
  if (!subscriptionId || !paymentId) {
    // One-off payments (e.g. pro-rata at switch time) — nothing to credit.
    return
  }

  const gcEnvironment = process.env.GOCARDLESS_ENVIRONMENT ?? 'sandbox'
  const gcBaseUrl = gcEnvironment === 'live'
    ? 'https://api.gocardless.com'
    : 'https://api-sandbox.gocardless.com'
  const gcToken = process.env.GOCARDLESS_ACCESS_TOKEN
  if (!gcToken) {
    console.error('[gc-webhook] payments.confirmed: GOCARDLESS_ACCESS_TOKEN missing — cannot refund')
    return
  }

  // Find the clean_request tied to this subscription. Service-role client
  // already (passed in), so RLS isn't in play.
  const { data: request } = await admin
    .from('clean_requests')
    .select('id, customer_id, frequency, is_switch, first_clean_discount_credited_at')
    .eq('gocardless_subscription_id', subscriptionId)
    .single() as { data: {
      id: string
      customer_id: string
      frequency: string | null
      is_switch: boolean | null
      first_clean_discount_credited_at: string | null
    } | null }

  if (!request) {
    console.log(`[gc-webhook] payments.confirmed: no matching request for sub ${subscriptionId}`)
    return
  }
  if (!request.is_switch) return                            // Not a switch — no discount owed
  if (request.first_clean_discount_credited_at) return      // Already credited

  // CAS lock: only the first event for this request gets through. The
  // `.is('first_clean_discount_credited_at', null)` clause is the
  // compare-and-swap; if another concurrent caller raced and won, our
  // update affects 0 rows and we bail.
  const claimAt = new Date().toISOString()
  const { data: claimed } = await admin
    .from('clean_requests')
    .update({ first_clean_discount_credited_at: claimAt } as any)
    .eq('id', request.id)
    .is('first_clean_discount_credited_at', null)
    .select('id')
    .maybeSingle() as { data: { id: string } | null }

  if (!claimed) {
    console.log(`[gc-webhook] payments.confirmed: CAS lost on discount credit for ${request.id}`)
    return
  }

  // Helper to release the lock so a future event can retry. Used on every
  // failure path past this point.
  const releaseLock = async (reason: string) => {
    try {
      await admin
        .from('clean_requests')
        .update({ first_clean_discount_credited_at: null } as any)
        .eq('id', request.id)
    } catch (e) {
      console.error(`[gc-webhook] failed to release CAS lock for ${request.id} (${reason}):`, e)
    }
  }

  // Look up the payment so we know its true amount (and so we can hand
  // GoCardless the total_amount_confirmation it requires on /refunds — a
  // sanity check to prevent a stale refund hitting a topped-up payment).
  let paymentTotalPence: number
  try {
    const paymentRes = await fetch(`${gcBaseUrl}/payments/${paymentId}`, {
      headers: {
        'Authorization': `Bearer ${gcToken}`,
        'GoCardless-Version': '2015-07-06',
        'Accept': 'application/json',
      },
    })
    if (!paymentRes.ok) {
      const errBody = await paymentRes.text()
      console.error(`[gc-webhook] payment lookup ${paymentId} failed: ${paymentRes.status} ${errBody}`)
      await releaseLock('payment lookup failed')
      await alertAdminRefundIssue({
        requestId: request.id,
        paymentId,
        subscriptionId,
        stage: 'payment lookup',
        detail: `${paymentRes.status}: ${errBody.slice(0, 400)}`,
      })
      return
    }
    const paymentData = await paymentRes.json()
    paymentTotalPence = paymentData.payments?.amount
    if (typeof paymentTotalPence !== 'number' || paymentTotalPence <= 0) {
      console.error(`[gc-webhook] payment ${paymentId} returned invalid amount:`, paymentData)
      await releaseLock('invalid payment amount')
      return
    }
  } catch (e: any) {
    console.error(`[gc-webhook] payment lookup ${paymentId} threw:`, e)
    await releaseLock('payment lookup threw')
    await alertAdminRefundIssue({
      requestId: request.id, paymentId, subscriptionId,
      stage: 'payment lookup (threw)', detail: e?.message ?? String(e),
    })
    return
  }

  // Calculate refund: 1 × per-clean fee for this frequency, capped at the
  // payment's total amount (so monthly customers — whose 1-clean fee equals
  // their monthly subscription — get exactly their month refunded, not more).
  const frequency = request.frequency ?? 'fortnightly'
  const perCleanPence = PER_CLEAN_PENCE[frequency] ?? PER_CLEAN_PENCE.fortnightly
  const refundPence = Math.min(perCleanPence, paymentTotalPence)

  // Issue the refund. Idempotency-Key uses the request id so even if this
  // handler re-runs after a partial failure, GoCardless returns the same
  // refund rather than creating a duplicate.
  let refundOk = false
  let refundDetail = ''
  try {
    const refundRes = await fetch(`${gcBaseUrl}/refunds`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${gcToken}`,
        'GoCardless-Version': '2015-07-06',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Idempotency-Key': `switch-discount-${request.id}`,
      },
      body: JSON.stringify({
        refunds: {
          amount: refundPence,
          total_amount_confirmation: paymentTotalPence,
          links: { payment: paymentId },
          metadata: {
            vouchee_request_id: request.id,
            type: 'switch_first_clean_discount',
          },
        },
      }),
    })
    if (refundRes.ok) {
      refundOk = true
    } else {
      refundDetail = `${refundRes.status}: ${(await refundRes.text()).slice(0, 400)}`
      console.error(`[gc-webhook] refund POST failed for ${request.id}: ${refundDetail}`)
    }
  } catch (e: any) {
    refundDetail = `threw: ${e?.message ?? String(e)}`
    console.error(`[gc-webhook] refund POST threw for ${request.id}:`, e)
  }

  if (!refundOk) {
    await releaseLock('refund failed')
    await alertAdminRefundIssue({
      requestId: request.id, paymentId, subscriptionId,
      stage: 'refund POST', detail: refundDetail,
    })
    return
  }

  // Persist the actual refund amount for audit + future customer support
  // lookups. Lock stays set (success path).
  await admin
    .from('clean_requests')
    .update({ first_clean_discount_amount_pence: refundPence } as any)
    .eq('id', request.id)

  // Notify the customer (best-effort — failure here doesn't undo the refund;
  // they'll see the credit on their statement either way).
  await notifyCustomerOfDiscount({
    admin, requestId: request.id, refundPence,
  })

  console.log(`[gc-webhook] issued switch discount refund: request=${request.id} amount=${refundPence}p payment=${paymentId}`)
}

// Admin alert when a refund fails — the lock has already been released so
// the next payment cycle's payments.confirmed will retry, but the admin
// should know in case they want to refund manually sooner.
async function alertAdminRefundIssue(opts: {
  requestId: string
  paymentId: string
  subscriptionId: string
  stage: string
  detail: string
}) {
  const { requestId, paymentId, subscriptionId, stage, detail } = opts
  const inner = `
    <p style="font-size:18px;font-weight:800;margin:0 0 8px;">⚠️ Switch discount refund failed</p>
    <p style="font-size:14px;color:#475569;margin:0 0 16px;line-height:1.6;">
      A first-clean discount refund attempt failed for a switch-created subscription.
      The CAS lock has been released, so the NEXT successful payment on this
      subscription will retry automatically. If you want to refund sooner, do it
      manually in the GoCardless dashboard.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
      <tr><td style="padding:6px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#475569;">Request ID</td><td style="text-align:right;font-family:monospace;font-size:12px;color:#0f172a;padding:6px 0;border-bottom:1px solid #f1f5f9;">${requestId}</td></tr>
      <tr><td style="padding:6px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#475569;">Payment ID</td><td style="text-align:right;font-family:monospace;font-size:12px;color:#0f172a;padding:6px 0;border-bottom:1px solid #f1f5f9;">${paymentId}</td></tr>
      <tr><td style="padding:6px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#475569;">Subscription ID</td><td style="text-align:right;font-family:monospace;font-size:12px;color:#0f172a;padding:6px 0;border-bottom:1px solid #f1f5f9;">${subscriptionId}</td></tr>
      <tr><td style="padding:6px 0;font-size:13px;color:#475569;">Stage</td><td style="text-align:right;font-size:13px;color:#0f172a;padding:6px 0;">${stage}</td></tr>
    </table>
    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:12px 14px;margin-bottom:16px;">
      <p style="margin:0;font-size:12px;color:#991b1b;font-family:monospace;white-space:pre-wrap;">${detail || 'no detail captured'}</p>
    </div>
    <p style="font-size:12px;color:#94a3b8;margin:0;">Self-healing on next payment cycle. No action required unless you want to refund manually.</p>
  `
  await sendEmail(ADMIN_EMAIL, '⚠️ [Admin] Switch discount refund failed', emailShell(inner, 'Refund failure alert'))
}

// Customer-facing notification of the discount credit. In-app notification
// is the primary channel; we keep this terse because the email is optional.
async function notifyCustomerOfDiscount(opts: {
  admin: any
  requestId: string
  refundPence: number
}) {
  const { admin, requestId, refundPence } = opts
  const amountStr = `£${(refundPence / 100).toFixed(2)}`
  try {
    // Look up customer email for the email side
    const { data: req } = await admin
      .from('clean_requests')
      .select('customer_id')
      .eq('id', requestId)
      .single() as { data: { customer_id: string } | null }
    if (!req) return

    await admin.from('notifications').insert({
      customer_id: req.customer_id,
      type: 'discount_credited',
      title: `✅ Your switch discount has been credited`,
      body: `We've refunded ${amountStr} as the first-clean discount on your new cleaner. It'll appear on your bank statement within a few days.`,
      link: '/customer/dashboard',
    } as any)

    const { data: customer } = await admin
      .from('customers').select('profile_id').eq('id', req.customer_id).single() as { data: { profile_id: string } | null }
    if (!customer) return
    const { data: profile } = await admin
      .from('profiles').select('email, full_name').eq('id', customer.profile_id).single() as { data: { email: string | null; full_name: string | null } | null }
    if (!profile?.email) return

    const firstName = profile.full_name?.split(' ')[0] ?? 'there'
    const inner = `
      <p style="font-size:22px;font-weight:800;margin:0 0 6px;">${amountStr} refunded — your switch discount</p>
      <p style="font-size:14px;color:#64748b;margin:0 0 16px;line-height:1.6;">
        Hi ${firstName}, we've credited ${amountStr} back to you as the first-clean discount on your new cleaner. It'll appear on your bank statement within a few days.
      </p>
      <p style="font-size:14px;color:#475569;margin:0 0 16px;line-height:1.6;">
        No action needed. Just our way of helping you find the right fit.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;"><tr><td align="center">
        <a href="${APP_URL}/customer/dashboard" style="display:inline-block;background:#0f172a;color:white;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px;">View dashboard →</a>
      </td></tr></table>
    `
    await sendEmail(profile.email, `✅ ${amountStr} refunded — your switch discount`, emailShell(inner, 'Switch discount credited'))
  } catch (e) {
    console.error('[gc-webhook] notifyCustomerOfDiscount failed (non-fatal):', e)
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

  // Increment the failure count atomically via the RPC defined in migration
  // 002. Two concurrent payments.failed events for the same request would
  // otherwise race on a read-modify-write and lose a count. Falls back to
  // the read-then-write path if the RPC isn't available yet (e.g. migration
  // not applied), preserving existing behaviour.
  let newFailureCount = (request.payment_failure_count ?? 0) + 1
  try {
    const { data: rpcCount, error: rpcErr } = await (admin as any)
      .rpc('increment_payment_failure', { p_request_id: request.id, p_grace_until: graceUntil })
    if (rpcErr) throw rpcErr
    if (typeof rpcCount === 'number') newFailureCount = rpcCount
  } catch (e: any) {
    console.warn('[gc-webhook] increment_payment_failure RPC unavailable — apply migration 002. Falling back to read-then-write.', e?.message ?? e)
    await (admin.from('clean_requests') as any)
      .update({
        payment_failed_at: new Date().toISOString(),
        payment_failure_count: newFailureCount,
        payment_grace_until: graceUntil,
      })
      .eq('id', request.id)
  }

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
    <p style="font-size:14px;color:#475569;margin:0 0 16px;">Failure count: ${newFailureCount}</p>
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