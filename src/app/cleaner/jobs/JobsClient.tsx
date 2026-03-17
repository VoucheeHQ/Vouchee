'use client'

import { useState } from 'react'
import LogoMark from '@/assets/vouchee-logo.svg'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Job {
  id: string
  zone: string
  zoneKey: string
  bedrooms: number
  bathrooms: number
  hoursPerSession: number | null
  hourlyRate: number | null
  preferredDays: string[]
  timeOfDay: string
  tasks: string[]
  serviceType: string
  postedAt: string
  customerId: string
  alreadyApplied: boolean
}

interface JobsClientProps {
  jobs: Job[]
  cleanerId: string
  cleanerName: string
  cleanerDbs: boolean
  cleanerInsured: boolean
  cleanerRightToWork: boolean
  cleanerZones: string[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DAY_LABELS: Record<string, string> = {
  monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed',
  thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun',
}

const TASK_COLOURS: Record<string, { bg: string; color: string; border: string }> = {
  'General clean':      { bg: '#f0fdf4', color: '#15803d', border: '#86efac' },
  'Hoovering':          { bg: '#f0fdf4', color: '#15803d', border: '#86efac' },
  'Ironing':            { bg: '#f0fdf4', color: '#15803d', border: '#86efac' },
  'Laundry':            { bg: '#f0fdf4', color: '#15803d', border: '#86efac' },
  'Changing bed linen': { bg: '#f0fdf4', color: '#15803d', border: '#86efac' },
  'Kitchen deep clean': { bg: '#fefce8', color: '#92400e', border: '#fde68a' },
  'Oven clean':         { bg: '#fefce8', color: '#92400e', border: '#fde68a' },
  'Windows':            { bg: '#fefce8', color: '#92400e', border: '#fde68a' },
  'Blinds':             { bg: '#fefce8', color: '#92400e', border: '#fde68a' },
  'Mold removal':       { bg: '#fefce8', color: '#92400e', border: '#fde68a' },
}

function getTaskStyle(task: string) {
  return TASK_COLOURS[task] ?? { bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' }
}

function formatPostedAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

function formatDays(days: string[]): string {
  if (!days.length) return 'Flexible'
  return days.map(d => DAY_LABELS[d] ?? d).join(', ')
}

// ─── Job Card ─────────────────────────────────────────────────────────────────

function JobCard({ job, onApply }: { job: Job; onApply: (job: Job) => void }) {
  const estPerSession = job.hourlyRate && job.hoursPerSession
    ? `£${(job.hourlyRate * job.hoursPerSession).toFixed(2)}`
    : 'TBC'

  return (
    <div
      style={{
        background: 'white', borderRadius: '20px',
        border: '1.5px solid #e2e8f0',
        boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
        transition: 'box-shadow 0.2s ease, transform 0.2s ease',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 32px rgba(59,130,246,0.12)'
        ;(e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 12px rgba(0,0,0,0.05)'
        ;(e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'
      }}
    >
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
        padding: '16px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '18px' }}>📍</span>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>{job.zone}</div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '1px' }}>{formatPostedAgo(job.postedAt)}</div>
          </div>
        </div>
        <span style={{
          background: 'rgba(34,197,94,0.12)', color: '#15803d',
          border: '1px solid rgba(34,197,94,0.25)',
          borderRadius: '100px', padding: '3px 10px',
          fontSize: '11px', fontWeight: 700,
        }}>● Live</span>
      </div>

      {/* Body */}
      <div style={{ padding: '16px 20px', flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '14px' }}>
          <span style={{ fontSize: '24px', fontWeight: 800, color: '#16a34a', letterSpacing: '-0.5px' }}>
            {job.hourlyRate ? `£${job.hourlyRate.toFixed(2)}` : 'TBC'}
          </span>
          <span style={{ fontSize: '13px', color: '#64748b' }}>
            / hr{job.hoursPerSession ? ` · ${job.hoursPerSession} hrs/session` : ''}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
          {[
            { label: 'Bedrooms', value: `${job.bedrooms} bed` },
            { label: 'Bathrooms', value: `${job.bathrooms} bath` },
            { label: 'Preferred days', value: formatDays(job.preferredDays) },
            { label: 'Est. per session', value: estPerSession },
          ].map(({ label, value }) => (
            <div key={label} style={{ background: '#f8faff', borderRadius: '10px', padding: '8px 10px' }}>
              <div style={{ fontSize: '10px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>
                {label}
              </div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>{value}</div>
            </div>
          ))}
        </div>

        {job.tasks.length > 0 && (
          <>
            <div style={{ fontSize: '10px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '7px' }}>
              Tasks
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
              {job.tasks.map(task => {
                const s = getTaskStyle(task)
                return (
                  <span key={task} style={{
                    background: s.bg, color: s.color, border: `1px solid ${s.border}`,
                    fontSize: '11px', fontWeight: 500, padding: '3px 9px', borderRadius: '100px',
                  }}>
                    {task}
                  </span>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: '14px 20px', borderTop: '1px solid #f1f5f9',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px',
      }}>
        <div style={{ fontSize: '12px', color: '#94a3b8' }}>
          {job.serviceType === 'regular' ? '🔁 Regular clean' : '🧹 One-off clean'}
        </div>
        {job.alreadyApplied ? (
          <span style={{
            background: '#f0fdf4', color: '#15803d', border: '1px solid #86efac',
            borderRadius: '100px', padding: '8px 16px', fontSize: '13px', fontWeight: 600,
          }}>
            ✓ Applied
          </span>
        ) : (
          <button
            onClick={() => onApply(job)}
            style={{
              background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
              color: 'white', border: 'none', borderRadius: '100px',
              padding: '10px 20px', fontSize: '13px', fontWeight: 700,
              cursor: 'pointer', boxShadow: '0 3px 12px rgba(59,130,246,0.28)',
              whiteSpace: 'nowrap',
            }}
          >
            Apply →
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Apply Modal ──────────────────────────────────────────────────────────────

function ApplyModal({
  job, cleanerName, cleanerDbs, cleanerInsured, cleanerRightToWork, cleanerId,
  onClose, onSuccess,
}: {
  job: Job
  cleanerName: string
  cleanerDbs: boolean
  cleanerInsured: boolean
  cleanerRightToWork: boolean
  cleanerId: string
  onClose: () => void
  onSuccess: (jobId: string) => void
}) {
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: job.id,
          cleanerId,
          customerId: job.customerId,
          message: message.trim(),
          cleanerName,
          cleanerDbs,
          cleanerInsured,
          cleanerRightToWork,
          jobZone: job.zone,
          jobBedrooms: job.bedrooms,
          jobBathrooms: job.bathrooms,
          jobHours: job.hoursPerSession,
          jobRate: job.hourlyRate,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Something went wrong')
      }
      setSubmitted(true)
      onSuccess(job.id)
    } catch (err: any) {
      setError(err.message ?? 'Failed to submit application')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)',
        backdropFilter: 'blur(6px)', zIndex: 200,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
      }}
    >
      <div style={{
        background: 'white', borderRadius: '24px', maxWidth: '480px', width: '100%',
        maxHeight: '90vh', overflowY: 'auto', padding: '32px',
        boxShadow: '0 24px 80px rgba(0,0,0,0.2)',
      }}>
        {!submitted ? (
          <>
            <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: '#3b82f6', marginBottom: '6px' }}>
              Applying for
            </div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>{job.zone}</div>
            <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px' }}>
              {job.hourlyRate ? `£${job.hourlyRate.toFixed(2)}/hr` : 'Rate TBC'}
              {job.hoursPerSession ? ` · ${job.hoursPerSession} hrs/session` : ''}
            </div>

            <div style={{ background: '#f8faff', borderRadius: '14px', padding: '18px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '14px' }}>
                Information shared with homeowner
              </div>
              {[
                { icon: '👤', label: 'Name', value: cleanerName },
                { icon: '🪪', label: 'DBS checked', value: cleanerDbs ? '✓ Verified' : 'Not provided' },
                { icon: '🛡️', label: 'Insurance', value: cleanerInsured ? '✓ Verified' : 'Not provided' },
                { icon: '📋', label: 'Right to work', value: cleanerRightToWork ? '✓ Verified' : 'Not provided' },
              ].map(({ icon, label, value }) => (
                <div key={label} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '9px 0', borderBottom: '1px solid #f1f5f9',
                }}>
                  <span style={{ fontSize: '13px', color: '#64748b' }}>{icon} {label}</span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>{value}</span>
                </div>
              ))}
            </div>

            <div style={{ fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              Add a message
              <span style={{ fontSize: '11px', fontWeight: 500, color: '#94a3b8', background: '#f1f5f9', padding: '2px 8px', borderRadius: '100px' }}>Optional</span>
            </div>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="e.g. I have my own car and I'm available to start next week..."
              style={{
                width: '100%', border: '1.5px solid #e2e8f0', borderRadius: '12px',
                padding: '12px 14px', fontSize: '14px', color: '#1e293b',
                resize: 'none', height: '90px', background: '#f8faff',
                marginBottom: '16px', outline: 'none', fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            />

            <div style={{
              background: 'rgba(250,204,21,0.1)', border: '1px solid rgba(250,204,21,0.3)',
              borderRadius: '10px', padding: '10px 14px',
              fontSize: '12px', color: '#92400e', lineHeight: 1.5, marginBottom: '20px',
            }}>
              ⚠️ Arranging work directly with a homeowner outside of Vouchee is a breach of our Terms & Conditions and may result in removal from the platform.
            </div>

            {error && (
              <div style={{
                background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px',
                padding: '10px 14px', fontSize: '13px', color: '#dc2626', marginBottom: '16px',
              }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={onClose}
                disabled={submitting}
                style={{
                  flex: 1, background: '#f1f5f9', color: '#64748b', border: 'none',
                  borderRadius: '100px', padding: '13px', fontSize: '14px', fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                style={{
                  flex: 2,
                  background: submitting ? '#93c5fd' : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                  color: 'white', border: 'none', borderRadius: '100px', padding: '13px',
                  fontSize: '14px', fontWeight: 700,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                  boxShadow: submitting ? 'none' : '0 4px 16px rgba(59,130,246,0.3)',
                }}
              >
                {submitting ? 'Sending…' : 'Send application →'}
              </button>
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{
              width: '64px', height: '64px', background: 'linear-gradient(135deg, #dcfce7, #bbf7d0)',
              borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '28px', margin: '0 auto 16px',
            }}>✓</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>Application sent!</div>
            <div style={{ fontSize: '14px', color: '#64748b', lineHeight: 1.6, marginBottom: '24px' }}>
              The homeowner has been notified. You'll hear back if they'd like to connect.
            </div>
            <button
              onClick={onClose}
              style={{
                width: '100%', background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                color: 'white', border: 'none', borderRadius: '100px', padding: '13px',
                fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Back to jobs
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export function JobsClient({
  jobs: initialJobs, cleanerId, cleanerName,
  cleanerDbs, cleanerInsured, cleanerRightToWork,
}: JobsClientProps) {
  const [jobs, setJobs] = useState(initialJobs)
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [filterZone, setFilterZone] = useState('')

  const filteredJobs = filterZone ? jobs.filter(j => j.zoneKey === filterZone) : jobs
  const activeCount = filteredJobs.filter(j => !j.alreadyApplied).length
  const uniqueZones = Array.from(new Set(jobs.map(j => j.zoneKey)))

  function handleApplySuccess(jobId: string) {
    setJobs(prev => prev.map(j => j.id === jobId ? { ...j, alreadyApplied: true } : j))
    setSelectedJob(null)
  }

  return (
    <>
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #eff6ff 0%, #f8faff 50%, #fffbeb 100%)',
        fontFamily: 'DM Sans, sans-serif',
      }}>
        {/* Header */}
        <div style={{
          background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(59,130,246,0.1)',
          padding: '0 24px', height: '60px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'sticky', top: 0, zIndex: 100,
        }}>
          <a href="/cleaner/dashboard" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
            <LogoMark style={{ height: '28px', width: 'auto' }} />
          </a>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '13px', color: '#64748b' }}>
              <span style={{ color: '#3b82f6', fontWeight: 700 }}>{activeCount}</span> jobs available
            </span>
            <a href="/cleaner/dashboard" style={{
              background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0',
              borderRadius: '8px', padding: '6px 14px',
              fontSize: '13px', fontWeight: 600, textDecoration: 'none',
            }}>
              Dashboard
            </a>
          </div>
        </div>

        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 20px 80px' }}>
          <div style={{ marginBottom: '24px' }}>
            <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', margin: '0 0 4px', letterSpacing: '-0.5px' }}>
              Available jobs
            </h1>
            <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
              Showing jobs in your service areas — most recent first
            </p>
          </div>

          {/* Zone filter */}
          {uniqueZones.length > 1 && (
            <div style={{ marginBottom: '24px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {[{ key: '', label: 'All zones' }, ...uniqueZones.map(k => ({
                key: k,
                label: jobs.find(j => j.zoneKey === k)?.zone ?? k,
              }))].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setFilterZone(key)}
                  style={{
                    background: filterZone === key ? '#2563eb' : 'white',
                    color: filterZone === key ? 'white' : '#475569',
                    border: `1.5px solid ${filterZone === key ? '#2563eb' : '#e2e8f0'}`,
                    borderRadius: '100px', padding: '6px 14px',
                    fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {filteredJobs.length === 0 ? (
            <div style={{
              background: 'white', borderRadius: '20px', border: '1.5px solid #e2e8f0',
              padding: '60px 40px', textAlign: 'center',
            }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔍</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
                No jobs available right now
              </div>
              <div style={{ fontSize: '14px', color: '#64748b', lineHeight: 1.6 }}>
                We'll notify you when a new request comes in for your areas. Check back soon.
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '18px' }}>
              {filteredJobs.map(job => (
                <JobCard key={job.id} job={job} onApply={setSelectedJob} />
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedJob && (
        <ApplyModal
          job={selectedJob}
          cleanerName={cleanerName}
          cleanerDbs={cleanerDbs}
          cleanerInsured={cleanerInsured}
          cleanerRightToWork={cleanerRightToWork}
          cleanerId={cleanerId}
          onClose={() => setSelectedJob(null)}
          onSuccess={handleApplySuccess}
        />
      )}
    </>
  )
}
