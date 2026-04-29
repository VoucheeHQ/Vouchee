import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY!)
const LOGO_URL = 'https://www.vouchee.co.uk/full-logo-black.png'
const BRAND_BLUE = '#2563eb'

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

// ─── Support alert (cancel now) ───────────────────────────────────────────────

function buildSupportAlertCancelHtml(opts: {
  customerName: string; customerEmail: string; oldCleanerName: string
  oldRequestId: string; newRequestId: string; reason: string
  isBeforeStartDate: boolean; appUrl: string
}) {
  const { customerName, customerEmail, oldCleanerName, oldRequestId, newRequestId, reason, isBeforeStartDate, appUrl } = opts
  const inner = `
    <p style="margin:0 0 6px;font-size:20px;font-weight:800;color:#0f172a;">⚠️ Switch cleaner request — immediate cancellation</p>
    <p style="margin:0 0 24px;font-size:14px;color:#64748b;line-height:1.6;">A customer has ended their cleaner arrangement immediately. ${isBeforeStartDate ? 'This is <strong>before their first clean</strong>.' : 'This is <strong>after at least one clean</strong>.'}</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:12px;padding:18px 20px;margin-bottom:20px;">
      <tr><td>
        <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.08em;">Customer</p>
        <p style="margin:0 0 2px;font-size:15px;font-weight:700;color:#0f172a;">${customerName}</p>
        <p style="margin:0;font-size:13px;color:#475569;"><a href="mailto:${customerEmail}" style="color:${BRAND_BLUE};">${customerEmail}</a></p>
      </td></tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      <tr><td style="padding:10px 0;border-bottom:1px solid #f1f5f9;">
        <span style="font-size:12px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.06em;">Previous cleaner</span>
        <span style="float:right;font-size:14px;color:#0f172a;font-weight:600;">${oldCleanerName}</span>
      </td></tr>
      <tr><td style="padding:10px 0;border-bottom:1px solid #f1f5f9;">
        <span style="font-size:12px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.06em;">Old request ID</span>
        <span style="float:right;font-size:12px;color:#64748b;font-family:monospace;">${oldRequestId}</span>
      </td></tr>
      <tr><td style="padding:10px 0;">
        <span style="font-size:12px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.06em;">New request ID</span>
        <span style="float:right;font-size:12px;color:#64748b;font-family:monospace;">${newRequestId}</span>
      </td></tr>
    </table>
    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:16px 18px;margin-bottom:20px;">
      <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#dc2626;text-transform:uppercase;letter-spacing:0.06em;">Reason given</p>
      <p style="margin:0;font-size:14px;color:#0f172a;line-height:1.6;font-style:italic;">"${reason}"</p>
    </div>
    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:14px 16px;margin-bottom:24px;">
      <p style="margin:0;font-size:13px;color:#92400e;line-height:1.6;">
        <strong>GC subscription cancelled automatically.</strong> The customer's mandate remains active — a new subscription fires when they confirm their next cleaner. No manual action needed unless there's a billing dispute.
      </p>
    </div>
    <a href="${appUrl}/admin/dashboard" style="display:block;background:${BRAND_BLUE};color:#ffffff;font-size:14px;font-weight:700;padding:14px 0;border-radius:10px;text-decoration:none;text-align:center;">View in admin dashboard →</a>
  `
  return emailShell(appUrl, inner, 'Switch cleaner — immediate')
}

// ─── Support alert (find replacement first) ───────────────────────────────────

function buildSupportAlertPendingHtml(opts: {
  customerName: string; customerEmail: string; oldCleanerName: string
  oldRequestId: string; newRequestId: string; reason: string; appUrl: string
}) {
  const { customerName, customerEmail, oldCleanerName, oldRequestId, newRequestId, reason, appUrl } = opts
  const inner = `
    <p style="margin:0 0 6px;font-size:20px;font-weight:800;color:#0f172a;">🔄 Replacement cleaner requested</p>
    <p style="margin:0 0 24px;font-size:14px;color:#64748b;line-height:1.6;">A customer is looking for a replacement cleaner. <strong>The current cleaner continues until a replacement is confirmed.</strong> The GC subscription has NOT been cancelled.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:12px;padding:18px 20px;margin-bottom:20px;">
      <tr><td>
        <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.08em;">Customer</p>
        <p style="margin:0 0 2px;font-size:15px;font-weight:700;color:#0f172a;">${customerName}</p>
        <p style="margin:0;font-size:13px;color:#475569;"><a href="mailto:${customerEmail}" style="color:${BRAND_BLUE};">${customerEmail}</a></p>
      </td></tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      <tr><td style="padding:10px 0;border-bottom:1px solid #f1f5f9;">
        <span style="font-size:12px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.06em;">Current cleaner (continuing)</span>
        <span style="float:right;font-size:14px;color:#0f172a;font-weight:600;">${oldCleanerName}</span>
      </td></tr>
      <tr><td style="padding:10px 0;border-bottom:1px solid #f1f5f9;">
        <span style="font-size:12px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.06em;">Old request ID</span>
        <span style="float:right;font-size:12px;color:#64748b;font-family:monospace;">${oldRequestId}</span>
      </td></tr>
      <tr><td style="padding:10px 0;">
        <span style="font-size:12px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.06em;">New listing ID</span>
        <span style="float:right;font-size:12px;color:#64748b;font-family:monospace;">${newRequestId}</span>
      </td></tr>
    </table>
    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:16px 18px;margin-bottom:20px;">
      <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#dc2626;text-transform:uppercase;letter-spacing:0.06em;">Reason given</p>
      <p style="margin:0;font-size:14px;color:#0f172a;line-height:1.6;font-style:italic;">"${reason}"</p>
    </div>
    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:14px 16px;margin-bottom:24px;">
      <p style="margin:0;font-size:13px;color:#1e40af;line-height:1.6;">
        The current cleaner's subscription will be cancelled and a farewell email sent automatically when the customer confirms their new cleaner's start date.
      </p>
    </div>
    <a href="${appUrl}/admin/dashboard" style="display:block;background:${BRAND_BLUE};color:#ffffff;font-size:14px;font-weight:700;padding:14px 0;border-radius:10px;text-decoration:none;text-align:center;">View in admin dashboard →</a>
  `
  return emailShell(appUrl, inner, 'Switch cleaner — replacement requested')
}

// ─── Customer email (cancel now) ──────────────────────────────────────────────

function buildCustomerCancelNowHtml(opts: {
  customerFirstName: string; isBeforeStartDate: boolean; appUrl: string
}) {
  const { customerFirstName, isBeforeStartDate, appUrl } = opts
  const inner = `
    <p style="margin:0 0 6px;font-size:22px;font-weight:800;color:#0f172a;">
      ${isBeforeStartDate ? "We're on it, " : 'Switch request received, '}${customerFirstName}!
    </p>
    <p style="margin:0 0 24px;font-size:14px;color:#64748b;line-height:1.6;">
      ${isBeforeStartDate
        ? "We're sorry to hear things didn't work out. Your listing is now live again and cleaners in your area can apply."
        : 'Your current cleaner arrangement has been ended. Your listing is live again for new applicants.'}
    </p>
    <div style="background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:12px;padding:20px 24px;margin-bottom:24px;">
      <p style="margin:0 0 10px;font-size:13px;font-weight:700;color:#15803d;">✅ What's happened:</p>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="padding:4px 0;font-size:13px;color:#166534;">✓ Your Direct Debit subscription has been cancelled</td></tr>
        <tr><td style="padding:4px 0;font-size:13px;color:#166534;">✓ Your previous cleaner has been blocked from your listings</td></tr>
        <tr><td style="padding:4px 0;font-size:13px;color:#166534;">✓ A fresh listing is now live for new applicants</td></tr>
        <tr><td style="padding:4px 0;font-size:13px;color:#166534;">✓ Your first clean with a new cleaner will be discounted automatically</td></tr>
      </table>
    </div>
    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:16px 18px;margin-bottom:24px;">
      <p style="margin:0;font-size:13px;color:#1e40af;line-height:1.6;">
        💡 <strong>No new Direct Debit needed.</strong> When you confirm a new cleaner, your existing mandate is reused automatically.
      </p>
    </div>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      <tr><td align="center">
        <a href="${appUrl}/customer/dashboard" style="display:inline-block;background:${BRAND_BLUE};color:#ffffff;font-size:14px;font-weight:700;padding:13px 28px;border-radius:10px;text-decoration:none;">View your listing →</a>
      </td></tr>
    </table>
    <p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.5;text-align:center;">
      Questions? <a href="mailto:support@vouchee.co.uk" style="color:${BRAND_BLUE};">support@vouchee.co.uk</a>
    </p>
  `
  return emailShell(appUrl, inner, 'Cleaner switch confirmed')
}

// ─── Cleaner email (cancel now) ───────────────────────────────────────────────

function buildCleanerEndedHtml(opts: {
  cleanerFirstName: string; customerFirstName: string; appUrl: string
}) {
  const { cleanerFirstName, customerFirstName, appUrl } = opts
  const inner = `
    <p style="margin:0 0 6px;font-size:22px;font-weight:800;color:#0f172a;">An update about ${customerFirstName}</p>
    <p style="margin:0 0 24px;font-size:14px;color:#64748b;line-height:1.6;">
      Hi ${cleanerFirstName}, we wanted to let you know that ${customerFirstName} has decided to end their cleaning arrangement with you on Vouchee. Their subscription has been cancelled with immediate effect.
    </p>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:18px 22px;margin-bottom:24px;">
      <p style="margin:0;font-size:13px;color:#475569;line-height:1.7;">
        We understand this isn't easy to hear. Things don't always work out, and that's okay — there's no fault assigned. You're free to keep applying to other jobs as usual.
      </p>
    </div>
    <p style="margin:0 0 24px;font-size:14px;color:#64748b;line-height:1.6;">
      New listings appear regularly in your area. Keep an eye on your job alerts and dashboard.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr><td align="center">
        <a href="${appUrl}/jobs" style="display:inline-block;background:${BRAND_BLUE};color:#ffffff;font-size:14px;font-weight:700;padding:13px 28px;border-radius:10px;text-decoration:none;">Browse new jobs →</a>
      </td></tr>
    </table>
    <p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.5;text-align:center;">
      Questions? <a href="mailto:cleaners@vouchee.co.uk" style="color:${BRAND_BLUE};">cleaners@vouchee.co.uk</a>
    </p>
  `
  return emailShell(appUrl, inner, 'An update about your Vouchee customer')
}

// ─── Customer email (find replacement first) ──────────────────────────────────

function buildCustomerPendingHtml(opts: {
  customerFirstName: string; appUrl: string
}) {
  const { customerFirstName, appUrl } = opts
  const inner = `
    <p style="margin:0 0 6px;font-size:22px;font-weight:800;color:#0f172a;">Finding your replacement, ${customerFirstName}!</p>
    <p style="margin:0 0 24px;font-size:14px;color:#64748b;line-height:1.6;">
      Your current cleaner will continue until your new cleaner's first clean. We've posted a fresh listing so applicants can apply straight away.
    </p>
    <div style="background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:12px;padding:20px 24px;margin-bottom:24px;">
      <p style="margin:0 0 10px;font-size:13px;font-weight:700;color:#15803d;">✅ What's happened:</p>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="padding:4px 0;font-size:13px;color:#166534;">✓ A fresh listing is live for new applicants</td></tr>
        <tr><td style="padding:4px 0;font-size:13px;color:#166534;">✓ Your current cleaner continues until your new one starts</td></tr>
        <tr><td style="padding:4px 0;font-size:13px;color:#166534;">✓ Your current Direct Debit continues as normal</td></tr>
        <tr><td style="padding:4px 0;font-size:13px;color:#166534;">✓ Your previous cleaner won't see or be able to apply to the new listing</td></tr>
      </table>
    </div>
    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:16px 18px;margin-bottom:24px;">
      <p style="margin:0;font-size:13px;color:#1e40af;line-height:1.6;">
        💡 When you confirm a new cleaner and pick a start date, your current cleaner will automatically receive a farewell notice and your subscription will switch over.
      </p>
    </div>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      <tr><td align="center">
        <a href="${appUrl}/customer/dashboard" style="display:inline-block;background:${BRAND_BLUE};color:#ffffff;font-size:14px;font-weight:700;padding:13px 28px;border-radius:10px;text-decoration:none;">View your dashboard →</a>
      </td></tr>
    </table>
    <p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.5;text-align:center;">
      Questions? <a href="mailto:support@vouchee.co.uk" style="color:${BRAND_BLUE};">support@vouchee.co.uk</a>
    </p>
  `
  return emailShell(appUrl, inner, 'Finding your replacement cleaner')
}

export async function POST(request: NextRequest) {
  // ─── Auth ─────────────────────────────────────────────────────────────────
  const cookieStore = await cookies()
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {}
        },
      },
    }
  )
  const { data: { user }, error: userErr } = await supabaseAuth.auth.getUser()
  if (userErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  let body: any
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { requestId, reason, keepCurrent } = body
  if (!requestId || typeof requestId !== 'string') {
    return NextResponse.json({ error: 'Missing requestId' }, { status: 400 })
  }

  // ─── 1. Load fulfilled request ────────────────────────────────────────────
  const { data: cleanRequest, error: reqErr } = await admin
    .from('clean_requests')
    .select('id, customer_id, status, assigned_cleaner_id, gocardless_subscription_id, bedrooms, bathrooms, frequency, hours_per_session, tasks, zone, customer_notes, preferred_days, time_of_day, hourly_rate, start_date')
    .eq('id', requestId)
    .single() as { data: any, error: any }

  if (reqErr || !cleanRequest) return NextResponse.json({ error: 'Request not found' }, { status: 404 })
  if (cleanRequest.status !== 'fulfilled') return NextResponse.json({ error: 'Request is not fulfilled' }, { status: 400 })

  // ─── 2. Verify ownership ──────────────────────────────────────────────────
  const { data: customerRecord } = await admin
    .from('customers')
    .select('id, profile_id, blocked_cleaner_ids, gocardless_mandate_id')
    .eq('profile_id', user.id)
    .single() as { data: { id: string; profile_id: string; blocked_cleaner_ids: string[] | null; gocardless_mandate_id: string | null } | null }

  if (!customerRecord || customerRecord.id !== cleanRequest.customer_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // ─── 3. Block old cleaner ─────────────────────────────────────────────────
  const oldCleanerId = cleanRequest.assigned_cleaner_id
  const existingBlocked: string[] = customerRecord.blocked_cleaner_ids ?? []
  const newBlocked = oldCleanerId && !existingBlocked.includes(oldCleanerId)
    ? [...existingBlocked, oldCleanerId]
    : existingBlocked

  // ─── 4. Handle subscription (only cancel if not keepCurrent) ─────────────
  if (!keepCurrent) {
    const subscriptionId = cleanRequest.gocardless_subscription_id
    if (subscriptionId) {
      const gcEnvironment = process.env.GOCARDLESS_ENVIRONMENT ?? 'sandbox'
      const gcBaseUrl = gcEnvironment === 'live' ? 'https://api.gocardless.com' : 'https://api-sandbox.gocardless.com'
      const cancelRes = await fetch(`${gcBaseUrl}/subscriptions/${subscriptionId}/actions/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.GOCARDLESS_ACCESS_TOKEN!}`,
          'GoCardless-Version': '2015-07-06',
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ data: {} }),
      })
      if (!cancelRes.ok) console.error('GC subscription cancel failed:', await cancelRes.text())
      else console.log('GC subscription cancelled:', subscriptionId)
    }
  }

  // ─── 5. Update old request ────────────────────────────────────────────────
  if (keepCurrent) {
    // Leave fulfilled, flag as pending switch so confirm-switch knows to fire farewell
    await admin.from('clean_requests').update({
      switch_pending: true,
      switch_requested_at: new Date().toISOString(),
      switch_reason: reason?.trim() || null,
    } as any).eq('id', requestId)
  } else {
    await admin.from('clean_requests').update({
      status: 'cancelled',
      switch_requested_at: new Date().toISOString(),
      switch_reason: reason?.trim() || null,
    } as any).eq('id', requestId)
  }

  // ─── 6. Update blocked list ───────────────────────────────────────────────
  await admin.from('customers').update({
    blocked_cleaner_ids: newBlocked,
  } as any).eq('id', customerRecord.id)

  // ─── 7. Create fresh listing ──────────────────────────────────────────────
  const { data: newRequest, error: insertErr } = await admin
    .from('clean_requests')
    .insert({
      customer_id: cleanRequest.customer_id,
      status: 'active',
      service_type: 'regular',
      zone: cleanRequest.zone,
      bedrooms: cleanRequest.bedrooms,
      bathrooms: cleanRequest.bathrooms,
      has_pets: false,
      preferred_days: cleanRequest.preferred_days ?? [],
      time_of_day: cleanRequest.time_of_day ?? null,
      hourly_rate: cleanRequest.hourly_rate ?? null,
      hours_per_session: cleanRequest.hours_per_session ?? null,
      frequency: cleanRequest.frequency ?? null,
      tasks: cleanRequest.tasks ?? [],
      customer_notes: cleanRequest.customer_notes ?? null,
      is_switch: true,
      switch_from_request_id: requestId,
      switch_requested_at: new Date().toISOString(),
    } as any)
    .select('id')
    .single() as { data: { id: string } | null, error: any }

  if (insertErr || !newRequest) {
    console.error('Failed to create new request:', insertErr)
    return NextResponse.json({ error: 'Failed to create new listing' }, { status: 500 })
  }

  // ─── 8. Load names for emails ─────────────────────────────────────────────
  const { data: customerProfile } = await admin
    .from('profiles').select('full_name, email').eq('id', user.id).single() as { data: { full_name: string | null; email: string | null } | null }

  let oldCleanerName = 'Unknown'
  let oldCleanerEmail: string | null = null
  let oldCleanerFirstName = 'there'
  if (oldCleanerId) {
    const { data: cr } = await admin.from('cleaners').select('profile_id').eq('id', oldCleanerId).single() as { data: { profile_id: string } | null }
    if (cr) {
      const { data: cp } = await admin.from('profiles').select('full_name, email').eq('id', cr.profile_id).single() as { data: { full_name: string | null; email: string | null } | null }
      oldCleanerName = cp?.full_name ?? 'Unknown'
      oldCleanerEmail = cp?.email ?? null
      oldCleanerFirstName = cp?.full_name?.split(' ')[0] ?? 'there'
    }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.vouchee.co.uk'
  const isBeforeStartDate = cleanRequest.start_date ? new Date() < new Date(cleanRequest.start_date) : true
  const customerFirstName = customerProfile?.full_name?.split(' ')[0] ?? 'there'

  // ─── 9. Send emails ───────────────────────────────────────────────────────
  await Promise.allSettled([
    resend.emails.send({
      from: 'Vouchee Alerts <cleaners@vouchee.co.uk>',
      to: 'support@vouchee.co.uk',
      subject: keepCurrent
        ? `🔄 Replacement cleaner requested — ${customerProfile?.full_name ?? 'Customer'}`
        : `⚠️ Switch cleaner request — ${customerProfile?.full_name ?? 'Customer'}`,
      html: keepCurrent
        ? buildSupportAlertPendingHtml({
            customerName: customerProfile?.full_name ?? 'Unknown',
            customerEmail: customerProfile?.email ?? '',
            oldCleanerName,
            oldRequestId: requestId,
            newRequestId: newRequest.id,
            reason: reason?.trim() || 'No reason provided',
            appUrl,
          })
        : buildSupportAlertCancelHtml({
            customerName: customerProfile?.full_name ?? 'Unknown',
            customerEmail: customerProfile?.email ?? '',
            oldCleanerName,
            oldRequestId: requestId,
            newRequestId: newRequest.id,
            reason: reason?.trim() || 'No reason provided',
            isBeforeStartDate,
            appUrl,
          }),
    }),
    customerProfile?.email
      ? resend.emails.send({
          from: 'Vouchee <hello@vouchee.co.uk>',
          to: customerProfile.email,
          subject: keepCurrent
            ? '✅ Finding your replacement — your current cleaner continues for now'
            : isBeforeStartDate
              ? "✅ We're on it — finding you a new cleaner"
              : '✅ Switch request received — your listing is live again',
          html: keepCurrent
            ? buildCustomerPendingHtml({ customerFirstName, appUrl })
            : buildCustomerCancelNowHtml({ customerFirstName, isBeforeStartDate, appUrl }),
        })
      : Promise.resolve(null),
    // ─── Notify the old cleaner (cancel-now path only) ──────────────────────
    // For keepCurrent=true, the farewell email fires later from confirm-switch
    // when the customer locks in their replacement and a last-clean date exists.
    !keepCurrent && oldCleanerEmail
      ? resend.emails.send({
          from: 'Vouchee <hello@vouchee.co.uk>',
          to: oldCleanerEmail,
          subject: `An update about your Vouchee customer`,
          html: buildCleanerEndedHtml({
            cleanerFirstName: oldCleanerFirstName,
            customerFirstName,
            appUrl,
          }),
        })
      : Promise.resolve(null),
    !keepCurrent && oldCleanerId
      ? admin.from('notifications').insert({
          cleaner_id: oldCleanerId,
          type: 'job_lost',
          title: `${customerFirstName} has ended your cleaning arrangement`,
          body: `Your subscription with ${customerFirstName} has been cancelled. New listings appear regularly — keep an eye on your alerts.`,
          link: '/jobs',
        } as any)
      : Promise.resolve(null),
  ])

  return NextResponse.json({ success: true, newRequestId: newRequest.id })
}