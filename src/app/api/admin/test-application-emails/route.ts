import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { cleanerWelcomeHtml, adminAlertHtml } from '@/lib/emails/application-received'

const resend = new Resend(process.env.RESEND_API_KEY)

// ─────────────────────────────────────────────────────────────────────────
// Admin-only test endpoint — sends both the cleaner welcome and admin alert
// emails to the logged-in admin's email, using realistic dummy applicant data.
//
// IMPORTANT: This route imports its templates from the SAME shared library
// (/src/lib/emails/application-received.ts) that production uses.
// What you preview here is byte-for-byte what real applicants will receive.
// Edit templates in that lib file and the next test will reflect the change.
// ─────────────────────────────────────────────────────────────────────────

export async function POST(_request: NextRequest) {
  // ─── Auth check ──────────────────────────────────────────────────────────
  // Use the SSR client so we can read the user's session from cookies.
  // This is the standard pattern for admin-protected API routes in App Router.
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Setting cookies in Server Components is restricted; safe to ignore here.
          }
        },
      },
    }
  )

  const { data: { user }, error: userErr } = await supabase.auth.getUser()
  if (userErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Confirm admin role and grab their email + name
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('role, email, full_name')
    .eq('id', user.id)
    .single() as { data: { role: string | null; email: string | null; full_name: string | null } | null, error: any }

  if (profileErr || !profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  if (profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 })
  }

  const adminEmail = profile.email ?? user.email
  if (!adminEmail) {
    return NextResponse.json({ error: 'No email found for admin user' }, { status: 400 })
  }

  const firstName = (profile.full_name ?? 'Test').trim().split(' ')[0]
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.vouchee.co.uk'

  // ─── 1. Send cleaner welcome email ───────────────────────────────────────
  let cleanerResult: { error: string | null; id: string | null } = { error: null, id: null }
  try {
    const { data, error } = await resend.emails.send({
      from: 'Vouchee <cleaners@vouchee.co.uk>',
      to: adminEmail,
      subject: '[TEST] Thanks for applying to Vouchee 🧹',
      html: cleanerWelcomeHtml(firstName, appUrl),
    })
    if (error) {
      cleanerResult = { error: String(error), id: null }
      console.error('[Test] Cleaner welcome email failed:', error)
    } else {
      cleanerResult = { error: null, id: data?.id ?? null }
    }
  } catch (e: any) {
    cleanerResult = { error: e.message ?? 'unknown', id: null }
    console.error('[Test] Cleaner welcome email threw:', e)
  }

  // ─── 2. Send admin alert email (with dummy applicant data) ───────────────
  let adminResult: { error: string | null; id: string | null } = { error: null, id: null }
  try {
    const { data, error } = await resend.emails.send({
      from: 'Vouchee Alerts <cleaners@vouchee.co.uk>',
      to: adminEmail,
      subject: '[TEST] 🆕 New cleaner application — Test Cleaner',
      html: adminAlertHtml({
        cleanerName: 'Test Cleaner',
        cleanerEmail: 'test.cleaner@example.com',
        cleanerPhone: '07700 900123',
        yearsExperience: '3–5 years',
        zonesLabel: 'Central / South East, North West, Southwater',
        dbsClaim: true,
        insuranceClaim: true,
        rightToWorkClaim: true,
        ownSupplies: true,
        needsCredentialsHelp: false,
        appUrl,
      }),
    })
    if (error) {
      adminResult = { error: String(error), id: null }
      console.error('[Test] Admin alert email failed:', error)
    } else {
      adminResult = { error: null, id: data?.id ?? null }
    }
  } catch (e: any) {
    adminResult = { error: e.message ?? 'unknown', id: null }
    console.error('[Test] Admin alert email threw:', e)
  }

  return NextResponse.json({
    success: true,
    sentTo: adminEmail,
    cleaner: cleanerResult,
    admin: adminResult,
  })
}