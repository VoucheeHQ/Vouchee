import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import {
  CleanerCardData,
  formatNameShort,
  formatFirstName,
  formatInitial,
  formatMemberSince,
} from '@/lib/cleaner-card'

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/cleaners/[id]/card[?withContact=1]
//
// Returns the canonical CleanerCardData for a single cleaner. Uses the service
// role to bypass RLS — the customer dashboard's previous client-side join was
// silently dropping fields whenever a customer tried to read another user's
// profile/cleaner data.
//
// Auth: caller must be logged in. Anyone with a session can read any cleaner's
// card data (this is intentional — cleaner names + ratings are already public
// at /c/<short_id>).
//
// ?withContact=1: include the cleaner's email + phone in the response IF the
// caller is a customer with a fulfilled clean_request assigned to this
// cleaner. Off by default so the chat widget (which only needs name + zone)
// doesn't pay for the extra customer/ownership lookups. The customer
// dashboard's confirmed-cleaner card opts in.
//
// Performance: all independent queries run in parallel via Promise.all.
// Round-trip count is ~2 instead of the previous sequential ~7.
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: cleanerId } = await params
  if (!cleanerId) return NextResponse.json({ error: 'Missing cleaner id' }, { status: 400 })

  const withContact = req.nextUrl.searchParams.get('withContact') === '1'

  // Auth check — any logged-in user
  const cookieStore = await cookies()
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {}
        },
      },
    }
  )
  const { data: { user }, error: userErr } = await supabaseAuth.auth.getUser()
  if (userErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // ─── Wave 1: fire everything that only needs (cleanerId, user.id) in parallel
  // None of these depend on each other. The cleaner row is the one we must
  // have — if it fails, we 404 and ignore the rest.
  const [
    cleanerRes,
    reviewsRes,
    wonAppsRes,
    callerCustomerRes,
  ] = await Promise.all([
    admin
      .from('cleaners')
      .select('id, profile_id, short_id, created_at, dbs_checked, right_to_work, has_insurance, rating_average, rating_count, zones')
      .eq('id', cleanerId)
      .single(),
    admin
      .from('reviews')
      .select('id, stars, body, created_at, customer_profile_id, hidden')
      .eq('cleaner_id', cleanerId)
      .eq('hidden', false)
      .order('created_at', { ascending: false })
      .limit(3),
    admin
      .from('applications')
      .select('request_id, status, clean_requests!inner(status)')
      .eq('cleaner_id', cleanerId)
      .eq('status', 'accepted'),
    // Only look up the caller's customer row when contact info was requested.
    // Skipping this saves a round-trip for every chat-widget header load.
    withContact
      ? admin.from('customers').select('id').eq('profile_id', user.id).single()
      : Promise.resolve({ data: null, error: null }),
  ])

  const cleaner = cleanerRes.data as any
  if (cleanerRes.error || !cleaner) {
    return NextResponse.json({ error: 'Cleaner not found' }, { status: 404 })
  }

  const revRows = (reviewsRes.data ?? []) as Array<{ id: string; stars: number; body: string | null; created_at: string; customer_profile_id: string; hidden: boolean }>
  // Supabase types !inner joins as an array; the canonical original code at
  // this site cast the same shape, kept here for parity.
  const wonApps = ((wonAppsRes.data ?? []) as unknown) as Array<{ request_id: string; status: string; clean_requests: { status: string } }>
  const callerCustomer = (callerCustomerRes.data ?? null) as { id: string } | null

  // ─── Wave 2: depends on wave 1
  //  - profile lookup needs cleaner.profile_id
  //  - review-author names need the IDs from revRows
  //  - ownership check needs callerCustomer.id (only if withContact)
  const reviewProfileIds = Array.from(new Set(revRows.map(r => r.customer_profile_id)))

  const [profileRes, reviewProfilesRes, ownershipRes] = await Promise.all([
    admin
      .from('profiles')
      .select('full_name, email, phone')
      .eq('id', cleaner.profile_id)
      .single(),
    reviewProfileIds.length > 0
      ? admin.from('profiles').select('id, full_name').in('id', reviewProfileIds)
      : Promise.resolve({ data: [] }),
    withContact && callerCustomer
      ? admin
          .from('clean_requests')
          .select('id')
          .eq('customer_id', callerCustomer.id)
          .eq('assigned_cleaner_id', cleanerId)
          .in('status', ['fulfilled'])
          .limit(1)
      : Promise.resolve({ data: null }),
  ])

  const profile = (profileRes.data ?? null) as { full_name: string | null; email: string | null; phone: string | null } | null
  const fullName = profile?.full_name ?? ''

  const reviewProfileMap = new Map(
    ((reviewProfilesRes.data ?? []) as Array<{ id: string; full_name: string | null }>)
      .map(p => [p.id, p.full_name])
  )

  // Contact gated on caller having a fulfilled request with this cleaner.
  const ownsFulfilled = withContact && Array.isArray(ownershipRes.data) && ownershipRes.data.length > 0
  const contact: { email: string | null; phone: string | null } | null = ownsFulfilled
    ? { email: profile?.email ?? null, phone: profile?.phone ?? null }
    : null

  // ─── Build reviews list (in original order)
  const reviews: CleanerCardData['reviews'] = revRows.map(r => ({
    id: r.id,
    rating: r.stars,
    body: r.body ?? '',
    customer_first_name: formatFirstName(reviewProfileMap.get(r.customer_profile_id) ?? null),
    created_at: r.created_at,
  }))

  // ─── Jobs won + unique customers — derived from wonApps + clean_requests join
  const fulfilledApps = wonApps.filter(a => a.clean_requests?.status === 'fulfilled')
  const jobsWon = fulfilledApps.length
  const uniqueCustomers = new Set(fulfilledApps.map(a => a.request_id)).size

  const card: CleanerCardData = {
    id: cleaner.id,
    profile_id: cleaner.profile_id,
    short_id: cleaner.short_id ?? null,
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
      jobs_won: jobsWon,
      rating_average: cleaner.rating_count > 0 ? cleaner.rating_average : null,
      rating_count: cleaner.rating_count ?? 0,
      unique_customers: uniqueCustomers,
    },
    reviews,
    zones: cleaner.zones ?? [],
  }

  return NextResponse.json(
    { cleaner: card, contact },
    {
      headers: {
        // Short private cache so a StrictMode double-mount / quick navigation
        // doesn't refetch. 30s is short enough that rating/jobs-won updates
        // surface quickly but long enough to absorb the most common hits.
        'Cache-Control': 'private, max-age=30',
      },
    }
  )
}
