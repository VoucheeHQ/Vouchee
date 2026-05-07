// ─────────────────────────────────────────────────────────────────────────
// Email template for the cleaner job alerts.
//
// SINGLE SOURCE OF TRUTH for: jobAlertHtml — sent to approved cleaners
// in real-time when a new clean_request is published in their zones.
//
// Two flavours, both rendered through the same function:
//   - Regular jobs (service_type !== 'cover') — neutral palette, blue CTA
//   - Cover cleans (service_type === 'cover') — gradient header, purple/pink
//     border, cover_date + time-window in place of frequency/days/time-of-day,
//     plus a "pays direct" reassurance line.
//
// Style mirrors application-received.ts and cleaner-decision.ts so the
// platform's emails feel like a coherent family. Brand colours imported
// from application-received.ts to enforce consistency.
//
// One email per cleaner per request; the route handles the dedupe table.
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
  cover: 'Cover Clean',
  deep_clean: 'Deep Clean',
  end_of_tenancy: 'End of Tenancy',
  oven_clean: 'Oven Clean',
}

// Format cover_date for display: "Tuesday 13 May" — matches the /jobs page
// formatter so customer + cleaner experiences feel consistent.
function formatCoverDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })
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
  // Cover-clean fields (only populated when service_type === 'cover')
  cover_date: string | null
  time_window_start: string | null
  time_window_end: string | null
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
//
// Cover-clean cards get a gradient header strip + purple/pink border + a
// pay-direct reassurance line under the rate, so cleaners can spot them
// instantly in their inbox.
function buildJobCard(job: JobAlertCard, appUrl: string): string {
  const isCover = job.service_type === 'cover'
  const zone = job.zone ? (ZONE_LABELS[job.zone] ?? job.zone) : 'Horsham'
  const serviceLabel = SERVICE_LABELS[job.service_type] ?? job.service_type
  const applyUrl = `${appUrl}/jobs?apply=${job.request_id}`

  // Build the chip row — for cover, we show cover_date + time-window in
  // place of frequency/preferred_days/time_of_day (which are placeholder
  // values for one-off requests).
  const chips: string[] = []
  if (job.bedrooms && job.bedrooms > 0) chips.push(`${job.bedrooms} bed`)
  if (job.bathrooms && job.bathrooms > 0) chips.push(`${job.bathrooms} bath`)
  if (job.hours_per_session) chips.push(`${job.hours_per_session} hrs`)

  if (isCover) {
    if (job.cover_date) chips.push(`📅 ${formatCoverDate(job.cover_date)}`)
    if (job.time_window_start && job.time_window_end) {
      chips.push(`${job.time_window_start}–${job.time_window_end}`)
    }
  } else {
    if (job.frequency) chips.push(FREQUENCY_LABELS[job.frequency] ?? job.frequency)
    if (job.preferred_days && job.preferred_days.length > 0) {
      chips.push(job.preferred_days.map(d => d.slice(0, 3)).join(' · '))
    }
    if (job.time_of_day) chips.push(job.time_of_day)
  }

  // Cover chips get the legendary purple/pink palette to match the rest of
  // the cover-clean visual language (customer panic button, /jobs border).
  const chipBg = isCover ? '#fdf4ff' : '#f1f5f9'
  const chipFg = isCover ? '#86198f' : '#475569'
  const chipBorder = isCover ? '1px solid #f5d0fe;' : ''

  const chipsHtml = chips.map(c =>
    `<span style="display:inline-block;background:${chipBg};color:${chipFg};border-radius:100px;padding:3px 10px;font-size:12px;font-weight:600;margin:2px 4px 2px 0;${chipBorder}">${htmlEscape(c)}</span>`
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

  // Cover-only: pay-direct reassurance line under the rate.
  const payDirectLine = isCover ? `
    <p style="margin:0 0 12px;font-size:12px;color:#86198f;line-height:1.6;text-align:center;background:#fdf4ff;border:1px solid #f5d0fe;border-radius:10px;padding:8px 12px;">
      💸 Pays direct — no Direct Debit setup needed.
    </p>
  ` : ''

  // Cover-only: gradient header strip.
  // background-color is the Outlook-desktop fallback; gradient renders in
  // modern email clients (Gmail, Apple Mail, Outlook 365, iOS Mail).
  const coverHeader = isCover ? `
    <tr>
      <td style="background-color:#c026d3;background:linear-gradient(135deg,#a855f7 0%,#ec4899 100%);padding:10px 20px;border-radius:14px 14px 0 0;">
        <div style="font-size:12px;font-weight:800;color:#ffffff;letter-spacing:0.08em;text-transform:uppercase;">🆘 Cover clean — one-off urgent job</div>
      </td>
    </tr>
  ` : ''

  // Card border + CTA differ for cover vs regular.
  const cardBorder = isCover ? '2px solid #d8b4fe' : '1.5px solid #e2e8f0'
  const cardBorderRadius = isCover ? '14px' : '14px'
  const ctaBackgroundColor = isCover ? '#c026d3' : BRAND_BLUE
  const ctaBackground = isCover
    ? 'linear-gradient(135deg,#a855f7 0%,#ec4899 100%)'
    : BRAND_BLUE
  const ctaShadow = isCover
    ? 'box-shadow:0 2px 8px rgba(168,85,247,0.30);'
    : 'box-shadow:0 1px 2px rgba(37,99,235,0.15);'

  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border:${cardBorder};border-radius:${cardBorderRadius};margin-bottom:14px;overflow:hidden;">
      ${coverHeader}
      <tr>
        <td style="padding:18px 20px 16px;">
          <div style="font-size:16px;font-weight:800;color:#0f172a;margin-bottom:2px;">📍 ${htmlEscape(zone)}</div>
          <div style="font-size:13px;color:#64748b;margin-bottom:12px;">${htmlEscape(serviceLabel)}</div>
          <div style="margin-bottom:6px;">${chipsHtml}</div>
          ${rateBlock}
          ${payDirectLine}
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;">
            <tr>
              <td align="center">
                <a href="${applyUrl}" style="display:inline-block;background-color:${ctaBackgroundColor};background:${ctaBackground};color:#ffffff;font-size:14px;font-weight:700;padding:11px 28px;border-radius:10px;text-decoration:none;${ctaShadow}">Apply now →</a>
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

  // Cover-only emails get an urgency-flavoured intro. Mixed batches and
  // regular jobs use the neutral intro. (In practice the route fires one
  // job per email today — this branch handles future batching too.)
  const allCover = jobs.length > 0 && jobs.every(j => j.service_type === 'cover')

  const intro = allCover && jobs.length === 1
    ? `Someone in your area needs a cover clean — a one-off urgent job. You'll be paid direct (no Direct Debit setup needed).`
    : allCover
      ? `${jobs.length} cover cleans need filling in your area — one-off urgent jobs, paid direct.`
      : jobs.length === 1
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

  const subject = allCover && jobs.length === 1
    ? `Cover clean needed in your area`
    : jobs.length === 1
      ? `New job in your area`
      : `${jobs.length} new jobs in your area`

  return emailShell(appUrl, inner, subject)
}