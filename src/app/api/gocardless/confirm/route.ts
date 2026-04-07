import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY!)

const TASK_LABELS: Record<string, string> = {
  general_cleaning: 'General cleaning', hoovering: 'Hoovering', mopping: 'Mopping',
  bathroom: 'Bathroom clean', kitchen: 'Kitchen clean', windows_interior: 'Interior windows',
  fridge: 'Fridge clean', blinds: 'Blinds', mold: 'Mould removal',
  ironing: 'Ironing', laundry: 'Laundry', changing_beds: 'Changing beds', garage: 'Garage / utility',
}

const ZONE_LABELS: Record<string, string> = {
  central_south_east: 'Central / South East', north_west: 'North West',
  north_east_roffey: 'North East / Roffey', south_west: 'South West',
  warnham_north: 'Warnham / North', broadbridge_heath: 'Broadbridge Heath',
  mannings_heath: 'Mannings Heath', faygate_kilnwood_vale: 'Faygate / Kilnwood Vale',
  christs_hospital: "Christ's Hospital",
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
  cleanerName, customerFirstName, address, startDate, bedrooms, bathrooms,
  frequency, hourly_rate, hours_per_session, tasks, zone,
}: {
  cleanerName: string, customerFirstName: string, address: string, startDate: string,
  bedrooms: number, bathrooms: number, frequency: string, hourly_rate: number,
  hours_per_session: number, tasks: string[], zone: string,
}): string {
  const taskChips = (tasks ?? []).map(t =>
    `<span style="display:inline-block;background:#f0fdf4;border:1px solid #bbf7d0;color:#15803d;font-size:12px;font-weight:600;padding:3px 10px;border-radius:100px;margin:2px;">${TASK_LABELS[t] ?? t}</span>`
  ).join('')

  const freqLabel = frequency === 'weekly' ? 'Weekly' : frequency === 'fortnightly' ? 'Fortnightly' : frequency === 'monthly' ? 'Monthly' : frequency ?? '—'
  const estPerSession = hourly_rate && hours_per_session ? `£${(hourly_rate * hours_per_session).toFixed(2)}` : '—'

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
        <tr><td style="background:#0f172a;padding:28px 32px;text-align:center;border-radius:16px 16px 0 0;">
          <div style="font-size:22px;font-weight:800;color:white;letter-spacing:-0.5px;">Vouchee</div>
          <div style="font-size:13px;color:rgba(255,255,255,0.6);margin-top:4px;">vouchee.co.uk</div>
        </td></tr>
        <tr><td style="background:white;padding:32px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 16px 16px;">
          <div style="font-size:24px;font-weight:800;color:#0f172a;margin-bottom:6px;">🎉 You've been chosen!</div>
          <p style="font-size:15px;color:#475569;margin:0 0 24px;line-height:1.6;">
            Great news, ${cleanerName} — <strong>${customerFirstName}</strong> has selected you for their regular clean. Here are all the details you need to get started.
          </p>
          <div style="background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:12px;padding:20px 24px;margin-bottom:20px;text-align:center;">
            <div style="font-size:11px;font-weight:700;color:#15803d;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">Start date</div>
            <div style="font-size:22px;font-weight:800;color:#0f172a;">${formatDate(startDate)}</div>
          </div>
          <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:16px 20px;margin-bottom:20px;">
            <div style="font-size:11px;font-weight:700;color:#1d4ed8;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">📍 Customer address</div>
            <div style="font-size:15px;font-weight:700;color:#0f172a;">${address}</div>
            <div style="font-size:12px;color:#64748b;margin-top:4px;">${ZONE_LABELS[zone] ?? zone}</div>
          </div>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px 20px;margin-bottom:20px;">
            <div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:12px;">Job summary</div>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td style="padding:4px 0;font-size:13px;color:#64748b;width:50%;">Bedrooms</td><td style="padding:4px 0;font-size:13px;font-weight:700;color:#0f172a;">${bedrooms}</td></tr>
              <tr><td style="padding:4px 0;font-size:13px;color:#64748b;">Bathrooms</td><td style="padding:4px 0;font-size:13px;font-weight:700;color:#0f172a;">${bathrooms}</td></tr>
              <tr><td style="padding:4px 0;font-size:13px;color:#64748b;">Frequency</td><td style="padding:4px 0;font-size:13px;font-weight:700;color:#0f172a;">${freqLabel}</td></tr>
              <tr><td style="padding:4px 0;font-size:13px;color:#64748b;">Hours per clean</td><td style="padding:4px 0;font-size:13px;font-weight:700;color:#0f172a;">${hours_per_session} hrs</td></tr>
              <tr><td style="padding:4px 0;font-size:13px;color:#64748b;">Rate</td><td style="padding:4px 0;font-size:13px;font-weight:700;color:#0f172a;">£${hourly_rate?.toFixed(2)}/hr (~${estPerSession} per clean)</td></tr>
            </table>
          </div>
          ${tasks?.length > 0 ? `
          <div style="margin-bottom:20px;">
            <div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">Tasks requested</div>
            <div>${taskChips}</div>
          </div>` : ''}
          <p style="font-size:13px;color:#94a3b8;margin:24px 0 0;text-align:center;">
            Communicate with ${customerFirstName} via your <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.vouchee.co.uk'}/cleaner/dashboard" style="color:#2563eb;">Vouchee dashboard</a>.
          </p>
        </td></tr>
        <tr><td style="padding:20px 0;text-align:center;">
          <p style="margin:0;font-size:12px;color:#94a3b8;">© 2026 Vouchee · <a href="https://www.vouchee.co.uk" style="color:#94a3b8;">vouchee.co.uk</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function buildRejectionEmail(customerFirstName: string, zone: string): string {
  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
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
            Don't be discouraged — new listings appear regularly. Keep an eye on your jobs page for new opportunities.
          </p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.vouchee.co.uk'}/cleaner/jobs" style="display:block;background:#2563eb;color:white;text-align:center;padding:14px;border-radius:10px;font-size:14px;font-weight:700;text-decoration:none;">View available jobs →</a>
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
  // ✅ KEY FIX: read startDate directly from URL params — don't try to fetch from GoCardless
  const startDate = searchParams.get('startDate') ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.vouchee.co.uk'

  if (!requestId || !applicationId || !conversationId) {
    return NextResponse.redirect(`${appUrl}/customer/dashboard?gc_error=1`)
  }

  try {
    console.log('GC confirm: requestId', requestId, 'applicationId', applicationId, 'startDate', startDate)

    // 1. Get the application
    const { data: application, error: appError } = await supabaseAdmin
      .from('applications')
      .select('id, cleaner_id, request_id, status')
      .eq('id', applicationId)
      .single()

    if (appError || !application) {
      console.error('Application lookup failed:', appError)
      return NextResponse.redirect(`${appUrl}/customer/dashboard?gc_error=1`)
    }

    // 2. Get the clean request
    const { data: cleanRequest, error: reqError } = await supabaseAdmin
      .from('clean_requests')
      .select('id, customer_id, bedrooms, bathrooms, frequency, hourly_rate, hours_per_session, tasks, zone, status')
      .eq('id', requestId)
      .single()

    if (reqError || !cleanRequest) {
      console.error('Clean request lookup failed:', reqError)
      return NextResponse.redirect(`${appUrl}/customer/dashboard?gc_error=1`)
    }

    // Guard: already fulfilled (double redirect protection)
    if (cleanRequest.status === 'fulfilled') {
      console.log('Already fulfilled, redirecting')
      return NextResponse.redirect(`${appUrl}/customer/dashboard?gc_success=1&chat=${conversationId}`)
    }

    // 3. Get customer record + address
    const { data: customerRecord } = await supabaseAdmin
      .from('customers')
      .select('id, profile_id, address_line1, address_line2, city, postcode')
      .eq('id', cleanRequest.customer_id)
      .single()

    if (!customerRecord) {
      console.error('Customer record not found')
      return NextResponse.redirect(`${appUrl}/customer/dashboard?gc_error=1`)
    }

    // 4. Get cleaner profile
    const { data: cleanerRecord } = await supabaseAdmin
      .from('cleaners')
      .select('profile_id, profiles(full_name, email)')
      .eq('id', application.cleaner_id)
      .single() as { data: { profile_id: string; profiles: { full_name: string; email: string } } | null }

    // 5. Get customer profile for first name
    const { data: customerProfile } = await supabaseAdmin
      .from('profiles')
      .select('full_name')
      .eq('id', customerRecord.profile_id)
      .single()

    const customerFirstName = customerProfile?.full_name?.split(' ')[0] ?? 'Your customer'
    const cleanerFullName = cleanerRecord?.profiles?.full_name ?? 'Cleaner'
    const cleanerEmail = cleanerRecord?.profiles?.email ?? null
    const cleanerDisplayName = formatFirstLastInitial(cleanerFullName)

    const address = formatAddress(
      customerRecord.address_line1,
      customerRecord.address_line2,
      customerRecord.city,
      customerRecord.postcode
    )

    const formattedStartDate = formatDate(startDate)
    console.log('Firing all post-confirmation actions. startDate:', startDate, 'cleanerEmail:', cleanerEmail)

    // ── Fire everything simultaneously ──────────────────────────────────────
    await Promise.all([

      // A. Update clean_request: fulfilled + start_date + assigned_cleaner_id
      supabaseAdmin
        .from('clean_requests')
        .update({
          status: 'fulfilled',
          start_date: startDate,
          assigned_cleaner_id: application.cleaner_id,
        })
        .eq('id', requestId),

      // B. Update accepted application to confirmed
      supabaseAdmin
        .from('applications')
        .update({ status: 'accepted' })
        .eq('id', applicationId),

      // C. Reject all other pending applications for this request
      supabaseAdmin
        .from('applications')
        .update({ status: 'rejected' })
        .eq('request_id', requestId)
        .neq('id', applicationId)
        .in('status', ['pending', 'accepted']),

      // D. Post confirmed system message to accepted chat
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
              cleanerName: cleanerDisplayName,
              customerFirstName,
              address,
              startDate,
              bedrooms: cleanRequest.bedrooms,
              bathrooms: cleanRequest.bathrooms,
              frequency: cleanRequest.frequency ?? '',
              hourly_rate: cleanRequest.hourly_rate,
              hours_per_session: cleanRequest.hours_per_session,
              tasks: cleanRequest.tasks ?? [],
              zone: cleanRequest.zone ?? '',
            }),
          })
        : Promise.resolve(null),
    ])

    console.log('Core actions complete. Processing rejections...')

    // F. Get all rejected apps and send their emails + system messages
    const { data: rejectedApps } = await supabaseAdmin
      .from('applications')
      .select('id, cleaner_id')
      .eq('request_id', requestId)
      .eq('status', 'rejected')
      .neq('id', applicationId)

    if (rejectedApps && rejectedApps.length > 0) {
      await Promise.all(
        rejectedApps.map(async (rejApp: any) => {
          const [convResult, cleanerResult] = await Promise.all([
            (supabaseAdmin
              .from('conversations')
              .select('id')
              .eq('clean_request_id', requestId)
              .eq('cleaner_id', rejApp.cleaner_id)
              .single()) as any,
            (supabaseAdmin
              .from('cleaners')
              .select('profiles(email)')
              .eq('id', rejApp.cleaner_id)
              .single()) as any,
          ])

          const tasks = []

          if (convResult.data?.id) {
            tasks.push(
              supabaseAdmin.from('messages').insert({
                conversation_id: convResult.data.id,
                sender_id: customerRecord.profile_id,
                sender_role: 'customer',
                content: '__system__ This listing has been filled. Thank you for applying.',
              })
            )
          }

          if (cleanerResult.data?.profiles?.email) {
            tasks.push(
              resend.emails.send({
                from: 'Vouchee <hello@vouchee.co.uk>',
                to: cleanerResult.data.profiles.email,
                subject: 'Application update from Vouchee',
                html: buildRejectionEmail(customerFirstName, cleanRequest.zone ?? ''),
              })
            )
          }

          return Promise.all(tasks)
        })
      )
    }

    console.log('All done. Redirecting to dashboard.')

    // Redirect to dashboard with success flag — dashboard shows celebration banner
    return NextResponse.redirect(`${appUrl}/customer/dashboard?gc_success=1&chat=${conversationId}`)

  } catch (err: any) {
    console.error('GoCardless confirm error:', err)
    return NextResponse.redirect(`${appUrl}/customer/dashboard?gc_error=1`)
  }
}