import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { CleanerCard } from '@/components/cleaner-card'
import {
  CleanerCardData,
  formatNameShort,
  formatFirstName,
  formatInitial,
  formatMemberSince,
} from '@/lib/cleaner-card'

// ─────────────────────────────────────────────────────────────────────────────
// /cleaners/[id] — public cleaner profile by UUID.
//
// Linked from the customer-confirmation email after GoCardless setup.
// Renders the canonical <CleanerCard /> with two access tiers:
//   - Assigned customer (has a clean_request assigned to this cleaner):
//     full reviews + contact info (email/phone)
//   - Everyone else: review stars + author first name only; bodies replaced
//     with a "🔒 hidden — match with this cleaner" placeholder; no contact
//
// This page does its own service-role queries rather than calling
// /api/cleaners/[id]/card because (a) we need conditional content based on
// access tier, (b) the API requires a logged-in session which would break
// the public-share case.
// ─────────────────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: 'Cleaner profile',
  robots: { index: false, follow: false },
}

type WonAppRow = { request_id: string; clean_requests: { status: string } | { status: string }[] | null }

export default async function CleanerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: cleanerId } = await params

  const admin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // ─── Fetch cleaner core
  const { data: cleaner } = await admin
    .from('cleaners')
    .select(
      'id, profile_id, short_id, created_at, dbs_checked, right_to_work, has_insurance, rating_average, rating_count, zones'
    )
    .eq('id', cleanerId)
    .single() as { data: {
      id: string
      profile_id: string
      short_id: string | null
      created_at: string
      dbs_checked: boolean | null
      right_to_work: boolean | null
      has_insurance: boolean | null
      rating_average: number | null
      rating_count: number | null
      zones: string[] | null
    } | null }

  if (!cleaner) notFound()

  // ─── Auth context — anonymous OK
  const supabaseAuth = await createServerClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()

  // ─── Check assignment if logged in
  let isAssigned = false
  if (user) {
    const { data: customerRow } = await admin
      .from('customers')
      .select('id')
      .eq('profile_id', user.id)
      .single() as { data: { id: string } | null }

    if (customerRow) {
      const { data: assignedReq } = await admin
        .from('clean_requests')
        .select('id')
        .eq('customer_id', customerRow.id)
        .eq('assigned_cleaner_id', cleanerId)
        .limit(1)
      isAssigned = (assignedReq?.length ?? 0) > 0
    }
  }

  // ─── Parallel: profile, reviews, won-apps, review-author profiles
  const [profileRes, reviewsRes, wonAppsRes] = await Promise.all([
    admin.from('profiles').select('full_name, email, phone').eq('id', cleaner.profile_id).single(),
    admin
      .from('reviews')
      .select('id, stars, body, created_at, customer_profile_id, hidden')
      .eq('cleaner_id', cleanerId)
      .eq('hidden', false)
      .order('created_at', { ascending: false })
      .limit(3),
    admin
      .from('applications')
      .select('request_id, clean_requests!inner(status)')
      .eq('cleaner_id', cleanerId)
      .eq('status', 'accepted'),
  ])

  const profile = (profileRes.data ?? null) as { full_name: string | null; email: string | null; phone: string | null } | null
  const revRows = (reviewsRes.data ?? []) as Array<{
    id: string
    stars: number
    body: string | null
    created_at: string
    customer_profile_id: string
  }>
  const wonApps = ((wonAppsRes.data ?? []) as unknown) as WonAppRow[]

  const reviewProfileIds = Array.from(new Set(revRows.map(r => r.customer_profile_id)))
  const { data: reviewProfiles } = reviewProfileIds.length > 0
    ? await admin.from('profiles').select('id, full_name').in('id', reviewProfileIds)
    : { data: [] as Array<{ id: string; full_name: string | null }> }
  const reviewProfileMap = new Map(
    (reviewProfiles ?? []).map((p: any) => [p.id, p.full_name as string | null])
  )

  // ─── Jobs done = won applications whose clean_request is fulfilled
  const fulfilledApps = wonApps.filter(a => {
    const cr = a.clean_requests
    if (Array.isArray(cr)) return cr[0]?.status === 'fulfilled'
    return cr?.status === 'fulfilled'
  })

  const fullName = profile?.full_name ?? ''

  // For non-assigned viewers we keep the review structure (stars, author)
  // but replace the body with a lock placeholder. Same shape going into the
  // component means it renders cleanly either way.
  const reviews = revRows.map(r => ({
    id: r.id,
    rating: r.stars,
    body: isAssigned
      ? (r.body ?? '')
      : '🔒 Match with this cleaner to read the full review.',
    customer_first_name: formatFirstName(reviewProfileMap.get(r.customer_profile_id) ?? null),
    created_at: r.created_at,
  }))

  const card: CleanerCardData = {
    id: cleaner.id,
    profile_id: cleaner.profile_id,
    short_id: cleaner.short_id,
    full_name: fullName,
    name_short: formatNameShort(fullName),
    first_name: formatFirstName(fullName),
    initial: formatInitial(fullName),
    member_since: formatMemberSince(cleaner.created_at),
    member_since_iso: cleaner.created_at,
    credentials: {
      dbs_checked: !!cleaner.dbs_checked,
      right_to_work: !!cleaner.right_to_work,
      has_insurance: !!cleaner.has_insurance,
    },
    stats: {
      jobs_won: fulfilledApps.length,
      rating_average: (cleaner.rating_count ?? 0) > 0 ? cleaner.rating_average : null,
      rating_count: cleaner.rating_count ?? 0,
      unique_customers: new Set(fulfilledApps.map(a => a.request_id)).size,
    },
    reviews,
    zones: cleaner.zones ?? [],
  }

  const contact = isAssigned
    ? { email: profile?.email ?? null, phone: profile?.phone ?? null }
    : null

  return (
    <main style={{ minHeight: '100vh', background: '#f8fafc', padding: '40px 16px', fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ maxWidth: '640px', margin: '0 auto' }}>
        <div style={{ background: 'white', borderRadius: '16px', padding: '28px', border: '1.5px solid #e2e8f0', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
          <CleanerCard data={card} variant="public" contact={contact} />
        </div>

        {!isAssigned && (
          <div style={{ marginTop: '20px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '18px 22px', textAlign: 'center' }}>
            <div style={{ fontSize: '13px', color: '#1e40af', lineHeight: 1.6 }}>
              {user ? (
                <>Match with this cleaner to see their full reviews and contact details.</>
              ) : (
                <>
                  Already a customer?{' '}
                  <Link href="/login" style={{ color: '#2563eb', fontWeight: 700, textDecoration: 'none' }}>
                    Sign in
                  </Link>{' '}
                  to see more.
                </>
              )}
            </div>
          </div>
        )}

        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <Link href="/" style={{ fontSize: '13px', color: '#64748b', textDecoration: 'none' }}>
            ← Back to Vouchee
          </Link>
        </div>
      </div>
    </main>
  )
}
