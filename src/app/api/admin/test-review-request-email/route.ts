import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { Resend } from 'resend'
import { reviewRequestHtml } from '@/lib/emails/review-request'

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/test-review-request-email
//
// Admin-only test harness for the review-request email that the daily
// /api/cron/review-requests fires ~14 days after a customer's first clean.
// Sends to the logged-in admin's email; cleaner short_id falls back to the
// test cleaner from CLAUDE.md so the CTA link works.
// ─────────────────────────────────────────────────────────────────────────────

const resend = new Resend(process.env.RESEND_API_KEY!)

export async function POST(request: NextRequest) {
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

  // Try to pick up the canonical test cleaner so the link in the email
  // resolves to a real profile. Falls back to a placeholder short_id if
  // not found.
  const TEST_CLEANER_ID = 'bb255bfa-8548-44bd-9a1c-1bb0611746a3'
  const { data: cleaner } = await supabaseAdmin
    .from('cleaners').select('short_id, profile_id').eq('id', TEST_CLEANER_ID).single() as { data: { short_id: string | null; profile_id: string } | null }
  const { data: cleanerProfile } = cleaner
    ? await supabaseAdmin.from('profiles').select('full_name').eq('id', cleaner.profile_id).single() as { data: { full_name: string | null } | null }
    : { data: null }

  const customerFirstName = profile.full_name?.split(' ')[0] ?? 'Adam'
  const cleanerFirstName = cleanerProfile?.full_name?.split(' ')[0] ?? 'Alison'
  const cleanerShortId = cleaner?.short_id ?? 'preview'

  try {
    const result = await resend.emails.send({
      from: 'Vouchee <hello@vouchee.co.uk>',
      to: profile.email,
      subject: `[TEST] How's it going with ${cleanerFirstName}?`,
      html: reviewRequestHtml({ appUrl, customerFirstName, cleanerFirstName, cleanerShortId }),
    })
    return NextResponse.json({ success: true, sentTo: profile.email, emailId: result.data?.id })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message ?? 'send failed' }, { status: 500 })
  }
}
