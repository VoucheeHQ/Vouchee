import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { Resend } from 'resend'
import { coverFeedbackPromptHtml } from '@/lib/emails/cover-feedback-prompt'

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/test-cover-feedback-email
//
// Admin-only test harness for the cover-feedback prompt email that the
// daily /api/cron/nudge-cover-feedback fires ~24h after a cover_date.
// Sends to the logged-in admin's email. The CTA in the email links to
// /cover-feedback/[requestId]; we plug in a real cover clean_request id
// if one exists (so the link works end-to-end), and fall back to a
// placeholder otherwise.
// ─────────────────────────────────────────────────────────────────────────────

const resend = new Resend(process.env.RESEND_API_KEY!)

export async function POST(_request: NextRequest) {
  const supabaseAuth = await createServerClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data: profile } = await supabaseAdmin
    .from('profiles').select('role, email, full_name').eq('id', user.id).single() as { data: { role: string; email: string; full_name: string | null } | null }
  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.vouchee.co.uk'

  // Try to pick up a real fulfilled cover request so the CTA link
  // resolves to a working /cover-feedback/[requestId] page. Falls back
  // to the canonical test cleaner from CLAUDE.md for the cleaner name,
  // and to a placeholder request id if no cover exists yet.
  const TEST_CLEANER_ID = 'bb255bfa-8548-44bd-9a1c-1bb0611746a3'

  const { data: latestCover } = await supabaseAdmin
    .from('clean_requests')
    .select('id, assigned_cleaner_id')
    .eq('service_type', 'cover')
    .eq('status', 'fulfilled')
    .order('cover_date', { ascending: false })
    .limit(1)
    .maybeSingle() as { data: { id: string; assigned_cleaner_id: string | null } | null }

  const cleanerIdForName = latestCover?.assigned_cleaner_id ?? TEST_CLEANER_ID
  const { data: cleaner } = await supabaseAdmin
    .from('cleaners').select('profile_id').eq('id', cleanerIdForName).single() as { data: { profile_id: string } | null }
  const { data: cleanerProfile } = cleaner
    ? await supabaseAdmin.from('profiles').select('full_name').eq('id', cleaner.profile_id).single() as { data: { full_name: string | null } | null }
    : { data: null }

  const customerFirstName = profile.full_name?.split(' ')[0] ?? 'Adam'
  const cleanerFirstName = cleanerProfile?.full_name?.split(' ')[0] ?? 'Alison'
  const cleanRequestId = latestCover?.id ?? 'preview'

  try {
    const result = await resend.emails.send({
      from: 'Vouchee <hello@vouchee.co.uk>',
      to: profile.email,
      subject: `[TEST] How did your cover clean go with ${cleanerFirstName}?`,
      html: coverFeedbackPromptHtml({ appUrl, customerFirstName, cleanerFirstName, cleanRequestId }),
    })
    return NextResponse.json({
      success: true,
      sentTo: profile.email,
      emailId: result.data?.id,
      ctaTarget: `/cover-feedback/${cleanRequestId}`,
      usedRealCover: !!latestCover,
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message ?? 'send failed' }, { status: 500 })
  }
}
