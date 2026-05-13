import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { preLaunchReceivedHtml, preLaunchReceivedSubject } from '@/lib/emails/pre-launch-received'
import { preLaunch24hHtml, preLaunch24hSubject } from '@/lib/emails/pre-launch-24h-reminder'

const resend = new Resend(process.env.RESEND_API_KEY)

// ─────────────────────────────────────────────────────────────────────────
// Admin-only test endpoint — sends both pre-launch emails (received +
// 24h reminder) to the logged-in admin's profile email.
//
// IMPORTANT: This route imports its templates from the SAME shared library
// files that production uses:
//   - src/lib/emails/pre-launch-received.ts
//   - src/lib/emails/pre-launch-24h-reminder.ts
// Editing those templates updates both the live emails and these tests
// automatically. What you preview here is byte-for-byte what real customers
// will receive.
// ─────────────────────────────────────────────────────────────────────────

export async function POST(_request: NextRequest) {
  // ─── Auth ──────────────────────────────────────────────────────────────
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {}
        },
      },
    }
  )

  const { data: { user }, error: userErr } = await supabase.auth.getUser()
  if (userErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, email, full_name')
    .eq('id', user.id)
    .single() as { data: { role: string | null; email: string | null; full_name: string | null } | null }

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  if (profile.role !== 'admin') return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 })

  const adminEmail = profile.email ?? user.email
  if (!adminEmail) return NextResponse.json({ error: 'No email found for admin user' }, { status: 400 })

  const firstName = (profile.full_name ?? 'Test').trim().split(' ')[0]
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.vouchee.co.uk'
  // Placeholder request id for the confirm link. The endpoint redirects with
  // pre_launch_confirm=notfound if you click it, which is the expected
  // behaviour for a test — no real listing gets stamped.
  const placeholderRequestId = '00000000-0000-0000-0000-000000000000'

  // ─── 1. Pre-launch "got your request" email ────────────────────────────
  let receivedResult: { error: string | null; id: string | null } = { error: null, id: null }
  try {
    const { data, error } = await resend.emails.send({
      from: 'Vouchee <hello@vouchee.co.uk>',
      to: adminEmail,
      subject: `[TEST] ${preLaunchReceivedSubject()}`,
      html: preLaunchReceivedHtml({
        customerFirstName: firstName,
        zoneLabel: 'Central / South East',
        appUrl,
      }),
    })
    if (error) {
      receivedResult = { error: String(error), id: null }
      console.error('[Test] pre-launch received email failed:', error)
    } else {
      receivedResult = { error: null, id: data?.id ?? null }
    }
  } catch (e: any) {
    receivedResult = { error: e.message ?? 'unknown', id: null }
    console.error('[Test] pre-launch received email threw:', e)
  }

  // ─── 2. 24-hour reminder email ─────────────────────────────────────────
  let reminderResult: { error: string | null; id: string | null } = { error: null, id: null }
  try {
    const confirmUrl = `${appUrl}/api/pre-launch-confirm?id=${placeholderRequestId}`
    const { data, error } = await resend.emails.send({
      from: 'Vouchee <hello@vouchee.co.uk>',
      to: adminEmail,
      subject: `[TEST] ${preLaunch24hSubject()}`,
      html: preLaunch24hHtml({
        customerFirstName: firstName,
        zoneLabel: 'Central / South East',
        confirmUrl,
        appUrl,
      }),
    })
    if (error) {
      reminderResult = { error: String(error), id: null }
      console.error('[Test] 24h reminder email failed:', error)
    } else {
      reminderResult = { error: null, id: data?.id ?? null }
    }
  } catch (e: any) {
    reminderResult = { error: e.message ?? 'unknown', id: null }
    console.error('[Test] 24h reminder email threw:', e)
  }

  return NextResponse.json({
    success: true,
    sentTo: adminEmail,
    received: receivedResult,
    reminder: reminderResult,
  })
}
