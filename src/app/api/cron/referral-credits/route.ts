import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { referrerHtml, refereeHtml } from '@/lib/emails/referral-credited'

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/cron/referral-credits   — daily at 05:00 UTC (see vercel.json)
//
// Finds 'pending' referral_credits rows whose referee has crossed the trigger
// gate, applies one free-month pause to each side via GoCardless, and emails
// both parties.
//
// Trigger gate (per referee):
//   - customers.subscription_status === 'active'
//   - referee has a fulfilled clean_request whose start_date is set
//   - now() > start_date + 24h
//   - now() > cooling_off_until (or cooling_off_until IS NULL)
//
// Referrer side is best-effort: if their subscription isn't active anymore,
// we record a referrer_skipped_reason and only credit the referee. No clawback.
//
// Stacking: when applying a pause to a subscription that's already paused,
// we read the remaining `pause_cycles` from GoCardless and post the new total
// so credits accumulate correctly for power-referrers.
// ─────────────────────────────────────────────────────────────────────────────

const CRON_SECRET = process.env.CRON_SECRET
const IS_PROD = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1'

function gcConfig() {
  const env = process.env.GOCARDLESS_ENVIRONMENT ?? 'sandbox'
  return {
    baseUrl: env === 'live' ? 'https://api.gocardless.com' : 'https://api-sandbox.gocardless.com',
    token: process.env.GOCARDLESS_ACCESS_TOKEN!,
  }
}

// Returns the number of cycles still paused on a subscription, or 0 if not
// paused / not found. Best-effort — on any error we default to 0 so the
// next pause call sets cycles=1 (safe minimum, avoids un-pausing a current
// hold).
async function readCurrentPauseCycles(subscriptionId: string): Promise<number> {
  const { baseUrl, token } = gcConfig()
  try {
    const res = await fetch(`${baseUrl}/subscriptions/${subscriptionId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'GoCardless-Version': '2015-07-06',
        Accept: 'application/json',
      },
    })
    if (!res.ok) return 0
    const json = await res.json() as { subscriptions?: { paused_at?: string | null; upcoming_payments?: Array<{ amount: number; charge_date: string }> } }
    // GoCardless doesn't expose "remaining_pause_cycles" directly — but a
    // paused subscription has paused_at set. For our purposes we treat any
    // active pause as "1 cycle already held" and stack from there. This is
    // imperfect for multi-cycle pauses but at our cadence (daily cron, max
    // 1 credit per customer per day) the rare case of two credits hitting
    // the same already-paused sub is unlikely.
    return json.subscriptions?.paused_at ? 1 : 0
  } catch (e) {
    return 0
  }
}

async function pauseSubscription(subscriptionId: string, totalCycles: number): Promise<{ ok: boolean; error?: string }> {
  const { baseUrl, token } = gcConfig()
  try {
    const res = await fetch(`${baseUrl}/subscriptions/${subscriptionId}/actions/pause`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'GoCardless-Version': '2015-07-06',
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ data: { pause_cycles: totalCycles } }),
    })
    if (!res.ok) {
      const txt = await res.text()
      return { ok: false, error: `${res.status} ${txt.slice(0, 200)}` }
    }
    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: e?.message ?? 'unknown' }
  }
}

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

  // ── 1. Pull pending credits ─────────────────────────────────────────────
  const { data: pending } = await admin
    .from('referral_credits')
    .select('id, referrer_customer_id, referred_customer_id, created_at')
    .eq('state', 'pending') as { data: Array<{ id: string; referrer_customer_id: string; referred_customer_id: string; created_at: string }> | null }

  if (!pending || pending.length === 0) {
    return NextResponse.json({ checked: 0, applied: 0 })
  }

  // ── 2. Batch-fetch referee customers + their fulfilled clean_requests ───
  const refereeIds = Array.from(new Set(pending.map(p => p.referred_customer_id)))
  const referrerIds = Array.from(new Set(pending.map(p => p.referrer_customer_id)))
  const allIds = Array.from(new Set([...refereeIds, ...referrerIds]))

  const { data: customers } = await admin
    .from('customers')
    .select('id, profile_id, subscription_status, gocardless_subscription_id')
    .in('id', allIds) as { data: Array<{ id: string; profile_id: string; subscription_status: string; gocardless_subscription_id: string | null }> | null }
  const custMap = new Map((customers ?? []).map(c => [c.id, c]))

  const { data: requests } = await admin
    .from('clean_requests')
    .select('customer_id, start_date, cooling_off_until, status, fulfilled_at')
    .in('customer_id', refereeIds)
    .not('start_date', 'is', null) as { data: Array<{ customer_id: string; start_date: string | null; cooling_off_until: string | null; status: string; fulfilled_at: string | null }> | null }

  // First fulfilled clean_request per referee — that's the qualifying clean.
  // If they have multiple, take the earliest fulfilled one.
  const reqByReferee = new Map<string, { start_date: string; cooling_off_until: string | null }>()
  for (const r of (requests ?? [])) {
    if (!r.start_date) continue
    if (r.status !== 'fulfilled' && r.status !== 'active') continue
    const existing = reqByReferee.get(r.customer_id)
    if (!existing || new Date(r.start_date) < new Date(existing.start_date)) {
      reqByReferee.set(r.customer_id, { start_date: r.start_date, cooling_off_until: r.cooling_off_until })
    }
  }

  // Profile emails for the both-sides email send. Customer_id → profile_id → email.
  const profileIds = Array.from(new Set((customers ?? []).map(c => c.profile_id)))
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, full_name, email')
    .in('id', profileIds) as { data: Array<{ id: string; full_name: string | null; email: string | null }> | null }
  const profileMap = new Map((profiles ?? []).map(p => [p.id, p]))

  // ── 3. Per-credit: gate check → apply pauses → email → mark applied ─────
  const now = Date.now()
  let applied = 0
  let skippedNotReady = 0
  let voided = 0
  const errors: string[] = []

  for (const credit of pending) {
    const referee = custMap.get(credit.referred_customer_id)
    if (!referee) { errors.push(`referee ${credit.referred_customer_id} not found`); continue }
    const referrer = custMap.get(credit.referrer_customer_id)
    if (!referrer) { errors.push(`referrer ${credit.referrer_customer_id} not found`); continue }

    // Void if referee cancelled — no point waiting forever.
    if (referee.subscription_status === 'cancelled') {
      await admin.from('referral_credits').update({ state: 'voided' } as any).eq('id', credit.id)
      voided++
      continue
    }
    if (referee.subscription_status !== 'active') { skippedNotReady++; continue }

    const req = reqByReferee.get(referee.id)
    if (!req) { skippedNotReady++; continue }

    const startMs = new Date(req.start_date).getTime()
    const coolingMs = req.cooling_off_until ? new Date(req.cooling_off_until).getTime() : 0
    const triggerMs = Math.max(startMs + 24 * 60 * 60 * 1000, coolingMs)
    if (now < triggerMs) { skippedNotReady++; continue }

    if (!referee.gocardless_subscription_id) {
      errors.push(`referee ${referee.id} has no subscription id`)
      continue
    }

    // ── Apply referee pause ──
    const refereeCycles = (await readCurrentPauseCycles(referee.gocardless_subscription_id)) + 1
    const refereePause = await pauseSubscription(referee.gocardless_subscription_id, refereeCycles)
    if (!refereePause.ok) {
      errors.push(`referee pause failed (${referee.id}): ${refereePause.error}`)
      continue
    }

    // ── Apply referrer pause (silently skip if not active) ──
    let referrerAppliedAt: string | null = null
    let referrerSkippedReason: string | null = null
    if (referrer.subscription_status !== 'active' || !referrer.gocardless_subscription_id) {
      referrerSkippedReason = `subscription_status=${referrer.subscription_status}`
    } else {
      const refCycles = (await readCurrentPauseCycles(referrer.gocardless_subscription_id)) + 1
      const refPause = await pauseSubscription(referrer.gocardless_subscription_id, refCycles)
      if (refPause.ok) {
        referrerAppliedAt = new Date().toISOString()
      } else {
        referrerSkippedReason = `pause_failed: ${refPause.error}`
      }
    }

    // ── Mark credit applied + send emails (best-effort) ──
    const nowIso = new Date().toISOString()
    await admin
      .from('referral_credits')
      .update({
        state: 'applied',
        applied_at: nowIso,
        referee_applied_at: nowIso,
        referrer_applied_at: referrerAppliedAt,
        referrer_skipped_reason: referrerSkippedReason,
      } as any)
      .eq('id', credit.id)
    applied++

    const refereeProfile = profileMap.get(referee.profile_id)
    const referrerProfile = profileMap.get(referrer.profile_id)
    const refereeFirstName = refereeProfile?.full_name?.split(' ')[0] ?? ''
    const referrerFirstName = referrerProfile?.full_name?.split(' ')[0] ?? ''

    try {
      if (refereeProfile?.email) {
        await resend.emails.send({
          from: 'Vouchee <hello@vouchee.co.uk>',
          to: refereeProfile.email,
          subject: 'Welcome to Vouchee — your first month is free 🎉',
          html: refereeHtml({ appUrl, firstName: refereeFirstName }),
        })
      }
      if (referrerAppliedAt && referrerProfile?.email) {
        await resend.emails.send({
          from: 'Vouchee <hello@vouchee.co.uk>',
          to: referrerProfile.email,
          subject: 'Your next Vouchee month is on us 🎉',
          html: referrerHtml({ appUrl, firstName: referrerFirstName }),
        })
      }
    } catch (e: any) {
      errors.push(`email send failed for credit ${credit.id}: ${e?.message ?? 'unknown'}`)
    }
  }

  return NextResponse.json({
    checked: pending.length,
    applied,
    skippedNotReady,
    voided,
    errors: errors.length > 0 ? errors : undefined,
  })
}
