// ─────────────────────────────────────────────────────────────────────────
// Email template — pre-launch 24h reminder + confirm-listing CTA.
//
// Sent 24 hours before LAUNCH_DATE to every customer whose listing is
// still pre_launch_pending. The CTA links to /api/pre-launch-confirm
// which marks the listing as ready to go live. Listings that never get
// confirmed stay in pre_launch_pending after the admin flips the rest.
// ─────────────────────────────────────────────────────────────────────────

import { BRAND_BLUE, LOGO_URL } from './application-received'
import { LAUNCH_DATETIME_LABEL } from '@/lib/launch'

function htmlEscape(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

interface ReminderArgs {
  customerFirstName: string
  zoneLabel: string
  confirmUrl: string
  appUrl: string
}

export function preLaunch24hSubject(): string {
  return `Vouchee launches tomorrow — confirm your listing 🚀`
}

export function preLaunch24hHtml({
  customerFirstName,
  zoneLabel,
  confirmUrl,
  appUrl,
}: ReminderArgs): string {
  const firstName = htmlEscape(customerFirstName)
  const zone = htmlEscape(zoneLabel)
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Vouchee launches in 24 hours</title>
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
            <div style="font-size:48px;margin-bottom:8px;">🚀</div>
            <h1 style="margin:0;font-size:26px;font-weight:800;color:#0f172a;letter-spacing:-0.3px;line-height:1.2;">Vouchee launches in 24 hours</h1>
          </div>

          <p style="margin:0 0 16px;font-size:15px;color:#475569;line-height:1.7;">
            Hi ${firstName},
          </p>
          <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.7;">
            We open the marketplace to cleaners at <strong>${LAUNCH_DATETIME_LABEL}</strong>. Your listing for <strong>${zone}</strong> is saved and ready — we just need a quick confirmation that you still want it to go live.
          </p>

          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            <tr><td align="center">
              <a href="${confirmUrl}" style="display:inline-block;background:${BRAND_BLUE};color:#ffffff;font-size:16px;font-weight:800;padding:16px 36px;border-radius:12px;text-decoration:none;box-shadow:0 4px 12px rgba(37,99,235,0.25);">✓ Yes — launch my listing</a>
            </td></tr>
          </table>

          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
            <div style="font-size:11px;font-weight:800;color:#15803d;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">What happens when you click</div>
            <div style="font-size:13px;color:#166534;line-height:1.6;">
              Your listing flips from "Pending launch" to "Live" the moment the marketplace opens. Cleaners in your area get notified. You'll start seeing applications.
            </div>
          </div>

          <p style="margin:0 0 8px;font-size:13px;color:#94a3b8;line-height:1.7;">
            Changed your mind? Just ignore this email. Unconfirmed listings stay saved on your dashboard, and you can confirm any time after launch.
          </p>

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
