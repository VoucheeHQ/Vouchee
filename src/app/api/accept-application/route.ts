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

    // 1. Get the application (includes current status)
    const { data: application, error: appError } = await supabaseAdmin
      .from('applications')
      .select('id, cleaner_id, request_id, status, message')
      .eq('id', applicationId)
      .single()
    if (appError || !application) {
      console.error('Application lookup failed:', appError)
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    // 2. Get the clean request to find the customer_id (customers.id)
    const { data: cleanRequest, error: reqError } = await supabaseAdmin
      .from('clean_requests')
      .select('id, customer_id')
      .eq('id', requestId)
      .single()
    if (reqError || !cleanRequest) {
      console.error('Clean request lookup failed:', reqError)
      return NextResponse.json({ error: 'Clean request not found' }, { status: 404 })
    }

    // 3. Get the customer's profile_id — conversations.customer_id FK points to profiles.id
    const { data: customerRecord, error: customerError } = await supabaseAdmin
      .from('customers')
      .select('profile_id')
      .eq('id', cleanRequest.customer_id)
      .single()
    if (customerError || !customerRecord) {
      console.error('Customer lookup failed:', customerError)
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // 4. Determine if this is a *new* acceptance (status was pending) — used below
    //    for deciding whether to send a notification. We compute this BEFORE the
    //    status update so we know the previous state.
    const wasPending = (application as any).status === 'pending'

    // 5. Check if a conversation already exists for this application
    const { data: existingConv } = await supabaseAdmin
      .from('conversations')
      .select('id')
      .eq('clean_request_id', requestId)
      .eq('cleaner_id', application.cleaner_id)
      .single() as { data: { id: string } | null }

    // 6. ALWAYS mark the application accepted — idempotent, safe to re-run.
    //    Previously this sat inside the "no existing conversation" branch, which
    //    meant stale conversation rows could block status updates forever.
    await supabaseAdmin
      .from('applications')
      .update({ status: 'accepted' } as any)
      .eq('id', applicationId)

    let conversationId: string

    if (existingConv?.id) {
      // Chat already exists — just return the existing conversation
      conversationId = existingConv.id
    } else {
      // 7. Create a new conversation — customer_id must be profiles.id per FK constraint
      const { data: newConv, error: convError } = await supabaseAdmin
        .from('conversations')
        .insert({
          clean_request_id: requestId,
          cleaner_id: application.cleaner_id,
          customer_id: customerRecord.profile_id,
          status: 'active',
        } as any)
        .select('id')
        .single()

      if (convError || !newConv) {
        console.error('Conversation creation failed:', convError)
        return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 })
      }

      conversationId = (newConv as any).id

      // 8. Seed the cleaner's application message as the first message
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
          } as any)
        }
      }
    }

    // 9. Send a "chat accepted" notification to the cleaner — only if this was
    //    genuinely a new acceptance (avoids spam on repeat clicks / retries).
    if (wasPending) {
      try {
        const { data: customerProfile } = await supabaseAdmin
          .from('profiles')
          .select('full_name')
          .eq('id', customerRecord.profile_id)
          .single() as { data: { full_name: string | null } | null }

        const customerFirstName = customerProfile?.full_name?.split(' ')[0] ?? 'A customer'

        await supabaseAdmin.from('notifications').insert({
          cleaner_id: application.cleaner_id,
          type: 'chat_accepted',
          title: `💬 ${customerFirstName} accepted your chat`,
          body: 'You can now message them directly about the job.',
          link: '/cleaner/dashboard',
        } as any)
      } catch (notifyErr) {
        // Notifications are a nice-to-have — never block the core flow on them
        console.error('Notification insert failed (non-fatal):', notifyErr)
      }
    }

    return NextResponse.json({ conversationId })
  } catch (err: any) {
    console.error('Accept application error:', err)
    return NextResponse.json({ error: err.message ?? 'Internal server error' }, { status: 500 })
  }
}