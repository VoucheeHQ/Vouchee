import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createBrowserClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY!)

const ZONE_LABELS: Record<string, string> = {
  central_south_east: 'Central / South East',
  north_west: 'North West',
  north_east_roffey: 'North East / Roffey',
  south_west: 'South West',
  warnham_north: 'Warnham / North',
  broadbridge_heath: 'Broadbridge Heath',
  mannings_heath: 'Mannings Heath',
  faygate_kilnwood_vale: 'Faygate / Kilnwood Vale',
  christs_hospital: "Christ's Hospital",
  southwater: 'Southwater',
}

// ─── Cooling-off helpers ──────────────────────────────────────────────────────
//
// A switch (Option 1: "Find replacement first") creates a new clean_requests
// row that points at the previous one via switch_from_request_id, but the
// underlying contract — and therefore the cooling-off anchor — is the
// original/root row. We walk back through switch_from_request_id to find it.
//
// Falls back gracefully: if a row in the chain is missing, we treat the
// most recent one we successfully fetched as the root. This means an older
// pre-migration fulfilled request (no fulfilled_at / cooling_off_until)
// will simply route to Branch C, the existing 30-day notice flow.
async function getRootCleanRequest(supabaseAdmin: any, requestId: string): Promise<any | null> {
  let current: any = null
  let nextId: string | null = requestId
  const MAX_HOPS = 10 // upper bound on switch chain length
  let safety = MAX_HOPS

  while (nextId && safety > 0) {
    // TS7022 fix: capture the result with explicit typing first, then
    // destructure. Inline destructuring inside the loop hits a recursive
    // type-inference edge case in TypeScript that fails Vercel builds.
    const result: { data: any; error: any } = await supabaseAdmin
      .from('clean_requests')
      .select('id, switch_from_request_id, fulfilled_at, cooling_off_until, cooling_off_consent_given, start_date, frequency')
      .eq('id', nextId)
      .single()

    const data = result.data
    const error = result.error

    if (error || !data) break

    current = data
    nextId = data.switch_from_request_id
    safety--
  }

  // Log loudly if we hit the cap — chains over 10 hops are almost certainly
  // either a cycle in switch_from_request_id or a customer who has switched
  // cleaners >10 times for one logical job. Either way, cooling-off and
  // refund math downstream may resolve to the wrong root; admin should
  // intervene.
  if (safety === 0 && nextId) {
    console.warn(`[cancel-subscription] switch chain capped at ${MAX_HOPS} hops for request ${requestId} — possible cycle or unusually long history. Manual review recommended.`)
  }

  return current
}

// Per-clean platform fee, mirrors confirm-switch and the referral-credits
// cron. Used by Branch B's pro-rata math: refund_owed = paid - cleans × fee.
const PER_CLEAN_PENCE: Record<string, number> = {
  weekly: 999, fortnightly: 1499, monthly: 2499,
}

// Count cleans delivered since start_date based on the agreed frequency.
// The first clean happens AT start_date, then every intervalDays after.
// This is an estimate — actual cleaner attendance is not tracked at session
// level — but it's deterministic, defensible, and matches what the customer
// signed up for. Edge cases (cleaner no-show, etc.) are admin-handled via
// the existing complaint flow, not this calculation.
function countCleansDone(startDate: string | null, frequency: string | null, now: Date): number {
  if (!startDate) return 0
  const start = new Date(`${startDate}T00:00:00Z`)
  if (now.getTime() < start.getTime()) return 0
  const intervalDays = frequency === 'weekly' ? 7 : frequency === 'fortnightly' ? 14 : 30
  const elapsedDays = Math.floor((now.getTime() - start.getTime()) / 86400000)
  return 1 + Math.floor(elapsedDays / intervalDays)
}

// Branch B (cooling-off + service-began) automated refund. Steps:
//   1. List all payments on the mandate
//   2. Cancel pending payments (no money moved — just stops future flow)
//   3. Sum confirmed/paid_out payments → totalPaid
//   4. Compute refundOwed = max(0, totalPaid - cleansDone × perCleanPence)
//   5. Refund the owed amount via a "waterfall" across paid payments newest
//      first, capped at each payment's amount, with per-payment Idempotency-
//      Keys so retries can never double-refund
//   6. Return totals + any errors so the caller can decide success/fallback
//
// On total-failure (e.g. payments list call itself fails), the caller falls
// back to the legacy manual-review flow so cancellation never blocks on a
// GC outage.
async function processCoolingOffPartialRefund(
  gcBaseUrl: string,
  gcToken: string,
  mandateId: string,
  requestId: string,
  cleansCount: number,
  perCleanPence: number,
): Promise<{ totalPaidPence: number; refundOwedPence: number; refundedPence: number; firstRefundId: string | null; errors: string[]; fatal: boolean }> {
  const errors: string[] = []
  let totalPaidPence = 0
  let refundedPence = 0
  let firstRefundId: string | null = null

  try {
    const listRes = await fetch(`${gcBaseUrl}/payments?mandate=${mandateId}&limit=500`, {
      headers: {
        'Authorization': `Bearer ${gcToken}`,
        'GoCardless-Version': '2015-07-06',
        'Accept': 'application/json',
      },
    })

    if (!listRes.ok) {
      const errText = await listRes.text()
      console.error('GC payments list failed (Branch B):', errText)
      errors.push('payments_list_failed')
      return { totalPaidPence: 0, refundOwedPence: 0, refundedPence: 0, firstRefundId: null, errors, fatal: true }
    }

    const listData = await listRes.json()
    const payments: any[] = listData.payments ?? []

    const pending = payments.filter(p => p.status === 'pending_customer_approval' || p.status === 'pending_submission')
    const paid = payments.filter(p => p.status === 'submitted' || p.status === 'confirmed' || p.status === 'paid_out')

    for (const p of paid) totalPaidPence += p.amount

    const fairCharge = cleansCount * perCleanPence
    const refundOwedPence = Math.max(0, totalPaidPence - fairCharge)

    // Cancel anything still pending — no money to refund but stops the bleed
    for (const p of pending) {
      try {
        const cancelRes = await fetch(`${gcBaseUrl}/payments/${p.id}/actions/cancel`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${gcToken}`, 'GoCardless-Version': '2015-07-06', 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({ data: {} }),
        })
        if (!cancelRes.ok) {
          console.error(`Cancel pending payment ${p.id} failed:`, await cancelRes.text())
          errors.push(`cancel_failed_${p.id}`)
        }
      } catch (e: any) {
        console.error(`Cancel pending payment ${p.id} threw:`, e?.message)
        errors.push(`cancel_threw_${p.id}`)
      }
    }

    // Waterfall refund: newest payment first, cap at payment.amount, decrement
    // remaining until we've refunded the full owed amount or run out of paid
    // payments. Each refund POST has a unique Idempotency-Key tied to the
    // request + payment, so a retry can never duplicate.
    if (refundOwedPence > 0) {
      paid.sort((a, b) => String(b.charge_date).localeCompare(String(a.charge_date)))
      let remaining = refundOwedPence
      for (const p of paid) {
        if (remaining <= 0) break
        const refundFromThis = Math.min(remaining, p.amount)
        try {
          const refundRes = await fetch(`${gcBaseUrl}/refunds`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${gcToken}`,
              'GoCardless-Version': '2015-07-06',
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'Idempotency-Key': `prorata-partial-${requestId}-${p.id}`,
            },
            body: JSON.stringify({
              refunds: {
                amount: refundFromThis,
                total_amount_confirmation: p.amount,
                links: { payment: p.id },
                metadata: { vouchee_request_id: requestId, type: 'cooling_off_partial' },
              },
            }),
          })
          if (refundRes.ok) {
            const refundData = await refundRes.json()
            refundedPence += refundFromThis
            firstRefundId = firstRefundId ?? refundData.refunds?.id ?? null
            remaining -= refundFromThis
            console.log(`Refunded payment ${p.id} (£${(refundFromThis / 100).toFixed(2)} of £${(p.amount / 100).toFixed(2)})`)
          } else {
            const errText = await refundRes.text()
            console.error(`Refund payment ${p.id} failed:`, errText)
            errors.push(`refund_failed_${p.id}`)
          }
        } catch (e: any) {
          console.error(`Refund payment ${p.id} threw:`, e?.message)
          errors.push(`refund_threw_${p.id}`)
        }
      }
    }

    // Partial-failure is not fatal — caller can still send an email with the
    // partial amount and the admin can manually finish the rest.
    return { totalPaidPence, refundOwedPence, refundedPence, firstRefundId, errors, fatal: false }
  } catch (e: any) {
    console.error('processCoolingOffPartialRefund threw:', e?.message)
    errors.push('outer_threw')
    return { totalPaidPence, refundOwedPence: 0, refundedPence, firstRefundId, errors, fatal: true }
  }
}

// Lists all payments on a mandate and resolves them per cooling-off:
//   - pending_customer_approval / pending_submission → cancel (no money moved)
//   - submitted / confirmed / paid_out               → refund in full
//   - failed / cancelled / charged_back              → skip
// Returns { refundedPence, firstRefundId, errors[] }. Best-effort: a failure
// on any single payment is logged but does not stop the rest.
async function processCoolingOffRefunds(
  gcBaseUrl: string,
  gcToken: string,
  mandateId: string,
  requestId: string,
): Promise<{ refundedPence: number; firstRefundId: string | null; errors: string[] }> {
  const errors: string[] = []
  let refundedPence = 0
  let firstRefundId: string | null = null

  try {
    const listRes = await fetch(`${gcBaseUrl}/payments?mandate=${mandateId}&limit=500`, {
      headers: {
        'Authorization': `Bearer ${gcToken}`,
        'GoCardless-Version': '2015-07-06',
        'Accept': 'application/json',
      },
    })

    if (!listRes.ok) {
      const errText = await listRes.text()
      console.error('GC payments list failed:', errText)
      errors.push('payments_list_failed')
      return { refundedPence, firstRefundId, errors }
    }

    const listData = await listRes.json()
    const payments: any[] = listData.payments ?? []

    for (const p of payments) {
      const status = p.status as string
      const amount = p.amount as number
      const id = p.id as string

      if (status === 'pending_customer_approval' || status === 'pending_submission') {
        // Money hasn't moved — just cancel the payment
        try {
          const cancelRes = await fetch(`${gcBaseUrl}/payments/${id}/actions/cancel`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${gcToken}`,
              'GoCardless-Version': '2015-07-06',
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: JSON.stringify({ data: {} }),
          })
          if (!cancelRes.ok) {
            console.error(`Cancel pending payment ${id} failed:`, await cancelRes.text())
            errors.push(`cancel_failed_${id}`)
          } else {
            console.log(`Cancelled pending payment ${id} (£${(amount / 100).toFixed(2)})`)
          }
        } catch (e: any) {
          console.error(`Cancel pending payment ${id} threw:`, e?.message)
          errors.push(`cancel_threw_${id}`)
        }
      } else if (status === 'submitted' || status === 'confirmed' || status === 'paid_out') {
        // Money has moved (or is moving) — issue a refund
        try {
          const refundRes = await fetch(`${gcBaseUrl}/refunds`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${gcToken}`,
              'GoCardless-Version': '2015-07-06',
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'Idempotency-Key': `refund-${requestId}-${id}`,
            },
            body: JSON.stringify({
              refunds: {
                amount,
                total_amount_confirmation: amount,
                links: { payment: id },
                metadata: { vouchee_request_id: requestId, type: 'cooling_off' },
              },
            }),
          })
          if (!refundRes.ok) {
            console.error(`Refund payment ${id} failed:`, await refundRes.text())
            errors.push(`refund_failed_${id}`)
          } else {
            const refundData = await refundRes.json()
            refundedPence += amount
            firstRefundId = firstRefundId ?? refundData.refunds?.id ?? null
            console.log(`Refunded payment ${id} (£${(amount / 100).toFixed(2)})`)
          }
        } catch (e: any) {
          console.error(`Refund payment ${id} threw:`, e?.message)
          errors.push(`refund_threw_${id}`)
        }
      } else {
        // failed / cancelled / charged_back — nothing to do
        console.log(`Skipping payment ${id} (status: ${status})`)
      }
    }
  } catch (e: any) {
    console.error('processCoolingOffRefunds threw:', e?.message)
    errors.push('outer_threw')
  }

  return { refundedPence, firstRefundId, errors }
}

// ─── Email templates ──────────────────────────────────────────────────────────

// Cleaner email for the existing 30-day-notice flow (Branch C) — unchanged.
function buildCleanerCancellationEmail({ cleanerFirstName, customerFirstName, zone }: { cleanerFirstName: string; customerFirstName: string; zone: string }): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.vouchee.co.uk'
  const zoneLabel = ZONE_LABELS[zone] ?? zone
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:40px 16px;">
<tr><td align="center"><table width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;">
<tr><td style="background:#ffffff;padding:36px 40px 32px;text-align:center;border-radius:16px 16px 0 0;">
<img src="https://www.vouchee.co.uk/full-logo-black.png" width="260" height="60" alt="Vouchee" style="display:block;margin:0 auto 36px;max-width:100%;" />
<div style="font-size:28px;font-weight:800;color:#0f172a;letter-spacing:-0.5px;line-height:1.2;">Subscription update</div>
</td></tr>
<tr><td style="background:white;padding:36px 40px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 16px 16px;">
<p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 20px;">Hi ${cleanerFirstName},</p>
<p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 20px;">
We wanted to let you know that <strong>${customerFirstName}</strong> (${zoneLabel}) has informed Vouchee that they no longer need cleaning services and their Direct Debit has been cancelled.
</p>
<div style="background:#eff6ff;border:1.5px solid #bfdbfe;border-radius:12px;padding:22px 28px;margin-bottom:24px;">
<div style="font-size:13px;font-weight:800;color:#1e40af;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:10px;">📋 30-day notice period</div>
<p style="font-size:14px;color:#1e3a8a;line-height:1.7;margin:0;">
As per our terms, Vouchee operates on a <strong>30-day notice period</strong>. We recommend reaching out to ${customerFirstName} directly to confirm whether they still require cleans during this time — some customers continue with their cleaner through the notice period.
</p>
</div>
<div style="background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:12px;padding:22px 28px;margin-bottom:28px;">
<div style="font-size:13px;font-weight:800;color:#15803d;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:10px;">⭐ Ask for a review</div>
<p style="font-size:14px;color:#166534;line-height:1.7;margin:0 0 16px;">
Once you've completed any remaining cleans, we'd love it if you could ask ${customerFirstName} to leave you a review on Vouchee. Reviews help you stand out to future customers and are a great way to build your reputation on the platform.
</p>
<a href="${appUrl}/cleaner/dashboard" style="display:inline-block;background:#16a34a;color:white;font-size:13px;font-weight:700;padding:11px 24px;border-radius:8px;text-decoration:none;">View your dashboard →</a>
</div>
<p style="font-size:14px;color:#64748b;line-height:1.7;margin:0 0 20px;">
Thank you for everything you've done for ${customerFirstName} — we hope to match you with new customers in your area soon.
</p>
<p style="font-size:12px;color:#94a3b8;text-align:center;margin:0;line-height:1.6;">
Questions? Reply to this email or contact us at <a href="mailto:cleaners@vouchee.co.uk" style="color:#94a3b8;">cleaners@vouchee.co.uk</a>
</p>
</td></tr>
<tr><td style="padding:24px 0;text-align:center;">
<p style="margin:0;font-size:12px;color:#94a3b8;">© 2026 Vouchee · <a href="https://www.vouchee.co.uk" style="color:#94a3b8;text-decoration:none;">vouchee.co.uk</a></p>
</td></tr>
</table></td></tr>
</table></body></html>`
}

// Customer email for Branch A — full refund within 14 days
function buildCoolingOffFullRefundEmail({ customerFirstName, refundedPence, refundEnd }: { customerFirstName: string; refundedPence: number; refundEnd: string }): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.vouchee.co.uk'
  const amountLabel = `£${(refundedPence / 100).toFixed(2)}`
  const refundCopy = refundedPence > 0
    ? `We'll refund <strong>${amountLabel}</strong> to the account your Direct Debit was set up from. The refund will arrive by <strong>${refundEnd}</strong>, in line with the statutory 14-day deadline.`
    : `No payments had been collected yet, so there's nothing to refund — your Direct Debit and any pending payments have been cancelled.`
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:40px 16px;">
<tr><td align="center"><table width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;">
<tr><td style="background:#ffffff;padding:36px 40px 32px;text-align:center;border-radius:16px 16px 0 0;">
<img src="https://www.vouchee.co.uk/full-logo-black.png" width="260" height="60" alt="Vouchee" style="display:block;margin:0 auto 36px;max-width:100%;" />
<div style="font-size:28px;font-weight:800;color:#0f172a;letter-spacing:-0.5px;line-height:1.2;">Cancellation confirmed</div>
</td></tr>
<tr><td style="background:white;padding:36px 40px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 16px 16px;">
<p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 20px;">Hi ${customerFirstName},</p>
<p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 20px;">
We've cancelled your Vouchee subscription under your <strong>14-day right to cancel</strong>. Your Direct Debit has been cancelled and no further payments will be collected.
</p>
<div style="background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:12px;padding:22px 28px;margin-bottom:24px;">
<div style="font-size:13px;font-weight:800;color:#15803d;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:10px;">💷 Refund</div>
<p style="font-size:14px;color:#166534;line-height:1.7;margin:0;">${refundCopy}</p>
</div>
<p style="font-size:14px;color:#64748b;line-height:1.7;margin:0 0 20px;">
We're sorry it didn't work out this time. If you'd like to give Vouchee another try in future, you'd be very welcome back.
</p>
<a href="${appUrl}" style="display:inline-block;background:#0f172a;color:white;font-size:13px;font-weight:700;padding:11px 24px;border-radius:8px;text-decoration:none;margin-bottom:20px;">Visit Vouchee →</a>
<p style="font-size:12px;color:#94a3b8;line-height:1.6;margin:0;">
Reference: this cancellation was actioned under clause 11.2 of our <a href="${appUrl}/legal/terms/customer" style="color:#94a3b8;">Customer Terms</a>. Questions? Reply to this email or contact <a href="mailto:legal@vouchee.co.uk" style="color:#94a3b8;">legal@vouchee.co.uk</a>.
</p>
</td></tr>
<tr><td style="padding:24px 0;text-align:center;">
<p style="margin:0;font-size:12px;color:#94a3b8;">© 2026 Vouchee · <a href="https://www.vouchee.co.uk" style="color:#94a3b8;text-decoration:none;">vouchee.co.uk</a></p>
</td></tr>
</table></td></tr>
</table></body></html>`
}

// Customer email for Branch B — automated success path. Renders one of three
// states based on the refund amounts (refund issued, paid in full and fully
// consumed, or no money ever moved). Mirrors the structure of the full-refund
// email so the customer experience is consistent.
function buildCoolingOffPartialRefundIssuedEmail({
  customerFirstName, totalPaidPence, refundedPence, cleansCount,
}: { customerFirstName: string; totalPaidPence: number; refundedPence: number; cleansCount: number }): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.vouchee.co.uk'
  const refundEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
    .toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const refundAmountLabel = `£${(refundedPence / 100).toFixed(2)}`
  const paidLabel = `£${(totalPaidPence / 100).toFixed(2)}`
  const cleansLabel = `${cleansCount} clean${cleansCount === 1 ? '' : 's'}`

  let refundCopy: string
  if (refundedPence > 0) {
    refundCopy = `Your final balance has been calculated as <strong>${paidLabel} paid</strong> for <strong>${cleansLabel}</strong> completed. We'll refund <strong>${refundAmountLabel}</strong> for the unused portion to the account your Direct Debit was set up from. The refund will arrive by <strong>${refundEnd}</strong>, in line with the statutory 14-day deadline.`
  } else if (totalPaidPence > 0) {
    refundCopy = `Your final balance has been calculated as <strong>${paidLabel} paid</strong> for <strong>${cleansLabel}</strong> completed. There is no unused portion to refund.`
  } else {
    refundCopy = `No payments had been collected from your account yet, so there's nothing to refund. Your Direct Debit and any pending payments have been cancelled.`
  }

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:40px 16px;">
<tr><td align="center"><table width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;">
<tr><td style="background:#ffffff;padding:36px 40px 32px;text-align:center;border-radius:16px 16px 0 0;">
<img src="https://www.vouchee.co.uk/full-logo-black.png" width="260" height="60" alt="Vouchee" style="display:block;margin:0 auto 36px;max-width:100%;" />
<div style="font-size:28px;font-weight:800;color:#0f172a;letter-spacing:-0.5px;line-height:1.2;">Cancellation confirmed</div>
</td></tr>
<tr><td style="background:white;padding:36px 40px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 16px 16px;">
<p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 20px;">Hi ${customerFirstName},</p>
<p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 20px;">
We've cancelled your Vouchee subscription under your <strong>14-day right to cancel</strong>. Your Direct Debit has been cancelled and no further payments will be collected.
</p>
<div style="background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:12px;padding:22px 28px;margin-bottom:24px;">
<div style="font-size:13px;font-weight:800;color:#15803d;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:10px;">💷 Refund</div>
<p style="font-size:14px;color:#166534;line-height:1.7;margin:0;">${refundCopy}</p>
</div>
<p style="font-size:14px;color:#64748b;line-height:1.7;margin:0 0 20px;">
We're sorry it didn't work out this time. If you'd like to give Vouchee another try in future, you'd be very welcome back.
</p>
<a href="${appUrl}" style="display:inline-block;background:#0f172a;color:white;font-size:13px;font-weight:700;padding:11px 24px;border-radius:8px;text-decoration:none;margin-bottom:20px;">Visit Vouchee →</a>
<p style="font-size:12px;color:#94a3b8;line-height:1.6;margin:0;">
Reference: this cancellation was actioned under clause 11.2 of our <a href="${appUrl}/legal/terms/customer" style="color:#94a3b8;">Customer Terms</a>. Questions? Reply to this email or contact <a href="mailto:legal@vouchee.co.uk" style="color:#94a3b8;">legal@vouchee.co.uk</a>.
</p>
</td></tr>
<tr><td style="padding:24px 0;text-align:center;">
<p style="margin:0;font-size:12px;color:#94a3b8;">© 2026 Vouchee · <a href="https://www.vouchee.co.uk" style="color:#94a3b8;text-decoration:none;">vouchee.co.uk</a></p>
</td></tr>
</table></td></tr>
</table></body></html>`
}

// Customer email for Branch B — fallback when the automated refund fails.
// Old "pro-rata being calculated" copy preserved so admin manual review is
// the safety net when GC is unreachable or the calculation can't complete.
function buildCoolingOffPartialReviewEmail({ customerFirstName }: { customerFirstName: string }): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.vouchee.co.uk'
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:40px 16px;">
<tr><td align="center"><table width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;">
<tr><td style="background:#ffffff;padding:36px 40px 32px;text-align:center;border-radius:16px 16px 0 0;">
<img src="https://www.vouchee.co.uk/full-logo-black.png" width="260" height="60" alt="Vouchee" style="display:block;margin:0 auto 36px;max-width:100%;" />
<div style="font-size:28px;font-weight:800;color:#0f172a;letter-spacing:-0.5px;line-height:1.2;">Cancellation received</div>
</td></tr>
<tr><td style="background:white;padding:36px 40px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 16px 16px;">
<p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 20px;">Hi ${customerFirstName},</p>
<p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 20px;">
We've received your cancellation under your <strong>14-day right to cancel</strong>. Your Direct Debit has been cancelled and no further recurring payments will be collected.
</p>
<div style="background:#fffbeb;border:1.5px solid #fde68a;border-radius:12px;padding:22px 28px;margin-bottom:24px;">
<div style="font-size:13px;font-weight:800;color:#92400e;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:10px;">⏳ Pro-rata refund — under review</div>
<p style="font-size:14px;color:#78350f;line-height:1.7;margin:0;">
Because cleaning has already begun under your express consent, we'll review the cleans completed and refund the unused portion of your service fee. We'll be in touch within <strong>5 working days</strong> with the refund amount and timing.
</p>
</div>
<p style="font-size:14px;color:#64748b;line-height:1.7;margin:0 0 20px;">
If you have any details that would help our review (for example, dates of cleans completed), please reply to this email.
</p>
<p style="font-size:12px;color:#94a3b8;line-height:1.6;margin:0;">
Reference: this cancellation was actioned under clause 11.2 of our <a href="${appUrl}/legal/terms/customer" style="color:#94a3b8;">Customer Terms</a>. Questions? <a href="mailto:legal@vouchee.co.uk" style="color:#94a3b8;">legal@vouchee.co.uk</a>.
</p>
</td></tr>
<tr><td style="padding:24px 0;text-align:center;">
<p style="margin:0;font-size:12px;color:#94a3b8;">© 2026 Vouchee · <a href="https://www.vouchee.co.uk" style="color:#94a3b8;text-decoration:none;">vouchee.co.uk</a></p>
</td></tr>
</table></td></tr>
</table></body></html>`
}

// Admin email for Branch B — alerts so the pro-rata review doesn't slip
function buildAdminCoolingOffPartialAlertEmail({ customerFullName, customerEmail, requestId, startDate }: { customerFullName: string; customerEmail: string; requestId: string; startDate: string }): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.vouchee.co.uk'
  return `<!DOCTYPE html>
<html><body style="font-family:'Helvetica Neue',Arial,sans-serif;background:#f0f4f8;padding:24px;">
<div style="max-width:600px;margin:0 auto;background:white;border:1.5px solid #fde68a;border-radius:12px;padding:28px;">
<div style="font-size:14px;font-weight:800;color:#92400e;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:14px;">⚠️ Cooling-off cancellation — pro-rata refund needed</div>
<p style="font-size:14px;color:#374151;line-height:1.6;margin:0 0 14px;">
A customer has cancelled within the 14-day cooling-off period <strong>after cleaning began with their express consent</strong>. A pro-rata refund needs to be calculated and issued within 14 days.
</p>
<table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #f1f5f9;border-bottom:1px solid #f1f5f9;margin:14px 0;">
<tr><td style="padding:8px 0;font-size:13px;color:#64748b;">Customer</td><td style="padding:8px 0;font-size:13px;font-weight:700;color:#0f172a;text-align:right;">${customerFullName}</td></tr>
<tr><td style="padding:8px 0;font-size:13px;color:#64748b;">Email</td><td style="padding:8px 0;font-size:13px;font-weight:700;color:#0f172a;text-align:right;">${customerEmail}</td></tr>
<tr><td style="padding:8px 0;font-size:13px;color:#64748b;">Start date</td><td style="padding:8px 0;font-size:13px;font-weight:700;color:#0f172a;text-align:right;">${startDate}</td></tr>
<tr><td style="padding:8px 0;font-size:13px;color:#64748b;">Request ID</td><td style="padding:8px 0;font-size:12px;font-family:monospace;color:#0f172a;text-align:right;">${requestId}</td></tr>
</table>
<p style="font-size:13px;color:#64748b;line-height:1.6;margin:0;">
Action: confirm cleans completed with the cleaner, calculate pro-rata refund (subscription fee minus per-clean rate × cleans done), issue via GoCardless dashboard, reply to customer with confirmation.
</p>
<p style="font-size:12px;color:#94a3b8;line-height:1.6;margin:14px 0 0;">
Statutory 14-day refund deadline applies (CCR 2013).
</p>
</div>
</body></html>`
}

// Cleaner email for cooling-off cancellations (Branches A and B) — different
// tone from the standard-cancellation email. No 30-day notice, no review CTA.
function buildCleanerCoolingOffCancellationEmail({ cleanerFirstName, customerFirstName, zone, serviceHasBegun }: { cleanerFirstName: string; customerFirstName: string; zone: string; serviceHasBegun: boolean }): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.vouchee.co.uk'
  const zoneLabel = ZONE_LABELS[zone] ?? zone
  const completedCleansCopy = serviceHasBegun
    ? `If any cleans have already taken place, we'll be in touch separately about settling for those.`
    : `As cleaning hadn't started yet, no further action is needed on your end.`
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:40px 16px;">
<tr><td align="center"><table width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;">
<tr><td style="background:#ffffff;padding:36px 40px 32px;text-align:center;border-radius:16px 16px 0 0;">
<img src="https://www.vouchee.co.uk/full-logo-black.png" width="260" height="60" alt="Vouchee" style="display:block;margin:0 auto 36px;max-width:100%;" />
<div style="font-size:28px;font-weight:800;color:#0f172a;letter-spacing:-0.5px;line-height:1.2;">Subscription update</div>
</td></tr>
<tr><td style="background:white;padding:36px 40px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 16px 16px;">
<p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 20px;">Hi ${cleanerFirstName},</p>
<p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 20px;">
We're letting you know that <strong>${customerFirstName}</strong> (${zoneLabel}) has cancelled their Vouchee subscription within their statutory 14-day cancellation period. ${completedCleansCopy}
</p>
<p style="font-size:14px;color:#64748b;line-height:1.7;margin:0 0 20px;">
This is a right every customer has under UK consumer law and isn't a reflection on your work. Don't be discouraged — keep an eye on your dashboard for new opportunities in your area.
</p>
<a href="${appUrl}/cleaner/dashboard" style="display:inline-block;background:#16a34a;color:white;font-size:13px;font-weight:700;padding:11px 24px;border-radius:8px;text-decoration:none;margin-bottom:16px;">View your dashboard →</a>
<p style="font-size:12px;color:#94a3b8;text-align:center;margin:0;line-height:1.6;">
Questions? <a href="mailto:cleaners@vouchee.co.uk" style="color:#94a3b8;">cleaners@vouchee.co.uk</a>
</p>
</td></tr>
<tr><td style="padding:24px 0;text-align:center;">
<p style="margin:0;font-size:12px;color:#94a3b8;">© 2026 Vouchee · vouchee.co.uk</p>
</td></tr>
</table></td></tr>
</table></body></html>`
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    const body = await request.json()
    const { requestId } = body

    if (!requestId) {
      return NextResponse.json({ error: 'requestId required' }, { status: 400 })
    }

    // Verify the caller is authenticated
    const supabaseServer = await createBrowserClient()
    const { data: { user } } = await supabaseServer.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Look up the clean request being cancelled
    const { data: cleanRequest, error: reqError } = await supabaseAdmin
      .from('clean_requests')
      .select('id, customer_id, status, gocardless_subscription_id, assigned_cleaner_id, zone, frequency, start_date, switch_from_request_id, fulfilled_at, cooling_off_until, cooling_off_consent_given')
      .eq('id', requestId)
      .single()

    if (reqError || !cleanRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    // Idempotency: a re-submission for an already-cancelled request should
    // return success rather than retry the GC operations
    if (cleanRequest.status === 'cancelled') {
      return NextResponse.json({ success: true, route: 'already_cancelled' })
    }

    // Verify ownership
    const { data: customerRecord } = await supabaseAdmin
      .from('customers').select('id, gocardless_mandate_id').eq('profile_id', user.id).single()

    const { data: profileData } = await supabaseAdmin
      .from('profiles').select('role').eq('id', user.id).single()

    const isAdmin = profileData?.role === 'admin'
    const isOwner = customerRecord?.id === cleanRequest.customer_id

    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // ── Determine cooling-off route ───────────────────────────────────────────
    // Walk back through any switch chain to find the root request — the
    // cooling-off anchor lives there because the platform contract is the
    // same one that was originally formed (a switch is a continuation,
    // not a new contract).
    const root = await getRootCleanRequest(supabaseAdmin, requestId)

    const now = new Date()
    const hasCoolingOffData = !!(root?.cooling_off_until)
    const inCoolingOff = hasCoolingOffData &&
      new Date(root.cooling_off_until).getTime() > now.getTime()

    // Service is "begun" when the agreed start_date has passed. We use the
    // *current* request's start_date (not the root's) because in a switch
    // the clock for service-already-rendered ticks against the new cleaner's
    // start date, even if cooling-off itself runs from the root.
    const startDateMs = cleanRequest.start_date
      ? new Date(cleanRequest.start_date).getTime()
      : Infinity
    const serviceHasBegun = startDateMs <= now.getTime()

    type Route = 'cooling_off_full_refund' | 'cooling_off_partial_review' | 'standard_30_day'
    const route: Route =
      inCoolingOff && !serviceHasBegun ? 'cooling_off_full_refund' :
      inCoolingOff && serviceHasBegun  ? 'cooling_off_partial_review' :
                                         'standard_30_day'

    console.log(`Cancel route for ${requestId}:`, {
      route, inCoolingOff, serviceHasBegun, hasCoolingOffData,
      coolingOffUntil: root?.cooling_off_until,
      startDate: cleanRequest.start_date
    })

    // ── GoCardless config ─────────────────────────────────────────────────────
    const gcEnvironment = process.env.GOCARDLESS_ENVIRONMENT ?? 'sandbox'
    const gcBaseUrl = gcEnvironment === 'live'
      ? 'https://api.gocardless.com'
      : 'https://api-sandbox.gocardless.com'
    const gcToken = process.env.GOCARDLESS_ACCESS_TOKEN!

    // ── Subscription handling per branch ─────────────────────────────────────
    // Branches A and B (cooling-off): cancel the subscription immediately —
    // no further charges, refunds happen separately.
    // Branch C (standard 30-day): DO NOT cancel immediately. Set end_date on
    // the subscription so DDs continue through the notice period and then
    // stop. The pro-rata refund for any unused tail of the final billed cycle
    // is issued by /api/cron/process-cancellation-refunds at notice end.
    const subscriptionId = cleanRequest.gocardless_subscription_id
    const NOTICE_DAYS = 30
    const cancellationCompletesAt = new Date(now.getTime() + NOTICE_DAYS * 24 * 60 * 60 * 1000)

    if (subscriptionId) {
      if (route === 'standard_30_day') {
        // PATCH end_date — last charge_date on or before this date can still
        // fire; charges scheduled after this date are not created.
        try {
          const endDateStr = cancellationCompletesAt.toISOString().split('T')[0]
          const patchRes = await fetch(`${gcBaseUrl}/subscriptions/${subscriptionId}`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${gcToken}`,
              'GoCardless-Version': '2015-07-06',
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: JSON.stringify({ subscriptions: { end_date: endDateStr } }),
          })
          if (!patchRes.ok) {
            const errText = await patchRes.text()
            console.error('GoCardless subscription end_date PATCH failed:', errText)
            // Fall back to immediate cancel so we never end up in a state
            // where we promise an end date GC didn't accept and keep
            // collecting forever. Admin gets the alert via the standard
            // gc-webhook subscriptions.cancelled handler.
            await fetch(`${gcBaseUrl}/subscriptions/${subscriptionId}/actions/cancel`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${gcToken}`,
                'GoCardless-Version': '2015-07-06',
                'Content-Type': 'application/json',
                'Accept': 'application/json',
              },
              body: JSON.stringify({ data: {} }),
            })
          } else {
            console.log('GoCardless subscription end_date set:', subscriptionId, endDateStr)
          }
        } catch (e: any) {
          console.error('Subscription end_date PATCH threw:', e?.message)
        }
      } else {
        // Cooling-off branches: hard cancel
        try {
          const cancelRes = await fetch(`${gcBaseUrl}/subscriptions/${subscriptionId}/actions/cancel`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${gcToken}`,
              'GoCardless-Version': '2015-07-06',
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: JSON.stringify({ data: {} }),
          })
          if (!cancelRes.ok) {
            console.error('GoCardless subscription cancel failed:', await cancelRes.text())
          } else {
            console.log('GoCardless subscription cancelled:', subscriptionId)
          }
        } catch (e: any) {
          console.error('Subscription cancel threw:', e?.message)
        }
      }
    }

    // ── Branch A/B: refund processing inside the 14-day cooling-off window ─
    // Branch A (no service begun): full refund of everything paid, mandate
    // cancelled. Branch B (service begun): pro-rata refund based on cleans
    // done × per-clean fee. Branch B falls back to manual review if GC's
    // payments-list call itself fails.
    let refundedPence = 0
    let firstRefundId: string | null = null
    let partialRefundFatal = false              // Branch B: GC outage triggers manual fallback
    let partialTotalPaidPence = 0               // Branch B: needed for the customer email
    let partialCleansCount = 0                  // Branch B: needed for the customer email

    if (route === 'cooling_off_full_refund' && customerRecord?.gocardless_mandate_id) {
      const mandateId = customerRecord.gocardless_mandate_id
      const r = await processCoolingOffRefunds(gcBaseUrl, gcToken, mandateId, requestId)
      refundedPence = r.refundedPence
      firstRefundId = r.firstRefundId

      // Cancel the mandate so the customer is fully clean — also clear the
      // pointer on customers so any future re-engagement sets up a fresh
      // mandate (the cancelled one cannot be reused).
      try {
        const mandateCancelRes = await fetch(`${gcBaseUrl}/mandates/${mandateId}/actions/cancel`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${gcToken}`,
            'GoCardless-Version': '2015-07-06',
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({ data: {} }),
        })
        if (!mandateCancelRes.ok) {
          console.error('GoCardless mandate cancel failed:', await mandateCancelRes.text())
        } else {
          console.log('GoCardless mandate cancelled:', mandateId)
        }
      } catch (e: any) {
        console.error('Mandate cancel threw:', e?.message)
      }

      await supabaseAdmin
        .from('customers')
        .update({ gocardless_mandate_id: null } as any)
        .eq('id', customerRecord.id)
    }

    // ── Branch B: pro-rata refund automation ─────────────────────────────────
    // Compute cleans-done and call the waterfall. On a fatal GC error
    // (e.g. payments-list 500), set partialRefundFatal so the caller falls
    // back to the legacy manual-review email + admin alert. The DB write
    // below uses partialRefundFatal to pick the cancellation_reason.
    if (route === 'cooling_off_partial_review' && customerRecord?.gocardless_mandate_id) {
      const frequency = cleanRequest.frequency ?? 'fortnightly'
      const perCleanPence = PER_CLEAN_PENCE[frequency] ?? PER_CLEAN_PENCE.fortnightly
      partialCleansCount = countCleansDone(cleanRequest.start_date, frequency, now)

      const r = await processCoolingOffPartialRefund(
        gcBaseUrl, gcToken,
        customerRecord.gocardless_mandate_id, requestId,
        partialCleansCount, perCleanPence,
      )
      refundedPence = r.refundedPence
      firstRefundId = r.firstRefundId
      partialTotalPaidPence = r.totalPaidPence
      partialRefundFatal = r.fatal
    }

    // ── Update clean_request with cancellation metadata ──────────────────────
    // Branch B's reason flips based on whether the automated refund succeeded
    // (audit trail of which cancellations needed manual intervention).
    const cancellationReason =
      route === 'cooling_off_full_refund'    ? 'cooling_off_full_refund' :
      route === 'cooling_off_partial_review' ? (partialRefundFatal ? 'cooling_off_partial_review_required' : 'cooling_off_partial_refund_issued') :
                                               'standard_30_day'

    await supabaseAdmin
      .from('clean_requests')
      .update({
        status: 'cancelled',
        cancellation_reason: cancellationReason,
        cancellation_requested_at: now.toISOString(),
        // Branch C only: marker the pro-rata refund cron looks for. Branches
        // A and B are settled inline so they get no completes_at and the
        // cron leaves them alone.
        ...(route === 'standard_30_day'
          ? { cancellation_completes_at: cancellationCompletesAt.toISOString() }
          : {}),
        // Persist the refunded amount for any branch that issued one — Branch
        // A (full refund) and Branch B (automated pro-rata) both populate
        // refundedPence; Branch C populates this from its own cron later.
        ...(refundedPence > 0
          ? { prorata_refund_amount_pence: refundedPence }
          : {}),
        ...(firstRefundId ? { gocardless_refund_id: firstRefundId } : {}),
      } as any)
      .eq('id', requestId)

    // Mark the assigned cleaner's accepted application as ended for
    // hours-worked tracking. Best-effort — failure here shouldn't unwind
    // the cancellation, which is already committed above.
    if (cleanRequest.assigned_cleaner_id) {
      await supabaseAdmin
        .from('applications')
        .update({ ended_at: now.toISOString() } as any)
        .eq('request_id', requestId)
        .eq('cleaner_id', cleanRequest.assigned_cleaner_id)
        .eq('status', 'accepted')
    }

    // ── Look up cleaner + customer details for emails ─────────────────────────
    let cleanerEmail: string | null = null
    let cleanerFirstName = 'there'
    let customerFirstName = 'your customer'
    let customerFullName = 'Your customer'
    let customerEmailAddr = ''

    if (cleanRequest.assigned_cleaner_id) {
      const { data: cleanerRecord } = await supabaseAdmin
        .from('cleaners').select('profile_id').eq('id', cleanRequest.assigned_cleaner_id).single()
      if (cleanerRecord) {
        const { data: cleanerProfile } = await supabaseAdmin
          .from('profiles').select('full_name, email').eq('id', cleanerRecord.profile_id).single()
        cleanerEmail = cleanerProfile?.email ?? null
        cleanerFirstName = cleanerProfile?.full_name?.split(' ')[0] ?? 'there'
      }
    }

    const { data: customerProfile } = await supabaseAdmin
      .from('profiles').select('full_name, email').eq('id', user.id).single()
    customerFirstName = customerProfile?.full_name?.split(' ')[0] ?? 'your customer'
    customerFullName = customerProfile?.full_name ?? 'Your customer'
    customerEmailAddr = customerProfile?.email ?? ''

    // ── Send the right emails for the route ───────────────────────────────────
    const emailTasks: Promise<any>[] = []

    if (route === 'cooling_off_full_refund') {
      // Customer: refund confirmation. CCR 2013 14-day refund deadline.
      if (customerEmailAddr) {
        const refundEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
          .toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
        emailTasks.push(resend.emails.send({
          from: 'Vouchee <hello@vouchee.co.uk>',
          to: customerEmailAddr,
          subject: 'Your Vouchee subscription has been cancelled',
          html: buildCoolingOffFullRefundEmail({ customerFirstName, refundedPence, refundEnd }),
        }))
      }
      if (cleanerEmail) {
        emailTasks.push(resend.emails.send({
          from: 'Vouchee <hello@vouchee.co.uk>',
          to: cleanerEmail,
          subject: `Subscription update — ${customerFirstName} has cancelled`,
          html: buildCleanerCoolingOffCancellationEmail({
            cleanerFirstName, customerFirstName,
            zone: cleanRequest.zone ?? '',
            serviceHasBegun: false,
          }),
        }))
      }

    } else if (route === 'cooling_off_partial_review') {
      // Automated path (default): the inline waterfall already issued the
      // refund. Send the customer the actual amount and only ping the admin
      // if the GC call had a fatal error (manual fallback path).
      if (customerEmailAddr) {
        if (partialRefundFatal) {
          emailTasks.push(resend.emails.send({
            from: 'Vouchee <hello@vouchee.co.uk>',
            to: customerEmailAddr,
            subject: 'Your Vouchee cancellation, pro-rata refund being calculated',
            html: buildCoolingOffPartialReviewEmail({ customerFirstName }),
          }))
        } else {
          emailTasks.push(resend.emails.send({
            from: 'Vouchee <hello@vouchee.co.uk>',
            to: customerEmailAddr,
            subject: refundedPence > 0
              ? `Your Vouchee refund of £${(refundedPence / 100).toFixed(2)} is on its way`
              : 'Your Vouchee subscription has been cancelled',
            html: buildCoolingOffPartialRefundIssuedEmail({
              customerFirstName,
              totalPaidPence: partialTotalPaidPence,
              refundedPence,
              cleansCount: partialCleansCount,
            }),
          }))
        }
      }
      // Admin alert ONLY if the automated refund failed — successful runs
      // need no human attention. The fallback alert wording is unchanged
      // from the legacy manual-review flow so the 14-day deadline urgency
      // still reads correctly.
      if (partialRefundFatal) {
        const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL ?? 'adamjbell95@gmail.com'
        emailTasks.push(resend.emails.send({
          from: 'Vouchee <hello@vouchee.co.uk>',
          to: adminEmail,
          subject: `[Action required] Cooling-off cancellation, pro-rata refund needed (${customerFirstName})`,
          html: buildAdminCoolingOffPartialAlertEmail({
            customerFullName,
            customerEmail: customerEmailAddr,
            requestId,
            startDate: cleanRequest.start_date ?? 'unknown',
          }),
        }))
      }
      if (cleanerEmail) {
        emailTasks.push(resend.emails.send({
          from: 'Vouchee <hello@vouchee.co.uk>',
          to: cleanerEmail,
          subject: `Subscription update — ${customerFirstName} has cancelled`,
          html: buildCleanerCoolingOffCancellationEmail({
            cleanerFirstName, customerFirstName,
            zone: cleanRequest.zone ?? '',
            serviceHasBegun: true,
          }),
        }))
      }

    } else {
      // Branch C — existing 30-day-notice email to the cleaner. Customer
      // doesn't get an email here because the existing /cancel page already
      // shows the 30-day-notice confirmation in-product.
      if (cleanerEmail) {
        emailTasks.push(resend.emails.send({
          from: 'Vouchee <hello@vouchee.co.uk>',
          to: cleanerEmail,
          subject: `Subscription update — ${customerFirstName} has cancelled`,
          html: buildCleanerCancellationEmail({
            cleanerFirstName, customerFirstName,
            zone: cleanRequest.zone ?? '',
          }),
        }))
      }
    }

    await Promise.all(emailTasks)
    console.log(`Cancellation emails sent (${emailTasks.length})`)

    return NextResponse.json({
      success: true,
      route,
      ...(route === 'cooling_off_full_refund' ? { refundedAmountPence: refundedPence } : {}),
    })

  } catch (err: any) {
    console.error('Cancel subscription error:', err)
    return NextResponse.json({ error: err.message ?? 'Failed to cancel' }, { status: 500 })
  }
}