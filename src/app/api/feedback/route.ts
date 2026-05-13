import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Resend } from 'resend'

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/feedback
//
// Receives a bug report or suggestion from the in-app widget. Authenticated
// users only. Writes to the `feedback` table and sends an email summary to
// hello@vouchee.co.uk so the team sees submissions in real time.
//
// Body shape:
//   { type: 'bug' | 'suggestion', body: string, contactEmail?: string, pageUrl?: string }
// ─────────────────────────────────────────────────────────────────────────────

const FEEDBACK_TO = 'hello@vouchee.co.uk'

export async function POST(request: NextRequest) {
  // ── Auth ────────────────────────────────────────────────────────────────
  const cookieStore = await cookies()
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => toSet.forEach(c => cookieStore.set(c.name, c.value, c.options)),
      },
    }
  )
  const { data: { user }, error: userErr } = await supabaseAuth.auth.getUser()
  if (userErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // ── Body parse + validate ──────────────────────────────────────────────
  let payload: { type?: string; body?: string; contactEmail?: string; pageUrl?: string }
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const type = payload.type
  const body = (payload.body ?? '').trim()
  const contactEmail = (payload.contactEmail ?? '').trim() || null
  const pageUrl = (payload.pageUrl ?? '').trim() || null
  const userAgent = request.headers.get('user-agent') ?? null

  if (type !== 'bug' && type !== 'suggestion') {
    return NextResponse.json({ error: 'type must be "bug" or "suggestion"' }, { status: 400 })
  }
  if (body.length < 1 || body.length > 5000) {
    return NextResponse.json({ error: 'body must be 1–5000 characters' }, { status: 400 })
  }
  if (contactEmail && contactEmail.length > 200) {
    return NextResponse.json({ error: 'contactEmail too long' }, { status: 400 })
  }

  // ── Look up profile (role + email + name) for the email summary ──────
  const admin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data: profile } = await admin
    .from('profiles')
    .select('full_name, email, role')
    .eq('id', user.id)
    .single() as { data: { full_name: string | null; email: string | null; role: string | null } | null }

  // ── Insert the feedback row ───────────────────────────────────────────
  const { error: insertErr } = await admin
    .from('feedback')
    .insert({
      type,
      body,
      profile_id: user.id,
      role: profile?.role ?? null,
      email: contactEmail ?? profile?.email ?? null,
      page_url: pageUrl,
      user_agent: userAgent,
    } as any)

  if (insertErr) {
    console.error('Feedback insert failed:', insertErr)
    return NextResponse.json({ error: 'Could not save feedback' }, { status: 500 })
  }

  // ── Email summary (best-effort — don't fail the request if this fails) ──
  try {
    const resend = new Resend(process.env.RESEND_API_KEY!)
    const subjectType = type === 'bug' ? 'Bug' : 'Suggestion'
    const fromName = profile?.full_name ?? 'Anonymous'
    const fromRole = profile?.role ?? 'unknown'
    const replyTo = contactEmail ?? profile?.email ?? undefined

    await resend.emails.send({
      from: 'Vouchee Feedback <hello@vouchee.co.uk>',
      to: FEEDBACK_TO,
      ...(replyTo ? { replyTo } : {}),
      subject: `[${subjectType}] from ${fromName} (${fromRole})`,
      html: buildEmailHtml({
        type,
        body,
        fromName,
        fromRole,
        profileEmail: profile?.email ?? null,
        contactEmail,
        pageUrl,
        userAgent,
      }),
    })
  } catch (e) {
    console.error('Feedback email send failed:', e)
    // We still return 200 — the row is saved, just the email failed.
  }

  return NextResponse.json({ ok: true })
}

function buildEmailHtml(args: {
  type: 'bug' | 'suggestion'
  body: string
  fromName: string
  fromRole: string
  profileEmail: string | null
  contactEmail: string | null
  pageUrl: string | null
  userAgent: string | null
}): string {
  const escape = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const label = args.type === 'bug' ? 'Bug report' : 'Suggestion'
  const rows: Array<[string, string | null]> = [
    ['From', `${args.fromName} (${args.fromRole})`],
    ['Account email', args.profileEmail],
    ['Contact email', args.contactEmail],
    ['Page', args.pageUrl],
    ['Browser', args.userAgent],
  ]
  const rowsHtml = rows
    .filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#64748b;font-size:13px;">${escape(k)}</td><td style="padding:4px 0;font-size:13px;color:#0f172a;">${escape(v as string)}</td></tr>`)
    .join('')

  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:24px;">
    <div style="font-size:18px;font-weight:800;color:#0f172a;margin-bottom:4px;">New ${escape(label.toLowerCase())} on Vouchee</div>
    <div style="font-size:13px;color:#64748b;margin-bottom:20px;">Submitted via the in-app widget.</div>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin-bottom:20px;white-space:pre-wrap;font-size:14px;color:#0f172a;line-height:1.6;">${escape(args.body)}</div>
    <table style="width:100%;border-collapse:collapse;">${rowsHtml}</table>
    <div style="margin-top:24px;font-size:11px;color:#94a3b8;">Reply to this email and the user will receive your response (Reply-To is set when they provided contact details).</div>
  </div>`
}