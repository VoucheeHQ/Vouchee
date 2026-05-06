import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { approvalHtml, rejectionHtml } from '@/lib/emails/cleaner-decision'

const resend = new Resend(process.env.RESEND_API_KEY)

// ─────────────────────────────────────────────────────────────────────────
// Admin-only test endpoint — sends BOTH the cleaner approval and rejection
// emails to the logged-in admin's email so you can preview both side-by-side
// without going through the full approve/reject CRM flow.
//
// IMPORTANT: This route imports its templates from the SAME shared library
// (/src/lib/emails/cleaner-decision.ts) that production uses. What you
// preview here is byte-for-byte what real cleaners will receive. Edit
// templates in that lib file and the next test will reflect the change.
//
// Uses dummy first name "Alex" so the same test inbox doesn't collide with
// real applicants when you're QA'ing.
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

  // Use a friendly dummy first name so test emails are visually distinct
  // from real correspondence. "Alex" works for any gender presentation.
  const dummyFirstName = 'Alex'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.vouchee.co.uk'

  // ─── 1. Send approval email ──────────────────────────────────────────────
  let approvalResult: { error: string | null; id: string | null } = { error: null, id: null }
  try {
    const { data, error } = await resend.emails.send({
      from: 'Vouchee <cleaners@vouchee.co.uk>',
      to: adminEmail,
      subject: `[TEST] 🎉 Welcome to Vouchee, ${dummyFirstName}!`,
      html: approvalHtml(dummyFirstName, appUrl),
    })
    if (error) {
      approvalResult = { error: String(error), id: null }
      console.error('[Test] Approval email failed:', error)
    } else {
      approvalResult = { error: null, id: data?.id ?? null }
    }
  } catch (e: any) {
    approvalResult = { error: e.message ?? 'unknown', id: null }
    console.error('[Test] Approval email threw:', e)
  }

  // ─── 2. Send rejection email ─────────────────────────────────────────────
  let rejectionResult: { error: string | null; id: string | null } = { error: null, id: null }
  try {
    const { data, error } = await resend.emails.send({
      from: 'Vouchee <cleaners@vouchee.co.uk>',
      to: adminEmail,
      subject: '[TEST] Update on your Vouchee application',
      html: rejectionHtml(dummyFirstName, appUrl),
    })
    if (error) {
      rejectionResult = { error: String(error), id: null }
      console.error('[Test] Rejection email failed:', error)
    } else {
      rejectionResult = { error: null, id: data?.id ?? null }
    }
  } catch (e: any) {
    rejectionResult = { error: e.message ?? 'unknown', id: null }
    console.error('[Test] Rejection email threw:', e)
  }

  return NextResponse.json({
    success: true,
    sentTo: adminEmail,
    approval: approvalResult,
    rejection: rejectionResult,
  })
}