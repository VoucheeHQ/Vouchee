import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY!)

// Where one-off enquiries route to. Partner-network coordinator handles
// triage and assigns to the appropriate vetted specialist.
const PARTNER_EMAIL = 'alison.wondermaids@gmail.com'

const SERVICE_LABELS: Record<string, string> = {
  deep_clean: 'Deep clean',
  end_of_tenancy: 'End of tenancy',
  oven_clean: 'Oven clean',
}

const escapeHtml = (s: string) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;')

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, phone, postcode, serviceType, neededBy, notes } = body

    if (!name || !email || !phone || !postcode || !serviceType || !neededBy) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    if (!SERVICE_LABELS[serviceType]) {
      return NextResponse.json({ error: 'Invalid service type' }, { status: 400 })
    }

    const serviceLabel = SERVICE_LABELS[serviceType]
    const safeName = escapeHtml(name)
    const safeEmail = escapeHtml(email)
    const safePhone = escapeHtml(phone)
    const safePostcode = escapeHtml(postcode)
    const safeNeededBy = escapeHtml(neededBy)
    const safeNotes = notes?.trim() ? escapeHtml(notes).replace(/\n/g, '<br>') : null

    const html = `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #f8fafc; padding: 32px 16px;">
        <div style="background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.06);">
          <div style="background: #0f172a; padding: 24px 32px;">
            <div style="font-size: 22px; font-weight: 800; color: white; letter-spacing: -0.5px;">Vouchee</div>
            <div style="font-size: 13px; color: rgba(255,255,255,0.6); margin-top: 4px;">New one-off clean enquiry</div>
          </div>
          <div style="padding: 28px 32px;">
            <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 16px 18px; margin-bottom: 24px;">
              <div style="font-size: 11px; font-weight: 700; color: #1e40af; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 4px;">Service requested</div>
              <div style="font-size: 18px; font-weight: 800; color: #0f172a;">${serviceLabel}</div>
              <div style="font-size: 13px; color: #475569; margin-top: 4px;">Needed by: <strong>${safeNeededBy}</strong></div>
            </div>

            <div style="font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 10px;">Customer details</div>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #64748b; width: 35%;">Name</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px; font-weight: 700; color: #0f172a;">${safeName}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #64748b;">Email</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px; font-weight: 700; color: #0f172a;"><a href="mailto:${safeEmail}" style="color: #2563eb; text-decoration: none;">${safeEmail}</a></td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #64748b;">Phone</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px; font-weight: 700; color: #0f172a;"><a href="tel:${safePhone}" style="color: #2563eb; text-decoration: none;">${safePhone}</a></td>
              </tr>
              <tr>
                <td style="padding: 10px 0; font-size: 13px; color: #64748b;">Postcode</td>
                <td style="padding: 10px 0; font-size: 13px; font-weight: 700; color: #0f172a;">${safePostcode}</td>
              </tr>
            </table>

            ${safeNotes ? `
              <div style="font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 10px;">Notes from customer</div>
              <div style="background: #f8fafc; border-left: 3px solid #2563eb; border-radius: 0 8px 8px 0; padding: 12px 14px; font-size: 14px; color: #1e293b; line-height: 1.6; margin-bottom: 20px;">${safeNotes}</div>
            ` : ''}

            <a href="mailto:${safeEmail}" style="display: inline-block; background: #2563eb; color: white; text-decoration: none; border-radius: 10px; padding: 12px 24px; font-size: 14px; font-weight: 700;">Reply to ${safeName.split(' ')[0]} →</a>
          </div>
        </div>
        <p style="font-size: 11px; color: #94a3b8; text-align: center; margin-top: 20px;">Sent from vouchee.co.uk · one-off enquiry form</p>
      </div>
    `

    await resend.emails.send({
      from: 'Vouchee <hello@vouchee.co.uk>',
      to: PARTNER_EMAIL,
      replyTo: email,
      subject: `One-off clean enquiry — ${serviceLabel} — ${name}`.replace(/[\r\n]+/g, ' '),
      html,
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('one-off-enquiry error:', err)
    return NextResponse.json({ error: err.message ?? 'Failed' }, { status: 500 })
  }
}
