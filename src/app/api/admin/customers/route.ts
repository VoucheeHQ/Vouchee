import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/customers
//
// Returns one row per customer with the aggregations the admin uses to spot
// top customers worth approaching for feedback:
//   - listings: how many clean_requests they've ever posted
//   - chats: how many conversations they've had
//   - chat_partners: full names of the cleaners they've chatted with
//   - accepted_cleaners: distinct cleaners they've assigned to a request
//   - paid_pence: count of confirmed payment webhook events for each of their
//     subscriptions × the monthly fee for that subscription's frequency.
//
// Why this estimate for "paid": GoCardless webhook payloads don't include the
// payment amount, but Vouchee's fees are fixed per frequency and confirmed
// events fire once per billing cycle. So count × fee = exact subscription
// spend (excluding one-off cover-clean charges and any refunds — close enough
// for ranking customers).
// ─────────────────────────────────────────────────────────────────────────────

const MONTHLY_FEE_PENCE: Record<string, number> = {
  weekly: 3996,
  fortnightly: 2998,
  monthly: 2499,
}

export async function GET(_req: NextRequest) {
  const sb = await createServerClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: roleRow } = await admin
    .from('profiles').select('role').eq('id', user.id).single() as { data: { role: string } | null }
  if (roleRow?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // ── 1. Customers + their profiles ──────────────────────────────────────────
  const { data: customers, error: cErr } = await admin
    .from('customers')
    .select('id, profile_id, created_at, profile:profiles(full_name, email)')
    .order('created_at', { ascending: false })
    .limit(1000) as { data: Array<{
      id: string
      profile_id: string
      created_at: string
      profile: { full_name: string | null; email: string | null } | null
    }> | null; error: any }

  if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 })
  if (!customers || customers.length === 0) {
    return NextResponse.json({ customers: [] })
  }

  const customerIds = customers.map(c => c.id)

  // ── 2. clean_requests for these customers ─────────────────────────────────
  const { data: requests } = await admin
    .from('clean_requests')
    .select('customer_id, assigned_cleaner_id, frequency, gocardless_subscription_id')
    .in('customer_id', customerIds) as { data: Array<{
      customer_id: string
      assigned_cleaner_id: string | null
      frequency: string | null
      gocardless_subscription_id: string | null
    }> | null }

  // ── 3. conversations for these customers ─────────────────────────────────
  const { data: conversations } = await admin
    .from('conversations')
    .select('customer_id, cleaner_id')
    .in('customer_id', customerIds) as { data: Array<{
      customer_id: string
      cleaner_id: string | null
    }> | null }

  // ── 4. confirmed payment webhook events → count per subscription ─────────
  // gocardless_webhook_events.links is JSONB with { subscription, payment }
  // for payments.confirmed. One event per successful billing cycle.
  const { data: paymentEvents } = await admin
    .from('gocardless_webhook_events')
    .select('links')
    .eq('resource_type', 'payments')
    .eq('action', 'confirmed') as { data: Array<{ links: { subscription?: string } | null }> | null }

  const paymentCountBySub: Record<string, number> = {}
  for (const e of paymentEvents ?? []) {
    const subId = e.links?.subscription
    if (subId) paymentCountBySub[subId] = (paymentCountBySub[subId] ?? 0) + 1
  }

  // ── 5. cleaner id → full name lookup (for chat partner names) ────────────
  const cleanerIdSet = new Set<string>()
  for (const r of requests ?? []) if (r.assigned_cleaner_id) cleanerIdSet.add(r.assigned_cleaner_id)
  for (const c of conversations ?? []) if (c.cleaner_id) cleanerIdSet.add(c.cleaner_id)

  const cleanerNameById: Record<string, string> = {}
  if (cleanerIdSet.size > 0) {
    const { data: cleaners } = await admin
      .from('cleaners')
      .select('id, profile:profiles(full_name)')
      .in('id', Array.from(cleanerIdSet)) as { data: Array<{
        id: string
        profile: { full_name: string | null } | null
      }> | null }
    for (const c of cleaners ?? []) {
      cleanerNameById[c.id] = c.profile?.full_name?.trim() || '—'
    }
  }

  // ── 6. Aggregate per customer ─────────────────────────────────────────────
  const out = customers.map(c => {
    const myRequests = (requests ?? []).filter(r => r.customer_id === c.id)
    const myConversations = (conversations ?? []).filter(cv => cv.customer_id === c.id)

    const acceptedSet = new Set<string>()
    for (const r of myRequests) if (r.assigned_cleaner_id) acceptedSet.add(r.assigned_cleaner_id)

    const partnerSet = new Set<string>()
    for (const cv of myConversations) if (cv.cleaner_id) partnerSet.add(cv.cleaner_id)

    let paidPence = 0
    for (const r of myRequests) {
      if (!r.gocardless_subscription_id) continue
      const count = paymentCountBySub[r.gocardless_subscription_id] ?? 0
      const fee = MONTHLY_FEE_PENCE[r.frequency ?? 'monthly'] ?? 0
      paidPence += count * fee
    }

    const partner_names = Array.from(partnerSet)
      .map(id => cleanerNameById[id] ?? '—')
      .sort((a, b) => a.localeCompare(b))

    return {
      id: c.id,
      profile_id: c.profile_id,
      full_name: c.profile?.full_name ?? '—',
      email: c.profile?.email ?? '—',
      joined: c.created_at,
      listings: myRequests.length,
      chats: myConversations.length,
      partner_names,
      accepted_cleaners: acceptedSet.size,
      paid_pence: paidPence,
    }
  })

  return NextResponse.json({ customers: out })
}
