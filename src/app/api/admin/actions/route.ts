import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

const DOC_COLUMN_MAP: Record<string, { url: string; verified: string; expiry: string; uploaded_at: string }> = {
  dbs: {
    url: 'dbs_file_url', verified: 'dbs_verified',
    expiry: 'dbs_expiry', uploaded_at: 'dbs_uploaded_at',
  },
  insurance: {
    url: 'insurance_file_url', verified: 'insurance_verified',
    expiry: 'insurance_expiry', uploaded_at: 'insurance_uploaded_at',
  },
  right_to_work: {
    url: 'right_to_work_file_url', verified: 'right_to_work_verified',
    expiry: 'right_to_work_expiry', uploaded_at: 'right_to_work_uploaded_at',
  },
}

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

  // ── Save cleaner interview ────────────────────────────────────────────────
  if (action === 'save_interview') {
    const { cleanerId, notes, qualifying, platform } = body
    if (!cleanerId) return NextResponse.json({ error: 'Missing cleanerId' }, { status: 400 })

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
  if (action === 'approve_cleaner') {
    const { cleanerId } = body
    if (!cleanerId) return NextResponse.json({ error: 'Missing cleanerId' }, { status: 400 })

    const { error } = await admin
      .from('cleaners')
      .update({
        application_status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: user.id,
        rejected_at: null,
        rejection_reason: null,
        suspension_reason: null,
        suspended_at: null,
      } as any)
      .eq('id', cleanerId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    try {
      await admin.from('notifications').insert({
        cleaner_id: cleanerId,
        type: 'application_approved',
        title: '🎉 You\'re approved on Vouchee!',
        body: 'You can now apply to jobs. We\'ll email you details shortly.',
        link: '/cleaner/dashboard',
      } as any)
    } catch (e) { console.error('Approval notif failed:', e) }

    // Fire approval email (non-fatal — CRM action still succeeds if email bombs)
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.vouchee.co.uk'
      const emailRes = await fetch(`${appUrl}/api/admin/send-cleaner-decision-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Forward the user's auth cookie so the email route's admin check passes
          cookie: request.headers.get('cookie') ?? '',
        },
        body: JSON.stringify({ cleanerId, kind: 'approval' }),
      })
      if (!emailRes.ok) {
        const errText = await emailRes.text()
        console.error('Approval email send failed (non-fatal):', errText)
      }
    } catch (e) { console.error('Approval email error (non-fatal):', e) }

    return NextResponse.json({ success: true })
  }

  // ── Reject cleaner ────────────────────────────────────────────────────────
  if (action === 'reject_cleaner') {
    const { cleanerId, reason } = body
    if (!cleanerId) return NextResponse.json({ error: 'Missing cleanerId' }, { status: 400 })

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
    } catch (e) { console.error('Rejection notif failed:', e) }

    // Fire rejection email (non-fatal)
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.vouchee.co.uk'
      const emailRes = await fetch(`${appUrl}/api/admin/send-cleaner-decision-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: request.headers.get('cookie') ?? '',
        },
        body: JSON.stringify({ cleanerId, kind: 'rejection', reason: reason ?? null }),
      })
      if (!emailRes.ok) {
        const errText = await emailRes.text()
        console.error('Rejection email send failed (non-fatal):', errText)
      }
    } catch (e) { console.error('Rejection email error (non-fatal):', e) }

    return NextResponse.json({ success: true })
  }

  // ── Update document expiry only (no file re-upload) ───────────────────────
  if (action === 'update_doc_expiry') {
    const { cleanerId, docType, expiry } = body
    if (!cleanerId || !docType || !DOC_COLUMN_MAP[docType]) {
      return NextResponse.json({ error: 'Missing/invalid cleanerId or docType' }, { status: 400 })
    }
    const cols = DOC_COLUMN_MAP[docType]
    const { error } = await admin
      .from('cleaners')
      .update({ [cols.expiry]: expiry && expiry.trim() ? expiry : null } as any)
      .eq('id', cleanerId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  // ── Remove a document (unverify, clear URL + expiry) ─────────────────────
  // Deletes the Storage file too to avoid orphans.
  if (action === 'remove_document') {
    const { cleanerId, docType } = body
    if (!cleanerId || !docType || !DOC_COLUMN_MAP[docType]) {
      return NextResponse.json({ error: 'Missing/invalid cleanerId or docType' }, { status: 400 })
    }
    const cols = DOC_COLUMN_MAP[docType]

    // Fetch current URL so we can delete the Storage object
    const { data: row } = await admin
      .from('cleaners')
      .select(cols.url)
      .eq('id', cleanerId)
      .single() as { data: Record<string, any> | null }

    const currentUrl = row?.[cols.url] as string | undefined
    if (currentUrl) {
      // Signed URLs contain the path after `/object/sign/cleaner-documents/`
      // Extract path: split on that marker
      try {
        const marker = '/object/sign/cleaner-documents/'
        const idx = currentUrl.indexOf(marker)
        if (idx >= 0) {
          const pathWithQuery = currentUrl.slice(idx + marker.length)
          const path = pathWithQuery.split('?')[0]
          await admin.storage.from('cleaner-documents').remove([decodeURIComponent(path)])
        }
      } catch (e) { console.warn('Could not parse storage path from URL, skipping delete:', e) }
    }

    const { error } = await admin
      .from('cleaners')
      .update({
        [cols.url]: null,
        [cols.verified]: false,
        [cols.expiry]: null,
        [cols.uploaded_at]: null,
      } as any)
      .eq('id', cleanerId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  // ── Re-approve a suspended cleaner (after they've re-submitted docs) ─────
  // Requires all 3 documents to be verified.
  if (action === 'reapprove_cleaner') {
    const { cleanerId } = body
    if (!cleanerId) return NextResponse.json({ error: 'Missing cleanerId' }, { status: 400 })

    const { data: c } = await admin
      .from('cleaners')
      .select('dbs_verified, insurance_verified, right_to_work_verified, application_status')
      .eq('id', cleanerId)
      .single() as { data: { dbs_verified: boolean; insurance_verified: boolean; right_to_work_verified: boolean; application_status: string } | null }

    if (!c) return NextResponse.json({ error: 'Cleaner not found' }, { status: 404 })
    if (!c.dbs_verified || !c.insurance_verified || !c.right_to_work_verified) {
      return NextResponse.json({
        error: 'All three documents (DBS, Insurance, Right to Work) must be verified before re-approving.',
      }, { status: 400 })
    }

    const { error } = await admin
      .from('cleaners')
      .update({
        application_status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: user.id,
        suspension_reason: null,
        suspended_at: null,
      } as any)
      .eq('id', cleanerId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    try {
      await admin.from('notifications').insert({
        cleaner_id: cleanerId,
        type: 'application_reapproved',
        title: '✅ You\'re re-approved on Vouchee',
        body: 'Thanks for resubmitting your documents. You can apply to jobs again.',
        link: '/cleaner/dashboard',
      } as any)
    } catch (e) { console.error('Reapproval notif failed:', e) }

    // Fire approval email — reapproval uses the same email template as a fresh approval
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.vouchee.co.uk'
      const emailRes = await fetch(`${appUrl}/api/admin/send-cleaner-decision-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: request.headers.get('cookie') ?? '',
        },
        body: JSON.stringify({ cleanerId, kind: 'approval' }),
      })
      if (!emailRes.ok) {
        const errText = await emailRes.text()
        console.error('Re-approval email send failed (non-fatal):', errText)
      }
    } catch (e) { console.error('Re-approval email error (non-fatal):', e) }

    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}