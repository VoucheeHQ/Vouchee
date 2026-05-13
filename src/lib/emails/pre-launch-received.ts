// ─────────────────────────────────────────────────────────────────────────
// Email template — pre-launch listing received.
//
// Sent immediately when a customer posts a listing during the pre-launch
// window (status: pre_launch_pending). Confirms receipt, sets expectations
// for what happens between now and 1 June, and explains the 24-hour
// confirmation step they'll get the day before launch.
//
// One template, exported as `preLaunchReceivedHtml`. Used by
// /api/send-pre-launch-confirmation.
// ─────────────────────────────────────────────────────────────────────────

import { BRAND_BLUE, LOGO_URL } from './application-received'
import { LAUNCH_DATETIME_LABEL } from '@/lib/launch'

function htmlEscape(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

interface PreLaunchReceivedArgs {
  customerFirstName: string
  zoneLabel: string
  appUrl: string
}

export function preLaunchReceivedSubject(): string {
  return `You're on the Vouchee early list 📫`
}

export function preLaunchReceivedHtml({
  customerFirstName,
  zoneLabel,
  appUrl,
}: PreLaunchReceivedArgs): string {
  const firstName = htmlEscape(customerFirstName)
  const zone = htmlEscape(zoneLabel)
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>You're on the Vouchee early list</title>
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
        <tr><td style="background:white;border-radius:20px;padding:36px;border:1px solid #e2e8f0;">

          <div style="text-align:center;margin-bottom:24px;">
            <div style="font-size:48px;margin-bottom:8px;">📫</div>
            <h1 style="margin:0;font-size:24px;font-weight:800;color:#0f172a;letter-spacing:-0.3px;">You're on the early list</h1>
          </div>

          <p style="margin:0 0 16px;font-size:15px;color:#475569;line-height:1.7;">
            Hi ${firstName},
          </p>
          <p style="margin:0 0 20px;font-size:15px;color:#475569;line-height:1.7;">
            Thanks for posting your request for <strong>${zone}</strong>. We're opening the marketplace to cleaners on <strong>${LAUNCH_DATETIME_LABEL}</strong>, and your listing is saved and waiting.
          </p>

          <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:18px 20px;margin-bottom:24px;">
            <div style="font-size:11px;font-weight:800;color:#1e40af;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">What happens next</div>
            <ul style="margin:0;padding:0 0 0 18px;font-size:14px;color:#1e3a8a;line-height:1.7;">
              <li>The day before launch, we'll email you a one-click confirmation link</li>
              <li>Once you confirm, your listing goes live the moment the marketplace opens</li>
              <li>Cleaners in your area will see it and apply — usually within the first day</li>
            </ul>
          </div>

          <p style="margin:0 0 24px;font-size:14px;color:#64748b;line-height:1.7;">
            Nothing else to do for now. You'll hear from us 24 hours before launch.
          </p>

          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center">
              <a href="${appUrl}/customer/dashboard" style="display:inline-block;background:${BRAND_BLUE};color:#ffffff;font-size:14px;font-weight:700;padding:13px 28px;border-radius:10px;text-decoration:none;">View your dashboard →</a>
            </td></tr>
          </table>

        </td></tr>
        <tr><td style="padding:24px 0 0;text-align:center;">
          <p style="margin:0;font-size:12px;color:#94a3b8;">© 2026 Vouchee Ltd · <a href="${appUrl}" style="color:#94a3b8;">vouchee.co.uk</a> · <a href="mailto:hello@vouchee.co.uk" style="color:#94a3b8;">hello@vouchee.co.uk</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}
