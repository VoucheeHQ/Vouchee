'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/database.types'

// ─── Types ───────────────────────────────────────────

type ServiceType = 'regular' | 'deep_clean' | 'end_of_tenancy' | 'oven_clean'
type HorshamZone =
  | 'central_south_east'
  | 'north_west'
  | 'north_east_roffey'
  | 'south_west'
  | 'warnham_north'
  | 'broadbridge_heath'
  | 'mannings_heath'
  | 'faygate_kilnwood_vale'
  | 'christs_hospital'

type JobStatus = 'pending' | 'assigned' | 'active' | 'completed' | 'cancelled'

interface Job {
  id: string
  service_type: ServiceType
  zone: HorshamZone | null
  bedrooms: number
  bathrooms: number
  has_pets: boolean
  preferred_day: string | null
  preferred_time: string | null
  price_per_session: number | null
  status: JobStatus
  created_at: string
  updated_at: string
  // joined from customers
  frequency?: 'weekly' | 'fortnightly' | 'monthly'
}

// ─── Display helpers ─────────────────────────────────

const SERVICE_LABELS: Record<ServiceType, string> = {
  regular: 'Regular Clean',
  deep_clean: 'Deep Clean',
  end_of_tenancy: 'End of Tenancy',
  oven_clean: 'Oven Clean',
}

const SERVICE_ICONS: Record<ServiceType, string> = {
  regular: '🏠',
  deep_clean: '✨',
  end_of_tenancy: '🔑',
  oven_clean: '🍳',
}

const ZONE_LABELS: Record<HorshamZone, string> = {
  central_south_east: 'Central / South East',
  north_west: 'North West',
  north_east_roffey: 'North East / Roffey',
  south_west: 'South West',
  warnham_north: 'Warnham & North',
  broadbridge_heath: 'Broadbridge Heath',
  mannings_heath: 'Mannings Heath',
  faygate_kilnwood_vale: 'Faygate / Kilnwood Vale',
  christs_hospital: "Christ's Hospital",
}

const FREQUENCY_LABELS: Record<string, string> = {
  weekly: 'Weekly',
  fortnightly: 'Fortnightly',
  monthly: 'Monthly',
}

const DEFAULT_PRICES: Record<string, number> = {
  weekly: 9.99,
  fortnightly: 14.99,
  monthly: 19.99,
}

function getStatusBadge(status: JobStatus) {
  switch (status) {
    case 'pending':
      return { label: 'Open', color: 'bg-green-100 text-green-700 border-green-200' }
    case 'assigned':
    case 'active':
      return { label: 'Filled', color: 'bg-blue-100 text-blue-700 border-blue-200' }
    case 'completed':
      return { label: 'Completed', color: 'bg-gray-100 text-gray-500 border-gray-200' }
    case 'cancelled':
      return { label: 'Cancelled', color: 'bg-red-50 text-red-400 border-red-100' }
    default:
      return { label: status, color: 'bg-gray-100 text-gray-500 border-gray-200' }
  }
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

// ─── Stats bar ───────────────────────────────────────

function StatsBar({ jobs }: { jobs: Job[] }) {
  const open = jobs.filter((j) => j.status === 'pending').length
  const filled = jobs.filter((j) => ['assigned', 'active'].includes(j.status)).length
  const total = jobs.length

  return (
    <div className="flex items-center gap-6 text-sm text-gray-500 border-b border-gray-100 pb-6 mb-8">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
        <span><strong className="text-gray-800 font-semibold">{open}</strong> open</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
        <span><strong className="text-gray-800 font-semibold">{filled}</strong> filled</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-gray-300 inline-block" />
        <span><strong className="text-gray-800 font-semibold">{total}</strong> total (last 10 days)</span>
      </div>
    </div>
  )
}

// ─── Job Card ────────────────────────────────────────

function JobCard({ job }: { job: Job }) {
  const status = getStatusBadge(job.status)
  const price = job.price_per_session ?? (job.frequency ? DEFAULT_PRICES[job.frequency] : null)
  const isOpen = job.status === 'pending'

  return (
    <div
      className={`relative bg-white rounded-2xl border p-6 transition-all duration-200 ${
        isOpen
          ? 'border-gray-200 shadow-sm hover:shadow-md hover:-translate-y-0.5'
          : 'border-gray-100 opacity-70'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{SERVICE_ICONS[job.service_type]}</span>
          <div>
            <h3 className="font-semibold text-gray-900 text-base leading-tight">
              {SERVICE_LABELS[job.service_type]}
            </h3>
            {job.zone && (
              <p className="text-sm text-gray-500 mt-0.5">{ZONE_LABELS[job.zone]}</p>
            )}
          </div>
        </div>
        <span
          className={`text-xs font-medium px-2.5 py-1 rounded-full border shrink-0 ${status.color}`}
        >
          {status.label}
        </span>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-gray-50 rounded-xl p-3">
          <p className="text-xs text-gray-400 mb-0.5">Property</p>
          <p className="text-sm font-medium text-gray-800">
            {job.bedrooms} bed · {job.bathrooms} bath
            {job.has_pets && ' · 🐾'}
          </p>
        </div>
        {job.frequency && (
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-400 mb-0.5">Frequency</p>
            <p className="text-sm font-medium text-gray-800">
              {FREQUENCY_LABELS[job.frequency]}
            </p>
          </div>
        )}
        {job.preferred_day && (
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-400 mb-0.5">Preferred day</p>
            <p className="text-sm font-medium text-gray-800">{job.preferred_day}</p>
          </div>
        )}
        {price && (
          <div className="bg-amber-50 rounded-xl p-3">
            <p className="text-xs text-amber-600 mb-0.5">Per session</p>
            <p className="text-sm font-semibold text-amber-700">£{price.toFixed(2)}</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">{timeAgo(job.created_at)}</span>
        {isOpen && (
          <Link
            href="/cleaner/apply"
            className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
          >
            Apply as cleaner →
          </Link>
        )}
      </div>
    </div>
  )
}

// ─── Filter bar ──────────────────────────────────────

type FilterState = {
  status: 'all' | 'open' | 'closed'
  service: ServiceType | 'all'
  zone: HorshamZone | 'all'
}

function FilterBar({
  filters,
  onChange,
}: {
  filters: FilterState
  onChange: (f: FilterState) => void
}) {
  return (
    <div className="flex flex-wrap gap-3 mb-6">
      {/* Status */}
      <div className="flex rounded-xl border border-gray-200 overflow-hidden text-sm">
        {(['all', 'open', 'closed'] as const).map((s) => (
          <button
            key={s}
            onClick={() => onChange({ ...filters, status: s })}
            className={`px-4 py-2 font-medium transition-colors capitalize ${
              filters.status === s
                ? 'bg-gray-900 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {s === 'all' ? 'All' : s === 'open' ? 'Open' : 'Recent'}
          </button>
        ))}
      </div>

      {/* Service type */}
      <select
        value={filters.service}
        onChange={(e) => onChange({ ...filters, service: e.target.value as ServiceType | 'all' })}
        className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="all">All services</option>
        {Object.entries(SERVICE_LABELS).map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>

      {/* Zone */}
      <select
        value={filters.zone}
        onChange={(e) => onChange({ ...filters, zone: e.target.value as HorshamZone | 'all' })}
        className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="all">All areas</option>
        {Object.entries(ZONE_LABELS).map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────

export default function JobsPage() {
  const supabase = createClientComponentClient<Database>()
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<FilterState>({
    status: 'all',
    service: 'all',
    zone: 'all',
  })

  useEffect(() => {
    async function fetchJobs() {
      setLoading(true)
      const { data, error } = await supabase
        .from('clean_requests')
        .select(`
          id,
          service_type,
          zone,
          bedrooms,
          bathrooms,
          has_pets,
          preferred_day,
          preferred_time,
          price_per_session,
          status,
          created_at,
          updated_at
        `)
        .order('created_at', { ascending: false })
        .limit(100)

      if (!error && data) {
        const filtered = data.filter((row: any) => {
          if (row.status === 'pending') return true
          const updatedAt = new Date(row.updated_at).getTime()
          return updatedAt > Date.now() - 10 * 24 * 60 * 60 * 1000
        })
        setJobs(filtered as Job[])
      }
      setLoading(false)
    }

    fetchJobs()
  }, [supabase])

  // Apply filters
  const filtered = jobs.filter((job) => {
    if (filters.status === 'open' && job.status !== 'pending') return false
    if (filters.status === 'closed' && job.status === 'pending') return false
    if (filters.service !== 'all' && job.service_type !== filters.service) return false
    if (filters.zone !== 'all' && job.zone !== filters.zone) return false
    return true
  })

  const openCount = jobs.filter((j) => j.status === 'pending').length

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Hero */}
      <section className="border-b border-gray-100 bg-white">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block" />
            <span className="text-sm font-medium text-green-600">
              {openCount} request{openCount !== 1 ? 's' : ''} live now
            </span>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3 tracking-tight">
            Active cleaning requests
          </h1>
          <p className="text-lg text-gray-500 max-w-xl">
            Browse open jobs from homeowners in Horsham. See what customers are paying and apply to become a Vouchee cleaner to pick up work.
          </p>
          <div className="mt-6 flex gap-3">
            <Link
              href="/cleaner/apply"
              className="inline-flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors"
            >
              Become a cleaner →
            </Link>
            <Link
              href="/request/property"
              className="inline-flex items-center gap-2 border border-gray-200 text-gray-700 px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Post a request
            </Link>
          </div>
        </div>
      </section>

      {/* Jobs list */}
      <section className="max-w-4xl mx-auto px-4 py-10">
        {loading ? (
          <div className="grid sm:grid-cols-2 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse">
                <div className="flex gap-3 mb-4">
                  <div className="w-10 h-10 bg-gray-100 rounded-xl" />
                  <div className="flex-1">
                    <div className="h-4 bg-gray-100 rounded w-32 mb-2" />
                    <div className="h-3 bg-gray-100 rounded w-24" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="h-16 bg-gray-50 rounded-xl" />
                  <div className="h-16 bg-gray-50 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <StatsBar jobs={jobs} />
            <FilterBar filters={filters} onChange={setFilters} />

            {filtered.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-5xl mb-4">🔍</p>
                <p className="text-gray-500 text-lg">No requests match your filters</p>
                <button
                  onClick={() => setFilters({ status: 'all', service: 'all', zone: 'all' })}
                  className="mt-3 text-blue-600 text-sm hover:underline"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {filtered.map((job) => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>
            )}
          </>
        )}

        {/* CTA for cleaners */}
        {!loading && filtered.length > 0 && (
          <div className="mt-12 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-8 text-center">
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Want to pick up cleaning work in Horsham?
            </h2>
            <p className="text-gray-500 mb-5 max-w-md mx-auto text-sm">
              Join Vouchee as a vetted cleaner and apply for open requests like these directly through the platform.
            </p>
            <Link
              href="/cleaner/apply"
              className="inline-flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors"
            >
              Apply to become a cleaner →
            </Link>
          </div>
        )}
      </section>
    </main>
  )
}
