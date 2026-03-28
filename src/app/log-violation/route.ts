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
    const { conversationId, messageContent, triggeredKeywords, senderId, senderRole } = body

    if (!conversationId || !messageContent || !triggeredKeywords || !senderId) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    // 1. Log the violation
    const { error: insertError } = await supabaseAdmin
      .from('keyword_violations')
      .insert({
        conversation_id: conversationId,
        message_content: messageContent,
        triggered_keywords: triggeredKeywords,
        sender_id: senderId,
        sender_role: senderRole,
      })

    if (insertError) {
      console.error('Violation insert failed:', insertError)
      // Don't fail the request — violation logging is best-effort
    }

    // 2. Get sender name for the alert email
    const { data: sender } = await supabaseAdmin
      .from('profiles')
      .select('full_name, email')
      .eq('id', senderId)
      .single()

    // 3. Get admin email(s)
    const { data: admins } = await supabaseAdmin
      .from('profiles')
      .select('email')
      .eq('role', 'admin')

    if (!admins || admins.length === 0) {
      return NextResponse.json({ success: true })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.vouchee.co.uk'

    // 4. Send alert email to all admins
    await Promise.all(admins.map((admin: { email: string }) =>
      resend.emails.send({
        from: 'Vouchee Alerts <info@vouchee.co.uk>',
        to: admin.email,
        subject: `⚠️ Keyword violation detected on Vouchee`,
        html: `
          <div style="font-family: 'DM Sans', Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #f8fafc; padding: 32px 16px;">
            <div style="background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.06);">

              <div style="background: #dc2626; padding: 20px 32px;">
                <div style="font-size: 20px; font-weight: 800; color: white;">⚠️ Keyword Violation</div>
                <div style="font-size: 13px; color: rgba(255,255,255,0.8); margin-top: 4px;">A user may be attempting to take a conversation off-platform</div>
              </div>

              <div style="padding: 24px 32px;">
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                  <tr>
                    <td style="padding: 8px 0; font-size: 12px; font-weight: 700; color: #94a3b8; text-transform: uppercase; width: 120px;">Sent by</td>
                    <td style="padding: 8px 0; font-size: 14px; color: #0f172a;">${sender?.full_name ?? 'Unknown'} (${senderRole})</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-size: 12px; font-weight: 700; color: #94a3b8; text-transform: uppercase;">Keywords</td>
                    <td style="padding: 8px 0;">
                      ${triggeredKeywords.map((k: string) => `<span style="background:#fef2f2;color:#dc2626;border:1px solid #fecaca;border-radius:4px;padding:2px 8px;font-size:11px;font-weight:700;margin-right:4px;">${k}</span>`).join('')}
                    </td>
                  </tr>
                </table>

                <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 10px; padding: 14px 16px; margin-bottom: 24px;">
                  <div style="font-size: 12px; font-weight: 700; color: '#94a3b8'; margin-bottom: 6px;">Message content</div>
                  <div style="font-size: 14px; color: #0f172a; font-style: italic;">"${messageContent}"</div>
                </div>

                <a href="${appUrl}/admin/dashboard" style="display: inline-block; background: #dc2626; color: white; text-decoration: none; border-radius: 10px; padding: 12px 24px; font-size: 14px; font-weight: 700;">
                  View in Admin Portal →
                </a>
              </div>
            </div>
          </div>
        `,
      })
    ))

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('log-violation error:', err)
    return NextResponse.json({ error: err.message ?? 'Internal server error' }, { status: 500 })
  }
}