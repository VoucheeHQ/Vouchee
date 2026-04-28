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

function buildSupportAlertHtml(opts: {
  customerName: string; customerEmail: string; oldCleanerName: string
  oldRequestId: string; newRequestId: string; reason: string
  isBeforeStartDate: boolean; appUrl: string
}) {
  const { customerName, customerEmail, oldCleanerName, oldRequestId, newRequestId, reason, isBeforeStartDate, appUrl } = opts
  const inner = `
    <p style="margin:0 0 6px;font-size:20px;font-weight:800;color:#0f172a;">⚠️ Switch cleaner request</p>
    <p style="margin:0 0 24px;font-size:14px;color:#64748b;line-height:1.6;">A customer has requested a cleaner switch. ${isBeforeStartDate ? 'This is <strong>before their first clean</strong>.' : 'This is <strong>after at least one clean</strong>.'}</p>
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
  return emailShell(appUrl, inner, 'Switch cleaner request')
}

function buildCustomerSwitchConfirmHtml(opts: {
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
        <tr><td style="padding:4px 0;font-size:13px;color:#166534;">✓ Your previous cleaner has been blocked from your listing</td></tr>
        <tr><td style="padding:4px 0;font-size:13px;color:#166534;">✓ A fresh listing is now live for new applicants</td></tr>
        <tr><td style="padding:4px 0;font-size:13px;color:#166534;">✓ Your first clean with a new cleaner will be discounted automatically</td></tr>
      </table>
    </div>
    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:16px 18px;margin-bottom:24px;">
      <p style="margin:0;font-size:13px;color:#1e40af;line-height:1.6;">
        💡 <strong>No new Direct Debit needed.</strong> When you confirm a new cleaner, your existing mandate is reused automatically — no bank details to re-enter.
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

  const { requestId, reason } = body
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

  // ─── 3. Cancel GoCardless subscription ───────────────────────────────────
  const subscriptionId = cleanRequest.gocardless_subscription_id
  if (subscriptionId) {
    const gcEnvironment = process.env.GOCARDLESS_ENVIRONMENT ?? 'sandbox'
    const gcBaseUrl = gcEnvironment === 'live'
      ? 'https://api.gocardless.com'
      : 'https://api-sandbox.gocardless.com'

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
    if (!cancelRes.ok) {
      // Non-fatal — log and continue. Subscription may already be inactive.
      console.error('GC subscription cancel failed:', await cancelRes.text())
    } else {
      console.log('GC subscription cancelled:', subscriptionId)
    }
  }

  // ─── 4. Build updated blocked cleaner list ───────────────────────────────
  const oldCleanerId = cleanRequest.assigned_cleaner_id
  const existingBlocked: string[] = customerRecord.blocked_cleaner_ids ?? []
  const newBlocked = oldCleanerId && !existingBlocked.includes(oldCleanerId)
    ? [...existingBlocked, oldCleanerId]
    : existingBlocked

  // ─── 5. Archive old request + update blocked list ────────────────────────
  await Promise.all([
    admin.from('clean_requests').update({
      status: 'cancelled',
      switch_requested_at: new Date().toISOString(),
      switch_reason: reason?.trim() || null,
    } as any).eq('id', requestId),

    admin.from('customers').update({
      blocked_cleaner_ids: newBlocked,
    } as any).eq('id', customerRecord.id),
  ])

  // ─── 6. Create fresh listing (copy of old, with switch flags) ────────────
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

  // ─── 7. Emails ────────────────────────────────────────────────────────────
  const { data: customerProfile } = await admin
    .from('profiles').select('full_name, email').eq('id', user.id).single() as { data: { full_name: string | null; email: string | null } | null }

  let oldCleanerName = 'Unknown'
  if (oldCleanerId) {
    const { data: cr } = await admin.from('cleaners').select('profile_id').eq('id', oldCleanerId).single() as { data: { profile_id: string } | null }
    if (cr) {
      const { data: cp } = await admin.from('profiles').select('full_name').eq('id', cr.profile_id).single() as { data: { full_name: string | null } | null }
      oldCleanerName = cp?.full_name ?? 'Unknown'
    }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.vouchee.co.uk'
  const isBeforeStartDate = cleanRequest.start_date
    ? new Date() < new Date(cleanRequest.start_date)
    : true

  await Promise.allSettled([
    resend.emails.send({
      from: 'Vouchee Alerts <cleaners@vouchee.co.uk>',
      to: 'support@vouchee.co.uk',
      subject: `⚠️ Switch cleaner request — ${customerProfile?.full_name ?? 'Customer'}`,
      html: buildSupportAlertHtml({
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
          subject: isBeforeStartDate
            ? "✅ We're on it — finding you a new cleaner"
            : '✅ Switch request received — your listing is live again',
          html: buildCustomerSwitchConfirmHtml({
            customerFirstName: customerProfile.full_name?.split(' ')[0] ?? 'there',
            isBeforeStartDate,
            appUrl,
          }),
        })
      : Promise.resolve(null),
  ])

  return NextResponse.json({ success: true, newRequestId: newRequest.id })
}