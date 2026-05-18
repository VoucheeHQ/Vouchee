// ─────────────────────────────────────────────────────────────────────────────
// Cleaner credentials guide email
//
// Sent to cleaners who tick the "Email me a simple step-by-step guide" box on
// the onboarding page when they don't yet have all three accreditations
// (DBS, right to work, public liability insurance). Walks them through what
// each one is, where to get it, what it costs, and how long it takes.
//
// Vouchee won't approve a cleaner without all three, so this email is the
// first step in their conversion path. Keep it practical, plain-English,
// no jargon, no marketing fluff.
// ─────────────────────────────────────────────────────────────────────────────

const BRAND_BLUE = '#2563eb'
const LOGO_URL = 'https://www.vouchee.co.uk/full-logo-black.png'

function htmlEscape(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
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

export interface CredentialsGuideInputs {
  appUrl: string
  firstName: string
  // Tell the guide what to skip if the cleaner already has it. Defaults
  // assume all three are missing.
  hasDbs?: boolean
  hasInsurance?: boolean
  hasRightToWork?: boolean
}

export function cleanerCredentialsGuideHtml({
  appUrl,
  firstName,
  hasDbs = false,
  hasInsurance = false,
  hasRightToWork = false,
}: CredentialsGuideInputs): string {
  const safeName = htmlEscape(firstName || 'there')

  const dbsBlock = hasDbs ? '' : `
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:22px 24px;margin-bottom:20px;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
        <span style="display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:50%;background:#eff6ff;color:#1d4ed8;font-weight:800;font-size:14px;">1</span>
        <h2 style="margin:0;font-size:18px;font-weight:800;color:#0f172a;">DBS check</h2>
      </div>
      <p style="margin:0 0 12px;font-size:14px;color:#334155;line-height:1.65;">
        A Disclosure and Barring Service check confirms you have no relevant criminal record. Most domestic cleaning customers expect at least a <strong>Basic DBS</strong>, which is what Vouchee requires.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:14px 0;">
        <tr><td style="padding:6px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#475569;">Where to apply</td><td style="text-align:right;padding:6px 0;border-bottom:1px solid #f1f5f9;"><a href="https://www.gov.uk/request-copy-criminal-record" style="color:${BRAND_BLUE};font-weight:700;font-size:13px;text-decoration:none;">gov.uk →</a></td></tr>
        <tr><td style="padding:6px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#475569;">Cost</td><td style="text-align:right;padding:6px 0;border-bottom:1px solid #f1f5f9;font-size:13px;font-weight:700;color:#0f172a;">£18 (Basic)</td></tr>
        <tr><td style="padding:6px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#475569;">How long</td><td style="text-align:right;padding:6px 0;border-bottom:1px solid #f1f5f9;font-size:13px;font-weight:700;color:#0f172a;">Around 14 days</td></tr>
        <tr><td style="padding:6px 0;font-size:13px;color:#475569;">What you'll need</td><td style="text-align:right;padding:6px 0;font-size:13px;font-weight:700;color:#0f172a;">Photo ID + 5-year address history</td></tr>
      </table>
      <p style="margin:0;font-size:13px;color:#64748b;line-height:1.6;">
        Apply directly via gov.uk to avoid the third-party processing fees some sites add on top. You'll get a certificate by post which we'll verify when it arrives.
      </p>
    </div>`

  const insuranceBlock = hasInsurance ? '' : `
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:22px 24px;margin-bottom:20px;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
        <span style="display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:50%;background:#f0fdf4;color:#15803d;font-weight:800;font-size:14px;">${hasDbs ? '1' : '2'}</span>
        <h2 style="margin:0;font-size:18px;font-weight:800;color:#0f172a;">Public liability insurance</h2>
      </div>
      <p style="margin:0 0 12px;font-size:14px;color:#334155;line-height:1.65;">
        Covers you if something gets damaged in a customer's home while you're cleaning. Vouchee requires <strong>at least £1,000,000</strong> of cover. Most cleaners pay £60-£120 a year for this.
      </p>
      <div style="margin:14px 0 12px;">
        <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#0f172a;">UK providers worth a quote from:</p>
        <ul style="margin:0;padding-left:20px;color:#334155;font-size:13px;line-height:1.8;">
          <li><a href="https://www.simplybusiness.co.uk/insurance/cleaners/" style="color:${BRAND_BLUE};text-decoration:none;font-weight:600;">Simply Business</a> &mdash; large UK SME insurer, online quote in minutes</li>
          <li><a href="https://www.tradesman-saver.co.uk/cleaners-insurance/" style="color:${BRAND_BLUE};text-decoration:none;font-weight:600;">Tradesman Saver</a> &mdash; specialist trade cover</li>
          <li><a href="https://www.protectivity.com/business-insurance/cleaning-insurance/" style="color:${BRAND_BLUE};text-decoration:none;font-weight:600;">Protectivity</a> &mdash; cleaning-specific policies</li>
        </ul>
      </div>
      <p style="margin:0;font-size:13px;color:#64748b;line-height:1.6;">
        Ask specifically for <strong>"public liability for domestic cleaning, &pound;1m cover"</strong>. Once you've got a policy schedule, upload it to your Vouchee dashboard and we'll verify it.
      </p>
    </div>`

  const rtwBlock = hasRightToWork ? '' : `
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:22px 24px;margin-bottom:20px;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
        <span style="display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:50%;background:#fff7ed;color:#9a3412;font-weight:800;font-size:14px;">${[hasDbs, hasInsurance].filter(Boolean).length + 1}</span>
        <h2 style="margin:0;font-size:18px;font-weight:800;color:#0f172a;">Right to work in the UK</h2>
      </div>
      <p style="margin:0 0 12px;font-size:14px;color:#334155;line-height:1.65;">
        We need to confirm you're legally allowed to work in the UK. If you're a British or Irish citizen, your passport is enough. Otherwise we accept settled/pre-settled status share codes, BRP/eVisa, or a visa with work rights.
      </p>
      <p style="margin:0;font-size:13px;color:#64748b;line-height:1.6;">
        Generate a share code at <a href="https://www.gov.uk/prove-right-to-work" style="color:${BRAND_BLUE};font-weight:600;text-decoration:none;">gov.uk/prove-right-to-work</a> if you need one. It's free and takes about 5 minutes.
      </p>
    </div>`

  const inner = `
    <h1 style="margin:0 0 14px;font-size:22px;font-weight:800;color:#0f172a;">Hi ${safeName}, here's the guide</h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:#334155;">
      Thanks for applying to Vouchee. We can't approve a cleaner without the three accreditations below, but they're all genuinely straightforward to get and we've put the cheapest, fastest route to each in this email.
    </p>
    <p style="margin:0 0 26px;font-size:15px;line-height:1.65;color:#334155;">
      Once you've sorted everything, reply to this email or update your Vouchee dashboard and we'll review your application again.
    </p>

    ${dbsBlock}
    ${insuranceBlock}
    ${rtwBlock}

    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:16px 20px;margin-bottom:20px;">
      <p style="margin:0;font-size:13px;color:#1e40af;line-height:1.65;">
        💡 <strong>Tip:</strong> You can apply for the DBS and request insurance quotes in parallel. Most cleaners are fully accredited within two to three weeks from the day they start.
      </p>
    </div>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 16px;">
      <tr><td align="center">
        <a href="${appUrl}/cleaner/dashboard" style="display:inline-block;background:#0f172a;color:white;font-size:14px;font-weight:700;padding:13px 28px;border-radius:10px;text-decoration:none;">Open your dashboard →</a>
      </td></tr>
    </table>

    <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.5;text-align:center;">
      Questions? Reply to this email or contact <a href="mailto:cleaners@vouchee.co.uk" style="color:${BRAND_BLUE};">cleaners@vouchee.co.uk</a>
    </p>
  `
  return emailShell(appUrl, inner, 'Your Vouchee credentials guide')
}
