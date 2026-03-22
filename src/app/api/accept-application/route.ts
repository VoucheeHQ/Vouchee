import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    const body = await request.json()
    const { applicationId, requestId } = body

    if (!applicationId || !requestId) {
      return NextResponse.json({ error: 'Missing applicationId or requestId' }, { status: 400 })
    }

    // 1. Get the application
    const { data: application, error: appError } = await supabaseAdmin
      .from('applications')
      .select('id, cleaner_id, request_id, status, message')
      .eq('id', applicationId)
      .single()

    if (appError || !application) {
      console.error('Application lookup failed:', appError)
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    // 2. Get the clean request to find the customer_id
    const { data: cleanRequest, error: reqError } = await supabaseAdmin
      .from('clean_requests')
      .select('id, customer_id')
      .eq('id', requestId)
      .single()

    if (reqError || !cleanRequest) {
      console.error('Clean request lookup failed:', reqError)
      return NextResponse.json({ error: 'Clean request not found' }, { status: 404 })
    }

    // 3. Get the customer's profile_id from the customers table
    const { data: customerRecord, error: customerError } = await supabaseAdmin
      .from('customers')
      .select('profile_id')
      .eq('id', cleanRequest.customer_id)
      .single()

    if (customerError || !customerRecord) {
      console.error('Customer lookup failed:', customerError)
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // 4. Check if a conversation already exists for this application
    const { data: existingConv } = await supabaseAdmin
      .from('conversations')
      .select('id')
      .eq('clean_request_id', requestId)
      .eq('cleaner_id', application.cleaner_id)
      .single() as { data: { id: string } | null }

    let conversationId: string

    if (existingConv?.id) {
      // Already accepted — just return the existing conversation
      conversationId = existingConv.id
    } else {
      // 5. Update application status to accepted
      await supabaseAdmin
        .from('applications')
        .update({ status: 'accepted' })
        .eq('id', applicationId)

      // 6. Create a new conversation
      const { data: newConv, error: convError } = await supabaseAdmin
        .from('conversations')
        .insert({
          clean_request_id: requestId,
          cleaner_id: application.cleaner_id,
          customer_id: customerRecord.profile_id,
          status: 'active',
        })
        .select('id')
        .single()

      if (convError || !newConv) {
        console.error('Conversation creation failed:', convError)
        return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 })
      }

      conversationId = newConv.id

      // 7. Seed the cleaner's application message as the first message
      if (application.message?.trim()) {
        await supabaseAdmin
          .from('messages')
          .insert({
            conversation_id: conversationId,
            sender_id: customerRecord.profile_id, // will be replaced by cleaner lookup below
            sender_role: 'cleaner',
            content: application.message.trim(),
          })

        // Get cleaner's profile_id for the message sender
        const { data: cleanerRecord } = await supabaseAdmin
          .from('cleaners')
          .select('profile_id')
          .eq('id', application.cleaner_id)
          .single() as { data: { profile_id: string } | null }

        if (cleanerRecord?.profile_id) {
          // Update the message with the correct sender_id
          await supabaseAdmin
            .from('messages')
            .update({ sender_id: cleanerRecord.profile_id })
            .eq('conversation_id', conversationId)
            .eq('sender_role', 'cleaner')
        }
      }
    }

    return NextResponse.json({ conversationId })

  } catch (err: any) {
    console.error('Accept application error:', err)
    return NextResponse.json({ error: err.message ?? 'Internal server error' }, { status: 500 })
  }
}