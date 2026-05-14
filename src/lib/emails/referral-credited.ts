// ─────────────────────────────────────────────────────────────────────────
// Email templates for the referral credit flow.
//
// Two templates, one file (they share styling + helpers):
//   - referrerHtml — sent when their referee passes the 24h post-start gate
//   - refereeHtml  — sent at the same time, welcoming the referred customer
//
// Used by /api/cron/referral-credits.
// ─────────────────────────────────────────────────────────────────────────

const BRAND_BLUE = '#2563eb'
const LOGO_URL = 'https://www.vouchee.co.uk/full-logo-black.png'

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
          <p style="margin:0;font-size:12px;color:#94a3b8;">© 2026 Vouchee Ltd · <a href="${appUrl}" style="color:#94a3b8;">vouchee.co.uk</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export interface ReferralEmailInputs {
  appUrl: string
  firstName: string
}

// ═════════════════════════════════════════════════════════════════════════
// Email to the REFERRER: "Your friend just had their first clean"
// ═════════════════════════════════════════════════════════════════════════
export function referrerHtml({ appUrl, firstName }: ReferralEmailInputs): string {
  const safeName = htmlEscape(firstName || 'there')
  const inner = `
    <h1 style="margin:0 0 16px;font-size:22px;font-weight:800;color:#0f172a;">Your next month's on us 🎉</h1>
    <p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#334155;">Hi ${safeName},</p>
    <p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#334155;">
      Someone you referred has confirmed a cleaner and started cleans on Vouchee — thank you for spreading the word.
    </p>
    <p style="margin:0 0 22px;font-size:15px;line-height:1.6;color:#334155;">
      As a thank you, we've credited <strong>one month free</strong> on your subscription. Your next direct debit will be skipped automatically — you don't need to do anything.
    </p>
    <p style="margin:0 0 26px;font-size:15px;line-height:1.6;color:#334155;">
      Want another free month? Share your invite link with another friend who needs a cleaner.
    </p>
    <a href="${appUrl}/customer/dashboard" style="display:inline-block;background:${BRAND_BLUE};color:white;text-decoration:none;border-radius:10px;padding:12px 24px;font-size:14px;font-weight:700;">
      Open your dashboard →
    </a>
  `
  return emailShell(appUrl, inner, "Your next month's free on Vouchee")
}

// ═════════════════════════════════════════════════════════════════════════
// Email to the REFEREE: "Welcome — first month on the house"
// ═════════════════════════════════════════════════════════════════════════
export function refereeHtml({ appUrl, firstName }: ReferralEmailInputs): string {
  const safeName = htmlEscape(firstName || 'there')
  const inner = `
    <h1 style="margin:0 0 16px;font-size:22px;font-weight:800;color:#0f172a;">Welcome — your first month's on us 🎉</h1>
    <p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#334155;">Hi ${safeName},</p>
    <p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#334155;">
      Because you joined Vouchee through a friend's invite, your <strong>first month is free</strong>. We've paused your next direct debit automatically — your cleans continue as normal, just without the charge.
    </p>
    <p style="margin:0 0 26px;font-size:15px;line-height:1.6;color:#334155;">
      You've got your own invite link too. Share it with a friend and you'll both get another month free when they start their cleans.
    </p>
    <a href="${appUrl}/customer/dashboard" style="display:inline-block;background:${BRAND_BLUE};color:white;text-decoration:none;border-radius:10px;padding:12px 24px;font-size:14px;font-weight:700;">
      Open your dashboard →
    </a>
  `
  return emailShell(appUrl, inner, 'Welcome to Vouchee — first month free')
}
