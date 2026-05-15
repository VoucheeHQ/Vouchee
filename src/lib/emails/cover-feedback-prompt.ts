// ─────────────────────────────────────────────────────────────────────────
// Cover-feedback prompt email — fires ~24h after a cover_date via the
// daily /api/cron/nudge-cover-feedback cron. Asks the customer how the
// one-off cover clean went and links to /cover-feedback/[requestId].
//
// The landing page submits a review (1-5 stars + body) through the
// existing /api/reviews/submit endpoint, so the cover cleaner's review
// counts toward the same rating_average / rating_count as any regular
// review — no parallel system. The page also exposes an optional chat
// box whose copy adapts to the chosen rating: 1-3★ surfaces "what didn't
// work"; 4-5★ surfaces "what you liked". Chat content emails the admin
// only — no public artifact.
// ─────────────────────────────────────────────────────────────────────────

const BRAND_BLUE = '#2563eb'
const LOGO_URL = 'https://www.vouchee.co.uk/full-logo-black.png'

function htmlEscape(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
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

export interface CoverFeedbackPromptInputs {
  appUrl: string
  customerFirstName: string
  cleanerFirstName: string
  cleanRequestId: string
}

export function coverFeedbackPromptHtml({
  appUrl, customerFirstName, cleanerFirstName, cleanRequestId,
}: CoverFeedbackPromptInputs): string {
  const safeCustomer = htmlEscape(customerFirstName || 'there')
  const safeCleaner = htmlEscape(cleanerFirstName || 'your cleaner')
  const feedbackUrl = `${appUrl}/cover-feedback/${encodeURIComponent(cleanRequestId)}`
  const inner = `
    <h1 style="margin:0 0 16px;font-size:22px;font-weight:800;color:#0f172a;">How did your cover clean go?</h1>
    <p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#334155;">Hi ${safeCustomer},</p>
    <p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#334155;">
      Hope ${safeCleaner} took good care of you yesterday. Leaving a quick review helps other Horsham customers find a cleaner they can trust — and it's the best way to thank ${safeCleaner} for stepping in.
    </p>
    <p style="margin:0 0 26px;font-size:15px;line-height:1.6;color:#334155;">
      It only takes a minute.
    </p>
    <a href="${feedbackUrl}" style="display:inline-block;background:${BRAND_BLUE};color:white;text-decoration:none;border-radius:10px;padding:12px 24px;font-size:14px;font-weight:700;">
      Leave a review →
    </a>
    <p style="margin:24px 0 0;font-size:12px;color:#94a3b8;line-height:1.5;">
      Anything you'd rather tell us privately? There's a quiet space for that on the same page — completely optional.
    </p>
  `
  return emailShell(appUrl, inner, `How did your cover clean with ${safeCleaner} go?`)
}
