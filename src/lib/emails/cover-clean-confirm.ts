// ─────────────────────────────────────────────────────────────────────────────
// Cover-clean confirmation emails
//
// Fired from /api/gocardless/create-flow's cover branch when a customer
// accepts a cover cleaner. Twin of the regular-clean confirmation emails in
// /api/gocardless/confirm, with the cover-specific differences:
//
//   - One-off date + time window (not recurring)
//   - Pay-direct callout instead of Direct Debit wording
//   - No cooling-off block (no recurring service contract → UK CCR 2013
//     doesn't apply)
//   - No "Vouchee service fee / first DD" notice
//
// Both functions return a complete HTML string ready to pass to Resend.
// Subject helpers are exported alongside so the route can stay consistent.
// ─────────────────────────────────────────────────────────────────────────────

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
  
  const STANDARD_TASK_IDS = new Set([
    'general', 'general_cleaning', 'hoovering', 'mopping', 'bathroom', 'kitchen', 'bins',
  ])
  
  const ZONE_LABELS: Record<string, string> = {
    central_south_east: 'Central / South East', north_west: 'North West',
    north_east_roffey: 'North East / Roffey', south_west: 'South West',
    warnham_north: 'Warnham / North', broadbridge_heath: 'Broadbridge Heath',
    mannings_heath: 'Mannings Heath', faygate_kilnwood_vale: 'Faygate / Kilnwood Vale',
    christs_hospital: "Christ's Hospital", southwater: 'Southwater',
  }
  
  // "2026-05-13" → "Tuesday 13 May 2026"
  function formatCoverDate(iso: string): string {
    return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    })
  }
  
  // "07:30:00" or "07:30" → "07:30"
  function formatTime(t: string | null | undefined): string {
    if (!t) return ''
    const m = t.match(/^(\d{1,2}):(\d{2})/)
    return m ? `${m[1].padStart(2, '0')}:${m[2]}` : t
  }
  
  function formatTimeWindow(start: string | null, end: string | null): string {
    const s = formatTime(start)
    const e = formatTime(end)
    if (s && e) return `${s} – ${e}`
    if (s) return `from ${s}`
    if (e) return `until ${e}`
    return ''
  }
  
  function formatPostcode(raw: string): string {
    const clean = raw.toUpperCase().replace(/\s+/g, '')
    if (clean.length > 4) return clean.slice(0, -3) + ' ' + clean.slice(-3)
    return clean
  }
  
  function formatAddress(a1: string, a2: string | null, city: string, postcode: string): string {
    return [a1, a2, city, formatPostcode(postcode)].filter(Boolean).join(', ')
  }
  
  function htmlEscape(s: string): string {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  }
  
  function chip(label: string, kind: 'green' | 'yellow'): string {
    const palette = kind === 'green'
      ? 'background:#f0fdf4;border:1px solid #bbf7d0;color:#15803d;'
      : 'background:#fefce8;border:1px solid #fde68a;color:#854d0e;'
    return `<span style="display:inline-block;${palette}font-size:12px;font-weight:600;padding:4px 14px;border-radius:100px;margin:3px 3px 3px 0;">${htmlEscape(label)}</span>`
  }
  
  function taskChips(tasks: string[]): string {
    const standard = (tasks ?? []).filter(t => STANDARD_TASK_IDS.has(t))
    const special = (tasks ?? []).filter(t => !STANDARD_TASK_IDS.has(t))
    let html = ''
    if (standard.length > 0) {
      html += `<div style="margin-bottom:6px;">${standard.map(t => chip(TASK_LABELS[t] ?? t, 'green')).join('')}</div>`
    }
    if (special.length > 0) {
      html += `<div style="font-size:13px;font-weight:800;color:#92400e;text-transform:uppercase;letter-spacing:0.06em;margin:10px 0 6px;">Special requests</div>`
      html += `<div>${special.map(t => chip(TASK_LABELS[t] ?? t, 'yellow')).join('')}</div>`
    }
    return html
  }
  
  // ═════════════════════════════════════════════════════════════════════════
  // Subject lines — exported so the route can stay consistent across emails
  // ═════════════════════════════════════════════════════════════════════════
  export function coverCleanerEmailSubject(coverDateIso: string): string {
    return `🎉 You've been chosen — cover clean on ${formatCoverDate(coverDateIso)}`
  }
  
  export function coverCustomerEmailSubject(coverDateIso: string, cleanerFirstName: string): string {
    return `✅ Cover cleaner confirmed — ${cleanerFirstName} on ${formatCoverDate(coverDateIso)}`
  }
  
  // ═════════════════════════════════════════════════════════════════════════
  // Email TO THE CLEANER: "You've been chosen — cover clean on …"
  // ═════════════════════════════════════════════════════════════════════════
  export function coverCleanerEmailHtml(opts: {
    cleanerFirstName: string
    customerFirstName: string
    customerFullName: string
    customerEmail: string
    customerPhone: string | null
    address: string
    coverDateIso: string
    timeWindowStart: string | null
    timeWindowEnd: string | null
    bedrooms: number
    bathrooms: number
    hoursPerSession: number
    hourlyRate: number
    tasks: string[]
    zone: string
    customerNotes: string | null
  }): string {
    const {
      cleanerFirstName, customerFirstName, customerFullName, customerEmail, customerPhone,
      address, coverDateIso, timeWindowStart, timeWindowEnd,
      bedrooms, bathrooms, hoursPerSession, hourlyRate, tasks, zone, customerNotes,
    } = opts
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.vouchee.co.uk'
    const dateLabel = formatCoverDate(coverDateIso)
    const timeLabel = formatTimeWindow(timeWindowStart, timeWindowEnd)
    const totalAmount = (hourlyRate * hoursPerSession).toFixed(2)
  
    return `<!DOCTYPE html>
  <html>
  <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
  <body style="margin:0;padding:0;background:#f0f4f8;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:40px 16px;">
    <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;">
  
      <tr><td style="background:#ffffff;padding:36px 40px 32px;text-align:center;border-radius:16px 16px 0 0;">
        <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">You've been chosen for a one-off cover clean.</div>
        <div style="margin-bottom:20px;"><img src="https://www.vouchee.co.uk/full-logo-black.png" width="260" height="60" alt="Vouchee" style="display:block;margin:0 auto 16px;max-width:100%;" /></div>
        <div style="font-size:32px;font-weight:800;color:#0f172a;letter-spacing:-0.5px;line-height:1.15;">You've been chosen! 🎉</div>
        <div style="font-size:14px;color:#64748b;margin-top:10px;">A one-off cover clean — confirmed.</div>
      </td></tr>
  
      <tr><td style="background:white;padding:36px 40px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 16px 16px;">
  
        <div style="background:linear-gradient(135deg,#faf5ff 0%,#fdf2f8 100%);border:1.5px solid #d8b4fe;border-radius:12px;padding:22px 28px;margin-bottom:24px;text-align:center;">
          <div style="font-size:12px;font-weight:800;color:#7e22ce;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">📅 Cover clean</div>
          <div style="font-size:24px;font-weight:800;color:#0f172a;">${htmlEscape(dateLabel)}</div>
          ${timeLabel ? `<div style="font-size:15px;font-weight:600;color:#475569;margin-top:6px;">${htmlEscape(timeLabel)}</div>` : ''}
        </div>
  
        <div style="background:#fefce8;border:1.5px solid #fde68a;border-radius:12px;padding:22px 28px;margin-bottom:20px;">
          <div style="font-size:13px;font-weight:800;color:#854d0e;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:10px;">💷 Payment — paid directly</div>
          <p style="margin:0 0 8px;font-size:14px;color:#78350f;line-height:1.6;">
            This is a one-off cover clean. <strong>${htmlEscape(customerFirstName)} will pay you directly on the day</strong> — Vouchee doesn't collect any fees for cover cleans.
          </p>
          <p style="margin:0;font-size:14px;color:#78350f;line-height:1.6;">
            Agreed amount: <strong>£${totalAmount}</strong> (${hoursPerSession} hrs × £${hourlyRate.toFixed(2)}/hr). Confirm cash/transfer with ${htmlEscape(customerFirstName)} ahead of the day.
          </p>
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
              <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#374151;">Hours</td>
              <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;text-align:right;font-size:13px;font-weight:700;color:#0f172a;">${hoursPerSession} hrs</td>
            </tr>
            <tr>
              <td style="padding:8px 0;font-size:13px;color:#374151;">Area</td>
              <td style="padding:8px 0;text-align:right;font-size:13px;font-weight:700;color:#0f172a;">${htmlEscape(ZONE_LABELS[zone] ?? zone)}</td>
            </tr>
          </table>
        </div>
  
        <div style="margin-bottom:20px;">
          <div style="font-size:13px;font-weight:800;color:#0f172a;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:10px;">Tasks requested</div>
          ${taskChips(tasks)}
        </div>
  
        ${customerNotes ? `
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:18px 24px;margin-bottom:20px;">
          <div style="font-size:13px;font-weight:800;color:#0f172a;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px;text-align:center;">Customer notes</div>
          <div style="font-size:14px;color:#475569;line-height:1.6;font-style:italic;">"${htmlEscape(customerNotes)}"</div>
        </div>` : ''}
  
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:22px 28px;margin-bottom:24px;">
          <div style="font-size:13px;font-weight:800;color:#0f172a;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:16px;text-align:center;">Customer details</div>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#374151;width:38%;">Name</td>
              <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;text-align:right;font-size:13px;font-weight:700;color:#0f172a;">${htmlEscape(customerFullName)}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#374151;">Email</td>
              <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;text-align:right;">
                <a href="mailto:${htmlEscape(customerEmail)}" style="font-size:13px;font-weight:700;color:#0f172a;text-decoration:none;">${htmlEscape(customerEmail)}</a>
              </td>
            </tr>
            ${customerPhone ? `
            <tr>
              <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#374151;">Phone</td>
              <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;text-align:right;">
                <a href="tel:${htmlEscape(customerPhone)}" style="font-size:13px;font-weight:700;color:#0f172a;text-decoration:none;">${htmlEscape(customerPhone)}</a>
              </td>
            </tr>` : ''}
            <tr>
              <td style="padding:8px 0;vertical-align:top;font-size:13px;color:#374151;">Address</td>
              <td style="padding:8px 0;text-align:right;">
                <span style="font-size:13px;font-weight:700;color:#1e40af;">${htmlEscape(address)}</span>
              </td>
            </tr>
          </table>
        </div>
  
        <div style="background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:12px;padding:24px 28px;margin-bottom:16px;text-align:center;">
          <div style="font-size:15px;font-weight:700;color:#15803d;margin-bottom:8px;">👋 Reach out before the clean</div>
          <div style="font-size:13px;color:#166534;line-height:1.6;margin-bottom:18px;">We recommend contacting ${htmlEscape(customerFirstName)} before the clean to confirm timing and access.<br>Use the chat on your dashboard or their contact details above!</div>
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
  
  // ═════════════════════════════════════════════════════════════════════════
  // Email TO THE CUSTOMER: "Your cover cleaner is confirmed"
  // ═════════════════════════════════════════════════════════════════════════
  export function coverCustomerEmailHtml(opts: {
    customerFirstName: string
    cleanerFullName: string
    cleanerFirstName: string
    cleanerEmail: string | null
    cleanerPhone: string | null
    cleanerCardUrl: string
    coverDateIso: string
    timeWindowStart: string | null
    timeWindowEnd: string | null
    bedrooms: number
    bathrooms: number
    hoursPerSession: number
    hourlyRate: number
    tasks: string[]
    zone: string
  }): string {
    const {
      customerFirstName, cleanerFullName, cleanerFirstName, cleanerEmail, cleanerPhone,
      cleanerCardUrl, coverDateIso, timeWindowStart, timeWindowEnd,
      bedrooms, bathrooms, hoursPerSession, hourlyRate, tasks, zone,
    } = opts
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.vouchee.co.uk'
    const dateLabel = formatCoverDate(coverDateIso)
    const timeLabel = formatTimeWindow(timeWindowStart, timeWindowEnd)
    const totalAmount = (hourlyRate * hoursPerSession).toFixed(2)
  
    return `<!DOCTYPE html>
  <html>
  <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
  <body style="margin:0;padding:0;background:#f0f4f8;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:40px 16px;">
    <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;">
  
      <tr><td style="background:#ffffff;padding:36px 40px 32px;text-align:center;border-radius:16px 16px 0 0;">
        <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">Your cover cleaner is confirmed.</div>
        <img src="https://www.vouchee.co.uk/full-logo-black.png" width="260" height="60" alt="Vouchee" style="display:block;margin:0 auto 36px;max-width:100%;" />
        <div style="font-size:32px;font-weight:800;color:#0f172a;letter-spacing:-0.5px;line-height:1.15;">Cover clean confirmed! 🎉</div>
      </td></tr>
  
      <tr><td style="background:white;padding:36px 40px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 16px 16px;">
  
        <div style="background:linear-gradient(135deg,#faf5ff 0%,#fdf2f8 100%);border:1.5px solid #d8b4fe;border-radius:12px;padding:22px 28px;margin-bottom:24px;text-align:center;">
          <div style="font-size:12px;font-weight:800;color:#7e22ce;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">📅 Cover clean</div>
          <div style="font-size:24px;font-weight:800;color:#0f172a;">${htmlEscape(dateLabel)}</div>
          ${timeLabel ? `<div style="font-size:15px;font-weight:600;color:#475569;margin-top:6px;">${htmlEscape(timeLabel)}</div>` : ''}
        </div>
  
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:22px 28px;margin-bottom:16px;">
          <div style="font-size:13px;font-weight:800;color:#0f172a;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:16px;text-align:center;">Your cleaner</div>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#374151;width:38%;">Name</td>
              <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;text-align:right;font-size:13px;font-weight:700;color:#0f172a;">${htmlEscape(cleanerFullName)}</td>
            </tr>
            ${cleanerEmail ? `
            <tr>
              <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#374151;">Email</td>
              <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;text-align:right;">
                <a href="mailto:${htmlEscape(cleanerEmail)}" style="font-size:13px;font-weight:700;color:#1e40af;text-decoration:none;">${htmlEscape(cleanerEmail)}</a>
              </td>
            </tr>` : ''}
            ${cleanerPhone ? `
            <tr>
              <td style="padding:8px 0;font-size:13px;color:#374151;">Phone</td>
              <td style="padding:8px 0;text-align:right;">
                <a href="tel:${htmlEscape(cleanerPhone)}" style="font-size:13px;font-weight:700;color:#1e40af;text-decoration:none;">${htmlEscape(cleanerPhone)}</a>
              </td>
            </tr>` : ''}
          </table>
        </div>
  
        <div style="text-align:center;margin-bottom:24px;">
          <a href="${cleanerCardUrl}" style="display:inline-block;background:#f8fafc;border:1.5px solid #e2e8f0;color:#0f172a;font-size:13px;font-weight:700;padding:10px 24px;border-radius:8px;text-decoration:none;">View ${htmlEscape(cleanerFirstName)}'s profile →</a>
        </div>
  
        <div style="background:#fefce8;border:1.5px solid #fde68a;border-radius:12px;padding:22px 28px;margin-bottom:24px;">
          <div style="font-size:13px;font-weight:800;color:#854d0e;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:10px;">💷 Payment — paid directly</div>
          <p style="margin:0 0 8px;font-size:14px;color:#78350f;line-height:1.6;">
            You'll pay <strong>${htmlEscape(cleanerFirstName)}</strong> directly on the day. Vouchee doesn't collect any fees for cover cleans.
          </p>
          <p style="margin:0;font-size:14px;color:#78350f;line-height:1.6;">
            Agreed amount: <strong>£${totalAmount}</strong> (${hoursPerSession} hrs × £${hourlyRate.toFixed(2)}/hr). Cash or bank transfer — confirm with ${htmlEscape(cleanerFirstName)} ahead of the day.
          </p>
        </div>
  
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
              <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#374151;">Hours</td>
              <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;text-align:right;font-size:13px;font-weight:700;color:#0f172a;">${hoursPerSession} hrs</td>
            </tr>
            <tr>
              <td style="padding:8px 0;font-size:13px;color:#374151;">Area</td>
              <td style="padding:8px 0;text-align:right;font-size:13px;font-weight:700;color:#0f172a;">${htmlEscape(ZONE_LABELS[zone] ?? zone)}</td>
            </tr>
          </table>
        </div>
  
        <div style="margin-bottom:20px;">
          <div style="font-size:13px;font-weight:800;color:#0f172a;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:10px;">Tasks</div>
          ${taskChips(tasks)}
        </div>
  
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:24px 28px;margin-bottom:16px;text-align:center;">
          <div style="font-size:15px;font-weight:700;color:#15803d;margin-bottom:8px;">🧴 Stock up before the clean</div>
          <div style="font-size:13px;color:#166534;line-height:1.6;margin-bottom:18px;">Make sure you've got everything ${htmlEscape(cleanerFirstName)} needs. We've put together a list of recommended products.</div>
          <a href="${appUrl}/cleaning-supplies" style="display:inline-block;background:#16a34a;color:white;font-size:13px;font-weight:700;padding:11px 28px;border-radius:8px;text-decoration:none;">Browse cleaning supplies →</a>
        </div>
  
        <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:24px 28px;margin-bottom:24px;text-align:center;">
          <div style="font-size:15px;font-weight:700;color:#1e40af;margin-bottom:8px;">💬 Chat with ${htmlEscape(cleanerFirstName)}</div>
          <div style="font-size:13px;color:#3b82f6;line-height:1.6;margin-bottom:18px;">Message ${htmlEscape(cleanerFirstName)} through your dashboard to confirm any details before the clean.</div>
          <a href="${appUrl}/customer/dashboard" style="display:inline-block;background:#2563eb;color:white;font-size:13px;font-weight:700;padding:11px 28px;border-radius:8px;text-decoration:none;">Open your dashboard →</a>
        </div>
  
        <p style="font-size:12px;color:#94a3b8;text-align:center;margin:0;line-height:1.6;">
          Questions? Reply to this email or contact us at <a href="mailto:hello@vouchee.co.uk" style="color:#94a3b8;">hello@vouchee.co.uk</a>
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