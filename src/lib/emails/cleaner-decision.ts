// ─────────────────────────────────────────────────────────────────────────
// Email templates for the "cleaner decision" flow.
//
// SINGLE SOURCE OF TRUTH for:
//   - approvalHtml  — sent to a cleaner when admin approves their application
//   - rejectionHtml — sent to a cleaner when admin rejects their application
//
// Both the production route (/api/admin/send-cleaner-decision-email) and
// the admin test route (/api/admin/test-cleaner-decision-emails) import
// from this file. A change here updates BOTH automatically — the test
// button always reflects what real cleaners will receive.
//
// Tone is set deliberately:
//   - Approval: pure enthusiasm. Cleaner has had an interview, knows the
//     platform, knows how it works. This email is celebration, not admin.
//   - Rejection: short, kind, generic. No reasons, no reapply invitation.
//     A clean, dignified exit.
//
// To preview changes: edit a template here, push, then click the
// "Cleaner decision emails" button on the Admin → Tests tab.
// ─────────────────────────────────────────────────────────────────────────

import { BRAND_BLUE, LOGO_URL } from './application-received'

// Brand green — used as accent on the approval email's celebration block.
// Matches the green confirmation accent already used in the cleaner
// "You've been chosen" email and customer "You're all set" email so the
// platform's positive moments share a consistent visual identity.
const BRAND_GREEN = '#16a34a'

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
          <td style="padding:0 0 24px;text-align:center;">
            <img src="${LOGO_URL}" width="200" height="46" alt="Vouchee" style="display:block;margin:0 auto;max-width:100%;height:auto;border:0;outline:none;text-decoration:none;" />
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
// Email to the CLEANER: "You're approved! Welcome to Vouchee"
// ═════════════════════════════════════════════════════════════════════════
//
// Sent automatically when admin clicks "Approve" in the cleaner CRM drawer.
// Tone: post-interview celebration. The cleaner has met Adam, been walked
// through the platform, and knows what's coming. This email is the
// emotional payoff: you made it, welcome aboard.
export function approvalHtml(firstName: string, appUrl: string) {
  const dashUrl = `${appUrl}/cleaner/dashboard`
  const suppliesUrl = `${appUrl}/cleaning-supplies`

  const inner = `
    <p style="margin:0 0 28px;font-size:26px;font-weight:800;color:#0f172a;">Welcome to Vouchee, ${htmlEscape(firstName)}! 🎉</p>

    <div style="background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:14px;padding:24px 26px;margin-bottom:24px;text-align:center;">
      <div style="font-size:28px;margin-bottom:8px;">✅</div>
      <div style="font-size:15px;font-weight:800;color:#15803d;margin-bottom:6px;">You're approved on Vouchee</div>
      <div style="font-size:13px;color:#166534;line-height:1.6;">You can start applying to jobs in your area straight away. Customers will be able to see your profile, your reviews, and your DBS / insurance / right-to-work credentials.</div>
    </div>

    <p style="margin:0 0 14px;font-size:14px;font-weight:700;color:#0f172a;">What to do next</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#475569;line-height:1.6;">
          <strong style="color:#0f172a;">1.</strong> &nbsp;Head to your dashboard to see open jobs in your zones
        </td>
      </tr>
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#475569;line-height:1.6;">
          <strong style="color:#0f172a;">2.</strong> &nbsp;Apply to any cleaner requests that suit your availability and rate
        </td>
      </tr>
      <tr>
        <td style="padding:10px 0;font-size:13px;color:#475569;line-height:1.6;">
          <strong style="color:#0f172a;">3.</strong> &nbsp;Once a customer accepts you, you'll get their address and start date by email
        </td>
      </tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td align="center">
          <a href="${dashUrl}" style="display:inline-block;background:${BRAND_BLUE};color:#ffffff;font-size:15px;font-weight:700;padding:14px 36px;border-radius:10px;text-decoration:none;box-shadow:0 1px 2px rgba(37,99,235,0.15);">Open my dashboard →</a>
        </td>
      </tr>
    </table>

    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:22px 26px;margin-bottom:24px;text-align:center;">
      <div style="font-size:15px;font-weight:700;color:#15803d;margin-bottom:6px;">🧴 Need to stock up before your first clean?</div>
      <div style="font-size:13px;color:#166534;line-height:1.6;margin-bottom:16px;">We've put together a page with everything you might need in one place.</div>
      <a href="${suppliesUrl}" style="display:inline-block;background:${BRAND_GREEN};color:white;font-size:13px;font-weight:700;padding:11px 26px;border-radius:8px;text-decoration:none;">Browse cleaning supplies →</a>
    </div>

    <p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.5;text-align:center;">
      Questions? Reply to this email or contact <a href="mailto:cleaners@vouchee.co.uk" style="color:${BRAND_BLUE};">cleaners@vouchee.co.uk</a>
    </p>
  `
  return emailShell(appUrl, inner, 'Welcome to Vouchee')
}

// ═════════════════════════════════════════════════════════════════════════
// Email to the CLEANER: rejection
// ═════════════════════════════════════════════════════════════════════════
//
// Short, kind, generic. No reasons given (reasons live privately in the
// admin CRM under cleaners.rejection_reason). No reapply invitation —
// if a previously-rejected applicant should be reconsidered, that's a
// human decision, not a footer link.
export function rejectionHtml(firstName: string, appUrl: string) {
  const inner = `
    <p style="margin:0 0 6px;font-size:22px;font-weight:800;color:#0f172a;">Hi ${htmlEscape(firstName)},</p>
    <p style="margin:0 0 18px;font-size:14px;color:#475569;line-height:1.7;">
      Thanks so much for taking the time to apply.
    </p>
    <p style="margin:0 0 18px;font-size:14px;color:#475569;line-height:1.7;">
      Right now isn't the right moment for us to bring you on. We're keeping the cleaner side of the platform deliberately small while we settle into the early weeks, and we're holding off on growing it for now.
    </p>
    <p style="margin:0 0 28px;font-size:14px;color:#475569;line-height:1.7;">
      We won't keep you waiting on a list or get back in touch later. Genuinely wishing you all the best with your cleaning work.
    </p>

    <p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.5;text-align:center;">
      Adam<br/>Vouchee
    </p>
  `
  return emailShell(appUrl, inner, 'Update on your Vouchee application')
}