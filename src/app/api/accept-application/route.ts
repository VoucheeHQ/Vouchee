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

    // 2. Get the clean request — customer_id here is customers.id (not profile UUID)
    const { data: cleanRequest, error: reqError } = await supabaseAdmin
      .from('clean_requests')
      .select('id, customer_id')
      .eq('id', requestId)
      .single()

    if (reqError || !cleanRequest) {
      console.error('Clean request lookup failed:', reqError)
      return NextResponse.json({ error: 'Clean request not found' }, { status: 404 })
    }

    // 3. Check if a conversation already exists for this application
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
      // 4. Update application status to accepted
      await supabaseAdmin
        .from('applications')
        .update({ status: 'accepted' })
        .eq('id', applicationId)

      // 5. Create a new conversation
      // customer_id stores cleanRequest.customer_id (customers.id),
      // which is what the chat widget queries against
      const { data: newConv, error: convError } = await supabaseAdmin
        .from('conversations')
        .insert({
          clean_request_id: requestId,
          cleaner_id: application.cleaner_id,
          customer_id: cleanRequest.customer_id,
          status: 'active',
        })
        .select('id')
        .single()

      if (convError || !newConv) {
        console.error('Conversation creation failed:', convError)
        return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 })
      }

      conversationId = newConv.id

      // 6. Seed the cleaner's application message as the first message
      if (application.message?.trim()) {
        const { data: cleanerRecord } = await supabaseAdmin
          .from('cleaners')
          .select('profile_id')
          .eq('id', application.cleaner_id)
          .single() as { data: { profile_id: string } | null }

        if (cleanerRecord?.profile_id) {
          await supabaseAdmin.from('messages').insert({
            conversation_id: conversationId,
            sender_id: cleanerRecord.profile_id,
            sender_role: 'cleaner',
            content: application.message.trim(),
          })
        }
      }
    }

    return NextResponse.json({ conversationId })
  } catch (err: any) {
    console.error('Accept application error:', err)
    return NextResponse.json({ error: err.message ?? 'Internal server error' }, { status: 500 })
  }
}