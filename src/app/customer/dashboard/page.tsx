'use client'

import { Suspense } from 'react'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'

// ─── Types ────────────────────────────────────────────────────────────────────

type RequestStatus = 'active' | 'paused' | 'deleted' | 'pending_review' | 'pending' | 'completed' | 'cancelled'
type Frequency = 'weekly' | 'fortnightly' | 'monthly'

interface CustomerProfile {
  full_name: string
  email: string
  role: string
}

interface CleaningRequest {
  id: string
  bedrooms: number
  bathrooms: number
  hours_per_session: number
  hourly_rate: number
  frequency: Frequency
  tasks: string[]
  status: RequestStatus
  created_at: string
  goes_live_at: string | null
  paused_at: string | null
  republish_count: number
  zone: string | null
  preferred_days: string[] | null
  time_of_day: string | null
}

interface EditDraft {
  bedrooms: number
  bathrooms: number
  hours_per_session: number
  hourly_rate: number
  preferred_days: string[]
  time_of_day: string
  tasks: string[]
}

interface Application {
  id: string
  cleaner_id: string
  request_id: string
  status: string
  created_at: string
  message?: string
  cleaner_name?: string
}

interface Conversation {
  id: string
  cleaner_id: string
  clean_request_id: string
  status: string
  cleaner_name?: string
  cleaner_zone?: string
  conversation_index?: number
}

interface Message {
  id: string
  conversation_id: string
  sender_id: string
  sender_role: 'customer' | 'cleaner'
  content: string
  created_at: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TASK_LABELS: Record<string, string> = {
  general: 'General cleaning', general_cleaning: 'General cleaning',
  hoovering: 'Hoovering', mopping: 'Mopping',
  bathroom: 'Bathroom clean', bathroom_deep_clean: 'Bathroom deep clean',
  kitchen: 'Kitchen clean', kitchen_deep_clean: 'Kitchen deep clean',
  windows_interior: 'Interior windows', oven: 'Oven cleaning',
  bathroom_deep: 'Bathroom deep clean', kitchen_deep: 'Kitchen deep clean',
  fridge: 'Fridge clean', blinds: 'Blinds', mold: 'Mould removal',
  ironing: 'Ironing', laundry: 'Laundry', changing_beds: 'Changing beds',
  garage: 'Garage / utility',
}

const ALL_TASKS = [
  'general_cleaning', 'hoovering', 'mopping', 'bathroom', 'kitchen',
  'windows_interior', 'fridge', 'blinds', 'mold', 'ironing', 'laundry',
  'changing_beds', 'garage',
]

const ZONE_LABELS: Record<string, string> = {
  central_south_east: 'Central / South East',
  north_west: 'North West',
  north_east_roffey: 'North East / Roffey',
  south_west: 'South West',
  warnham_north: 'Warnham / North',
  broadbridge_heath: 'Broadbridge Heath',
  mannings_heath: 'Mannings Heath',
  faygate_kilnwood_vale: 'Faygate / Kilnwood Vale',
  christs_hospital: "Christ's Hospital",
}

const FREQUENCY_LABEL: Record<Frequency, string> = {
  weekly: 'Weekly', fortnightly: 'Fortnightly', monthly: 'Monthly',
}

const TIME_SLOTS = ['Morning (8am - 12pm)', 'Afternoon (12pm - 5pm)', 'Evening (5pm - 8pm)', 'Flexible']
const ALL_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const DAY_SHORT: Record<string, string> = {
  monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed',
  thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun',
}

const ACTIVE_STATUSES: RequestStatus[] = ['active', 'pending_review', 'pending']
const PAST_STATUSES: RequestStatus[] = ['deleted', 'paused', 'completed', 'cancelled']

const SUGGESTED_QUESTIONS = [
  "When are you next available?",
  "Do you bring your own supplies?",
  "Have you cleaned a similar-sized property before?",
  "Are you flexible on timing?",
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getFirstName(name: string) {
  return name?.trim()?.split(' ')?.[0] ?? 'there'
}

function formatDays(days: string[] | null) {
  if (!days || days.length === 0) return null
  return days.map(d => DAY_SHORT[d.toLowerCase()] ?? d).join(' · ')
}

function daysSince(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24))
}

function formatTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

// ─── Small components ─────────────────────────────────────────────────────────

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ background: '#f1f5f9', borderRadius: '100px', padding: '4px 12px', fontSize: '12px', fontWeight: 600, color: '#475569' }}>
      {children}
    </span>
  )
}

function ActionBtn({ children, onClick, danger, primary, disabled }: {
  children: React.ReactNode; onClick: () => void; danger?: boolean; primary?: boolean; disabled?: boolean
}) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background: primary ? '#3b82f6' : 'none',
      border: `1px solid ${danger ? '#fecaca' : primary ? '#3b82f6' : '#e2e8f0'}`,
      borderRadius: '8px', padding: '6px 14px', fontSize: '13px', fontWeight: 600,
      color: disabled ? '#cbd5e1' : danger ? '#ef4444' : primary ? 'white' : '#64748b',
      cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif", opacity: disabled ? 0.6 : 1,
    }}>
      {children}
    </button>
  )
}

// ─── Chat Panel ───────────────────────────────────────────────────────────────

function ChatPanel({ conversation, currentUserId, onClose }: {
  conversation: Conversation
  currentUserId: string
  onClose: () => void
}) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [warningShown, setWarningShown] = useState(false)
  const [showWarning, setShowWarning] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  const WATCHLIST = ['07', '+44', 'whatsapp', 'email', '@', 'bank', 'address', 'go direct', 'go private', 'direct payment', 'cash']

  const checkWatchlist = (text: string) => {
    if (warningShown) return false
    const lower = text.toLowerCase()
    return WATCHLIST.some(w => lower.includes(w))
  }

  useEffect(() => {
    const loadMessages = async () => {
      const { data } = await (supabase as any)
        .from('messages')
        .select('*')
        .eq('conversation_id', conversation.id)
        .order('created_at', { ascending: true })
      setMessages(data ?? [])
      setLoading(false)
    }
    loadMessages()

    // Realtime subscription
    const channel = supabase
      .channel(`messages:${conversation.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversation.id}`,
      }, payload => {
        setMessages(prev => [...prev, payload.new as Message])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [conversation.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || sending) return

    if (checkWatchlist(input)) {
      setShowWarning(true)
      setWarningShown(true)
      return
    }

    setSending(true)
    const content = input.trim()
    setInput('')

    await (supabase as any).from('messages').insert({
      conversation_id: conversation.id,
      sender_id: currentUserId,
      sender_role: 'customer',
      content,
    })
    setSending(false)
  }

  const displayName = conversation.cleaner_name ?? 'Your cleaner'

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300,
      background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }}>
      <div style={{
        width: '100%', maxWidth: '680px',
        height: '85vh', background: 'white',
        borderRadius: '20px 20px 0 0',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.15)',
        fontFamily: "'DM Sans', sans-serif",
      }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 800, color: 'white' }}>
              {displayName[0]?.toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>{displayName}</div>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                {conversation.cleaner_zone ? ZONE_LABELS[conversation.cleaner_zone] ?? conversation.cleaner_zone : 'Horsham'}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>✕</button>
        </div>

        {/* Safety warning */}
        {showWarning && (
          <div style={{ padding: '12px 16px', background: '#fffbeb', borderBottom: '1px solid #fde68a', display: 'flex', gap: '10px', alignItems: 'flex-start', flexShrink: 0 }}>
            <span style={{ fontSize: '16px', flexShrink: 0 }}>⚠️</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#92400e', marginBottom: '2px' }}>Keep conversations on Vouchee</div>
              <div style={{ fontSize: '12px', color: '#b45309', lineHeight: 1.5 }}>Your message may contain contact details or off-platform references. To protect both parties, please keep all communication within Vouchee.</div>
            </div>
            <button onClick={() => { setShowWarning(false); setSending(false) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#92400e', fontSize: '16px', flexShrink: 0 }}>✕</button>
          </div>
        )}

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '13px', paddingTop: '40px' }}>Loading messages…</div>
          ) : messages.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '13px', paddingTop: '40px' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>💬</div>
              <div style={{ fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Start the conversation</div>
              <div>Ask {displayName} a question to get started</div>
            </div>
          ) : (
            messages.map(msg => {
              const isMe = msg.sender_role === 'customer'
              return (
                <div key={msg.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', marginBottom: '12px' }}>
                  <div style={{
                    maxWidth: '75%', padding: '10px 14px', borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    background: isMe ? '#2563eb' : '#f1f5f9',
                    color: isMe ? 'white' : '#0f172a', fontSize: '14px', lineHeight: 1.5,
                  }}>
                    {msg.content}
                    <div style={{ fontSize: '10px', color: isMe ? 'rgba(255,255,255,0.6)' : '#94a3b8', marginTop: '4px', textAlign: 'right' }}>
                      {formatTime(msg.created_at)}
                    </div>
                  </div>
                </div>
              )
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Suggested questions */}
        {messages.length === 0 && !loading && (
          <div style={{ padding: '0 16px 12px', flexShrink: 0 }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Suggested questions</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {SUGGESTED_QUESTIONS.map((q, i) => (
                <button key={i} onClick={() => setInput(q)} style={{ padding: '6px 12px', borderRadius: '100px', border: '1.5px solid #e2e8f0', background: 'white', fontSize: '12px', fontWeight: 600, color: '#475569', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '8px', flexShrink: 0 }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            placeholder="Type a message…"
            style={{ flex: 1, padding: '10px 14px', borderRadius: '12px', border: '1.5px solid #e2e8f0', fontSize: '14px', fontFamily: "'DM Sans', sans-serif", outline: 'none', color: '#0f172a' }}
          />
          <button onClick={handleSend} disabled={!input.trim() || sending} style={{ padding: '10px 18px', borderRadius: '12px', border: 'none', background: input.trim() ? '#2563eb' : '#e2e8f0', color: input.trim() ? 'white' : '#94a3b8', fontWeight: 700, fontSize: '14px', cursor: input.trim() ? 'pointer' : 'not-allowed', fontFamily: "'DM Sans', sans-serif", transition: 'all 0.15s' }}>
            Send
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Stepper ──────────────────────────────────────────────────────────────────

function Stepper({ label, value, onDown, onUp, min, max, prefix = '', suffix = '' }: {
  label: string; value: number; onDown: () => void; onUp: () => void; min: number; max: number; prefix?: string; suffix?: string
}) {
  return (
    <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={onDown} disabled={value <= min} style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1.5px solid #e2e8f0', background: value <= min ? '#f8fafc' : 'white', fontSize: '18px', fontWeight: 700, color: value <= min ? '#cbd5e1' : '#0f172a', cursor: value <= min ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
        <span style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', minWidth: '48px', textAlign: 'center' }}>{prefix}{typeof value === 'number' && !Number.isInteger(value) ? value.toFixed(1) : value}{suffix}</span>
        <button onClick={onUp} disabled={value >= max} style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1.5px solid #e2e8f0', background: value >= max ? '#f8fafc' : 'white', fontSize: '18px', fontWeight: 700, color: value >= max ? '#cbd5e1' : '#0f172a', cursor: value >= max ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
      </div>
    </div>
  )
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────

function EditModal({ request, onSave, onClose, saving }: {
  request: CleaningRequest; onSave: (id: string, draft: EditDraft) => Promise<void>; onClose: () => void; saving: boolean
}) {
  const [draft, setDraft] = useState<EditDraft>({
    bedrooms: request.bedrooms ?? 1, bathrooms: request.bathrooms ?? 1,
    hours_per_session: request.hours_per_session ?? 2, hourly_rate: request.hourly_rate ?? 15,
    preferred_days: (request.preferred_days ?? []).map(d => d.toLowerCase()),
    time_of_day: request.time_of_day ?? 'Flexible', tasks: request.tasks ?? [],
  })

  const estPerSession = (draft.hours_per_session * draft.hourly_rate).toFixed(2)
  const toggleDay = (day: string) => setDraft(d => ({ ...d, preferred_days: d.preferred_days.includes(day) ? d.preferred_days.filter(x => x !== day) : [...d.preferred_days, day] }))
  const toggleTask = (task: string) => setDraft(d => ({ ...d, tasks: d.tasks.includes(task) ? d.tasks.filter(x => x !== task) : [...d.tasks, task] }))

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 200, padding: '0' }}>
      <div style={{ background: 'white', borderRadius: '24px 24px 0 0', width: '100%', maxWidth: '720px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 -8px 40px rgba(0,0,0,0.15)' }}>
        <div style={{ position: 'sticky', top: 0, background: 'white', borderBottom: '1px solid #f1f5f9', padding: '16px 24px 14px', zIndex: 10 }}>
          <div style={{ width: '40px', height: '4px', background: '#e2e8f0', borderRadius: '2px', margin: '0 auto 16px' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontFamily: "'Lora', serif", fontSize: '20px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Edit listing</h2>
            <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>✕</button>
          </div>
        </div>
        <div style={{ padding: '24px' }}>
          <div style={{ background: '#fefce8', border: '1px solid #fef08a', borderRadius: '12px', padding: '14px 16px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '2px' }}>Offered rate</div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#78350f' }}>£{draft.hourly_rate.toFixed(2)}<span style={{ fontSize: '13px', fontWeight: 500 }}>/hr</span></div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '2px' }}>Est. per session</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#92400e' }}>~£{estPerSession}</div>
            </div>
          </div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>Property & time</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
            <Stepper label="Bedrooms" value={draft.bedrooms} min={1} max={8} onDown={() => setDraft(d => ({ ...d, bedrooms: d.bedrooms - 1 }))} onUp={() => setDraft(d => ({ ...d, bedrooms: d.bedrooms + 1 }))} />
            <Stepper label="Bathrooms" value={draft.bathrooms} min={1} max={6} onDown={() => setDraft(d => ({ ...d, bathrooms: d.bathrooms - 1 }))} onUp={() => setDraft(d => ({ ...d, bathrooms: d.bathrooms + 1 }))} />
            <Stepper label="Hours per session" value={draft.hours_per_session} min={1} max={10} onDown={() => setDraft(d => ({ ...d, hours_per_session: Math.max(1, d.hours_per_session - 0.5) }))} onUp={() => setDraft(d => ({ ...d, hours_per_session: Math.min(10, d.hours_per_session + 0.5) }))} suffix=" hrs" />
            <Stepper label="Hourly rate" value={draft.hourly_rate} min={12} max={40} onDown={() => setDraft(d => ({ ...d, hourly_rate: Math.max(12, +(d.hourly_rate - 0.5).toFixed(2)) }))} onUp={() => setDraft(d => ({ ...d, hourly_rate: Math.min(40, +(d.hourly_rate + 0.5).toFixed(2)) }))} prefix="£" suffix="/hr" />
          </div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>Preferred days</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '24px' }}>
            {ALL_DAYS.map(day => {
              const selected = draft.preferred_days.includes(day)
              return <button key={day} onClick={() => toggleDay(day)} style={{ padding: '7px 14px', borderRadius: '100px', fontSize: '13px', fontWeight: 600, border: selected ? '2px solid #3b82f6' : '1.5px solid #e2e8f0', background: selected ? '#eff6ff' : 'white', color: selected ? '#1d4ed8' : '#64748b', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>{DAY_SHORT[day]}</button>
            })}
          </div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>Time of day</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '24px' }}>
            {TIME_SLOTS.map(slot => {
              const selected = draft.time_of_day === slot
              return <button key={slot} onClick={() => setDraft(d => ({ ...d, time_of_day: slot }))} style={{ padding: '7px 14px', borderRadius: '100px', fontSize: '13px', fontWeight: 600, border: selected ? '2px solid #3b82f6' : '1.5px solid #e2e8f0', background: selected ? '#eff6ff' : 'white', color: selected ? '#1d4ed8' : '#64748b', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>{slot}</button>
            })}
          </div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>Tasks requested</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '32px' }}>
            {ALL_TASKS.map(task => {
              const selected = draft.tasks.includes(task)
              return <button key={task} onClick={() => toggleTask(task)} style={{ padding: '7px 14px', borderRadius: '100px', fontSize: '13px', fontWeight: 600, border: selected ? '2px solid #22c55e' : '1.5px solid #e2e8f0', background: selected ? '#f0fdf4' : 'white', color: selected ? '#15803d' : '#64748b', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>{TASK_LABELS[task] ?? task}</button>
            })}
          </div>
          <button onClick={() => onSave(request.id, draft)} disabled={saving} style={{ width: '100%', padding: '14px', background: saving ? '#94a3b8' : '#0f172a', color: 'white', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
            {saving ? 'Saving…' : 'Save & update listing →'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Confirm Modal ────────────────────────────────────────────────────────────

function ConfirmModal({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '24px' }}>
      <div style={{ background: 'white', borderRadius: '20px', padding: '32px', maxWidth: '400px', width: '100%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <p style={{ fontSize: '15px', color: '#0f172a', margin: '0 0 24px', lineHeight: 1.6 }}>{message}</p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button onClick={onCancel} style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 20px', fontSize: '14px', fontWeight: 600, color: '#64748b', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Cancel</button>
          <button onClick={onConfirm} style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 20px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Confirm</button>
        </div>
      </div>
    </div>
  )
}

function ComingSoonBanner({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)', background: '#0f172a', color: 'white', borderRadius: '12px', padding: '12px 20px', fontSize: '14px', fontWeight: 600, boxShadow: '0 8px 32px rgba(0,0,0,0.2)', zIndex: 300, display: 'flex', alignItems: 'center', gap: '12px', whiteSpace: 'nowrap' }}>
      🚧 {message}
      <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '6px', color: 'white', fontSize: '12px', padding: '2px 8px', cursor: 'pointer' }}>Dismiss</button>
    </div>
  )
}

// ─── Active Request Card ──────────────────────────────────────────────────────

function ActiveRequestCard({ request, onPause, onRepublish, onDelete, onEdit }: {
  request: CleaningRequest; onPause: () => void; onRepublish: () => void; onDelete: () => void; onEdit: () => void
}) {
  const hours = request.hours_per_session ?? 0
  const rate = request.hourly_rate ?? 0
  const freq = request.frequency ?? 'fortnightly'
  const estPerSession = hours && rate ? `~£${(hours * rate).toFixed(2)}` : null
  const pausesLeft = 2 - (request.republish_count ?? 0)
  const isRelocked = request.paused_at ? Date.now() - new Date(request.paused_at).getTime() < 24 * 60 * 60 * 1000 : false
  const locationLabel = request.zone ? (ZONE_LABELS[request.zone] ?? request.zone) : 'Horsham'
  const daysLabel = formatDays(request.preferred_days)
  const visibleTasks = (request.tasks ?? []).slice(0, 6)
  const extraTasks = (request.tasks ?? []).length - 6

  const statusConfig = {
    active:         { label: 'Live — accepting applications', dot: '#22c55e', border: '#bbf7d0', headerBg: '#f0fdf4', textColor: '#15803d' },
    pending_review: { label: 'Under review',                  dot: '#f59e0b', border: '#fde68a', headerBg: '#fffbeb', textColor: '#92400e' },
    pending:        { label: 'Live — accepting applications', dot: '#22c55e', border: '#bbf7d0', headerBg: '#f0fdf4', textColor: '#15803d' },
    paused:         { label: 'Paused',                        dot: '#eab308', border: '#fef08a', headerBg: '#fefce8', textColor: '#854d0e' },
    deleted:        { label: 'Deleted',                       dot: '#ef4444', border: '#fecaca', headerBg: '#fef2f2', textColor: '#991b1b' },
    completed:      { label: 'Completed',                     dot: '#8b5cf6', border: '#ddd6fe', headerBg: '#f5f3ff', textColor: '#6d28d9' },
    cancelled:      { label: 'Cancelled',                     dot: '#94a3b8', border: '#e2e8f0', headerBg: '#f8fafc', textColor: '#64748b' },
  }
  const sc = statusConfig[request.status] ?? statusConfig.active

  return (
    <div style={{ background: 'white', borderRadius: '16px', border: `1.5px solid ${sc.border}`, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', marginBottom: '16px', overflow: 'hidden' }}>
      <div style={{ background: sc.headerBg, padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: sc.dot, display: 'inline-block' }} />
          <span style={{ fontSize: '13px', fontWeight: 700, color: sc.textColor }}>{sc.label}</span>
        </div>
        <span style={{ fontSize: '12px', color: '#94a3b8' }}>Posted {daysSince(request.created_at)} days ago</span>
      </div>
      <div style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '14px' }}>
          <span style={{ fontSize: '16px' }}>📍</span>
          <span style={{ fontFamily: "'Lora', serif", fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>{locationLabel}</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
          {request.bedrooms ? <Chip>{request.bedrooms} bed</Chip> : null}
          {request.bathrooms ? <Chip>{request.bathrooms} bath</Chip> : null}
          {hours > 0 ? <Chip>{hours} hrs</Chip> : null}
          {freq ? <Chip>{FREQUENCY_LABEL[freq] ?? freq}</Chip> : null}
          {daysLabel ? <Chip>{daysLabel}</Chip> : null}
          {request.time_of_day ? <Chip>{request.time_of_day}</Chip> : null}
        </div>
        {visibleTasks.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Tasks</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {visibleTasks.map(task => <span key={task} style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', fontSize: '12px', fontWeight: 600, padding: '4px 10px', borderRadius: '100px' }}>{TASK_LABELS[task] ?? task}</span>)}
              {extraTasks > 0 && <span style={{ background: '#f1f5f9', color: '#64748b', fontSize: '12px', fontWeight: 600, padding: '4px 10px', borderRadius: '100px' }}>+{extraTasks} more</span>}
            </div>
          </div>
        )}
        {rate > 0 && (
          <div style={{ background: '#fefce8', border: '1px solid #fef08a', borderRadius: '12px', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '16px' }}>
            <div>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '4px' }}>Offered rate</div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#78350f', lineHeight: 1 }}>£{rate.toFixed(2)}<span style={{ fontSize: '14px', fontWeight: 500 }}>/hr</span></div>
            </div>
            {estPerSession && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '4px' }}>Est. per session</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#92400e' }}>{estPerSession}</div>
              </div>
            )}
          </div>
        )}
        {request.status === 'pending_review' && (
          <div style={{ padding: '10px 14px', background: '#fffbeb', borderRadius: '10px', border: '1px solid #fde68a', marginBottom: '16px' }}>
            <p style={{ margin: 0, fontSize: '13px', color: '#92400e', lineHeight: 1.5 }}>⏳ Your request is under review. We'll notify you once it's approved and visible to cleaners.</p>
          </div>
        )}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <ActionBtn onClick={onEdit} primary>Edit listing</ActionBtn>
          {request.status === 'active' && pausesLeft > 0 && <ActionBtn onClick={onPause}>Pause listing</ActionBtn>}
          {request.status === 'paused' && (!isRelocked ? <ActionBtn onClick={onRepublish}>Republish</ActionBtn> : <span style={{ fontSize: '12px', color: '#94a3b8', alignSelf: 'center' }}>Available to republish in 24h</span>)}
          <ActionBtn onClick={onDelete} danger>Remove listing</ActionBtn>
        </div>
      </div>
    </div>
  )
}

// ─── Past Listing Row ─────────────────────────────────────────────────────────

function PastListingRow({ request }: { request: CleaningRequest }) {
  const [expanded, setExpanded] = useState(false)
  const daysOpen = daysSince(request.created_at)
  const rate = request.hourly_rate ?? 0
  const hours = request.hours_per_session ?? 0
  const locationLabel = request.zone ? (ZONE_LABELS[request.zone] ?? request.zone) : 'Horsham'
  const statusLabels: Record<RequestStatus, { label: string; color: string }> = {
    deleted: { label: 'Removed', color: '#94a3b8' }, paused: { label: 'Paused', color: '#eab308' },
    completed: { label: 'Completed', color: '#8b5cf6' }, cancelled: { label: 'Cancelled', color: '#94a3b8' },
    active: { label: 'Active', color: '#22c55e' }, pending_review: { label: 'Review', color: '#f59e0b' }, pending: { label: 'Live', color: '#22c55e' },
  }
  const st = statusLabels[request.status] ?? statusLabels.deleted
  return (
    <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '8px', overflow: 'hidden' }}>
      <button onClick={() => setExpanded(e => !e)} style={{ width: '100%', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", textAlign: 'left' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', flexShrink: 0 }}>{locationLabel}</span>
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>{request.bedrooms}bd · {request.bathrooms}ba{hours ? ` · ${hours}h` : ''}{rate ? ` · £${rate}/hr` : ''}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0, marginLeft: '12px' }}>
          <span style={{ fontSize: '12px', color: '#64748b' }}>{daysOpen}d ago</span>
          <span style={{ fontSize: '12px', fontWeight: 700, color: st.color }}>{st.label}</span>
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>{expanded ? '▲' : '▼'}</span>
        </div>
      </button>
      {expanded && (
        <div style={{ padding: '0 18px 16px', borderTop: '1px solid #f1f5f9' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginTop: '14px', marginBottom: '14px' }}>
            <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '12px' }}><div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '4px' }}>Days open</div><div style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a' }}>{daysOpen}</div></div>
            <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '12px' }}><div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '4px' }}>Offered rate</div><div style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a' }}>{rate ? `£${rate}` : '—'}</div></div>
            <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '12px' }}><div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '4px' }}>Hours/session</div><div style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a' }}>{hours || '—'}</div></div>
          </div>
          {(request.tasks ?? []).length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {(request.tasks ?? []).map(task => <span key={task} style={{ background: '#f1f5f9', color: '#64748b', fontSize: '11px', fontWeight: 600, padding: '3px 9px', borderRadius: '100px' }}>{TASK_LABELS[task] ?? task}</span>)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Applications Section ─────────────────────────────────────────────────────

function ApplicationsSection({ requestIds, onAccept }: {
  requestIds: string[]
  onAccept: (applicationId: string, requestId: string) => void
}) {
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState<string | null>(null)

  useEffect(() => {
    if (!requestIds.length) { setLoading(false); return }
    const fetchApplications = async () => {
      const supabase = createClient()
      const { data, error } = await (supabase as any)
        .from('applications')
        .select('*')
        .in('request_id', requestIds)
        .order('created_at', { ascending: false })
      if (!error && data) setApplications(data)
      setLoading(false)
    }
    fetchApplications()
  }, [requestIds.join(',')])

  const handleAccept = async (app: Application) => {
    setAccepting(app.id)
    await onAccept(app.id, app.request_id)
    setAccepting(null)
    // Update local state to show accepted
    setApplications(prev => prev.map(a => a.id === app.id ? { ...a, status: 'accepted' } : a))
  }

  return (
    <div style={{ marginBottom: '36px' }}>
      <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '14px' }}>Applications</div>
      {loading ? (
        <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '24px', textAlign: 'center' }}>
          <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>Loading applications…</p>
        </div>
      ) : applications.length === 0 ? (
        <div style={{ background: 'white', borderRadius: '14px', border: '1.5px dashed #e2e8f0', padding: '32px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: '28px', marginBottom: '10px' }}>👀</div>
          <p style={{ fontSize: '14px', fontWeight: 600, color: '#475569', margin: '0 0 4px' }}>No applications yet</p>
          <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>Once cleaners apply to your listing, you'll be able to review their profiles here.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {applications.map(app => (
            <div key={app.id} style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: app.message ? '12px' : '0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>🧹</div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>{app.cleaner_name ?? 'Cleaner'}</div>
                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>Applied {daysSince(app.created_at) === 0 ? 'today' : `${daysSince(app.created_at)}d ago`}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '100px', background: app.status === 'pending' ? '#f1f5f9' : app.status === 'accepted' ? '#f0fdf4' : '#fef2f2', color: app.status === 'pending' ? '#64748b' : app.status === 'accepted' ? '#15803d' : '#dc2626' }}>
                    {app.status === 'pending' ? 'New' : app.status === 'accepted' ? 'Chatting' : 'Declined'}
                  </span>
                  {app.status === 'pending' && (
                    <button
                      onClick={() => handleAccept(app)}
                      disabled={accepting === app.id}
                      style={{ background: '#16a34a', color: 'white', border: 'none', borderRadius: '8px', padding: '6px 14px', fontSize: '12px', fontWeight: 700, cursor: accepting === app.id ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif", opacity: accepting === app.id ? 0.7 : 1 }}
                    >
                      {accepting === app.id ? 'Opening…' : '✓ Accept & chat'}
                    </button>
                  )}
                  {app.status === 'accepted' && (
                    <button
                      onClick={() => onAccept(app.id, app.request_id)}
                      style={{ background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', padding: '6px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
                    >
                      💬 Open chat
                    </button>
                  )}
                </div>
              </div>
              {app.message && (
                <div style={{ padding: '10px 14px', background: '#eff6ff', borderRadius: '10px', borderLeft: '3px solid #2563eb' }}>
                  <p style={{ margin: 0, fontSize: '13px', color: '#1e40af', lineHeight: 1.5 }}>{app.message}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function CustomerDashboardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [profile, setProfile] = useState<CustomerProfile | null>(null)
  const [requests, setRequests] = useState<CleaningRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modal, setModal] = useState<{ type: 'pause' | 'delete' | 'republish' | 'signout'; id: string } | null>(null)
  const [editingRequest, setEditingRequest] = useState<CleaningRequest | null>(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.replace('/login'); return }

        setCurrentUserId(user.id)

        const { data: profileData, error: profileError } = await (supabase as any)
          .from('profiles').select('full_name, email, role').eq('id', user.id).single()

        if (profileError || !profileData) throw new Error('Could not load your profile.')
        if (profileData.role !== 'customer') { router.replace('/cleaner/dashboard'); return }

        const { data: requestData, error: requestError } = await (supabase as any)
          .from('clean_requests').select('*').eq('customer_id', user.id).order('created_at', { ascending: false })

        if (requestError) throw new Error(requestError.message)

        setProfile(profileData)
        setRequests(requestData ?? [])

        // Handle URL params from email accept link
        const acceptAppId = searchParams.get('accept')
        const acceptReqId = searchParams.get('request')
        if (acceptAppId && acceptReqId) {
          // Call accept API then open chat
          handleAcceptApplication(acceptAppId, acceptReqId, user.id)
          // Clean URL
          router.replace('/customer/dashboard')
        }
      } catch (err: any) {
        setError(err?.message ?? 'Something went wrong.')
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [router])

  const handleAcceptApplication = async (applicationId: string, requestId: string, userId?: string) => {
    try {
      const res = await fetch('/api/accept-application', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId, requestId }),
      })
      const data = await res.json()
      if (!res.ok || !data.conversationId) {
        showToast('Could not open chat — please try again')
        return
      }

      // Load conversation details for the chat panel
      const supabase = createClient()
      const { data: conv } = await (supabase as any)
        .from('conversations')
        .select('id, cleaner_id, clean_request_id, status')
        .eq('id', data.conversationId)
        .single()

      if (conv) {
        // Get cleaner name
        const { data: cleaner } = await (supabase as any)
          .from('cleaners')
          .select('profile_id, profiles(full_name), zones')
          .eq('id', conv.cleaner_id)
          .single()

        const cleanerName = cleaner?.profiles?.full_name
          ? (() => {
              const parts = cleaner.profiles.full_name.trim().split(' ')
              return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : parts[0]
            })()
          : 'Your cleaner'

        setActiveConversation({
          id: conv.id,
          cleaner_id: conv.cleaner_id,
          clean_request_id: conv.clean_request_id,
          status: conv.status,
          cleaner_name: cleanerName,
          cleaner_zone: cleaner?.zones?.[0] ?? null,
        })
      }
    } catch (err) {
      showToast('Something went wrong — please try again')
    }
  }

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3500) }

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.refresh()
    router.replace('/')
  }

  const handlePause = async (id: string) => {
    const supabase = createClient()
    await (supabase as any).from('clean_requests').update({ status: 'paused', paused_at: new Date().toISOString() }).eq('id', id)
    setRequests(r => r.map(req => req.id === id ? { ...req, status: 'paused' as RequestStatus, paused_at: new Date().toISOString() } : req))
    setModal(null)
  }

  const handleRepublish = async (id: string) => {
    const req = requests.find(r => r.id === id)
    if (!req) return
    const supabase = createClient()
    await (supabase as any).from('clean_requests').update({ status: 'active', paused_at: new Date().toISOString(), republish_count: req.republish_count + 1 }).eq('id', id)
    setRequests(r => r.map(req => req.id === id ? { ...req, status: 'active' as RequestStatus, republish_count: req.republish_count + 1 } : req))
    setModal(null)
  }

  const handleDelete = async (id: string) => {
    const supabase = createClient()
    await (supabase as any).from('clean_requests').update({ status: 'deleted' }).eq('id', id)
    setRequests(r => r.map(req => req.id === id ? { ...req, status: 'deleted' as RequestStatus } : req))
    setModal(null)
  }

  const handleSaveEdit = async (id: string, draft: EditDraft) => {
    setSaving(true)
    try {
      const supabase = createClient()
      const { error } = await (supabase as any).from('clean_requests').update({ bedrooms: draft.bedrooms, bathrooms: draft.bathrooms, hours_per_session: draft.hours_per_session, hourly_rate: draft.hourly_rate, preferred_days: draft.preferred_days, time_of_day: draft.time_of_day, tasks: draft.tasks }).eq('id', id)
      if (error) throw error
      setRequests(r => r.map(req => req.id === id ? { ...req, ...draft } : req))
      setEditingRequest(null)
      showToast('Listing updated successfully')
    } catch (err: any) {
      showToast('Failed to save — please try again')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ textAlign: 'center' }}><div style={{ fontSize: '32px', marginBottom: '12px' }}>🧹</div><p style={{ fontSize: '14px', color: '#64748b' }}>Loading your dashboard…</p></div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif", padding: '24px' }}>
        <div style={{ background: 'white', borderRadius: '20px', padding: '40px', maxWidth: '400px', textAlign: 'center', border: '1.5px solid #fecaca' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>⚠️</div>
          <p style={{ fontSize: '14px', color: '#dc2626', margin: '0 0 16px' }}>{error ?? 'Could not load your dashboard.'}</p>
          <button onClick={() => router.push('/login')} style={{ background: '#0f172a', color: 'white', border: 'none', borderRadius: '10px', padding: '10px 24px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Back to login</button>
        </div>
      </div>
    )
  }

  const firstName = getFirstName(profile.full_name)
  const activeRequests = requests.filter(r => ACTIVE_STATUSES.includes(r.status))
  const pastRequests = requests.filter(r => PAST_STATUSES.includes(r.status))
  const pausedRequests = requests.filter(r => r.status === 'paused')
  const hasActive = activeRequests.length > 0
  const hasPaused = pausedRequests.length > 0
  const activeRequestIds = activeRequests.map(r => r.id)

  return (
    <>
      <style>{`* { box-sizing: border-box; }`}</style>
      <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'DM Sans', sans-serif", display: 'flex', flexDirection: 'column' }}>
        <Header userRole={profile.role} />
        <main style={{ flex: 1 }}>
          <div style={{ maxWidth: '720px', margin: '0 auto', padding: '40px 24px 60px' }}>

            <div style={{ marginBottom: '36px' }}>
              <h1 style={{ fontFamily: "'Lora', serif", fontSize: '30px', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>Hey {firstName}! 👋</h1>
              <p style={{ fontSize: '15px', color: '#64748b' }}>{hasActive ? 'Your request is live — cleaners can apply.' : 'Manage your cleaning requests below.'}</p>
            </div>

            {/* Request type buttons */}
            <div style={{ marginBottom: '36px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '14px' }}>Request a clean</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ background: 'white', borderRadius: '14px', border: '1.5px solid #e2e8f0', padding: '18px', position: 'relative', overflow: 'hidden' }}>
                  {hasActive && <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.7)', borderRadius: '14px', zIndex: 1 }} />}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}><span style={{ fontSize: '22px' }}>🧹</span><span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>Regular clean</span></div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '14px', lineHeight: 1.4 }}>Weekly or fortnightly recurring clean</div>
                  {hasActive ? (
                    <div style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>{hasPaused ? 'Edit or delete your paused listing first' : 'You already have an active listing'}</div>
                  ) : (
                    <button onClick={() => router.push('/request/property')} style={{ background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Post request →</button>
                  )}
                </div>
                <div style={{ background: 'white', borderRadius: '14px', border: '1.5px solid #e2e8f0', padding: '18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}><span style={{ fontSize: '22px' }}>🏠</span><span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>End of tenancy</span></div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '14px', lineHeight: 1.4 }}>Deep clean for move-out or move-in</div>
                  <button onClick={() => showToast('End of tenancy cleans — contact us at contact@vouchee.co.uk')} style={{ background: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Enquire</button>
                </div>
                <div style={{ background: 'white', borderRadius: '14px', border: '1.5px solid #e2e8f0', padding: '18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}><span style={{ fontSize: '22px' }}>🔄</span><span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>Cover clean</span></div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '10px', lineHeight: 1.4 }}>One-off cover when your regular cleaner is away</div>
                  <div style={{ marginBottom: '12px', padding: '8px 10px', background: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#1d4ed8', marginBottom: '2px' }}>📣 Instant alerts</div>
                    <div style={{ fontSize: '11px', color: '#3b82f6', lineHeight: 1.4 }}>All available cleaners in your area get notified immediately</div>
                  </div>
                  <button onClick={() => showToast('Cover cleans are coming soon')} style={{ background: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Coming soon</button>
                </div>
                <div style={{ background: 'white', borderRadius: '14px', border: '1.5px solid #e2e8f0', padding: '18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}><span style={{ fontSize: '22px' }}>🫙</span><span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>Oven clean</span></div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '14px', lineHeight: 1.4 }}>Specialist one-off oven deep clean</div>
                  <button onClick={() => showToast('Oven cleans — contact us at contact@vouchee.co.uk')} style={{ background: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Enquire</button>
                </div>
              </div>
              {hasPaused && !hasActive && (
                <div style={{ marginTop: '12px', padding: '12px 16px', background: '#fefce8', border: '1px solid #fef08a', borderRadius: '10px', fontSize: '13px', color: '#92400e' }}>
                  💡 You have a paused listing. Consider editing or deleting it before posting a new request.
                </div>
              )}
            </div>

            {/* Active listings */}
            {activeRequests.length > 0 && (
              <div style={{ marginBottom: '36px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '14px' }}>Your listing</div>
                {activeRequests.map(req => (
                  <ActiveRequestCard key={req.id} request={req} onPause={() => setModal({ type: 'pause', id: req.id })} onRepublish={() => setModal({ type: 'republish', id: req.id })} onDelete={() => setModal({ type: 'delete', id: req.id })} onEdit={() => setEditingRequest(req)} />
                ))}
              </div>
            )}

            {/* Paused listings */}
            {!hasActive && pausedRequests.length > 0 && (
              <div style={{ marginBottom: '36px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '14px' }}>Paused listing</div>
                {pausedRequests.map(req => (
                  <ActiveRequestCard key={req.id} request={req} onPause={() => setModal({ type: 'pause', id: req.id })} onRepublish={() => setModal({ type: 'republish', id: req.id })} onDelete={() => setModal({ type: 'delete', id: req.id })} onEdit={() => setEditingRequest(req)} />
                ))}
              </div>
            )}

            {/* Applications */}
            {activeRequestIds.length > 0 && (
              <ApplicationsSection
                requestIds={activeRequestIds}
                onAccept={handleAcceptApplication}
              />
            )}

            {/* Past listings */}
            {pastRequests.filter(r => r.status !== 'paused').length > 0 && (
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '14px' }}>Past listings</div>
                {pastRequests.filter(r => r.status !== 'paused').map(req => <PastListingRow key={req.id} request={req} />)}
              </div>
            )}

            {requests.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>🧹</div>
                <p style={{ fontSize: '15px' }}>No requests yet — use the buttons above to get started.</p>
              </div>
            )}
          </div>
        </main>

        <div style={{ borderTop: '1px solid #e2e8f0', padding: '32px 24px', display: 'flex', justifyContent: 'center' }}>
          <button onClick={() => setModal({ type: 'signout', id: '' })} style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 20px', fontSize: '13px', fontWeight: 600, color: '#94a3b8', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Sign out</button>
        </div>

        <Footer />

        {modal?.type === 'signout' && <ConfirmModal message="Are you sure you want to sign out?" onConfirm={handleSignOut} onCancel={() => setModal(null)} />}
        {modal?.type === 'pause' && <ConfirmModal message="Pause your request? It won't be visible to cleaners until you republish." onConfirm={() => handlePause(modal.id)} onCancel={() => setModal(null)} />}
        {modal?.type === 'republish' && <ConfirmModal message="Republish your request? It will be visible to cleaners again." onConfirm={() => handleRepublish(modal.id)} onCancel={() => setModal(null)} />}
        {modal?.type === 'delete' && <ConfirmModal message="Permanently remove this request? This cannot be undone." onConfirm={() => handleDelete(modal.id)} onCancel={() => setModal(null)} />}
        {editingRequest && <EditModal request={editingRequest} onSave={handleSaveEdit} onClose={() => setEditingRequest(null)} saving={saving} />}
        {toast && <ComingSoonBanner message={toast} onClose={() => setToast(null)} />}

        {/* Chat panel */}
        {activeConversation && currentUserId && (
          <ChatPanel
            conversation={activeConversation}
            currentUserId={currentUserId}
            onClose={() => setActiveConversation(null)}
          />
        )}
      </div>
    </>
  )
}

export default function CustomerDashboard() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif" }}><p style={{ fontSize: '14px', color: '#64748b' }}>Loading…</p></div>}>
      <CustomerDashboardContent />
    </Suspense>
  )
}
