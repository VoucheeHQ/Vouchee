import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { Resend } from 'resend'
import { cleanerCredentialsGuideHtml } from '@/lib/emails/cleaner-credentials-guide'

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/test-credentials-guide-email
//
// Admin-only test harness for the credentials guide email that should be sent
// to cleaners who tick "Email me a simple step-by-step guide" at step 3 of
// the onboarding flow (when they don't yet have DBS / insurance / right to
// work). Sends the email to the logged-in admin's address with all three
// sections rendered so you can review the full content in one go.
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
  const firstName = profile.full_name?.split(' ')[0] ?? 'Adam'

  try {
    const result = await resend.emails.send({
      from: 'Vouchee <cleaners@vouchee.co.uk>',
      to: profile.email,
      subject: '[TEST] Your Vouchee credentials guide',
      // Render all three sections so the admin sees the full email in one
      // pass; in production each section is conditionally suppressed based
      // on what the cleaner already has.
      html: cleanerCredentialsGuideHtml({
        appUrl,
        firstName,
        hasDbs: false,
        hasInsurance: false,
        hasRightToWork: false,
      }),
    })
    return NextResponse.json({ success: true, sentTo: profile.email, emailId: result.data?.id })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message ?? 'send failed' }, { status: 500 })
  }
}
