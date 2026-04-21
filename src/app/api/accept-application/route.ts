import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // DIAGNOSTIC PAYLOAD — accumulates everything useful for debugging
  const diag: any = {
    env_has_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    env_has_service_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    service_key_length: process.env.SUPABASE_SERVICE_ROLE_KEY?.length ?? 0,
    service_key_prefix: process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 20) ?? null,
  }

  // Decode the JWT middle to see what role the key claims
  try {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
    const parts = key.split('.')
    if (parts.length === 3) {
      const payload = JSON.parse(
        Buffer.from(parts[1], 'base64').toString('utf-8')
      )
      diag.jwt_role = payload.role
      diag.jwt_ref = payload.ref
      diag.jwt_iss = payload.iss
    }
  } catch (e: any) {
    diag.jwt_decode_error = e.message
  }

  try {
    const body = await request.json()
    const { applicationId, requestId } = body
    diag.applicationId = applicationId
    diag.requestId = requestId

    if (!applicationId || !requestId) {
      return NextResponse.json({ error: 'Missing applicationId or requestId', diag }, { status: 400 })
    }

    // 1. Get the application BEFORE any update
    const { data: appBefore, error: appError } = await supabaseAdmin
      .from('applications')
      .select('id, cleaner_id, request_id, status, message')
      .eq('id', applicationId)
      .single()

    if (appError || !appBefore) {
      diag.appLookupError = appError
      return NextResponse.json({ error: 'Application not found', diag }, { status: 404 })
    }

    diag.status_before_update = (appBefore as any).status

    // 2. Attempt the UPDATE — capture EVERYTHING
    const { data: updatedRows, error: updateErr, count, status, statusText } = await supabaseAdmin
      .from('applications')
      .update({ status: 'accepted' } as any)
      .eq('id', applicationId)
      .select('id, status')

    diag.update_error = updateErr
    diag.update_rowcount = updatedRows?.length ?? 0
    diag.update_rows = updatedRows
    diag.update_http_status = status
    diag.update_http_statusText = statusText

    // 3. Re-read the row from DB to see the actual stored value
    const { data: appAfter } = await supabaseAdmin
      .from('applications')
      .select('id, status')
      .eq('id', applicationId)
      .single()

    diag.status_after_update = (appAfter as any)?.status

    // 4. Get clean request + customer (for conversation logic)
    const { data: cleanRequest, error: reqError } = await supabaseAdmin
      .from('clean_requests')
      .select('id, customer_id')
      .eq('id', requestId)
      .single()
    if (reqError || !cleanRequest) {
      diag.reqLookupError = reqError
      return NextResponse.json({ error: 'Clean request not found', diag }, { status: 404 })
    }

    const { data: customerRecord, error: customerError } = await supabaseAdmin
      .from('customers')
      .select('profile_id')
      .eq('id', cleanRequest.customer_id)
      .single()
    if (customerError || !customerRecord) {
      diag.customerLookupError = customerError
      return NextResponse.json({ error: 'Customer not found', diag }, { status: 404 })
    }

    const wasPending = diag.status_before_update === 'pending'

    // 5. Existing conversation?
    const { data: existingConv } = await supabaseAdmin
      .from('conversations')
      .select('id')
      .eq('clean_request_id', requestId)
      .eq('cleaner_id', appBefore.cleaner_id)
      .single() as { data: { id: string } | null }

    let conversationId: string

    if (existingConv?.id) {
      conversationId = existingConv.id
      diag.conversation_existed = true
    } else {
      diag.conversation_existed = false
      const { data: newConv, error: convError } = await supabaseAdmin
        .from('conversations')
        .insert({
          clean_request_id: requestId,
          cleaner_id: appBefore.cleaner_id,
          customer_id: customerRecord.profile_id,
          status: 'active',
        } as any)
        .select('id')
        .single()

      if (convError || !newConv) {
        diag.convCreateError = convError
        return NextResponse.json({ error: 'Failed to create conversation', diag }, { status: 500 })
      }

      conversationId = (newConv as any).id

      if (appBefore.message?.trim()) {
        const { data: cleanerRecord } = await supabaseAdmin
          .from('cleaners')
          .select('profile_id')
          .eq('id', appBefore.cleaner_id)
          .single() as { data: { profile_id: string } | null }

        if (cleanerRecord?.profile_id) {
          await supabaseAdmin.from('messages').insert({
            conversation_id: conversationId,
            sender_id: cleanerRecord.profile_id,
            sender_role: 'cleaner',
            content: appBefore.message.trim(),
          } as any)
        }
      }
    }

    // 6. Notification (non-fatal)
    if (wasPending) {
      try {
        const { data: customerProfile } = await supabaseAdmin
          .from('profiles')
          .select('full_name')
          .eq('id', customerRecord.profile_id)
          .single() as { data: { full_name: string | null } | null }

        const customerFirstName = customerProfile?.full_name?.split(' ')[0] ?? 'A customer'

        const { error: notifErr } = await supabaseAdmin.from('notifications').insert({
          cleaner_id: appBefore.cleaner_id,
          type: 'chat_accepted',
          title: `💬 ${customerFirstName} accepted your chat`,
          body: 'You can now message them directly about the job.',
          link: '/cleaner/dashboard',
        } as any)

        diag.notification_error = notifErr
      } catch (notifyErr: any) {
        diag.notification_exception = notifyErr.message
      }
    }

    // Return success, but INCLUDE DIAG so we can see what happened
    return NextResponse.json({ conversationId, diag })
  } catch (err: any) {
    diag.topLevelError = err.message
    diag.topLevelStack = err.stack
    return NextResponse.json({ error: err.message ?? 'Internal server error', diag }, { status: 500 })
  }
}