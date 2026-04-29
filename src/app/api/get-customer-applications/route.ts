import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/get-customer-applications?requestIds=uuid1,uuid2,...
//
// Returns the customer's applications enriched with cleaner display names,
// member-since dates, and avatars — fetched server-side with the service role
// so RLS on cleaners + profiles can't strip the join data.
//
// Why this exists:
// The customer dashboard previously did a nested join from the client:
//   cleaners.select('profile_id, profiles(full_name)')
// which silently returned null for full_name when RLS denied the read,
// causing the application card to show "Cleaner" as a fallback. Routing
// through this endpoint guarantees the names come through.
// ─────────────────────────────────────────────────────────────────────────────

function formatFirstLastInitial(name: string): string {
  const parts = (name ?? '').trim().split(' ')
  if (parts.length > 1) return `${parts[0]} ${parts[parts.length - 1][0]}.`
  return parts[0] || 'Cleaner'
}

export async function GET(request: NextRequest) {
  // ─── Auth: confirm the caller is logged in and owns the requests ─────────
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

  // Verify caller owns the requested clean_request IDs
  const url = new URL(request.url)
  const requestIdsParam = url.searchParams.get('requestIds') ?? ''
  const requestIds = requestIdsParam.split(',').map(s => s.trim()).filter(Boolean)
  if (requestIds.length === 0) return NextResponse.json({ applications: [] })

  const { data: customerRecord } = await admin
    .from('customers').select('id').eq('profile_id', user.id).single() as { data: { id: string } | null }
  if (!customerRecord) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })

  // Confirm all requested IDs belong to this customer — prevents enumeration
  const { data: ownedRequests } = await admin
    .from('clean_requests').select('id').in('id', requestIds).eq('customer_id', customerRecord.id) as { data: { id: string }[] | null }
  const ownedIds = new Set((ownedRequests ?? []).map(r => r.id))
  const safeIds = requestIds.filter(id => ownedIds.has(id))
  if (safeIds.length === 0) return NextResponse.json({ applications: [] })

  // ─── Fetch + enrich applications ─────────────────────────────────────────
  const { data: apps, error: appErr } = await admin
    .from('applications')
    .select('id, cleaner_id, request_id, status, created_at, message')
    .in('request_id', safeIds)
    .order('created_at', { ascending: false })

  if (appErr || !apps) {
    console.error('applications fetch failed:', appErr)
    return NextResponse.json({ error: 'Failed to load applications' }, { status: 500 })
  }

  if (apps.length === 0) return NextResponse.json({ applications: [] })

  // Batch-fetch cleaners + profiles to avoid N+1
  const cleanerIds = Array.from(new Set(apps.map((a: any) => a.cleaner_id)))
  const { data: cleaners } = await admin
    .from('cleaners')
    .select('id, profile_id, created_at')
    .in('id', cleanerIds) as { data: Array<{ id: string; profile_id: string; created_at: string }> | null }

  const profileIds = (cleaners ?? []).map(c => c.profile_id)
  const { data: profiles } = profileIds.length > 0
    ? await admin.from('profiles').select('id, full_name').in('id', profileIds) as { data: Array<{ id: string; full_name: string | null }> | null }
    : { data: [] as Array<{ id: string; full_name: string | null }> }

  const cleanerMap = new Map((cleaners ?? []).map(c => [c.id, c]))
  const profileMap = new Map((profiles ?? []).map(p => [p.id, p]))

  const enriched = apps.map((app: any) => {
    const cleaner = cleanerMap.get(app.cleaner_id)
    const profile = cleaner ? profileMap.get(cleaner.profile_id) : null
    const fullName = profile?.full_name ?? ''
    const memberSince = cleaner?.created_at
      ? new Date(cleaner.created_at).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
      : 'Recently'
    return {
      id: app.id,
      cleaner_id: app.cleaner_id,
      request_id: app.request_id,
      status: app.status,
      created_at: app.created_at,
      message: app.message,
      cleaner_name: fullName ? formatFirstLastInitial(fullName) : 'Cleaner',
      cleaner_initial: fullName ? fullName[0]?.toUpperCase() : 'C',
      cleaner_member_since: memberSince,
    }
  })

  return NextResponse.json({ applications: enriched })
}