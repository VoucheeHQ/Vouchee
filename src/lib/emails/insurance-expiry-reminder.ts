// ─────────────────────────────────────────────────────────────────────────
// Insurance expiry reminder email
//
// Fired by /api/cron/insurance-expiry-reminder when a cleaner's public
// liability insurance is between 14 and 30 days from expiry. One email
// per renewal cycle — dedup is handled in the cron via
// cleaners.insurance_expiry_reminder_sent_at.
//
// Tone: practical, no panic. UK-specific insurer list mirrors the
// credentials guide so cleaners see the same three places to renew.
// ─────────────────────────────────────────────────────────────────────────

const BRAND_BLUE = '#2563eb'
const LOGO_URL = 'https://www.vouchee.co.uk/full-logo-black.png'

function htmlEscape(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function emailShell(appUrl: string, innerHtml: string, title: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>${title}</title></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 0;">
  <tr><td align="center">
  <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
    <tr><td style="padding:0 0 24px;text-align:center;">
      <img src="${LOGO_URL}" width="200" height="46" alt="Vouchee" style="display:block;margin:0 auto;max-width:100%;height:auto;border:0;" />
    </td></tr>
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

export interface InsuranceExpiryReminderInputs {
  appUrl: string
  firstName: string
  expiryDate: Date
  daysUntilExpiry: number
}

export function insuranceExpiryReminderHtml({
  appUrl, firstName, expiryDate, daysUntilExpiry,
}: InsuranceExpiryReminderInputs): string {
  const safeName = htmlEscape(firstName || 'there')
  const expiryStr = fmtDate(expiryDate)
  const dayLabel = daysUntilExpiry === 1 ? '1 day' : `${daysUntilExpiry} days`

  const inner = `
    <h1 style="margin:0 0 14px;font-size:22px;font-weight:800;color:#0f172a;">Time to renew your insurance, ${safeName}</h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:#334155;">
      Your Vouchee public liability cover expires in <strong>${dayLabel}</strong>, on <strong>${expiryStr}</strong>. Renewing now keeps you live on Vouchee without interruption.
    </p>

    <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:14px 16px;margin:18px 0;">
      <p style="margin:0;font-size:13px;color:#9a3412;line-height:1.6;">
        Vouchee requires <strong>at least &pound;1,000,000</strong> of public liability cover. If your policy lapses we'll need to pause your account until a fresh policy schedule is on file.
      </p>
    </div>

    <p style="margin:0 0 10px;font-size:14px;font-weight:700;color:#0f172a;">Quick renewal options (UK):</p>
    <ul style="margin:0 0 18px;padding-left:20px;color:#334155;font-size:14px;line-height:1.8;">
      <li><a href="https://www.simplybusiness.co.uk/insurance/cleaners/" style="color:${BRAND_BLUE};text-decoration:none;font-weight:600;">Simply Business</a> &mdash; quick online quote</li>
      <li><a href="https://www.tradesman-saver.co.uk/cleaners-insurance/" style="color:${BRAND_BLUE};text-decoration:none;font-weight:600;">Tradesman Saver</a> &mdash; specialist trade cover</li>
      <li><a href="https://www.protectivity.com/business-insurance/cleaning-insurance/" style="color:${BRAND_BLUE};text-decoration:none;font-weight:600;">Protectivity</a> &mdash; cleaning-specific policies</li>
    </ul>

    <p style="margin:0 0 22px;font-size:14px;color:#475569;line-height:1.6;">
      Once you've got a fresh schedule, upload it to your dashboard and we'll verify it. Most renewals are processed within a working day.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;"><tr><td align="center">
      <a href="${appUrl}/cleaner/dashboard" style="display:inline-block;background:${BRAND_BLUE};color:white;font-size:14px;font-weight:700;padding:13px 28px;border-radius:10px;text-decoration:none;">Upload renewed cover &rarr;</a>
    </td></tr></table>

    <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.5;text-align:center;">
      Already renewed? Reply to this email or contact <a href="mailto:cleaners@vouchee.co.uk" style="color:${BRAND_BLUE};">cleaners@vouchee.co.uk</a>
    </p>
  `
  return emailShell(appUrl, inner, 'Time to renew your Vouchee insurance')
}
