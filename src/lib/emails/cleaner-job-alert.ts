// ─────────────────────────────────────────────────────────────────────────
// Email template for the hourly cleaner job alerts.
//
// SINGLE SOURCE OF TRUTH for: jobAlertHtml — sent to approved cleaners
// when new jobs appear in their zones during the last hour.
//
// Style mirrors application-received.ts and cleaner-decision.ts so the
// platform's emails feel like a coherent family. Brand colours imported
// from application-received.ts to enforce consistency.
//
// One email per cleaner per hour with all matching jobs as cards.
// ─────────────────────────────────────────────────────────────────────────

import { BRAND_BLUE, LOGO_URL } from './application-received'

function htmlEscape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

const ZONE_LABELS: Record<string, string> = {
  central_south_east: 'Central Horsham',
  north_west: 'North West Horsham',
  north_east_roffey: 'North East / Roffey',
  south_west: 'South West Horsham',
  warnham_north: 'Warnham & North',
  broadbridge_heath: 'Broadbridge Heath',
  mannings_heath: 'Mannings Heath',
  faygate_kilnwood_vale: 'Faygate / Kilnwood Vale',
  christs_hospital: "Christ's Hospital",
  southwater: 'Southwater',
}

const FREQUENCY_LABELS: Record<string, string> = {
  weekly: 'Weekly',
  fortnightly: 'Fortnightly',
  monthly: 'Monthly',
}

const SERVICE_LABELS: Record<string, string> = {
  regular: 'Regular Clean',
  deep_clean: 'Deep Clean',
  end_of_tenancy: 'End of Tenancy',
  oven_clean: 'Oven Clean',
}

export interface JobAlertCard {
  request_id: string
  zone: string | null
  service_type: string
  bedrooms: number | null
  bathrooms: number | null
  hours_per_session: number | null
  hourly_rate: number | null
  frequency: string | null
  preferred_days: string[] | null
  time_of_day: string | null
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
          <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">
            You're getting this because job alerts are switched on in your dashboard.
            <br />
            <a href="${appUrl}/cleaner/dashboard" style="color:#94a3b8;">Manage notification preferences →</a>
          </p>
          <p style="margin:12px 0 0;font-size:12px;color:#94a3b8;">© 2026 Vouchee Ltd · <a href="${appUrl}" style="color:#94a3b8;">vouchee.co.uk</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

// Renders a single job card row as an HTML table cell. Mobile-friendly
// (no flexbox), inlines all styles for max email-client compatibility,
// includes a CTA button that deep-links straight into the apply modal.
function buildJobCard(job: JobAlertCard, appUrl: string): string {
  const zone = job.zone ? (ZONE_LABELS[job.zone] ?? job.zone) : 'Horsham'
  const serviceLabel = SERVICE_LABELS[job.service_type] ?? job.service_type
  const applyUrl = `${appUrl}/jobs?apply=${job.request_id}`

  // Build the chip row — bedrooms · hours · frequency · days · time
  const chips: string[] = []
  if (job.bedrooms && job.bedrooms > 0) chips.push(`${job.bedrooms} bed`)
  if (job.bathrooms && job.bathrooms > 0) chips.push(`${job.bathrooms} bath`)
  if (job.hours_per_session) chips.push(`${job.hours_per_session} hrs`)
  if (job.frequency) chips.push(FREQUENCY_LABELS[job.frequency] ?? job.frequency)
  if (job.preferred_days && job.preferred_days.length > 0) {
    chips.push(job.preferred_days.map(d => d.slice(0, 3)).join(' · '))
  }
  if (job.time_of_day) chips.push(job.time_of_day)

  const chipsHtml = chips.map(c =>
    `<span style="display:inline-block;background:#f1f5f9;color:#475569;border-radius:100px;padding:3px 10px;font-size:12px;font-weight:600;margin:2px 4px 2px 0;">${htmlEscape(c)}</span>`
  ).join('')

  // Estimated total per clean — only shown if we have both rate and hours
  const estPerClean = job.hourly_rate && job.hours_per_session
    ? `~£${(job.hourly_rate * job.hours_per_session).toFixed(2)}`
    : null

  const rateBlock = job.hourly_rate ? `
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#fefce8;border:1px solid #fef08a;border-radius:10px;margin:12px 0;">
      <tr>
        <td style="padding:10px 14px;">
          <div style="font-size:10px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:0.07em;">Offered rate</div>
          <div style="font-size:20px;font-weight:800;color:#78350f;">£${job.hourly_rate.toFixed(2)}<span style="font-size:12px;font-weight:500;">/hr</span></div>
        </td>
        ${estPerClean ? `
        <td style="padding:10px 14px;text-align:right;">
          <div style="font-size:10px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:0.07em;">Est. per clean</div>
          <div style="font-size:16px;font-weight:700;color:#92400e;">${estPerClean}</div>
        </td>
        ` : ''}
      </tr>
    </table>
  ` : ''

  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1.5px solid #e2e8f0;border-radius:14px;margin-bottom:14px;">
      <tr>
        <td style="padding:18px 20px 16px;">
          <div style="font-size:16px;font-weight:800;color:#0f172a;margin-bottom:2px;">📍 ${htmlEscape(zone)}</div>
          <div style="font-size:13px;color:#64748b;margin-bottom:12px;">${htmlEscape(serviceLabel)}</div>
          <div style="margin-bottom:6px;">${chipsHtml}</div>
          ${rateBlock}
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;">
            <tr>
              <td align="center">
                <a href="${applyUrl}" style="display:inline-block;background:${BRAND_BLUE};color:#ffffff;font-size:14px;font-weight:700;padding:11px 28px;border-radius:10px;text-decoration:none;box-shadow:0 1px 2px rgba(37,99,235,0.15);">Apply now →</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `
}

// ═════════════════════════════════════════════════════════════════════════
// Email to the CLEANER: "New jobs in your area"
// ═════════════════════════════════════════════════════════════════════════

export function jobAlertHtml(opts: {
  firstName: string
  jobs: JobAlertCard[]
  appUrl: string
}): string {
  const { firstName, jobs, appUrl } = opts

  const intro = jobs.length === 1
    ? `We've had a new cleaner request come in that I think you might like.`
    : `We've had ${jobs.length} new cleaner requests come in that I think you might like.`

  const cardsHtml = jobs.map(j => buildJobCard(j, appUrl)).join('')

  const inner = `
    <p style="margin:0 0 6px;font-size:22px;font-weight:800;color:#0f172a;">Hey ${htmlEscape(firstName)},</p>
    <p style="margin:0 0 24px;font-size:14px;color:#475569;line-height:1.7;">${intro}</p>

    ${cardsHtml}

    <p style="margin:24px 0 0;font-size:13px;color:#64748b;line-height:1.6;text-align:center;">
      Apply now to start chatting with the customer and secure the job!
    </p>
  `

  const subject = jobs.length === 1
    ? `New job in your area`
    : `${jobs.length} new jobs in your area`

  return emailShell(appUrl, inner, subject)
}