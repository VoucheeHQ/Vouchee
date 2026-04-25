import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const resend = new Resend(process.env.RESEND_API_KEY)

// Brand colour — keep in sync with send-application-received/route.ts.
// If you ever extract email templates into a shared lib, both routes
// should import from there.
const BRAND_BLUE = '#2563eb'

function logoUrl(appUrl: string) {
  return `${appUrl}/logo-email.png`
}

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
                <td style="vertical-align:middle;">
                  <img src="${logoUrl(appUrl)}" alt="Vouchee" width="40" height="40" style="display:block;width:40px;height:40px;border:0;outline:none;text-decoration:none;" />
                </td>
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

function cleanerWelcomeHtml(firstName: string, appUrl: string) {
  const dashUrl = `${appUrl}/cleaner/dashboard`
  const inner = `
    <p style="margin:0 0 6px;font-size:22px;font-weight:800;color:#0f172a;">Thanks for applying, ${htmlEscape(firstName)}!</p>
    <p style="margin:0 0 24px;font-size:14px;color:#64748b;line-height:1.6;">We've received your application to join Vouchee. Here's what happens next.</p>

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
      <p style="margin:0;font-size:13px;color:#1e3a8a;line-height:1.55;">We have sent a separate email asking you to confirm your email address. Please click the link in that email to complete your sign up.</p>
    </div>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      <tr>
        <td align="center">
          <a href="${dashUrl}" style="display:inline-block;background:${BRAND_BLUE};color:#ffffff;font-size:14px;font-weight:700;padding:13px 28px;border-radius:10px;text-decoration:none;box-shadow:0 1px 2px rgba(37,99,235,0.15);">Check your application status →</a>
        </td>
      </tr>
    </table>

    <p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.5;text-align:center;">
      Questions? Reply to this email or contact <a href="mailto:cleaners@vouchee.co.uk" style="color:${BRAND_BLUE};">cleaners@vouchee.co.uk</a>
    </p>
  `
  return emailShell(appUrl, inner, 'Thanks for applying to Vouchee')
}

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
        <p style="margin:0 0 2px;font-size:13px;color:#475569;">📧 <a href="mailto:${htmlEscape(cleanerEmail)}" style="color:${BRAND_BLUE};">${htmlEscape(cleanerEmail)}</a></p>
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

    <a href="${appUrl}/admin/dashboard" style="display:block;background:${BRAND_BLUE};color:#ffffff;font-size:14px;font-weight:700;padding:14px 0;border-radius:10px;text-decoration:none;text-align:center;box-shadow:0 1px 2px rgba(37,99,235,0.15);">Review in admin dashboard →</a>
  `
  return emailShell(appUrl, inner, `New application from ${cleanerName}`)
}

// ═════════════════════════════════════════════════════════════════════════
// POST handler — admin-only test endpoint
// Sends both the cleaner welcome and admin alert emails to the logged-in
// admin's email, using realistic dummy applicant data.
// ═════════════════════════════════════════════════════════════════════════
export async function POST(_request: NextRequest) {
  // ─── Auth check ──────────────────────────────────────────────────────────
  // Use the SSR client so we can read the user's session from cookies.
  // This is the standard pattern for admin-protected API routes in App Router.
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Setting cookies in Server Components is restricted; safe to ignore here.
          }
        },
      },
    }
  )

  const { data: { user }, error: userErr } = await supabase.auth.getUser()
  if (userErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Confirm admin role and grab their email + name
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('role, email, full_name')
    .eq('id', user.id)
    .single() as { data: { role: string | null; email: string | null; full_name: string | null } | null, error: any }

  if (profileErr || !profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  if (profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 })
  }

  const adminEmail = profile.email ?? user.email
  if (!adminEmail) {
    return NextResponse.json({ error: 'No email found for admin user' }, { status: 400 })
  }

  const firstName = (profile.full_name ?? 'Test').trim().split(' ')[0]
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.vouchee.co.uk'

  // ─── 1. Send cleaner welcome email ───────────────────────────────────────
  let cleanerResult: { error: string | null; id: string | null } = { error: null, id: null }
  try {
    const { data, error } = await resend.emails.send({
      from: 'Vouchee <cleaners@vouchee.co.uk>',
      to: adminEmail,
      subject: '[TEST] Thanks for applying to Vouchee 🧹',
      html: cleanerWelcomeHtml(firstName, appUrl),
    })
    if (error) {
      cleanerResult = { error: String(error), id: null }
      console.error('[Test] Cleaner welcome email failed:', error)
    } else {
      cleanerResult = { error: null, id: data?.id ?? null }
    }
  } catch (e: any) {
    cleanerResult = { error: e.message ?? 'unknown', id: null }
    console.error('[Test] Cleaner welcome email threw:', e)
  }

  // ─── 2. Send admin alert email (with dummy applicant data) ───────────────
  let adminResult: { error: string | null; id: string | null } = { error: null, id: null }
  try {
    const { data, error } = await resend.emails.send({
      from: 'Vouchee Alerts <cleaners@vouchee.co.uk>',
      to: adminEmail,
      subject: '[TEST] 🆕 New cleaner application — Test Cleaner',
      html: adminAlertHtml({
        cleanerName: 'Test Cleaner',
        cleanerEmail: 'test.cleaner@example.com',
        cleanerPhone: '07700 900123',
        yearsExperience: '3–5 years',
        zonesLabel: 'Central / South East, North West, Southwater',
        dbsClaim: true,
        insuranceClaim: true,
        rightToWorkClaim: true,
        ownSupplies: true,
        needsCredentialsHelp: false,
        appUrl,
      }),
    })
    if (error) {
      adminResult = { error: String(error), id: null }
      console.error('[Test] Admin alert email failed:', error)
    } else {
      adminResult = { error: null, id: data?.id ?? null }
    }
  } catch (e: any) {
    adminResult = { error: e.message ?? 'unknown', id: null }
    console.error('[Test] Admin alert email threw:', e)
  }

  return NextResponse.json({
    success: true,
    sentTo: adminEmail,
    cleaner: cleanerResult,
    admin: adminResult,
  })
}