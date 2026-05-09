import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import {
  coverCleanerEmailHtml,
  coverCleanerEmailSubject,
  coverCustomerEmailHtml,
  coverCustomerEmailSubject,
} from '@/lib/emails/cover-clean-confirm'

const resend = new Resend(process.env.RESEND_API_KEY!)

export async function POST(request: NextRequest) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    const body = await request.json()
    const { applicationId, requestId, conversationId, startDate, coolingOffConsent } = body

    if (!applicationId || !requestId || !conversationId || !startDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // 1. Get the clean request — extended to include cover-clean fields.
    //    service_type lets us branch into the cover path; cover_date is what
    //    we'll use as the effective start_date for cover (the chosen date is
    //    already locked in when the customer posted the cover request).
    const { data: cleanRequest, error: reqError } = await supabaseAdmin
      .from('clean_requests')
      .select('id, customer_id, bedrooms, bathrooms, frequency, hourly_rate, hours_per_session, tasks, zone, service_type, cover_date, time_window_start, time_window_end, customer_notes')
      .eq('id', requestId)
      .single()

    if (reqError || !cleanRequest) {
      console.error('Clean request lookup failed:', reqError)
      return NextResponse.json({ error: 'Clean request not found' }, { status: 404 })
    }

    // ── Cover-clean branch ──────────────────────────────────────────────────
    // Cover cleans are one-off, paid directly between customer and cleaner.
    // No GoCardless mandate, no recurring subscription, no Vouchee fee, no
    // cooling-off (no contract triggers UK CCR 2013). We mark the request
    // fulfilled, set assigned_cleaner_id, decline siblings, and fire the
    // cover-specific accept emails (file 7).
    //
    // This branch fires BEFORE the cooling-off guard and customer/mandate
    // lookup so a customer with an existing regular-clean mandate isn't
    // accidentally charged on it for a cover.
    if (cleanRequest.service_type === 'cover') {
      console.log('Cover-clean accept: skipping GoCardless, fulfilling directly', { requestId, applicationId })

      // Look up the application to grab cleaner_id for assigned_cleaner_id
      const { data: application, error: appError } = await supabaseAdmin
        .from('applications')
        .select('id, cleaner_id')
        .eq('id', applicationId)
        .single()

      if (appError || !application) {
        console.error('Cover accept: application lookup failed:', appError)
        return NextResponse.json({ error: 'Application not found' }, { status: 404 })
      }

      // Mark the cover request fulfilled with the chosen cleaner.
      // start_date is set to cover_date so downstream UI (e.g. fulfilled-card
      // copy) treats this consistently with regular cleans.
      const { error: updateError } = await supabaseAdmin
        .from('clean_requests')
        .update({
          status: 'fulfilled',
          assigned_cleaner_id: application.cleaner_id,
          start_date: cleanRequest.cover_date ?? startDate,
        })
        .eq('id', requestId)

      if (updateError) {
        console.error('Cover accept: fulfill update failed:', updateError)
        return NextResponse.json({ error: 'Could not confirm cover cleaner' }, { status: 500 })
      }

      // Mark winning application 'accepted' (was 'pending').
      const { error: acceptError } = await supabaseAdmin
        .from('applications')
        .update({ status: 'accepted' })
        .eq('id', applicationId)
      if (acceptError) {
        console.error('Cover accept: winning app update failed (non-fatal):', acceptError)
      }

      // Decline sibling pending applications — this cleaner won, others lost.
      // Best-effort: a failure here doesn't undo the fulfill above.
      const { data: rejectedSiblings } = await supabaseAdmin
        .from('applications')
        .update({ status: 'rejected' })
        .eq('request_id', requestId)
        .neq('id', applicationId)
        .eq('status', 'pending')
        .select('id, cleaner_id') as { data: Array<{ id: string; cleaner_id: string }> | null }

      // ── Look up profiles for emails + notifications ─────────────────────
      // Customer (for email, name, phone, address)
      const { data: customerRecord } = await supabaseAdmin
        .from('customers')
        .select('id, profile_id, address_line1, address_line2, city, postcode')
        .eq('id', cleanRequest.customer_id)
        .single() as { data: { id: string; profile_id: string; address_line1: string; address_line2: string | null; city: string; postcode: string } | null }

      const { data: customerProfile } = customerRecord
        ? await supabaseAdmin.from('profiles').select('full_name, email, phone').eq('id', customerRecord.profile_id).single() as { data: { full_name: string | null; email: string | null; phone: string | null } | null }
        : { data: null }

      // Cleaner (for email, name, phone)
      const { data: cleanerRecord } = await supabaseAdmin
        .from('cleaners').select('profile_id').eq('id', application.cleaner_id).single() as { data: { profile_id: string } | null }
      const { data: cleanerProfile } = cleanerRecord
        ? await supabaseAdmin.from('profiles').select('full_name, email, phone').eq('id', cleanerRecord.profile_id).single() as { data: { full_name: string | null; email: string | null; phone: string | null } | null }
        : { data: null }

      const customerFirstName = customerProfile?.full_name?.split(' ')[0] ?? 'Your customer'
      const customerFullName  = customerProfile?.full_name ?? 'Your customer'
      const customerEmail     = customerProfile?.email ?? ''
      const customerPhone     = customerProfile?.phone ?? null
      const cleanerFullName   = cleanerProfile?.full_name ?? 'Cleaner'
      const cleanerFirstName  = cleanerFullName.split(' ')[0]
      const cleanerEmail      = cleanerProfile?.email ?? null
      const cleanerPhone      = cleanerProfile?.phone ?? null

      // Format the address for the cleaner-side email (postcode etc.)
      const formatPostcode = (raw: string) => {
        const c = (raw ?? '').toUpperCase().replace(/\s+/g, '')
        return c.length > 4 ? c.slice(0, -3) + ' ' + c.slice(-3) : c
      }
      const address = customerRecord ? [
        customerRecord.address_line1,
        customerRecord.address_line2,
        customerRecord.city,
        formatPostcode(customerRecord.postcode),
      ].filter(Boolean).join(', ') : ''

      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.vouchee.co.uk'
      const cleanerCardUrl = `${appUrl}/cleaners/${application.cleaner_id}`
      const coverDateIso = cleanRequest.cover_date ?? startDate

      // ── Fire all post-confirmation actions in parallel ──────────────────
      // System message + notification + emails. Each is best-effort — logging
      // failures rather than failing the whole request, since the fulfill is
      // already committed and we'd rather over-communicate than under.
      // PromiseLike accepts both Resend's real Promises and Supabase's thenable
      // PostgrestBuilder return values.
      const tasks: PromiseLike<unknown>[] = []

      // System message in the conversation (so the chat reflects confirmation)
      if (customerRecord) {
        tasks.push(
          supabaseAdmin.from('messages').insert({
            conversation_id: conversationId,
            sender_id: customerRecord.profile_id,
            sender_role: 'customer',
            content: `🎉 __system__ Cover clean confirmed for ${coverDateIso}. Your address has been shared with your cleaner. Payment is direct between you and ${cleanerFirstName}.`,
          } as any)
        )
      }

      // Cleaner notification (in-app)
      tasks.push(
        supabaseAdmin.from('notifications').insert({
          cleaner_id: application.cleaner_id,
          type: 'job_won',
          title: `🎉 ${customerFirstName} confirmed you for the cover clean`,
          body: `Cover clean: ${coverDateIso}. Check your email for the full details.`,
          link: '/cleaner/dashboard',
        } as any)
      )

      // Cleaner email (cover-aware, with pay-direct callout)
      if (cleanerEmail) {
        tasks.push(
          resend.emails.send({
            from: 'Vouchee <hello@vouchee.co.uk>',
            to: cleanerEmail,
            subject: coverCleanerEmailSubject(coverDateIso),
            html: coverCleanerEmailHtml({
              cleanerFirstName,
              customerFirstName,
              customerFullName,
              customerEmail,
              customerPhone,
              address,
              coverDateIso,
              timeWindowStart: cleanRequest.time_window_start ?? null,
              timeWindowEnd: cleanRequest.time_window_end ?? null,
              bedrooms: cleanRequest.bedrooms,
              bathrooms: cleanRequest.bathrooms,
              hoursPerSession: cleanRequest.hours_per_session,
              hourlyRate: Number(cleanRequest.hourly_rate ?? 0),
              tasks: cleanRequest.tasks ?? [],
              zone: cleanRequest.zone ?? '',
              customerNotes: cleanRequest.customer_notes ?? null,
            }),
          })
        )
      } else {
        console.error('Cover accept: no cleaner email — skipping cleaner email send')
      }

      // Customer email (cover-aware, with pay-direct callout)
      if (customerEmail) {
        tasks.push(
          resend.emails.send({
            from: 'Vouchee <hello@vouchee.co.uk>',
            to: customerEmail,
            subject: coverCustomerEmailSubject(coverDateIso, cleanerFirstName),
            html: coverCustomerEmailHtml({
              customerFirstName,
              cleanerFullName,
              cleanerFirstName,
              cleanerEmail,
              cleanerPhone,
              cleanerCardUrl,
              coverDateIso,
              timeWindowStart: cleanRequest.time_window_start ?? null,
              timeWindowEnd: cleanRequest.time_window_end ?? null,
              bedrooms: cleanRequest.bedrooms,
              bathrooms: cleanRequest.bathrooms,
              hoursPerSession: cleanRequest.hours_per_session,
              hourlyRate: Number(cleanRequest.hourly_rate ?? 0),
              tasks: cleanRequest.tasks ?? [],
              zone: cleanRequest.zone ?? '',
            }),
          })
        )
      } else {
        console.error('Cover accept: no customer email — skipping customer email send')
      }

      // Rejection notifications for losing applicants. Email twin can ship
      // later — for now, a notification is enough so they see "job filled"
      // in their dashboard.
      if (rejectedSiblings && rejectedSiblings.length > 0) {
        for (const rej of rejectedSiblings) {
          tasks.push(
            supabaseAdmin.from('notifications').insert({
              cleaner_id: rej.cleaner_id,
              type: 'job_lost',
              title: 'Application update',
              body: `${customerFirstName} chose another cleaner for this cover clean. Don't be discouraged — new cover requests appear regularly.`,
              link: '/jobs',
            } as any)
          )
        }
      }

      const results = await Promise.allSettled(tasks)
      results.forEach((r, i) => {
        if (r.status === 'rejected') console.error(`Cover accept: post-action ${i} failed:`, r.reason)
      })

      return NextResponse.json({
        type: 'cover_fulfilled',
        requestId,
        applicationId,
        assignedCleanerId: application.cleaner_id,
      })
    }

    // ── Cooling-off guard (regular cleans only) ─────────────────────────────
    // UK CCR 2013 requires express consent before cleaning service can begin
    // within the 14-day right-to-cancel period. The StartDateModal enforces
    // this client-side via a checkbox; this is the matching server-side
    // guard so the API can't be bypassed by a direct call.
    //
    // Threshold: if start_date is on or before (now + 14 days), the first
    // clean falls inside the cooling-off window and consent is required.
    // Day 14 IS still inside the window (cooling-off begins day-after-contract
    // and runs 14 full days), so we use <= rather than <.
    const startDateMs           = new Date(startDate).getTime()
    const fourteenDaysFromNowMs = Date.now() + 14 * 24 * 60 * 60 * 1000
    const startsInsideCoolingOff = startDateMs <= fourteenDaysFromNowMs

    if (startsInsideCoolingOff && !coolingOffConsent) {
      console.warn('Cooling-off guard: rejecting create-flow without consent', { requestId, startDate })
      return NextResponse.json(
        { error: 'Express consent is required for cleaning to begin within the 14-day cancellation period.' },
        { status: 400 }
      )
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
    //
    // Note on cooling-off: a switch is the same contract continuing on the
    // same mandate, so cooling-off does not reset. The guard above still
    // catches the rare case of a switch with a near start_date inside the
    // *original* cooling-off window where consent wasn't recaptured.
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
    //
    // The redirect URL carries cooling-off state through the GoCardless
    // round trip back to confirm/route.ts. The 1/0 encoding is for URL
    // robustness — confirm/route.ts reads it as a string and parses.
    const consentParam = coolingOffConsent ? '1' : '0'
    const redirectUri = `${appUrl}/api/gocardless/confirm?requestId=${requestId}&applicationId=${applicationId}&conversationId=${conversationId}&startDate=${encodeURIComponent(startDate)}&billingRequestId=${billingRequestId}&coolingOffConsent=${consentParam}`

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