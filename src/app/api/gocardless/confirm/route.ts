import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY!)

const TASK_LABELS: Record<string, string> = {
  general: 'General cleaning', general_cleaning: 'General cleaning',
  hoovering: 'Hoovering', mopping: 'Mopping',
  bathroom: 'Bathroom clean', kitchen: 'Kitchen clean',
  windows_interior: 'Interior windows', fridge: 'Fridge clean',
  blinds: 'Blinds', mold: 'Mould removal', ironing: 'Ironing',
  laundry: 'Laundry', changing_beds: 'Changing beds',
  garage: 'Garage / utility', bins: 'Emptying all bins',
  skirting: 'Skirting boards & doorframes', conservatory: 'Conservatory clean',
  bathroom_deep: 'Bathroom deep clean', kitchen_deep: 'Kitchen deep clean',
}

const STANDARD_TASK_IDS = new Set(['general', 'general_cleaning', 'hoovering', 'mopping', 'bathroom', 'kitchen', 'bins'])

const ZONE_LABELS: Record<string, string> = {
  central_south_east: 'Central / South East', north_west: 'North West',
  north_east_roffey: 'North East / Roffey', south_west: 'South West',
  warnham_north: 'Warnham / North', broadbridge_heath: 'Broadbridge Heath',
  mannings_heath: 'Mannings Heath', faygate_kilnwood_vale: 'Faygate / Kilnwood Vale',
  christs_hospital: "Christ's Hospital", southwater: 'Southwater',
}

// Vouchee monthly fees in pence
const MONTHLY_AMOUNT_PENCE: Record<string, number> = {
  weekly:      4333, // £43.33
  fortnightly: 3248, // £32.48
  monthly:     2499, // £24.99
}

// Per-clean fees in pence
const PER_CLEAN_PENCE: Record<string, number> = {
  weekly:      999,  // £9.99
  fortnightly: 1499, // £14.99
  monthly:     2499, // £24.99
}

function calcProRata(startDate: string, frequency: string): number {
  if (frequency === 'monthly') return PER_CLEAN_PENCE.monthly

  const intervalDays = frequency === 'weekly' ? 7 : 14
  const perCleanPence = PER_CLEAN_PENCE[frequency] ?? PER_CLEAN_PENCE.fortnightly

  const start = new Date(startDate)
  const year = start.getFullYear()
  const month = start.getMonth()
  const endOfMonth = new Date(year, month + 1, 0)

  let cleans = 0
  let cleanDate = new Date(start)
  while (cleanDate <= endOfMonth) {
    cleans++
    cleanDate.setDate(cleanDate.getDate() + intervalDays)
  }

  return cleans * perCleanPence
}

function getFirstBillingDate(startDate: string): string {
  const start = new Date(startDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let workingDays = 0
  const minDate = new Date(today)
  while (workingDays < 3) {
    minDate.setDate(minDate.getDate() + 1)
    const day = minDate.getDay()
    if (day !== 0 && day !== 6) workingDays++
  }

  const billingDate = start > minDate ? start : minDate
  return billingDate.toISOString().split('T')[0]
}

function formatAddress(a1: string, a2: string | null, city: string, postcode: string): string {
  return [a1, a2, city, formatPostcode(postcode)].filter(Boolean).join(', ')
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function formatPostcode(raw: string): string {
  const clean = raw.toUpperCase().replace(/\s+/g, '')
  if (clean.length > 4) return clean.slice(0, -3) + ' ' + clean.slice(-3)
  return clean
}

function getFreqLabel(frequency: string | null | undefined): string {
  if (!frequency) return 'Not specified'
  const map: Record<string, string> = { weekly: 'Weekly', fortnightly: 'Fortnightly', monthly: 'Monthly' }
  return map[frequency] ?? frequency
}

function buildCleanerEmail({
  cleanerFirstName, customerFirstName, customerFullName, customerEmail, customerPhone,
  address, startDate, bedrooms, bathrooms, frequency, hours_per_session,
  tasks, zone, customerNotes,
}: {
  cleanerFirstName: string
  customerFirstName: string
  customerFullName: string
  customerEmail: string
  customerPhone: string | null
  address: string
  startDate: string
  bedrooms: number
  bathrooms: number
  frequency: string
  hours_per_session: number
  tasks: string[]
  zone: string
  customerNotes: string | null
}): string {
  const freqLabel = getFreqLabel(frequency)
  const zoneLabel = ZONE_LABELS[zone] ?? zone
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.vouchee.co.uk'

  const standardTasks = (tasks ?? []).filter(t => STANDARD_TASK_IDS.has(t))
  const specialTasks = (tasks ?? []).filter(t => !STANDARD_TASK_IDS.has(t))

  const greenChip = (t: string) =>
    `<span style="display:inline-block;background:#f0fdf4;border:1px solid #bbf7d0;color:#15803d;font-size:12px;font-weight:600;padding:4px 14px;border-radius:100px;margin:3px 3px 3px 0;">${TASK_LABELS[t] ?? t}</span>`
  const yellowChip = (t: string) =>
    `<span style="display:inline-block;background:#fefce8;border:1px solid #fde68a;color:#854d0e;font-size:12px;font-weight:600;padding:4px 14px;border-radius:100px;margin:3px 3px 3px 0;">${TASK_LABELS[t] ?? t}</span>`

  const taskSection = `
    <div style="margin-bottom:20px;">
      <div style="font-size:13px;font-weight:800;color:#0f172a;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:10px;">Tasks requested</div>
      ${standardTasks.length > 0 ? `<div style="margin-bottom:6px;">${standardTasks.map(greenChip).join('')}</div>` : ''}
      ${specialTasks.length > 0 ? `
        <div style="font-size:13px;font-weight:800;color:#92400e;text-transform:uppercase;letter-spacing:0.06em;margin:10px 0 6px;">Special requests</div>
        <div>${specialTasks.map(yellowChip).join('')}</div>
      ` : ''}
    </div>`

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:40px 16px;">
  <tr><td align="center">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;">

    <tr><td style="background:#ffffff;padding:36px 40px 32px;text-align:center;border-radius:16px 16px 0 0;">
      <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;</div>
      <div style="margin-bottom:20px;"><img src="https://www.vouchee.co.uk/full-logo-black.png" width="260" height="60" alt="Vouchee" style="display:block;margin:0 auto 16px;max-width:100%;" /></div>
      <div style="font-size:32px;font-weight:800;color:#0f172a;letter-spacing:-0.5px;line-height:1.15;">You've been chosen! 🎉</div>
    </td></tr>

    <tr><td style="background:white;padding:36px 40px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 16px 16px;">

      <div style="background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:12px;padding:22px 28px;margin-bottom:24px;text-align:center;">
        <div style="font-size:12px;font-weight:800;color:#15803d;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">📅 Start date</div>
        <div style="font-size:24px;font-weight:800;color:#0f172a;">${formatDate(startDate)}</div>
      </div>

      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:22px 28px;margin-bottom:20px;">
        <div style="font-size:13px;font-weight:800;color:#0f172a;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:16px;text-align:center;">Job summary</div>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#374151;">Bedrooms</td>
            <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;text-align:right;font-size:13px;font-weight:700;color:#0f172a;">${bedrooms}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#374151;">Bathrooms</td>
            <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;text-align:right;font-size:13px;font-weight:700;color:#0f172a;">${bathrooms}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#374151;">Frequency</td>
            <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;text-align:right;font-size:13px;font-weight:700;color:#0f172a;">${freqLabel}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;font-size:13px;color:#374151;">Hours per clean</td>
            <td style="padding:8px 0;text-align:right;font-size:13px;font-weight:700;color:#0f172a;">${hours_per_session} hrs</td>
          </tr>
        </table>
      </div>

      ${taskSection}

      ${customerNotes ? `
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:18px 24px;margin-bottom:20px;">
        <div style="font-size:13px;font-weight:800;color:#0f172a;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px;text-align:center;">Customer notes</div>
        <div style="font-size:14px;color:#475569;line-height:1.6;font-style:italic;">"${customerNotes}"</div>
      </div>` : ''}

      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:22px 28px;margin-bottom:24px;">
        <div style="font-size:13px;font-weight:800;color:#0f172a;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:16px;text-align:center;">Customer details</div>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#374151;width:38%;">Name</td>
            <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;text-align:right;font-size:13px;font-weight:700;color:#0f172a;">${customerFullName}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#374151;">Email</td>
            <td style="padding:8px 0;border-bottom:1px solid #dbeafe;text-align:right;">
              <a href="mailto:${customerEmail}" style="font-size:13px;font-weight:700;color:#0f172a;text-decoration:none;">${customerEmail}</a>
            </td>
          </tr>
          ${customerPhone ? `
          <tr>
            <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#374151;">Phone</td>
            <td style="padding:8px 0;border-bottom:1px solid #dbeafe;text-align:right;">
              <a href="tel:${customerPhone}" style="font-size:13px;font-weight:700;color:#0f172a;text-decoration:none;">${customerPhone}</a>
            </td>
          </tr>` : ''}
          <tr>
            <td style="padding:8px 0;vertical-align:top;font-size:13px;color:#374151;">Address</td>
            <td style="padding:8px 0;text-align:right;">
              <span style="font-size:13px;font-weight:700;color:#1e40af;">${address}</span>
            </td>
          </tr>
        </table>
      </div>

      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:24px 28px;margin-bottom:16px;text-align:center;">
        <div style="font-size:15px;font-weight:700;color:#15803d;margin-bottom:8px;">🧴 Need to restock before your clean?</div>
        <div style="font-size:13px;color:#166534;line-height:1.6;margin-bottom:18px;">We've put together a page with everything you might need in one place.</div>
        <a href="${appUrl}/cleaning-supplies" style="display:inline-block;background:#16a34a;color:white;font-size:13px;font-weight:700;padding:11px 28px;border-radius:8px;text-decoration:none;">Browse cleaning supplies →</a>
      </div>

      <div style="background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:12px;padding:24px 28px;margin-bottom:28px;text-align:center;">
        <div style="font-size:15px;font-weight:700;color:#15803d;margin-bottom:8px;">👋 Reach out before the first clean</div>
        <div style="font-size:13px;color:#166534;line-height:1.6;margin-bottom:18px;">We recommend contacting ${customerFirstName} before the first clean to reassure them you'll be there.<br>Use the chat on your dashboard or their contact details above!</div>
        <a href="${appUrl}/cleaner/dashboard" style="display:inline-block;background:#16a34a;color:white;font-size:13px;font-weight:700;padding:11px 28px;border-radius:8px;text-decoration:none;">View your dashboard →</a>
      </div>

      <p style="font-size:12px;color:#94a3b8;text-align:center;margin:0;line-height:1.6;">
        Questions? Reply to this email or contact us at <a href="mailto:cleaners@vouchee.co.uk" style="color:#94a3b8;">cleaners@vouchee.co.uk</a>
      </p>

    </td></tr>

    <tr><td style="padding:24px 0;text-align:center;">
      <p style="margin:0;font-size:12px;color:#94a3b8;">© 2026 Vouchee · <a href="https://www.vouchee.co.uk" style="color:#94a3b8;text-decoration:none;">vouchee.co.uk</a></p>
    </td></tr>

  </table>
  </td></tr>
</table>
</body>
</html>`
}


function buildCustomerConfirmEmail({
  customerFirstName,
  cleanerFullName,
  cleanerEmail,
  cleanerPhone,
  cleanerCardUrl,
  startDate,
  bedrooms,
  bathrooms,
  frequency,
  hours_per_session,
  tasks,
  zone,
}: {
  customerFirstName: string
  cleanerFullName: string
  cleanerEmail: string
  cleanerPhone: string | null
  cleanerCardUrl: string
  startDate: string
  bedrooms: number
  bathrooms: number
  frequency: string
  hours_per_session: number
  tasks: string[]
  zone: string
}): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.vouchee.co.uk'
  const freqLabel = getFreqLabel(frequency)
  const cleanerFirstName = cleanerFullName.split(' ')[0]

  const standardTasks = (tasks ?? []).filter(t => STANDARD_TASK_IDS.has(t))
  const specialTasks  = (tasks ?? []).filter(t => !STANDARD_TASK_IDS.has(t))

  const greenChip = (t: string) =>
    `<span style="display:inline-block;background:#f0fdf4;border:1px solid #bbf7d0;color:#15803d;font-size:12px;font-weight:600;padding:4px 14px;border-radius:100px;margin:3px 3px 3px 0;">${TASK_LABELS[t] ?? t}</span>`
  const yellowChip = (t: string) =>
    `<span style="display:inline-block;background:#fefce8;border:1px solid #fde68a;color:#854d0e;font-size:12px;font-weight:600;padding:4px 14px;border-radius:100px;margin:3px 3px 3px 0;">${TASK_LABELS[t] ?? t}</span>`

  const taskSection = `
    <div style="margin-bottom:20px;">
      <div style="font-size:13px;font-weight:800;color:#0f172a;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:10px;">Tasks</div>
      ${standardTasks.length > 0 ? `<div style="margin-bottom:6px;">${standardTasks.map(greenChip).join('')}</div>` : ''}
      ${specialTasks.length > 0 ? `
        <div style="font-size:13px;font-weight:800;color:#92400e;text-transform:uppercase;letter-spacing:0.06em;margin:10px 0 6px;">Special requests</div>
        <div>${specialTasks.map(yellowChip).join('')}</div>
      ` : ''}
    </div>`

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:40px 16px;">
  <tr><td align="center">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;">

    <!-- Header -->
    <tr><td style="background:#ffffff;padding:36px 40px 32px;text-align:center;border-radius:16px 16px 0 0;">
      <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">Your cleaner is confirmed — here are all the details you need.</div>
      <img src="https://www.vouchee.co.uk/full-logo-black.png" width="260" height="60" alt="Vouchee" style="display:block;margin:0 auto 36px;max-width:100%;" />
      <div style="font-size:32px;font-weight:800;color:#0f172a;letter-spacing:-0.5px;line-height:1.15;">You're all set! 🎉</div>
    </td></tr>

    <!-- Body -->
    <tr><td style="background:white;padding:36px 40px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 16px 16px;">

      <!-- Start date -->
      <div style="background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:12px;padding:22px 28px;margin-bottom:24px;text-align:center;">
        <div style="font-size:12px;font-weight:800;color:#15803d;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">📅 First clean</div>
        <div style="font-size:24px;font-weight:800;color:#0f172a;">${formatDate(startDate)}</div>
      </div>

      <!-- Cleaner details -->
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:22px 28px;margin-bottom:16px;">
        <div style="font-size:13px;font-weight:800;color:#0f172a;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:16px;text-align:center;">Your cleaner</div>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#374151;width:38%;">Name</td>
            <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;text-align:right;font-size:13px;font-weight:700;color:#0f172a;">${cleanerFullName}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#374151;">Email</td>
            <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;text-align:right;">
              <a href="mailto:${cleanerEmail}" style="font-size:13px;font-weight:700;color:#1e40af;text-decoration:none;">${cleanerEmail}</a>
            </td>
          </tr>
          ${cleanerPhone ? `
          <tr>
            <td style="padding:8px 0;font-size:13px;color:#374151;">Phone</td>
            <td style="padding:8px 0;text-align:right;">
              <a href="tel:${cleanerPhone}" style="font-size:13px;font-weight:700;color:#1e40af;text-decoration:none;">${cleanerPhone}</a>
            </td>
          </tr>` : ''}
        </table>
      </div>

      <!-- Cleaner card CTA -->
      <div style="text-align:center;margin-bottom:24px;">
        <a href="${cleanerCardUrl}" style="display:inline-block;background:#f8fafc;border:1.5px solid #e2e8f0;color:#0f172a;font-size:13px;font-weight:700;padding:10px 24px;border-radius:8px;text-decoration:none;">View ${cleanerFirstName}'s profile →</a>
      </div>

      <!-- Job summary -->
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:22px 28px;margin-bottom:20px;">
        <div style="font-size:13px;font-weight:800;color:#0f172a;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:16px;text-align:center;">Clean summary</div>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#374151;">Bedrooms</td>
            <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;text-align:right;font-size:13px;font-weight:700;color:#0f172a;">${bedrooms}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#374151;">Bathrooms</td>
            <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;text-align:right;font-size:13px;font-weight:700;color:#0f172a;">${bathrooms}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#374151;">Frequency</td>
            <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;text-align:right;font-size:13px;font-weight:700;color:#0f172a;">${freqLabel}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;font-size:13px;color:#374151;">Hours per clean</td>
            <td style="padding:8px 0;text-align:right;font-size:13px;font-weight:700;color:#0f172a;">${hours_per_session} hrs</td>
          </tr>
        </table>
      </div>

      <!-- Tasks -->
      ${taskSection}

      <!-- Cleaning supplies -->
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:24px 28px;margin-bottom:16px;text-align:center;">
        <div style="font-size:15px;font-weight:700;color:#15803d;margin-bottom:8px;">🧴 Stock up before your first clean</div>
        <div style="font-size:13px;color:#166534;line-height:1.6;margin-bottom:18px;">Make sure you've got everything your cleaner needs. We've put together a list of recommended products.</div>
        <a href="${appUrl}/cleaning-supplies" style="display:inline-block;background:#16a34a;color:white;font-size:13px;font-weight:700;padding:11px 28px;border-radius:8px;text-decoration:none;">Browse cleaning supplies →</a>
      </div>

      <!-- Dashboard CTA -->
      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:24px 28px;margin-bottom:28px;text-align:center;">
        <div style="font-size:15px;font-weight:700;color:#1e40af;margin-bottom:8px;">💬 Chat with ${cleanerFirstName}</div>
        <div style="font-size:13px;color:#3b82f6;line-height:1.6;margin-bottom:18px;">You can message ${cleanerFirstName} directly through your dashboard to confirm any details before the first clean.</div>
        <a href="${appUrl}/customer/dashboard" style="display:inline-block;background:#2563eb;color:white;font-size:13px;font-weight:700;padding:11px 28px;border-radius:8px;text-decoration:none;">Open your dashboard →</a>
      </div>

      <!-- What happens next -->
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px 24px;margin-bottom:20px;">
        <div style="font-size:13px;font-weight:800;color:#0f172a;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:14px;text-align:center;">What happens next</div>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="padding:6px 0;font-size:16px;width:28px;">💬</td><td style="padding:6px 0;font-size:13px;color:#475569;line-height:1.55;">${cleanerFirstName} will reach out to introduce themselves before your first clean</td></tr>
          <tr><td style="padding:6px 0;font-size:16px;">🔑</td><td style="padding:6px 0;font-size:13px;color:#475569;line-height:1.55;">Discuss access arrangements and any special instructions</td></tr>
          <tr><td style="padding:6px 0;font-size:16px;">🧹</td><td style="padding:6px 0;font-size:13px;color:#475569;line-height:1.55;">Your first clean is on ${formatDate(startDate)}</td></tr>
          <tr><td style="padding:6px 0;font-size:16px;">💳</td><td style="padding:6px 0;font-size:13px;color:#475569;line-height:1.55;">Your Direct Debit will be collected monthly going forward</td></tr>
        </table>
      </div>

      <!-- DD clarification notice -->
      <div style="background:#fefce8;border:1px solid #fde68a;border-radius:10px;padding:14px 18px;margin-bottom:28px;">
        <p style="margin:0;font-size:12px;color:#854d0e;line-height:1.6;text-align:center;">
          <strong>Note:</strong> Your Direct Debit is for the <strong>Vouchee service fee only</strong> — it does not cover your cleaner's payment. You and ${cleanerFirstName} will agree payment terms directly.
        </p>
      </div>

      <p style="font-size:12px;color:#94a3b8;text-align:center;margin:0;line-height:1.6;">
        Questions? Reply to this email or contact us at <a href="mailto:hello@vouchee.co.uk" style="color:#94a3b8;">hello@vouchee.co.uk</a>
      </p>

    </td></tr>

    <!-- Footer -->
    <tr><td style="padding:24px 0;text-align:center;">
      <p style="margin:0;font-size:12px;color:#94a3b8;">© 2026 Vouchee · <a href="https://www.vouchee.co.uk" style="color:#94a3b8;text-decoration:none;">vouchee.co.uk</a></p>
    </td></tr>

  </table>
  </td></tr>
</table>
</body>
</html>`
}

function buildRejectionEmail(customerFirstName: string, zone: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.vouchee.co.uk'
  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:40px 16px;">
  <tr><td align="center">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;">
    <tr><td style="background:#ffffff;padding:28px 40px;text-align:center;border-radius:16px 16px 0 0;">
      <img src="https://www.vouchee.co.uk/full-logo-black.png" width="260" height="60" alt="Vouchee" style="display:block;margin:0 auto 16px;max-width:100%;" />
    </td></tr>
    <tr><td style="background:white;padding:36px 40px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 16px 16px;">
      <div style="font-size:20px;font-weight:800;color:#0f172a;margin-bottom:12px;">Application update</div>
      <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 16px;">
        Thank you for your application for the <strong>${ZONE_LABELS[zone] ?? zone}</strong> listing.
        Unfortunately, <strong>${customerFirstName}</strong> has chosen another cleaner for this role.
      </p>
      <p style="font-size:14px;color:#64748b;line-height:1.6;margin:0 0 24px;">
        Don't be discouraged — new listings appear regularly. Keep an eye on the jobs page for new opportunities.
      </p>
      <a href="${appUrl}/jobs" style="display:block;background:#2563eb;color:white;text-align:center;padding:14px;border-radius:10px;font-size:14px;font-weight:700;text-decoration:none;">View available jobs →</a>
    </td></tr>
    <tr><td style="padding:20px 0;text-align:center;">
      <p style="margin:0;font-size:12px;color:#94a3b8;">© 2026 Vouchee · vouchee.co.uk</p>
    </td></tr>
  </table>
  </td></tr>
</table>
</body>
</html>`
}

export async function GET(request: NextRequest) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { searchParams } = new URL(request.url)
  const requestId      = searchParams.get('requestId')
  const applicationId  = searchParams.get('applicationId')
  const conversationId = searchParams.get('conversationId')
  const startDate      = searchParams.get('startDate') ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const billingRequestId = searchParams.get('billingRequestId') ?? searchParams.get('billing_request')
  const appUrl         = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.vouchee.co.uk'

  const gcEnvironment = process.env.GOCARDLESS_ENVIRONMENT ?? 'sandbox'
  const gcBaseUrl     = gcEnvironment === 'live'
    ? 'https://api.gocardless.com'
    : 'https://api-sandbox.gocardless.com'
  const gcToken = process.env.GOCARDLESS_ACCESS_TOKEN!

  if (!requestId || !applicationId || !conversationId) {
    return NextResponse.redirect(`${appUrl}/customer/dashboard?gc_error=1`)
  }

  try {
    console.log('GC confirm: requestId', requestId, 'applicationId', applicationId, 'startDate', startDate, 'billingRequestId', billingRequestId)

    // ── 1. Verify mandate completed with GoCardless ──────────────────────────
    let mandateId: string | null = null

    if (billingRequestId) {
      const brRes = await fetch(`${gcBaseUrl}/billing_requests/${billingRequestId}`, {
        headers: {
          'Authorization': `Bearer ${gcToken}`,
          'GoCardless-Version': '2015-07-06',
          'Accept': 'application/json',
        },
      })

      if (!brRes.ok) {
        console.error('GoCardless billing request lookup failed:', await brRes.text())
        return NextResponse.redirect(`${appUrl}/customer/dashboard?gc_error=1`)
      }

      const brData = await brRes.json()
      const brStatus = brData.billing_requests?.status
      mandateId = brData.billing_requests?.links?.mandate_request_mandate
        ?? brData.billing_requests?.links?.mandate
        ?? null

      console.log('Billing request status:', brStatus, 'mandateId:', mandateId)
      console.log('Full billing request links:', JSON.stringify(brData.billing_requests?.links))

      if (brStatus !== 'fulfilled') {
        console.log('Billing request not fulfilled — redirecting to dashboard')
        return NextResponse.redirect(`${appUrl}/customer/dashboard?gc_abandoned=1&conversationId=${conversationId}`)
      }
    } else {
      console.warn('No billing_request param — proceeding without mandate verification (dev/test flow)')
    }

    // ── 2. Look up DB records ────────────────────────────────────────────────
    const { data: application, error: appError } = await supabaseAdmin
      .from('applications').select('id, cleaner_id, request_id, status').eq('id', applicationId).single()
    if (appError || !application) {
      console.error('Application lookup failed:', appError)
      return NextResponse.redirect(`${appUrl}/customer/dashboard?gc_error=1`)
    }

    const { data: cleanRequest, error: reqError } = await supabaseAdmin
      .from('clean_requests')
      .select('id, customer_id, bedrooms, bathrooms, frequency, hours_per_session, tasks, zone, status, customer_notes')
      .eq('id', requestId).single()
    if (reqError || !cleanRequest) {
      console.error('Clean request lookup failed:', reqError)
      return NextResponse.redirect(`${appUrl}/customer/dashboard?gc_error=1`)
    }

    if (cleanRequest.status === 'fulfilled') {
      console.log('Already fulfilled, redirecting')
      return NextResponse.redirect(`${appUrl}/customer/dashboard?gc_success=1&chat=${conversationId}`)
    }

    const { data: customerRecord } = await supabaseAdmin
      .from('customers').select('id, profile_id, address_line1, address_line2, city, postcode')
      .eq('id', cleanRequest.customer_id).single()
    if (!customerRecord) {
      console.error('Customer record not found')
      return NextResponse.redirect(`${appUrl}/customer/dashboard?gc_error=1`)
    }

    const { data: cleanerRecord } = await supabaseAdmin
      .from('cleaners').select('profile_id').eq('id', application.cleaner_id).single()
    const { data: cleanerProfile } = cleanerRecord
      ? await supabaseAdmin.from('profiles').select('full_name, email, phone').eq('id', cleanerRecord.profile_id).single()
      : { data: null }

    const { data: customerProfile } = await supabaseAdmin
      .from('profiles').select('full_name, email, phone').eq('id', customerRecord.profile_id).single()

    const customerFirstName  = customerProfile?.full_name?.split(' ')[0] ?? 'Your customer'
    const customerFullName   = customerProfile?.full_name ?? 'Your customer'
    const customerEmail      = customerProfile?.email ?? ''
    const customerPhone      = customerProfile?.phone ?? null
    const cleanerFullName    = cleanerProfile?.full_name ?? 'Cleaner'
    const cleanerEmail       = cleanerProfile?.email ?? null
    const cleanerPhone       = cleanerProfile?.phone ?? null
    const cleanerFirstName   = cleanerFullName.split(' ')[0]

    const cleanerCardUrl = `${appUrl}/cleaners/${application.cleaner_id}`

    const address = formatAddress(
      customerRecord.address_line1,
      customerRecord.address_line2,
      customerRecord.city,
      customerRecord.postcode
    )

    const formattedStartDate = formatDate(startDate)

    // ── 3. Create GoCardless subscription ────────────────────────────────────
    if (mandateId) {
      const frequency = cleanRequest.frequency ?? 'fortnightly'
      const monthlyAmountPence = MONTHLY_AMOUNT_PENCE[frequency] ?? MONTHLY_AMOUNT_PENCE.fortnightly

      const mandateRes = await fetch(`${gcBaseUrl}/mandates/${mandateId}`, {
        headers: {
          'Authorization': `Bearer ${gcToken}`,
          'GoCardless-Version': '2015-07-06',
          'Accept': 'application/json',
        },
      })
      const mandateData = mandateRes.ok ? await mandateRes.json() : null
      const nextPossibleChargeDate = mandateData?.mandates?.next_possible_charge_date ?? getFirstBillingDate(startDate)
      const proRataAmount = calcProRata(startDate, frequency)

      console.log(`Creating subscription: frequency=${frequency}, monthly=${monthlyAmountPence}p, nextPossibleChargeDate=${nextPossibleChargeDate}, proRata=${proRataAmount}p (clean-based)`)

      if (proRataAmount > 0 && proRataAmount < monthlyAmountPence) {
        const proRataRes = await fetch(`${gcBaseUrl}/payments`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${gcToken}`,
            'GoCardless-Version': '2015-07-06',
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Idempotency-Key': `prorata-${requestId}-${applicationId}`,
          },
          body: JSON.stringify({
            payments: {
              amount: proRataAmount,
              currency: 'GBP',
              charge_date: nextPossibleChargeDate,
              description: `Vouchee service fee (pro-rata)`,
              links: { mandate: mandateId },
              metadata: { vouchee_request_id: requestId, type: 'pro_rata' },
            },
          }),
        })
        if (!proRataRes.ok) {
          console.error('Pro-rata payment creation failed:', await proRataRes.text())
        } else {
          console.log('Pro-rata payment created successfully')
        }
      }

      const nextMonthDate = new Date(nextPossibleChargeDate)
      nextMonthDate.setMonth(nextMonthDate.getMonth() + 1)
      nextMonthDate.setDate(1)
      const recurringStartDate = nextMonthDate.toISOString().split('T')[0]

      const subRes = await fetch(`${gcBaseUrl}/subscriptions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${gcToken}`,
          'GoCardless-Version': '2015-07-06',
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Idempotency-Key': `sub-${requestId}-${applicationId}`,
        },
        body: JSON.stringify({
          subscriptions: {
            amount: monthlyAmountPence,
            currency: 'GBP',
            interval_unit: 'monthly',
            interval: 1,
            start_date: recurringStartDate,
            name: `Vouchee service fee — ${frequency}`,
            links: { mandate: mandateId },
            metadata: { vouchee_request_id: requestId, vouchee_application_id: applicationId },
          },
        }),
      })

      if (!subRes.ok) {
        const subErr = await subRes.text()
        console.error('Subscription creation failed:', subErr)
      } else {
        const subData = await subRes.json()
        console.log('Subscription created:', subData.subscriptions?.id)

        await supabaseAdmin
          .from('clean_requests')
          .update({ gocardless_subscription_id: subData.subscriptions?.id } as any)
          .eq('id', requestId)
      }
    }

    // ── 4. Fire all post-confirmation actions ────────────────────────────────
    console.log('Firing all post-confirmation actions. cleanerEmail:', cleanerEmail)

    await Promise.all([
      supabaseAdmin.from('clean_requests').update({
        status: 'fulfilled',
        start_date: startDate,
        assigned_cleaner_id: application.cleaner_id,
        ...(mandateId ? { gocardless_mandate_id: mandateId } as any : {}),
      }).eq('id', requestId),

      // ── Write mandate to customer record for switch flow reuse ─────────────
      // This is the key addition that enables Approach 1 switching. When this
      // customer later needs to switch cleaners, create-flow detects this mandate
      // and confirm-switch reuses it — no re-authorisation needed.
      mandateId
        ? supabaseAdmin.from('customers').update({ gocardless_mandate_id: mandateId } as any).eq('id', customerRecord.id)
        : Promise.resolve(null),

      supabaseAdmin.from('applications').update({ status: 'accepted' }).eq('id', applicationId),

      supabaseAdmin.from('applications').update({ status: 'rejected' })
        .eq('request_id', requestId).neq('id', applicationId).in('status', ['pending', 'accepted']),

      supabaseAdmin.from('messages').insert({
        conversation_id: conversationId,
        sender_id: customerRecord.profile_id,
        sender_role: 'customer',
        content: `🎉 __system__ Direct Debit confirmed — start date ${formattedStartDate}. Your address has been shared with your cleaner.`,
      }),

      supabaseAdmin.from('notifications').insert({
        cleaner_id: application.cleaner_id,
        type: 'job_won',
        title: `🎉 ${customerFirstName} confirmed you for the job`,
        body: `First clean: ${formattedStartDate}. Check your email for the full job details.`,
        link: '/cleaner/dashboard',
      }),

      cleanerEmail
        ? resend.emails.send({
            from: 'Vouchee <hello@vouchee.co.uk>',
            to: cleanerEmail,
            subject: `🎉 You've been chosen — starting ${formattedStartDate}`,
            html: buildCleanerEmail({
              cleanerFirstName, customerFirstName, customerFullName, customerEmail, customerPhone,
              address, startDate,
              bedrooms: cleanRequest.bedrooms, bathrooms: cleanRequest.bathrooms,
              frequency: cleanRequest.frequency ?? '', hours_per_session: cleanRequest.hours_per_session,
              tasks: cleanRequest.tasks ?? [], zone: cleanRequest.zone ?? '',
              customerNotes: cleanRequest.customer_notes ?? null,
            }),
          })
        : (console.error('No cleaner email — skipping'), Promise.resolve(null)),

      customerEmail
        ? resend.emails.send({
            from: 'Vouchee <hello@vouchee.co.uk>',
            to: customerEmail,
            subject: `✅ You're all set — ${cleanerFirstName} starts ${formattedStartDate}`,
            html: buildCustomerConfirmEmail({
              customerFirstName,
              cleanerFullName,
              cleanerEmail: cleanerEmail ?? '',
              cleanerPhone,
              cleanerCardUrl,
              startDate,
              bedrooms: cleanRequest.bedrooms,
              bathrooms: cleanRequest.bathrooms,
              frequency: cleanRequest.frequency ?? '',
              hours_per_session: cleanRequest.hours_per_session,
              tasks: cleanRequest.tasks ?? [],
              zone: cleanRequest.zone ?? '',
            }),
          })
        : Promise.resolve(null),
    ])

    console.log('Core actions complete. Processing rejections...')

    const { data: rejectedApps } = await supabaseAdmin
      .from('applications').select('id, cleaner_id')
      .eq('request_id', requestId).eq('status', 'rejected').neq('id', applicationId)

    if (rejectedApps && rejectedApps.length > 0) {
      await Promise.all(
        rejectedApps.map(async (rejApp: any) => {
          const { data: rejCleanerRecord } = await supabaseAdmin
            .from('cleaners').select('profile_id').eq('id', rejApp.cleaner_id).single()
          const { data: rejCleanerProfile } = rejCleanerRecord
            ? await supabaseAdmin.from('profiles').select('email').eq('id', rejCleanerRecord.profile_id).single()
            : { data: null }
          const { data: conv } = await supabaseAdmin
            .from('conversations').select('id')
            .eq('clean_request_id', requestId).eq('cleaner_id', rejApp.cleaner_id).single()
          const tasks = []

          tasks.push(
            supabaseAdmin.from('notifications').insert({
              cleaner_id: rejApp.cleaner_id,
              type: 'job_lost',
              title: 'Application update',
              body: `${customerFirstName} chose another cleaner for this job. Don't be discouraged — new listings appear regularly.`,
              link: '/jobs',
            })
          )

          if (conv?.id) {
            tasks.push(supabaseAdmin.from('messages').insert({
              conversation_id: conv.id,
              sender_id: customerRecord.profile_id,
              sender_role: 'customer',
              content: '__system__ This listing has been filled. Thank you for applying.',
            }))
          }
          if (rejCleanerProfile?.email) {
            tasks.push(resend.emails.send({
              from: 'Vouchee <hello@vouchee.co.uk>',
              to: rejCleanerProfile.email,
              subject: 'Application update from Vouchee',
              html: buildRejectionEmail(customerFirstName, cleanRequest.zone ?? ''),
            }))
          }
          return Promise.all(tasks)
        })
      )
    }

    console.log('All done. Redirecting to dashboard.')
    return NextResponse.redirect(`${appUrl}/customer/dashboard?gc_success=1&chat=${conversationId}`)

  } catch (err: any) {
    console.error('GoCardless confirm error:', err)
    return NextResponse.redirect(`${appUrl}/customer/dashboard?gc_error=1`)
  }
}