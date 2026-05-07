import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { jobAlertHtml, JobAlertCard } from '@/lib/emails/cleaner-job-alert'

const resend = new Resend(process.env.RESEND_API_KEY)

// ─────────────────────────────────────────────────────────────────────────
// Admin-only test endpoint — sends BOTH the regular cleaner job alert and
// the cover-clean variant to the logged-in admin's email so you can preview
// both side-by-side without going through the full publish flow.
//
// IMPORTANT: This route imports its template from the SAME shared library
// (/src/lib/emails/cleaner-job-alert.ts) that production uses. What you
// preview here is byte-for-byte what real cleaners will receive. Edit the
// template in that lib file and the next test will reflect the change.
//
// Uses dummy first name "Alex" + a fake request id so the same test inbox
// doesn't collide with real applicants when QA'ing. The Apply CTA links to
// /jobs?apply=test-... which won't resolve to a real listing — that's fine
// for a visual preview.
// ─────────────────────────────────────────────────────────────────────────

export async function POST(_request: NextRequest) {
  // ─── Auth check ──────────────────────────────────────────────────────────
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
          } catch {}
        },
      },
    }
  )

  const { data: { user }, error: userErr } = await supabase.auth.getUser()
  if (userErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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

  // ─── Build dummy cards ───────────────────────────────────────────────────
  const dummyFirstName = 'Alex'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.vouchee.co.uk'

  // Regular job — placeholder values that exercise every branch of the card
  // (rate, hours, frequency, days, time-of-day, pets-free).
  const regularCard: JobAlertCard = {
    request_id: 'test-regular-' + Date.now(),
    zone: 'central_south_east',
    service_type: 'regular',
    bedrooms: 3,
    bathrooms: 2,
    hours_per_session: 2,
    hourly_rate: 18,
    frequency: 'weekly',
    preferred_days: ['monday', 'wednesday'],
    time_of_day: 'morning',
    cover_date: null,
    time_window_start: null,
    time_window_end: null,
  }

  // Cover-clean — exercises the gradient header, purple/pink chips, cover
  // date + time window, pay-direct line, gradient CTA. Uses a date 5 days
  // out so the formatted output looks realistic.
  const coverDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()
  const coverCard: JobAlertCard = {
    request_id: 'test-cover-' + Date.now(),
    zone: 'broadbridge_heath',
    service_type: 'cover',
    bedrooms: 4,
    bathrooms: 2,
    hours_per_session: 3,
    hourly_rate: 20,
    frequency: null,
    preferred_days: null,
    time_of_day: null,
    cover_date: coverDate,
    time_window_start: '07:30',
    time_window_end: '11:30',
  }

  // ─── 1. Send regular job alert ───────────────────────────────────────────
  let regularResult: { error: string | null; id: string | null } = { error: null, id: null }
  try {
    const { data, error } = await resend.emails.send({
      from: 'Vouchee <cleaners@vouchee.co.uk>',
      to: adminEmail,
      subject: '[TEST] 🧹 New job in your area',
      html: jobAlertHtml({ firstName: dummyFirstName, jobs: [regularCard], appUrl }),
    })
    if (error) {
      regularResult = { error: String(error), id: null }
      console.error('[Test] Regular job alert email failed:', error)
    } else {
      regularResult = { error: null, id: data?.id ?? null }
    }
  } catch (e: any) {
    regularResult = { error: e.message ?? 'unknown', id: null }
    console.error('[Test] Regular job alert email threw:', e)
  }

  // ─── 2. Send cover clean alert ───────────────────────────────────────────
  let coverResult: { error: string | null; id: string | null } = { error: null, id: null }
  try {
    const { data, error } = await resend.emails.send({
      from: 'Vouchee <cleaners@vouchee.co.uk>',
      to: adminEmail,
      subject: '[TEST] 🆘 Cover clean needed in your area',
      html: jobAlertHtml({ firstName: dummyFirstName, jobs: [coverCard], appUrl }),
    })
    if (error) {
      coverResult = { error: String(error), id: null }
      console.error('[Test] Cover clean alert email failed:', error)
    } else {
      coverResult = { error: null, id: data?.id ?? null }
    }
  } catch (e: any) {
    coverResult = { error: e.message ?? 'unknown', id: null }
    console.error('[Test] Cover clean alert email threw:', e)
  }

  return NextResponse.json({
    success: true,
    sentTo: adminEmail,
    regular: regularResult,
    cover: coverResult,
  })
}