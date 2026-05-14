// ─────────────────────────────────────────────────────────────────────────
// Review request email — fires ~14 days after start_date via the daily
// /api/cron/review-requests cron. Asks the customer to leave a review for
// their assigned cleaner. The CTA links to the same /c/[shortId] page
// where the dashboard's "Leave a review" button sends them, so there's
// only one review entry point to keep in sync.
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

export interface ReviewRequestInputs {
  appUrl: string
  customerFirstName: string
  cleanerFirstName: string
  cleanerShortId: string
}

export function reviewRequestHtml({ appUrl, customerFirstName, cleanerFirstName, cleanerShortId }: ReviewRequestInputs): string {
  const safeCustomer = htmlEscape(customerFirstName || 'there')
  const safeCleaner = htmlEscape(cleanerFirstName || 'your cleaner')
  const reviewUrl = `${appUrl}/c/${encodeURIComponent(cleanerShortId)}`
  const inner = `
    <h1 style="margin:0 0 16px;font-size:22px;font-weight:800;color:#0f172a;">How are your cleans going with ${safeCleaner}?</h1>
    <p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#334155;">Hi ${safeCustomer},</p>
    <p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#334155;">
      It's been a couple of weeks since ${safeCleaner} started cleaning for you. We'd love to hear how it's going — your review helps other customers in Horsham find a cleaner they can trust.
    </p>
    <p style="margin:0 0 26px;font-size:15px;line-height:1.6;color:#334155;">
      It only takes a minute. Click below to leave a short review on ${safeCleaner}'s profile.
    </p>
    <a href="${reviewUrl}" style="display:inline-block;background:${BRAND_BLUE};color:white;text-decoration:none;border-radius:10px;padding:12px 24px;font-size:14px;font-weight:700;">
      Leave a review →
    </a>
    <p style="margin:24px 0 0;font-size:12px;color:#94a3b8;line-height:1.5;">
      Not happy with your cleans? Reply to this email and we'll help sort it.
    </p>
  `
  return emailShell(appUrl, inner, `Review your clean with ${customerFirstName ? '' : ''}${safeCleaner}`)
}
