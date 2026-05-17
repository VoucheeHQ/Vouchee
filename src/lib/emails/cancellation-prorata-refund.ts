// ─────────────────────────────────────────────────────────────────────────
// Cancellation pro-rata refund emails
//
// Sent by /api/cron/process-cancellation-refunds when a customer's 30-day
// notice period ends. Two flavours:
//   - Refund-issued: there was unused billed time, GC refund is on its way
//   - No refund: the final cycle was fully consumed during the notice, so
//     nothing to refund. Sent anyway for closure / paper-trail.
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

export interface RefundIssuedInputs {
  appUrl: string
  firstName: string
  amountPence: number
  noticeEnd: Date
  cycleEnd: Date
}

export function cancellationRefundIssuedHtml({ appUrl, firstName, amountPence, noticeEnd, cycleEnd }: RefundIssuedInputs): string {
  const safeName = htmlEscape(firstName || 'there')
  const amountStr = `£${(amountPence / 100).toFixed(2)}`
  const noticeEndStr = fmtDate(noticeEnd)
  const cycleEndStr = fmtDate(cycleEnd)
  const refundByStr = fmtDate(new Date(noticeEnd.getTime() + 14 * 24 * 60 * 60 * 1000))
  const inner = `
    <h1 style="margin:0 0 16px;font-size:22px;font-weight:800;color:#0f172a;">Your refund of ${amountStr} is on its way</h1>
    <p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#334155;">Hi ${safeName},</p>
    <p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#334155;">
      Your 30-day notice ended on <strong>${noticeEndStr}</strong>. Your last billed month ran through <strong>${cycleEndStr}</strong>, and your service ended part-way through it.
    </p>
    <p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#334155;">
      As per clause 11.2 of our Customer Terms, we've refunded the unused portion on a pro-rata basis. <strong>${amountStr}</strong> will be returned to your bank account via GoCardless by <strong>${refundByStr}</strong>.
    </p>
    <div style="background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:12px;padding:18px 22px;margin:20px 0;">
      <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#15803d;text-transform:uppercase;letter-spacing:0.06em;">Refund amount</p>
      <p style="margin:0;font-size:24px;font-weight:800;color:#0f172a;">${amountStr}</p>
    </div>
    <p style="margin:0 0 14px;font-size:14px;color:#475569;line-height:1.6;">
      Nothing further you need to do. Your subscription is fully closed and no further payments will be taken.
    </p>
    <p style="margin:0 0 14px;font-size:14px;color:#475569;line-height:1.6;">
      Thank you for using Vouchee. If you ever want to come back, your cleaner-search history stays on your account.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0 16px;"><tr><td align="center">
      <a href="${appUrl}" style="display:inline-block;background:${BRAND_BLUE};color:white;font-size:14px;font-weight:700;padding:12px 28px;border-radius:10px;text-decoration:none;">Visit Vouchee</a>
    </td></tr></table>
    <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.5;text-align:center;">
      Questions? <a href="mailto:support@vouchee.co.uk" style="color:${BRAND_BLUE};">support@vouchee.co.uk</a>
    </p>
  `
  return emailShell(appUrl, inner, `Your refund of ${amountStr} is on its way`)
}

export interface NoRefundInputs {
  appUrl: string
  firstName: string
  noticeEnd: Date
}

export function cancellationNoRefundHtml({ appUrl, firstName, noticeEnd }: NoRefundInputs): string {
  const safeName = htmlEscape(firstName || 'there')
  const noticeEndStr = fmtDate(noticeEnd)
  const inner = `
    <h1 style="margin:0 0 16px;font-size:22px;font-weight:800;color:#0f172a;">Your Vouchee subscription has fully ended</h1>
    <p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#334155;">Hi ${safeName},</p>
    <p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#334155;">
      Your 30-day notice ended on <strong>${noticeEndStr}</strong>. Your final billed month was fully used during the notice, so there's no pro-rata refund to issue this time.
    </p>
    <p style="margin:0 0 14px;font-size:14px;color:#475569;line-height:1.6;">
      Your subscription is fully closed and no further payments will be taken. Nothing else needed from you.
    </p>
    <p style="margin:0 0 14px;font-size:14px;color:#475569;line-height:1.6;">
      Thank you for using Vouchee. If you ever want to come back, your cleaner-search history stays on your account.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0 16px;"><tr><td align="center">
      <a href="${appUrl}" style="display:inline-block;background:${BRAND_BLUE};color:white;font-size:14px;font-weight:700;padding:12px 28px;border-radius:10px;text-decoration:none;">Visit Vouchee</a>
    </td></tr></table>
    <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.5;text-align:center;">
      Questions? <a href="mailto:support@vouchee.co.uk" style="color:${BRAND_BLUE};">support@vouchee.co.uk</a>
    </p>
  `
  return emailShell(appUrl, inner, 'Your Vouchee subscription has fully ended')
}
