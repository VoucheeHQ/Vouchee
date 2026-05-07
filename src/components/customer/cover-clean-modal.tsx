'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'

// ─────────────────────────────────────────────────────────────────────────────
// Cover-clean modal — opens when a customer hits the panic button on their
// dashboard for an ongoing clean. Posts a one-off cover request to clean_requests
// with service_type='cover' and parent_request_id pointing back to the original.
//
// Data flow:
//   1. Direct Supabase insert into clean_requests (mirrors src/app/request/preview/page.tsx).
//   2. Fire /api/notifications/cleaner-job-alert with the new request id —
//      that route's cover branch (file 5) will gate on cover_cleans_notify
//      instead of job_notify.
//
// The cleaner-accept side (file 6) handles the GoCardless skip for cover.
// This modal does not touch GC at all.
//
// ModalShell is intentionally duplicated from src/components/cleaner/profile-modals.tsx —
// extract to a shared component in a follow-up if/when a third use appears outside.
// ─────────────────────────────────────────────────────────────────────────────

interface ParentRequest {
  id: string
  hours_per_session: number
  hourly_rate: number
  tasks: string[]
  bedrooms: number
  bathrooms: number
  zone: string | null
}

interface Props {
  parentRequest: ParentRequest
  originalCleanerId: string
  customerId: string
  onClose: () => void
  onSuccess?: (newRequestId: string) => void
}

// ─── Constants ───────────────────────────────────────────────────────────────
// Mirrored from src/app/customer/dashboard/page.tsx — duplicated rather than
// imported to keep the modal self-contained.

const TASK_LABELS: Record<string, string> = {
  general_cleaning: 'General cleaning',
  hoovering: 'Hoovering',
  mopping: 'Mopping',
  bathroom: 'Bathroom clean',
  kitchen: 'Kitchen clean',
  windows_interior: 'Interior windows',
  fridge: 'Fridge clean',
  blinds: 'Blinds',
  mold: 'Mould removal',
  ironing: 'Ironing',
  laundry: 'Laundry',
  changing_beds: 'Changing beds',
  garage: 'Garage / utility',
}

const ALL_TASKS = [
  'general_cleaning', 'hoovering', 'mopping', 'bathroom', 'kitchen',
  'windows_interior', 'fridge', 'blinds', 'mold', 'ironing',
  'laundry', 'changing_beds', 'garage',
]

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateTimeSlots(minMinutes: number, maxMinutes: number): string[] {
  const slots: string[] = []
  for (let m = minMinutes; m <= maxMinutes; m += 30) {
    const h = Math.floor(m / 60)
    const mm = m % 60
    slots.push(`${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`)
  }
  return slots
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function minutesToTime(m: number): string {
  const h = Math.floor(m / 60)
  const mm = m % 60
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

function tomorrowDate(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
}

// ─── Shared modal shell ──────────────────────────────────────────────────────

function ModalShell({ title, onClose, children }: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(3px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '20px',
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'white', borderRadius: '24px', width: '100%', maxWidth: '520px',
          maxHeight: '88vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        }}
      >
        <div style={{
          position: 'sticky', top: 0, background: 'white', borderBottom: '1px solid #f1f5f9',
          padding: '18px 24px', zIndex: 10, borderRadius: '24px 24px 0 0',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '17px', fontWeight: 700, color: '#0f172a' }}>{title}</div>
            <button
              onClick={onClose}
              aria-label="Close"
              style={{
                background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px',
                fontSize: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#64748b',
              }}
            >✕</button>
          </div>
        </div>
        <div style={{ padding: '24px' }}>
          {children}
        </div>
      </div>
    </div>
  )
}

// ─── Shared field styles ─────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  fontSize: '12px', fontWeight: 700, color: '#0f172a', marginBottom: '8px',
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: '#f8faff', border: '1.5px solid #e2e8f0', borderRadius: '12px',
  padding: '11px 14px', fontSize: '14px', color: '#0f172a',
  fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box', outline: 'none',
}

// ═════════════════════════════════════════════════════════════════════════════
// CoverCleanModal — main component
// ═════════════════════════════════════════════════════════════════════════════

export function CoverCleanModal({
  parentRequest,
  originalCleanerId,
  customerId,
  onClose,
  onSuccess,
}: Props) {
  const tomorrow = tomorrowDate()
  const hoursMinutes = parentRequest.hours_per_session * 60

  // Time-window bounds: 07:00 to 20:00 (in minutes from midnight).
  // Start must allow at least hours_per_session before the 20:00 close.
  const DAY_START = 7 * 60
  const DAY_END = 20 * 60
  const startMaxMinutes = Math.max(DAY_START, DAY_END - hoursMinutes)

  const startSlots = useMemo(
    () => generateTimeSlots(DAY_START, startMaxMinutes),
    [startMaxMinutes],
  )

  // ── State ──────────────────────────────────────────────────────────────────

  const [coverDate, setCoverDate] = useState(tomorrow)
  const [start, setStart] = useState(minutesToTime(DAY_START))
  const [end, setEnd] = useState(minutesToTime(DAY_START + hoursMinutes))
  const [tasks, setTasks] = useState<string[]>(parentRequest.tasks || [])
  const [hourlyRate, setHourlyRate] = useState<number>(parentRequest.hourly_rate)
  const [notes, setNotes] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ── Derived: end-time slot range, depends on current start ────────────────

  const endMinMinutes = timeToMinutes(start) + hoursMinutes
  const endSlots = useMemo(
    () => generateTimeSlots(endMinMinutes, DAY_END),
    [endMinMinutes],
  )

  // Keep end clamped if start moves later than current end - duration.
  useEffect(() => {
    if (timeToMinutes(end) < endMinMinutes) {
      setEnd(minutesToTime(endMinMinutes))
    }
  }, [start])  // eslint-disable-line react-hooks/exhaustive-deps

  // ── Validation ─────────────────────────────────────────────────────────────

  const canSubmit =
    !!coverDate &&
    tasks.length > 0 &&
    hourlyRate >= 14 &&
    hourlyRate <= 50 &&
    !submitting

  // ── Handlers ───────────────────────────────────────────────────────────────

  const toggleTask = (t: string) => {
    setTasks(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])
  }

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)

    try {
      const supabase = createClient()

      // Compute weekday for preferred_days compatibility (some cleaner-side
      // queries still use preferred_days for filtering — set it sensibly).
      const weekday = DAY_NAMES[new Date(coverDate + 'T00:00:00').getDay()]

      const { data, error: insertError } = await (supabase.from('clean_requests') as any)
        .insert({
          customer_id: customerId,
          service_type: 'cover',
          parent_request_id: parentRequest.id,
          original_cleaner_id: originalCleanerId,
          cover_date: coverDate,
          time_window_start: start,
          time_window_end: end,
          bedrooms: parentRequest.bedrooms,
          bathrooms: parentRequest.bathrooms,
          hours_per_session: parentRequest.hours_per_session,
          hourly_rate: hourlyRate,
          tasks,
          zone: parentRequest.zone,
          frequency: null, // cover is a one-off — no recurrence; cover_date holds the specific day
          start_date: coverDate,
          preferred_days: [weekday],
          time_of_day: null,
          status: 'active',
          customer_notes: notes.trim() || null,
          goes_live_at: new Date().toISOString(),
          republish_count: 0,
        })
        .select('id')
        .single()

      if (insertError || !data) {
        console.error('Cover request insert failed:', insertError)
        setError('Could not post your cover request — please try again.')
        setSubmitting(false)
        return
      }

      // Fire cleaner job-alert email — file 5 will branch on service_type='cover'
      // and gate on cover_cleans_notify rather than job_notify. Failure here
      // doesn't block: the request is already posted.
      try {
        await fetch('/api/notifications/cleaner-job-alert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ request_id: data.id }),
        })
      } catch (mailErr) {
        console.error('Cover job-alert fire failed (request still posted):', mailErr)
      }

      onSuccess?.(data.id)
      onClose()
    } catch (err: any) {
      console.error('Cover submit threw:', err)
      setError('Something went wrong — please try again.')
      setSubmitting(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <ModalShell title="🔄 Request cover for this clean" onClose={onClose}>

      {/* ── Reassurance banner ──────────────────────────────────────────── */}
      <div style={{
        background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '12px',
        padding: '12px 14px', marginBottom: '20px',
      }}>
        <div style={{ fontSize: '13px', color: '#9a3412', lineHeight: 1.5 }}>
          You'll pay this cleaner directly for their time — no Direct Debit changes needed.
        </div>
      </div>

      {/* ── Date ─────────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: '20px' }}>
        <div style={labelStyle}>When do you need cover?</div>
        <input
          type="date"
          value={coverDate}
          min={tomorrow}
          onChange={e => setCoverDate(e.target.value)}
          style={inputStyle}
        />
      </div>

      {/* ── Time window ─────────────────────────────────────────────────── */}
      <div style={{ marginBottom: '20px' }}>
        <div style={labelStyle}>What time window works?</div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>Earliest start</div>
            <select
              value={start}
              onChange={e => setStart(e.target.value)}
              style={inputStyle}
            >
              {startSlots.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>Latest finish</div>
            <select
              value={end}
              onChange={e => setEnd(e.target.value)}
              style={inputStyle}
            >
              {endSlots.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '6px', lineHeight: 1.5 }}>
          Your cleaner needs at least {parentRequest.hours_per_session} hours within this window.
        </div>
      </div>

      {/* ── Tasks ───────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: '20px' }}>
        <div style={labelStyle}>What needs doing?</div>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px',
        }}>
          {ALL_TASKS.map(t => {
            const on = tasks.includes(t)
            return (
              <button
                key={t}
                type="button"
                onClick={() => toggleTask(t)}
                style={{
                  padding: '9px 12px', borderRadius: '10px', fontSize: '12px', fontWeight: 600,
                  cursor: 'pointer', textAlign: 'center',
                  background: on ? '#16a34a' : '#f1f5f9',
                  color: on ? 'white' : '#64748b',
                  border: 'none',
                  fontFamily: "'DM Sans', sans-serif",
                  transition: 'all 0.15s ease',
                }}
              >
                {TASK_LABELS[t] || t}
              </button>
            )
          })}
        </div>
        {tasks.length === 0 && (
          <div style={{ fontSize: '12px', color: '#dc2626', marginTop: '8px' }}>
            Pick at least one task.
          </div>
        )}
      </div>

      {/* ── Hourly rate ─────────────────────────────────────────────────── */}
      <div style={{ marginBottom: '20px' }}>
        <div style={labelStyle}>Hourly rate</div>
        <div style={{ position: 'relative' }}>
          <span style={{
            position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)',
            color: '#64748b', fontSize: '14px', fontWeight: 600, pointerEvents: 'none',
          }}>£</span>
          <input
            type="number"
            min={14}
            max={50}
            step={0.5}
            value={hourlyRate}
            onChange={e => setHourlyRate(Number(e.target.value))}
            style={{ ...inputStyle, paddingLeft: '28px' }}
          />
        </div>
        <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '6px', lineHeight: 1.5 }}>
          Cover cleans often pay a bit more — many customers boost the rate by £2–3/hr to attract applicants quickly.
        </div>
      </div>

      {/* ── Notes ───────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: '20px' }}>
        <div style={labelStyle}>Anything specific to mention? <span style={{ fontWeight: 500, color: '#94a3b8' }}>(optional)</span></div>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="e.g. key collection, pet on premises, focus on the kitchen…"
          rows={3}
          maxLength={500}
          style={{ ...inputStyle, resize: 'vertical', minHeight: '70px', fontFamily: "'DM Sans', sans-serif" }}
        />
      </div>

      {/* ── Error ───────────────────────────────────────────────────────── */}
      {error && (
        <div style={{
          background: '#fff5f5', border: '1px solid #fca5a5', borderRadius: '10px',
          padding: '10px 12px', marginBottom: '16px',
          fontSize: '13px', color: '#b91c1c',
        }}>
          {error}
        </div>
      )}

      {/* ── Buttons ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          style={{
            flex: 1, padding: '12px', background: 'white', color: '#475569',
            border: '1.5px solid #e2e8f0', borderRadius: '12px', fontSize: '14px', fontWeight: 600,
            cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          style={{
            flex: 1, padding: '12px',
            background: canSubmit ? '#16a34a' : '#cbd5e1',
            color: 'white',
            border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: 700,
            cursor: canSubmit ? 'pointer' : 'not-allowed', fontFamily: "'DM Sans', sans-serif",
            boxShadow: canSubmit ? '0 2px 8px rgba(22,163,74,0.25)' : 'none',
          }}
        >
          {submitting ? 'Posting…' : 'Post cover request'}
        </button>
      </div>

    </ModalShell>
  )
}
