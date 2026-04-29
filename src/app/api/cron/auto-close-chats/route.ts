import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/cron/auto-close-chats
//
// Runs daily (Vercel cron, see /vercel.json). Archives conversations with no
// activity in the last 28 days, EXCEPT those tied to confirmed jobs (where
// the customer has secured a cleaner — clean_request.status = 'fulfilled').
//
// "No activity" means no message inserted in the last 28 days. We use the
// latest message's created_at, falling back to the conversation's own
// updated_at if no messages exist (rare — a conversation gets seeded with the
// cleaner's application message).
//
// Archived conversations are removed from the user's tray on next load
// (fetchUserConversations only returns rows where status = 'active').
// ─────────────────────────────────────────────────────────────────────────────

// Vercel cron requests are authenticated via a CRON_SECRET header to prevent
// arbitrary external calls firing this endpoint.
const CRON_SECRET = process.env.CRON_SECRET

export async function GET(request: NextRequest) {
  // Vercel sends "Authorization: Bearer <CRON_SECRET>" on cron-triggered calls.
  // In dev / local you can hit the endpoint without the header by skipping the
  // check when CRON_SECRET is unset, but in production it must be set.
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

  const cutoff = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString()

  // Step 1: find candidate conversations — active, with no recent message,
  // and NOT tied to a fulfilled clean_request.
  const { data: candidates, error: candidatesErr } = await admin
    .from('conversations')
    .select('id, clean_request_id, updated_at')
    .eq('status', 'active') as { data: Array<{ id: string; clean_request_id: string; updated_at: string }> | null, error: any }

  if (candidatesErr) {
    console.error('[auto-close] fetch failed:', candidatesErr)
    return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 })
  }
  if (!candidates || candidates.length === 0) {
    return NextResponse.json({ ok: true, archived: 0, message: 'No active conversations to check' })
  }

  // Step 2: get latest message timestamp per conversation
  const convIds = candidates.map(c => c.id)
  const { data: latestMsgs } = await admin
    .from('messages')
    .select('conversation_id, created_at')
    .in('conversation_id', convIds)
    .order('created_at', { ascending: false }) as { data: Array<{ conversation_id: string; created_at: string }> | null }

  const lastMessageByConv = new Map<string, string>()
  for (const m of latestMsgs ?? []) {
    if (!lastMessageByConv.has(m.conversation_id)) {
      lastMessageByConv.set(m.conversation_id, m.created_at)
    }
  }

  // Step 3: get the linked clean_request status for each (skip fulfilled)
  const requestIds = Array.from(new Set(candidates.map(c => c.clean_request_id)))
  const { data: requests } = await admin
    .from('clean_requests')
    .select('id, status')
    .in('id', requestIds) as { data: Array<{ id: string; status: string }> | null }

  const requestStatusMap = new Map((requests ?? []).map(r => [r.id, r.status]))

  // Step 4: filter — keep stale (no activity > 28d) AND not fulfilled
  const toArchive: string[] = []
  for (const conv of candidates) {
    const lastActivity = lastMessageByConv.get(conv.id) ?? conv.updated_at
    if (lastActivity > cutoff) continue // recent activity, skip

    const requestStatus = requestStatusMap.get(conv.clean_request_id)
    if (requestStatus === 'fulfilled') continue // confirmed jobs stay open

    toArchive.push(conv.id)
  }

  if (toArchive.length === 0) {
    return NextResponse.json({ ok: true, archived: 0, message: 'Nothing to archive' })
  }

  // Step 5: archive in one bulk update
  const { error: updateErr } = await (admin.from('conversations') as any)
    .update({ status: 'archived' })
    .in('id', toArchive)

  if (updateErr) {
    console.error('[auto-close] archive failed:', updateErr)
    return NextResponse.json({ error: 'Archive failed', details: updateErr }, { status: 500 })
  }

  console.log(`[auto-close] archived ${toArchive.length} conversations`)
  return NextResponse.json({ ok: true, archived: toArchive.length })
}