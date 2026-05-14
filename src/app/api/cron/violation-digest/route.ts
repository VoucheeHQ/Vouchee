import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/cron/violation-digest
//
// Hourly roll-up of keyword_violations rows that haven't been emailed yet
// (emailed_at IS NULL). Skips entirely if admin_settings.hourly_violation_digest
// is OFF — in that mode /api/log-violation fires a per-event email instead.
//
// We mark emailed_at on the digested rows so re-runs don't duplicate, and so
// any per-event email path also stays consistent (the row is "emailed" either
// way once it's been delivered).
// ─────────────────────────────────────────────────────────────────────────────

const CRON_SECRET = process.env.CRON_SECRET
const IS_PROD = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1'

const escapeHtml = (s: string) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;')

export async function GET(request: NextRequest) {
  if (IS_PROD && !CRON_SECRET) {
    console.error('CRON_SECRET is not configured — refusing to run cron')
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
  }
  if (CRON_SECRET) {
    const auth = request.headers.get('authorization')
    if (auth !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const resend = new Resend(process.env.RESEND_API_KEY!)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.vouchee.co.uk'

  // ── 1. Is the digest enabled? ───────────────────────────────────────────
  const { data: setting } = await admin
    .from('admin_settings').select('value').eq('key', 'hourly_violation_digest').single() as { data: { value: any } | null }
  const digestOn = setting?.value === true || setting?.value === 'true'
  if (!digestOn) {
    return NextResponse.json({ digest: 'off', sent: 0 })
  }

  // ── 2. Un-emailed violations from the last 25 hours ─────────────────────
  // (25h, not 1h, to absorb cron jitter and one missed run.)
  const since = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString()
  const { data: viols } = await admin
    .from('keyword_violations')
    .select('id, created_at, conversation_id, message_content, triggered_keywords, sender_role, sender_id')
    .is('emailed_at', null)
    .gte('created_at', since)
    .order('created_at', { ascending: false }) as { data: Array<{ id: string; created_at: string; conversation_id: string; message_content: string; triggered_keywords: string[]; sender_role: string; sender_id: string }> | null }

  if (!viols || viols.length === 0) {
    return NextResponse.json({ digest: 'on', sent: 0 })
  }

  // ── 3. Resolve sender names ─────────────────────────────────────────────
  const senderIds = Array.from(new Set(viols.map(v => v.sender_id)))
  const { data: profiles } = await admin
    .from('profiles').select('id, full_name').in('id', senderIds) as { data: Array<{ id: string; full_name: string | null }> | null }
  const nameMap = new Map((profiles ?? []).map(p => [p.id, p.full_name ?? 'Unknown']))

  // ── 4. Admin recipients ─────────────────────────────────────────────────
  const { data: admins } = await admin
    .from('profiles').select('email').eq('role', 'admin') as { data: Array<{ email: string }> | null }
  if (!admins || admins.length === 0) {
    return NextResponse.json({ digest: 'on', sent: 0, reason: 'no admins' })
  }

  // ── 5. Compose digest body ──────────────────────────────────────────────
  const rowsHtml = viols.map(v => `
    <div style="border-bottom:1px solid #f1f5f9;padding:12px 0;">
      <div style="font-size:13px;color:#0f172a;font-style:italic;margin-bottom:4px;">"${escapeHtml(v.message_content)}"</div>
      <div style="font-size:11px;color:#94a3b8;margin-bottom:6px;">
        ${escapeHtml(nameMap.get(v.sender_id) ?? 'Unknown')} · ${escapeHtml(String(v.sender_role))} · ${escapeHtml(new Date(v.created_at).toLocaleString('en-GB'))}
      </div>
      <div>${(v.triggered_keywords ?? []).map(k => `<span style="background:#fef2f2;color:#dc2626;border:1px solid #fecaca;border-radius:4px;padding:2px 6px;font-size:10px;font-weight:700;margin-right:4px;">${escapeHtml(k)}</span>`).join('')}</div>
    </div>
  `).join('')

  const html = `
    <div style="font-family:'DM Sans',Arial,sans-serif;max-width:560px;margin:0 auto;background:#f8fafc;padding:32px 16px;">
      <div style="background:white;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
        <div style="background:#dc2626;padding:20px 32px;">
          <div style="font-size:20px;font-weight:800;color:white;">⚠️ Hourly violation digest</div>
          <div style="font-size:13px;color:rgba(255,255,255,0.8);margin-top:4px;">${viols.length} new violation${viols.length === 1 ? '' : 's'} since the last digest</div>
        </div>
        <div style="padding:8px 32px 24px;">
          ${rowsHtml}
          <a href="${appUrl}/admin/dashboard" style="display:inline-block;margin-top:20px;background:#dc2626;color:white;text-decoration:none;border-radius:10px;padding:12px 24px;font-size:14px;font-weight:700;">
            Open Admin Portal →
          </a>
        </div>
      </div>
    </div>
  `

  // ── 6. Send + mark emailed_at ───────────────────────────────────────────
  await Promise.all(admins.map(a =>
    resend.emails.send({
      from: 'Vouchee Alerts <info@vouchee.co.uk>',
      to: a.email,
      subject: `⚠️ ${viols.length} keyword violation${viols.length === 1 ? '' : 's'} on Vouchee`,
      html,
    })
  ))

  const ids = viols.map(v => v.id)
  await admin
    .from('keyword_violations')
    .update({ emailed_at: new Date().toISOString() })
    .in('id', ids)

  return NextResponse.json({ digest: 'on', sent: viols.length })
}
