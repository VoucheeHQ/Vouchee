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
      customerId, applicationId, requestId,
      cleanerName, cleanerInitial, cleanerMemberSince,
      cleanerDbs, cleanerInsured, cleanerRightToWork,
      cleanerReviews, cleanerJobsCompleted, cleanerRating,
      message, jobZone, jobBedrooms, jobBathrooms, jobHours, jobRate,
    } = body

    // customerId may be either a profiles UUID or a customers UUID
    // Try profiles first, then fall back to looking up via customers table
    let customerEmail: string | null = null
    let customerFullName: string | null = null

    // Primary path: use requestId to join clean_requests -> customers -> profiles
    // This avoids RLS issues since service role can read clean_requests
    if (requestId) {
      const { data: reqData } = await supabaseAdmin
        .from('clean_requests')
        .select('customers(profile_id, profiles(email, full_name))')
        .eq('id', requestId)
        .single() as { data: any }

      const profile = reqData?.customers?.profiles
      if (profile?.email) {
        customerEmail = profile.email
        customerFullName = profile.full_name
      }
    }

    // Fallback: customerId as direct profiles UUID (legacy)
    if (!customerEmail && customerId) {
      const { data: directProfile } = await supabaseAdmin
        .from('profiles')
        .select('email, full_name')
        .eq('id', customerId)
        .single()
      customerEmail = directProfile?.email ?? null
      customerFullName = directProfile?.full_name ?? null
    }

    if (!customerEmail) {
      console.error('Customer lookup failed — customerId:', customerId, 'requestId:', requestId)
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    const customerFirstName = customerFullName?.split(' ')?.[0] ?? 'there'
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.vouchee.co.uk'

    const acceptUrl = `${appUrl}/customer/dashboard?accept=${applicationId}&request=${requestId}`
    const declineUrl = `${appUrl}/customer/dashboard?decline=${applicationId}`

    const hasReviews = cleanerReviews && cleanerReviews.length > 0
    const jobsCompleted = cleanerJobsCompleted ?? 0
    const rating = cleanerRating ?? 0

    const reviewsSection = hasReviews ? `
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
    ` : `
      <div style="padding:16px;background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0;text-align:center;">
        <p style="margin:0 0 6px;font-size:14px;font-weight:700;color:#0f172a;">✨ New to Vouchee</p>
        <p style="margin:0;font-size:13px;color:#64748b;line-height:1.6;">This cleaner hasn't received any reviews just yet — but rest assured, all cleaners are interviewed before joining the platform.</p>
      </div>
    `

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

          <tr>
            <td style="padding:0 0 24px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:middle;">
                    <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 500 411.55" width="32" height="32" style="display:block;">
                      <defs>
                        <linearGradient id="em-lg1" x1="271.32" y1="378.46" x2="-1.11" y2="106.04" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#0350e6"/><stop offset="1" stop-color="#58c9fc"/></linearGradient>
                        <linearGradient id="em-lg2" x1="190.51" y1="395.38" x2="8.83" y2="79.68" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#0350e6"/><stop offset="0.05" stop-color="#0f60e9"/><stop offset="0.15" stop-color="#2580ef"/><stop offset="0.27" stop-color="#389bf4"/><stop offset="0.4" stop-color="#46aff7"/><stop offset="0.54" stop-color="#50befa"/><stop offset="0.72" stop-color="#56c6fc"/><stop offset="1" stop-color="#58c9fc"/></linearGradient>
                        <linearGradient id="em-lg3" x1="240.56" y1="261.33" x2="471.93" y2="29.96" xlink:href="#em-lg1"/>
                        <linearGradient id="em-lg4" x1="454.29" y1="-25.77" x2="243.01" y2="281.54" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#58c9fc"/><stop offset="0.28" stop-color="#56c6fc"/><stop offset="0.46" stop-color="#50befa"/><stop offset="0.6" stop-color="#46aff7"/><stop offset="0.73" stop-color="#389bf4"/><stop offset="0.85" stop-color="#2580ef"/><stop offset="0.95" stop-color="#0f60e9"/><stop offset="1" stop-color="#0350e6"/></linearGradient>
                        <linearGradient id="em-lg5" x1="315.29" y1="283.01" x2="501.98" y2="-66.17" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#0350e6" stop-opacity="0.5"/><stop offset="0.03" stop-color="#0350e6"/><stop offset="1" stop-color="#0350e6"/></linearGradient>
                      </defs>
                      <path fill="url(#em-lg1)" d="M0,102.22,160,382.46c21,36.86,73.31,39.15,97.49,4.28L315,303.8l-23.62,6.9a47.51,47.51,0,0,1-53.44-20.15L156,161.51a136.85,136.85,0,0,0-134-62.28Z"/>
                      <path fill="url(#em-lg2)" d="M184.15,382.46l-160-280.24.84-.11c-.34-.4-.69-.8-1-1.23a8.84,8.84,0,0,1-1-1.77l-1,.12-22,3L160,382.46a57.56,57.56,0,0,0,62.24,27.83A57,57,0,0,1,184.15,382.46Z"/>
                      <path fill="url(#em-lg3)" d="M220.61,238.18,302,104.12A215.68,215.68,0,0,1,481.56.41L500,0l-1.38,1.12A221.63,221.63,0,0,0,444,66.88L333.68,269.33A58.94,58.94,0,0,1,293.13,299h0a46.5,46.5,0,0,1-48.5-21.43Z"/>
                      <path fill="url(#em-lg4)" d="M500,0l-.44.34-2.51.06A215.71,215.71,0,0,0,317.47,104.12l-81.36,134,24,39.38A46.37,46.37,0,0,0,292,299.15a45,45,0,0,1-7.74.66,46.46,46.46,0,0,1-39.66-22.26l-24-39.38,81.36-134A215.73,215.73,0,0,1,481.55.41Z"/>
                      <path fill="url(#em-lg5)" d="M500,0l-1.38,1.11A221.69,221.69,0,0,0,444,66.87L333.67,269.33A58.81,58.81,0,0,1,293.13,299a46.48,46.48,0,0,1-8.83.84,45.69,45.69,0,0,1-10.72-1.26,58.84,58.84,0,0,0,38.58-29.22L422.5,66.87c10.27-19.15,30.33-48.5,65.39-62.75A110.21,110.21,0,0,1,500,0Z"/>
                    </svg>
                  </td>
                  <td style="padding-left:10px;font-size:18px;font-weight:700;color:#0f172a;vertical-align:middle;">Vouchee</td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="background:white;border-radius:20px;padding:36px;border:1px solid #e2e8f0;">
              <p style="margin:0 0 6px;font-size:22px;font-weight:800;color:#0f172a;">🎉 A cleaner has applied to your request!</p>
              <p style="margin:0 0 28px;font-size:14px;color:#64748b;line-height:1.6;">Hey ${customerFirstName} — a cleaner wants to clean your home. Review their application below.</p>

              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:14px;padding:18px 20px;margin-bottom:24px;border:1px solid #e2e8f0;">
                <tr><td style="padding-bottom:10px;">
                  <span style="font-size:15px;">📍</span>
                  <span style="font-size:16px;font-weight:800;color:#0f172a;margin-left:6px;">${jobZone}</span>
                  <span style="font-size:13px;color:#64748b;margin-left:8px;">Regular Clean</span>
                </td></tr>
                <tr><td style="padding-bottom:14px;">
                  <span style="display:inline-block;background:white;border:1px solid #e2e8f0;border-radius:100px;padding:4px 12px;font-size:12px;font-weight:600;color:#475569;margin-right:4px;">${jobBedrooms} bed</span>
                  <span style="display:inline-block;background:white;border:1px solid #e2e8f0;border-radius:100px;padding:4px 12px;font-size:12px;font-weight:600;color:#475569;margin-right:4px;">${jobBathrooms} bath</span>
                  <span style="display:inline-block;background:white;border:1px solid #e2e8f0;border-radius:100px;padding:4px 12px;font-size:12px;font-weight:600;color:#475569;margin-right:4px;">${jobHours} hrs</span>
                  <span style="display:inline-block;background:#fefce8;border:1px solid #fef08a;border-radius:100px;padding:4px 12px;font-size:12px;font-weight:700;color:#92400e;">£${jobRate}/hr</span>
                </td></tr>
                <tr><td>
                  <a href="${appUrl}/customer/dashboard" style="display:inline-block;background:white;border:1.5px solid #e2e8f0;border-radius:8px;padding:7px 16px;font-size:13px;font-weight:600;color:#0f172a;text-decoration:none;">View your listing →</a>
                </td></tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" style="border:1.5px solid #e2e8f0;border-radius:16px;overflow:hidden;margin-bottom:20px;">
                <tr>
                  <td style="padding:20px 20px 16px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="vertical-align:middle;">
                          <table cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="vertical-align:middle;">
                                <div style="width:52px;height:52px;min-width:52px;border-radius:50%;background:#2563eb;text-align:center;display:table-cell;font-size:22px;font-weight:800;color:white;line-height:52px;">${cleanerInitial}</div>
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
                <tr>
                  <td style="padding:12px 20px;border-top:1px solid #f1f5f9;background:#fafafa;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="text-align:center;padding:8px 0;">
                          <div style="font-size:20px;font-weight:800;color:#0f172a;">${jobsCompleted}</div>
                          <div style="font-size:11px;color:#94a3b8;margin-top:2px;">Cleans completed</div>
                        </td>
                        <td style="width:1px;background:#e2e8f0;"></td>
                        <td style="text-align:center;padding:8px 0;">
                          <div style="font-size:20px;font-weight:800;color:#0f172a;">${rating > 0 ? rating.toFixed(1) : '—'}<span style="font-size:13px;color:#f59e0b;margin-left:2px;">${rating > 0 ? '★' : ''}</span></div>
                          <div style="font-size:11px;color:#94a3b8;margin-top:2px;">Average rating</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 20px;border-top:1px solid #f1f5f9;background:#fafafa;">
                    <div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:10px;">Reviews</div>
                    ${reviewsSection}
                  </td>
                </tr>
                ${message ? `
                <tr>
                  <td style="padding:16px 20px;border-top:1px solid #f1f5f9;">
                    <div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px;">${cleanerName}'s message</div>
                    <div style="background:#eff6ff;border-radius:12px;padding:14px 16px;border-left:3px solid #2563eb;">
                      <p style="margin:0;font-size:14px;color:#1e40af;line-height:1.6;">${message}</p>
                    </div>
                  </td>
                </tr>` : ''}
                <tr>
                  <td style="padding:16px 20px 20px;border-top:1px solid #f1f5f9;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width:50%;padding-right:6px;">
                          <a href="${acceptUrl}" style="display:block;background:#16a34a;color:white;font-size:14px;font-weight:700;padding:14px 0;border-radius:10px;text-decoration:none;text-align:center;">✓ Accept &amp; chat</a>
                        </td>
                        <td style="width:50%;padding-left:6px;">
                          <a href="${declineUrl}" style="display:block;background:white;color:#ef4444;font-size:14px;font-weight:700;padding:14px 0;border-radius:10px;text-decoration:none;text-align:center;border:1.5px solid #fecaca;">✕ Decline</a>
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
      subject: `New application from ${cleanerName}`,
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