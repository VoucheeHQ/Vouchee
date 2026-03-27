import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    const body = await request.json()
    const { conversationId, content } = body

    if (!conversationId || !content) {
      return NextResponse.json({ error: 'Missing conversationId or content' }, { status: 400 })
    }

    // 1. Get the conversation to find both parties
    const { data: conversation, error: convError } = await supabaseAdmin
      .from('conversations')
      .select('id, cleaner_id, customer_id, clean_request_id')
      .eq('id', conversationId)
      .single()

    if (convError || !conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    // 2. Get the sender (determined by auth header — the person who just sent the message)
    //    We need to identify the RECIPIENT so we can email them
    //    Get both parties' emails
    const { data: customerProfile } = await supabaseAdmin
      .from('profiles')
      .select('email, full_name')
      .eq('id', conversation.customer_id)
      .single()

    const { data: cleanerRecord } = await supabaseAdmin
      .from('cleaners')
      .select('profile_id, profiles(email, full_name)')
      .eq('id', conversation.cleaner_id)
      .single() as { data: { profile_id: string; profiles: { email: string; full_name: string } } | null }

    const cleanerProfile = cleanerRecord?.profiles

    if (!customerProfile || !cleanerProfile) {
      return NextResponse.json({ error: 'Could not find user profiles' }, { status: 404 })
    }

    // 3. Get the last message sender role to determine who receives the notification
    const { data: lastMessages } = await supabaseAdmin
      .from('messages')
      .select('sender_role, sender_id')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(1)

    const senderRole = lastMessages?.[0]?.sender_role

    // Recipient is the OTHER party
    const isCustomerSender = senderRole === 'customer'
    const recipientEmail = isCustomerSender ? cleanerProfile.email : customerProfile.email
    const recipientName = isCustomerSender
      ? cleanerProfile.full_name?.split(' ')?.[0] ?? 'there'
      : customerProfile.full_name?.split(' ')?.[0] ?? 'there'
    const senderName = isCustomerSender
      ? customerProfile.full_name?.split(' ')?.[0] ?? 'Your customer'
      : `${cleanerProfile.full_name?.split(' ')?.[0]} ${cleanerProfile.full_name?.split(' ')?.[1]?.[0] ?? ''}.`

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.vouchee.co.uk'
    const dashboardUrl = isCustomerSender
      ? `${appUrl}/cleaner/dashboard`
      : `${appUrl}/customer/dashboard`

    // 4. Send the email
    await resend.emails.send({
      from: 'Vouchee <info@vouchee.co.uk>',
      to: recipientEmail,
      subject: `New message from ${senderName} on Vouchee`,
      html: `
        <div style="font-family: 'DM Sans', Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #f8fafc; padding: 32px 16px;">
          <div style="background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.06);">
            
            <!-- Header -->
            <div style="background: #1e293b; padding: 24px 32px;">
              <div style="font-size: 22px; font-weight: 800; color: white; letter-spacing: -0.5px;">Vouchee</div>
              <div style="font-size: 13px; color: rgba(255,255,255,0.6); margin-top: 2px;">You have a new message</div>
            </div>

            <!-- Body -->
            <div style="padding: 28px 32px;">
              <p style="font-size: 16px; color: #0f172a; margin: 0 0 8px; font-weight: 600;">Hi ${recipientName},</p>
              <p style="font-size: 14px; color: #475569; margin: 0 0 24px; line-height: 1.6;">
                <strong>${senderName}</strong> sent you a message on Vouchee:
              </p>

              <!-- Message bubble -->
              <div style="background: #f1f5f9; border-left: 3px solid #2563eb; border-radius: 0 12px 12px 0; padding: 14px 18px; margin-bottom: 28px;">
                <p style="margin: 0; font-size: 14px; color: #1e293b; line-height: 1.6; font-style: italic;">"${content}"</p>
              </div>

              <a href="${dashboardUrl}" style="display: inline-block; background: #2563eb; color: white; text-decoration: none; border-radius: 10px; padding: 12px 28px; font-size: 14px; font-weight: 700;">
                Reply on Vouchee →
              </a>

              <p style="font-size: 12px; color: #94a3b8; margin-top: 24px; line-height: 1.6;">
                You're receiving this because you have an active conversation on Vouchee. 
                All replies must be sent through the Vouchee platform to keep both parties protected.
              </p>
            </div>

          </div>
        </div>
      `,
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('send-message-email error:', err)
    return NextResponse.json({ error: err.message ?? 'Internal server error' }, { status: 500 })
  }
}