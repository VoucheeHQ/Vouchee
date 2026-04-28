import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cleanerWelcomeHtml, adminAlertHtml } from '@/lib/emails/application-received'

const resend = new Resend(process.env.RESEND_API_KEY)

// Admin email — goes to the shared cleaners inbox, not a personal email.
// Keeps business alerts out of personal inboxes and sets up for team scaling.
const ADMIN_EMAIL = 'cleaners@vouchee.co.uk'

// ─────────────────────────────────────────────────────────────────────────
// Templates live in /src/lib/emails/application-received.ts.
// Edit there to change what cleaners + admins receive.
// The Admin → Tests → "Application received emails" button uses the same
// templates, so what you preview is exactly what they'll see.
// ─────────────────────────────────────────────────────────────────────────

// Human-readable zone label from zone slugs
const ZONE_LABELS: Record<string, string> = {
  central_south_east: 'Central / South East',
  north_west: 'North West',
  north_east_roffey: 'North East / Roffey',
  south_west: 'South West',
  warnham_north: 'Warnham / Surrounding North',
  broadbridge_heath: 'Broadbridge Heath',
  mannings_heath: 'Mannings Heath',
  faygate_kilnwood_vale: 'Faygate / Kilnwood Vale',
  christs_hospital: 'Christs Hospital',
  southwater: 'Southwater',
}

function zonesLabel(zones: string[] | null | undefined): string {
  if (!zones || zones.length === 0) return 'None selected'
  // If it's all 9 zones, say so
  if (zones.length >= 9) return 'All Horsham areas'
  return zones.map(z => ZONE_LABELS[z] ?? z).join(', ')
}

// Years-experience code → human label
const YEARS_LABELS: Record<string, string> = {
  '0': 'Less than 1 year',
  '1': '1–2 years',
  '3': '3–5 years',
  '6': '6–10 years',
  '11': '10+ years',
}

export async function POST(request: NextRequest) {
  // This endpoint is called from the cleaner-funnel onboarding page, right after
  // cleaners.insert() succeeds. It's unauthenticated (the cleaner at that point
  // may not be fully confirmed) — but we verify the cleaner actually exists
  // before sending, which prevents blind email spam.

  let body: any
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { cleanerId } = body
  if (!cleanerId || typeof cleanerId !== 'string') {
    return NextResponse.json({ error: 'Missing cleanerId' }, { status: 400 })
  }

  // Use service role to fetch the cleaner + profile (bypasses RLS)
  const admin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Note: we look up cleaner by profile_id (the cleaner row was just created
  // but the caller passes profile_id since that's what they have)
  const { data: cleanerRow, error: cleanerErr } = await admin
    .from('cleaners')
    .select('id, profile_id, years_experience, zones, dbs_checked, has_insurance, right_to_work, own_supplies, needs_credentials_help, application_status, created_at')
    .eq('profile_id', cleanerId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single() as { data: any | null, error: any }

  if (cleanerErr || !cleanerRow) {
    return NextResponse.json({ error: 'Cleaner not found' }, { status: 404 })
  }

  // Only send if status is 'submitted' — prevents re-sending on re-submits
  if (cleanerRow.application_status !== 'submitted') {
    return NextResponse.json({
      success: true,
      skipped: true,
      reason: `status is ${cleanerRow.application_status}, not submitted`,
    })
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('full_name, email, phone')
    .eq('id', cleanerRow.profile_id)
    .single() as { data: { full_name: string | null; email: string | null; phone: string | null } | null }

  if (!profile?.email) {
    return NextResponse.json({ error: 'Cleaner profile not found' }, { status: 404 })
  }

  const firstName = (profile.full_name ?? 'there').trim().split(' ')[0]
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.vouchee.co.uk'

  // ─── 1. Send welcome email to cleaner ────────────────────────────────────
  let cleanerResult: any = { skipped: false, error: null, id: null }
  try {
    const { data, error } = await resend.emails.send({
      from: 'Vouchee <cleaners@vouchee.co.uk>',
      to: profile.email,
      subject: 'Thanks for applying to Vouchee 🧹',
      html: cleanerWelcomeHtml(firstName, appUrl),
    })
    if (error) {
      cleanerResult = { skipped: false, error: String(error), id: null }
      console.error('Cleaner welcome email failed:', error)
    } else {
      cleanerResult = { skipped: false, error: null, id: data?.id ?? null }
    }
  } catch (e: any) {
    cleanerResult = { skipped: false, error: e.message ?? 'unknown', id: null }
    console.error('Cleaner welcome email threw:', e)
  }

  // ─── 2. Send admin alert ─────────────────────────────────────────────────
  let adminResult: any = { skipped: false, error: null, id: null }
  try {
    const { data, error } = await resend.emails.send({
      from: 'Vouchee Alerts <cleaners@vouchee.co.uk>',
      to: ADMIN_EMAIL,
      replyTo: profile.email, // replying to the alert emails the cleaner directly
      subject: `🆕 New cleaner application — ${profile.full_name ?? 'unnamed'}`,
      html: adminAlertHtml({
        cleanerName: profile.full_name ?? 'Unknown',
        cleanerEmail: profile.email,
        cleanerPhone: profile.phone ?? null,
        yearsExperience: cleanerRow.years_experience != null
          ? (YEARS_LABELS[String(cleanerRow.years_experience)] ?? `${cleanerRow.years_experience} years`)
          : null,
        zonesLabel: zonesLabel(cleanerRow.zones),
        dbsClaim: !!cleanerRow.dbs_checked,
        insuranceClaim: !!cleanerRow.has_insurance,
        rightToWorkClaim: !!cleanerRow.right_to_work,
        ownSupplies: !!cleanerRow.own_supplies,
        needsCredentialsHelp: !!cleanerRow.needs_credentials_help,
        appUrl,
      }),
    })
    if (error) {
      adminResult = { skipped: false, error: String(error), id: null }
      console.error('Admin alert email failed:', error)
    } else {
      adminResult = { skipped: false, error: null, id: data?.id ?? null }
    }
  } catch (e: any) {
    adminResult = { skipped: false, error: e.message ?? 'unknown', id: null }
    console.error('Admin alert email threw:', e)
  }

  return NextResponse.json({
    success: true,
    cleaner: cleanerResult,
    admin: adminResult,
  })
}