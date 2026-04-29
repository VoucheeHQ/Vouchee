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
// GET /api/cleaners/[id]/card
//
// Returns the canonical CleanerCardData for a single cleaner. Uses the service
// role to bypass RLS — the customer dashboard's previous client-side join was
// silently dropping fields whenever a customer tried to read another user's
// profile/cleaner data.
//
// Auth: caller must be logged in. Anyone with a session can read any cleaner's
// card data (this is intentional — cleaner names + ratings are already public
// at /c/<short_id>).
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: cleanerId } = await params
  if (!cleanerId) return NextResponse.json({ error: 'Missing cleaner id' }, { status: 400 })

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

  // ─── 1. Cleaner row ──────────────────────────────────────────────────────
  const { data: cleaner, error: cleanerErr } = await admin
    .from('cleaners')
    .select('id, profile_id, short_id, created_at, dbs_checked, right_to_work, has_insurance, cleans_completed, rating_average, rating_count, zones')
    .eq('id', cleanerId)
    .single() as { data: any, error: any }

  if (cleanerErr || !cleaner) return NextResponse.json({ error: 'Cleaner not found' }, { status: 404 })

  // ─── 2. Profile row ──────────────────────────────────────────────────────
  const { data: profile } = await admin
    .from('profiles').select('full_name').eq('id', cleaner.profile_id).single() as { data: { full_name: string | null } | null }

  const fullName = profile?.full_name ?? ''

  // ─── 3. Real reviews (top 3, most recent first) ──────────────────────────
  // The reviews table stores customer_profile_id → profiles.id directly,
  // and uses `stars` for the rating value.
  const reviews: CleanerCardData['reviews'] = []
  try {
    const { data: revRows } = await admin
      .from('reviews')
      .select('id, stars, body, created_at, customer_profile_id, hidden')
      .eq('cleaner_id', cleanerId)
      .eq('hidden', false)
      .order('created_at', { ascending: false })
      .limit(3) as { data: Array<{ id: string; stars: number; body: string | null; created_at: string; customer_profile_id: string; hidden: boolean }> | null }

    if (revRows && revRows.length > 0) {
      // customer_profile_id is already profiles.id, look up full names directly
      const profileIds = Array.from(new Set(revRows.map(r => r.customer_profile_id)))
      const { data: profileRows } = await admin
        .from('profiles').select('id, full_name').in('id', profileIds) as { data: Array<{ id: string; full_name: string | null }> | null }
      const profileMap = new Map((profileRows ?? []).map(p => [p.id, p.full_name]))

      for (const r of revRows) {
        const customerName = profileMap.get(r.customer_profile_id)
        reviews.push({
          id: r.id,
          rating: r.stars,
          body: r.body ?? '',
          customer_first_name: formatFirstName(customerName),
          created_at: r.created_at,
        })
      }
    }
  } catch (e) {
    // reviews table may not exist in all environments — non-fatal
    console.warn('reviews lookup failed (non-fatal):', e)
  }

  // ─── 4. Unique customers count ───────────────────────────────────────────
  // From applications where this cleaner won the job (status='accepted' AND
  // request reached fulfilled). Cheaper to compute here than to add a column.
  let uniqueCustomers = 0
  try {
    const { data: wonApps } = await admin
      .from('applications')
      .select('request_id, status, clean_requests!inner(status)')
      .eq('cleaner_id', cleanerId)
      .eq('status', 'accepted') as { data: Array<{ request_id: string; clean_requests: { status: string } }> | null }
    uniqueCustomers = new Set(
      (wonApps ?? [])
        .filter(a => a.clean_requests?.status === 'fulfilled')
        .map(a => a.request_id)
    ).size
  } catch {}

  // ─── 5. Build response ───────────────────────────────────────────────────
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
      cleans_completed: cleaner.cleans_completed ?? 0,
      rating_average: cleaner.rating_count > 0 ? cleaner.rating_average : null,
      rating_count: cleaner.rating_count ?? 0,
      unique_customers: uniqueCustomers,
    },
    reviews,
    zones: cleaner.zones ?? [],
  }

  return NextResponse.json({ cleaner: card })
}