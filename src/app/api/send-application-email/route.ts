import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    const body = await request.json()
    const {
      customerId, applicationId, requestId,
      cleanerName, cleanerInitial, cleanerMemberSince,
      cleanerDbs, cleanerInsured, cleanerRightToWork,
      cleanerReviews, cleanerJobsAccepted, cleanerRating,
      message, jobZone, jobBedrooms, jobBathrooms, jobHours, jobRate,
    } = body

    // customerId may be either a profiles UUID or a customers UUID
    // Try profiles first, then fall back to looking up via customers table
    let customerEmail: string | null = null
    let customerFullName: string | null = null
    let customersTableId: string | null = null

    // Primary path: three sequential lookups using service role
    // (avoids any nested-join shape ambiguity that was returning null)
    if (requestId) {
      const { data: reqData } = await supabaseAdmin
        .from('clean_requests')
        .select('customer_id')
        .eq('id', requestId)
        .single() as { data: { customer_id: string } | null }

      if (reqData?.customer_id) {
        customersTableId = reqData.customer_id

        const { data: custData } = await supabaseAdmin
          .from('customers')
          .select('profile_id')
          .eq('id', reqData.customer_id)
          .single() as { data: { profile_id: string } | null }

        if (custData?.profile_id) {
          const { data: profileData } = await supabaseAdmin
            .from('profiles')
            .select('email, full_name')
            .eq('id', custData.profile_id)
            .single() as { data: { email: string | null; full_name: string | null } | null }

          customerEmail = profileData?.email ?? null
          customerFullName = profileData?.full_name ?? null
        }
      }
    }

    // Fallback: customerId as direct profiles UUID (legacy callers)
    if (!customerEmail && customerId) {
      const { data: directProfile } = await supabaseAdmin
        .from('profiles')
        .select('email, full_name')
        .eq('id', customerId)
        .single()
      customerEmail = directProfile?.email ?? null
      customerFullName = directProfile?.full_name ?? null
    }

    if (!customerEmail) {
      console.error('Customer lookup failed — customerId:', customerId, 'requestId:', requestId)
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    const customerFirstName = customerFullName?.split(' ')?.[0] ?? 'there'
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.vouchee.co.uk'

    // Convert a name into its possessive form, stripping any trailing period
    // first so initials like "Alison C." render as "Alison C's" (not "Alison C.'s").
    const possessive = (name: string) => name.replace(/\.\s*$/, '') + "'s"
    const cleanerNamePossessive = possessive(cleanerName)

    const acceptUrl = `${appUrl}/customer/dashboard?accept=${applicationId}&request=${requestId}`
    const declineUrl = `${appUrl}/customer/dashboard?decline=${applicationId}`

    const hasReviews = cleanerReviews && cleanerReviews.length > 0
    const jobsAccepted = cleanerJobsAccepted ?? 0
    const rating = cleanerRating ?? 0

    // ─── In-platform notification for the customer ─────────────────────────
    // Fires alongside the email so the customer sees the application live in
    // their dashboard (with a header badge) without needing to refresh.
    console.log('[notify-customer] customersTableId:', customersTableId, 'requestId:', requestId)
    if (customersTableId) {
      try {
        const { data: notifData, error: notifErr } = await supabaseAdmin
          .from('notifications')
          .insert({
            customer_id: customersTableId,
            type: 'new_application',
            title: `New application from ${cleanerName}`,
            body: message?.trim()
              ? `"${(message as string).slice(0, 80)}${(message as string).length > 80 ? '…' : ''}"`
              : 'A cleaner has applied to your job. Tap to review.',
            link: '/customer/dashboard',
          } as any)
          .select('id')
          .single()
        if (notifErr) {
          console.error('[notify-customer] insert error:', JSON.stringify(notifErr))
        } else {
          console.log('[notify-customer] inserted id:', (notifData as any)?.id)
        }
      } catch (e: any) {
        console.error('[notify-customer] threw:', e?.message ?? e)
      }
    } else {
      console.warn('[notify-customer] SKIPPED — customersTableId is null/undefined')
    }

    // HTML-escape — review bodies and customer names are user content
    const escapeHtml = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

    // Render N filled stars + (5-N) outlined stars given a 0-5 rating
    const renderStars = (n: number | null | undefined) => {
      const r = Math.round(Math.max(0, Math.min(5, Number(n) || 0)))
      return '★'.repeat(r) + '☆'.repeat(5 - r)
    }

    // Render up to 2 of the cleaner's real reviews. Stays blurred to maintain
    // the "accept to unlock" gate — the goal is to signal that real reviews
    // exist (and how many stars), not let the customer browse without
    // committing. Defensive against missing fields and against the rating
    // column being either 'rating' (CleanerReview type) or 'stars' (DB column).
    const reviewsToShow = (Array.isArray(cleanerReviews) ? cleanerReviews : []).slice(0, 2)
    const realReviewsHtml = reviewsToShow.map((r: any, i: number) => `
      <div style="${i === 0 && reviewsToShow.length > 1 ? 'margin-bottom:8px;' : ''}padding:10px 12px;background:white;border-radius:8px;border:1px solid #e2e8f0;">
        <span style="color:#f59e0b;font-size:12px;">${renderStars(r.rating ?? r.stars)}</span>
        <div style="font-size:13px;color:#475569;margin-top:3px;line-height:1.4;">${escapeHtml(String(r.body ?? '').slice(0, 280))}</div>
        <div style="font-size:11px;color:#94a3b8;margin-top:3px;">— ${escapeHtml(r.customer_first_name ?? 'Customer')}</div>
      </div>
    `).join('')

    const reviewsSection = hasReviews ? `
      <div style="-webkit-filter:blur(4px);filter:blur(4px);">
        ${realReviewsHtml}
      </div>
      <div style="font-size:12px;color:#94a3b8;margin-top:10px;text-align:center;font-style:italic;">🔒 Accept this application to unlock their full reviews</div>
    ` : `
      <div style="padding:16px;background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0;text-align:center;">
        <p style="margin:0 0 6px;font-size:14px;font-weight:700;color:#0f172a;">✨ New to Vouchee</p>
        <p style="margin:0;font-size:13px;color:#64748b;line-height:1.6;">This cleaner hasn't received any reviews just yet — but rest assured, all cleaners are interviewed before joining the platform.</p>
      </div>
    `

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>New application from ${cleanerName}</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <tr>
            <td style="padding:0 0 24px;text-align:center;">
              <img src="https://www.vouchee.co.uk/full-logo-black.png" width="200" height="46" alt="Vouchee" style="display:block;margin:0 auto;max-width:100%;height:auto;border:0;outline:none;text-decoration:none;" />
            </td>
          </tr>

          <tr>
            <td style="background:white;border-radius:20px;padding:36px;border:1px solid #e2e8f0;">
              <p style="margin:0 0 6px;font-size:22px;font-weight:800;color:#0f172a;">🎉 A cleaner has applied to your request!</p>
              <p style="margin:0 0 28px;font-size:14px;color:#64748b;line-height:1.6;">Hey ${customerFirstName} — review their application below.</p>

              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:14px;padding:18px 20px;margin-bottom:24px;border:1px solid #e2e8f0;">
                <tr><td style="padding-bottom:10px;">
                  <span style="font-size:15px;">📍</span>
                  <span style="font-size:16px;font-weight:800;color:#0f172a;margin-left:6px;">${jobZone}</span>
                  <span style="font-size:13px;color:#64748b;margin-left:8px;">Regular Clean</span>
                </td></tr>
                <tr><td style="padding-bottom:14px;">
                  <span style="display:inline-block;background:white;border:1px solid #e2e8f0;border-radius:100px;padding:4px 12px;font-size:12px;font-weight:600;color:#475569;margin-right:4px;">${jobBedrooms} bed</span>
                  <span style="display:inline-block;background:white;border:1px solid #e2e8f0;border-radius:100px;padding:4px 12px;font-size:12px;font-weight:600;color:#475569;margin-right:4px;">${jobBathrooms} bath</span>
                  <span style="display:inline-block;background:white;border:1px solid #e2e8f0;border-radius:100px;padding:4px 12px;font-size:12px;font-weight:600;color:#475569;margin-right:4px;">${jobHours} hrs</span>
                  <span style="display:inline-block;background:#fefce8;border:1px solid #fef08a;border-radius:100px;padding:4px 12px;font-size:12px;font-weight:700;color:#92400e;">£${jobRate}/hr</span>
                </td></tr>
                <tr><td>
                  <a href="${appUrl}/customer/dashboard" style="display:inline-block;background:white;border:1.5px solid #e2e8f0;border-radius:8px;padding:7px 16px;font-size:13px;font-weight:600;color:#0f172a;text-decoration:none;">View your listing →</a>
                </td></tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" style="border:1.5px solid #e2e8f0;border-radius:16px;overflow:hidden;margin-bottom:20px;">
                <tr>
                  <td style="padding:20px 20px 16px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="vertical-align:middle;">
                          <table cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="vertical-align:middle;">
                                <div style="width:52px;height:52px;min-width:52px;border-radius:50%;background:#2563eb;text-align:center;display:table-cell;font-size:22px;font-weight:800;color:white;line-height:52px;">${cleanerInitial}</div>
                              </td>
                              <td style="padding-left:14px;vertical-align:middle;">
                                <div style="font-size:17px;font-weight:800;color:#0f172a;line-height:1.2;">${cleanerName}</div>
                                <div style="font-size:12px;color:#94a3b8;margin-top:3px;">Member since ${cleanerMemberSince}</div>
                              </td>
                            </tr>
                          </table>
                        </td>
                        <td style="text-align:right;vertical-align:middle;">
                          <table cellpadding="0" cellspacing="0" style="margin-left:auto;">
                            ${cleanerDbs ? `<tr><td style="font-size:11px;font-weight:600;color:#16a34a;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:100px;padding:3px 10px;white-space:nowrap;">✓ DBS checked</td></tr>` : ''}
                            ${cleanerRightToWork ? `<tr><td style="font-size:11px;font-weight:600;color:#16a34a;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:100px;padding:3px 10px;white-space:nowrap;padding-top:4px;">✓ Right to work</td></tr>` : ''}
                            ${cleanerInsured ? `<tr><td style="font-size:11px;font-weight:600;color:#16a34a;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:100px;padding:3px 10px;white-space:nowrap;padding-top:4px;">✓ Insured</td></tr>` : ''}
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:12px 20px;border-top:1px solid #f1f5f9;background:#fafafa;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="text-align:center;padding:8px 0;">
                          <div style="font-size:20px;font-weight:800;color:#0f172a;">${jobsAccepted}</div>
                          <div style="font-size:11px;color:#94a3b8;margin-top:2px;">Jobs accepted</div>
                        </td>
                        <td style="width:1px;background:#e2e8f0;"></td>
                        <td style="text-align:center;padding:8px 0;">
                          <div style="font-size:20px;font-weight:800;color:#0f172a;">${rating > 0 ? rating.toFixed(1) : '—'}<span style="font-size:13px;color:#f59e0b;margin-left:2px;">${rating > 0 ? '★' : ''}</span></div>
                          <div style="font-size:11px;color:#94a3b8;margin-top:2px;">Average rating</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 20px;border-top:1px solid #f1f5f9;background:#fafafa;">
                    <div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:10px;">Reviews</div>
                    ${reviewsSection}
                  </td>
                </tr>
                ${message ? `
                <tr>
                  <td style="padding:16px 20px;border-top:1px solid #f1f5f9;">
                    <div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px;">${cleanerNamePossessive} message</div>
                    <div style="background:#eff6ff;border-radius:12px;padding:14px 16px;border-left:3px solid #2563eb;">
                      <p style="margin:0;font-size:14px;color:#1e40af;line-height:1.6;">${message}</p>
                    </div>
                  </td>
                </tr>` : ''}
                <tr>
                  <td style="padding:16px 20px 20px;border-top:1px solid #f1f5f9;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width:50%;padding-right:6px;">
                          <a href="${acceptUrl}" style="display:block;background:#16a34a;color:white;font-size:14px;font-weight:700;padding:14px 0;border-radius:10px;text-decoration:none;text-align:center;">✓ Accept &amp; chat</a>
                        </td>
                        <td style="width:50%;padding-left:6px;">
                          <a href="${declineUrl}" style="display:block;background:white;color:#ef4444;font-size:14px;font-weight:700;padding:14px 0;border-radius:10px;text-decoration:none;text-align:center;border:1.5px solid #fecaca;">✕ Decline</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.5;text-align:center;">
                Manage all your applications from your <a href="${appUrl}/customer/dashboard" style="color:#2563eb;">Vouchee dashboard</a>.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:24px 0 0;text-align:center;">
              <p style="margin:0;font-size:12px;color:#94a3b8;">
                © 2026 Vouchee · <a href="${appUrl}" style="color:#94a3b8;">vouchee.co.uk</a> · <a href="mailto:hello@vouchee.co.uk" style="color:#94a3b8;">hello@vouchee.co.uk</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

    const { data, error } = await resend.emails.send({
      from: 'Vouchee <hello@vouchee.co.uk>',
      to: customerEmail,
      subject: `New application from ${cleanerName}`,
      html,
    })

    if (error) {
      console.error('Resend error:', error)
      return NextResponse.json({ error }, { status: 500 })
    }

    return NextResponse.json({ success: true, id: data?.id })
  } catch (err: any) {
    console.error('Email API error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}