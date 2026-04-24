import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

const resend = new Resend(process.env.RESEND_API_KEY)

// Vouchee logo SVG — kept as a string for inline embedding in emails
const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 500 411.55" width="32" height="32" style="display:block;">
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
</svg>`

function emailShell(appUrl: string, innerHtml: string, title: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr>
          <td style="padding:0 0 24px;">
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="vertical-align:middle;">${LOGO_SVG}</td>
                <td style="padding-left:10px;font-size:18px;font-weight:700;color:#0f172a;vertical-align:middle;">Vouchee</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr><td style="background:white;border-radius:20px;padding:36px;border:1px solid #e2e8f0;">${innerHtml}</td></tr>
        <tr><td style="padding:24px 0 0;text-align:center;">
          <p style="margin:0;font-size:12px;color:#94a3b8;">© 2026 Vouchee Ltd · <a href="${appUrl}" style="color:#94a3b8;">vouchee.co.uk</a> · <a href="mailto:cleaners@vouchee.co.uk" style="color:#94a3b8;">cleaners@vouchee.co.uk</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function approvalHtml(firstName: string, appUrl: string) {
  const dashUrl = `${appUrl}/cleaner/dashboard`
  const jobsUrl = `${appUrl}/jobs`
  const inner = `
    <p style="margin:0 0 6px;font-size:22px;font-weight:800;color:#0f172a;">🎉 You're approved, ${firstName}!</p>
    <p style="margin:0 0 24px;font-size:14px;color:#64748b;line-height:1.6;">Welcome to the Vouchee cleaner community. We've reviewed your application and you're now live on the platform — customers can find and book you straight away.</p>

    <div style="background:#f0fdf4;border:1.5px solid #86efac;border-radius:14px;padding:18px 20px;margin-bottom:24px;">
      <p style="margin:0 0 10px;font-size:14px;font-weight:700;color:#15803d;">✅ Your account is active</p>
      <p style="margin:0;font-size:13px;color:#166534;line-height:1.6;">You can apply to jobs immediately, set your notification preferences, and share your profile link with past customers to start collecting reviews.</p>
    </div>

    <p style="margin:0 0 10px;font-size:13px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;">Your next steps</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #f1f5f9;">
          <table cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td style="width:36px;vertical-align:top;font-size:18px;">1️⃣</td>
              <td style="vertical-align:top;">
                <div style="font-size:14px;font-weight:700;color:#0f172a;margin-bottom:2px;">Browse live jobs</div>
                <div style="font-size:13px;color:#64748b;line-height:1.55;">See all open cleaning requests in Horsham and apply to the ones that suit you.</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #f1f5f9;">
          <table cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td style="width:36px;vertical-align:top;font-size:18px;">2️⃣</td>
              <td style="vertical-align:top;">
                <div style="font-size:14px;font-weight:700;color:#0f172a;margin-bottom:2px;">Write a strong intro message</div>
                <div style="font-size:13px;color:#64748b;line-height:1.55;">When you apply, your message is the customer's first impression. A friendly, specific note goes a long way.</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:12px 0;">
          <table cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td style="width:36px;vertical-align:top;font-size:18px;">3️⃣</td>
              <td style="vertical-align:top;">
                <div style="font-size:14px;font-weight:700;color:#0f172a;margin-bottom:2px;">Keep your documents up to date</div>
                <div style="font-size:13px;color:#64748b;line-height:1.55;">We'll remind you ahead of any expiring DBS, insurance, or right-to-work. Send replacements to <a href="mailto:cleaners@vouchee.co.uk" style="color:#2563eb;">cleaners@vouchee.co.uk</a>.</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      <tr>
        <td style="width:50%;padding-right:6px;">
          <a href="${jobsUrl}" style="display:block;background:#0f172a;color:white;font-size:14px;font-weight:700;padding:14px 0;border-radius:10px;text-decoration:none;text-align:center;">Browse jobs →</a>
        </td>
        <td style="width:50%;padding-left:6px;">
          <a href="${dashUrl}" style="display:block;background:white;color:#0f172a;font-size:14px;font-weight:700;padding:14px 0;border-radius:10px;text-decoration:none;text-align:center;border:1.5px solid #e2e8f0;">Go to dashboard</a>
        </td>
      </tr>
    </table>

    <p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.5;text-align:center;">
      Questions? Reply to this email or contact <a href="mailto:cleaners@vouchee.co.uk" style="color:#2563eb;">cleaners@vouchee.co.uk</a>
    </p>
  `
  return emailShell(appUrl, inner, "You're approved on Vouchee!")
}

function rejectionHtml(firstName: string, reason: string | null, appUrl: string) {
  const reasonBlock = reason && reason.trim()
    ? `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px 18px;margin:20px 0;">
         <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;">A note from our team</p>
         <p style="margin:0;font-size:14px;color:#334155;line-height:1.6;">${reason.trim().replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
       </div>`
    : ''

  const inner = `
    <p style="margin:0 0 6px;font-size:22px;font-weight:800;color:#0f172a;">Thanks for applying, ${firstName}</p>
    <p style="margin:0 0 20px;font-size:14px;color:#64748b;line-height:1.65;">We've carefully reviewed your application to join Vouchee, and unfortunately we're not able to move forward at this time.</p>

    ${reasonBlock}

    <p style="margin:0 0 16px;font-size:14px;color:#475569;line-height:1.65;">We know this isn't the news you were hoping for. Every application we receive matters to us, and we genuinely appreciate you taking the time to put yours forward.</p>

    <p style="margin:0 0 24px;font-size:14px;color:#475569;line-height:1.65;">If your circumstances change in the future, you're welcome to reach out again.</p>

    <p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.5;text-align:center;">
      Any questions about this decision? Get in touch at <a href="mailto:cleaners@vouchee.co.uk" style="color:#2563eb;">cleaners@vouchee.co.uk</a>
    </p>
  `
  return emailShell(appUrl, inner, 'Your Vouchee application')
}

export async function POST(request: NextRequest) {
  // Verify caller is admin (API reachable by logged-in admins only)
  const supabaseUser = await createClient()
  const { data: { user } } = await supabaseUser.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: callerProfile } = await supabaseUser
    .from('profiles').select('role').eq('id', user.id).single()
  if (!callerProfile || (callerProfile as any).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: any
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const { cleanerId, kind, reason } = body

  if (!cleanerId || typeof cleanerId !== 'string') {
    return NextResponse.json({ error: 'Missing cleanerId' }, { status: 400 })
  }
  if (kind !== 'approval' && kind !== 'rejection') {
    return NextResponse.json({ error: 'kind must be "approval" or "rejection"' }, { status: 400 })
  }

  // Look up cleaner's name + email via service role (bypasses RLS)
  const admin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: cleanerRow } = await admin
    .from('cleaners')
    .select('profile_id')
    .eq('id', cleanerId)
    .single() as { data: { profile_id: string } | null }

  if (!cleanerRow) {
    return NextResponse.json({ error: 'Cleaner not found' }, { status: 404 })
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('full_name, email')
    .eq('id', cleanerRow.profile_id)
    .single() as { data: { full_name: string | null; email: string | null } | null }

  if (!profile?.email) {
    return NextResponse.json({ error: 'Cleaner email not found' }, { status: 404 })
  }

  const firstName = (profile.full_name ?? 'there').trim().split(' ')[0]
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.vouchee.co.uk'

  const html = kind === 'approval'
    ? approvalHtml(firstName, appUrl)
    : rejectionHtml(firstName, reason ?? null, appUrl)

  const subject = kind === 'approval'
    ? "🎉 You're approved on Vouchee!"
    : 'Your Vouchee application'

  try {
    const { data, error } = await resend.emails.send({
      from: 'Vouchee <cleaners@vouchee.co.uk>',
      to: profile.email,
      subject,
      html,
    })

    if (error) {
      console.error('Resend error:', error)
      return NextResponse.json({ error }, { status: 500 })
    }

    return NextResponse.json({ success: true, id: data?.id, sentTo: profile.email })
  } catch (err: any) {
    console.error('Email send failed:', err)
    return NextResponse.json({ error: err.message ?? 'Email send failed' }, { status: 500 })
  }
}