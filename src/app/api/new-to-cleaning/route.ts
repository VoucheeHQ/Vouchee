import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY!)

export async function POST(request: NextRequest) {
  try {
    const { name, phone, email, message } = await request.json()

    if (!name || !phone || !email || !message) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    await resend.emails.send({
      from: 'Vouchee <hello@vouchee.co.uk>',
      to: 'adamjbell95@gmail.com',
      subject: `New cleaner referral — ${name}`,
      html: `
        <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #f8fafc; padding: 32px 16px;">
          <div style="background: white; border-radius: 16px; padding: 32px; border: 1px solid #e2e8f0;">
            <h2 style="font-size: 20px; font-weight: 800; color: #0f172a; margin: 0 0 8px;">New cleaner referral 🌱</h2>
            <p style="font-size: 14px; color: #64748b; margin: 0 0 24px;">Someone submitted via the "new to cleaning" page. Pass to Alison.</p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #64748b; width: 35%;">Name</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px; font-weight: 700; color: #0f172a;">${name}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #64748b;">Phone</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px; font-weight: 700; color: #0f172a;">${phone}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #64748b;">Email</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px; font-weight: 700; color: #0f172a;"><a href="mailto:${email}" style="color: #2563eb;">${email}</a></td>
              </tr>
              <tr>
                <td style="padding: 12px 0; vertical-align: top; font-size: 13px; color: #64748b;">Message</td>
                <td style="padding: 12px 0; font-size: 13px; color: #0f172a; line-height: 1.6;">${message.replace(/\n/g, '<br>')}</td>
              </tr>
            </table>
          </div>
        </div>
      `,
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('new-to-cleaning email error:', err)
    return NextResponse.json({ error: err.message ?? 'Failed' }, { status: 500 })
  }
}