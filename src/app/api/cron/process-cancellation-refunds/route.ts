import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { cancellationRefundIssuedHtml, cancellationNoRefundHtml } from '@/lib/emails/cancellation-prorata-refund'

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/cron/process-cancellation-refunds   — daily at 06:00 UTC (see vercel.json)
//
// Finds clean_requests where the 30-day cancellation notice has ended and
// issues the pro-rata refund for the unused tail of the final billed cycle.
//
// Promise made to the customer (Customer T&C clause 11.2):
//   "The refund is calculated as (days from notice end to end of the billed
//    period / total days in the billed period) × monthly fee, and is issued
//    via GoCardless within 14 days of the notice period ending."
//
// Eligibility per clean_request:
//   - cancellation_completes_at IS NOT NULL
//   - cancellation_completes_at <= now()
//   - prorata_refund_processed_at IS NULL (idempotency)
//   - gocardless_subscription_id IS NOT NULL
//
// Refund algorithm:
//   1. Find the most recent confirmed/paid_out payment on the subscription
//   2. Compute its cycle: cycle_start = charge_date, cycle_end = charge_date + 1 month
//   3. If cycle_end <= notice_end: fully consumed, no refund (mark processed,
//      amount=0)
//   4. Otherwise: refund = round((cycle_end - notice_end) / cycle_days × amount)
//   5. POST /refunds with Idempotency-Key tied to the request id
//   6. On success: set prorata_refund_processed_at + amount_pence, email customer
//   7. On failure: leave processed_at NULL so the next day's cron retries.
//      Admin alert email each retry so failure is visible.
//
// Self-healing: a failed refund is retried daily until it succeeds or admin
// intervenes. Idempotency-Key means GC won't duplicate a refund even across
// retries.
// ─────────────────────────────────────────────────────────────────────────────

const CRON_SECRET = process.env.CRON_SECRET
const IS_PROD = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1'
const ADMIN_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL ?? 'support@vouchee.co.uk'

function gcConfig() {
  const env = process.env.GOCARDLESS_ENVIRONMENT ?? 'sandbox'
  return {
    baseUrl: env === 'live' ? 'https://api.gocardless.com' : 'https://api-sandbox.gocardless.com',
    token: process.env.GOCARDLESS_ACCESS_TOKEN!,
  }
}

// Add `months` calendar months to a date, in UTC. Handles month-end clamping
// (e.g. Jan 31 + 1 month = Feb 28/29) the way bill dates conventionally roll.
function addMonthsUtc(d: Date, months: number): Date {
  const out = new Date(d)
  const targetMonth = out.getUTCMonth() + months
  out.setUTCMonth(targetMonth)
  // Month-end clamp: if the day overflowed (e.g. Jan 31 → Mar 3 instead of
  // Feb 28), step back to the last day of the intended month.
  if (out.getUTCMonth() !== ((targetMonth % 12) + 12) % 12) {
    out.setUTCDate(0)
  }
  return out
}

interface GcPayment {
  id: string
  amount: number
  status: string
  charge_date: string
}

async function fetchSubscriptionPayments(baseUrl: string, token: string, subscriptionId: string): Promise<GcPayment[]> {
  // GC paginates payments; we sort newest first and only need the most
  // recent few, so a single page (limit 50) is fine for any realistic case.
  const res = await fetch(`${baseUrl}/payments?subscription=${encodeURIComponent(subscriptionId)}&limit=50`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'GoCardless-Version': '2015-07-06',
      Accept: 'application/json',
    },
  })
  if (!res.ok) throw new Error(`payments list ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const json = await res.json() as { payments?: GcPayment[] }
  return json.payments ?? []
}

interface RefundComputation {
  payment: GcPayment
  cycleStart: Date
  cycleEnd: Date
  unusedDays: number
  cycleDays: number
  refundPence: number
}

// Pick the payment whose billing cycle contains the notice-end date, then
// compute the unused-tail fraction. Returns null if no refundable payment
// is found (e.g. the last DD pre-dates the cancellation by more than a cycle,
// or every payment cycle ended before notice did).
function computeRefund(payments: GcPayment[], noticeEnd: Date): RefundComputation | null {
  // Only successful payments are refundable
  const eligible = payments.filter(p => p.status === 'confirmed' || p.status === 'paid_out')
  if (eligible.length === 0) return null

  // Newest first
  eligible.sort((a, b) => b.charge_date.localeCompare(a.charge_date))

  for (const p of eligible) {
    const cycleStart = new Date(`${p.charge_date}T00:00:00Z`)
    const cycleEnd = addMonthsUtc(cycleStart, 1)
    // The cycle that "contains" notice-end is the one where cycleStart <=
    // noticeEnd < cycleEnd. We refund the unused portion (cycleEnd - noticeEnd).
    if (cycleStart.getTime() <= noticeEnd.getTime() && noticeEnd.getTime() < cycleEnd.getTime()) {
      const cycleDays = Math.round((cycleEnd.getTime() - cycleStart.getTime()) / 86400000)
      const unusedDays = Math.round((cycleEnd.getTime() - noticeEnd.getTime()) / 86400000)
      if (unusedDays <= 0 || cycleDays <= 0) {
        return { payment: p, cycleStart, cycleEnd, unusedDays: 0, cycleDays, refundPence: 0 }
      }
      const refundPence = Math.floor((unusedDays / cycleDays) * p.amount)
      return { payment: p, cycleStart, cycleEnd, unusedDays, cycleDays, refundPence }
    }
  }
  return null
}

async function postRefund(baseUrl: string, token: string, paymentId: string, amount: number, totalAmount: number, requestId: string): Promise<{ ok: true; refundId: string } | { ok: false; error: string }> {
  try {
    const res = await fetch(`${baseUrl}/refunds`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'GoCardless-Version': '2015-07-06',
        'Content-Type': 'application/json',
        Accept: 'application/json',
        // Idempotency-Key keyed off the request id — GC will return the
        // same refund object on retry rather than create a duplicate.
        'Idempotency-Key': `prorata-cancel-${requestId}`,
      },
      body: JSON.stringify({
        refunds: {
          amount,
          total_amount_confirmation: totalAmount,
          links: { payment: paymentId },
          metadata: { vouchee_request_id: requestId, type: 'prorata_30day_cancellation' },
        },
      }),
    })
    if (!res.ok) {
      return { ok: false, error: `${res.status}: ${(await res.text()).slice(0, 400)}` }
    }
    const json = await res.json() as { refunds?: { id?: string } }
    return { ok: true, refundId: json.refunds?.id ?? '' }
  } catch (e: any) {
    return { ok: false, error: e?.message ?? 'unknown' }
  }
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

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const resend = new Resend(process.env.RESEND_API_KEY!)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.vouchee.co.uk'
  const { baseUrl: gcBaseUrl, token: gcToken } = gcConfig()
  const nowIso = new Date().toISOString()

  // ── 1. Candidate clean_requests ────────────────────────────────────────
  const { data: candidates, error: reqErr } = await admin
    .from('clean_requests')
    .select('id, customer_id, gocardless_subscription_id, cancellation_completes_at')
    .lte('cancellation_completes_at', nowIso)
    .is('prorata_refund_processed_at', null)
    .not('gocardless_subscription_id', 'is', null)
    .limit(100) as { data: Array<{ id: string; customer_id: string; gocardless_subscription_id: string | null; cancellation_completes_at: string }> | null; error: any }

  if (reqErr) {
    console.error('[prorata-cron] candidate query failed:', reqErr)
    return NextResponse.json({ error: reqErr.message }, { status: 500 })
  }
  if (!candidates || candidates.length === 0) {
    return NextResponse.json({ checked: 0, refunded: 0 })
  }

  let refunded = 0
  let zeroRefunds = 0
  const errors: string[] = []

  for (const req of candidates) {
    const noticeEnd = new Date(req.cancellation_completes_at)
    let computation: RefundComputation | null = null

    // ── 2. Look up subscription's payments ───────────────────────────────
    try {
      const payments = await fetchSubscriptionPayments(gcBaseUrl, gcToken, req.gocardless_subscription_id!)
      computation = computeRefund(payments, noticeEnd)
    } catch (e: any) {
      const msg = `request ${req.id}: payments fetch failed — ${e?.message ?? 'unknown'}`
      errors.push(msg)
      console.error(`[prorata-cron] ${msg}`)
      await alertAdmin(resend, req.id, 'payments fetch failed', e?.message ?? 'unknown', appUrl)
      continue
    }

    // ── 3. No refundable cycle (paid in full or no payments at all) ──────
    if (!computation || computation.refundPence <= 0) {
      // Mark processed with amount=0 so we don't keep scanning this row.
      await admin
        .from('clean_requests')
        .update({
          prorata_refund_processed_at: new Date().toISOString(),
          prorata_refund_amount_pence: 0,
        } as any)
        .eq('id', req.id)
      zeroRefunds++
      // Send a brief confirmation so the customer knows we processed the
      // cancellation even when no money moved.
      await sendCustomerEmail(admin, resend, req.id, appUrl, /* amountPence */ 0, /* noticeEnd */ noticeEnd, /* cycleEnd */ null).catch(e => {
        console.error(`[prorata-cron] no-refund email failed for ${req.id}:`, e)
      })
      continue
    }

    // ── 4. Issue the refund ──────────────────────────────────────────────
    const refundRes = await postRefund(
      gcBaseUrl, gcToken,
      computation.payment.id,
      computation.refundPence,
      computation.payment.amount,
      req.id,
    )

    if (!refundRes.ok) {
      const msg = `request ${req.id}: refund failed — ${refundRes.error}`
      errors.push(msg)
      console.error(`[prorata-cron] ${msg}`)
      await alertAdmin(resend, req.id, 'refund POST failed', refundRes.error, appUrl)
      // Leave processed_at NULL so tomorrow's cron retries
      continue
    }

    // ── 5. Mark processed + email customer ───────────────────────────────
    await admin
      .from('clean_requests')
      .update({
        prorata_refund_processed_at: new Date().toISOString(),
        prorata_refund_amount_pence: computation.refundPence,
      } as any)
      .eq('id', req.id)
    refunded++

    await sendCustomerEmail(admin, resend, req.id, appUrl, computation.refundPence, noticeEnd, computation.cycleEnd).catch(e => {
      console.error(`[prorata-cron] refund email failed for ${req.id} (non-fatal):`, e)
    })

    console.log(`[prorata-cron] refunded request ${req.id}: ${computation.refundPence}p of payment ${computation.payment.id}`)
  }

  return NextResponse.json({
    checked: candidates.length,
    refunded,
    zeroRefunds,
    errors: errors.length > 0 ? errors : undefined,
  })
}

async function alertAdmin(resend: Resend, requestId: string, stage: string, detail: string, appUrl: string) {
  try {
    await resend.emails.send({
      from: 'Vouchee Alerts <cleaners@vouchee.co.uk>',
      to: ADMIN_EMAIL,
      subject: '⚠️ [Admin] Pro-rata refund failed at notice end',
      html: `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f8fafc;padding:24px;">
<div style="max-width:600px;margin:0 auto;background:white;border:1px solid #e2e8f0;border-radius:16px;padding:28px;">
<p style="font-size:18px;font-weight:800;margin:0 0 8px;">⚠️ Pro-rata refund failed</p>
<p style="font-size:14px;color:#475569;margin:0 0 16px;line-height:1.6;">A 30-day cancellation reached notice end but the pro-rata refund couldn't be issued. The cron will retry tomorrow. If it keeps failing, refund manually in the GoCardless dashboard.</p>
<table style="margin-bottom:16px;width:100%;"><tr><td style="padding:6px 0;font-size:13px;color:#475569;">Request ID</td><td style="text-align:right;font-family:monospace;font-size:12px;">${requestId}</td></tr>
<tr><td style="padding:6px 0;font-size:13px;color:#475569;">Stage</td><td style="text-align:right;font-size:13px;">${stage}</td></tr></table>
<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:12px;margin-bottom:16px;"><p style="margin:0;font-size:12px;color:#991b1b;font-family:monospace;white-space:pre-wrap;">${detail}</p></div>
<a href="${appUrl}/admin/dashboard" style="display:inline-block;background:#0f172a;color:white;padding:10px 20px;border-radius:10px;text-decoration:none;font-weight:700;font-size:13px;">Admin dashboard →</a>
</div></body></html>`,
    })
  } catch (e) {
    console.error('[prorata-cron] admin alert send failed (non-fatal):', e)
  }
}

async function sendCustomerEmail(admin: any, resend: Resend, requestId: string, appUrl: string, amountPence: number, noticeEnd: Date, cycleEnd: Date | null) {
  const { data: req } = await admin
    .from('clean_requests').select('customer_id').eq('id', requestId).single() as { data: { customer_id: string } | null }
  if (!req) return
  const { data: customer } = await admin
    .from('customers').select('profile_id').eq('id', req.customer_id).single() as { data: { profile_id: string } | null }
  if (!customer) return
  const { data: profile } = await admin
    .from('profiles').select('email, full_name').eq('id', customer.profile_id).single() as { data: { email: string | null; full_name: string | null } | null }
  if (!profile?.email) return

  const firstName = profile.full_name?.split(' ')[0] ?? 'there'
  if (amountPence > 0 && cycleEnd) {
    await resend.emails.send({
      from: 'Vouchee <hello@vouchee.co.uk>',
      to: profile.email,
      subject: `Your Vouchee refund of £${(amountPence / 100).toFixed(2)} is on its way`,
      html: cancellationRefundIssuedHtml({ appUrl, firstName, amountPence, noticeEnd, cycleEnd }),
    })
  } else {
    await resend.emails.send({
      from: 'Vouchee <hello@vouchee.co.uk>',
      to: profile.email,
      subject: 'Your Vouchee subscription has fully ended',
      html: cancellationNoRefundHtml({ appUrl, firstName, noticeEnd }),
    })
  }
}
