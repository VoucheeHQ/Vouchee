import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

// -----------------------------------------------------------------
// ADMIN ONLY — test trigger to re-send the cleaner acceptance email
// without running through the full GoCardless flow.
//
// Usage (browser or curl):
//   GET /api/admin/test-cleaner-email?applicationId=XXX&startDate=2026-04-17
//
// startDate is optional — defaults to 7 days from now.
// -----------------------------------------------------------------

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

function formatAddress(a1: string, a2: string | null, city: string, postcode: string): string {
  return [a1, a2, city, postcode].filter(Boolean).join(', ')
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function getFreqLabel(frequency: string | null | undefined): string {
  if (!frequency) return '—'
  const map: Record<string, string> = { weekly: 'Weekly', fortnightly: 'Fortnightly', monthly: 'Monthly' }
  return map[frequency] ?? frequency
}

// Import the same buildCleanerEmail from confirm route — for simplicity
// we inline a trimmed version here so this file is self-contained.
function buildCleanerEmail(args: {
  cleanerFirstName: string; customerFirstName: string; customerFullName: string
  customerEmail: string; customerPhone: string | null; address: string; startDate: string
  bedrooms: number; bathrooms: number; frequency: string; hours_per_session: number
  tasks: string[]; zone: string; customerNotes: string | null
}): string {
  const { cleanerFirstName, customerFirstName, customerFullName, customerEmail,
    customerPhone, address, startDate, bedrooms, bathrooms, frequency,
    hours_per_session, tasks, zone, customerNotes } = args

  const freqLabel = getFreqLabel(frequency)
  const zoneLabel = ZONE_LABELS[zone] ?? zone
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.vouchee.co.uk'

  const standardTasks = (tasks ?? []).filter(t => STANDARD_TASK_IDS.has(t))
  const specialTasks = (tasks ?? []).filter(t => !STANDARD_TASK_IDS.has(t))

  const greenChip = (t: string) =>
    `<span style="display:inline-block;background:#f0fdf4;border:1px solid #bbf7d0;color:#15803d;font-size:12px;font-weight:600;padding:4px 14px;border-radius:100px;margin:3px 3px 3px 0;">${TASK_LABELS[t] ?? t}</span>`
  const yellowChip = (t: string) =>
    `<span style="display:inline-block;background:#fefce8;border:1px solid #fde68a;color:#854d0e;font-size:12px;font-weight:600;padding:4px 14px;border-radius:100px;margin:3px 3px 3px 0;">${TASK_LABELS[t] ?? t}</span>`

  const taskSection = `
    <div style="margin-bottom:20px;">
      <div style="font-size:13px;font-weight:800;color:#0f172a;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:10px;">Tasks requested</div>
      ${standardTasks.length > 0 ? `<div style="margin-bottom:6px;">${standardTasks.map(greenChip).join('')}</div>` : ''}
      ${specialTasks.length > 0 ? `
        <div style="font-size:11px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:0.06em;margin:10px 0 6px;">Special requests</div>
        <div>${specialTasks.map(yellowChip).join('')}</div>
      ` : ''}
    </div>`

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:40px 16px;">
<tr><td align="center"><table width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;">
<tr><td style="background:#fff;padding:36px 40px 32px;text-align:center;border-radius:16px 16px 0 0;">
  <!-- Preheader: controls Gmail preview text -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">You&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;</div>
  <img src="https://www.vouchee.co.uk/full-logo-black.png" width="200" height="46" alt="Vouchee" style="display:block;margin:0 auto 20px;" />
  <div style="font-size:32px;font-weight:800;color:#0f172a;">You've been chosen! 🎉</div>
</td></tr>
<tr><td style="background:white;padding:36px 40px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 16px 16px;">
  <div style="background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:12px;padding:22px 28px;margin-bottom:24px;text-align:center;">
    <div style="font-size:12px;font-weight:800;color:#15803d;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">📅 Start date</div>
    <div style="font-size:24px;font-weight:800;color:#0f172a;">${formatDate(startDate)}</div>
  </div>
  <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:22px 28px;margin-bottom:20px;">
    <div style="font-size:13px;font-weight:800;color:#0f172a;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:16px;text-align:center;">Job summary</div>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#64748b;">Bedrooms</td><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;text-align:right;font-size:13px;font-weight:700;color:#0f172a;">${bedrooms}</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#64748b;">Bathrooms</td><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;text-align:right;font-size:13px;font-weight:700;color:#0f172a;">${bathrooms}</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#64748b;">Frequency</td><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;text-align:right;font-size:13px;font-weight:700;color:#0f172a;">${freqLabel}</td></tr>
      <tr><td style="padding:8px 0;font-size:13px;color:#64748b;">Hours per clean</td><td style="padding:8px 0;text-align:right;font-size:13px;font-weight:700;color:#0f172a;">${hours_per_session} hrs</td></tr>
    </table>
  </div>
  ${taskSection}
  ${customerNotes ? `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:18px 24px;margin-bottom:20px;"><div style="font-size:13px;font-weight:800;color:#0f172a;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px;text-align:center;">Customer notes</div><div style="font-size:14px;color:#475569;line-height:1.6;font-style:italic;">"${customerNotes}"</div></div>` : ''}
  <div style="background:#eff6ff;border:1.5px solid #bfdbfe;border-radius:12px;padding:22px 28px;margin-bottom:24px;">
    <div style="font-size:13px;font-weight:800;color:#1d4ed8;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:16px;text-align:center;">Customer details</div>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding:8px 0;border-bottom:1px solid #dbeafe;font-size:13px;color:#3b82f6;width:38%;">Name</td><td style="padding:8px 0;border-bottom:1px solid #dbeafe;text-align:right;font-size:13px;font-weight:700;color:#1e40af;">${customerFullName}</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #dbeafe;font-size:13px;color:#3b82f6;">Email</td><td style="padding:8px 0;border-bottom:1px solid #dbeafe;text-align:right;"><a href="mailto:${customerEmail}" style="font-size:13px;font-weight:700;color:#1e40af;text-decoration:none;">${customerEmail}</a></td></tr>
      ${customerPhone ? `<tr><td style="padding:8px 0;border-bottom:1px solid #dbeafe;font-size:13px;color:#3b82f6;">Phone</td><td style="padding:8px 0;border-bottom:1px solid #dbeafe;text-align:right;"><a href="tel:${customerPhone}" style="font-size:13px;font-weight:700;color:#1e40af;text-decoration:none;">${customerPhone}</a></td></tr>` : ''}
      <tr><td style="padding:8px 0;vertical-align:top;font-size:13px;color:#3b82f6;">Address</td><td style="padding:8px 0;text-align:right;"><span style="font-size:13px;font-weight:700;color:#1e40af;">${address}</span><div style="font-size:12px;color:#60a5fa;margin-top:3px;">${zoneLabel}, West Sussex</div></td></tr>
    </table>
  </div>
  <div style="background:#fefce8;border:1px solid #fef08a;border-radius:12px;padding:24px 28px;margin-bottom:16px;text-align:center;">
    <div style="font-size:15px;font-weight:700;color:#854d0e;margin-bottom:8px;">🧴 Need to restock before your clean?</div>
    <div style="font-size:13px;color:#92400e;line-height:1.6;margin-bottom:18px;">We've put together a page with everything you might need in one place.</div>
    <a href="${appUrl}/cleaning-supplies" style="display:inline-block;background:#16a34a;color:white;font-size:13px;font-weight:700;padding:11px 28px;border-radius:8px;text-decoration:none;">Browse cleaning supplies →</a>
  </div>
  <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:24px 28px;margin-bottom:28px;text-align:center;">
    <div style="font-size:15px;font-weight:700;color:#1d4ed8;margin-bottom:8px;">👋 Reach out before the first clean</div>
    <div style="font-size:13px;color:#1e40af;line-height:1.6;margin-bottom:18px;">We recommend contacting ${customerFirstName} before the first clean to reassure them you'll be there.<br>Use the chat on your dashboard or their contact details above!</div>
    <a href="${appUrl}/cleaner/dashboard" style="display:inline-block;background:#2563eb;color:white;font-size:13px;font-weight:700;padding:11px 28px;border-radius:8px;text-decoration:none;">View your dashboard →</a>
  </div>
  <p style="font-size:12px;color:#94a3b8;text-align:center;margin:0;">Questions? <a href="mailto:cleaners@vouchee.co.uk" style="color:#94a3b8;">cleaners@vouchee.co.uk</a></p>
</td></tr>
<tr><td style="padding:24px 0;text-align:center;"><p style="margin:0;font-size:12px;color:#94a3b8;">© 2026 Vouchee · vouchee.co.uk</p></td></tr>
</table></td></tr></table></body></html>`
}

export async function GET(request: NextRequest) {
  // Simple secret check — add ?secret=vouchee-test to the URL
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret'); const overrideTo = searchParams.get('overrideTo')
  if (secret !== 'vouchee-test') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const applicationId = searchParams.get('applicationId')
  const startDate = searchParams.get('startDate') ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  if (!applicationId) {
    return NextResponse.json({ error: 'applicationId required' }, { status: 400 })
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    // Get application → cleaner
    const { data: application } = await supabaseAdmin
      .from('applications').select('id, cleaner_id, request_id').eq('id', applicationId).single()
    if (!application) return NextResponse.json({ error: 'Application not found' }, { status: 404 })

    // Get clean request
    const { data: cleanRequest } = await supabaseAdmin
      .from('clean_requests')
      .select('id, customer_id, bedrooms, bathrooms, frequency, hours_per_session, tasks, zone, customer_notes')
      .eq('id', application.request_id).single()
    if (!cleanRequest) return NextResponse.json({ error: 'Clean request not found' }, { status: 404 })

    // Get customer
    const { data: customerRecord } = await supabaseAdmin
      .from('customers').select('id, profile_id, address_line1, address_line2, city, postcode')
      .eq('id', cleanRequest.customer_id).single()
    if (!customerRecord) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })

    // Get cleaner email (two-step)
    const { data: cleanerRecord } = await supabaseAdmin
      .from('cleaners').select('profile_id').eq('id', application.cleaner_id).single()
    const { data: cleanerProfile } = cleanerRecord
      ? await supabaseAdmin.from('profiles').select('full_name, email').eq('id', cleanerRecord.profile_id).single()
      : { data: null }

    // Get customer profile
    const { data: customerProfile } = await supabaseAdmin
      .from('profiles').select('full_name, email, phone').eq('id', customerRecord.profile_id).single()

    if (!cleanerProfile?.email) {
      return NextResponse.json({ error: 'Cleaner email not found' }, { status: 404 })
    }

    const cleanerFirstName = (cleanerProfile.full_name ?? 'Cleaner').split(' ')[0]
    const customerFirstName = customerProfile?.full_name?.split(' ')[0] ?? 'Your customer'
    const customerFullName = customerProfile?.full_name ?? 'Your customer'
    const customerEmail = customerProfile?.email ?? ''
    const customerPhone = customerProfile?.phone ?? null
    const address = formatAddress(
      customerRecord.address_line1, customerRecord.address_line2,
      customerRecord.city, customerRecord.postcode
    )
    const formattedStartDate = formatDate(startDate)

    const result = await resend.emails.send({
      from: 'Vouchee <hello@vouchee.co.uk>',
      to: overrideTo ?? cleanerProfile.email,
      subject: `🎉 [TEST] You've been chosen — starting ${formattedStartDate}`,
      html: buildCleanerEmail({
        cleanerFirstName, customerFirstName, customerFullName, customerEmail, customerPhone,
        address, startDate,
        bedrooms: cleanRequest.bedrooms, bathrooms: cleanRequest.bathrooms,
        frequency: cleanRequest.frequency ?? '', hours_per_session: cleanRequest.hours_per_session,
        tasks: cleanRequest.tasks ?? [], zone: cleanRequest.zone ?? '',
        customerNotes: cleanRequest.customer_notes ?? null,
      }),
    })

    return NextResponse.json({
      success: true,
      sentTo: overrideTo ?? cleanerProfile.email,
      startDate,
      resendId: result.data?.id,
    })

  } catch (err: any) {
    console.error('Test email error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}