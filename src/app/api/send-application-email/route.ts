import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  // Service role client created inside handler so env vars are available
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    const body = await request.json()
    const {
      customerId,
      cleanerName,
      cleanerInitial,
      cleanerMemberSince,
      cleanerDbs,
      cleanerInsured,
      cleanerRightToWork,
      cleanerRating,
      cleanerCompletedCleans,
      message,
      jobZone,
      jobBedrooms,
      jobBathrooms,
      jobHours,
      jobRate,
      requestId,
    } = body

    // Look up customer email server-side using service role (bypasses RLS)
    const { data: customerProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('email, full_name')
      .eq('id', customerId)
      .single()

    if (profileError || !customerProfile?.email) {
      console.error('Customer profile lookup failed:', profileError)
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    const { email: customerEmail, full_name: customerName } = customerProfile
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.vouchee.co.uk'

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>A cleaner has applied to your request</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <tr>
            <td style="padding:0 0 24px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#2563eb;border-radius:10px;width:36px;height:36px;text-align:center;vertical-align:middle;">
                    <span style="color:white;font-size:20px;font-weight:800;line-height:36px;padding:0 8px;">V</span>
                  </td>
                  <td style="padding-left:10px;font-size:18px;font-weight:700;color:#0f172a;">Vouchee</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background:white;border-radius:20px;padding:36px;border:1px solid #e2e8f0;">
              <p style="margin:0 0 6px;font-size:22px;font-weight:800;color:#0f172a;">🎉 A cleaner has applied to your request!</p>
              <p style="margin:0 0 28px;font-size:14px;color:#64748b;">Hi ${customerName ?? 'there'} — someone in ${jobZone} wants to clean your home. Review their application below.</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:12px;padding:16px;margin-bottom:28px;">
                <tr><td style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.08em;padding-bottom:8px;">Your request</td></tr>
                <tr><td style="font-size:15px;font-weight:700;color:#0f172a;padding-bottom:6px;">📍 ${jobZone}</td></tr>
                <tr><td style="font-size:13px;color:#64748b;">${jobBedrooms} bed · ${jobBathrooms} bath · ${jobHours} hrs · £${jobRate}/hr</td></tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1.5px solid #e2e8f0;border-radius:16px;overflow:hidden;margin-bottom:20px;">
                <tr>
                  <td style="padding:20px 20px 16px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="vertical-align:top;">
                          <table cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="background:#2563eb;border-radius:50%;width:48px;height:48px;text-align:center;vertical-align:middle;">
                                <span style="color:white;font-size:20px;font-weight:800;line-height:48px;">${cleanerInitial}</span>
                              </td>
                              <td style="padding-left:12px;vertical-align:middle;">
                                <div style="font-size:16px;font-weight:700;color:#0f172a;">${cleanerName}</div>
                                <div style="font-size:12px;color:#94a3b8;">Member since ${cleanerMemberSince}</div>
                              </td>
                            </tr>
                          </table>
                        </td>
                        <td style="text-align:right;vertical-align:top;">
                          <table cellpadding="0" cellspacing="0" style="margin-left:auto;">
                            ${cleanerDbs ? `<tr><td style="font-size:11px;font-weight:600;color:#16a34a;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:100px;padding:3px 10px;white-space:nowrap;">✓ DBS checked</td></tr>` : ''}
                            ${cleanerRightToWork ? `<tr><td style="font-size:11px;font-weight:600;color:#16a34a;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:100px;padding:3px 10px;white-space:nowrap;padding-top:4px;">✓ Right to work</td></tr>` : ''}
                            ${cleanerInsured ? `<tr><td style="font-size:11px;font-weight:600;color:#16a34a;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:100px;padding:3px 10px;white-space:nowrap;padding-top:4px;">✓ Insured</td></tr>` : ''}
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                ${message ? `
                <tr>
                  <td style="padding:0 20px 16px;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background:#eff6ff;border-radius:12px;padding:14px 16px;">
                      <tr>
                        <td style="vertical-align:top;padding-right:10px;">
                          <div style="background:#2563eb;border-radius:50%;width:28px;height:28px;text-align:center;line-height:28px;">
                            <span style="color:white;font-size:12px;font-weight:700;">${cleanerInitial}</span>
                          </div>
                        </td>
                        <td style="vertical-align:top;">
                          <p style="margin:0;font-size:14px;color:#1e40af;font-style:italic;line-height:1.5;">"${message}"</p>
                          <p style="margin:6px 0 0;font-size:12px;color:#93c5fd;">${cleanerName} · Just now</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>` : ''}
                <tr>
                  <td style="padding:0 20px 20px;">
                    <span style="color:#f59e0b;font-size:16px;">★★★★★</span>
                    <span style="font-size:14px;font-weight:700;color:#0f172a;margin-left:4px;">${cleanerRating ?? '5.0'}</span>
                    <span style="font-size:13px;color:#94a3b8;margin-left:4px;">· ${cleanerCompletedCleans ?? 0} cleans completed</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 20px 20px;border-top:1px solid #f1f5f9;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding-right:10px;">
                          <a href="${appUrl}/customer/dashboard" style="display:inline-block;background:#16a34a;color:white;font-size:14px;font-weight:700;padding:10px 20px;border-radius:10px;text-decoration:none;">✓ Accept &amp; chat</a>
                        </td>
                        <td>
                          <a href="${appUrl}/customer/dashboard" style="display:inline-block;background:white;color:#64748b;font-size:14px;font-weight:600;padding:10px 20px;border-radius:10px;text-decoration:none;border:1px solid #e2e8f0;">✕ Decline</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.5;">
                Manage all your applications from your <a href="${appUrl}/customer/dashboard" style="color:#2563eb;">Vouchee dashboard</a>.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 0 0;text-align:center;">
              <p style="margin:0;font-size:12px;color:#94a3b8;">
                © 2026 Vouchee · <a href="${appUrl}" style="color:#94a3b8;">vouchee.co.uk</a> · <a href="mailto:hello@vouchee.co.uk" style="color:#94a3b8;">hello@vouchee.co.uk</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

    const { data, error } = await resend.emails.send({
      from: 'Vouchee <hello@vouchee.co.uk>',
      to: customerEmail,
      subject: `${cleanerName} has applied to clean your home 🎉`,
      html,
    })

    if (error) {
      console.error('Resend error:', error)
      return NextResponse.json({ error }, { status: 500 })
    }

    return NextResponse.json({ success: true, id: data?.id })
  } catch (err: any) {
    console.error('Email API error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}