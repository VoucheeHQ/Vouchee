import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { Resend } from 'resend'
import { referrerHtml, refereeHtml } from '@/lib/emails/referral-credited'

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/test-referral-credited-emails
//
// Sends both flavours of the referral-credited email to the logged-in admin
// so they can preview the referrer and referee variants side-by-side.
// ─────────────────────────────────────────────────────────────────────────────

const resend = new Resend(process.env.RESEND_API_KEY!)

export async function POST(_request: NextRequest) {
  const supabaseAuth = await createServerClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data: profile } = await supabaseAdmin
    .from('profiles').select('role, email, full_name').eq('id', user.id).single() as { data: { role: string; email: string; full_name: string | null } | null }
  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.vouchee.co.uk'
  const firstName = profile.full_name?.split(' ')[0] ?? 'Adam'

  let referrerResult: { error?: string; id?: string } = {}
  let refereeResult: { error?: string; id?: string } = {}

  try {
    const res = await resend.emails.send({
      from: 'Vouchee <hello@vouchee.co.uk>',
      to: profile.email,
      subject: `[TEST] Your next Vouchee month is on us 🎉`,
      html: referrerHtml({ appUrl, firstName }),
    })
    referrerResult = { id: res.data?.id }
  } catch (err: any) {
    referrerResult = { error: err.message ?? 'send failed' }
  }

  try {
    const res = await resend.emails.send({
      from: 'Vouchee <hello@vouchee.co.uk>',
      to: profile.email,
      subject: `[TEST] Welcome to Vouchee — your first month is free 🎉`,
      html: refereeHtml({ appUrl, firstName }),
    })
    refereeResult = { id: res.data?.id }
  } catch (err: any) {
    refereeResult = { error: err.message ?? 'send failed' }
  }

  const ok = !referrerResult.error && !refereeResult.error
  return NextResponse.json({ success: ok, sentTo: profile.email, referrer: referrerResult, referee: refereeResult }, { status: ok ? 200 : 500 })
}
