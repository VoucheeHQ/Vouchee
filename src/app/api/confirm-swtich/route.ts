import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/gocardless/confirm-switch
//
// Called by the frontend when a switching customer (existing mandate) confirms
// a new cleaner. Skips the GoCardless hosted billing page entirely — creates
// the pro-rata payment and new subscription directly on the existing mandate,
// then fires all the same post-confirmation actions as /api/gocardless/confirm.
//
// TODO: Email templates are duplicated from /api/gocardless/confirm/route.ts.
// Extract both to /src/lib/emails/gocardless-confirmation.ts when time permits.
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
const ZONE_LABELS: Record<string, string> = {
  central_south_east: 'Central / South East', north_west: 'North West',
  north_east_roffey: 'North East / Roffey', south_west: 'South West',
  warnham_north: 'Warnham / North', broadbridge_heath: 'Broadbridge Heath',
  mannings_heath: 'Mannings Heath', faygate_kilnwood_vale: 'Faygate / Kilnwood Vale',
  christs_hospital: "Christ's Hospital", southwater: 'Southwater',
}
const MONTHLY_AMOUNT_PENCE: Record<string, number> = {
  weekly: 4333, fortnightly: 3248, monthly: 2499,
}
const PER_CLEAN_PENCE: Record<string, number> = {
  weekly: 999, fortnightly: 1499, monthly: 2499,
}

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

const LOGO_URL = 'https://www.vouchee.co.uk/full-logo-black.png'

function buildCleanerEmail(opts: {
  cleanerFirstName: string; customerFirstName: string; customerFullName: string
  customerEmail: string; customerPhone: string | null; address: string
  startDate: string; bedrooms: number; bathrooms: number; frequency: string
  hours_per_session: number; tasks: string[]; zone: string; customerNotes: string | null
}) {
  const { cleanerFirstName, customerFirstName, customerFullName, customerEmail, customerPhone, address, startDate, bedrooms, bathrooms, frequency, hours_per_session, tasks, zone, customerNotes } = opts
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.vouchee.co.uk'
  const green = (t: string) => `<span style="display:inline-block;background:#f0fdf4;border:1px solid #bbf7d0;color:#15803d;font-size:12px;font-weight:600;padding:4px 14px;border-radius:100px;margin:3px 3px 3px 0;">${TASK_LABELS[t] ?? t}</span>`
  const yellow = (t: string) => `<span style="display:inline-block;background:#fefce8;border:1px solid #fde68a;color:#854d0e;font-size:12px;font-weight:600;padding:4px 14px;border-radius:100px;margin:3px 3px 3px 0;">${TASK_LABELS[t] ?? t}</span>`
  const std = tasks.filter(t => STANDARD_TASK_IDS.has(t))
  const spc = tasks.filter(t => !STANDARD_TASK_IDS.has(t))
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:40px 16px;"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;">
<tr><td style="background:#ffffff;padding:36px 40px 32px;text-align:center;border-radius:16px 16px 0 0;">
  <img src="${LOGO_URL}" width="260" height="60" alt="Vouchee" style="display:block;margin:0 auto 16px;max-width:100%;"/>
  <div style="font-size:32px;font-weight:800;color:#0f172a;letter-spacing:-0.5px;">You've been chosen! 🎉</div>
</td></tr>
<tr><td style="background:white;padding:36px 40px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 16px 16px;">
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
  <div style="background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:12px;padding:24px 28px;margin-bottom:28px;text-align:center;">
    <div style="font-size:15px;font-weight:700;color:#15803d;margin-bottom:8px;">👋 Reach out before the first clean</div>
    <div style="font-size:13px;color:#166534;margin-bottom:18px;">Contact ${customerFirstName} before the first clean to reassure them you'll be there.</div>
    <a href="${appUrl}/cleaner/dashboard" style="display:inline-block;background:#16a34a;color:white;font-size:13px;font-weight:700;padding:11px 28px;border-radius:8px;text-decoration:none;">View your dashboard →</a>
  </div>
  <p style="font-size:12px;color:#94a3b8;text-align:center;margin:0;">Questions? <a href="mailto:cleaners@vouchee.co.uk" style="color:#94a3b8;">cleaners@vouchee.co.uk</a></p>
</td></tr>
<tr><td style="padding:24px 0;text-align:center;"><p style="margin:0;font-size:12px;color:#94a3b8;">© 2026 Vouchee · vouchee.co.uk</p></td></tr>
</table></td></tr></table></body></html>`
}

function buildCustomerConfirmEmail(opts: {
  customerFirstName: string; cleanerFullName: string; cleanerEmail: string
  cleanerPhone: string | null; cleanerCardUrl: string; startDate: string
  bedrooms: number; bathrooms: number; frequency: string; hours_per_session: number
  tasks: string[]; zone: string
}) {
  const { customerFirstName, cleanerFullName, cleanerEmail, cleanerPhone, cleanerCardUrl, startDate, bedrooms, bathrooms, frequency, hours_per_session, tasks, zone } = opts
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.vouchee.co.uk'
  const cleanerFirstName = cleanerFullName.split(' ')[0]
  const green = (t: string) => `<span style="display:inline-block;background:#f0fdf4;border:1px solid #bbf7d0;color:#15803d;font-size:12px;font-weight:600;padding:4px 14px;border-radius:100px;margin:3px 3px 3px 0;">${TASK_LABELS[t] ?? t}</span>`
  const yellow = (t: string) => `<span style="display:inline-block;background:#fefce8;border:1px solid #fde68a;color:#854d0e;font-size:12px;font-weight:600;padding:4px 14px;border-radius:100px;margin:3px 3px 3px 0;">${TASK_LABELS[t] ?? t}</span>`
  const std = tasks.filter(t => STANDARD_TASK_IDS.has(t))
  const spc = tasks.filter(t => !STANDARD_TASK_IDS.has(t))
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:40px 16px;"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;">
<tr><td style="background:#ffffff;padding:36px 40px 32px;text-align:center;border-radius:16px 16px 0 0;">
  <img src="${LOGO_URL}" width="260" height="60" alt="Vouchee" style="display:block;margin:0 auto 36px;max-width:100%;"/>
  <div style="font-size:32px;font-weight:800;color:#0f172a;letter-spacing:-0.5px;">You're all set! 🎉</div>
</td></tr>
<tr><td style="background:white;padding:36px 40px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 16px 16px;">
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
    <div style="font-size:13px;color:#3b82f6;margin-bottom:18px;">Message ${cleanerFirstName} directly through your dashboard to confirm details before the first clean.</div>
    <a href="${appUrl}/customer/dashboard" style="display:inline-block;background:#2563eb;color:white;font-size:13px;font-weight:700;padding:11px 28px;border-radius:8px;text-decoration:none;">Open your dashboard →</a>
  </div>
  <div style="background:#fefce8;border:1px solid #fde68a;border-radius:10px;padding:14px 18px;margin-bottom:28px;">
    <p style="margin:0;font-size:12px;color:#854d0e;line-height:1.6;text-align:center;">
      <strong>Note:</strong> Your Direct Debit is for the <strong>Vouchee service fee only</strong> — your cleaner's payment is agreed directly with them.
    </p>
  </div>
  <p style="font-size:12px;color:#94a3b8;text-align:center;margin:0;">Questions? <a href="mailto:hello@vouchee.co.uk" style="color:#94a3b8;">hello@vouchee.co.uk</a></p>
</td></tr>
<tr><td style="padding:24px 0;text-align:center;"><p style="margin:0;font-size:12px;color:#94a3b8;">© 2026 Vouchee · vouchee.co.uk</p></td></tr>
</table></td></tr></table></body></html>`
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
    console.error('Mandate not active:', mandateStatus)
    return NextResponse.json({ error: 'Mandate is not active — customer may need to re-authorise' }, { status: 400 })
  }
  const nextPossibleChargeDate = mandateData.mandates?.next_possible_charge_date ?? getFirstBillingDate(startDate)

  // ─── 2. Load DB records ───────────────────────────────────────────────────
  const { data: application } = await supabaseAdmin
    .from('applications').select('id, cleaner_id, request_id, status').eq('id', applicationId).single()
  if (!application) return NextResponse.json({ error: 'Application not found' }, { status: 404 })

  const { data: cleanRequest } = await supabaseAdmin
    .from('clean_requests')
    .select('id, customer_id, bedrooms, bathrooms, frequency, hours_per_session, tasks, zone, status, customer_notes')
    .eq('id', requestId).single()
  if (!cleanRequest) return NextResponse.json({ error: 'Request not found' }, { status: 404 })
  if (cleanRequest.status === 'fulfilled') {
    return NextResponse.json({ success: true, redirectUrl: `${appUrl}/customer/dashboard?gc_success=1&chat=${conversationId}` })
  }

  const { data: customerRecord } = await supabaseAdmin
    .from('customers').select('id, profile_id, address_line1, address_line2, city, postcode')
    .eq('id', cleanRequest.customer_id).single()
  if (!customerRecord) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })

  const { data: cleanerRecord } = await supabaseAdmin
    .from('cleaners').select('profile_id').eq('id', application.cleaner_id).single() as { data: { profile_id: string } | null }
  const { data: cleanerProfile } = cleanerRecord
    ? await supabaseAdmin.from('profiles').select('full_name, email, phone').eq('id', cleanerRecord.profile_id).single()
    : { data: null }
  const { data: customerProfile } = await supabaseAdmin
    .from('profiles').select('full_name, email, phone').eq('id', customerRecord.profile_id).single()

  const customerFirstName = (customerProfile as any)?.full_name?.split(' ')[0] ?? 'Customer'
  const customerFullName = (customerProfile as any)?.full_name ?? 'Customer'
  const customerEmail = (customerProfile as any)?.email ?? ''
  const customerPhone = (customerProfile as any)?.phone ?? null
  const cleanerFullName = (cleanerProfile as any)?.full_name ?? 'Cleaner'
  const cleanerEmail = (cleanerProfile as any)?.email ?? null
  const cleanerPhone = (cleanerProfile as any)?.phone ?? null
  const cleanerFirstName = cleanerFullName.split(' ')[0]
  const cleanerCardUrl = `${appUrl}/cleaners/${application.cleaner_id}`
  const address = formatAddress(customerRecord.address_line1, customerRecord.address_line2, customerRecord.city, customerRecord.postcode)
  const formattedStartDate = formatDate(startDate)
  const frequency = cleanRequest.frequency ?? 'fortnightly'
  const monthlyAmountPence = MONTHLY_AMOUNT_PENCE[frequency] ?? MONTHLY_AMOUNT_PENCE.fortnightly

  // ─── 3. Create pro-rata payment ───────────────────────────────────────────
  const proRataAmount = calcProRata(startDate, frequency)
  if (proRataAmount > 0 && proRataAmount < monthlyAmountPence) {
    const proRataRes = await fetch(`${gcBaseUrl}/payments`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${gcToken}`, 'GoCardless-Version': '2015-07-06', 'Content-Type': 'application/json', 'Accept': 'application/json', 'Idempotency-Key': `prorata-switch-${requestId}-${applicationId}` },
      body: JSON.stringify({ payments: { amount: proRataAmount, currency: 'GBP', charge_date: nextPossibleChargeDate, description: 'Vouchee service fee (pro-rata)', links: { mandate: mandateId }, metadata: { vouchee_request_id: requestId, type: 'pro_rata_switch' } } }),
    })
    if (!proRataRes.ok) console.error('Pro-rata payment failed:', await proRataRes.text())
    else console.log('Pro-rata payment created for switch')
  }

  // ─── 4. Create new subscription ──────────────────────────────────────────
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
  else { const subData = await subRes.json(); newSubscriptionId = subData.subscriptions?.id ?? null; console.log('New subscription created:', newSubscriptionId) }

  // ─── 5. Fire all post-confirmation DB actions ─────────────────────────────
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
          html: buildCleanerEmail({ cleanerFirstName, customerFirstName, customerFullName, customerEmail, customerPhone, address, startDate, bedrooms: cleanRequest.bedrooms, bathrooms: cleanRequest.bathrooms, frequency, hours_per_session: cleanRequest.hours_per_session, tasks: cleanRequest.tasks ?? [], zone: cleanRequest.zone ?? '', customerNotes: cleanRequest.customer_notes ?? null }),
        })
      : Promise.resolve(null),

    customerEmail
      ? resend.emails.send({
          from: 'Vouchee <hello@vouchee.co.uk>',
          to: customerEmail,
          subject: `✅ You're all set — ${cleanerFirstName} starts ${formattedStartDate}`,
          html: buildCustomerConfirmEmail({ customerFirstName, cleanerFullName, cleanerEmail: cleanerEmail ?? '', cleanerPhone, cleanerCardUrl, startDate, bedrooms: cleanRequest.bedrooms, bathrooms: cleanRequest.bathrooms, frequency, hours_per_session: cleanRequest.hours_per_session, tasks: cleanRequest.tasks ?? [], zone: cleanRequest.zone ?? '' }),
        })
      : Promise.resolve(null),
  ])

  // ─── 6. Process rejected applications ────────────────────────────────────
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
          html: `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:32px;color:#475569;"><p>Thank you for your application. Unfortunately ${customerFirstName} has chosen another cleaner for this role.</p><p>Don't be discouraged — new listings appear regularly.</p><p>— The Vouchee team</p></body></html>`,
        })
      }
    }))
  }

  return NextResponse.json({ success: true, redirectUrl: `${appUrl}/customer/dashboard?gc_success=1&chat=${conversationId}` })
}