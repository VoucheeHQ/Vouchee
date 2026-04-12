import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createBrowserClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY!)

const ZONE_LABELS: Record<string, string> = {
  central_south_east: 'Central / South East', north_west: 'North West',
  north_east_roffey: 'North East / Roffey', south_west: 'South West',
  warnham_north: 'Warnham / North', broadbridge_heath: 'Broadbridge Heath',
  mannings_heath: 'Mannings Heath', faygate_kilnwood_vale: 'Faygate / Kilnwood Vale',
  christs_hospital: "Christ's Hospital", southwater: 'Southwater',
}

function buildCleanerCancellationEmail({
  cleanerFirstName,
  customerFirstName,
  zone,
}: {
  cleanerFirstName: string
  customerFirstName: string
  zone: string
}): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.vouchee.co.uk'
  const zoneLabel = ZONE_LABELS[zone] ?? zone

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:40px 16px;">
  <tr><td align="center">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;">

    <!-- Header -->
    <tr><td style="background:#ffffff;padding:36px 40px 32px;text-align:center;border-radius:16px 16px 0 0;">
      <img src="https://www.vouchee.co.uk/full-logo-black.png" width="260" height="60" alt="Vouchee" style="display:block;margin:0 auto 36px;max-width:100%;" />
      <div style="font-size:28px;font-weight:800;color:#0f172a;letter-spacing:-0.5px;line-height:1.2;">Subscription update</div>
    </td></tr>

    <!-- Body -->
    <tr><td style="background:white;padding:36px 40px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 16px 16px;">

      <p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 20px;">
        Hi ${cleanerFirstName},
      </p>

      <p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 20px;">
        We wanted to let you know that <strong>${customerFirstName}</strong> (${zoneLabel}) has informed Vouchee that they no longer need cleaning services and their Direct Debit has been cancelled.
      </p>

      <!-- 30-day notice box -->
      <div style="background:#eff6ff;border:1.5px solid #bfdbfe;border-radius:12px;padding:22px 28px;margin-bottom:24px;">
        <div style="font-size:13px;font-weight:800;color:#1e40af;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:10px;">📋 30-day notice period</div>
        <p style="font-size:14px;color:#1e3a8a;line-height:1.7;margin:0;">
          As per our terms, Vouchee operates on a <strong>30-day notice period</strong>. We recommend reaching out to ${customerFirstName} directly to confirm whether they still require cleans during this time — some customers continue with their cleaner through the notice period.
        </p>
      </div>

      <!-- Review reminder -->
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

    // Verify the caller is authenticated and owns this request
    const supabaseServer = await createBrowserClient()
    const { data: { user } } = await supabaseServer.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Look up the clean request
    const { data: cleanRequest, error: reqError } = await supabaseAdmin
      .from('clean_requests')
      .select('id, customer_id, status, gocardless_subscription_id, assigned_cleaner_id, zone, frequency')
      .eq('id', requestId)
      .single()

    if (reqError || !cleanRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    // Verify ownership — look up customer record for this user
    const { data: customerRecord } = await supabaseAdmin
      .from('customers')
      .select('id')
      .eq('profile_id', user.id)
      .single()

    const { data: profileData } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isAdmin = profileData?.role === 'admin'
    const isOwner = customerRecord?.id === cleanRequest.customer_id

    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Cancel GoCardless subscription if one exists
    const subscriptionId = cleanRequest.gocardless_subscription_id
    if (subscriptionId) {
      const gcEnvironment = process.env.GOCARDLESS_ENVIRONMENT ?? 'sandbox'
      const gcBaseUrl = gcEnvironment === 'live'
        ? 'https://api.gocardless.com'
        : 'https://api-sandbox.gocardless.com'
      const gcToken = process.env.GOCARDLESS_ACCESS_TOKEN!

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
        const errText = await cancelRes.text()
        console.error('GoCardless subscription cancel failed:', errText)
        // Non-fatal — continue with DB update and email
      } else {
        console.log('GoCardless subscription cancelled:', subscriptionId)
      }
    } else {
      console.log('No subscription ID found — skipping GC cancellation')
    }

    // Update clean request status to cancelled
    await supabaseAdmin
      .from('clean_requests')
      .update({ status: 'cancelled' } as any)
      .eq('id', requestId)

    // Look up cleaner and customer details for the email
    let cleanerEmail: string | null = null
    let cleanerFirstName = 'there'
    let customerFirstName = 'your customer'

    if (cleanRequest.assigned_cleaner_id) {
      const { data: cleanerRecord } = await supabaseAdmin
        .from('cleaners')
        .select('profile_id')
        .eq('id', cleanRequest.assigned_cleaner_id)
        .single()

      if (cleanerRecord) {
        const { data: cleanerProfile } = await supabaseAdmin
          .from('profiles')
          .select('full_name, email')
          .eq('id', cleanerRecord.profile_id)
          .single()

        cleanerEmail = cleanerProfile?.email ?? null
        cleanerFirstName = cleanerProfile?.full_name?.split(' ')[0] ?? 'there'
      }
    }

    const { data: customerProfile } = await supabaseAdmin
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()

    customerFirstName = customerProfile?.full_name?.split(' ')[0] ?? 'your customer'

    // Email the cleaner
    if (cleanerEmail) {
      await resend.emails.send({
        from: 'Vouchee <hello@vouchee.co.uk>',
        to: cleanerEmail,
        subject: `Subscription update — ${customerFirstName} has cancelled`,
        html: buildCleanerCancellationEmail({
          cleanerFirstName,
          customerFirstName,
          zone: cleanRequest.zone ?? '',
        }),
      })
      console.log('Cancellation email sent to cleaner:', cleanerEmail)
    } else {
      console.warn('No cleaner email found — skipping cancellation email')
    }

    return NextResponse.json({ success: true })

  } catch (err: any) {
    console.error('Cancel subscription error:', err)
    return NextResponse.json({ error: err.message ?? 'Failed to cancel' }, { status: 500 })
  }
}