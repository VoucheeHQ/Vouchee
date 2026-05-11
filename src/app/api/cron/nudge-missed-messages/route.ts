import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/cron/nudge-missed-messages
//
// Runs daily (see vercel.json). Emails customers who have an unanswered
// cleaner message in the 4–48h window.
//
// The window is intentional:
//   < 4h  → too soon, the customer might still be about to reply
//   > 48h → too old, a second nudge becomes noise
//
// Because the cron runs daily and the window is 44h wide, each unanswered
// message triggers at most one nudge email unless the cleaner sends a fresh
// message (which resets the clock).
// ─────────────────────────────────────────────────────────────────────────────

const CRON_SECRET = process.env.CRON_SECRET

export async function GET(request: NextRequest) {
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

  const now = new Date()
  const windowStart = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString()
  const windowEnd   = new Date(now.getTime() -  4 * 60 * 60 * 1000).toISOString()

  // ── 1. Get all messages sent by cleaners in the nudge window ──────────────
  const { data: cleanerMessages, error: msgErr } = await admin
    .from('messages')
    .select('id, conversation_id, created_at')
    .eq('sender_role', 'cleaner')
    .gte('created_at', windowStart)
    .lte('created_at', windowEnd)
    .order('created_at', { ascending: false }) as { data: Array<{ id: string; conversation_id: string; created_at: string }> | null; error: any }

  if (msgErr || !cleanerMessages?.length) {
    console.log('nudge-missed-messages: no candidate messages', msgErr)
    return NextResponse.json({ nudged: 0 })
  }

  // Deduplicate: one nudge per conversation
  const uniqueConvs = new Map<string, string>() // convId → most-recent cleaner message created_at
  for (const m of cleanerMessages) {
    if (!uniqueConvs.has(m.conversation_id)) uniqueConvs.set(m.conversation_id, m.created_at)
  }

  const convIds = Array.from(uniqueConvs.keys())

  // ── 2. For each candidate conversation, check if customer replied since ──
  const { data: customerReplies } = await admin
    .from('messages')
    .select('conversation_id, created_at')
    .eq('sender_role', 'customer')
    .in('conversation_id', convIds)
    .gte('created_at', windowStart) as { data: Array<{ conversation_id: string; created_at: string }> | null }

  const repliedConvs = new Set((customerReplies ?? []).map(r => r.conversation_id))

  // Keep only conversations where customer has NOT replied since the cleaner's message
  const unansweredConvIds = convIds.filter(id => !repliedConvs.has(id))

  if (!unansweredConvIds.length) {
    console.log('nudge-missed-messages: all candidates have customer replies')
    return NextResponse.json({ nudged: 0 })
  }

  // ── 3. Get conversation + customer details for unanswered convs ───────────
  const { data: conversations } = await admin
    .from('conversations')
    .select('id, customer_id, cleaner_id, clean_request_id')
    .in('id', unansweredConvIds) as { data: Array<{ id: string; customer_id: string; cleaner_id: string; clean_request_id: string }> | null }

  if (!conversations?.length) return NextResponse.json({ nudged: 0 })

  // Filter to active requests only — don't nudge on fulfilled/deleted/cancelled
  const requestIds = conversations.map(c => c.clean_request_id)
  const { data: activeRequests } = await admin
    .from('clean_requests')
    .select('id')
    .in('id', requestIds)
    .in('status', ['active', 'pending']) as { data: Array<{ id: string }> | null }

  const activeRequestIds = new Set((activeRequests ?? []).map(r => r.id))
  const activeConvs = conversations.filter(c => activeRequestIds.has(c.clean_request_id))

  // Get customer profiles (customer_id is profile_id for customer side)
  const customerProfileIds = [...new Set(activeConvs.map(c => c.customer_id))]
  const { data: customerProfiles } = await admin
    .from('profiles')
    .select('id, full_name, email')
    .in('id', customerProfileIds) as { data: Array<{ id: string; full_name: string | null; email: string | null }> | null }

  const profileMap = new Map((customerProfiles ?? []).map(p => [p.id, p]))

  // Get cleaner names
  const cleanerIds = [...new Set(activeConvs.map(c => c.cleaner_id))]
  const { data: cleanerRecords } = await admin
    .from('cleaners')
    .select('id, profile_id')
    .in('id', cleanerIds) as { data: Array<{ id: string; profile_id: string }> | null }

  const cleanerProfileIds = (cleanerRecords ?? []).map(c => c.profile_id)
  const { data: cleanerProfiles } = await admin
    .from('profiles')
    .select('id, full_name')
    .in('id', cleanerProfileIds) as { data: Array<{ id: string; full_name: string | null }> | null }

  const cleanerIdToProfileId = new Map((cleanerRecords ?? []).map(c => [c.id, c.profile_id]))
  const cleanerProfileMap = new Map((cleanerProfiles ?? []).map(p => [p.id, p]))

  // ── 4. Send one email per customer (one email covering all their unanswered convs) ──
  // Group by customer
  const byCustomer = new Map<string, typeof activeConvs>()
  for (const conv of activeConvs) {
    const list = byCustomer.get(conv.customer_id) ?? []
    list.push(conv)
    byCustomer.set(conv.customer_id, list)
  }

  let nudged = 0
  for (const [profileId, convs] of byCustomer) {
    const customer = profileMap.get(profileId)
    if (!customer?.email) continue

    const firstName = customer.full_name?.split(' ')[0] ?? 'there'
    const count = convs.length

    // Build cleaner name list
    const cleanerNames = convs.map(c => {
      const pid = cleanerIdToProfileId.get(c.cleaner_id)
      const cp = pid ? cleanerProfileMap.get(pid) : null
      const name = cp?.full_name ?? 'A cleaner'
      const parts = name.trim().split(' ')
      return parts.length > 1 ? `${parts[0]} ${parts[parts.length-1][0]}.` : parts[0]
    })

    const cleanerText = cleanerNames.length === 1
      ? cleanerNames[0]
      : `${cleanerNames.slice(0, -1).join(', ')} and ${cleanerNames[cleanerNames.length - 1]}`

    const subject = count === 1
      ? `💬 ${cleanerText} is waiting to hear from you`
      : `💬 ${count} cleaners are waiting to hear from you`

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:40px 16px;">
  <tr><td align="center">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
    <tr><td style="background:#ffffff;padding:32px 40px;text-align:center;border-radius:16px 16px 0 0;">
      <img src="https://www.vouchee.co.uk/full-logo-black.png" width="220" height="50" alt="Vouchee" style="display:block;margin:0 auto 20px;max-width:100%;" />
      <div style="font-size:28px;font-weight:800;color:#0f172a;letter-spacing:-0.5px;">You've got a message 💬</div>
    </td></tr>
    <tr><td style="background:white;padding:32px 40px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 16px 16px;">
      <p style="font-size:15px;color:#475569;line-height:1.7;margin:0 0 20px;">
        Hey ${firstName} — <strong>${cleanerText}</strong> ${count === 1 ? 'has' : 'have'} sent you a message${count === 1 ? '' : ' each'} on Vouchee and ${count === 1 ? "hasn't" : "haven't"} heard back yet.
      </p>
      <p style="font-size:14px;color:#64748b;line-height:1.6;margin:0 0 28px;">
        A quick reply goes a long way — cleaners are much more likely to stay engaged when customers respond promptly.
      </p>
      <a href="${appUrl}/customer/dashboard" style="display:block;background:#2563eb;color:white;text-align:center;padding:15px;border-radius:10px;font-size:15px;font-weight:700;text-decoration:none;">Open your dashboard →</a>
      <p style="font-size:12px;color:#94a3b8;text-align:center;margin:24px 0 0;line-height:1.6;">
        Questions? <a href="mailto:hello@vouchee.co.uk" style="color:#94a3b8;">hello@vouchee.co.uk</a>
      </p>
    </td></tr>
    <tr><td style="padding:20px 0;text-align:center;">
      <p style="margin:0;font-size:12px;color:#94a3b8;">© 2026 Vouchee · <a href="https://www.vouchee.co.uk" style="color:#94a3b8;text-decoration:none;">vouchee.co.uk</a></p>
    </td></tr>
  </table>
  </td></tr>
</table>
</body>
</html>`

    try {
      await resend.emails.send({
        from: 'Vouchee <hello@vouchee.co.uk>',
        to: customer.email,
        subject,
        html,
      })
      nudged++
      console.log(`nudge-missed-messages: nudged ${customer.email} (${count} conv${count > 1 ? 's' : ''})`)
    } catch (e) {
      console.error(`nudge-missed-messages: failed for ${customer.email}:`, e)
    }
  }

  return NextResponse.json({ nudged, checked: unansweredConvIds.length })
}