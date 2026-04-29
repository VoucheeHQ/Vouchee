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
// GET /api/get-customer-applications?requestIds=uuid1,uuid2,...
//
// Returns the customer's applications, each with a full CleanerCardData blob
// embedded so the dashboard can render real reviews, ratings, cleans, etc.
//
// Why this exists:
// The customer dashboard previously did a nested join from the client which
// silently dropped fields whenever RLS blocked the read. Routing through this
// service-role endpoint guarantees the full payload comes through.
// ─────────────────────────────────────────────────────────────────────────────

interface AppWithCleaner {
  id: string
  cleaner_id: string
  request_id: string
  status: string
  created_at: string
  message: string | null
  cleaner: CleanerCardData
}

export async function GET(request: NextRequest) {
  // ─── Auth ─────────────────────────────────────────────────────────────────
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

  const url = new URL(request.url)
  const requestIdsParam = url.searchParams.get('requestIds') ?? ''
  const requestIds = requestIdsParam.split(',').map(s => s.trim()).filter(Boolean)
  if (requestIds.length === 0) return NextResponse.json({ applications: [] })

  // ─── Verify caller owns the requested clean_request IDs ─────────────────
  const { data: customerRecord } = await admin
    .from('customers').select('id').eq('profile_id', user.id).single() as { data: { id: string } | null }
  if (!customerRecord) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })

  const { data: ownedRequests } = await admin
    .from('clean_requests').select('id').in('id', requestIds).eq('customer_id', customerRecord.id) as { data: { id: string }[] | null }
  const ownedIds = new Set((ownedRequests ?? []).map(r => r.id))
  const safeIds = requestIds.filter(id => ownedIds.has(id))
  if (safeIds.length === 0) return NextResponse.json({ applications: [] })

  // ─── Fetch applications ──────────────────────────────────────────────────
  const { data: apps, error: appErr } = await admin
    .from('applications')
    .select('id, cleaner_id, request_id, status, created_at, message')
    .in('request_id', safeIds)
    .order('created_at', { ascending: false }) as { data: Array<{ id: string; cleaner_id: string; request_id: string; status: string; created_at: string; message: string | null }> | null, error: any }

  if (appErr || !apps) {
    console.error('applications fetch failed:', appErr)
    return NextResponse.json({ error: 'Failed to load applications' }, { status: 500 })
  }
  if (apps.length === 0) return NextResponse.json({ applications: [] })

  // ─── Batch-fetch cleaner card data ───────────────────────────────────────
  const cleanerIds = Array.from(new Set(apps.map(a => a.cleaner_id)))

  const { data: cleaners } = await admin
    .from('cleaners')
    .select('id, profile_id, short_id, created_at, dbs_checked, right_to_work, has_insurance, cleans_completed, rating_average, rating_count, zones')
    .in('id', cleanerIds) as { data: Array<any> | null }

  const profileIds = (cleaners ?? []).map(c => c.profile_id)
  const { data: profiles } = profileIds.length > 0
    ? await admin.from('profiles').select('id, full_name').in('id', profileIds) as { data: Array<{ id: string; full_name: string | null }> | null }
    : { data: [] as Array<{ id: string; full_name: string | null }> }

  // Reviews — top 3 per cleaner. We grab all reviews for these cleaners then
  // group, since per-cleaner queries would be N+1.
  // Schema: reviews uses `stars` and `customer_profile_id` (FK to profiles.id).
  const reviewsByCleaner = new Map<string, CleanerCardData['reviews']>()
  try {
    const { data: revRows } = await admin
      .from('reviews')
      .select('id, stars, body, created_at, customer_profile_id, cleaner_id, hidden')
      .in('cleaner_id', cleanerIds)
      .eq('hidden', false)
      .order('created_at', { ascending: false }) as { data: Array<any> | null }

    if (revRows && revRows.length > 0) {
      const revProfileIds = Array.from(new Set(revRows.map(r => r.customer_profile_id)))
      const { data: revProfileRows } = revProfileIds.length > 0
        ? await admin.from('profiles').select('id, full_name').in('id', revProfileIds) as { data: Array<{ id: string; full_name: string | null }> | null }
        : { data: [] as Array<{ id: string; full_name: string | null }> }

      const profileMap = new Map((revProfileRows ?? []).map(p => [p.id, p.full_name]))

      for (const r of revRows) {
        const list = reviewsByCleaner.get(r.cleaner_id) ?? []
        if (list.length >= 3) continue
        const customerName = profileMap.get(r.customer_profile_id)
        list.push({
          id: r.id,
          rating: r.stars,
          body: r.body ?? '',
          customer_first_name: formatFirstName(customerName),
          created_at: r.created_at,
        })
        reviewsByCleaner.set(r.cleaner_id, list)
      }
    }
  } catch (e) {
    console.warn('reviews lookup failed (non-fatal):', e)
  }

  // Unique customers per cleaner — single query, group in memory
  const uniqueCustomersByCleaner = new Map<string, number>()
  try {
    const { data: wonApps } = await admin
      .from('applications')
      .select('cleaner_id, request_id, status, clean_requests!inner(status)')
      .in('cleaner_id', cleanerIds)
      .eq('status', 'accepted') as { data: Array<{ cleaner_id: string; request_id: string; clean_requests: { status: string } }> | null }
    if (wonApps) {
      const grouped = new Map<string, Set<string>>()
      for (const w of wonApps) {
        if (w.clean_requests?.status !== 'fulfilled') continue
        const set = grouped.get(w.cleaner_id) ?? new Set()
        set.add(w.request_id)
        grouped.set(w.cleaner_id, set)
      }
      for (const [cid, set] of grouped) uniqueCustomersByCleaner.set(cid, set.size)
    }
  } catch {}

  // ─── Build maps for fast lookup ──────────────────────────────────────────
  const cleanerMap = new Map((cleaners ?? []).map(c => [c.id, c]))
  const profileMap = new Map((profiles ?? []).map(p => [p.id, p]))

  const enriched: AppWithCleaner[] = apps.map(app => {
    const cleaner = cleanerMap.get(app.cleaner_id)
    const profile = cleaner ? profileMap.get(cleaner.profile_id) : null
    const fullName = profile?.full_name ?? ''

    const cleanerCard: CleanerCardData = {
      id: app.cleaner_id,
      profile_id: cleaner?.profile_id ?? '',
      short_id: cleaner?.short_id ?? null,
      full_name: fullName,
      name_short: formatNameShort(fullName),
      first_name: formatFirstName(fullName),
      initial: formatInitial(fullName),
      member_since: formatMemberSince(cleaner?.created_at),
      member_since_iso: cleaner?.created_at ?? '',
      credentials: {
        dbs_checked: !!cleaner?.dbs_checked,
        right_to_work: !!cleaner?.right_to_work,
        has_insurance: !!cleaner?.has_insurance,
      },
      stats: {
        cleans_completed: cleaner?.cleans_completed ?? 0,
        rating_average: (cleaner?.rating_count ?? 0) > 0 ? cleaner.rating_average : null,
        rating_count: cleaner?.rating_count ?? 0,
        unique_customers: uniqueCustomersByCleaner.get(app.cleaner_id) ?? 0,
      },
      reviews: reviewsByCleaner.get(app.cleaner_id) ?? [],
      zones: cleaner?.zones ?? [],
    }

    return {
      id: app.id,
      cleaner_id: app.cleaner_id,
      request_id: app.request_id,
      status: app.status,
      created_at: app.created_at,
      message: app.message,
      cleaner: cleanerCard,
    }
  })

  return NextResponse.json({ applications: enriched })
}