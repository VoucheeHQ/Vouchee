import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY!)

const ZONE_LABELS: Record<string, string> = {
  central_south_east: 'Central / South East', north_west: 'North West',
  north_east_roffey: 'North East / Roffey', south_west: 'South West',
  warnham_north: 'Warnham / North', broadbridge_heath: 'Broadbridge Heath',
  mannings_heath: 'Mannings Heath', faygate_kilnwood_vale: 'Faygate / Kilnwood Vale',
  christs_hospital: "Christ's Hospital",
}

export async function POST(request: NextRequest) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    const body = await request.json()
    const { applicationId } = body

    if (!applicationId) {
      return NextResponse.json({ error: 'Missing applicationId' }, { status: 400 })
    }

    // 1. Get the application
    const { data: application, error: appError } = await supabaseAdmin
      .from('applications')
      .select('id, cleaner_id, request_id, status')
      .eq('id', applicationId)
      .single()

    if (appError || !application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    // 2. Get the clean request for zone info
    const { data: cleanRequest } = await supabaseAdmin
      .from('clean_requests')
      .select('zone, customer_id')
      .eq('id', application.request_id)
      .single()

    // 3. Get customer first name
    const { data: customerRecord } = await supabaseAdmin
      .from('customers')
      .select('profile_id')
      .eq('id', cleanRequest?.customer_id)
      .single()

    const { data: customerProfile } = customerRecord?.profile_id
      ? await supabaseAdmin.from('profiles').select('full_name').eq('id', customerRecord.profile_id).single()
      : { data: null }

    const customerFirstName = customerProfile?.full_name?.split(' ')[0] ?? 'The customer'

    // 4. Get cleaner email
    const { data: cleanerRecord } = await supabaseAdmin
      .from('cleaners')
      .select('profiles(email)')
      .eq('id', application.cleaner_id)
      .single() as { data: { profiles: { email: string } } | null }

    const cleanerEmail = cleanerRecord?.profiles?.email ?? null
    const zone = cleanRequest?.zone ?? ''
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.vouchee.co.uk'

    // 5. Update application status
    await supabaseAdmin
      .from('applications')
      .update({ status: 'rejected' })
      .eq('id', applicationId)

    // 6. Send rejection email
    if (cleanerEmail) {
      await resend.emails.send({
        from: 'Vouchee <hello@vouchee.co.uk>',
        to: cleanerEmail,
        subject: 'Application update from Vouchee',
        html: `<!DOCTYPE html>
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
            Unfortunately, <strong>${customerFirstName}</strong> has decided not to proceed with your application at this time.
          </p>
          <p style="font-size:14px;color:#64748b;line-height:1.6;margin:0 0 24px;">
            Don't be discouraged — new listings appear regularly. Keep an eye on your jobs page for new opportunities in your area.
          </p>
          <a href="${appUrl}/cleaner/jobs" style="display:block;background:#2563eb;color:white;text-align:center;padding:14px;border-radius:10px;font-size:14px;font-weight:700;text-decoration:none;">View available jobs →</a>
        </td></tr>
        <tr><td style="padding:20px 0;text-align:center;">
          <p style="margin:0;font-size:12px;color:#94a3b8;">© 2026 Vouchee · vouchee.co.uk</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
      })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Decline application error:', err)
    return NextResponse.json({ error: err.message ?? 'Internal server error' }, { status: 500 })
  }
}