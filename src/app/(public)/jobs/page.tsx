'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// ─── Types ───────────────────────────────────────────

type HorshamZone =
  | 'central_south_east' | 'north_west' | 'north_east_roffey'
  | 'south_west' | 'warnham_north' | 'broadbridge_heath'
  | 'mannings_heath' | 'faygate_kilnwood_vale' | 'christs_hospital'

type ServiceType = 'regular' | 'deep_clean' | 'end_of_tenancy' | 'oven_clean'
type JobStatus = 'pending' | 'assigned' | 'active' | 'completed' | 'cancelled'

interface Job {
  id: string
  service_type: ServiceType
  zone: HorshamZone | null
  bedrooms: number
  bathrooms: number
  has_pets: boolean
  preferred_days: string[] | null
  preferred_day: string | null
  time_of_day: string | null
  hourly_rate: number | null
  hours_per_session: number | null
  tasks: string[] | null
  customer_notes: string | null
  status: JobStatus
  created_at: string
  updated_at: string
  frequency?: string | null
}

// ─── Display helpers ──────────────────────────────────

const ZONE_LABELS: Record<HorshamZone, string> = {
  central_south_east: 'Central Horsham',
  north_west: 'North West Horsham',
  north_east_roffey: 'North East / Roffey',
  south_west: 'South West Horsham',
  warnham_north: 'Warnham & North',
  broadbridge_heath: 'Broadbridge Heath',
  mannings_heath: 'Mannings Heath',
  faygate_kilnwood_vale: 'Faygate / Kilnwood Vale',
  christs_hospital: "Christ's Hospital",
}

const SERVICE_LABELS: Record<ServiceType, string> = {
  regular: 'Regular Clean',
  deep_clean: 'Deep Clean',
  end_of_tenancy: 'End of Tenancy',
  oven_clean: 'Oven Clean',
}

const FREQUENCY_LABELS: Record<string, string> = {
  weekly: 'Weekly',
  fortnightly: 'Fortnightly',
  monthly: 'Monthly',
}

// Tasks: green = regular, yellow = special
const TASK_LABELS: Record<string, { label: string; special: boolean }> = {
  general_cleaning: { label: 'General cleaning', special: false },
  hoovering:        { label: 'Hoovering', special: false },
  mopping:          { label: 'Mopping', special: false },
  bathroom_deep_clean: { label: 'Bathroom deep clean', special: false },
  kitchen_deep_clean:  { label: 'Kitchen deep clean', special: false },
  ironing:          { label: 'Ironing', special: true },
  oven_clean:       { label: 'Oven clean', special: true },
  windows:          { label: 'Windows', special: true },
  laundry:          { label: 'Laundry', special: true },
  hob_clean:        { label: 'Hob clean', special: true },
  extractor_clean:  { label: 'Extractor clean', special: true },
  fridge_clean:     { label: 'Fridge clean', special: true },
}

const REGULAR_TASKS = ['general_cleaning', 'hoovering', 'mopping', 'bathroom_deep_clean', 'kitchen_deep_clean']

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  const hours = Math.floor(diff / 3600000)
  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  return 'Just now'
}

// ─── Job Card ─────────────────────────────────────────

function JobCard({ job }: { job: Job }) {
  const [notesOpen, setNotesOpen] = useState(false)
  const [tasksExpanded, setTasksExpanded] = useState(false)

  const isCompleted = job.status === 'completed' || job.status === 'cancelled'
  const zone = job.zone ? ZONE_LABELS[job.zone] : 'Horsham'
  const days = (job.preferred_days?.length ? job.preferred_days : job.preferred_day ? [job.preferred_day] : [])
  const daysLabel = days.length > 0 ? days.map(d => d.slice(0, 3)).join(' · ') : null
  const estPerSession = job.hourly_rate && job.hours_per_session
    ? (job.hourly_rate * job.hours_per_session).toFixed(2)
    : null

  const allTasks = job.tasks ?? []
  const primaryTasks = allTasks.filter(t => REGULAR_TASKS.includes(t))
  const extraTasks = allTasks.filter(t => !REGULAR_TASKS.includes(t))
  const visibleTasks = tasksExpanded ? allTasks : primaryTasks
  const hiddenCount = extraTasks.length

  return (
    <div className={`relative rounded-2xl border bg-white transition-all duration-200 ${
      isCompleted
        ? 'opacity-60 border-gray-200'
        : 'border-gray-200 shadow-sm hover:shadow-md hover:-translate-y-0.5'
    }`}>

      {/* Completed stamp */}
      {isCompleted && (
        <div className="absolute top-4 right-4 z-10">
          <span className="text-xs font-semibold tracking-widest uppercase text-gray-400 border border-gray-300 rounded-full px-2.5 py-1">
            Filled
          </span>
        </div>
      )}

      <div className="p-5">
        {/* Header */}
        <div className="mb-3">
          <div className="flex items-start gap-2 mb-1">
            <span className="text-base">📍</span>
            <h3 className="font-bold text-gray-900 text-lg leading-tight">{zone}</h3>
          </div>
          <p className="text-sm text-gray-500 ml-6">{SERVICE_LABELS[job.service_type]}</p>
        </div>

        {/* Tag row */}
        <div className="flex flex-wrap gap-1.5 mb-4 ml-0">
          {job.bedrooms > 0 && (
            <span className="text-xs bg-gray-100 text-gray-700 rounded-full px-2.5 py-1 font-medium">
              {job.bedrooms} bed
            </span>
          )}
          {job.hours_per_session && (
            <span className="text-xs bg-gray-100 text-gray-700 rounded-full px-2.5 py-1 font-medium">
              {job.hours_per_session} hrs
            </span>
          )}
          {job.frequency && (
            <span className="text-xs bg-gray-100 text-gray-700 rounded-full px-2.5 py-1 font-medium">
              {FREQUENCY_LABELS[job.frequency] ?? job.frequency}
            </span>
          )}
          {daysLabel && (
            <span className="text-xs bg-gray-100 text-gray-700 rounded-full px-2.5 py-1 font-medium">
              {daysLabel}
            </span>
          )}
          {job.time_of_day && (
            <span className="text-xs bg-gray-100 text-gray-700 rounded-full px-2.5 py-1 font-medium">
              {job.time_of_day}
            </span>
          )}
          {job.has_pets && (
            <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2.5 py-1 font-medium">
              🐾 Pets
            </span>
          )}
        </div>

        {/* Tasks */}
        {allTasks.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Tasks</p>
            <div className="flex flex-wrap gap-1.5">
              {visibleTasks.map(task => {
                const info = TASK_LABELS[task]
                if (!info) return null
                return (
                  <span
                    key={task}
                    className={`text-xs rounded-full px-2.5 py-1 font-medium border ${
                      info.special
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}
                  >
                    {info.label}
                  </span>
                )
              })}
              {!tasksExpanded && hiddenCount > 0 && (
                <button
                  onClick={() => setTasksExpanded(true)}
                  className="text-xs text-gray-400 hover:text-gray-600 px-2.5 py-1 border border-dashed border-gray-300 rounded-full transition-colors"
                >
                  +{hiddenCount} more
                </button>
              )}
              {tasksExpanded && hiddenCount > 0 && (
                <button
                  onClick={() => setTasksExpanded(false)}
                  className="text-xs text-gray-400 hover:text-gray-600 px-2.5 py-1 transition-colors"
                >
                  Show less
                </button>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-2">
              🟢 Regular tasks · 🟡 Special requests
            </p>
          </div>
        )}

        {/* Rate */}
        {job.hourly_rate && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 mb-3">
            <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-0.5">Offered rate</p>
            <p className="text-2xl font-bold text-amber-700">
              £{job.hourly_rate.toFixed(2)}
              <span className="text-base font-normal text-amber-600">/hr</span>
            </p>
            {estPerSession && (
              <p className="text-xs text-amber-600 mt-0.5">Est. £{estPerSession} per session</p>
            )}
          </div>
        )}

        {/* Customer notes */}
        {job.customer_notes && (
          <div className="border border-gray-100 rounded-xl overflow-hidden">
            <button
              onClick={() => setNotesOpen(!notesOpen)}
              className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <span>See customer notes</span>
              <span className="text-gray-400">{notesOpen ? '▲' : '▼'}</span>
            </button>
            {notesOpen && (
              <div className="px-4 pb-3 pt-1 text-sm text-gray-600 border-t border-gray-100 bg-gray-50">
                {job.customer_notes}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
          <span className="text-xs text-gray-400">{timeAgo(job.created_at)}</span>
          {!isCompleted && (
            <Link
              href="/cleaner/apply"
              className="text-xs font-semibold text-white bg-gray-900 hover:bg-gray-700 rounded-full px-4 py-1.5 transition-colors"
            >
              Apply →
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Filters ─────────────────────────────────────────

type FilterStatus = 'all' | 'open' | 'recent'

interface FilterState {
  status: FilterStatus
  service: string
  zone: string
}

// ─── Main Page ────────────────────────────────────────

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<FilterState>({ status: 'all', service: 'all', zone: 'all' })

  useEffect(() => {
    async function fetchJobs() {
      setLoading(true)

      const { data, error } = await supabase
        .from('clean_requests')
        .select(`
          id, service_type, zone, bedrooms, bathrooms, has_pets,
          preferred_day, preferred_days, time_of_day,
          hourly_rate, hours_per_session, tasks, customer_notes,
          status, created_at, updated_at
        `)
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) console.log('Supabase error:', error)

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
  }, [])

  const openJobs = jobs.filter(j => j.status === 'pending')
  const recentJobs = jobs.filter(j => j.status !== 'pending')

  const filtered = jobs.filter(job => {
    if (filters.status === 'open' && job.status !== 'pending') return false
    if (filters.status === 'recent' && job.status === 'pending') return false
    if (filters.service !== 'all' && job.service_type !== filters.service) return false
    if (filters.zone !== 'all' && job.zone !== filters.zone) return false
    return true
  })

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Hero */}
      <section className="bg-white border-b border-gray-100 py-10">
        <div className="container max-w-5xl mx-auto px-4">
          <div className="flex items-center gap-2 mb-3">
            <span className={`w-2 h-2 rounded-full ${openJobs.length > 0 ? 'bg-green-500' : 'bg-gray-300'}`} />
            <span className="text-sm text-gray-500">
              {openJobs.length > 0 ? `${openJobs.length} request${openJobs.length !== 1 ? 's' : ''} live now` : '0 requests live now'}
            </span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Active cleaning requests</h1>
          <p className="text-gray-500 max-w-lg mb-6">
            Browse open jobs from homeowners in Horsham. See what customers are paying and apply to become a Vouchee cleaner to pick up work.
          </p>
          <div className="flex gap-3 flex-wrap">
            <Link href="/cleaner/apply" className="inline-flex items-center gap-2 bg-gray-900 text-white rounded-full px-5 py-2.5 text-sm font-semibold hover:bg-gray-700 transition-colors">
              Become a cleaner →
            </Link>
            <Link href="/request" className="inline-flex items-center gap-2 bg-white border border-gray-200 text-gray-700 rounded-full px-5 py-2.5 text-sm font-semibold hover:bg-gray-50 transition-colors">
              Post a request
            </Link>
          </div>
        </div>
      </section>

      {/* Stats + Filters */}
      <section className="container max-w-5xl mx-auto px-4 py-6">
        <div className="flex flex-wrap items-center gap-4 mb-5">
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-gray-600"><strong>{openJobs.length}</strong> open</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              <span className="text-gray-600"><strong>{recentJobs.length}</strong> filled</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-gray-300" />
              <span className="text-gray-600"><strong>{jobs.length}</strong> total (last 10 days)</span>
            </span>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="flex bg-white border border-gray-200 rounded-full p-1 gap-1">
            {(['all', 'open', 'recent'] as FilterStatus[]).map(s => (
              <button
                key={s}
                onClick={() => setFilters(f => ({ ...f, status: s }))}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors capitalize ${
                  filters.status === s ? 'bg-gray-900 text-white' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {s === 'recent' ? 'Recent' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>

          <select
            value={filters.service}
            onChange={e => setFilters(f => ({ ...f, service: e.target.value }))}
            className="text-sm border border-gray-200 rounded-full px-4 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900"
          >
            <option value="all">All services</option>
            <option value="regular">Regular Clean</option>
            <option value="deep_clean">Deep Clean</option>
            <option value="end_of_tenancy">End of Tenancy</option>
            <option value="oven_clean">Oven Clean</option>
          </select>

          <select
            value={filters.zone}
            onChange={e => setFilters(f => ({ ...f, zone: e.target.value }))}
            className="text-sm border border-gray-200 rounded-full px-4 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900"
          >
            <option value="all">All areas</option>
            {Object.entries(ZONE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        {/* Jobs grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-2xl border border-gray-200 bg-white p-5 animate-pulse">
                <div className="h-5 bg-gray-100 rounded w-1/2 mb-3" />
                <div className="flex gap-2 mb-4">
                  {[...Array(4)].map((_, j) => <div key={j} className="h-6 bg-gray-100 rounded-full w-16" />)}
                </div>
                <div className="h-16 bg-gray-100 rounded-xl mb-3" />
                <div className="h-12 bg-gray-100 rounded-xl" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-3">🔍</div>
            <p className="font-medium text-gray-600 mb-1">No requests match your filters</p>
            <button onClick={() => setFilters({ status: 'all', service: 'all', zone: 'all' })} className="text-sm text-blue-500 hover:underline">
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map(job => <JobCard key={job.id} job={job} />)}
          </div>
        )}
      </section>

      {/* CTA */}
      <section className="bg-white border-t border-gray-100 py-12 mt-8">
        <div className="container max-w-5xl mx-auto px-4 text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Want to pick up cleaning work in Horsham?</h2>
          <p className="text-gray-500 mb-5 max-w-md mx-auto text-sm">
            Join Vouchee as a vetted cleaner and apply for open requests like these directly.
          </p>
          <Link
            href="/cleaner/apply"
            className="inline-flex items-center gap-2 bg-gray-900 text-white rounded-full px-6 py-3 text-sm font-semibold hover:bg-gray-700 transition-colors"
          >
            Apply to become a cleaner →
          </Link>
        </div>
      </section>
    </main>
  )
}
