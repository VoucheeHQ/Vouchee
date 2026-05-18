import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { Resend } from 'resend'
import { insuranceExpiryReminderHtml } from '@/lib/emails/insurance-expiry-reminder'

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/test-insurance-expiry-reminder-email
//
// Admin-only test harness for the insurance expiry reminder that the daily
// /api/cron/insurance-expiry-reminder cron fires when cleaners are within
// 30 days of their insurance expiring. Sends to the logged-in admin's
// address with a fixed 21-day-out expiry date so the copy renders sensibly.
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
  // Fixed sample: pretend the cleaner's policy expires 21 days from now.
  const daysUntilExpiry = 21
  const expiryDate = new Date(Date.now() + daysUntilExpiry * 24 * 60 * 60 * 1000)

  try {
    const result = await resend.emails.send({
      from: 'Vouchee <cleaners@vouchee.co.uk>',
      to: profile.email,
      subject: `[TEST] Renew your Vouchee insurance — expires in ${daysUntilExpiry} days`,
      html: insuranceExpiryReminderHtml({ appUrl, firstName, expiryDate, daysUntilExpiry }),
    })
    return NextResponse.json({ success: true, sentTo: profile.email, emailId: result.data?.id })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message ?? 'send failed' }, { status: 500 })
  }
}
