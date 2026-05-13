import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'
import { newListingAdminAlertHtml, newListingAdminAlertSubject } from '@/lib/emails/new-listing-admin-alert'

const resend = new Resend(process.env.RESEND_API_KEY!)

const ZONE_LABELS: Record<string, string> = {
  central_south_east: 'Central / South East', north_west: 'North West',
  north_east_roffey: 'North East / Roffey', south_west: 'South West',
  warnham_north: 'Warnham / North', broadbridge_heath: 'Broadbridge Heath',
  mannings_heath: 'Mannings Heath', faygate_kilnwood_vale: 'Faygate / Kilnwood Vale',
  christs_hospital: "Christ's Hospital", southwater: 'Southwater',
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/send-new-listing-admin-alert
//
// Fires after a customer posts a listing (live OR pre-launch). Lands in the
// admin inbox so the founder sees every new request in real time.
//
// Auth: caller must be the customer who owns the listing. Mirrors the
// pattern used by /api/send-pre-launch-confirmation.
// ─────────────────────────────────────────────────────────────────────────────

const ADMIN_INBOX = 'cleaners@vouchee.co.uk'

export async function POST(request: NextRequest) {
  const supabaseAuth = await createClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    const { requestId } = await request.json()
    if (!requestId) return NextResponse.json({ error: 'Missing requestId' }, { status: 400 })

    const { data: req } = await admin
      .from('clean_requests')
      .select('id, customer_id, zone, status, bedrooms, bathrooms, frequency, hourly_rate, hours_per_session')
      .eq('id', requestId)
      .single() as { data: { id: string; customer_id: string; zone: string | null; status: string; bedrooms: number; bathrooms: number; frequency: string | null; hourly_rate: number | null; hours_per_session: number | null } | null }
    if (!req) return NextResponse.json({ error: 'Request not found' }, { status: 404 })

    const { data: customer } = await admin
      .from('customers').select('profile_id').eq('id', req.customer_id).single() as { data: { profile_id: string } | null }
    if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })

    // Ownership check.
    if (customer.profile_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: profile } = await admin
      .from('profiles').select('full_name, email, phone').eq('id', customer.profile_id).single() as { data: { full_name: string | null; email: string | null; phone: string | null } | null }

    const customerName = profile?.full_name ?? 'A customer'
    const customerEmail = profile?.email ?? ''
    const customerPhone = profile?.phone ?? null
    const zoneLabel = req.zone ? (ZONE_LABELS[req.zone] ?? req.zone) : 'Horsham'
    const isPreLaunch = req.status === 'pre_launch_pending'
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.vouchee.co.uk'

    await resend.emails.send({
      from: 'Vouchee Alerts <hello@vouchee.co.uk>',
      to: ADMIN_INBOX,
      subject: newListingAdminAlertSubject({ customerName, zoneLabel, isPreLaunch }),
      html: newListingAdminAlertHtml({
        customerName,
        customerEmail,
        customerPhone,
        zoneLabel,
        bedrooms: req.bedrooms,
        bathrooms: req.bathrooms,
        frequency: req.frequency ?? '',
        hourlyRate: req.hourly_rate,
        hoursPerSession: req.hours_per_session,
        isPreLaunch,
        appUrl,
      }),
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('send-new-listing-admin-alert error:', err)
    return NextResponse.json({ error: err.message ?? 'Failed' }, { status: 500 })
  }
}
