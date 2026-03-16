import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    const body = await request.json()
    const {
      customerId, cleanerName, cleanerInitial, cleanerMemberSince,
      cleanerDbs, cleanerInsured, cleanerRightToWork,
      message, jobZone, jobBedrooms, jobBathrooms, jobHours, jobRate,
    } = body

    const { data: customerProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('email, full_name')
      .eq('id', customerId)
      .single()

    if (profileError || !customerProfile?.email) {
      console.error('Customer profile lookup failed:', profileError)
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    const { email: customerEmail, full_name: customerFullName } = customerProfile
    const customerFirstName = customerFullName?.split(' ')?.[0] ?? 'there'
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.vouchee.co.uk'

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>New application from ${cleanerName}</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Logo -->
          <tr>
            <td style="padding:0 0 24px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#2563eb;border-radius:10px;width:36px;height:36px;text-align:center;vertical-align:middle;">
                    <span style="color:white;font-size:18px;font-weight:800;line-height:36px;display:block;">V</span>
                  </td>
                  <td style="padding-left:10px;font-size:18px;font-weight:700;color:#0f172a;">Vouchee</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main card -->
          <tr>
            <td style="background:white;border-radius:20px;padding:36px;border:1px solid #e2e8f0;">

              <p style="margin:0 0 6px;font-size:22px;font-weight:800;color:#0f172a;">🎉 A cleaner has applied to your request!</p>
              <p style="margin:0 0 28px;font-size:14px;color:#64748b;line-height:1.6;">Congratulations ${customerFirstName} — a cleaner wants to clean your home. Review their application and start chatting with them below.</p>

              <!-- Job summary with chips -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:14px;padding:18px 20px;margin-bottom:24px;border:1px solid #e2e8f0;">
                <tr>
                  <td style="padding-bottom:10px;">
                    <span style="font-size:15px;">📍</span>
                    <span style="font-size:16px;font-weight:800;color:#0f172a;margin-left:6px;">${jobZone}</span>
                    <span style="font-size:13px;color:#64748b;margin-left:8px;">Regular Clean</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom:14px;">
                    <span style="display:inline-block;background:white;border:1px solid #e2e8f0;border-radius:100px;padding:4px 12px;font-size:12px;font-weight:600;color:#475569;margin-right:4px;">${jobBedrooms} bed</span>
                    <span style="display:inline-block;background:white;border:1px solid #e2e8f0;border-radius:100px;padding:4px 12px;font-size:12px;font-weight:600;color:#475569;margin-right:4px;">${jobBathrooms} bath</span>
                    <span style="display:inline-block;background:white;border:1px solid #e2e8f0;border-radius:100px;padding:4px 12px;font-size:12px;font-weight:600;color:#475569;margin-right:4px;">${jobHours} hrs</span>
                    <span style="display:inline-block;background:#fefce8;border:1px solid #fef08a;border-radius:100px;padding:4px 12px;font-size:12px;font-weight:700;color:#92400e;">£${jobRate}/hr</span>
                  </td>
                </tr>
                <tr>
                  <td>
                    <a href="${appUrl}/customer/dashboard" style="display:inline-block;background:white;border:1.5px solid #e2e8f0;border-radius:8px;padding:7px 16px;font-size:13px;font-weight:600;color:#0f172a;text-decoration:none;">View your listing →</a>
                  </td>
                </tr>
              </table>

              <!-- Cleaner card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1.5px solid #e2e8f0;border-radius:16px;overflow:hidden;margin-bottom:20px;">

                <!-- Avatar + name + badges -->
                <tr>
                  <td style="padding:20px 20px 16px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="vertical-align:middle;">
                          <table cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="vertical-align:middle;">
                                <div style="width:52px;height:52px;min-width:52px;border-radius:50%;background:#2563eb;text-align:center;vertical-align:middle;display:table-cell;font-size:22px;font-weight:800;color:white;line-height:52px;">${cleanerInitial}</div>
                              </td>
                              <td style="padding-left:14px;vertical-align:middle;">
                                <div style="font-size:17px;font-weight:800;color:#0f172a;line-height:1.2;">${cleanerName}</div>
                                <div style="font-size:12px;color:#94a3b8;margin-top:3px;">Member since ${cleanerMemberSince}</div>
                              </td>
                            </tr>
                          </table>
                        </td>
                        <td style="text-align:right;vertical-align:middle;">
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

                <!-- Blurred reviews -->
                <tr>
                  <td style="padding:16px 20px;border-top:1px solid #f1f5f9;background:#fafafa;">
                    <div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:10px;">Reviews</div>
                    <div style="-webkit-filter:blur(4px);filter:blur(4px);">
                      <div style="margin-bottom:8px;padding:10px 12px;background:white;border-radius:8px;border:1px solid #e2e8f0;">
                        <span style="color:#f59e0b;font-size:12px;">★★★★★</span>
                        <div style="font-size:13px;color:#475569;margin-top:3px;line-height:1.4;">Absolutely brilliant — left the house spotless. Would highly recommend to anyone looking for a reliable cleaner.</div>
                        <div style="font-size:11px;color:#94a3b8;margin-top:3px;">— Sarah T.</div>
                      </div>
                      <div style="padding:10px 12px;background:white;border-radius:8px;border:1px solid #e2e8f0;">
                        <span style="color:#f59e0b;font-size:12px;">★★★★★</span>
                        <div style="font-size:13px;color:#475569;margin-top:3px;line-height:1.4;">Very professional and thorough. Always on time and incredibly easy to communicate with. A real gem!</div>
                        <div style="font-size:11px;color:#94a3b8;margin-top:3px;">— James H.</div>
                      </div>
                    </div>
                    <div style="font-size:12px;color:#94a3b8;margin-top:10px;text-align:center;font-style:italic;">🔒 Accept this application to unlock their full reviews</div>
                  </td>
                </tr>

                <!-- Message -->
                ${message ? `
                <tr>
                  <td style="padding:16px 20px;border-top:1px solid #f1f5f9;">
                    <div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px;">${cleanerName}'s message</div>
                    <div style="background:#eff6ff;border-radius:12px;padding:14px 16px;border-left:3px solid #2563eb;">
                      <p style="margin:0;font-size:14px;color:#1e40af;line-height:1.6;">${message}</p>
                    </div>
                  </td>
                </tr>` : ''}

                <!-- Buttons - full width, spaced -->
                <tr>
                  <td style="padding:16px 20px 20px;border-top:1px solid #f1f5f9;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width:50%;padding-right:6px;">
                          <a href="${appUrl}/customer/dashboard" style="display:block;background:#16a34a;color:white;font-size:14px;font-weight:700;padding:14px 0;border-radius:10px;text-decoration:none;text-align:center;">✓ Accept &amp; chat</a>
                        </td>
                        <td style="width:50%;padding-left:6px;">
                          <a href="${appUrl}/customer/dashboard" style="display:block;background:white;color:#ef4444;font-size:14px;font-weight:700;padding:14px 0;border-radius:10px;text-decoration:none;text-align:center;border:1.5px solid #fecaca;">✕ Decline</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

              </table>

              <p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.5;text-align:center;">
                Manage all your applications from your <a href="${appUrl}/customer/dashboard" style="color:#2563eb;">Vouchee dashboard</a>.
              </p>

            </td>
          </tr>

          <!-- Footer -->
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
      subject: `New application from ${cleanerName} — review now`,
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