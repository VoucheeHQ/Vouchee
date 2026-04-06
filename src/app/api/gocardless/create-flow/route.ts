import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    const body = await request.json()
    const { applicationId, requestId, conversationId } = body

    if (!applicationId || !requestId || !conversationId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // 1. Get the clean request
    const { data: cleanRequest, error: reqError } = await supabaseAdmin
      .from('clean_requests')
      .select('id, customer_id, bedrooms, bathrooms, frequency, hourly_rate, hours_per_session, tasks, zone')
      .eq('id', requestId)
      .single()

    if (reqError || !cleanRequest) {
      return NextResponse.json({ error: 'Clean request not found' }, { status: 404 })
    }

    // 2. Get the customer's profile_id and email
    const { data: customerRecord, error: customerError } = await supabaseAdmin
      .from('customers')
      .select('profile_id, address_line1, address_line2, city, postcode')
      .eq('id', cleanRequest.customer_id)
      .single()

    if (customerError || !customerRecord) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('full_name, email')
      .eq('id', customerRecord.profile_id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // 3. Create GoCardless billing request
    const gcEnvironment = process.env.GOCARDLESS_ENVIRONMENT ?? 'sandbox'
    const gcBaseUrl = gcEnvironment === 'live'
      ? 'https://api.gocardless.com'
      : 'https://api-sandbox.gocardless.com'

    const gcToken = process.env.GOCARDLESS_ACCESS_TOKEN!

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.vouchee.co.uk'

    // Create a billing request (mandate only — no immediate payment)
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
          mandate_request: {
            scheme: 'bacs',
            metadata: {
              vouchee_request_id: requestId,
              vouchee_application_id: applicationId,
              vouchee_conversation_id: conversationId,
            },
          },
          metadata: {
            vouchee_request_id: requestId,
            vouchee_application_id: applicationId,
            vouchee_conversation_id: conversationId,
          },
        },
      }),
    })

    if (!billingRequestRes.ok) {
      const err = await billingRequestRes.json()
      console.error('GoCardless billing request failed:', err)
      return NextResponse.json({ error: 'Failed to create billing request' }, { status: 500 })
    }

    const billingRequestData = await billingRequestRes.json()
    const billingRequestId = billingRequestData.billing_requests.id

    // 4. Create a billing request flow (hosted page)
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
          redirect_uri: `${appUrl}/api/gocardless/confirm?requestId=${requestId}&applicationId=${applicationId}&conversationId=${conversationId}`,
          exit_uri: `${appUrl}/customer/dashboard?gc_abandoned=1&conversationId=${conversationId}`,
          links: {
            billing_request: billingRequestId,
          },
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
      console.error('GoCardless flow creation failed:', err)
      return NextResponse.json({ error: 'Failed to create payment flow' }, { status: 500 })
    }

    const flowData = await flowRes.json()
    const authorisationUrl = flowData.billing_request_flows.authorisation_url
    const flowId = flowData.billing_request_flows.id

    // 5. Store the flow_id and billing_request_id on the customer record for later lookup
    await supabaseAdmin
      .from('customers')
      .update({ gocardless_flow_id: flowId })
      .eq('id', cleanRequest.customer_id)

    // 6. Post a system message to the chat so both parties see what's happening
    const { data: cleanerRecord } = await supabaseAdmin
      .from('cleaners')
      .select('profile_id')
      .eq('id', (await supabaseAdmin.from('applications').select('cleaner_id').eq('id', applicationId).single()).data?.cleaner_id)
      .single() as { data: { profile_id: string } | null }

    await supabaseAdmin.from('messages').insert({
      conversation_id: conversationId,
      sender_id: customerRecord.profile_id,
      sender_role: 'customer',
      content: '🗓️ __system__ Customer is selecting a start date…',
    })

    return NextResponse.json({ authorisationUrl })
  } catch (err: any) {
    console.error('GoCardless create-flow error:', err)
    return NextResponse.json({ error: err.message ?? 'Internal server error' }, { status: 500 })
  }
}