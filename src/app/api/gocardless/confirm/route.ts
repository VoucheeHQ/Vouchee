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

function formatFirstLastInitial(name: string): string {
  const parts = (name ?? '').trim().split(' ')
  if (parts.length > 1) return `${parts[0]} ${parts[parts.length - 1][0]}.`
  return parts[0] || 'Cleaner'
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
  const freqLabel = frequency === 'weekly' ? 'Weekly' : frequency === 'fortnightly' ? 'Fortnightly' : frequency === 'monthly' ? 'Monthly' : frequency ?? '—'
  const zoneLabel = ZONE_LABELS[zone] ?? zone
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.vouchee.co.uk'

  const taskChips = (tasks ?? []).map(t =>
    `<span style="display:inline-block;background:#f0fdf4;border:1px solid #bbf7d0;color:#15803d;font-size:12px;font-weight:600;padding:4px 12px;border-radius:100px;margin:3px 3px 3px 0;">${TASK_LABELS[t] ?? t}</span>`
  ).join('')

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:40px 16px;">
  <tr><td align="center">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

    <!-- Header -->
    <tr><td style="background:linear-gradient(135deg,#1e40af,#3b82f6);padding:32px;text-align:center;border-radius:16px 16px 0 0;">
      <div style="font-size:13px;font-weight:700;color:rgba(255,255,255,0.7);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px;">Vouchee</div>
      <div style="font-size:40px;margin-bottom:12px;">🎉</div>
      <div style="font-size:26px;font-weight:800;color:white;letter-spacing:-0.5px;line-height:1.2;">You've been chosen,<br>${cleanerFirstName}!</div>
      <div style="font-size:15px;color:rgba(255,255,255,0.85);margin-top:10px;">Congratulations — a customer has selected you for their regular clean.</div>
    </td></tr>

    <!-- Body -->
    <tr><td style="background:white;padding:32px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 16px 16px;">

      <!-- Start date -->
      <div style="background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:12px;padding:20px 24px;margin-bottom:24px;text-align:center;">
        <div style="font-size:11px;font-weight:700;color:#15803d;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">📅 Start date</div>
        <div style="font-size:22px;font-weight:800;color:#0f172a;">${formatDate(startDate)}</div>
      </div>

      <!-- Job summary -->
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px 24px;margin-bottom:20px;">
        <div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:16px;">Job summary</div>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:6px 0;border-bottom:1px solid #f1f5f9;">
              <span style="font-size:13px;color:#64748b;">Bedrooms</span>
            </td>
            <td style="padding:6px 0;border-bottom:1px solid #f1f5f9;text-align:right;">
              <span style="font-size:13px;font-weight:700;color:#0f172a;">${bedrooms}</span>
            </td>
          </tr>
          <tr>
            <td style="padding:6px 0;border-bottom:1px solid #f1f5f9;">
              <span style="font-size:13px;color:#64748b;">Bathrooms</span>
            </td>
            <td style="padding:6px 0;border-bottom:1px solid #f1f5f9;text-align:right;">
              <span style="font-size:13px;font-weight:700;color:#0f172a;">${bathrooms}</span>
            </td>
          </tr>
          <tr>
            <td style="padding:6px 0;border-bottom:1px solid #f1f5f9;">
              <span style="font-size:13px;color:#64748b;">Frequency</span>
            </td>
            <td style="padding:6px 0;border-bottom:1px solid #f1f5f9;text-align:right;">
              <span style="font-size:13px;font-weight:700;color:#0f172a;">${freqLabel}</span>
            </td>
          </tr>
          <tr>
            <td style="padding:6px 0;border-bottom:1px solid #f1f5f9;">
              <span style="font-size:13px;color:#64748b;">Hours per clean</span>
            </td>
            <td style="padding:6px 0;border-bottom:1px solid #f1f5f9;text-align:right;">
              <span style="font-size:13px;font-weight:700;color:#0f172a;">${hours_per_session} hrs</span>
            </td>
          </tr>

        </table>
      </div>

      <!-- Tasks -->
      ${tasks?.length > 0 ? `
      <div style="margin-bottom:20px;">
        <div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:10px;">Tasks requested</div>
        <div>${taskChips}</div>
      </div>` : ''}

      <!-- Customer notes -->
      ${customerNotes ? `
      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:16px 20px;margin-bottom:20px;">
        <div style="font-size:11px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">💡 Customer notes</div>
        <div style="font-size:14px;color:#78350f;line-height:1.6;font-style:italic;">"${customerNotes}"</div>
      </div>` : ''}

      <!-- Customer details -->
      <div style="background:#eff6ff;border:1.5px solid #bfdbfe;border-radius:12px;padding:20px 24px;margin-bottom:20px;">
        <div style="font-size:11px;font-weight:700;color:#1d4ed8;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:16px;">📋 Customer details</div>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:6px 0;border-bottom:1px solid #dbeafe;width:40%;">
              <span style="font-size:13px;color:#3b82f6;">Name</span>
            </td>
            <td style="padding:6px 0;border-bottom:1px solid #dbeafe;text-align:right;">
              <span style="font-size:13px;font-weight:700;color:#1e40af;">${customerFullName}</span>
            </td>
          </tr>
          <tr>
            <td style="padding:6px 0;border-bottom:1px solid #dbeafe;">
              <span style="font-size:13px;color:#3b82f6;">Email</span>
            </td>
            <td style="padding:6px 0;border-bottom:1px solid #dbeafe;text-align:right;">
              <a href="mailto:${customerEmail}" style="font-size:13px;font-weight:700;color:#1e40af;text-decoration:none;">${customerEmail}</a>
            </td>
          </tr>
          ${customerPhone ? `
          <tr>
            <td style="padding:6px 0;border-bottom:1px solid #dbeafe;">
              <span style="font-size:13px;color:#3b82f6;">Phone</span>
            </td>
            <td style="padding:6px 0;border-bottom:1px solid #dbeafe;text-align:right;">
              <a href="tel:${customerPhone}" style="font-size:13px;font-weight:700;color:#1e40af;text-decoration:none;">${customerPhone}</a>
            </td>
          </tr>` : ''}
          <tr>
            <td style="padding:6px 0;vertical-align:top;">
              <span style="font-size:13px;color:#3b82f6;">Address</span>
            </td>
            <td style="padding:6px 0;text-align:right;">
              <span style="font-size:13px;font-weight:700;color:#1e40af;">${address}</span>
              <div style="font-size:12px;color:#60a5fa;margin-top:2px;">${zoneLabel}, West Sussex</div>
            </td>
          </tr>
        </table>
      </div>

      <!-- Prompt: contact customer -->
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px 20px;margin-bottom:20px;">
        <div style="font-size:14px;font-weight:700;color:#15803d;margin-bottom:6px;">👋 Reach out before your first clean</div>
        <div style="font-size:13px;color:#166534;line-height:1.6;">
          We recommend contacting ${customerFirstName} before their first clean to introduce yourself and reassure them you'll be there. A quick message goes a long way — use the chat in your <a href="${appUrl}/cleaner/dashboard" style="color:#15803d;font-weight:700;">Vouchee dashboard</a>.
        </div>
      </div>

      <!-- Prompt: cleaning supplies -->
      <div style="background:#fefce8;border:1px solid #fef08a;border-radius:12px;padding:16px 20px;margin-bottom:28px;">
        <div style="font-size:14px;font-weight:700;color:#854d0e;margin-bottom:6px;">🧴 Need to restock before your clean?</div>
        <div style="font-size:13px;color:#92400e;line-height:1.6;">
          We've put together a page with everything you might need in one place. <a href="${appUrl}/cleaning-supplies" style="color:#92400e;font-weight:700;text-decoration:underline;">Browse cleaning supplies →</a>
        </div>
      </div>

      <!-- CTA -->
      <a href="${appUrl}/cleaner/dashboard" style="display:block;background:linear-gradient(135deg,#16a34a,#22c55e);color:white;text-align:center;padding:16px;border-radius:12px;font-size:15px;font-weight:700;text-decoration:none;margin-bottom:20px;">View your dashboard →</a>

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
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
    <tr><td style="background:#0f172a;padding:28px 32px;text-align:center;border-radius:16px 16px 0 0;">
      <div style="font-size:22px;font-weight:800;color:white;">Vouchee</div>
    </td></tr>
    <tr><td style="background:white;padding:32px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 16px 16px;">
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

    // 1. Get application
    const { data: application, error: appError } = await supabaseAdmin
      .from('applications').select('id, cleaner_id, request_id, status').eq('id', applicationId).single()
    if (appError || !application) {
      console.error('Application lookup failed:', appError)
      return NextResponse.redirect(`${appUrl}/customer/dashboard?gc_error=1`)
    }

    // 2. Get clean request
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

    // 3. Get customer record
    const { data: customerRecord } = await supabaseAdmin
      .from('customers').select('id, profile_id, address_line1, address_line2, city, postcode')
      .eq('id', cleanRequest.customer_id).single()
    if (!customerRecord) {
      console.error('Customer record not found')
      return NextResponse.redirect(`${appUrl}/customer/dashboard?gc_error=1`)
    }

    // 4. Get cleaner profile — TWO STEP: cleaners table first, then profiles
    const { data: cleanerRecord } = await supabaseAdmin
      .from('cleaners').select('profile_id').eq('id', application.cleaner_id).single()
    
    const { data: cleanerProfile } = cleanerRecord
      ? await supabaseAdmin.from('profiles').select('full_name, email').eq('id', cleanerRecord.profile_id).single()
      : { data: null }

    console.log('Cleaner profile_id:', cleanerRecord?.profile_id, 'email:', cleanerProfile?.email)

    // 5. Get customer profile — TWO STEP
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
      // A. Fulfil the request
      supabaseAdmin.from('clean_requests').update({
        status: 'fulfilled', start_date: startDate, assigned_cleaner_id: application.cleaner_id,
      }).eq('id', requestId),

      // B. Mark application accepted
      supabaseAdmin.from('applications').update({ status: 'accepted' }).eq('id', applicationId),

      // C. Reject all other pending applications
      supabaseAdmin.from('applications').update({ status: 'rejected' })
        .eq('request_id', requestId).neq('id', applicationId).in('status', ['pending', 'accepted']),

      // D. Post system message to chat
      supabaseAdmin.from('messages').insert({
        conversation_id: conversationId,
        sender_id: customerRecord.profile_id,
        sender_role: 'customer',
        content: `🎉 __system__ Direct Debit confirmed — start date ${formattedStartDate}. Your address has been shared with your cleaner.`,
      }),

      // E. Send acceptance email to cleaner
      cleanerEmail
        ? resend.emails.send({
            from: 'Vouchee <hello@vouchee.co.uk>',
            to: cleanerEmail,
            subject: `🎉 You've been chosen — starting ${formattedStartDate}`,
            html: buildCleanerEmail({
              cleanerFirstName,
              customerFirstName,
              customerFullName,
              customerEmail,
              customerPhone,
              address,
              startDate,
              bedrooms: cleanRequest.bedrooms,
              bathrooms: cleanRequest.bathrooms,
              frequency: cleanRequest.frequency ?? '',
              hours_per_session: cleanRequest.hours_per_session,
              tasks: cleanRequest.tasks ?? [],
              zone: cleanRequest.zone ?? '',
              customerNotes: cleanRequest.customer_notes ?? null,
            }),
          })
        : (console.error('No cleaner email found — skipping email'), Promise.resolve(null)),
    ])

    console.log('Core actions complete. Processing rejections...')

    // F. Send rejection emails to other applicants
    const { data: rejectedApps } = await supabaseAdmin
      .from('applications').select('id, cleaner_id')
      .eq('request_id', requestId).eq('status', 'rejected').neq('id', applicationId)

    if (rejectedApps && rejectedApps.length > 0) {
      await Promise.all(
        rejectedApps.map(async (rejApp: any) => {
          // Two-step lookup for rejected cleaner email
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