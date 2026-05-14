import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/referral/attach   body: { token: string }
//
// Called by the signup wizard right after the customer row is created.
// Looks up the referrer by token, blocks self-referral, writes
// referred_by_customer_id on the caller's customer row, and inserts a
// 'pending' referral_credits row. Returns { attached: boolean, reason? }.
//
// Service-role write because:
//   - The customer might not have INSERT permission on referral_credits
//   - We want to validate self-referral server-side, not rely on a client
//     check that could be skipped
// ─────────────────────────────────────────────────────────────────────────────

const TOKEN_RE = /^[0-9a-f]{10}$/

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ attached: false, reason: 'unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null) as { token?: unknown } | null
  const raw = typeof body?.token === 'string' ? body.token : ''
  const token = raw.trim().toLowerCase()
  if (!TOKEN_RE.test(token)) {
    return NextResponse.json({ attached: false, reason: 'bad_token' })
  }

  const admin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Caller's customer row (identifies the referee).
  const { data: callerCustomer } = await admin
    .from('customers')
    .select('id, profile_id, referred_by_customer_id')
    .eq('profile_id', user.id)
    .single() as { data: { id: string; profile_id: string; referred_by_customer_id: string | null } | null }
  if (!callerCustomer) {
    return NextResponse.json({ attached: false, reason: 'no_customer_row' })
  }
  // Idempotency — if they already have a referrer set, leave it alone.
  if (callerCustomer.referred_by_customer_id) {
    return NextResponse.json({ attached: false, reason: 'already_attached' })
  }

  // Resolve token → referrer.
  const { data: referrer } = await admin
    .from('customers')
    .select('id, profile_id')
    .eq('referral_token', token)
    .single() as { data: { id: string; profile_id: string } | null }
  if (!referrer) {
    return NextResponse.json({ attached: false, reason: 'token_not_found' })
  }
  if (referrer.profile_id === callerCustomer.profile_id) {
    return NextResponse.json({ attached: false, reason: 'self_referral' })
  }

  // Two writes, best-effort sequence (no transaction needed — the update
  // is idempotent and the credit row has a UNIQUE constraint that prevents
  // duplicates on retry).
  const { error: updErr } = await admin
    .from('customers')
    .update({ referred_by_customer_id: referrer.id } as any)
    .eq('id', callerCustomer.id)
  if (updErr) {
    return NextResponse.json({ attached: false, reason: 'update_failed', detail: updErr.message }, { status: 500 })
  }

  const { error: insErr } = await admin
    .from('referral_credits')
    .insert({
      referrer_customer_id: referrer.id,
      referred_customer_id: callerCustomer.id,
      state: 'pending',
    } as any)
  if (insErr && (insErr as any).code !== '23505') {
    // 23505 = unique_violation = credit already exists for this pair → OK
    return NextResponse.json({ attached: false, reason: 'insert_failed', detail: insErr.message }, { status: 500 })
  }

  return NextResponse.json({ attached: true })
}
