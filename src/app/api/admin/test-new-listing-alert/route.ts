import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { newListingAdminAlertHtml, newListingAdminAlertSubject } from '@/lib/emails/new-listing-admin-alert'

const resend = new Resend(process.env.RESEND_API_KEY)

// ─────────────────────────────────────────────────────────────────────────
// Admin-only test: sends both flavours of the new-listing admin alert
// (live + pre-launch) to the logged-in admin's email. Imports the template
// from the same shared file production uses, so edits flow through both.
// ─────────────────────────────────────────────────────────────────────────

export async function POST(_request: NextRequest) {
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
    .from('profiles').select('role, email, full_name').eq('id', user.id).single() as { data: { role: string | null; email: string | null; full_name: string | null } | null }

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  if (profile.role !== 'admin') return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 })

  const adminEmail = profile.email ?? user.email
  if (!adminEmail) return NextResponse.json({ error: 'No email found for admin user' }, { status: 400 })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.vouchee.co.uk'

  const dummy = {
    customerName: 'Sarah Thompson',
    customerEmail: 'sarah.thompson@example.com',
    customerPhone: '07700 900123',
    zoneLabel: 'Central / South East',
    bedrooms: 3,
    bathrooms: 2,
    frequency: 'fortnightly',
    hourlyRate: 16,
    hoursPerSession: 3,
    appUrl,
  }

  // ── Live variant ─────────────────────────────────────────────────────
  let liveResult: { error: string | null; id: string | null } = { error: null, id: null }
  try {
    const { data, error } = await resend.emails.send({
      from: 'Vouchee Alerts <hello@vouchee.co.uk>',
      to: adminEmail,
      subject: `[TEST] ${newListingAdminAlertSubject({ customerName: dummy.customerName, zoneLabel: dummy.zoneLabel, isPreLaunch: false })}`,
      html: newListingAdminAlertHtml({ ...dummy, isPreLaunch: false }),
    })
    if (error) liveResult = { error: String(error), id: null }
    else liveResult = { error: null, id: data?.id ?? null }
  } catch (e: any) { liveResult = { error: e.message ?? 'unknown', id: null } }

  // ── Pre-launch variant ───────────────────────────────────────────────
  let preResult: { error: string | null; id: string | null } = { error: null, id: null }
  try {
    const { data, error } = await resend.emails.send({
      from: 'Vouchee Alerts <hello@vouchee.co.uk>',
      to: adminEmail,
      subject: `[TEST] ${newListingAdminAlertSubject({ customerName: dummy.customerName, zoneLabel: dummy.zoneLabel, isPreLaunch: true })}`,
      html: newListingAdminAlertHtml({ ...dummy, isPreLaunch: true }),
    })
    if (error) preResult = { error: String(error), id: null }
    else preResult = { error: null, id: data?.id ?? null }
  } catch (e: any) { preResult = { error: e.message ?? 'unknown', id: null } }

  return NextResponse.json({
    success: true,
    sentTo: adminEmail,
    live: liveResult,
    preLaunch: preResult,
  })
}
