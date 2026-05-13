import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'
import { preLaunchReceivedHtml, preLaunchReceivedSubject } from '@/lib/emails/pre-launch-received'

const resend = new Resend(process.env.RESEND_API_KEY!)

const ZONE_LABELS: Record<string, string> = {
  central_south_east: 'Central / South East', north_west: 'North West',
  north_east_roffey: 'North East / Roffey', south_west: 'South West',
  warnham_north: 'Warnham / North', broadbridge_heath: 'Broadbridge Heath',
  mannings_heath: 'Mannings Heath', faygate_kilnwood_vale: 'Faygate / Kilnwood Vale',
  christs_hospital: "Christ's Hospital", southwater: 'Southwater',
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/send-pre-launch-confirmation
//
// Sends the immediate "we got your request — you're on the early list"
// email to a customer who just posted a pre_launch_pending listing.
//
// Auth: caller must be the customer who owns the request. Same auth pattern
// as the rest of the email-trigger routes.
// ─────────────────────────────────────────────────────────────────────────────

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
      .select('id, customer_id, zone, status')
      .eq('id', requestId)
      .single() as { data: { id: string; customer_id: string; zone: string | null; status: string } | null }
    if (!req) return NextResponse.json({ error: 'Request not found' }, { status: 404 })

    // Only send for pre-launch listings. Live listings have their own
    // confirmation paths (cleaner applications + GoCardless flow).
    if (req.status !== 'pre_launch_pending') {
      return NextResponse.json({ skipped: 'not_pre_launch' })
    }

    const { data: customer } = await admin
      .from('customers').select('profile_id').eq('id', req.customer_id).single() as { data: { profile_id: string } | null }
    if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })

    // Ownership: caller must own the request.
    if (customer.profile_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: profile } = await admin
      .from('profiles').select('full_name, email').eq('id', customer.profile_id).single() as { data: { full_name: string | null; email: string | null } | null }
    if (!profile?.email) return NextResponse.json({ error: 'No customer email on file' }, { status: 404 })

    const firstName = profile.full_name?.split(' ')[0] ?? 'there'
    const zoneLabel = req.zone ? (ZONE_LABELS[req.zone] ?? req.zone) : 'Horsham'
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.vouchee.co.uk'

    await resend.emails.send({
      from: 'Vouchee <hello@vouchee.co.uk>',
      to: profile.email,
      subject: preLaunchReceivedSubject(),
      html: preLaunchReceivedHtml({
        customerFirstName: firstName,
        zoneLabel,
        appUrl,
      }),
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('send-pre-launch-confirmation error:', err)
    return NextResponse.json({ error: err.message ?? 'Failed' }, { status: 500 })
  }
}
