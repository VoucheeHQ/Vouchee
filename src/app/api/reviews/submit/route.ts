import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

const REVIEW_GATE_MONTHS = 6

export async function POST(request: NextRequest) {
  // 1. Must be logged in
  const supabaseUser = await createClient()
  const { data: { user } } = await supabaseUser.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'You must be logged in to leave a review.' }, { status: 401 })
  }

  // 2. Must be a customer (not cleaner, not admin leaving reviews as if they're a customer)
  const { data: profile } = await supabaseUser
    .from('profiles').select('role, full_name').eq('id', user.id).single()
  if (!profile || ((profile as any).role !== 'customer' && (profile as any).role !== 'admin')) {
    return NextResponse.json({ error: 'Only customers can leave reviews.' }, { status: 403 })
  }
  const callerRole = (profile as any).role as string

  // 3. Parse body
  let body: any
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const { cleanerShortId, stars, reviewText } = body

  if (!cleanerShortId || typeof cleanerShortId !== 'string') {
    return NextResponse.json({ error: 'Missing cleanerShortId' }, { status: 400 })
  }
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
    return NextResponse.json({ error: 'Stars must be a whole number between 1 and 5' }, { status: 400 })
  }
  if (typeof reviewText !== 'string' || reviewText.trim().length < 10) {
    return NextResponse.json({ error: 'Please write at least 10 characters' }, { status: 400 })
  }
  if (reviewText.trim().length > 2000) {
    return NextResponse.json({ error: 'Review is too long (max 2000 characters)' }, { status: 400 })
  }

  // Use service role for write access
  const admin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 4. Resolve cleaner from short_id
  const { data: cleanerRow, error: cleanerErr } = await admin
    .from('cleaners')
    .select('id, profile_id')
    .eq('short_id', cleanerShortId)
    .single()
  if (cleanerErr || !cleanerRow) {
    return NextResponse.json({ error: 'Cleaner not found' }, { status: 404 })
  }
  const cleaner = cleanerRow as { id: string; profile_id: string }

  // 5. Prevent self-review
  if (cleaner.profile_id === user.id) {
    return NextResponse.json({ error: "You can't review yourself." }, { status: 403 })
  }

  // 6. VERIFY: this customer actually had a fulfilled clean with this cleaner
  //    Via the applications table: customer's clean_request had an application from this cleaner,
  //    that application was accepted, and the clean_request is fulfilled.
  // Admin bypasses this check (for moderation/testing)
  let verifiedCleanRequestId: string | null = null
  if (callerRole !== 'admin') {
    const { data: customerRow } = await admin
      .from('customers')
      .select('id')
      .eq('profile_id', user.id)
      .single() as { data: { id: string } | null }

    if (!customerRow) {
      return NextResponse.json({
        error: 'You must have a completed booking with this cleaner before reviewing.',
      }, { status: 403 })
    }

    const { data: history } = await admin
      .from('applications')
      .select('request_id, clean_requests!inner(id, status, customer_id)')
      .eq('cleaner_id', cleaner.id)
      .eq('status', 'accepted') as { data: Array<{
        request_id: string
        clean_requests: { id: string; status: string; customer_id: string } | null
      }> | null }

    const matching = (history ?? []).find(h =>
      h.clean_requests?.customer_id === customerRow.id &&
      h.clean_requests?.status === 'fulfilled'
    )

    if (!matching) {
      return NextResponse.json({
        error: 'You must have a completed booking with this cleaner before reviewing.',
      }, { status: 403 })
    }
    verifiedCleanRequestId = matching.request_id
  }

  // 7. Enforce 6-month gate — any existing review from this customer on this cleaner
  //    within the last REVIEW_GATE_MONTHS months blocks a new one.
  const cutoff = new Date()
  cutoff.setMonth(cutoff.getMonth() - REVIEW_GATE_MONTHS)

  const { data: recentReviews } = await admin
    .from('reviews')
    .select('id, created_at')
    .eq('cleaner_id', cleaner.id)
    .eq('customer_profile_id', user.id)
    .gte('created_at', cutoff.toISOString())
    .limit(1)

  if (recentReviews && recentReviews.length > 0) {
    return NextResponse.json({
      error: `You've already reviewed this cleaner within the last ${REVIEW_GATE_MONTHS} months. You can leave another review after that period.`,
    }, { status: 409 })
  }

  // 8. Insert the review
  const { data: inserted, error: insertErr } = await admin
    .from('reviews')
    .insert({
      cleaner_id: cleaner.id,
      customer_profile_id: user.id,
      clean_request_id: verifiedCleanRequestId,
      stars,
      body: reviewText.trim(),
    } as any)
    .select('id')
    .single()

  if (insertErr || !inserted) {
    console.error('Review insert failed:', insertErr)
    return NextResponse.json({ error: 'Failed to save review' }, { status: 500 })
  }

  // 9. Notify the cleaner (non-fatal)
  try {
    const customerFirstName = (profile as any).full_name?.split(' ')[0] ?? 'A customer'
    await admin.from('notifications').insert({
      cleaner_id: cleaner.id,
      type: 'review_received',
      title: `⭐ ${customerFirstName} left you a ${stars}-star review`,
      body: reviewText.trim().slice(0, 120) + (reviewText.trim().length > 120 ? '…' : ''),
      link: `/c/${cleanerShortId}`,
    } as any)
  } catch (e) { console.error('Review notif failed (non-fatal):', e) }

  return NextResponse.json({ success: true, reviewId: (inserted as any).id })
}