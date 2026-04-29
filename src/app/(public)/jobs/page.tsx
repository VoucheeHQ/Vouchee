'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

// ─── Types ────────────────────────────────────────────

type HorshamZone =
  | 'central_south_east' | 'north_west' | 'north_east_roffey'
  | 'south_west' | 'warnham_north' | 'broadbridge_heath'
  | 'mannings_heath' | 'faygate_kilnwood_vale' | 'christs_hospital'

type ServiceType = 'regular' | 'deep_clean' | 'end_of_tenancy' | 'oven_clean'
type JobStatus = 'pending' | 'pending_review' | 'assigned' | 'active' | 'completed' | 'cancelled'

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
  frequency: string | null
  tasks: string[] | null
  customer_notes: string | null
  status: JobStatus
  created_at: string
  updated_at: string
  customer_id: string
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

const TASK_LABELS: Record<string, { label: string; special: boolean }> = {
  general_cleaning:    { label: 'General cleaning', special: false },
  general:             { label: 'General cleaning', special: false },
  hoovering:           { label: 'Hoovering', special: false },
  mopping:             { label: 'Mopping', special: false },
  bathroom_deep_clean: { label: 'Bathroom deep clean', special: false },
  bathroom:            { label: 'Bathroom clean', special: false },
  kitchen_deep_clean:  { label: 'Kitchen deep clean', special: false },
  kitchen:             { label: 'Kitchen clean', special: false },
  ironing:             { label: 'Ironing', special: true },
  oven_clean:          { label: 'Oven clean', special: true },
  oven:                { label: 'Oven clean', special: true },
  windows:             { label: 'Windows', special: true },
  windows_interior:    { label: 'Interior windows', special: true },
  laundry:             { label: 'Laundry', special: true },
  hob_clean:           { label: 'Hob clean', special: true },
  extractor_clean:     { label: 'Extractor clean', special: true },
  fridge_clean:        { label: 'Fridge clean', special: true },
  fridge:              { label: 'Fridge clean', special: true },
  blinds:              { label: 'Blinds', special: true },
  mold:                { label: 'Mould removal', special: true },
  changing_beds:       { label: 'Changing beds', special: true },
}

const REGULAR_TASKS = ['general_cleaning', 'general', 'hoovering', 'mopping', 'bathroom_deep_clean', 'bathroom', 'kitchen_deep_clean', 'kitchen']

const FREQUENCY_LABELS: Record<string, string> = {
  weekly: 'Weekly',
  fortnightly: 'Fortnightly',
  monthly: 'Monthly',
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  const hours = Math.floor(diff / 3600000)
  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  return 'Just now'
}

// Apply the same filter as the initial fetch — used both for first load and for
// incoming realtime rows so we don't show old/cancelled stuff that's outside
// the 10-day window.
function passesJobFilter(row: any): boolean {
  if (row.hidden) return false
  if (row.status === 'pending') return true
  if (row.status === 'pending_review') return true
  if (row.status === 'active') return true
  const updatedAt = new Date(row.updated_at).getTime()
  return updatedAt > Date.now() - 10 * 24 * 60 * 60 * 1000
}

// ─── Your Listing Banner ──────────────────────────────

function YourListingBanner({ job, onEdit }: { job: Job; onEdit: () => void }) {
  const zone = job.zone ? ZONE_LABELS[job.zone as HorshamZone] : 'Horsham'
  const isUnderReview = job.status === 'pending_review'

  return (
    <div style={{
      background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
      border: '2px solid #86efac',
      borderRadius: '20px',
      padding: '20px 24px',
      marginBottom: '28px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 0 4px rgba(34,197,94,0.2)' }} />
          <div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#14532d', marginBottom: '2px' }}>Your listing · {zone}</div>
            <div style={{ fontSize: '13px', color: '#16a34a' }}>
              {isUnderReview ? '⏱ Under review — edit if you need to make changes' : '✅ Accepting applications — cleaners can see and apply'}
            </div>
          </div>
        </div>
        <button onClick={onEdit} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'white', border: '1.5px solid #86efac', borderRadius: '12px', padding: '8px 16px', fontSize: '13px', fontWeight: 600, color: '#15803d', cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          ✏️ Edit listing
        </button>
      </div>
    </div>
  )
}

// ─── Job Card ─────────────────────────────────────────

function JobCard({ job, isOwn = false, userRole, cleanerApproved, onEdit, onApply, alreadyApplied }: {
  job: Job; isOwn?: boolean; userRole: string | null; cleanerApproved: boolean
  onEdit?: () => void; onApply?: () => void; alreadyApplied?: boolean
}) {
  const [notesOpen, setNotesOpen] = useState(false)
  const [tasksExpanded, setTasksExpanded] = useState(false)
  const router = useRouter()

  const isCompleted = job.status === 'completed' || job.status === 'cancelled' || job.status === 'assigned' || job.status === 'active'
  const isGrace = job.status === 'pending_review'
  const zone = job.zone ? ZONE_LABELS[job.zone as HorshamZone] : 'Horsham'
  const days = (job.preferred_days?.length ? job.preferred_days : job.preferred_day ? [job.preferred_day] : [])
  const daysLabel = days.length > 0 ? days.map((d: string) => d.slice(0, 3)).join(' · ') : null
  const estPerSession = job.hourly_rate && job.hours_per_session ? (job.hourly_rate * job.hours_per_session).toFixed(2) : null

  const allTasks = job.tasks ?? []
  const primaryTasks = allTasks.filter(t => REGULAR_TASKS.includes(t))
  const extraTasks = allTasks.filter(t => !REGULAR_TASKS.includes(t))
  const visibleTasks = tasksExpanded ? allTasks : primaryTasks
  const hiddenCount = extraTasks.length

  function handleApplyClick() {
    if (!userRole) { router.push('/login?redirect=/jobs'); return }
    if (onApply) onApply()
  }

  const showApplyBtn = userRole === 'cleaner' && !isOwn && !isCompleted
  const isPendingApproval = userRole === 'cleaner' && !cleanerApproved
  const showSignUpPrompt = !userRole && !isCompleted

  return (
    <div className={`relative rounded-2xl border bg-white transition-all duration-200 ${
      isCompleted && !isOwn ? 'opacity-60 border-gray-200'
      : isOwn ? 'border-green-300 shadow-md ring-2 ring-green-100'
      : 'border-gray-200 shadow-sm hover:shadow-md hover:-translate-y-0.5'
    }`}>
      {isCompleted && !isOwn && (
        <div className="absolute top-4 right-4 z-10">
          <span className="text-xs font-semibold tracking-widest uppercase text-gray-400 border border-gray-300 rounded-full px-2.5 py-1">Filled</span>
        </div>
      )}
      {isOwn && (
        <div className="absolute top-4 right-4 z-10 flex flex-col items-end gap-2">
          {isGrace ? (
            <span style={{ background: '#fef9c3', border: '1px solid #fde047', color: '#854d0e', fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '100px', letterSpacing: '0.04em' }}>⏱ Under review</span>
          ) : (
            <span style={{ background: '#dcfce7', border: '1px solid #86efac', color: '#166534', fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '100px', letterSpacing: '0.04em' }}>● Accepting applications</span>
          )}
        </div>
      )}
      <div className="p-5">
        <div className="mb-3">
          <div className="flex items-start gap-2 mb-1">
            <span className="text-base">📍</span>
            <h3 className="font-bold text-gray-900 text-lg leading-tight pr-32">{zone}</h3>
          </div>
          <p className="text-sm text-gray-500 ml-6">{SERVICE_LABELS[job.service_type]}</p>
        </div>
        <div className="flex flex-wrap gap-1.5 mb-4">
          {job.bedrooms > 0 && <span className="text-xs bg-gray-100 text-gray-700 rounded-full px-2.5 py-1 font-medium">{job.bedrooms} bed</span>}
          {job.hours_per_session && <span className="text-xs bg-gray-100 text-gray-700 rounded-full px-2.5 py-1 font-medium">{job.hours_per_session} hrs</span>}
          {daysLabel && <span className="text-xs bg-gray-100 text-gray-700 rounded-full px-2.5 py-1 font-medium">{daysLabel}</span>}
          {job.time_of_day && <span className="text-xs bg-gray-100 text-gray-700 rounded-full px-2.5 py-1 font-medium">{job.time_of_day}</span>}
          {job.frequency && (
            <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2.5 py-1 font-medium">
              {FREQUENCY_LABELS[job.frequency] ?? job.frequency}
            </span>
          )}
          {job.has_pets && <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2.5 py-1 font-medium">🐾 Pets</span>}
        </div>
        {allTasks.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Tasks</p>
            <div className="flex flex-wrap gap-1.5">
              {visibleTasks.map(task => {
                const info = TASK_LABELS[task]
                if (!info) return null
                return (
                  <span key={task} className={`text-xs rounded-full px-2.5 py-1 font-medium border ${info.special ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                    {info.label}
                  </span>
                )
              })}
              {!tasksExpanded && hiddenCount > 0 && (
                <button onClick={() => setTasksExpanded(true)} className="text-xs text-gray-400 hover:text-gray-600 px-2.5 py-1 border border-dashed border-gray-300 rounded-full transition-colors">+{hiddenCount} more</button>
              )}
              {tasksExpanded && hiddenCount > 0 && (
                <button onClick={() => setTasksExpanded(false)} className="text-xs text-gray-400 hover:text-gray-600 px-2.5 py-1 transition-colors">Show less</button>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-2">🟢 Regular tasks · 🟡 Special requests</p>
          </div>
        )}
        {job.hourly_rate && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 mb-3">
            <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-0.5">Offered rate</p>
            <p className="text-2xl font-bold text-amber-700">£{job.hourly_rate.toFixed(2)}<span className="text-base font-normal text-amber-600">/hr</span></p>
            {estPerSession && <p className="text-xs text-amber-600 mt-0.5">Est. £{estPerSession} per clean</p>}
          </div>
        )}
        {job.customer_notes && (
          <div className="border border-gray-100 rounded-xl overflow-hidden">
            <button onClick={() => setNotesOpen(!notesOpen)} className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
              <span>See customer notes</span>
              <span className="text-gray-400">{notesOpen ? '▲' : '▼'}</span>
            </button>
            {notesOpen && <div className="px-4 pb-3 pt-1 text-sm text-gray-600 border-t border-gray-100 bg-gray-50">{job.customer_notes}</div>}
          </div>
        )}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
          <span className="text-xs text-gray-400">{timeAgo(job.created_at)}</span>
          {isOwn ? (
            <button onClick={onEdit} className="text-xs font-semibold text-white bg-green-600 hover:bg-green-700 rounded-full px-4 py-1.5 transition-colors">Edit →</button>
          ) : showApplyBtn ? (
            alreadyApplied ? (
              <span className="text-xs font-semibold text-green-600 bg-green-50 border border-green-200 rounded-full px-4 py-1.5">✓ Applied</span>
            ) : isPendingApproval ? (
              <span title="Your application is under review" className="text-xs font-semibold text-gray-400 bg-gray-100 border border-gray-200 rounded-full px-4 py-1.5 cursor-not-allowed">Under review</span>
            ) : (
              <button onClick={handleApplyClick} className="text-xs font-semibold text-white bg-gray-900 hover:bg-gray-700 rounded-full px-4 py-1.5 transition-colors">Apply →</button>
            )
          ) : showSignUpPrompt ? (
            <button onClick={handleApplyClick} className="text-xs font-semibold text-white bg-gray-900 hover:bg-gray-700 rounded-full px-4 py-1.5 transition-colors">Apply →</button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

// ─── Apply Modal ─────────────────────────────────────────

function ApplyModal({ job, cleanerProfile, onClose, onSubmit, submitting }: {
  job: Job
  cleanerProfile: { name: string; hasRatings: boolean; completedCleans: number } | null
  onClose: () => void
  onSubmit: (message: string) => Promise<void>
  submitting: boolean
}) {
  const [message, setMessage] = useState('')
  const [tasksOpen, setTasksOpen] = useState(false)
  const [showMessageTip, setShowMessageTip] = useState(true)
  const [showNewCleanerTip, setShowNewCleanerTip] = useState(true)

  const zone = job.zone ? ZONE_LABELS[job.zone as HorshamZone] : 'Horsham'
  const estPerSession = job.hourly_rate && job.hours_per_session ? (job.hourly_rate * job.hours_per_session).toFixed(2) : null
  const days = (job.preferred_days?.length ? job.preferred_days : job.preferred_day ? [job.preferred_day] : [])
  const daysLabel = days.length > 0 ? days.map((d: string) => d.slice(0, 3)).join(' · ') : null
  const showNoRatingsTip = showNewCleanerTip && cleanerProfile && cleanerProfile.completedCleans === 0
  const allTasks = job.tasks ?? []
  const regularTasks = allTasks.filter(t => REGULAR_TASKS.includes(t))
  const specialTasks = allTasks.filter(t => !REGULAR_TASKS.includes(t))

  const chip = () => ({ background: 'white', border: '1px solid #e2e8f0', borderRadius: '100px', padding: '3px 10px', fontSize: '12px', fontWeight: 600, color: '#475569' } as React.CSSProperties)

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: '20px' }}>
      <div style={{ background: 'white', borderRadius: '24px', width: '100%', maxWidth: '580px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
        <div style={{ position: 'sticky', top: 0, background: 'white', borderBottom: '1px solid #f1f5f9', padding: '18px 24px', zIndex: 10, borderRadius: '24px 24px 0 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>You are applying for</h2>
            <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', fontSize: '16px', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
          </div>
        </div>
        <div style={{ padding: '24px' }}>
          <div style={{ background: '#f8fafc', borderRadius: '14px', padding: '16px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
              <span>📍</span>
              <span style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>{zone}</span>
              <span style={{ fontSize: '13px', color: '#64748b', marginLeft: '4px' }}>{SERVICE_LABELS[job.service_type]}</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
              {job.bedrooms > 0 && <span style={chip()}>{job.bedrooms} bed</span>}
              {job.bathrooms > 0 && <span style={chip()}>{job.bathrooms} bath</span>}
              {job.hours_per_session && <span style={chip()}>{job.hours_per_session} hrs</span>}
              {daysLabel && <span style={chip()}>{daysLabel}</span>}
              {job.time_of_day && <span style={chip()}>{job.time_of_day}</span>}
              {job.frequency && <span style={{ ...chip(), background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>{FREQUENCY_LABELS[job.frequency] ?? job.frequency}</span>}
            </div>
            {allTasks.length > 0 && (
              <div style={{ marginBottom: '12px' }}>
                <button onClick={() => setTasksOpen(o => !o)} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '100px', padding: '4px 12px', fontSize: '12px', fontWeight: 600, color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  📋 {allTasks.length} task{allTasks.length !== 1 ? 's' : ''} required
                  <span style={{ fontSize: '10px' }}>{tasksOpen ? '▲' : '▼'}</span>
                </button>
                {tasksOpen && (
                  <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {regularTasks.map(t => <span key={t} style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '100px', padding: '3px 10px', fontSize: '12px', fontWeight: 600, color: '#15803d' }}>{TASK_LABELS[t]?.label ?? t}</span>)}
                    {specialTasks.map(t => <span key={t} style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '100px', padding: '3px 10px', fontSize: '12px', fontWeight: 600, color: '#92400e' }}>{TASK_LABELS[t]?.label ?? t}</span>)}
                    <div style={{ width: '100%', fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>🟢 Standard tasks · 🟡 Special requests</div>
                  </div>
                )}
              </div>
            )}
            {job.hourly_rate && (
              <div style={{ background: '#fefce8', border: '1px solid #fef08a', borderRadius: '10px', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Offered rate</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#78350f' }}>£{job.hourly_rate.toFixed(2)}<span style={{ fontSize: '12px', fontWeight: 500 }}>/hr</span></div>
                </div>
                {estPerSession && (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Est. per clean</div>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: '#92400e' }}>~£{estPerSession}</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {showMessageTip && (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '10px 14px', marginBottom: '12px', fontSize: '13px', color: '#15803d', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
              <span>💡 <strong>Tip:</strong> Cleaners who include a personal message are significantly more likely to be accepted.</span>
              <button onClick={() => setShowMessageTip(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#86efac', fontSize: '14px', flexShrink: 0, padding: '0' }}>✕</button>
            </div>
          )}

          {showNoRatingsTip && (
            <div style={{ background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: '10px', padding: '10px 14px', marginBottom: '12px', fontSize: '13px', color: '#7c3aed', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
              <span>⭐ <strong>New cleaner tip:</strong> Consider offering a discounted first clean to help win work and gain your first ratings.</span>
              <button onClick={() => setShowNewCleanerTip(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c4b5fd', fontSize: '14px', flexShrink: 0, padding: '0' }}>✕</button>
            </div>
          )}

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>Your message to the customer</label>
            <textarea value={message} onChange={e => setMessage(e.target.value.slice(0, 500))} placeholder="Hi, I'm [name] and I'd love to help with your home cleaning..." rows={4} style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #e2e8f0', borderRadius: '12px', fontSize: '14px', color: '#0f172a', resize: 'vertical', fontFamily: "'DM Sans', sans-serif", outline: 'none', boxSizing: 'border-box' }} />
            <div style={{ fontSize: '12px', color: message.length >= 450 ? '#f59e0b' : '#94a3b8', marginTop: '4px', textAlign: 'right' }}>{message.length}/500</div>
          </div>

          <button onClick={() => onSubmit(message)} disabled={submitting} style={{ width: '100%', padding: '14px', background: submitting ? '#94a3b8' : '#2563eb', color: 'white', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
            {submitting ? 'Submitting…' : 'Submit application →'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Filters ─────────────────────────────────────────

type FilterStatus = 'all' | 'open' | 'recent'
interface FilterState { status: FilterStatus; service: string; zone: string }

// ─── Main Page ────────────────────────────────────────

export default function JobsPage() {
  const router = useRouter()
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<FilterState>({ status: 'all', service: 'all', zone: 'all' })
  const [myJobId, setMyJobId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [cleanerApproved, setCleanerApproved] = useState(false)
  const [cleanerData, setCleanerData] = useState<any>(null)
  const [profileData, setProfileData] = useState<any>(null)
  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set())
  const [applyingToJob, setApplyingToJob] = useState<Job | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false
    const authClient = createClient()

    async function init() {
      setLoading(true)
      const { data: { user } } = await authClient.auth.getUser()

      if (user) {
        const { data: profile } = await authClient
          .from('profiles')
          .select('role, full_name')
          .eq('id', user.id)
          .single<{ role: string; full_name: string }>()

        const role = profile?.role ?? null
        if (cancelled) return
        setUserRole(role)
        setProfileData(profile)

        if (role === 'customer') {
          const { data: myJobs } = await authClient
            .from('clean_requests')
            .select('id')
            .eq('customer_id', user.id)
            .in('status', ['pending', 'pending_review', 'active'])
            .order('created_at', { ascending: false })
            .limit(1)
          if (myJobs?.length && !cancelled) setMyJobId((myJobs as any[])[0].id)
        }

        if (role === 'cleaner') {
          const { data: cleanerRecord } = await authClient
            .from('cleaners')
            .select('id, dbs_checked, has_insurance, right_to_work, created_at, application_status')
            .eq('profile_id', user.id)
            .single<{ id: string; dbs_checked: boolean; has_insurance: boolean; right_to_work: boolean; created_at: string; application_status: string }>()

          if (cleanerRecord && !cancelled) {
            setCleanerData(cleanerRecord)
            setCleanerApproved(cleanerRecord.application_status === 'approved')
            const { data: existingApps } = await authClient
              .from('applications')
              .select('request_id')
              .eq('cleaner_id', cleanerRecord.id)
            if (existingApps && !cancelled) setAppliedJobIds(new Set((existingApps as any[]).map(a => a.request_id)))
          }
        }
      }

      const { data, error } = await authClient
        .from('clean_requests')
        .select(`id, service_type, zone, bedrooms, bathrooms, has_pets, preferred_day, preferred_days, time_of_day, hourly_rate, hours_per_session, frequency, tasks, customer_notes, status, created_at, updated_at, customer_id`)
        .eq('hidden', false)
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) console.error('Supabase error:', error)

      if (!error && data && !cancelled) {
        setJobs((data as any[]).filter(passesJobFilter) as Job[])
      }
      if (!cancelled) setLoading(false)
    }
    init()

    // ─── Realtime subscription ──────────────────────────────────────────────
    // Listens for INSERT/UPDATE/DELETE on clean_requests so the live list
    // updates without a refresh. Filters with passesJobFilter on each event
    // to match the same rules as the initial fetch.
    const channel = authClient
      .channel('jobs-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'clean_requests' }, payload => {
        const row = payload.new as any
        if (cancelled || !passesJobFilter(row)) return
        setJobs(prev => prev.find(j => j.id === row.id) ? prev : [row as Job, ...prev])
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'clean_requests' }, payload => {
        const row = payload.new as any
        if (cancelled) return
        setJobs(prev => {
          const exists = prev.find(j => j.id === row.id)
          if (!passesJobFilter(row)) {
            // Row no longer qualifies — remove from list
            return exists ? prev.filter(j => j.id !== row.id) : prev
          }
          if (exists) {
            return prev.map(j => j.id === row.id ? { ...j, ...row } : j)
          }
          return [row as Job, ...prev]
        })
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'clean_requests' }, payload => {
        const row = payload.old as any
        if (cancelled) return
        setJobs(prev => prev.filter(j => j.id !== row.id))
      })
      .subscribe()

    return () => {
      cancelled = true
      authClient.removeChannel(channel)
    }
  }, [])

  const handleApply = async (message: string) => {
    if (!applyingToJob || !cleanerData) return
    setSubmitting(true)
    try {
      const authClient = createClient()

      const { data: newApp, error: appError } = await authClient
        .from('applications')
        .insert({
          request_id: applyingToJob.id,
          cleaner_id: cleanerData.id,
          message: message.trim() || null,
          status: 'pending',
        } as any)
        .select('id')
        .single()

      if (appError) throw appError

      setAppliedJobIds(prev => new Set([...prev, applyingToJob.id]))

      const { data: customerRecord } = await authClient
        .from('customers')
        .select('profile_id')
        .eq('id', applyingToJob.customer_id)
        .single() as { data: { profile_id: string } | null }

      const customerProfileId = customerRecord?.profile_id ?? applyingToJob.customer_id

      const fullName = profileData?.full_name ?? ''
      const nameParts = fullName.trim().split(' ')
      const cleanerName = nameParts.length >= 2
        ? `${nameParts[0]} ${nameParts[nameParts.length - 1][0]}.`
        : fullName || 'A cleaner'
      const memberSince = cleanerData.created_at
        ? new Date(cleanerData.created_at).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
        : 'Recently'

      await fetch('/api/send-application-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: customerProfileId,
          applicationId: (newApp as any).id,
          requestId: applyingToJob.id,
          cleanerName,
          cleanerInitial: cleanerName[0].toUpperCase(),
          cleanerMemberSince: memberSince,
          cleanerDbs: cleanerData.dbs_checked,
          cleanerInsured: cleanerData.has_insurance,
          cleanerRightToWork: cleanerData.right_to_work,
          message: message.trim(),
          jobZone: applyingToJob.zone ? ZONE_LABELS[applyingToJob.zone as HorshamZone] : 'Horsham',
          jobBedrooms: applyingToJob.bedrooms,
          jobBathrooms: applyingToJob.bathrooms,
          jobHours: applyingToJob.hours_per_session,
          jobRate: applyingToJob.hourly_rate,
        }),
      })

      setApplyingToJob(null)
    } catch (err) {
      console.error('Apply error:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const openJobs = jobs.filter(j => j.status === 'pending' || j.status === 'active')
  const recentJobs = jobs.filter(j => j.status !== 'pending' && j.status !== 'pending_review' && j.status !== 'active')
  const myJob = myJobId ? jobs.find(j => j.id === myJobId) : null

  const filtered = jobs.filter(job => {
    if (job.status === 'pending_review' && job.id !== myJobId) return false
    if (filters.status === 'open' && job.status !== 'pending' && job.status !== 'active' && job.id !== myJobId) return false
    if (filters.status === 'recent' && (job.status === 'pending' || job.status === 'pending_review' || job.status === 'active')) return false
    if (filters.service !== 'all' && job.service_type !== filters.service) return false
    if (filters.zone !== 'all' && job.zone !== filters.zone) return false
    return true
  })

  const sortedFiltered = [...filtered].sort((a, b) => {
    if (a.id === myJobId) return -1
    if (b.id === myJobId) return 1
    return 0
  })

  // Role-aware top CTAs:
  //  - Logged out: "Become a cleaner" + "Post a request"
  //  - Cleaner:    nothing (they already are one — and irrelevant on this page)
  //  - Customer:   "Post a request" only (no need to apply to be a cleaner)
  //  - Admin:      both (admin sees everything)
  const showBecomeCleanerCta = !userRole || userRole === 'admin'
  const showPostRequestCta = !userRole || userRole === 'customer' || userRole === 'admin'
  const showAnyTopCta = showBecomeCleanerCta || showPostRequestCta

  // Bottom "Apply to become a cleaner" section — same logic as top CTA
  const showBottomCleanerCta = !userRole || userRole === 'admin'

  return (
    <main className="min-h-screen bg-gray-50">
      <section className="bg-white border-b border-gray-100 py-10">
        <div className="container max-w-5xl mx-auto px-4">
          <div className="flex items-center gap-2 mb-3">
            <span className={`w-2 h-2 rounded-full ${openJobs.length > 0 ? 'bg-green-500' : 'bg-gray-300'}`} />
            <span className="text-sm text-gray-500">{openJobs.length > 0 ? `${openJobs.length} request${openJobs.length !== 1 ? 's' : ''} live now` : '0 requests live now'}</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Active cleaning requests</h1>
          <p className="text-gray-500 max-w-lg mb-6">Browse open jobs from homeowners in Horsham. See what customers are paying and apply to become a Vouchee cleaner.</p>
          {showAnyTopCta && (
            <div className="flex gap-3 flex-wrap">
              {showBecomeCleanerCta && (
                <Link href="/cleaner/apply" className="inline-flex items-center gap-2 bg-gray-900 text-white rounded-full px-5 py-2.5 text-sm font-semibold hover:bg-gray-700 transition-colors">Become a cleaner →</Link>
              )}
              {showPostRequestCta && (
                <Link href="/request/property" className="inline-flex items-center gap-2 bg-white border border-gray-200 text-gray-700 rounded-full px-5 py-2.5 text-sm font-semibold hover:bg-gray-50 transition-colors">Post a request</Link>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="container max-w-5xl mx-auto px-4 py-6">
        {myJob && <YourListingBanner job={myJob} onEdit={() => router.push('/customer/dashboard')} />}

        <div className="flex flex-wrap items-center gap-4 mb-5">
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500" /><span className="text-gray-600"><strong>{openJobs.length}</strong> open</span></span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-400" /><span className="text-gray-600"><strong>{recentJobs.length}</strong> filled</span></span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-gray-300" /><span className="text-gray-600"><strong>{jobs.length}</strong> total (last 10 days)</span></span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="flex bg-white border border-gray-200 rounded-full p-1 gap-1">
            {(['all', 'open', 'recent'] as FilterStatus[]).map(s => (
              <button key={s} onClick={() => setFilters(f => ({ ...f, status: s }))} className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors capitalize ${filters.status === s ? 'bg-gray-900 text-white' : 'text-gray-600 hover:text-gray-900'}`}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
          <select value={filters.service} onChange={e => setFilters(f => ({ ...f, service: e.target.value }))} className="text-sm border border-gray-200 rounded-full px-4 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900">
            <option value="all">All services</option>
            <option value="regular">Regular Clean</option>
            <option value="deep_clean">Deep Clean</option>
            <option value="end_of_tenancy">End of Tenancy</option>
            <option value="oven_clean">Oven Clean</option>
          </select>
          <select value={filters.zone} onChange={e => setFilters(f => ({ ...f, zone: e.target.value }))} className="text-sm border border-gray-200 rounded-full px-4 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900">
            <option value="all">All areas</option>
            {Object.entries(ZONE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-2xl border border-gray-200 bg-white p-5 animate-pulse">
                <div className="h-5 bg-gray-100 rounded w-1/2 mb-3" />
                <div className="flex gap-2 mb-4">{[...Array(4)].map((_, j) => <div key={j} className="h-6 bg-gray-100 rounded-full w-16" />)}</div>
                <div className="h-16 bg-gray-100 rounded-xl mb-3" />
                <div className="h-12 bg-gray-100 rounded-xl" />
              </div>
            ))}
          </div>
        ) : sortedFiltered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-3">🔍</div>
            <p className="font-medium text-gray-600 mb-1">No requests match your filters</p>
            <button onClick={() => setFilters({ status: 'all', service: 'all', zone: 'all' })} className="text-sm text-blue-500 hover:underline">Clear filters</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sortedFiltered.map(job => (
              <JobCard key={job.id} job={job} isOwn={job.id === myJobId} userRole={userRole} cleanerApproved={cleanerApproved} onEdit={() => router.push('/customer/dashboard')} onApply={() => setApplyingToJob(job)} alreadyApplied={appliedJobIds.has(job.id)} />
            ))}
          </div>
        )}
      </section>

      {applyingToJob && (
        <ApplyModal
          job={applyingToJob}
          cleanerProfile={cleanerData ? { name: profileData?.full_name ?? 'You', hasRatings: false, completedCleans: 0 } : null}
          onClose={() => setApplyingToJob(null)}
          onSubmit={handleApply}
          submitting={submitting}
        />
      )}

      {showBottomCleanerCta && (
        <section className="bg-white border-t border-gray-100 py-12 mt-8">
          <div className="container max-w-5xl mx-auto px-4 text-center">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Want to pick up cleaning work in Horsham?</h2>
            <p className="text-gray-500 mb-5 max-w-md mx-auto text-sm">Join Vouchee as a vetted cleaner and apply for open requests directly.</p>
            <Link href="/cleaner/apply" className="inline-flex items-center gap-2 bg-gray-900 text-white rounded-full px-6 py-3 text-sm font-semibold hover:bg-gray-700 transition-colors">Apply to become a cleaner →</Link>
          </div>
        </section>
      )}
    </main>
  )
}
