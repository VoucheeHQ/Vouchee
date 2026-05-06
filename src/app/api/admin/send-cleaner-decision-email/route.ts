import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Resend } from 'resend'
import { approvalHtml, rejectionHtml } from '@/lib/emails/cleaner-decision'

const resend = new Resend(process.env.RESEND_API_KEY!)

// ─────────────────────────────────────────────────────────────────────────
// POST /api/admin/send-cleaner-decision-email
//
// Called from /api/admin/actions when admin approves, rejects, or
// re-approves a cleaner. Loads the cleaner's profile, picks the right
// template, sends via Resend.
//
// Body: { cleanerId: string, kind: 'approval' | 'rejection', reason?: string }
//
// The `reason` field is accepted for symmetry with the actions route, but
// is intentionally NOT included in the rejection email body — the cleaner
// is given a kind, generic message. The reason stays private to admin.
//
// Auth: admin only. Forwards the caller's auth cookie from actions/route.ts
// so the SSR client can resolve the session.
// ─────────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // ─── Auth ────────────────────────────────────────────────────────────────
  const cookieStore = await cookies()
  const supabaseAuth = createServerClient(
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

  const { data: { user }, error: userErr } = await supabaseAuth.auth.getUser()
  if (userErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: callerProfile } = await supabaseAuth
    .from('profiles').select('role').eq('id', user.id).single() as { data: { role: string | null } | null }

  if (!callerProfile || callerProfile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 })
  }

  // ─── Validate body ───────────────────────────────────────────────────────
  let body: { cleanerId?: string; kind?: string; reason?: string | null }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { cleanerId, kind } = body
  if (!cleanerId) return NextResponse.json({ error: 'cleanerId required' }, { status: 400 })
  if (kind !== 'approval' && kind !== 'rejection') {
    return NextResponse.json({ error: 'kind must be "approval" or "rejection"' }, { status: 400 })
  }

  // ─── Load cleaner + profile (service role to bypass RLS) ─────────────────
  const admin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: cleaner, error: cleanerErr } = await admin
    .from('cleaners').select('id, profile_id').eq('id', cleanerId).single() as { data: { id: string; profile_id: string } | null; error: any }

  if (cleanerErr || !cleaner) {
    return NextResponse.json({ error: 'Cleaner not found' }, { status: 404 })
  }

  const { data: profile, error: profileErr } = await admin
    .from('profiles').select('full_name, email').eq('id', cleaner.profile_id).single() as { data: { full_name: string | null; email: string | null } | null; error: any }

  if (profileErr || !profile?.email) {
    return NextResponse.json({ error: 'Cleaner profile or email not found' }, { status: 404 })
  }

  const firstName = (profile.full_name ?? 'there').trim().split(' ')[0]
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.vouchee.co.uk'

  // ─── Send email ──────────────────────────────────────────────────────────
  try {
    if (kind === 'approval') {
      const { data, error } = await resend.emails.send({
        from: 'Vouchee <cleaners@vouchee.co.uk>',
        to: profile.email,
        subject: `🎉 Welcome to Vouchee, ${firstName}!`,
        html: approvalHtml(firstName, appUrl),
      })

      if (error) {
        console.error('Approval email send failed:', error)
        return NextResponse.json({ error: String(error) }, { status: 500 })
      }

      return NextResponse.json({ success: true, kind: 'approval', resendId: data?.id, sentTo: profile.email })
    }

    // kind === 'rejection'
    const { data, error } = await resend.emails.send({
      from: 'Vouchee <cleaners@vouchee.co.uk>',
      to: profile.email,
      subject: 'Update on your Vouchee application',
      html: rejectionHtml(firstName, appUrl),
    })

    if (error) {
      console.error('Rejection email send failed:', error)
      return NextResponse.json({ error: String(error) }, { status: 500 })
    }

    return NextResponse.json({ success: true, kind: 'rejection', resendId: data?.id, sentTo: profile.email })

  } catch (err: any) {
    console.error('send-cleaner-decision-email threw:', err)
    return NextResponse.json({ error: err.message ?? 'Unknown error' }, { status: 500 })
  }
}