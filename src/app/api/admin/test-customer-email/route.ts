import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function getFreqLabel(frequency: string): string {
  const map: Record<string, string> = { weekly: 'Weekly', fortnightly: 'Fortnightly', monthly: 'Monthly' }
  return map[frequency] ?? frequency
}

function buildCustomerConfirmEmail({
  customerFirstName, cleanerFullName, cleanerEmail, cleanerPhone, cleanerCardUrl,
  startDate, bedrooms, bathrooms, frequency, hours_per_session, tasks, zone,
}: {
  customerFirstName: string; cleanerFullName: string; cleanerEmail: string
  cleanerPhone: string | null; cleanerCardUrl: string; startDate: string; bedrooms: number
  bathrooms: number; frequency: string; hours_per_session: number
  tasks: string[]; zone: string
}): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.vouchee.co.uk'
  const freqLabel = getFreqLabel(frequency)
  const cleanerFirstName = cleanerFullName.split(' ')[0]

  const standardTasks = (tasks ?? []).filter(t => STANDARD_TASK_IDS.has(t))
  const specialTasks  = (tasks ?? []).filter(t => !STANDARD_TASK_IDS.has(t))

  const greenChip = (t: string) =>
    `<span style="display:inline-block;background:#f0fdf4;border:1px solid #bbf7d0;color:#15803d;font-size:12px;font-weight:600;padding:4px 14px;border-radius:100px;margin:3px 3px 3px 0;">${TASK_LABELS[t] ?? t}</span>`
  const yellowChip = (t: string) =>
    `<span style="display:inline-block;background:#fefce8;border:1px solid #fde68a;color:#854d0e;font-size:12px;font-weight:600;padding:4px 14px;border-radius:100px;margin:3px 3px 3px 0;">${TASK_LABELS[t] ?? t}</span>`

  const taskSection = `
    <div style="margin-bottom:20px;">
      <div style="font-size:13px;font-weight:800;color:#0f172a;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:10px;">Tasks</div>
      ${standardTasks.length > 0 ? `<div style="margin-bottom:6px;">${standardTasks.map(greenChip).join('')}</div>` : ''}
      ${specialTasks.length > 0 ? `
        <div style="font-size:13px;font-weight:800;color:#92400e;text-transform:uppercase;letter-spacing:0.06em;margin:10px 0 6px;">Special requests</div>
        <div>${specialTasks.map(yellowChip).join('')}</div>
      ` : ''}
    </div>`

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:40px 16px;">
  <tr><td align="center">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;">

    <!-- Header -->
    <tr><td style="background:#ffffff;padding:36px 40px 32px;text-align:center;border-radius:16px 16px 0 0;">
      <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">Your cleaner is confirmed — here are all the details you need.</div>
      <img src="https://www.vouchee.co.uk/full-logo-black.png" width="260" height="60" alt="Vouchee" style="display:block;margin:0 auto 36px;max-width:100%;" />
      <div style="font-size:32px;font-weight:800;color:#0f172a;letter-spacing:-0.5px;line-height:1.15;">You're all set! 🎉</div>
    </td></tr>

    <!-- Body -->
    <tr><td style="background:white;padding:36px 40px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 16px 16px;">

      <!-- Start date -->
      <div style="background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:12px;padding:22px 28px;margin-bottom:24px;text-align:center;">
        <div style="font-size:12px;font-weight:800;color:#15803d;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">📅 First clean</div>
        <div style="font-size:24px;font-weight:800;color:#0f172a;">${formatDate(startDate)}</div>
      </div>

      <!-- Cleaner details -->
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:22px 28px;margin-bottom:16px;">
        <div style="font-size:13px;font-weight:800;color:#0f172a;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:16px;text-align:center;">Your cleaner</div>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#374151;width:38%;">Name</td>
            <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;text-align:right;font-size:13px;font-weight:700;color:#0f172a;">${cleanerFullName}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#374151;">Email</td>
            <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;text-align:right;">
              <a href="mailto:${cleanerEmail}" style="font-size:13px;font-weight:700;color:#1e40af;text-decoration:none;">${cleanerEmail}</a>
            </td>
          </tr>
          ${cleanerPhone ? `
          <tr>
            <td style="padding:8px 0;font-size:13px;color:#374151;">Phone</td>
            <td style="padding:8px 0;text-align:right;">
              <a href="tel:${cleanerPhone}" style="font-size:13px;font-weight:700;color:#1e40af;text-decoration:none;">${cleanerPhone}</a>
            </td>
          </tr>` : ''}
        </table>
      </div>

      <!-- Cleaner card CTA -->
      <div style="text-align:center;margin-bottom:24px;">
        <a href="${cleanerCardUrl}" style="display:inline-block;background:#f8fafc;border:1.5px solid #e2e8f0;color:#0f172a;font-size:13px;font-weight:700;padding:10px 24px;border-radius:8px;text-decoration:none;">View ${cleanerFirstName}'s profile →</a>
      </div>

      <!-- Job summary -->
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:22px 28px;margin-bottom:20px;">
        <div style="font-size:13px;font-weight:800;color:#0f172a;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:16px;text-align:center;">Clean summary</div>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#374151;">Bedrooms</td>
            <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;text-align:right;font-size:13px;font-weight:700;color:#0f172a;">${bedrooms}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#374151;">Bathrooms</td>
            <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;text-align:right;font-size:13px;font-weight:700;color:#0f172a;">${bathrooms}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#374151;">Frequency</td>
            <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;text-align:right;font-size:13px;font-weight:700;color:#0f172a;">${freqLabel}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;font-size:13px;color:#374151;">Hours per clean</td>
            <td style="padding:8px 0;text-align:right;font-size:13px;font-weight:700;color:#0f172a;">${hours_per_session} hrs</td>
          </tr>
        </table>
      </div>

      <!-- Tasks -->
      ${taskSection}

      <!-- Cleaning supplies -->
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:24px 28px;margin-bottom:16px;text-align:center;">
        <div style="font-size:15px;font-weight:700;color:#15803d;margin-bottom:8px;">🧴 Stock up before your first clean</div>
        <div style="font-size:13px;color:#166534;line-height:1.6;margin-bottom:18px;">Make sure you've got everything your cleaner needs. We've put together a list of recommended products.</div>
        <a href="${appUrl}/cleaning-supplies" style="display:inline-block;background:#16a34a;color:white;font-size:13px;font-weight:700;padding:11px 28px;border-radius:8px;text-decoration:none;">Browse cleaning supplies →</a>
      </div>

      <!-- Dashboard CTA -->
      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:24px 28px;margin-bottom:28px;text-align:center;">
        <div style="font-size:15px;font-weight:700;color:#1e40af;margin-bottom:8px;">💬 Chat with ${cleanerFirstName}</div>
        <div style="font-size:13px;color:#3b82f6;line-height:1.6;margin-bottom:18px;">Message ${cleanerFirstName} directly through your dashboard to confirm any details before the first clean.</div>
        <a href="${appUrl}/customer/dashboard" style="display:inline-block;background:#2563eb;color:white;font-size:13px;font-weight:700;padding:11px 28px;border-radius:8px;text-decoration:none;">Open your dashboard →</a>
      </div>

      <!-- What happens next -->
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px 24px;margin-bottom:20px;">
        <div style="font-size:13px;font-weight:800;color:#0f172a;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:14px;text-align:center;">What happens next</div>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="padding:6px 0;font-size:16px;width:28px;">💬</td><td style="padding:6px 0;font-size:13px;color:#475569;line-height:1.55;">${cleanerFirstName} will reach out to introduce themselves before your first clean</td></tr>
          <tr><td style="padding:6px 0;font-size:16px;">🔑</td><td style="padding:6px 0;font-size:13px;color:#475569;line-height:1.55;">Discuss access arrangements and any special instructions</td></tr>
          <tr><td style="padding:6px 0;font-size:16px;">🧹</td><td style="padding:6px 0;font-size:13px;color:#475569;line-height:1.55;">Your first clean is on ${formatDate(startDate)}</td></tr>
          <tr><td style="padding:6px 0;font-size:16px;">💳</td><td style="padding:6px 0;font-size:13px;color:#475569;line-height:1.55;">Your Direct Debit will be collected monthly going forward</td></tr>
        </table>
      </div>

      <!-- DD clarification notice -->
      <div style="background:#fefce8;border:1px solid #fde68a;border-radius:10px;padding:14px 18px;margin-bottom:28px;">
        <p style="margin:0;font-size:12px;color:#854d0e;line-height:1.6;text-align:center;">
          <strong>Note:</strong> Your Direct Debit is for the <strong>Vouchee service fee only</strong> — it does not cover your cleaner's payment. You and ${cleanerFirstName} will agree payment terms directly.
        </p>
      </div>

      <p style="font-size:12px;color:#94a3b8;text-align:center;margin:0;line-height:1.6;">
        Questions? Reply to this email or contact us at <a href="mailto:hello@vouchee.co.uk" style="color:#94a3b8;">hello@vouchee.co.uk</a>
      </p>

    </td></tr>

    <!-- Footer -->
    <tr><td style="padding:24px 0;text-align:center;">
      <p style="margin:0;font-size:12px;color:#94a3b8;">© 2026 Vouchee · <a href="https://www.vouchee.co.uk" style="color:#94a3b8;text-decoration:none;">vouchee.co.uk</a></p>
    </td></tr>

  </table>
  </td></tr>
</table>
</body>
</html>`
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')
  const overrideTo = searchParams.get('overrideTo')
  const applicationId = searchParams.get('applicationId')
  const startDate = searchParams.get('startDate') ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  if (secret !== 'vouchee-test') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.vouchee.co.uk'

  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: application } = await supabaseAdmin
      .from('applications').select('cleaner_id, request_id').eq('id', applicationId).single()

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    const { data: cleanRequest } = await supabaseAdmin
      .from('clean_requests')
      .select('customer_id, bedrooms, bathrooms, frequency, hours_per_session, tasks, zone')
      .eq('id', application.request_id).single()

    const { data: cleanerRecord } = await supabaseAdmin
      .from('cleaners').select('profile_id').eq('id', application.cleaner_id).single()

    const { data: cleanerProfile } = cleanerRecord
      ? await supabaseAdmin.from('profiles').select('full_name, email, phone').eq('id', cleanerRecord.profile_id).single()
      : { data: null }

    const { data: customerRecord } = await supabaseAdmin
      .from('customers').select('profile_id').eq('id', cleanRequest?.customer_id).single()

    const { data: customerProfile } = customerRecord
      ? await supabaseAdmin.from('profiles').select('full_name, email').eq('id', customerRecord.profile_id).single()
      : { data: null }

    const customerFirstName = customerProfile?.full_name?.split(' ')[0] ?? 'Adam'
    const cleanerFullName   = cleanerProfile?.full_name ?? 'Alison Wondermaids'
    const cleanerEmail      = cleanerProfile?.email ?? 'alison@example.com'
    const cleanerPhone      = cleanerProfile?.phone ?? null
    const cleanerCardUrl    = `${appUrl}/cleaners/${application.cleaner_id}`
    const sendTo            = overrideTo ?? customerProfile?.email ?? 'adamjbell95@gmail.com'

    const html = buildCustomerConfirmEmail({
      customerFirstName,
      cleanerFullName,
      cleanerEmail,
      cleanerPhone,
      cleanerCardUrl,
      startDate,
      bedrooms: cleanRequest?.bedrooms ?? 3,
      bathrooms: cleanRequest?.bathrooms ?? 1,
      frequency: cleanRequest?.frequency ?? 'fortnightly',
      hours_per_session: cleanRequest?.hours_per_session ?? 3,
      tasks: cleanRequest?.tasks ?? ['general', 'hoovering', 'mopping', 'bathroom', 'kitchen', 'ironing', 'changing_beds'],
      zone: cleanRequest?.zone ?? 'central_south_east',
    })

    const result = await resend.emails.send({
      from: 'Vouchee <hello@vouchee.co.uk>',
      to: sendTo,
      subject: `[TEST] ✅ You're all set — ${cleanerFullName.split(' ')[0]} starts ${new Date(startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}`,
      html,
    })

    return NextResponse.json({ success: true, sentTo: sendTo, emailId: result.data?.id })
  } catch (err: any) {
    console.error('Test customer email error:', err)
    return NextResponse.json({ error: err.message ?? 'Failed to send' }, { status: 500 })
  }
}