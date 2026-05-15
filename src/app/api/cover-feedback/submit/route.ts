import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/cover-feedback/submit
//
// Companion to the cover-feedback page's primary review submission. The
// review (1–5 stars + body) goes through /api/reviews/submit and lands in
// the public reviews table — same as any regular-clean review, same rating
// average, same jobs_won count downstream.
//
// THIS endpoint only handles the OPTIONAL private chat box that appears
// below the review. It emails admin with whatever the customer wrote +
// the rating bucket so it's easy to triage. No DB row is created — Resend
// logs are sufficient audit for v1.
//
// Body:
//   { requestId: string, stars: 1-5, text: string }
//
// Caller must be logged in AND own the customer record on the cover
// request. The route doesn't insert anywhere, but ownership is still
// verified so this can't be used to spam admin from another account.
// ─────────────────────────────────────────────────────────────────────────────

const resend = new Resend(process.env.RESEND_API_KEY!)
const BRAND_BLUE = '#2563eb'
const LOGO_URL = 'https://www.vouchee.co.uk/full-logo-black.png'

const MAX_TEXT = 1500

function htmlEscape(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function buildAdminHtml(opts: {
  bucketLabel: string
  stars: number
  text: string
  customerName: string
  customerEmail: string
  cleanerName: string
  requestId: string
  appUrl: string
}) {
  const { bucketLabel, stars, text, customerName, customerEmail, cleanerName, requestId, appUrl } = opts
  const isPositive = stars >= 4
  const accentBg = isPositive ? '#f0fdf4' : '#fff7ed'
  const accentBorder = isPositive ? '#bbf7d0' : '#fed7aa'
  const accentText = isPositive ? '#15803d' : '#9a3412'
  const starsRow = '★'.repeat(stars) + '☆'.repeat(5 - stars)

  const inner = `
    <p style="margin:0 0 6px;font-size:20px;font-weight:800;color:#0f172a;">${isPositive ? '💬 Cover-feedback (positive)' : '⚠️ Cover-feedback (concern)'}</p>
    <p style="margin:0 0 20px;font-size:14px;color:#64748b;line-height:1.6;">A customer left private feedback after their cover clean. ${isPositive
      ? 'Public review is also live on the cleaner\'s profile.'
      : 'Public review is live on the cleaner\'s profile — but they wanted you to know more privately.'}</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:12px;padding:16px 20px;margin-bottom:16px;">
      <tr><td>
        <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.08em;">Customer</p>
        <p style="margin:0 0 2px;font-size:15px;font-weight:700;color:#0f172a;">${htmlEscape(customerName)}</p>
        <p style="margin:0;font-size:13px;color:#475569;"><a href="mailto:${customerEmail}" style="color:${BRAND_BLUE};">${htmlEscape(customerEmail)}</a></p>
      </td></tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
      <tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;">
        <span style="font-size:12px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.06em;">Cover cleaner</span>
        <span style="float:right;font-size:14px;color:#0f172a;font-weight:600;">${htmlEscape(cleanerName)}</span>
      </td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;">
        <span style="font-size:12px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.06em;">Rating</span>
        <span style="float:right;font-size:14px;color:#f59e0b;font-weight:700;letter-spacing:2px;">${starsRow}</span>
      </td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;">
        <span style="font-size:12px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.06em;">Bucket</span>
        <span style="float:right;font-size:14px;color:${accentText};font-weight:700;">${bucketLabel}</span>
      </td></tr>
      <tr><td style="padding:8px 0;">
        <span style="font-size:12px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.06em;">Cover request</span>
        <span style="float:right;font-size:12px;color:#64748b;font-family:monospace;">${htmlEscape(requestId)}</span>
      </td></tr>
    </table>
    <div style="background:${accentBg};border:1px solid ${accentBorder};border-radius:12px;padding:14px 16px;margin-bottom:20px;">
      <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:${accentText};text-transform:uppercase;letter-spacing:0.06em;">What they said</p>
      <p style="margin:0;font-size:14px;color:#0f172a;line-height:1.6;white-space:pre-wrap;">${htmlEscape(text)}</p>
    </div>
    <a href="${appUrl}/admin/dashboard" style="display:block;background:${BRAND_BLUE};color:#ffffff;font-size:14px;font-weight:700;padding:13px 0;border-radius:10px;text-decoration:none;text-align:center;">View in admin dashboard →</a>
  `
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>Cover-feedback</title></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 0;">
  <tr><td align="center">
  <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
    <tr><td style="padding:0 0 24px;text-align:center;">
      <img src="${LOGO_URL}" width="200" height="46" alt="Vouchee" style="display:block;margin:0 auto;max-width:100%;height:auto;border:0;" />
    </td></tr>
    <tr><td style="background:white;border-radius:20px;padding:36px;border:1px solid #e2e8f0;">${inner}</td></tr>
    <tr><td style="padding:24px 0 0;text-align:center;">
      <p style="margin:0;font-size:12px;color:#94a3b8;">© 2026 Vouchee Ltd · <a href="${appUrl}" style="color:#94a3b8;">vouchee.co.uk</a></p>
    </td></tr>
  </table>
  </td></tr>
</table>
</body>
</html>`
}

export async function POST(request: NextRequest) {
  // ─── Auth ─────────────────────────────────────────────────────────────
  const supabaseAuth = await createServerClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // ─── Body ─────────────────────────────────────────────────────────────
  let body: any
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { requestId, stars, text } = body
  if (!requestId || typeof requestId !== 'string') {
    return NextResponse.json({ error: 'Missing requestId' }, { status: 400 })
  }
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
    return NextResponse.json({ error: 'Stars must be 1–5' }, { status: 400 })
  }
  if (typeof text !== 'string') {
    return NextResponse.json({ error: 'Missing text' }, { status: 400 })
  }
  const trimmed = text.trim()
  if (trimmed.length === 0) {
    // Caller shouldn't have hit this with empty text, but accept gracefully.
    return NextResponse.json({ success: true, sent: false })
  }
  if (trimmed.length > MAX_TEXT) {
    return NextResponse.json({ error: `Text too long (max ${MAX_TEXT} characters)` }, { status: 400 })
  }

  // ─── Verify ownership of the cover request ──────────────────────────
  const admin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: req } = await admin
    .from('clean_requests')
    .select('id, customer_id, assigned_cleaner_id, service_type, status')
    .eq('id', requestId)
    .single() as { data: { id: string; customer_id: string; assigned_cleaner_id: string | null; service_type: string | null; status: string } | null }

  if (!req) return NextResponse.json({ error: 'Request not found' }, { status: 404 })
  if (req.service_type !== 'cover') return NextResponse.json({ error: 'Not a cover request' }, { status: 400 })

  const { data: customer } = await admin
    .from('customers').select('id').eq('profile_id', user.id).single() as { data: { id: string } | null }
  if (!customer || customer.id !== req.customer_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // ─── Build context for the admin email ──────────────────────────────
  const { data: customerProfile } = await admin
    .from('profiles').select('full_name, email').eq('id', user.id).single() as { data: { full_name: string | null; email: string | null } | null }

  let cleanerName = 'Unknown'
  if (req.assigned_cleaner_id) {
    const { data: cleaner } = await admin
      .from('cleaners').select('profile_id').eq('id', req.assigned_cleaner_id).single() as { data: { profile_id: string } | null }
    if (cleaner) {
      const { data: cleanerProfile } = await admin
        .from('profiles').select('full_name').eq('id', cleaner.profile_id).single() as { data: { full_name: string | null } | null }
      cleanerName = cleanerProfile?.full_name ?? 'Unknown'
    }
  }

  const bucketLabel = stars >= 4 ? `${stars}★ — what they liked` : `${stars}★ — what didn't work`
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.vouchee.co.uk'

  // ─── Send admin email (non-fatal if Resend fails) ───────────────────
  try {
    await resend.emails.send({
      from: 'Vouchee Alerts <cleaners@vouchee.co.uk>',
      to: 'support@vouchee.co.uk',
      subject: `${stars >= 4 ? '💬' : '⚠️'} Cover-feedback (${stars}★) — ${customerProfile?.full_name ?? 'Customer'}`,
      html: buildAdminHtml({
        bucketLabel,
        stars,
        text: trimmed,
        customerName: customerProfile?.full_name ?? 'Unknown',
        customerEmail: customerProfile?.email ?? '',
        cleanerName,
        requestId,
        appUrl,
      }),
    })
  } catch (e) {
    console.error('Cover-feedback admin email send failed:', e)
    // Still return success — the customer's submission isn't blocked by
    // our outbound email plumbing.
  }

  return NextResponse.json({ success: true, sent: true })
}
