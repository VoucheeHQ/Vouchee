import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    const body = await request.json()
    const { applicationId, requestId, conversationId, startDate } = body

    if (!applicationId || !requestId || !conversationId || !startDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // 1. Get the clean request
    const { data: cleanRequest, error: reqError } = await supabaseAdmin
      .from('clean_requests')
      .select('id, customer_id, bedrooms, bathrooms, frequency, hourly_rate, hours_per_session, tasks, zone')
      .eq('id', requestId)
      .single()

    if (reqError || !cleanRequest) {
      console.error('Clean request lookup failed:', reqError)
      return NextResponse.json({ error: 'Clean request not found' }, { status: 404 })
    }

    // 2. Get the customer profile and address
    const { data: customerRecord, error: customerError } = await supabaseAdmin
      .from('customers')
      .select('id, profile_id, address_line1, address_line2, city, postcode, gocardless_mandate_id')
      .eq('id', cleanRequest.customer_id)
      .single()

    if (customerError || !customerRecord) {
      console.error('Customer lookup failed:', customerError)
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // ── Switch path: customer already has an active mandate ─────────────────
    // This happens when the customer is finding a replacement cleaner after a
    // switch. We skip the GoCardless hosted billing page entirely and let
    // confirm-switch create the subscription on the existing mandate.
    if (customerRecord.gocardless_mandate_id) {
      console.log('Existing mandate detected — returning direct confirm path:', customerRecord.gocardless_mandate_id)
      return NextResponse.json({
        type: 'existing_mandate',
        mandateId: customerRecord.gocardless_mandate_id,
      })
    }

    // ── Normal path: new customer, no mandate yet ────────────────────────────
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('full_name, email')
      .eq('id', customerRecord.profile_id)
      .single()

    if (profileError || !profile) {
      console.error('Profile lookup failed:', profileError)
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const gcEnvironment = process.env.GOCARDLESS_ENVIRONMENT ?? 'sandbox'
    const gcBaseUrl = gcEnvironment === 'live'
      ? 'https://api.gocardless.com'
      : 'https://api-sandbox.gocardless.com'
    const gcToken = process.env.GOCARDLESS_ACCESS_TOKEN!
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.vouchee.co.uk'

    // GoCardless metadata has a hard limit of 3 keys
    const meta = {
      vouchee_request_id: String(requestId),
      vouchee_application_id: String(applicationId),
      vouchee_conversation_id: String(conversationId),
    }

    // 3. Create GoCardless billing request (mandate only)
    const billingRequestRes = await fetch(`${gcBaseUrl}/billing_requests`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${gcToken}`,
        'GoCardless-Version': '2015-07-06',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        billing_requests: {
          mandate_request: { scheme: 'bacs', metadata: meta },
          metadata: meta,
        },
      }),
    })

    if (!billingRequestRes.ok) {
      const err = await billingRequestRes.json()
      console.error('GoCardless billing request failed:', JSON.stringify(err))
      return NextResponse.json({ error: 'Failed to create billing request' }, { status: 500 })
    }

    const billingRequestData = await billingRequestRes.json()
    const billingRequestId = billingRequestData.billing_requests.id
    console.log('GC billing request created:', billingRequestId)

    // 4. Create billing request flow (hosted page)
    const redirectUri = `${appUrl}/api/gocardless/confirm?requestId=${requestId}&applicationId=${applicationId}&conversationId=${conversationId}&startDate=${encodeURIComponent(startDate)}&billingRequestId=${billingRequestId}`

    const flowRes = await fetch(`${gcBaseUrl}/billing_request_flows`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${gcToken}`,
        'GoCardless-Version': '2015-07-06',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        billing_request_flows: {
          redirect_uri: redirectUri,
          exit_uri: `${appUrl}/customer/dashboard?gc_abandoned=1&conversationId=${conversationId}`,
          links: { billing_request: billingRequestId },
          prefilled_customer: {
            given_name: profile.full_name?.split(' ')[0] ?? '',
            family_name: profile.full_name?.split(' ').slice(1).join(' ') ?? '',
            email: profile.email ?? '',
          },
        },
      }),
    })

    if (!flowRes.ok) {
      const err = await flowRes.json()
      console.error('GoCardless flow creation failed:', JSON.stringify(err))
      return NextResponse.json({ error: 'Failed to create payment flow' }, { status: 500 })
    }

    const flowData = await flowRes.json()
    const authorisationUrl = flowData.billing_request_flows.authorisation_url
    const flowId = flowData.billing_request_flows.id
    console.log('GC flow created:', flowId)

    // 5. Persist flow_id and start_date
    await Promise.all([
      supabaseAdmin
        .from('customers')
        .update({ gocardless_flow_id: flowId })
        .eq('id', cleanRequest.customer_id),
      supabaseAdmin
        .from('clean_requests')
        .update({ start_date: startDate })
        .eq('id', requestId),
    ])

    return NextResponse.json({ type: 'new_flow', authorisationUrl })
  } catch (err: any) {
    console.error('GoCardless create-flow error:', err)
    return NextResponse.json({ error: err.message ?? 'Internal server error' }, { status: 500 })
  }
}