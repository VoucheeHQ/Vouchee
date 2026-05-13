// ─────────────────────────────────────────────────────────────────────────
// Admin alert: a customer just posted a new listing.
//
// Fired from /api/send-new-listing-admin-alert which runs both for live
// listings (post-launch) and pre_launch_pending listings (early-list
// signups). Lands in the admin inbox so Adam sees every interaction in
// real time during the early weeks of the platform.
//
// Same shared-template pattern as the other email files: production route
// and admin test route import from here, so editing this is the only
// place to tweak copy.
// ─────────────────────────────────────────────────────────────────────────

import { BRAND_BLUE, LOGO_URL } from './application-received'

function htmlEscape(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

interface NewListingArgs {
  customerName: string
  customerEmail: string
  customerPhone: string | null
  zoneLabel: string
  bedrooms: number
  bathrooms: number
  frequency: string
  hourlyRate: number | null
  hoursPerSession: number | null
  isPreLaunch: boolean
  appUrl: string
}

const FREQ_LABEL: Record<string, string> = {
  weekly: 'Weekly', fortnightly: 'Fortnightly', monthly: 'Monthly',
}

export function newListingAdminAlertSubject(opts: { customerName: string; zoneLabel: string; isPreLaunch: boolean }): string {
  const prefix = opts.isPreLaunch ? '📫 [Pre-launch]' : '🎉 [Live]'
  return `${prefix} New listing from ${opts.customerName} — ${opts.zoneLabel}`
}

export function newListingAdminAlertHtml(args: NewListingArgs): string {
  const {
    customerName, customerEmail, customerPhone, zoneLabel, bedrooms, bathrooms,
    frequency, hourlyRate, hoursPerSession, isPreLaunch, appUrl,
  } = args
  const freqLabel = FREQ_LABEL[frequency] ?? frequency ?? 'Not set'
  const rateLabel = hourlyRate ? `£${hourlyRate.toFixed(2)}/hr` : '—'
  const sessionLabel = hoursPerSession ? `${hoursPerSession} hrs` : '—'
  const estPerClean = (hourlyRate && hoursPerSession) ? `~£${(hourlyRate * hoursPerSession).toFixed(2)}` : '—'

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>New listing on Vouchee</title>
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
            <div style="font-size:48px;margin-bottom:8px;">${isPreLaunch ? '📫' : '🎉'}</div>
            <h1 style="margin:0;font-size:24px;font-weight:800;color:#0f172a;letter-spacing:-0.3px;">New ${isPreLaunch ? 'pre-launch ' : ''}listing</h1>
            <p style="margin:8px 0 0;font-size:14px;color:#94a3b8;">${isPreLaunch ? 'A customer added themselves to the early list' : 'Live and visible to cleaners now'}</p>
          </div>

          <div style="background:${isPreLaunch ? '#eff6ff' : '#f0fdf4'};border:1.5px solid ${isPreLaunch ? '#bfdbfe' : '#bbf7d0'};border-radius:12px;padding:20px 24px;margin-bottom:24px;">
            <div style="font-size:11px;font-weight:800;color:${isPreLaunch ? '#1e40af' : '#15803d'};text-transform:uppercase;letter-spacing:0.08em;margin-bottom:10px;">Customer</div>
            <div style="font-size:18px;font-weight:800;color:#0f172a;margin-bottom:4px;">${htmlEscape(customerName)}</div>
            <div style="font-size:13px;color:#475569;line-height:1.6;">
              <a href="mailto:${htmlEscape(customerEmail)}" style="color:#2563eb;text-decoration:none;">${htmlEscape(customerEmail)}</a>
              ${customerPhone ? ` · <a href="tel:${htmlEscape(customerPhone)}" style="color:#2563eb;text-decoration:none;">${htmlEscape(customerPhone)}</a>` : ''}
            </div>
          </div>

          <div style="font-size:11px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:10px;">Listing details</div>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            <tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#64748b;width:38%;">Zone</td><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;text-align:right;font-size:13px;font-weight:700;color:#0f172a;">${htmlEscape(zoneLabel)}</td></tr>
            <tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#64748b;">Property</td><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;text-align:right;font-size:13px;font-weight:700;color:#0f172a;">${bedrooms} bed · ${bathrooms} bath</td></tr>
            <tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#64748b;">Frequency</td><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;text-align:right;font-size:13px;font-weight:700;color:#0f172a;">${freqLabel}</td></tr>
            <tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#64748b;">Session length</td><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;text-align:right;font-size:13px;font-weight:700;color:#0f172a;">${sessionLabel}</td></tr>
            <tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#64748b;">Offered rate</td><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;text-align:right;font-size:13px;font-weight:700;color:#0f172a;">${rateLabel}</td></tr>
            <tr><td style="padding:8px 0;font-size:13px;color:#64748b;">Est. per clean</td><td style="padding:8px 0;text-align:right;font-size:13px;font-weight:700;color:#0f172a;">${estPerClean}</td></tr>
          </table>

          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center">
              <a href="${appUrl}/admin/dashboard" style="display:inline-block;background:${BRAND_BLUE};color:#ffffff;font-size:14px;font-weight:700;padding:13px 28px;border-radius:10px;text-decoration:none;">Open admin dashboard →</a>
            </td></tr>
          </table>

        </td></tr>
        <tr><td style="padding:24px 0 0;text-align:center;">
          <p style="margin:0;font-size:12px;color:#94a3b8;">© 2026 Vouchee Ltd · <a href="${appUrl}" style="color:#94a3b8;">vouchee.co.uk</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}
