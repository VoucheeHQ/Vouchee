import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const resend = new Resend(process.env.RESEND_API_KEY)

// Admin email — goes to the shared cleaners inbox, not a personal email.
// Keeps business alerts out of personal inboxes and sets up for team scaling.
const ADMIN_EMAIL = 'cleaners@vouchee.co.uk'

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

function htmlEscape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

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

// ═════════════════════════════════════════════════════════════════════════
// Email to the CLEANER: "We got your application"
// ═════════════════════════════════════════════════════════════════════════
function cleanerWelcomeHtml(firstName: string, appUrl: string) {
  const dashUrl = `${appUrl}/cleaner/dashboard`
  const inner = `
    <p style="margin:0 0 6px;font-size:22px;font-weight:800;color:#0f172a;">Thanks for applying, ${htmlEscape(firstName)}!</p>
    <p style="margin:0 0 24px;font-size:14px;color:#64748b;line-height:1.6;">We've received your application to join Vouchee. Here's what happens next.</p>

    <p style="margin:0 0 14px;font-size:13px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;">Your application journey</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="padding:14px 0;border-bottom:1px solid #f1f5f9;">
          <table cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td style="width:40px;vertical-align:top;">
                <div style="width:28px;height:28px;border-radius:50%;background:#dcfce7;border:2px solid #86efac;display:table-cell;text-align:center;vertical-align:middle;font-size:14px;font-weight:800;color:#15803d;line-height:28px;">✓</div>
              </td>
              <td style="vertical-align:top;padding-left:4px;">
                <div style="font-size:14px;font-weight:700;color:#15803d;margin-bottom:2px;">Application received</div>
                <div style="font-size:13px;color:#64748b;line-height:1.55;">You've already done the hard part.</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:14px 0;border-bottom:1px solid #f1f5f9;">
          <table cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td style="width:40px;vertical-align:top;">
                <div style="width:28px;height:28px;border-radius:50%;background:#eff6ff;border:2px solid #93c5fd;display:table-cell;text-align:center;vertical-align:middle;font-size:14px;font-weight:800;color:#1d4ed8;line-height:28px;">2</div>
              </td>
              <td style="vertical-align:top;padding-left:4px;">
                <div style="font-size:14px;font-weight:700;color:#1d4ed8;margin-bottom:2px;">We'll review it</div>
                <div style="font-size:13px;color:#64748b;line-height:1.55;">Within <strong>3 working days</strong>. We read every application personally.</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:14px 0;border-bottom:1px solid #f1f5f9;">
          <table cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td style="width:40px;vertical-align:top;">
                <div style="width:28px;height:28px;border-radius:50%;background:#f8fafc;border:2px solid #cbd5e1;display:table-cell;text-align:center;vertical-align:middle;font-size:14px;font-weight:800;color:#94a3b8;line-height:28px;">3</div>
              </td>
              <td style="vertical-align:top;padding-left:4px;">
                <div style="font-size:14px;font-weight:700;color:#475569;margin-bottom:2px;">A short call</div>
                <div style="font-size:13px;color:#64748b;line-height:1.55;">We'll arrange a quick chat (usually 15 minutes) to get to know you and answer any questions.</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:14px 0;">
          <table cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td style="width:40px;vertical-align:top;">
                <div style="width:28px;height:28px;border-radius:50%;background:#f8fafc;border:2px solid #cbd5e1;display:table-cell;text-align:center;vertical-align:middle;font-size:14px;font-weight:800;color:#94a3b8;line-height:28px;">4</div>
              </td>
              <td style="vertical-align:top;padding-left:4px;">
                <div style="font-size:14px;font-weight:700;color:#475569;margin-bottom:2px;">You're live on Vouchee</div>
                <div style="font-size:13px;color:#64748b;line-height:1.55;">Once approved, you can start applying to jobs straight away.</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <div style="background:#f8faff;border:1px solid #e0e7ff;border-radius:12px;padding:16px 18px;margin-bottom:24px;">
      <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#1e40af;">📧 Keep an eye on your inbox</p>
      <p style="margin:0;font-size:13px;color:#1e3a8a;line-height:1.55;">You may have received a separate email asking you to confirm your email address — please click the link in that email to complete your sign up.</p>
    </div>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      <tr>
        <td align="center">
          <a href="${dashUrl}" style="display:inline-block;background:#0f172a;color:white;font-size:14px;font-weight:700;padding:13px 28px;border-radius:10px;text-decoration:none;">Check your application status →</a>
        </td>
      </tr>
    </table>

    <p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.5;text-align:center;">
      Questions? Reply to this email or contact <a href="mailto:cleaners@vouchee.co.uk" style="color:#2563eb;">cleaners@vouchee.co.uk</a>
    </p>
  `
  return emailShell(appUrl, inner, 'Thanks for applying to Vouchee')
}

// ═════════════════════════════════════════════════════════════════════════
// Email to ADMIN: "New application needs review"
// ═════════════════════════════════════════════════════════════════════════
function adminAlertHtml(opts: {
  cleanerName: string
  cleanerEmail: string
  cleanerPhone: string | null
  yearsExperience: string | null
  zonesLabel: string
  dbsClaim: boolean
  insuranceClaim: boolean
  rightToWorkClaim: boolean
  ownSupplies: boolean
  needsCredentialsHelp: boolean
  appUrl: string
}) {
  const { cleanerName, cleanerEmail, cleanerPhone, yearsExperience, zonesLabel,
          dbsClaim, insuranceClaim, rightToWorkClaim, ownSupplies, needsCredentialsHelp, appUrl } = opts

  const tick = (v: boolean) => v
    ? '<span style="color:#16a34a;font-weight:700;">✓</span>'
    : '<span style="color:#94a3b8;">✗</span>'

  const credentialLabel = (claim: boolean) => claim ? 'Yes' : 'No'

  const inner = `
    <p style="margin:0 0 6px;font-size:20px;font-weight:800;color:#0f172a;">🆕 New cleaner application</p>
    <p style="margin:0 0 24px;font-size:14px;color:#64748b;line-height:1.6;"><strong>${htmlEscape(cleanerName)}</strong> has just applied to join Vouchee. Review and schedule an interview when ready.</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:12px;padding:18px 20px;margin-bottom:20px;">
      <tr><td>
        <p style="margin:0 0 10px;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.08em;">Applicant</p>
        <p style="margin:0 0 4px;font-size:15px;font-weight:700;color:#0f172a;">${htmlEscape(cleanerName)}</p>
        <p style="margin:0 0 2px;font-size:13px;color:#475569;">📧 <a href="mailto:${htmlEscape(cleanerEmail)}" style="color:#2563eb;">${htmlEscape(cleanerEmail)}</a></p>
        ${cleanerPhone ? `<p style="margin:0;font-size:13px;color:#475569;">📞 ${htmlEscape(cleanerPhone)}</p>` : ''}
      </td></tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;">
          <span style="font-size:12px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.06em;">Years of experience</span>
          <span style="float:right;font-size:14px;color:#0f172a;font-weight:600;">${yearsExperience ?? '—'}</span>
        </td>
      </tr>
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;">
          <span style="font-size:12px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.06em;">Areas covered</span>
          <span style="float:right;font-size:13px;color:#0f172a;max-width:60%;text-align:right;">${htmlEscape(zonesLabel)}</span>
        </td>
      </tr>
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;">
          <span style="font-size:12px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.06em;">Own supplies</span>
          <span style="float:right;font-size:13px;color:#0f172a;font-weight:600;">${credentialLabel(ownSupplies)}</span>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 10px;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.06em;">Claimed at signup</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#fafafa;border:1px solid #e2e8f0;border-radius:12px;padding:14px 16px;margin-bottom:20px;">
      <tr>
        <td style="padding:6px 0;font-size:13px;color:#334155;">${tick(dbsClaim)} DBS certificate</td>
      </tr>
      <tr>
        <td style="padding:6px 0;font-size:13px;color:#334155;">${tick(insuranceClaim)} Public liability insurance</td>
      </tr>
      <tr>
        <td style="padding:6px 0;font-size:13px;color:#334155;">${tick(rightToWorkClaim)} Right to work in UK</td>
      </tr>
      ${needsCredentialsHelp ? `<tr><td style="padding-top:10px;font-size:12px;color:#92400e;font-style:italic;border-top:1px dashed #e2e8f0;margin-top:6px;">ℹ️ Flagged: needs help getting credentials — send them the step-by-step guide.</td></tr>` : ''}
    </table>

    <p style="margin:0 0 16px;font-size:12px;color:#64748b;line-height:1.55;font-style:italic;">Claims are self-declared. Verify documents during the interview before approving.</p>

    <a href="${appUrl}/admin/dashboard" style="display:block;background:#0f172a;color:white;font-size:14px;font-weight:700;padding:14px 0;border-radius:10px;text-decoration:none;text-align:center;">Review in admin dashboard →</a>
  `
  return emailShell(appUrl, inner, `New application from ${cleanerName}`)
}

// Human-readable zone label from zone slugs
const ZONE_LABELS: Record<string, string> = {
  central_south_east: 'Central / South East',
  north_west: 'North West',
  north_east_roffey: 'North East / Roffey',
  south_west: 'South West',
  warnham_north: 'Warnham / Surrounding North',
  broadbridge_heath: 'Broadbridge Heath',
  mannings_heath: 'Mannings Heath',
  faygate_kilnwood_vale: 'Faygate / Kilnwood Vale',
  christs_hospital: 'Christs Hospital',
  southwater: 'Southwater',
}

function zonesLabel(zones: string[] | null | undefined): string {
  if (!zones || zones.length === 0) return 'None selected'
  // If it's all 9 zones, say so
  if (zones.length >= 9) return 'All Horsham areas'
  return zones.map(z => ZONE_LABELS[z] ?? z).join(', ')
}

// Years-experience code → human label
const YEARS_LABELS: Record<string, string> = {
  '0': 'Less than 1 year',
  '1': '1–2 years',
  '3': '3–5 years',
  '6': '6–10 years',
  '11': '10+ years',
}

export async function POST(request: NextRequest) {
  // This endpoint is called from the cleaner-funnel onboarding page, right after
  // cleaners.insert() succeeds. It's unauthenticated (the cleaner at that point
  // may not be fully confirmed) — but we verify the cleaner actually exists
  // before sending, which prevents blind email spam.

  let body: any
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { cleanerId } = body
  if (!cleanerId || typeof cleanerId !== 'string') {
    return NextResponse.json({ error: 'Missing cleanerId' }, { status: 400 })
  }

  // Use service role to fetch the cleaner + profile (bypasses RLS)
  const admin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Note: we look up cleaner by profile_id (the cleaner row was just created
  // but the caller passes profile_id since that's what they have)
  const { data: cleanerRow, error: cleanerErr } = await admin
    .from('cleaners')
    .select('id, profile_id, years_experience, zones, dbs_checked, has_insurance, right_to_work, own_supplies, needs_credentials_help, application_status, created_at')
    .eq('profile_id', cleanerId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single() as { data: any | null, error: any }

  if (cleanerErr || !cleanerRow) {
    return NextResponse.json({ error: 'Cleaner not found' }, { status: 404 })
  }

  // Only send if status is 'submitted' — prevents re-sending on re-submits
  if (cleanerRow.application_status !== 'submitted') {
    return NextResponse.json({
      success: true,
      skipped: true,
      reason: `status is ${cleanerRow.application_status}, not submitted`,
    })
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('full_name, email, phone')
    .eq('id', cleanerRow.profile_id)
    .single() as { data: { full_name: string | null; email: string | null; phone: string | null } | null }

  if (!profile?.email) {
    return NextResponse.json({ error: 'Cleaner profile not found' }, { status: 404 })
  }

  const firstName = (profile.full_name ?? 'there').trim().split(' ')[0]
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.vouchee.co.uk'

  // ─── 1. Send welcome email to cleaner ────────────────────────────────────
  let cleanerResult: any = { skipped: false, error: null, id: null }
  try {
    const { data, error } = await resend.emails.send({
      from: 'Vouchee <cleaners@vouchee.co.uk>',
      to: profile.email,
      subject: 'Thanks for applying to Vouchee 🧹',
      html: cleanerWelcomeHtml(firstName, appUrl),
    })
    if (error) {
      cleanerResult = { skipped: false, error: String(error), id: null }
      console.error('Cleaner welcome email failed:', error)
    } else {
      cleanerResult = { skipped: false, error: null, id: data?.id ?? null }
    }
  } catch (e: any) {
    cleanerResult = { skipped: false, error: e.message ?? 'unknown', id: null }
    console.error('Cleaner welcome email threw:', e)
  }

  // ─── 2. Send admin alert ─────────────────────────────────────────────────
  let adminResult: any = { skipped: false, error: null, id: null }
  try {
    const { data, error } = await resend.emails.send({
      from: 'Vouchee Alerts <cleaners@vouchee.co.uk>',
      to: ADMIN_EMAIL,
      replyTo: profile.email, // replying to the alert emails the cleaner directly
      subject: `🆕 New cleaner application — ${profile.full_name ?? 'unnamed'}`,
      html: adminAlertHtml({
        cleanerName: profile.full_name ?? 'Unknown',
        cleanerEmail: profile.email,
        cleanerPhone: profile.phone ?? null,
        yearsExperience: cleanerRow.years_experience != null
          ? (YEARS_LABELS[String(cleanerRow.years_experience)] ?? `${cleanerRow.years_experience} years`)
          : null,
        zonesLabel: zonesLabel(cleanerRow.zones),
        dbsClaim: !!cleanerRow.dbs_checked,
        insuranceClaim: !!cleanerRow.has_insurance,
        rightToWorkClaim: !!cleanerRow.right_to_work,
        ownSupplies: !!cleanerRow.own_supplies,
        needsCredentialsHelp: !!cleanerRow.needs_credentials_help,
        appUrl,
      }),
    })
    if (error) {
      adminResult = { skipped: false, error: String(error), id: null }
      console.error('Admin alert email failed:', error)
    } else {
      adminResult = { skipped: false, error: null, id: data?.id ?? null }
    }
  } catch (e: any) {
    adminResult = { skipped: false, error: e.message ?? 'unknown', id: null }
    console.error('Admin alert email threw:', e)
  }

  return NextResponse.json({
    success: true,
    cleaner: cleanerResult,
    admin: adminResult,
  })
}