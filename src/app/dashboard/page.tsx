'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Settings, X, MessageSquare, Users, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

const ALL_TASKS: { id: string; label: string; special: boolean }[] = [
  { id: 'general_cleaning', label: 'General cleaning', special: false },
  { id: 'hoovering', label: 'Hoovering', special: false },
  { id: 'mopping', label: 'Mopping', special: false },
  { id: 'bathroom_deep_clean', label: 'Bathroom deep clean', special: false },
  { id: 'kitchen_deep_clean', label: 'Kitchen deep clean', special: false },
  { id: 'ironing', label: 'Ironing', special: true },
  { id: 'oven', label: 'Oven clean', special: true },
  { id: 'windows_interior', label: 'Interior windows', special: true },
  { id: 'laundry', label: 'Laundry', special: true },
  { id: 'changing_beds', label: 'Changing beds', special: true },
  { id: 'blinds', label: 'Blinds', special: true },
  { id: 'fridge', label: 'Fridge clean', special: true },
  { id: 'mold', label: 'Mould removal', special: true },
]

const TASK_LABELS: Record<string, string> = Object.fromEntries(ALL_TASKS.map(t => [t.id, t.label]))

const ZONE_LABELS: Record<string, string> = {
  central_south_east: 'Central Horsham', north_west: 'North West Horsham',
  north_east_roffey: 'North East / Roffey', south_west: 'South West Horsham',
  warnham_north: 'Warnham & North', broadbridge_heath: 'Broadbridge Heath',
  mannings_heath: 'Mannings Heath', faygate_kilnwood_vale: 'Faygate / Kilnwood Vale',
  christs_hospital: "Christ's Hospital",
}

const FREQUENCY_LABELS: Record<string, string> = {
  weekly: 'Weekly', fortnightly: 'Fortnightly', monthly: 'Monthly',
}

const TIME_OPTIONS = ['Morning (8am – 12pm)', 'Afternoon (12pm – 5pm)', 'Evening (5pm – 8pm)', 'Flexible']
const DAY_OPTIONS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

interface CleanRequest {
  id: string
  status: string
  zone: string | null
  bedrooms: number
  bathrooms: number
  hourly_rate: number | null
  hours_per_session: number | null
  tasks: string[] | null
  preferred_days: string[] | null
  time_of_day: string | null
  customer_notes: string | null
  created_at: string
  customers?: { frequency: string | null }
}

interface EditState {
  hourly_rate: string
  hours_per_session: string
  tasks: string[]
  preferred_days: string[]
  time_of_day: string
  customer_notes: string
}

// ── Edit Panel ────────────────────────────────────────────────

function EditPanel({ request, frequency, onSave, onCancel }: {
  request: CleanRequest
  frequency: string | null
  onSave: (updates: Partial<CleanRequest>) => Promise<void>
  onCancel: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<EditState>({
    hourly_rate: request.hourly_rate?.toString() ?? '',
    hours_per_session: request.hours_per_session?.toString() ?? '',
    tasks: request.tasks ?? [],
    preferred_days: request.preferred_days ?? [],
    time_of_day: request.time_of_day ?? '',
    customer_notes: request.customer_notes ?? '',
  })

  const toggleTask = (id: string) => {
    setForm(f => ({
      ...f,
      tasks: f.tasks.includes(id) ? f.tasks.filter(t => t !== id) : [...f.tasks, id],
    }))
  }

  const toggleDay = (day: string) => {
    setForm(f => ({
      ...f,
      preferred_days: f.preferred_days.includes(day) ? f.preferred_days.filter(d => d !== day) : [...f.preferred_days, day],
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    await onSave({
      hourly_rate: form.hourly_rate ? parseFloat(form.hourly_rate) : null,
      hours_per_session: form.hours_per_session ? parseFloat(form.hours_per_session) : null,
      tasks: form.tasks,
      preferred_days: form.preferred_days,
      time_of_day: form.time_of_day || null,
      customer_notes: form.customer_notes || null,
    })
    setSaving(false)
  }

  const inputStyle = {
    width: '100%', background: '#f8faff', border: '1.5px solid #e2e8f0',
    borderRadius: '10px', padding: '10px 12px', fontSize: '14px', color: '#1e293b',
    fontFamily: 'inherit',
  }

  const labelStyle = { fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: '0.06em', display: 'block', marginBottom: '8px' }

  return (
    <div style={{ borderTop: '2px solid #e2e8f0', padding: '24px', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Rate + Hours */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div>
          <label style={labelStyle}>Hourly rate (£)</label>
          <input
            type="number" step="0.50" min="10" max="50"
            value={form.hourly_rate}
            onChange={e => setForm(f => ({ ...f, hourly_rate: e.target.value }))}
            style={inputStyle}
            placeholder="e.g. 15.00"
          />
        </div>
        <div>
          <label style={labelStyle}>Hours per session</label>
          <input
            type="number" step="0.5" min="1" max="8"
            value={form.hours_per_session}
            onChange={e => setForm(f => ({ ...f, hours_per_session: e.target.value }))}
            style={inputStyle}
            placeholder="e.g. 3"
          />
        </div>
      </div>

      {/* Tasks */}
      <div>
        <label style={labelStyle}>Tasks</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {ALL_TASKS.map(task => {
            const selected = form.tasks.includes(task.id)
            return (
              <button
                key={task.id}
                onClick={() => toggleTask(task.id)}
                style={{
                  padding: '6px 14px', borderRadius: '100px', fontSize: '13px', fontWeight: 600,
                  cursor: 'pointer', border: '1.5px solid',
                  background: selected ? (task.special ? '#fefce8' : '#f0fdf4') : 'white',
                  borderColor: selected ? (task.special ? '#fde047' : '#86efac') : '#e2e8f0',
                  color: selected ? (task.special ? '#854d0e' : '#166534') : '#64748b',
                  transition: 'all 0.15s',
                }}
              >
                {task.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Preferred days */}
      <div>
        <label style={labelStyle}>Preferred days</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {DAY_OPTIONS.map(day => {
            const selected = form.preferred_days.includes(day)
            return (
              <button
                key={day}
                onClick={() => toggleDay(day)}
                style={{
                  padding: '6px 14px', borderRadius: '100px', fontSize: '13px', fontWeight: 600,
                  cursor: 'pointer', border: '1.5px solid',
                  background: selected ? '#eff6ff' : 'white',
                  borderColor: selected ? '#93c5fd' : '#e2e8f0',
                  color: selected ? '#1d4ed8' : '#64748b',
                  transition: 'all 0.15s',
                }}
              >
                {day.slice(0, 3)}
              </button>
            )
          })}
        </div>
      </div>

      {/* Time of day */}
      <div>
        <label style={labelStyle}>Time of day</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {TIME_OPTIONS.map(t => {
            const selected = form.time_of_day === t
            return (
              <button
                key={t}
                onClick={() => setForm(f => ({ ...f, time_of_day: selected ? '' : t }))}
                style={{
                  padding: '6px 14px', borderRadius: '100px', fontSize: '13px', fontWeight: 600,
                  cursor: 'pointer', border: '1.5px solid',
                  background: selected ? '#eff6ff' : 'white',
                  borderColor: selected ? '#93c5fd' : '#e2e8f0',
                  color: selected ? '#1d4ed8' : '#64748b',
                  transition: 'all 0.15s',
                }}
              >
                {t}
              </button>
            )
          })}
        </div>
      </div>

      {/* Notes */}
      <div>
        <label style={labelStyle}>Notes for cleaner</label>
        <textarea
          value={form.customer_notes}
          onChange={e => setForm(f => ({ ...f, customer_notes: e.target.value }))}
          rows={3}
          placeholder="e.g. We have a dog (friendly!). Key safe on the front porch."
          style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
        />
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            flex: 1, background: saving ? '#86efac' : 'linear-gradient(135deg, #16a34a, #22c55e)',
            color: 'white', border: 'none', borderRadius: '12px', padding: '12px',
            fontSize: '14px', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
          }}
        >
          {saving ? 'Saving…' : '✓ Save changes'}
        </button>
        <button
          onClick={onCancel}
          style={{
            padding: '12px 20px', background: 'white', border: '1.5px solid #e2e8f0',
            borderRadius: '12px', fontSize: '14px', fontWeight: 600, color: '#64748b', cursor: 'pointer',
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

// ── Listing Card ──────────────────────────────────────────────

function ListingCard({ request, onSave }: {
  request: CleanRequest
  onSave: (id: string, updates: Partial<CleanRequest>) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [saved, setSaved] = useState(false)

  const zone = request.zone ? (ZONE_LABELS[request.zone] ?? request.zone) : 'Horsham'
  const tasks = (request.tasks ?? []).map(t => TASK_LABELS[t] ?? t).filter(Boolean)
  const days = request.preferred_days ?? []
  const freq = request.customers?.frequency
  const isLive = request.status === 'pending' || request.status === 'pending_review'
  const isGrace = request.status === 'pending_review'

  const handleSave = async (updates: Partial<CleanRequest>) => {
    await onSave(request.id, updates)
    setEditing(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div style={{
      background: 'white', borderRadius: '20px',
      border: `2px solid ${isLive ? '#bbf7d0' : '#e2e8f0'}`,
      boxShadow: '0 2px 16px rgba(0,0,0,0.06)', overflow: 'hidden',
    }}>
      {/* Card header */}
      <div style={{
        background: isLive ? 'linear-gradient(135deg, #f0fdf4, #dcfce7)' : '#f8fafc',
        padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid #f1f5f9',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '8px', height: '8px', borderRadius: '50%',
            background: isLive ? '#22c55e' : '#94a3b8',
            boxShadow: isLive ? '0 0 0 3px rgba(34,197,94,0.2)' : 'none',
          }} />
          <span style={{ fontSize: '14px', fontWeight: 700, color: isLive ? '#166534' : '#64748b' }}>
            {isGrace ? '⏱ Going live soon — edit now if needed' : isLive ? 'Live — accepting applications' : 'Not live'}
          </span>
          {saved && <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: 600 }}>✓ Saved</span>}
        </div>
        <button
          onClick={() => setEditing(!editing)}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: editing ? '#0f172a' : 'white',
            border: '1.5px solid #e2e8f0', borderRadius: '10px',
            padding: '6px 12px', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
            color: editing ? 'white' : '#475569', transition: 'all 0.15s',
          }}
        >
          <Settings size={14} />
          {editing ? 'Close' : 'Edit listing'}
        </button>
      </div>

      <div style={{ padding: '20px' }}>
        {/* Zone + chips */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            <span>📍</span>
            <span style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>{zone}</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {[
              request.bedrooms ? `${request.bedrooms} bed` : null,
              request.bathrooms ? `${request.bathrooms} bath` : null,
              request.hours_per_session ? `${request.hours_per_session} hrs` : null,
              freq ? FREQUENCY_LABELS[freq] ?? freq : null,
              days.length ? days.map(d => d.slice(0, 3)).join(' · ') : null,
              request.time_of_day ?? null,
            ].filter(Boolean).map((chip, i) => (
              <span key={i} style={{ background: '#f1f5f9', borderRadius: '100px', padding: '4px 12px', fontSize: '12px', fontWeight: 600, color: '#475569' }}>{chip}</span>
            ))}
          </div>
        </div>

        {/* Tasks */}
        {tasks.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Tasks</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {tasks.slice(0, 6).map((t, i) => (
                <span key={i} style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', fontSize: '12px', fontWeight: 600, padding: '4px 12px', borderRadius: '100px' }}>{t}</span>
              ))}
              {tasks.length > 6 && <span style={{ fontSize: '12px', color: '#94a3b8', padding: '4px 8px' }}>+{tasks.length - 6} more</span>}
            </div>
          </div>
        )}

        {/* Rate */}
        {request.hourly_rate && (
          <div style={{ background: '#fefce8', border: '1px solid #fef08a', borderRadius: '14px', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '4px' }}>Offered rate</div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#78350f' }}>
                £{request.hourly_rate.toFixed(2)}<span style={{ fontSize: '13px', fontWeight: 500 }}>/hr</span>
              </div>
            </div>
            {request.hours_per_session && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '4px' }}>Est. per session</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#78350f' }}>~£{(request.hourly_rate * request.hours_per_session).toFixed(2)}</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Inline edit panel */}
      {editing && (
        <EditPanel
          request={request}
          frequency={freq ?? null}
          onSave={handleSave}
          onCancel={() => setEditing(false)}
        />
      )}
    </div>
  )
}

// ── Applications Card ─────────────────────────────────────────

function ApplicationsCard({ count }: { count: number }) {
  return (
    <div style={{
      background: 'white', borderRadius: '20px', border: '2px solid #e2e8f0',
      boxShadow: '0 2px 16px rgba(0,0,0,0.06)', overflow: 'hidden', marginBottom: '16px',
    }}>
      <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={20} color="#3b82f6" />
          </div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', marginBottom: '2px' }}>
              {count === 0 ? 'No applications yet' : `${count} application${count !== 1 ? 's' : ''}`}
            </div>
            <div style={{ fontSize: '13px', color: '#64748b' }}>
              {count === 0
                ? 'Cleaners in your area will apply here'
                : 'Review and chat with cleaners before deciding'}
            </div>
          </div>
        </div>
        {count > 0 && (
          <button style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: '#0f172a', color: 'white', border: 'none', borderRadius: '10px',
            padding: '8px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
          }}>
            View <ChevronRight size={14} />
          </button>
        )}
      </div>

      {count === 0 && (
        <div style={{ borderTop: '1px solid #f1f5f9', padding: '16px 24px', background: '#f8fafc' }}>
          <div style={{ display: 'flex', gap: '12px' }}>
            {['Cleaners apply', 'You review', 'Start chatting', 'Choose yours'].map((step, i) => (
              <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 6px', fontSize: '12px', fontWeight: 700, color: '#64748b' }}>{i + 1}</div>
                <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500 }}>{step}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Chat teaser ───────────────────────────────────────────────

function ChatTeaser() {
  return (
    <div style={{
      background: 'linear-gradient(135deg, #f0f7ff, #eff6ff)',
      borderRadius: '20px', border: '1.5px solid #bfdbfe',
      padding: '20px 24px', marginBottom: '16px',
      display: 'flex', alignItems: 'center', gap: '16px',
    }}>
      <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <MessageSquare size={20} color="#3b82f6" />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '15px', fontWeight: 700, color: '#1e40af', marginBottom: '3px' }}>Chat with cleaners</div>
        <div style={{ fontSize: '13px', color: '#3b82f6', lineHeight: 1.5 }}>
          Once a cleaner applies, you'll be able to message them directly before committing. Ask questions, discuss timing, and make sure it's a good fit.
        </div>
      </div>
      <div style={{ background: '#bfdbfe', color: '#1e40af', fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '100px', flexShrink: 0 }}>
        Coming soon
      </div>
    </div>
  )
}

// ── New listing banner ────────────────────────────────────────

function NewListingBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
      border: '1.5px solid #93c5fd', borderRadius: '16px',
      padding: '16px 20px', marginBottom: '24px',
      display: 'flex', alignItems: 'flex-start', gap: '14px',
    }}>
      <span style={{ fontSize: '24px', flexShrink: 0 }}>🎉</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '15px', fontWeight: 700, color: '#1e40af', marginBottom: '4px' }}>Your request is live!</div>
        <div style={{ fontSize: '13px', color: '#3b82f6', lineHeight: 1.5 }}>
          Cleaners in your area can now see and apply to your listing. We'll notify you when someone applies.
        </div>
      </div>
      <button onClick={onDismiss} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#93c5fd', padding: '2px', flexShrink: 0 }}>
        <X size={18} />
      </button>
    </div>
  )
}

// ── Main dashboard ────────────────────────────────────────────

function DashboardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isNew = searchParams.get('new') === '1'

  const [user, setUser] = useState<any>(null)
  const [requests, setRequests] = useState<CleanRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewBanner, setShowNewBanner] = useState(isNew)

  useEffect(() => {
    const init = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      setUser(user)

      const { data: customer } = await (supabase as any)
        .from('customers')
        .select('id, frequency')
        .eq('profile_id', user.id)
        .single() as { data: { id: string; frequency: string } | null }

      if (customer) {
        const { data: reqs } = await (supabase as any)
          .from('clean_requests')
          .select('*')
          .eq('customer_id', customer.id)
          .order('created_at', { ascending: false })

        if (reqs) {
          setRequests(reqs.map((r: any) => ({ ...r, customers: { frequency: customer.frequency } })))
        }
      }

      setLoading(false)
    }
    init()
  }, [router])

  const handleSave = async (id: string, updates: Partial<CleanRequest>) => {
    const supabase = createClient()
    await (supabase as any)
      .from('clean_requests')
      .update(updates)
      .eq('id', id)

    // Update local state
    setRequests(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r))
  }

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="spinner h-8 w-8" />
    </div>
  )

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] ?? 'there'
  const activeRequests = requests.filter(r => r.status === 'pending' || r.status === 'pending_review')

  return (
    <div className="min-h-screen bg-surface-secondary">
      {/* Header */}
      <div className="border-b border-ink/5 bg-surface">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
              <span className="text-lg font-bold text-white">V</span>
            </div>
            <span className="text-lg font-semibold text-ink">Vouchee</span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleSignOut}>Sign out</Button>
        </div>
      </div>

      <div className="container py-10" style={{ maxWidth: '720px' }}>
        {/* Greeting */}
        <div className="mb-8">
          <h1 className="mb-1 text-3xl font-bold text-ink">Hey {firstName}! 👋</h1>
          <p className="text-ink-secondary">
            {activeRequests.length > 0
              ? 'Your request is live — cleaners can apply.'
              : 'Post a request to find a cleaner in your area.'}
          </p>
        </div>

        {showNewBanner && <NewListingBanner onDismiss={() => setShowNewBanner(false)} />}

        {requests.length > 0 ? (
          <>
            {/* Listings */}
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '13px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '14px' }}>
                Your listing{requests.length > 1 ? 's' : ''}
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {requests.map(req => (
                  <ListingCard key={req.id} request={req} onSave={handleSave} />
                ))}
              </div>
            </div>

            {/* Applications */}
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '13px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '14px' }}>
                Applications
              </h2>
              <ApplicationsCard count={0} />
            </div>

            {/* Chat teaser */}
            <ChatTeaser />
          </>
        ) : (
          <div style={{ background: 'white', borderRadius: '20px', border: '2px dashed #e2e8f0', padding: '40px', textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🏠</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>No active listings</div>
            <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '20px' }}>Post a request and cleaners in your area will be able to apply.</div>
            <button
              onClick={() => router.push('/request/property')}
              style={{ background: '#0f172a', color: 'white', border: 'none', borderRadius: '12px', padding: '12px 24px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}
            >
              Post a request →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function CustomerDashboard() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="spinner h-8 w-8" /></div>}>
      <DashboardContent />
    </Suspense>
  )
}
