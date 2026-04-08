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

function buildCleanerEmail({
  cleanerFirstName, customerFirstName, customerFullName, customerEmail, customerPhone,
  address, startDate, bedrooms, bathrooms, frequency, hours_per_session,
  tasks, zone, customerNotes,
}: {
  cleanerFirstName: string
  customerFirstName: string
  customerFullName: string
  customerEmail: string
  customerPhone: string | null
  address: string
  startDate: string
  bedrooms: number
  bathrooms: number
  frequency: string
  hours_per_session: number
  tasks: string[]
  zone: string
  customerNotes: string | null
}): string {
  const freqLabel = frequency === 'weekly' ? 'Weekly' : frequency === 'fortnightly' ? 'Fortnightly' : frequency === 'monthly' ? 'Monthly' : frequency || '—'
  const zoneLabel = ZONE_LABELS[zone] ?? zone
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.vouchee.co.uk'

  const taskChips = (tasks ?? []).map(t =>
    `<span style="display:inline-block;background:#f0fdf4;border:1px solid #bbf7d0;color:#15803d;font-size:12px;font-weight:600;padding:4px 14px;border-radius:100px;margin:3px 3px 3px 0;">${TASK_LABELS[t] ?? t}</span>`
  ).join('')

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:40px 16px;">
  <tr><td align="center">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;">

    <!-- Header: white, logo + celebration -->
    <tr><td style="background:#ffffff;padding:36px 40px 32px;text-align:center;border-radius:16px 16px 0 0;border-bottom:3px solid #2563eb;">
      <div style="margin-bottom:20px;"><img src="data:image/png;base64,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" width="200" height="46" alt="Vouchee" style="display:block;margin:0 auto;" /></div>
      <div style="font-size:13px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:12px;">Congratulations</div>
      <div style="font-size:32px;font-weight:800;color:#0f172a;letter-spacing:-0.5px;line-height:1.15;">You've been chosen! 🎉</div>
    </td></tr>

    <!-- Body -->
    <tr><td style="background:white;padding:36px 40px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 16px 16px;">

      <!-- Start date -->
      <div style="background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:12px;padding:22px 28px;margin-bottom:24px;text-align:center;">
        <div style="font-size:11px;font-weight:700;color:#15803d;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">📅 Start date</div>
        <div style="font-size:24px;font-weight:800;color:#0f172a;">${formatDate(startDate)}</div>
      </div>

      <!-- Job summary -->
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:22px 28px;margin-bottom:20px;">
        <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:16px;text-align:center;">Job summary</div>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#64748b;">Bedrooms</td>
            <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;text-align:right;font-size:13px;font-weight:700;color:#0f172a;">${bedrooms}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#64748b;">Bathrooms</td>
            <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;text-align:right;font-size:13px;font-weight:700;color:#0f172a;">${bathrooms}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#64748b;">Frequency</td>
            <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;text-align:right;font-size:13px;font-weight:700;color:#0f172a;">${freqLabel}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;font-size:13px;color:#64748b;">Hours per clean</td>
            <td style="padding:8px 0;text-align:right;font-size:13px;font-weight:700;color:#0f172a;">${hours_per_session} hrs</td>
          </tr>
        </table>
      </div>

      <!-- Tasks -->
      ${tasks?.length > 0 ? `
      <div style="margin-bottom:20px;">
        <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:10px;">Tasks requested</div>
        <div>${taskChips}</div>
      </div>` : ''}

      <!-- Customer notes -->
      ${customerNotes ? `
      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:18px 24px;margin-bottom:20px;">
        <div style="font-size:11px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;text-align:center;">💡 Customer notes</div>
        <div style="font-size:14px;color:#78350f;line-height:1.6;font-style:italic;">"${customerNotes}"</div>
      </div>` : ''}

      <!-- Customer details -->
      <div style="background:#eff6ff;border:1.5px solid #bfdbfe;border-radius:12px;padding:22px 28px;margin-bottom:24px;">
        <div style="font-size:11px;font-weight:700;color:#1d4ed8;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:16px;text-align:center;">📋 Customer details</div>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:8px 0;border-bottom:1px solid #dbeafe;font-size:13px;color:#3b82f6;width:38%;">Name</td>
            <td style="padding:8px 0;border-bottom:1px solid #dbeafe;text-align:right;font-size:13px;font-weight:700;color:#1e40af;">${customerFullName}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;border-bottom:1px solid #dbeafe;font-size:13px;color:#3b82f6;">Email</td>
            <td style="padding:8px 0;border-bottom:1px solid #dbeafe;text-align:right;">
              <a href="mailto:${customerEmail}" style="font-size:13px;font-weight:700;color:#1e40af;text-decoration:none;">${customerEmail}</a>
            </td>
          </tr>
          ${customerPhone ? `
          <tr>
            <td style="padding:8px 0;border-bottom:1px solid #dbeafe;font-size:13px;color:#3b82f6;">Phone</td>
            <td style="padding:8px 0;border-bottom:1px solid #dbeafe;text-align:right;">
              <a href="tel:${customerPhone}" style="font-size:13px;font-weight:700;color:#1e40af;text-decoration:none;">${customerPhone}</a>
            </td>
          </tr>` : ''}
          <tr>
            <td style="padding:8px 0;vertical-align:top;font-size:13px;color:#3b82f6;">Address</td>
            <td style="padding:8px 0;text-align:right;">
              <span style="font-size:13px;font-weight:700;color:#1e40af;">${address}</span>
              <div style="font-size:12px;color:#60a5fa;margin-top:3px;">${zoneLabel}, West Sussex</div>
            </td>
          </tr>
        </table>
      </div>

      <!-- Reach out -->
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:24px 28px;margin-bottom:16px;text-align:center;">
        <div style="font-size:15px;font-weight:700;color:#15803d;margin-bottom:8px;">👋 Reach out before the first clean</div>
        <div style="font-size:13px;color:#166534;line-height:1.6;margin-bottom:18px;">We recommend contacting ${customerFirstName} before the first clean to reassure them you'll be there.<br>Use the chat on your dashboard or their contact details above!</div>
        <a href="${appUrl}/cleaner/dashboard" style="display:inline-block;background:#16a34a;color:white;font-size:13px;font-weight:700;padding:11px 28px;border-radius:8px;text-decoration:none;">Vouchee Dashboard →</a>
      </div>

      <!-- Cleaning supplies -->
      <div style="background:#fefce8;border:1px solid #fef08a;border-radius:12px;padding:24px 28px;margin-bottom:28px;text-align:center;">
        <div style="font-size:15px;font-weight:700;color:#854d0e;margin-bottom:8px;">🧴 Need to restock before your clean?</div>
        <div style="font-size:13px;color:#92400e;line-height:1.6;margin-bottom:18px;">We've put together a page with everything you might need in one place.</div>
        <a href="${appUrl}/cleaning-supplies" style="display:inline-block;background:#ca8a04;color:white;font-size:13px;font-weight:700;padding:11px 28px;border-radius:8px;text-decoration:none;">Browse cleaning supplies →</a>
      </div>

      <!-- Dashboard CTA -->
      <a href="${appUrl}/cleaner/dashboard" style="display:block;background:linear-gradient(135deg,#1e40af,#3b82f6);color:white;text-align:center;padding:16px;border-radius:12px;font-size:15px;font-weight:700;text-decoration:none;margin-bottom:20px;">View your dashboard →</a>

      <p style="font-size:12px;color:#94a3b8;text-align:center;margin:0;line-height:1.6;">
        Questions? Reply to this email or contact us at <a href="mailto:cleaners@vouchee.co.uk" style="color:#94a3b8;">cleaners@vouchee.co.uk</a>
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

function buildRejectionEmail(customerFirstName: string, zone: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.vouchee.co.uk'
  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:40px 16px;">
  <tr><td align="center">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;">
    <tr><td style="background:#ffffff;padding:28px 40px;text-align:center;border-radius:16px 16px 0 0;border-bottom:3px solid #2563eb;">
      <img src="data:image/png;base64,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" width="200" height="46" alt="Vouchee" style="display:block;margin:0 auto;" />
    </td></tr>
    <tr><td style="background:white;padding:36px 40px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 16px 16px;">
      <div style="font-size:20px;font-weight:800;color:#0f172a;margin-bottom:12px;">Application update</div>
      <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 16px;">
        Thank you for your application for the <strong>${ZONE_LABELS[zone] ?? zone}</strong> listing.
        Unfortunately, <strong>${customerFirstName}</strong> has chosen another cleaner for this role.
      </p>
      <p style="font-size:14px;color:#64748b;line-height:1.6;margin:0 0 24px;">
        Don't be discouraged — new listings appear regularly. Keep an eye on the jobs page for new opportunities.
      </p>
      <a href="${appUrl}/jobs" style="display:block;background:#2563eb;color:white;text-align:center;padding:14px;border-radius:10px;font-size:14px;font-weight:700;text-decoration:none;">View available jobs →</a>
    </td></tr>
    <tr><td style="padding:20px 0;text-align:center;">
      <p style="margin:0;font-size:12px;color:#94a3b8;">© 2026 Vouchee · vouchee.co.uk</p>
    </td></tr>
  </table>
  </td></tr>
</table>
</body>
</html>`
}

export async function GET(request: NextRequest) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { searchParams } = new URL(request.url)
  const requestId = searchParams.get('requestId')
  const applicationId = searchParams.get('applicationId')
  const conversationId = searchParams.get('conversationId')
  const startDate = searchParams.get('startDate') ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.vouchee.co.uk'

  if (!requestId || !applicationId || !conversationId) {
    return NextResponse.redirect(`${appUrl}/customer/dashboard?gc_error=1`)
  }

  try {
    console.log('GC confirm: requestId', requestId, 'applicationId', applicationId, 'startDate', startDate)

    const { data: application, error: appError } = await supabaseAdmin
      .from('applications').select('id, cleaner_id, request_id, status').eq('id', applicationId).single()
    if (appError || !application) {
      console.error('Application lookup failed:', appError)
      return NextResponse.redirect(`${appUrl}/customer/dashboard?gc_error=1`)
    }

    const { data: cleanRequest, error: reqError } = await supabaseAdmin
      .from('clean_requests')
      .select('id, customer_id, bedrooms, bathrooms, frequency, hours_per_session, tasks, zone, status, customer_notes')
      .eq('id', requestId).single()
    if (reqError || !cleanRequest) {
      console.error('Clean request lookup failed:', reqError)
      return NextResponse.redirect(`${appUrl}/customer/dashboard?gc_error=1`)
    }

    if (cleanRequest.status === 'fulfilled') {
      console.log('Already fulfilled, redirecting')
      return NextResponse.redirect(`${appUrl}/customer/dashboard?gc_success=1&chat=${conversationId}`)
    }

    const { data: customerRecord } = await supabaseAdmin
      .from('customers').select('id, profile_id, address_line1, address_line2, city, postcode')
      .eq('id', cleanRequest.customer_id).single()
    if (!customerRecord) {
      console.error('Customer record not found')
      return NextResponse.redirect(`${appUrl}/customer/dashboard?gc_error=1`)
    }

    const { data: cleanerRecord } = await supabaseAdmin
      .from('cleaners').select('profile_id').eq('id', application.cleaner_id).single()
    const { data: cleanerProfile } = cleanerRecord
      ? await supabaseAdmin.from('profiles').select('full_name, email').eq('id', cleanerRecord.profile_id).single()
      : { data: null }

    console.log('Cleaner profile_id:', cleanerRecord?.profile_id, 'email:', cleanerProfile?.email)

    const { data: customerProfile } = await supabaseAdmin
      .from('profiles').select('full_name, email, phone').eq('id', customerRecord.profile_id).single()

    const customerFirstName = customerProfile?.full_name?.split(' ')[0] ?? 'Your customer'
    const customerFullName = customerProfile?.full_name ?? 'Your customer'
    const customerEmail = customerProfile?.email ?? ''
    const customerPhone = customerProfile?.phone ?? null
    const cleanerFullName = cleanerProfile?.full_name ?? 'Cleaner'
    const cleanerEmail = cleanerProfile?.email ?? null
    const cleanerFirstName = cleanerFullName.split(' ')[0]

    const address = formatAddress(
      customerRecord.address_line1,
      customerRecord.address_line2,
      customerRecord.city,
      customerRecord.postcode
    )

    const formattedStartDate = formatDate(startDate)
    console.log('Firing all post-confirmation actions. cleanerEmail:', cleanerEmail, 'customerEmail:', customerEmail)

    await Promise.all([
      supabaseAdmin.from('clean_requests').update({
        status: 'fulfilled', start_date: startDate, assigned_cleaner_id: application.cleaner_id,
      }).eq('id', requestId),
      supabaseAdmin.from('applications').update({ status: 'accepted' }).eq('id', applicationId),
      supabaseAdmin.from('applications').update({ status: 'rejected' })
        .eq('request_id', requestId).neq('id', applicationId).in('status', ['pending', 'accepted']),
      supabaseAdmin.from('messages').insert({
        conversation_id: conversationId,
        sender_id: customerRecord.profile_id,
        sender_role: 'customer',
        content: `🎉 __system__ Direct Debit confirmed — start date ${formattedStartDate}. Your address has been shared with your cleaner.`,
      }),
      cleanerEmail
        ? resend.emails.send({
            from: 'Vouchee <hello@vouchee.co.uk>',
            to: cleanerEmail,
            subject: `🎉 You've been chosen — starting ${formattedStartDate}`,
            html: buildCleanerEmail({
              cleanerFirstName, customerFirstName, customerFullName, customerEmail, customerPhone,
              address, startDate,
              bedrooms: cleanRequest.bedrooms, bathrooms: cleanRequest.bathrooms,
              frequency: cleanRequest.frequency ?? '', hours_per_session: cleanRequest.hours_per_session,
              tasks: cleanRequest.tasks ?? [], zone: cleanRequest.zone ?? '',
              customerNotes: cleanRequest.customer_notes ?? null,
            }),
          })
        : (console.error('No cleaner email found — skipping email'), Promise.resolve(null)),
    ])

    console.log('Core actions complete. Processing rejections...')

    const { data: rejectedApps } = await supabaseAdmin
      .from('applications').select('id, cleaner_id')
      .eq('request_id', requestId).eq('status', 'rejected').neq('id', applicationId)

    if (rejectedApps && rejectedApps.length > 0) {
      await Promise.all(
        rejectedApps.map(async (rejApp: any) => {
          const { data: rejCleanerRecord } = await supabaseAdmin
            .from('cleaners').select('profile_id').eq('id', rejApp.cleaner_id).single()
          const { data: rejCleanerProfile } = rejCleanerRecord
            ? await supabaseAdmin.from('profiles').select('email').eq('id', rejCleanerRecord.profile_id).single()
            : { data: null }
          const { data: conv } = await supabaseAdmin
            .from('conversations').select('id')
            .eq('clean_request_id', requestId).eq('cleaner_id', rejApp.cleaner_id).single()
          const tasks = []
          if (conv?.id) {
            tasks.push(supabaseAdmin.from('messages').insert({
              conversation_id: conv.id,
              sender_id: customerRecord.profile_id,
              sender_role: 'customer',
              content: '__system__ This listing has been filled. Thank you for applying.',
            }))
          }
          if (rejCleanerProfile?.email) {
            tasks.push(resend.emails.send({
              from: 'Vouchee <hello@vouchee.co.uk>',
              to: rejCleanerProfile.email,
              subject: 'Application update from Vouchee',
              html: buildRejectionEmail(customerFirstName, cleanRequest.zone ?? ''),
            }))
          }
          return Promise.all(tasks)
        })
      )
    }

    console.log('All done. Redirecting to dashboard.')
    return NextResponse.redirect(`${appUrl}/customer/dashboard?gc_success=1&chat=${conversationId}`)

  } catch (err: any) {
    console.error('GoCardless confirm error:', err)
    return NextResponse.redirect(`${appUrl}/customer/dashboard?gc_error=1`)
  }
}