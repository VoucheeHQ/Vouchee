import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/confirm-switch
//
// Called by the frontend when a switching customer (existing mandate) confirms
// a new cleaner. Skips the GoCardless hosted billing page entirely — creates
// the pro-rata payment and new subscription directly on the existing mandate,
// then fires all the same post-confirmation actions as /api/gocardless/confirm.
//
// If the old request has switch_pending=true (customer chose "find replacement
// first"), this route also:
//   - Calculates the last clean date for the old cleaner
//   - Sends them a farewell email
//   - Cancels their GC subscription
//   - Marks the old request as cancelled
// ─────────────────────────────────────────────────────────────────────────────

const resend = new Resend(process.env.RESEND_API_KEY!)

const TASK_LABELS: Record<string, string> = {
  general: 'General cleaning', general_cleaning: 'General cleaning',
  hoovering: 'Hoovering', mopping: 'Mopping',
  bathroom: 'Bathroom clean', kitchen: 'Kitchen clean',
  windows_interior: 'Interior windows', fridge: 'Fridge clean',
  blinds: 'Blinds', mold: 'Mould removal', ironing: 'Ironing',
  laundry: 'Laundry', changing_beds: 'Changing beds',
  garage: 'Garage / utility', bins: 'Emptying all bins',
  skirting: 'Skirting boards & doorframes', conservatory: 'Conservatory clean',
  bathroom_deep: 'Bathroom deep clean', kitchen_deep: 'Kitchen deep clean',
}
const STANDARD_TASK_IDS = new Set(['general', 'general_cleaning', 'hoovering', 'mopping', 'bathroom', 'kitchen', 'bins'])

const MONTHLY_AMOUNT_PENCE: Record<string, number> = {
  weekly: 4333, fortnightly: 3248, monthly: 2499,
}
const PER_CLEAN_PENCE: Record<string, number> = {
  weekly: 999, fortnightly: 1499, monthly: 2499,
}

const LOGO_URL = 'https://www.vouchee.co.uk/full-logo-black.png'
const BRAND_BLUE = '#2563eb'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcProRata(startDate: string, frequency: string): number {
  if (frequency === 'monthly') return PER_CLEAN_PENCE.monthly
  const intervalDays = frequency === 'weekly' ? 7 : 14
  const perCleanPence = PER_CLEAN_PENCE[frequency] ?? PER_CLEAN_PENCE.fortnightly
  const start = new Date(startDate)
  const endOfMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0)
  let cleans = 0, cleanDate = new Date(start)
  while (cleanDate <= endOfMonth) { cleans++; cleanDate.setDate(cleanDate.getDate() + intervalDays) }
  return cleans * perCleanPence
}

function getFirstBillingDate(startDate: string): string {
  const start = new Date(startDate)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  let workingDays = 0
  const minDate = new Date(today)
  while (workingDays < 3) { minDate.setDate(minDate.getDate() + 1); const d = minDate.getDay(); if (d !== 0 && d !== 6) workingDays++ }
  return (start > minDate ? start : minDate).toISOString().split('T')[0]
}

/**
 * Work backwards from newStartDate using the old cleaner's schedule anchor
 * to find their last clean before the new cleaner takes over.
 */
function calcLastCleanDate(oldStartDate: string, frequency: string, newStartDate: string): string {
  if (frequency === 'monthly') {
    // Monthly: last clean is the 1st of the month before new start
    const d = new Date(newStartDate)
    d.setDate(1)
    d.setMonth(d.getMonth() - 1)
    return d.toISOString().split('T')[0]
  }
  const intervalDays = frequency === 'weekly' ? 7 : 14
  const anchor = new Date(oldStartDate)
  const cutoff = new Date(newStartDate)
  let current = new Date(anchor)
  let last = new Date(anchor)
  while (current < cutoff) {
    last = new Date(current)
    current.setDate(current.getDate() + intervalDays)
  }
  return last.toISOString().split('T')[0]
}

function formatAddress(a1: string, a2: string | null, city: string, postcode: string): string {
  const clean = postcode.toUpperCase().replace(/\s+/g, '')
  const pc = clean.length > 4 ? clean.slice(0, -3) + ' ' + clean.slice(-3) : clean
  return [a1, a2, city, pc].filter(Boolean).join(', ')
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function getFreqLabel(f: string | null | undefined) {
  if (!f) return 'Not specified'
  return ({ weekly: 'Weekly', fortnightly: 'Fortnightly', monthly: 'Monthly' } as any)[f] ?? f
}

function emailShell(innerHtml: string, title: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.vouchee.co.uk'
  return `<!DOCTYPE html><html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>${title}</title></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 0;">
  <tr><td align="center">
  <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
    <tr><td style="padding:0 0 24px;text-align:center;">
      <img src="${LOGO_URL}" width="200" height="46" alt="Vouchee" style="display:block;margin:0 auto;max-width:100%;height:auto;border:0;" />
    </td></tr>
    <tr><td style="background:white;border-radius:20px;padding:36px;border:1px solid #e2e8f0;">${innerHtml}</td></tr>
    <tr><td style="padding:24px 0 0;text-align:center;">
      <p style="margin:0;font-size:12px;color:#94a3b8;">© 2026 Vouchee Ltd · <a href="${appUrl}" style="color:#94a3b8;">vouchee.co.uk</a></p>
    </td></tr>
  </table>
  </td></tr>
</table>
</body></html>`
}

// ─── Farewell email to old cleaner ────────────────────────────────────────────

function buildFarewellEmail(opts: {
  cleanerFirstName: string
  customerFirstName: string
  lastCleanDate: string
  frequency: string
}) {
  const { cleanerFirstName, customerFirstName, lastCleanDate, frequency } = opts
  const inner = `
    <p style="margin:0 0 6px;font-size:22px;font-weight:800;color:#0f172a;">An update about ${customerFirstName}</p>
    <p style="margin:0 0 24px;font-size:14px;color:#64748b;line-height:1.6;">
      Hi ${cleanerFirstName}, we wanted to give you advance notice that ${customerFirstName} has found a new cleaner through Vouchee.
    </p>
    <div style="background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:12px;padding:20px 24px;margin-bottom:24px;text-align:center;">
      <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#15803d;text-transform:uppercase;letter-spacing:0.08em;">Your last scheduled clean</p>
      <p style="margin:0;font-size:22px;font-weight:800;color:#0f172a;">${formatDate(lastCleanDate)}</p>
    </div>
    <p style="margin:0 0 24px;font-size:14px;color:#64748b;line-height:1.6;">
      Your ${getFreqLabel(frequency).toLowerCase()} cleans with ${customerFirstName} will end after this date. There's nothing you need to do — just carry on as normal until then.
    </p>
    <p style="margin:0 0 24px;font-size:14px;color:#64748b;line-height:1.6;">
      Thank you for your work through Vouchee. New listings appear regularly — keep an eye on your job alerts.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr><td align="center">
        <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.vouchee.co.uk'}/jobs" style="display:inline-block;background:${BRAND_BLUE};color:#ffffff;font-size:14px;font-weight:700;padding:13px 28px;border-radius:10px;text-decoration:none;">Browse new jobs →</a>
      </td></tr>
    </table>
    <p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.5;text-align:center;">
      Questions? <a href="mailto:cleaners@vouchee.co.uk" style="color:${BRAND_BLUE};">cleaners@vouchee.co.uk</a>
    </p>
  `
  return emailShell(inner, 'An update about your Vouchee customer')
}

// ─── New cleaner confirmation emails (same as /api/gocardless/confirm) ────────

function buildCleanerEmail(opts: {
  cleanerFirstName: string; customerFirstName: string; customerFullName: string
  customerEmail: string; customerPhone: string | null; address: string
  startDate: string; bedrooms: number; bathrooms: number; frequency: string
  hours_per_session: number; tasks: string[]; customerNotes: string | null
}) {
  const { cleanerFirstName, customerFirstName, customerFullName, customerEmail, customerPhone, address, startDate, bedrooms, bathrooms, frequency, hours_per_session, tasks, customerNotes } = opts
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.vouchee.co.uk'
  const green = (t: string) => `<span style="display:inline-block;background:#f0fdf4;border:1px solid #bbf7d0;color:#15803d;font-size:12px;font-weight:600;padding:4px 14px;border-radius:100px;margin:3px 3px 3px 0;">${TASK_LABELS[t] ?? t}</span>`
  const yellow = (t: string) => `<span style="display:inline-block;background:#fefce8;border:1px solid #fde68a;color:#854d0e;font-size:12px;font-weight:600;padding:4px 14px;border-radius:100px;margin:3px 3px 3px 0;">${TASK_LABELS[t] ?? t}</span>`
  const std = tasks.filter(t => STANDARD_TASK_IDS.has(t))
  const spc = tasks.filter(t => !STANDARD_TASK_IDS.has(t))
  const inner = `
  <div style="text-align:center;margin-bottom:28px;">
    <img src="${LOGO_URL}" width="200" height="46" alt="Vouchee" style="display:block;margin:0 auto 20px;max-width:100%;" />
    <div style="font-size:28px;font-weight:800;color:#0f172a;">You've been chosen! 🎉</div>
  </div>
  <div style="background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:12px;padding:22px 28px;margin-bottom:24px;text-align:center;">
    <div style="font-size:12px;font-weight:800;color:#15803d;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">📅 Start date</div>
    <div style="font-size:24px;font-weight:800;color:#0f172a;">${formatDate(startDate)}</div>
  </div>
  <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:22px 28px;margin-bottom:20px;">
    <div style="font-size:13px;font-weight:800;color:#0f172a;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:16px;text-align:center;">Job summary</div>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#374151;">Bedrooms</td><td style="text-align:right;font-size:13px;font-weight:700;color:#0f172a;padding:8px 0;border-bottom:1px solid #f1f5f9;">${bedrooms}</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#374151;">Bathrooms</td><td style="text-align:right;font-size:13px;font-weight:700;color:#0f172a;padding:8px 0;border-bottom:1px solid #f1f5f9;">${bathrooms}</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#374151;">Frequency</td><td style="text-align:right;font-size:13px;font-weight:700;color:#0f172a;padding:8px 0;border-bottom:1px solid #f1f5f9;">${getFreqLabel(frequency)}</td></tr>
      <tr><td style="padding:8px 0;font-size:13px;color:#374151;">Hours per clean</td><td style="text-align:right;font-size:13px;font-weight:700;color:#0f172a;padding:8px 0;">${hours_per_session} hrs</td></tr>
    </table>
  </div>
  <div style="margin-bottom:20px;">
    <div style="font-size:13px;font-weight:800;color:#0f172a;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:10px;">Tasks requested</div>
    ${std.length > 0 ? `<div style="margin-bottom:6px;">${std.map(green).join('')}</div>` : ''}
    ${spc.length > 0 ? `<div style="font-size:13px;font-weight:800;color:#92400e;text-transform:uppercase;margin:10px 0 6px;">Special requests</div><div>${spc.map(yellow).join('')}</div>` : ''}
  </div>
  ${customerNotes ? `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:18px 24px;margin-bottom:20px;"><div style="font-size:13px;font-weight:800;color:#0f172a;margin-bottom:8px;text-align:center;">Customer notes</div><div style="font-size:14px;color:#475569;font-style:italic;">"${customerNotes}"</div></div>` : ''}
  <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:22px 28px;margin-bottom:24px;">
    <div style="font-size:13px;font-weight:800;color:#0f172a;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:16px;text-align:center;">Customer details</div>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#374151;width:38%;">Name</td><td style="text-align:right;font-size:13px;font-weight:700;color:#0f172a;padding:8px 0;border-bottom:1px solid #f1f5f9;">${customerFullName}</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#374151;">Email</td><td style="text-align:right;padding:8px 0;border-bottom:1px solid #f1f5f9;"><a href="mailto:${customerEmail}" style="font-size:13px;font-weight:700;color:#0f172a;text-decoration:none;">${customerEmail}</a></td></tr>
      ${customerPhone ? `<tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#374151;">Phone</td><td style="text-align:right;padding:8px 0;"><a href="tel:${customerPhone}" style="font-size:13px;font-weight:700;color:#0f172a;text-decoration:none;">${customerPhone}</a></td></tr>` : ''}
      <tr><td style="padding:8px 0;vertical-align:top;font-size:13px;color:#374151;">Address</td><td style="text-align:right;padding:8px 0;"><span style="font-size:13px;font-weight:700;color:#1e40af;">${address}</span></td></tr>
    </table>
  </div>
  <div style="background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:12px;padding:24px 28px;margin-bottom:24px;text-align:center;">
    <div style="font-size:15px;font-weight:700;color:#15803d;margin-bottom:8px;">👋 Reach out before the first clean</div>
    <div style="font-size:13px;color:#166534;margin-bottom:18px;">Contact ${customerFirstName} before the first clean to reassure them you'll be there.</div>
    <a href="${appUrl}/cleaner/dashboard" style="display:inline-block;background:#16a34a;color:white;font-size:13px;font-weight:700;padding:11px 28px;border-radius:8px;text-decoration:none;">View your dashboard →</a>
  </div>
  <p style="font-size:12px;color:#94a3b8;text-align:center;margin:0;">Questions? <a href="mailto:cleaners@vouchee.co.uk" style="color:#94a3b8;">cleaners@vouchee.co.uk</a></p>
  `
  return emailShell(inner, `You've been chosen — starting ${formatDate(startDate)}`)
}

function buildCustomerConfirmEmail(opts: {
  customerFirstName: string; cleanerFullName: string; cleanerEmail: string
  cleanerPhone: string | null; cleanerCardUrl: string; startDate: string
  bedrooms: number; bathrooms: number; frequency: string; hours_per_session: number
  tasks: string[]
}) {
  const { customerFirstName, cleanerFullName, cleanerEmail, cleanerPhone, cleanerCardUrl, startDate, bedrooms, bathrooms, frequency, hours_per_session, tasks } = opts
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.vouchee.co.uk'
  const cleanerFirstName = cleanerFullName.split(' ')[0]
  const green = (t: string) => `<span style="display:inline-block;background:#f0fdf4;border:1px solid #bbf7d0;color:#15803d;font-size:12px;font-weight:600;padding:4px 14px;border-radius:100px;margin:3px 3px 3px 0;">${TASK_LABELS[t] ?? t}</span>`
  const yellow = (t: string) => `<span style="display:inline-block;background:#fefce8;border:1px solid #fde68a;color:#854d0e;font-size:12px;font-weight:600;padding:4px 14px;border-radius:100px;margin:3px 3px 3px 0;">${TASK_LABELS[t] ?? t}</span>`
  const std = tasks.filter(t => STANDARD_TASK_IDS.has(t))
  const spc = tasks.filter(t => !STANDARD_TASK_IDS.has(t))
  const inner = `
  <div style="text-align:center;margin-bottom:28px;">
    <img src="${LOGO_URL}" width="200" height="46" alt="Vouchee" style="display:block;margin:0 auto 20px;max-width:100%;" />
    <div style="font-size:28px;font-weight:800;color:#0f172a;">You're all set! 🎉</div>
  </div>
  <div style="background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:12px;padding:22px 28px;margin-bottom:24px;text-align:center;">
    <div style="font-size:12px;font-weight:800;color:#15803d;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">📅 First clean</div>
    <div style="font-size:24px;font-weight:800;color:#0f172a;">${formatDate(startDate)}</div>
  </div>
  <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:22px 28px;margin-bottom:16px;">
    <div style="font-size:13px;font-weight:800;color:#0f172a;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:16px;text-align:center;">Your cleaner</div>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#374151;width:38%;">Name</td><td style="text-align:right;font-size:13px;font-weight:700;color:#0f172a;padding:8px 0;border-bottom:1px solid #f1f5f9;">${cleanerFullName}</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#374151;">Email</td><td style="text-align:right;padding:8px 0;border-bottom:1px solid #f1f5f9;"><a href="mailto:${cleanerEmail}" style="font-size:13px;font-weight:700;color:#1e40af;text-decoration:none;">${cleanerEmail}</a></td></tr>
      ${cleanerPhone ? `<tr><td style="padding:8px 0;font-size:13px;color:#374151;">Phone</td><td style="text-align:right;padding:8px 0;"><a href="tel:${cleanerPhone}" style="font-size:13px;font-weight:700;color:#1e40af;text-decoration:none;">${cleanerPhone}</a></td></tr>` : ''}
    </table>
  </div>
  <div style="text-align:center;margin-bottom:24px;">
    <a href="${cleanerCardUrl}" style="display:inline-block;background:#f8fafc;border:1.5px solid #e2e8f0;color:#0f172a;font-size:13px;font-weight:700;padding:10px 24px;border-radius:8px;text-decoration:none;">View ${cleanerFirstName}'s profile →</a>
  </div>
  <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:22px 28px;margin-bottom:20px;">
    <div style="font-size:13px;font-weight:800;color:#0f172a;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:16px;text-align:center;">Clean summary</div>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#374151;">Bedrooms</td><td style="text-align:right;font-size:13px;font-weight:700;color:#0f172a;padding:8px 0;border-bottom:1px solid #f1f5f9;">${bedrooms}</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#374151;">Bathrooms</td><td style="text-align:right;font-size:13px;font-weight:700;color:#0f172a;padding:8px 0;border-bottom:1px solid #f1f5f9;">${bathrooms}</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#374151;">Frequency</td><td style="text-align:right;font-size:13px;font-weight:700;color:#0f172a;padding:8px 0;border-bottom:1px solid #f1f5f9;">${getFreqLabel(frequency)}</td></tr>
      <tr><td style="padding:8px 0;font-size:13px;color:#374151;">Hours per clean</td><td style="text-align:right;font-size:13px;font-weight:700;color:#0f172a;padding:8px 0;">${hours_per_session} hrs</td></tr>
    </table>
  </div>
  <div style="margin-bottom:20px;">
    ${std.length > 0 ? `<div style="margin-bottom:6px;">${std.map(green).join('')}</div>` : ''}
    ${spc.length > 0 ? `<div style="font-size:13px;font-weight:800;color:#92400e;text-transform:uppercase;margin:10px 0 6px;">Special requests</div><div>${spc.map(yellow).join('')}</div>` : ''}
  </div>
  <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:24px 28px;margin-bottom:28px;text-align:center;">
    <div style="font-size:15px;font-weight:700;color:#1e40af;margin-bottom:8px;">💬 Chat with ${cleanerFirstName}</div>
    <div style="font-size:13px;color:#3b82f6;margin-bottom:18px;">Message ${cleanerFirstName} directly through your dashboard before the first clean.</div>
    <a href="${appUrl}/customer/dashboard" style="display:inline-block;background:#2563eb;color:white;font-size:13px;font-weight:700;padding:11px 28px;border-radius:8px;text-decoration:none;">Open your dashboard →</a>
  </div>
  <p style="font-size:12px;color:#94a3b8;text-align:center;margin:0;">Questions? <a href="mailto:hello@vouchee.co.uk" style="color:#94a3b8;">hello@vouchee.co.uk</a></p>
  `
  return emailShell(inner, `You're all set — ${cleanerFirstName} starts ${formatDate(startDate)}`)
}

export async function POST(request: NextRequest) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  let body: any
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { requestId, applicationId, conversationId, startDate, mandateId } = body
  if (!requestId || !applicationId || !conversationId || !startDate || !mandateId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.vouchee.co.uk'
  const gcEnvironment = process.env.GOCARDLESS_ENVIRONMENT ?? 'sandbox'
  const gcBaseUrl = gcEnvironment === 'live' ? 'https://api.gocardless.com' : 'https://api-sandbox.gocardless.com'
  const gcToken = process.env.GOCARDLESS_ACCESS_TOKEN!

  // ─── 1. Verify mandate is still active ───────────────────────────────────
  const mandateRes = await fetch(`${gcBaseUrl}/mandates/${mandateId}`, {
    headers: { 'Authorization': `Bearer ${gcToken}`, 'GoCardless-Version': '2015-07-06', 'Accept': 'application/json' },
  })
  if (!mandateRes.ok) {
    console.error('Mandate lookup failed:', await mandateRes.text())
    return NextResponse.json({ error: 'Could not verify mandate' }, { status: 500 })
  }
  const mandateData = await mandateRes.json()
  const mandateStatus = mandateData.mandates?.status
  if (mandateStatus !== 'active' && mandateStatus !== 'pending_submission' && mandateStatus !== 'submitted') {
    return NextResponse.json({ error: 'Mandate is not active — customer may need to re-authorise' }, { status: 400 })
  }
  const nextPossibleChargeDate = mandateData.mandates?.next_possible_charge_date ?? getFirstBillingDate(startDate)

  // ─── 2. Load DB records ───────────────────────────────────────────────────
  const { data: application } = await supabaseAdmin
    .from('applications').select('id, cleaner_id, request_id, status').eq('id', applicationId).single()
  if (!application) return NextResponse.json({ error: 'Application not found' }, { status: 404 })

  const { data: cleanRequest } = await supabaseAdmin
    .from('clean_requests')
    .select('id, customer_id, bedrooms, bathrooms, frequency, hours_per_session, tasks, zone, status, customer_notes, switch_from_request_id, is_switch')
    .eq('id', requestId).single() as { data: any }
  if (!cleanRequest) return NextResponse.json({ error: 'Request not found' }, { status: 404 })
  if (cleanRequest.status === 'fulfilled') {
    return NextResponse.json({ success: true, redirectUrl: `${appUrl}/customer/dashboard?gc_success=1&chat=${conversationId}` })
  }

  const { data: customerRecord } = await supabaseAdmin
    .from('customers').select('id, profile_id, address_line1, address_line2, city, postcode')
    .eq('id', cleanRequest.customer_id).single() as { data: any }
  if (!customerRecord) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })

  const { data: cleanerRecord } = await supabaseAdmin
    .from('cleaners').select('profile_id').eq('id', application.cleaner_id).single() as { data: { profile_id: string } | null }
  const { data: cleanerProfile } = cleanerRecord
    ? await supabaseAdmin.from('profiles').select('full_name, email, phone').eq('id', cleanerRecord.profile_id).single()
    : { data: null }
  const { data: customerProfile } = await supabaseAdmin
    .from('profiles').select('full_name, email, phone').eq('id', customerRecord.profile_id).single() as { data: any }

  const customerFirstName = customerProfile?.full_name?.split(' ')[0] ?? 'Customer'
  const customerFullName = customerProfile?.full_name ?? 'Customer'
  const customerEmail = customerProfile?.email ?? ''
  const customerPhone = customerProfile?.phone ?? null
  const cleanerFullName = (cleanerProfile as any)?.full_name ?? 'Cleaner'
  const cleanerEmail = (cleanerProfile as any)?.email ?? null
  const cleanerPhone = (cleanerProfile as any)?.phone ?? null
  const cleanerFirstName = cleanerFullName.split(' ')[0]
  const cleanerCardUrl = `${appUrl}/c/${application.cleaner_id}`
  const address = formatAddress(customerRecord.address_line1, customerRecord.address_line2, customerRecord.city, customerRecord.postcode)
  const formattedStartDate = formatDate(startDate)
  const frequency = cleanRequest.frequency ?? 'fortnightly'
  const monthlyAmountPence = MONTHLY_AMOUNT_PENCE[frequency] ?? MONTHLY_AMOUNT_PENCE.fortnightly

  // ─── 3. Handle pending switch — farewell to old cleaner ───────────────────
  // If the customer chose "find replacement first", the old request is still
  // fulfilled with switch_pending=true. Now that the new cleaner is confirmed
  // we can fire the farewell email, cancel the old subscription, and close it.
  if (cleanRequest.is_switch && cleanRequest.switch_from_request_id) {
    const { data: oldRequest } = await supabaseAdmin
      .from('clean_requests')
      .select('id, gocardless_subscription_id, assigned_cleaner_id, start_date, frequency, switch_pending')
      .eq('id', cleanRequest.switch_from_request_id)
      .single() as { data: any }

    if (oldRequest?.switch_pending) {
      // Cancel old subscription
      if (oldRequest.gocardless_subscription_id) {
        const cancelRes = await fetch(`${gcBaseUrl}/subscriptions/${oldRequest.gocardless_subscription_id}/actions/cancel`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${gcToken}`, 'GoCardless-Version': '2015-07-06', 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({ data: {} }),
        })
        if (!cancelRes.ok) console.error('Old subscription cancel failed:', await cancelRes.text())
        else console.log('Old subscription cancelled:', oldRequest.gocardless_subscription_id)
      }

      // Close old request
      await supabaseAdmin.from('clean_requests').update({
        status: 'cancelled',
        switch_pending: false,
      } as any).eq('id', oldRequest.id)

      // Send farewell to old cleaner
      if (oldRequest.assigned_cleaner_id) {
        const { data: oldCleanerRec } = await supabaseAdmin.from('cleaners').select('profile_id').eq('id', oldRequest.assigned_cleaner_id).single() as { data: { profile_id: string } | null }
        if (oldCleanerRec) {
          const { data: oldCleanerProfile } = await supabaseAdmin.from('profiles').select('full_name, email').eq('id', oldCleanerRec.profile_id).single() as { data: { full_name: string | null; email: string | null } | null }
          if (oldCleanerProfile?.email) {
            const lastCleanDate = oldRequest.start_date
              ? calcLastCleanDate(oldRequest.start_date, oldRequest.frequency ?? frequency, startDate)
              : startDate
            await resend.emails.send({
              from: 'Vouchee <hello@vouchee.co.uk>',
              to: oldCleanerProfile.email,
              subject: `An update about your Vouchee customer`,
              html: buildFarewellEmail({
                cleanerFirstName: oldCleanerProfile.full_name?.split(' ')[0] ?? 'there',
                customerFirstName,
                lastCleanDate,
                frequency: oldRequest.frequency ?? frequency,
              }),
            }).catch(e => console.error('Farewell email failed:', e))
          }
        }
      }
    }
  }

  // ─── 4. Create pro-rata payment ───────────────────────────────────────────
  const proRataAmount = calcProRata(startDate, frequency)
  if (proRataAmount > 0 && proRataAmount < monthlyAmountPence) {
    const proRataRes = await fetch(`${gcBaseUrl}/payments`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${gcToken}`, 'GoCardless-Version': '2015-07-06', 'Content-Type': 'application/json', 'Accept': 'application/json', 'Idempotency-Key': `prorata-switch-${requestId}-${applicationId}` },
      body: JSON.stringify({ payments: { amount: proRataAmount, currency: 'GBP', charge_date: nextPossibleChargeDate, description: 'Vouchee service fee (pro-rata)', links: { mandate: mandateId }, metadata: { vouchee_request_id: requestId, type: 'pro_rata_switch' } } }),
    })
    if (!proRataRes.ok) console.error('Pro-rata payment failed:', await proRataRes.text())
  }

  // ─── 5. Create new subscription ──────────────────────────────────────────
  const nextMonthDate = new Date(nextPossibleChargeDate)
  nextMonthDate.setMonth(nextMonthDate.getMonth() + 1)
  nextMonthDate.setDate(1)
  const recurringStartDate = nextMonthDate.toISOString().split('T')[0]

  let newSubscriptionId: string | null = null
  const subRes = await fetch(`${gcBaseUrl}/subscriptions`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${gcToken}`, 'GoCardless-Version': '2015-07-06', 'Content-Type': 'application/json', 'Accept': 'application/json', 'Idempotency-Key': `sub-switch-${requestId}-${applicationId}` },
    body: JSON.stringify({ subscriptions: { amount: monthlyAmountPence, currency: 'GBP', interval_unit: 'monthly', interval: 1, start_date: recurringStartDate, name: `Vouchee service fee — ${frequency}`, links: { mandate: mandateId }, metadata: { vouchee_request_id: requestId, vouchee_application_id: applicationId, type: 'switch' } } }),
  })
  if (!subRes.ok) console.error('Subscription creation failed:', await subRes.text())
  else { const subData = await subRes.json(); newSubscriptionId = subData.subscriptions?.id ?? null }

  // ─── 6. DB actions ───────────────────────────────────────────────────────
  await Promise.all([
    supabaseAdmin.from('clean_requests').update({
      status: 'fulfilled',
      start_date: startDate,
      assigned_cleaner_id: application.cleaner_id,
      gocardless_mandate_id: mandateId,
      ...(newSubscriptionId ? { gocardless_subscription_id: newSubscriptionId } : {}),
    } as any).eq('id', requestId),

    supabaseAdmin.from('applications').update({ status: 'accepted' }).eq('id', applicationId),

    supabaseAdmin.from('applications').update({ status: 'rejected' })
      .eq('request_id', requestId).neq('id', applicationId).in('status', ['pending', 'accepted']),

    supabaseAdmin.from('messages').insert({
      conversation_id: conversationId,
      sender_id: customerRecord.profile_id,
      sender_role: 'customer',
      content: `🎉 __system__ Direct Debit confirmed — start date ${formattedStartDate}. Your address has been shared with your cleaner.`,
    }),

    supabaseAdmin.from('notifications').insert({
      cleaner_id: application.cleaner_id,
      type: 'job_won',
      title: `🎉 ${customerFirstName} confirmed you for the job`,
      body: `First clean: ${formattedStartDate}. Check your email for the full job details.`,
      link: '/cleaner/dashboard',
    }),

    cleanerEmail
      ? resend.emails.send({
          from: 'Vouchee <hello@vouchee.co.uk>',
          to: cleanerEmail,
          subject: `🎉 You've been chosen — starting ${formattedStartDate}`,
          html: buildCleanerEmail({ cleanerFirstName, customerFirstName, customerFullName, customerEmail, customerPhone, address, startDate, bedrooms: cleanRequest.bedrooms, bathrooms: cleanRequest.bathrooms, frequency, hours_per_session: cleanRequest.hours_per_session, tasks: cleanRequest.tasks ?? [], customerNotes: cleanRequest.customer_notes ?? null }),
        })
      : Promise.resolve(null),

    customerEmail
      ? resend.emails.send({
          from: 'Vouchee <hello@vouchee.co.uk>',
          to: customerEmail,
          subject: `✅ You're all set — ${cleanerFirstName} starts ${formattedStartDate}`,
          html: buildCustomerConfirmEmail({ customerFirstName, cleanerFullName, cleanerEmail: cleanerEmail ?? '', cleanerPhone, cleanerCardUrl, startDate, bedrooms: cleanRequest.bedrooms, bathrooms: cleanRequest.bathrooms, frequency, hours_per_session: cleanRequest.hours_per_session, tasks: cleanRequest.tasks ?? [] }),
        })
      : Promise.resolve(null),
  ])

  // ─── 7. Reject other applicants ───────────────────────────────────────────
  const { data: rejectedApps } = await supabaseAdmin
    .from('applications').select('id, cleaner_id').eq('request_id', requestId).eq('status', 'rejected').neq('id', applicationId)

  if (rejectedApps?.length) {
    await Promise.allSettled(rejectedApps.map(async (rejApp: any) => {
      const { data: rc } = await supabaseAdmin.from('cleaners').select('profile_id').eq('id', rejApp.cleaner_id).single() as { data: { profile_id: string } | null }
      const { data: rp } = rc ? await supabaseAdmin.from('profiles').select('email').eq('id', rc.profile_id).single() : { data: null }
      if ((rp as any)?.email) {
        await resend.emails.send({
          from: 'Vouchee <hello@vouchee.co.uk>',
          to: (rp as any).email,
          subject: 'Application update from Vouchee',
          html: emailShell(`<p>Thank you for your application. Unfortunately ${customerFirstName} has chosen another cleaner for this role.</p><p>Don't be discouraged — new listings appear regularly.</p><p>— The Vouchee team</p>`, 'Application update'),
        })
      }
    }))
  }

  return NextResponse.json({ success: true, redirectUrl: `${appUrl}/customer/dashboard?gc_success=1&chat=${conversationId}` })
}