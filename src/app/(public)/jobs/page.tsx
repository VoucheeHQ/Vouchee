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
  tasks: string[] | null
  customer_notes: string | null
  status: JobStatus
  created_at: string
  updated_at: string
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

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  const hours = Math.floor(diff / 3600000)
  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  return 'Just now'
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
          <div style={{
            width: '10px', height: '10px', borderRadius: '50%',
            background: '#22c55e',
            boxShadow: '0 0 0 4px rgba(34,197,94,0.2)',
          }} />
          <div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#14532d', marginBottom: '2px' }}>
              Your listing · {zone}
            </div>
            <div style={{ fontSize: '13px', color: '#16a34a' }}>
              {isUnderReview
                ? '⏱ Under review — edit if you need to make changes'
                : '✅ Accepting applications — cleaners can see and apply'}
            </div>
          </div>
        </div>
        <button
          onClick={onEdit}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'white', border: '1.5px solid #86efac',
            borderRadius: '12px', padding: '8px 16px',
            fontSize: '13px', fontWeight: 600, color: '#15803d',
            cursor: 'pointer',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          }}
        >
          ✏️ Edit listing
        </button>
      </div>
    </div>
  )
}

// ─── Job Card ─────────────────────────────────────────

function JobCard({ job, isOwn = false, userRole, onEdit, onApply, alreadyApplied }: {
  job: Job
  isOwn?: boolean
  userRole: string | null
  onEdit?: () => void
  onApply?: () => void
  alreadyApplied?: boolean
}) {
  const [notesOpen, setNotesOpen] = useState(false)
  const [tasksExpanded, setTasksExpanded] = useState(false)

  const isCompleted = job.status === 'completed' || job.status === 'cancelled' || job.status === 'assigned' || job.status === 'active'
  const isGrace = job.status === 'pending_review'
  const zone = job.zone ? ZONE_LABELS[job.zone as HorshamZone] : 'Horsham'
  const days = (job.preferred_days?.length ? job.preferred_days : job.preferred_day ? [job.preferred_day] : [])
  const daysLabel = days.length > 0 ? days.map((d: string) => d.slice(0, 3)).join(' · ') : null
  const estPerSession = job.hourly_rate && job.hours_per_session
    ? (job.hourly_rate * job.hours_per_session).toFixed(2)
    : null

  const allTasks = job.tasks ?? []
  const primaryTasks = allTasks.filter(t => REGULAR_TASKS.includes(t))
  const extraTasks = allTasks.filter(t => !REGULAR_TASKS.includes(t))
  const visibleTasks = tasksExpanded ? allTasks : primaryTasks
  const hiddenCount = extraTasks.length

  // Apply button is only shown to cleaners
  const showApplyBtn = userRole === 'cleaner' && !isOwn && !isCompleted
  return (
    <div className={`relative rounded-2xl border bg-white transition-all duration-200 ${
      isCompleted && !isOwn
        ? 'opacity-60 border-gray-200'
        : isOwn
        ? 'border-green-300 shadow-md ring-2 ring-green-100'
        : 'border-gray-200 shadow-sm hover:shadow-md hover:-translate-y-0.5'
    }`}>

      {/* Filled stamp */}
      {isCompleted && !isOwn && (
        <div className="absolute top-4 right-4 z-10">
          <span className="text-xs font-semibold tracking-widest uppercase text-gray-400 border border-gray-300 rounded-full px-2.5 py-1">
            Filled
          </span>
        </div>
      )}

      {/* Own listing badges */}
      {isOwn && (
        <div className="absolute top-4 right-4 z-10 flex flex-col items-end gap-2">
          {isGrace ? (
            <span style={{ background: '#fef9c3', border: '1px solid #fde047', color: '#854d0e', fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '100px', letterSpacing: '0.04em' }}>
              ⏱ Under review
            </span>
          ) : (
            <span style={{ background: '#dcfce7', border: '1px solid #86efac', color: '#166534', fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '100px', letterSpacing: '0.04em' }}>
              ● Accepting applications
            </span>
          )}
        </div>
      )}

      <div className="p-5">
        {/* Header */}
        <div className="mb-3">
          <div className="flex items-start gap-2 mb-1">
            <span className="text-base">📍</span>
            <h3 className="font-bold text-gray-900 text-lg leading-tight pr-32">{zone}</h3>
          </div>
          <p className="text-sm text-gray-500 ml-6">{SERVICE_LABELS[job.service_type]}</p>
        </div>

        {/* Tag row */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {job.bedrooms > 0 && (
            <span className="text-xs bg-gray-100 text-gray-700 rounded-full px-2.5 py-1 font-medium">{job.bedrooms} bed</span>
          )}
          {job.hours_per_session && (
            <span className="text-xs bg-gray-100 text-gray-700 rounded-full px-2.5 py-1 font-medium">{job.hours_per_session} hrs</span>
          )}
          {daysLabel && (
            <span className="text-xs bg-gray-100 text-gray-700 rounded-full px-2.5 py-1 font-medium">{daysLabel}</span>
          )}
          {job.time_of_day && (
            <span className="text-xs bg-gray-100 text-gray-700 rounded-full px-2.5 py-1 font-medium">{job.time_of_day}</span>
          )}
          {job.has_pets && (
            <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2.5 py-1 font-medium">🐾 Pets</span>
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
                  <span key={task} className={`text-xs rounded-full px-2.5 py-1 font-medium border ${
                    info.special
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}>
                    {info.label}
                  </span>
                )
              })}
              {!tasksExpanded && hiddenCount > 0 && (
                <button onClick={() => setTasksExpanded(true)} className="text-xs text-gray-400 hover:text-gray-600 px-2.5 py-1 border border-dashed border-gray-300 rounded-full transition-colors">
                  +{hiddenCount} more
                </button>
              )}
              {tasksExpanded && hiddenCount > 0 && (
                <button onClick={() => setTasksExpanded(false)} className="text-xs text-gray-400 hover:text-gray-600 px-2.5 py-1 transition-colors">
                  Show less
                </button>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-2">🟢 Regular tasks · 🟡 Special requests</p>
          </div>
        )}

        {/* Rate */}
        {job.hourly_rate && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 mb-3">
            <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-0.5">Offered rate</p>
            <p className="text-2xl font-bold text-amber-700">
              £{job.hourly_rate.toFixed(2)}<span className="text-base font-normal text-amber-600">/hr</span>
            </p>
            {estPerSession && (
              <p className="text-xs text-amber-600 mt-0.5">Est. £{estPerSession} per session</p>
            )}
          </div>
        )}

        {/* Customer notes */}
        {job.customer_notes && (
          <div className="border border-gray-100 rounded-xl overflow-hidden">
            <button onClick={() => setNotesOpen(!notesOpen)} className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
              <span>See customer notes</span>
              <span className="text-gray-400">{notesOpen ? '▲' : '▼'}</span>
            </button>
            {notesOpen && (
              <div className="px-4 pb-3 pt-1 text-sm text-gray-600 border-t border-gray-100 bg-gray-50">{job.customer_notes}</div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
          <span className="text-xs text-gray-400">{timeAgo(job.created_at)}</span>
          {isOwn ? (
            <button
              onClick={onEdit}
              className="text-xs font-semibold text-white bg-green-600 hover:bg-green-700 rounded-full px-4 py-1.5 transition-colors"
            >
              Edit →
            </button>
          ) : showApplyBtn ? (
            alreadyApplied ? (
              <span className="text-xs font-semibold text-green-600 bg-green-50 border border-green-200 rounded-full px-4 py-1.5">
                ✓ Applied
              </span>
            ) : (
              <button onClick={onApply} className="text-xs font-semibold text-white bg-gray-900 hover:bg-gray-700 rounded-full px-4 py-1.5 transition-colors">
                Apply →
              </button>
            )
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
  const estPerSession = job.hourly_rate && job.hours_per_session
    ? (job.hourly_rate * job.hours_per_session).toFixed(2) : null
  const days = (job.preferred_days?.length ? job.preferred_days : job.preferred_day ? [job.preferred_day] : [])
  const daysLabel = days.length > 0 ? days.map((d: string) => d.slice(0, 3)).join(' · ') : null
  const showNoRatingsTip = showNewCleanerTip && cleanerProfile && cleanerProfile.completedCleans === 0
  const allTasks = job.tasks ?? []
  const regularTasks = allTasks.filter(t => REGULAR_TASKS.includes(t))
  const specialTasks = allTasks.filter(t => !REGULAR_TASKS.includes(t))

  const chip = (text: string) => ({
    background: 'white', border: '1px solid #e2e8f0',
    borderRadius: '100px', padding: '3px 10px',
    fontSize: '12px', fontWeight: 600, color: '#475569',
  } as React.CSSProperties)

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 300, padding: '20px',
    }}>
      <div style={{
        background: 'white', borderRadius: '24px',
        width: '100%', maxWidth: '580px',
        maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
      }}>
        {/* Header */}
        <div style={{ position: 'sticky', top: 0, background: 'white', borderBottom: '1px solid #f1f5f9', padding: '18px 24px', zIndex: 10, borderRadius: '24px 24px 0 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>Apply for this job</h2>
            <button onClick={onClose} style={{
              background: '#f1f5f9', border: 'none', borderRadius: '50%',
              width: '32px', height: '32px', fontSize: '16px', cursor: 'pointer', color: '#64748b',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>✕</button>
          </div>
        </div>

        <div style={{ padding: '24px' }}>

          {/* Job summary */}
          <div style={{ background: '#f8fafc', borderRadius: '14px', padding: '16px', marginBottom: '20px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
              You are applying for
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
              <span>📍</span>
              <span style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>{zone}</span>
              <span style={{ fontSize: '13px', color: '#64748b', marginLeft: '4px' }}>{SERVICE_LABELS[job.service_type]}</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
              {job.bedrooms > 0 && <span style={chip('')}>{job.bedrooms} bed</span>}
              {job.bathrooms > 0 && <span style={chip('')}>{job.bathrooms} bath</span>}
              {job.hours_per_session && <span style={chip('')}>{job.hours_per_session} hrs</span>}
              {(job as any).frequency && <span style={chip('')}>{FREQUENCY_LABELS[(job as any).frequency] ?? (job as any).frequency}</span>}
              {daysLabel && <span style={chip('')}>{daysLabel}</span>}
              {job.time_of_day && <span style={chip('')}>{job.time_of_day}</span>}
            </div>

            {/* Tasks dropdown */}
            {allTasks.length > 0 && (
              <div style={{ marginBottom: '12px' }}>
                <button
                  onClick={() => setTasksOpen(o => !o)}
                  style={{
                    background: 'white', border: '1px solid #e2e8f0', borderRadius: '100px',
                    padding: '4px 12px', fontSize: '12px', fontWeight: 600, color: '#475569',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                  }}
                >
                  📋 {allTasks.length} task{allTasks.length !== 1 ? 's' : ''} required
                  <span style={{ fontSize: '10px' }}>{tasksOpen ? '▲' : '▼'}</span>
                </button>
                {tasksOpen && (
                  <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {regularTasks.map(t => (
                      <span key={t} style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '100px', padding: '3px 10px', fontSize: '12px', fontWeight: 600, color: '#15803d' }}>
                        {TASK_LABELS[t]?.label ?? t}
                      </span>
                    ))}
                    {specialTasks.map(t => (
                      <span key={t} style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '100px', padding: '3px 10px', fontSize: '12px', fontWeight: 600, color: '#92400e' }}>
                        {TASK_LABELS[t]?.label ?? t}
                      </span>
                    ))}
                    <div style={{ width: '100%', fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                      🟢 Standard tasks · 🟡 Special requests
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Rate */}
            {job.hourly_rate && (
              <div style={{ background: '#fefce8', border: '1px solid #fef08a', borderRadius: '10px', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Offered rate</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#78350f' }}>£{job.hourly_rate.toFixed(2)}<span style={{ fontSize: '12px', fontWeight: 500 }}>/hr</span></div>
                </div>
                {estPerSession && (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Est. per session</div>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: '#92400e' }}>~£{estPerSession}</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Message tip */}
          {showMessageTip && (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '10px 14px', marginBottom: '12px', fontSize: '13px', color: '#15803d', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
              <span>💡 <strong>Tip:</strong> Cleaners who include a personal message are significantly more likely to be accepted. Introduce yourself and why you'd be a great fit!</span>
              <button onClick={() => setShowMessageTip(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#86efac', fontSize: '14px', flexShrink: 0, padding: '0' }}>✕</button>
            </div>
          )}

          {/* New cleaner tip */}
          {showNoRatingsTip && (
            <div style={{ background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: '10px', padding: '10px 14px', marginBottom: '12px', fontSize: '13px', color: '#7c3aed', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
              <span>⭐ <strong>New cleaner tip:</strong> Consider offering a discounted first clean to help win work and gain your first ratings on Vouchee.</span>
              <button onClick={() => setShowNewCleanerTip(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c4b5fd', fontSize: '14px', flexShrink: 0, padding: '0' }}>✕</button>
            </div>
          )}

          {/* Message input */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
              Your message to the customer
            </label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value.slice(0, 500))}
              placeholder="Hi, I'm [name] and I'd love to help with your home cleaning. I have X years of experience and..."
              rows={4}
              style={{
                width: '100%', padding: '12px 14px',
                border: '1.5px solid #e2e8f0', borderRadius: '12px',
                fontSize: '14px', color: '#0f172a', resize: 'vertical',
                fontFamily: "'DM Sans', sans-serif", outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <div style={{ fontSize: '12px', color: message.length >= 450 ? '#f59e0b' : '#94a3b8', marginTop: '4px', textAlign: 'right' }}>
              {message.length}/500
            </div>
          </div>

          {/* Submit */}
          <button
            onClick={() => onSubmit(message)}
            disabled={submitting}
            style={{
              width: '100%', padding: '14px',
              background: submitting ? '#94a3b8' : '#0f172a',
              color: 'white', border: 'none', borderRadius: '12px',
              fontSize: '15px', fontWeight: 700,
              cursor: submitting ? 'not-allowed' : 'pointer',
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
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
  const [cleanerData, setCleanerData] = useState<any>(null)
  const [profileData, setProfileData] = useState<any>(null)
  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set())
  const [applyingToJob, setApplyingToJob] = useState<Job | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    async function init() {
      setLoading(true)

      const authClient = createClient()
      const { data: { session } } = await authClient.auth.getSession()

      if (session?.user) {
        // Get role from profiles
        const { data: profileData } = await (authClient as any)
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single()

        const role = profileData?.role ?? null
        setUserRole(role)
        setProfileData(profileData)

        // Find the user's own active listing — uses auth user id directly (no customers table)
        if (role === 'customer') {
          const { data: myJobs } = await (authClient as any)
            .from('clean_requests')
            .select('id')
            .eq('customer_id', session.user.id)
            .in('status', ['pending', 'pending_review', 'active'])
            .order('created_at', { ascending: false })
            .limit(1)

          if (myJobs?.length) setMyJobId(myJobs[0].id)
        }

        // If cleaner, get their cleaner record + existing applications
        if (role === 'cleaner') {
          const { data: cleanerRecord } = await (authClient as any)
            .from('cleaners')
            .select('id, dbs_checked, has_insurance, right_to_work, created_at')
            .eq('profile_id', session.user.id)
            .single()

          if (cleanerRecord) {
            setCleanerData(cleanerRecord)
            // Get jobs they've already applied to
            const { data: existingApps } = await (authClient as any)
              .from('applications')
              .select('request_id')
              .eq('cleaner_id', cleanerRecord.id)
            if (existingApps) {
              setAppliedJobIds(new Set(existingApps.map((a: any) => a.request_id)))
            }
          }
        }
      }

      // Fetch all jobs — USING (true) RLS policy allows all authenticated reads
      const { data, error } = await (authClient as any)
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
          if (row.status === 'pending_review') return true
          if (row.status === 'active') return true
          const updatedAt = new Date(row.updated_at).getTime()
          return updatedAt > Date.now() - 10 * 24 * 60 * 60 * 1000
        })
        setJobs(filtered as Job[])
      }
      setLoading(false)
    }
    init()
  }, [])

  const handleApply = async (message: string) => {
    if (!applyingToJob || !cleanerData) {
      console.error('Apply blocked — applyingToJob:', applyingToJob, 'cleanerData:', cleanerData)
      return
    }
    setSubmitting(true)
    try {
      const authClient = createClient()

      // Save application to DB
      const { error: appError } = await (authClient as any)
        .from('applications')
        .insert({
          request_id: applyingToJob.id,
          cleaner_id: cleanerData.id,
          message: message.trim() || null,
          status: 'pending',
        })

      if (appError) {
        console.error('Application insert error:', appError)
        throw appError
      }

      // Mark as applied locally
      setAppliedJobIds(prev => new Set([...prev, applyingToJob.id]))

      // Get customer email for notification
      const { data: requestData, error: requestError } = await (authClient as any)
        .from('clean_requests')
        .select('customer_id')
        .eq('id', applyingToJob.id)
        .single()

      if (requestError) console.error('Request lookup error:', requestError)

      if (requestData?.customer_id) {
        const cleanerName = profileData?.full_name ?? 'A cleaner'
        const memberSince = cleanerData.created_at
          ? new Date(cleanerData.created_at).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
          : 'Recently'

        const emailRes = await fetch('/api/send-application-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerId: requestData.customer_id,
            cleanerName,
            cleanerInitial: cleanerName[0].toUpperCase(),
            cleanerMemberSince: memberSince,
            cleanerDbs: cleanerData.dbs_checked,
            cleanerInsured: cleanerData.has_insurance,
            cleanerRightToWork: cleanerData.right_to_work,
            cleanerRating: '5.0',
            cleanerCompletedCleans: 0,
            message: message.trim(),
            jobZone: applyingToJob.zone ? ZONE_LABELS[applyingToJob.zone as HorshamZone] : 'Horsham',
            jobBedrooms: applyingToJob.bedrooms,
            jobBathrooms: applyingToJob.bathrooms,
            jobHours: applyingToJob.hours_per_session,
            jobRate: applyingToJob.hourly_rate,
            requestId: applyingToJob.id,
          }),
        })
        const emailData = await emailRes.json()
        console.log('Email API response:', emailData)
      }

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
            Browse open jobs from homeowners in Horsham. See what customers are paying and apply to become a Vouchee cleaner.
          </p>
          <div className="flex gap-3 flex-wrap">
            <Link href="/cleaner/apply" className="inline-flex items-center gap-2 bg-gray-900 text-white rounded-full px-5 py-2.5 text-sm font-semibold hover:bg-gray-700 transition-colors">
              Become a cleaner →
            </Link>
            <Link href="/request/property" className="inline-flex items-center gap-2 bg-white border border-gray-200 text-gray-700 rounded-full px-5 py-2.5 text-sm font-semibold hover:bg-gray-50 transition-colors">
              Post a request
            </Link>
          </div>
        </div>
      </section>

      <section className="container max-w-5xl mx-auto px-4 py-6">

        {/* Your listing banner */}
        {myJob && (
          <YourListingBanner job={myJob} onEdit={() => router.push('/customer/dashboard')} />
        )}

        {/* Stats */}
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
              <button key={s} onClick={() => setFilters(f => ({ ...f, status: s }))}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors capitalize ${
                  filters.status === s ? 'bg-gray-900 text-white' : 'text-gray-600 hover:text-gray-900'
                }`}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
          <select value={filters.service} onChange={e => setFilters(f => ({ ...f, service: e.target.value }))}
            className="text-sm border border-gray-200 rounded-full px-4 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900">
            <option value="all">All services</option>
            <option value="regular">Regular Clean</option>
            <option value="deep_clean">Deep Clean</option>
            <option value="end_of_tenancy">End of Tenancy</option>
            <option value="oven_clean">Oven Clean</option>
          </select>
          <select value={filters.zone} onChange={e => setFilters(f => ({ ...f, zone: e.target.value }))}
            className="text-sm border border-gray-200 rounded-full px-4 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900">
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
            <button onClick={() => setFilters({ status: 'all', service: 'all', zone: 'all' })} className="text-sm text-blue-500 hover:underline">
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sortedFiltered.map(job => (
              <JobCard
                key={job.id}
                job={job}
                isOwn={job.id === myJobId}
                userRole={userRole}
                onEdit={() => router.push('/customer/dashboard')}
                onApply={() => setApplyingToJob(job)}
                alreadyApplied={appliedJobIds.has(job.id)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Apply Modal */}
      {applyingToJob && (
        <ApplyModal
          job={applyingToJob}
          cleanerProfile={cleanerData ? {
            name: profileData?.full_name ?? 'You',
            hasRatings: false,
            completedCleans: 0,
          } : null}
          onClose={() => setApplyingToJob(null)}
          onSubmit={handleApply}
          submitting={submitting}
        />
      )}

      {/* CTA */}
      <section className="bg-white border-t border-gray-100 py-12 mt-8">
        <div className="container max-w-5xl mx-auto px-4 text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Want to pick up cleaning work in Horsham?</h2>
          <p className="text-gray-500 mb-5 max-w-md mx-auto text-sm">Join Vouchee as a vetted cleaner and apply for open requests directly.</p>
          <Link href="/cleaner/apply" className="inline-flex items-center gap-2 bg-gray-900 text-white rounded-full px-6 py-3 text-sm font-semibold hover:bg-gray-700 transition-colors">
            Apply to become a cleaner →
          </Link>
        </div>
      </section>
    </main>
  )
}
