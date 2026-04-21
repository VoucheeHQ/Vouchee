import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  // Verify caller is admin
  const supabaseUser = await createClient()
  const { data: { user } } = await supabaseUser.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: profile } = await supabaseUser
    .from('profiles').select('role').eq('id', user.id).single()
  if (!profile || (profile as any).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Use service role to bypass RLS for all admin writes
  const admin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const body = await request.json()
  const { action } = body

  // ── Suspend / reinstate user ─────────────────────────────────────────────
  if (action === 'suspend_user') {
    const { userId, suspended } = body
    if (!userId || typeof suspended !== 'boolean') {
      return NextResponse.json({ error: 'Missing userId or suspended' }, { status: 400 })
    }
    const { error } = await admin.from('profiles').update({ suspended } as any).eq('id', userId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  // ── Hide / unhide listing ─────────────────────────────────────────────────
  if (action === 'hide_listing') {
    const { listingId, hidden } = body
    if (!listingId || typeof hidden !== 'boolean') {
      return NextResponse.json({ error: 'Missing listingId or hidden' }, { status: 400 })
    }
    const { error } = await admin.from('clean_requests').update({ hidden } as any).eq('id', listingId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  // ── Delete listing ────────────────────────────────────────────────────────
  if (action === 'delete_listing') {
    const { listingId } = body
    if (!listingId) {
      return NextResponse.json({ error: 'Missing listingId' }, { status: 400 })
    }
    const { error } = await admin.from('clean_requests').update({ status: 'deleted' } as any).eq('id', listingId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  // ── Save cleaner interview (notes + qualifying + platform + status) ──────
  // Moves cleaner into 'in_review' state if not already approved/rejected
  if (action === 'save_interview') {
    const { cleanerId, notes, qualifying, platform } = body
    if (!cleanerId) {
      return NextResponse.json({ error: 'Missing cleanerId' }, { status: 400 })
    }

    // Only bump to in_review if currently submitted (don't override approved/rejected)
    const { data: current } = await admin
      .from('cleaners')
      .select('application_status')
      .eq('id', cleanerId)
      .single() as { data: { application_status: string } | null }

    const nextStatus =
      current?.application_status === 'submitted' ? 'in_review' : current?.application_status

    const { error } = await admin
      .from('cleaners')
      .update({
        interview_notes: notes ?? null,
        interview_qualifying: qualifying ?? null,
        interview_platform: platform ?? null,
        interview_conducted_at: new Date().toISOString(),
        interview_conducted_by: user.id,
        application_status: nextStatus,
      } as any)
      .eq('id', cleanerId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  // ── Approve cleaner ───────────────────────────────────────────────────────
  // Sets application_status='approved', stamps approved_at/by, sends a
  // cleaner-facing notification so they see the news on their dashboard.
  if (action === 'approve_cleaner') {
    const { cleanerId } = body
    if (!cleanerId) {
      return NextResponse.json({ error: 'Missing cleanerId' }, { status: 400 })
    }

    const { error } = await admin
      .from('cleaners')
      .update({
        application_status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: user.id,
        rejected_at: null,
        rejection_reason: null,
      } as any)
      .eq('id', cleanerId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Fire-and-forget in-app notification for the cleaner
    try {
      await admin.from('notifications').insert({
        cleaner_id: cleanerId,
        type: 'application_approved',
        title: '🎉 You\'re approved on Vouchee!',
        body: 'You can now apply to jobs. We\'ll email you details shortly.',
        link: '/cleaner/dashboard',
      } as any)
    } catch (notifyErr) {
      console.error('Approval notification insert failed (non-fatal):', notifyErr)
    }

    return NextResponse.json({ success: true })
  }

  // ── Reject cleaner ────────────────────────────────────────────────────────
  // Account stays, they can log in, but application_status='rejected' so the
  // Apply button stays locked. (See jobs/page.tsx cleanerApproved check.)
  if (action === 'reject_cleaner') {
    const { cleanerId, reason } = body
    if (!cleanerId) {
      return NextResponse.json({ error: 'Missing cleanerId' }, { status: 400 })
    }

    const { error } = await admin
      .from('cleaners')
      .update({
        application_status: 'rejected',
        rejected_at: new Date().toISOString(),
        rejection_reason: reason ?? null,
        approved_at: null,
        approved_by: null,
      } as any)
      .eq('id', cleanerId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    try {
      await admin.from('notifications').insert({
        cleaner_id: cleanerId,
        type: 'application_rejected',
        title: 'Your Vouchee application update',
        body: 'Unfortunately your application wasn\'t successful this time. Check your email for details.',
        link: '/cleaner/dashboard',
      } as any)
    } catch (notifyErr) {
      console.error('Rejection notification insert failed (non-fatal):', notifyErr)
    }

    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}