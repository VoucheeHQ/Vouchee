'use client'

import { Suspense } from 'react'
import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'

// ─── Types ────────────────────────────────────────────────────────────────────

type RequestStatus = 'active' | 'paused' | 'deleted' | 'pending_review' | 'pending' | 'completed' | 'cancelled' | 'fulfilled'
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
  cleaner_initial?: string
  cleaner_member_since?: string
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
  southwater: 'Southwater',
}

const FREQUENCY_LABEL: Record<Frequency, string> = {
  weekly: 'Weekly', fortnightly: 'Fortnightly', monthly: 'Monthly',
}

const MONTHLY_FEES: Record<Frequency, number> = {
  weekly: 4333,
  fortnightly: 3248,
  monthly: 2499,
}

const TIME_SLOTS = ['Morning (8am - 12pm)', 'During the day (8am - 5pm)', 'Afternoon (12pm - 5pm)', 'Evening (5pm - 8pm)', 'Flexible']
const ALL_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const DAY_SHORT: Record<string, string> = {
  monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed',
  thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun',
}

const ACTIVE_STATUSES: RequestStatus[] = ['active', 'pending_review', 'pending']
const PAST_STATUSES: RequestStatus[] = ['deleted', 'paused', 'completed', 'cancelled', 'fulfilled']

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getFirstName(name: string) {
  return name?.trim()?.split(' ')?.[0] ?? 'there'
}

function formatFirstLastInitial(name: string): string {
  const parts = (name ?? '').trim().split(' ')
  if (parts.length > 1) return `${parts[0]} ${parts[parts.length - 1][0]}.`
  return parts[0] || 'Cleaner'
}

function formatDays(days: string[] | null) {
  if (!days || days.length === 0) return null
  return days.map(d => DAY_SHORT[d.toLowerCase()] ?? d).join(' · ')
}

function daysSince(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24))
}

function calculateBilling(frequency: Frequency, startDate: string): {
  firstChargePence: number
  monthlyPence: number
  firstChargeLabel: string
  monthlyLabel: string
  isFullMonth: boolean
} {
  const monthly = MONTHLY_FEES[frequency]
  const start = new Date(startDate)
  const day = start.getDate()
  const daysInMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate()

  if (frequency === 'monthly') {
    return {
      firstChargePence: monthly, monthlyPence: monthly,
      firstChargeLabel: `£${(monthly / 100).toFixed(2)}`,
      monthlyLabel: `£${(monthly / 100).toFixed(2)}/month`,
      isFullMonth: true,
    }
  }

  const daysRemaining = daysInMonth - day + 1
  const proRata = Math.round(monthly * (daysRemaining / daysInMonth))
  return {
    firstChargePence: proRata, monthlyPence: monthly,
    firstChargeLabel: `£${(proRata / 100).toFixed(2)}`,
    monthlyLabel: `£${(monthly / 100).toFixed(2)}/month`,
    isFullMonth: daysRemaining === daysInMonth,
  }
}

function getMinDate(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
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

// ─── Start Date Modal ─────────────────────────────────────────────────────────

function StartDateModal({ cleanerName, frequency, applicationId, requestId, conversationId, onCancel, onConfirm, loading }: {
  cleanerName: string
  frequency: Frequency
  applicationId: string
  requestId: string
  conversationId: string
  onCancel: () => void
  onConfirm: (startDate: string) => void
  loading: boolean
}) {
  const minDate = getMinDate()
  const [startDate, setStartDate] = useState(minDate)

  const firstName = cleanerName.split(' ')[0]
  const billing = calculateBilling(frequency, startDate)
  const day = new Date(startDate).getDate()
  const showLateMonthWarning = day > 24

  const nextMonth = new Date(startDate)
  nextMonth.setMonth(nextMonth.getMonth() + 1)
  nextMonth.setDate(1)
  const nextMonthName = nextMonth.toLocaleDateString('en-GB', { month: 'long' })
  const currentMonthName = new Date(startDate).toLocaleDateString('en-GB', { month: 'long' })
  const freqLabel = FREQUENCY_LABEL[frequency] ?? frequency

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500, padding: '24px' }}>
      <div style={{ background: 'white', borderRadius: '24px', padding: '44px 48px', maxWidth: '540px', width: '100%', boxShadow: '0 32px 80px rgba(0,0,0,0.22)', maxHeight: '92vh', overflowY: 'auto' }}>
        <h3 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '26px', fontWeight: 800, color: '#0f172a', textAlign: 'center', margin: '0 0 32px', letterSpacing: '-0.3px' }}>
          When would you like {firstName} to start?
        </h3>

        {/* Date picker — full bar clickable */}
        <div style={{ marginBottom: '28px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '10px' }}>
            Start date
          </label>
          <div onClick={() => { const input = document.getElementById('start-date-input') as HTMLInputElement | null; input?.showPicker?.() }} style={{ position: 'relative', cursor: 'pointer' }}>
            <input
              id="start-date-input"
              type="date"
              value={startDate}
              min={minDate}
              onChange={e => setStartDate(e.target.value)}
              style={{ width: '100%', padding: '14px 16px', border: '1.5px solid #e2e8f0', borderRadius: '12px', fontSize: '17px', fontWeight: 600, color: '#0f172a', fontFamily: "'DM Sans', sans-serif", outline: 'none', boxSizing: 'border-box', cursor: 'pointer', pointerEvents: 'none' }}
            />
          </div>
        </div>

        {/* Pricing breakdown */}
        <div style={{ background: '#f8fafc', borderRadius: '14px', padding: '20px', marginBottom: '12px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '16px' }}>
            Vouchee service fee · {freqLabel}
          </div>
          <div style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>{billing.firstChargeLabel} today</div>
            <div style={{ fontSize: '13px', color: '#94a3b8' }}>
              {billing.isFullMonth || frequency === 'monthly' ? 'Taken within 3 working days' : `Pro-rata for ${currentMonthName} · within 3 working days`}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>Then {billing.monthlyLabel} from 1st {nextMonthName}</div>
            <div style={{ fontSize: '13px', color: '#94a3b8' }}>Billed on the 1st of each month</div>
          </div>
        </div>

        <div style={{ fontSize: '13px', color: '#64748b', textAlign: 'center', margin: '0 0 12px' }}>
          Cancel anytime with 30 days' notice.
        </div>

        {showLateMonthWarning && (
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '14px 16px', marginBottom: '14px', fontSize: '14px', color: '#92400e', lineHeight: 1.6 }}>
            ⚠️ Your first payment is taken now, then monthly on the 1st. You may see two payments close together — this is normal and only happens when setting up your Direct Debit.
          </div>
        )}

        {/* Trust badge */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px', marginBottom: '28px' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 1L3 5V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V5L12 1Z" fill="#16a34a" opacity="0.15" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M9 12L11 14L15 10" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>
            Secure Direct Debit via GoCardless · Protected by the Direct Debit Guarantee
          </span>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={onCancel} disabled={loading} style={{ flex: 1, background: 'white', border: '1.5px solid #e2e8f0', borderRadius: '12px', padding: '15px', fontSize: '15px', fontWeight: 600, color: '#64748b', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
            Cancel
          </button>
          <button onClick={() => onConfirm(startDate)} disabled={loading || !startDate} style={{ flex: 2, background: '#16a34a', border: 'none', borderRadius: '12px', padding: '15px', fontSize: '15px', fontWeight: 700, color: 'white', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, fontFamily: "'DM Sans', sans-serif" }}>
            {loading ? 'Setting up…' : 'Secure your cleaner →'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Success Banner ───────────────────────────────────────────────────────────

function SuccessBanner({ onClose }: { onClose: () => void }) {
  return (
    <>
      <style>{`
        @keyframes successSlideUp {
          from { opacity: 0; transform: translateX(-50%) translateY(20px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes popIn {
          0%   { transform: scale(0.5); }
          70%  { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
        @keyframes confetti1 { 0% { transform: translateY(0) rotate(0deg); opacity: 1; } 100% { transform: translateY(-60px) rotate(180deg); opacity: 0; } }
        @keyframes confetti2 { 0% { transform: translateY(0) rotate(0deg); opacity: 1; } 100% { transform: translateY(-80px) translateX(20px) rotate(-120deg); opacity: 0; } }
        @keyframes confetti3 { 0% { transform: translateY(0) rotate(0deg); opacity: 1; } 100% { transform: translateY(-70px) translateX(-15px) rotate(240deg); opacity: 0; } }
      `}</style>
      <div style={{ position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)', zIndex: 400, animation: 'successSlideUp 0.4s ease forwards', maxWidth: '500px', width: 'calc(100vw - 48px)' }}>
        <div style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)', color: 'white', borderRadius: '16px', padding: '20px 24px', boxShadow: '0 16px 48px rgba(22,163,74,0.45)', display: 'flex', alignItems: 'flex-start', gap: '14px', position: 'relative', overflow: 'hidden' }}>
          {/* Confetti dots */}
          <span style={{ position: 'absolute', top: '12px', right: '60px', width: '8px', height: '8px', borderRadius: '50%', background: '#fef08a', animation: 'confetti1 1s ease forwards 0.2s', opacity: 0 }} />
          <span style={{ position: 'absolute', top: '20px', right: '80px', width: '6px', height: '6px', borderRadius: '50%', background: '#bfdbfe', animation: 'confetti2 1.1s ease forwards 0.3s', opacity: 0 }} />
          <span style={{ position: 'absolute', top: '8px', right: '70px', width: '7px', height: '7px', borderRadius: '50%', background: '#fca5a5', animation: 'confetti3 0.9s ease forwards 0.1s', opacity: 0 }} />

          <div style={{ fontSize: '32px', flexShrink: 0, animation: 'popIn 0.5s ease forwards' }}>🎉</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '16px', fontWeight: 800, marginBottom: '4px', letterSpacing: '-0.2px' }}>Direct Debit confirmed!</div>
            <div style={{ fontSize: '13px', opacity: 0.9, lineHeight: 1.5 }}>Your cleaner has been notified with your address and start date. They'll be in touch soon.</div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '8px', color: 'white', fontSize: '13px', padding: '4px 10px', cursor: 'pointer', flexShrink: 0, fontFamily: "'DM Sans', sans-serif" }}>Dismiss</button>
        </div>
      </div>
    </>
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

  const statusConfig: Record<string, { label: string; dot: string; border: string; headerBg: string; textColor: string }> = {
    active:         { label: 'Live — accepting applications', dot: '#22c55e', border: '#bbf7d0', headerBg: '#f0fdf4', textColor: '#15803d' },
    pending_review: { label: 'Under review',                  dot: '#f59e0b', border: '#fde68a', headerBg: '#fffbeb', textColor: '#92400e' },
    pending:        { label: 'Live — accepting applications', dot: '#22c55e', border: '#bbf7d0', headerBg: '#f0fdf4', textColor: '#15803d' },
    paused:         { label: 'Paused',                        dot: '#eab308', border: '#fef08a', headerBg: '#fefce8', textColor: '#854d0e' },
    deleted:        { label: 'Deleted',                       dot: '#ef4444', border: '#fecaca', headerBg: '#fef2f2', textColor: '#991b1b' },
    completed:      { label: 'Completed',                     dot: '#8b5cf6', border: '#ddd6fe', headerBg: '#f5f3ff', textColor: '#6d28d9' },
    cancelled:      { label: 'Cancelled',                     dot: '#94a3b8', border: '#e2e8f0', headerBg: '#f8fafc', textColor: '#64748b' },
    fulfilled:      { label: 'Cleaner confirmed',             dot: '#16a34a', border: '#bbf7d0', headerBg: '#f0fdf4', textColor: '#15803d' },
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
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '4px' }}>Est. per clean</div>
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
  const statusLabels: Record<string, { label: string; color: string }> = {
    deleted: { label: 'Removed', color: '#94a3b8' }, paused: { label: 'Paused', color: '#eab308' },
    completed: { label: 'Completed', color: '#8b5cf6' }, cancelled: { label: 'Cancelled', color: '#94a3b8' },
    active: { label: 'Active', color: '#22c55e' }, pending_review: { label: 'Review', color: '#f59e0b' },
    pending: { label: 'Live', color: '#22c55e' }, fulfilled: { label: 'Fulfilled', color: '#16a34a' },
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
            <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '12px' }}><div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '4px' }}>Hours/clean</div><div style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a' }}>{hours || '—'}</div></div>
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

// ─── Application Card ─────────────────────────────────────────────────────────

function ApplicationCard({ app, onAccept, onDecline, onOpenChat, accepting, declining }: {
  app: Application; onAccept: () => void; onDecline: () => void
  onOpenChat: () => void; accepting: boolean; declining: boolean
}) {
  const displayName = app.cleaner_name || 'Cleaner'
  const initial = displayName[0]?.toUpperCase() || 'C'
  const memberSince = app.cleaner_member_since || 'recently'
  const appliedLabel = daysSince(app.created_at) === 0 ? 'Applied today' : `Applied ${daysSince(app.created_at)}d ago`

  return (
    <div style={{ background: 'white', borderRadius: '16px', border: '1.5px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
      <div style={{ padding: '20px 20px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: 800, color: 'white', flexShrink: 0 }}>{initial}</div>
            <div>
              <div style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>{displayName}</div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '3px' }}>Member since {memberSince}</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end', flexShrink: 0 }}>
            {['DBS checked', 'Right to work', 'Insured'].map(badge => (
              <span key={badge} style={{ display: 'flex', alignItems: 'center', gap: '3px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '100px', padding: '3px 8px', fontSize: '10px', fontWeight: 700, color: '#15803d', whiteSpace: 'nowrap' }}>✓ {badge}</span>
            ))}
          </div>
        </div>
      </div>
      <div style={{ padding: '0 20px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '100px', background: app.status === 'pending' ? '#f1f5f9' : app.status === 'accepted' ? '#f0fdf4' : '#fef2f2', color: app.status === 'pending' ? '#64748b' : app.status === 'accepted' ? '#15803d' : '#dc2626' }}>
          {app.status === 'pending' ? 'New' : app.status === 'accepted' ? 'Chatting' : 'Declined'}
        </span>
        <span style={{ fontSize: '12px', color: '#94a3b8' }}>{appliedLabel}</span>
      </div>
      <div style={{ padding: '0 20px 16px' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Reviews</div>
        <div style={{ filter: 'blur(4px)', pointerEvents: 'none' }}>
          <div style={{ padding: '10px 12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '6px' }}>
            <span style={{ color: '#f59e0b', fontSize: '12px' }}>★★★★★</span>
            <div style={{ fontSize: '13px', color: '#475569', marginTop: '3px', lineHeight: 1.4 }}>Absolutely brilliant — left the house spotless. Would highly recommend.</div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '3px' }}>— Sarah T.</div>
          </div>
          <div style={{ padding: '10px 12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <span style={{ color: '#f59e0b', fontSize: '12px' }}>★★★★★</span>
            <div style={{ fontSize: '13px', color: '#475569', marginTop: '3px', lineHeight: 1.4 }}>Very professional and thorough. Always on time and easy to communicate with.</div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '3px' }}>— James H.</div>
          </div>
        </div>
        <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '10px', textAlign: 'center', fontStyle: 'italic' }}>🔒 Accept this application to unlock their full reviews</div>
      </div>
      {app.message && (
        <div style={{ padding: '0 20px 16px', borderTop: '1px solid #f1f5f9' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px', marginTop: '16px' }}>{displayName}'s message</div>
          <div style={{ background: '#eff6ff', borderRadius: '12px', padding: '14px 16px', borderLeft: '3px solid #2563eb' }}>
            <p style={{ margin: 0, fontSize: '14px', color: '#1e40af', lineHeight: 1.6 }}>{app.message}</p>
          </div>
        </div>
      )}
      <div style={{ padding: '16px 20px 20px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '12px' }}>
        {app.status === 'pending' && (
          <>
            <button onClick={onAccept} disabled={accepting} style={{ flex: 1, background: '#16a34a', color: 'white', border: 'none', borderRadius: '10px', padding: '14px 0', fontSize: '14px', fontWeight: 700, cursor: accepting ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif", opacity: accepting ? 0.7 : 1 }}>
              {accepting ? 'Opening…' : '✓ Accept & chat'}
            </button>
            <button onClick={onDecline} disabled={declining} style={{ flex: 1, background: 'white', color: '#ef4444', border: '1.5px solid #fecaca', borderRadius: '10px', padding: '14px 0', fontSize: '14px', fontWeight: 700, cursor: declining ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif", opacity: declining ? 0.7 : 1 }}>
              {declining ? 'Declining…' : '✕ Decline'}
            </button>
          </>
        )}
        {app.status === 'accepted' && (
          <button onClick={onOpenChat} style={{ flex: 1, background: '#2563eb', color: 'white', border: 'none', borderRadius: '10px', padding: '14px 0', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
            💬 Open chat
          </button>
        )}
        {app.status === 'rejected' && (
          <div style={{ flex: 1, textAlign: 'center', fontSize: '13px', color: '#94a3b8', padding: '14px 0', fontStyle: 'italic' }}>Application declined</div>
        )}
      </div>
    </div>
  )
}

// ─── Applications Section ─────────────────────────────────────────────────────

function ApplicationsSection({ requestIds, requests, onAccept, onOpenChat }: {
  requestIds: string[]
  requests: CleaningRequest[]
  onAccept: (applicationId: string, requestId: string, cleanerName: string, frequency: Frequency) => void
  onOpenChat: (applicationId: string, requestId: string) => void
}) {
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState<string | null>(null)
  const [declining, setDeclining] = useState<string | null>(null)

  useEffect(() => {
    if (!requestIds.length) { setLoading(false); return }
    const fetchApplications = async () => {
      const supabase = createClient()
      const { data: appData, error } = await (supabase as any)
        .from('applications').select('*').in('request_id', requestIds).order('created_at', { ascending: false })
      if (error || !appData) { setLoading(false); return }
      const enriched: Application[] = await Promise.all(
        appData.map(async (app: any) => {
          const { data: cleaner } = await (supabase as any)
            .from('cleaners').select('profile_id, created_at, profiles(full_name)').eq('id', app.cleaner_id).single()
          const fullName = cleaner?.profiles?.full_name ?? ''
          const memberSince = cleaner?.created_at ? new Date(cleaner.created_at).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : 'Recently'
          return { ...app, cleaner_name: fullName ? formatFirstLastInitial(fullName) : 'Cleaner', cleaner_initial: fullName ? fullName[0]?.toUpperCase() : 'C', cleaner_member_since: memberSince }
        })
      )
      setApplications(enriched)
      setLoading(false)
    }
    fetchApplications()
  }, [requestIds.join(',')])

  const handleAccept = async (app: Application) => {
    setAccepting(app.id)
    const req = requests.find(r => r.id === app.request_id)
    const frequency = req?.frequency ?? 'monthly'
    await onAccept(app.id, app.request_id, app.cleaner_name ?? 'Cleaner', frequency)
    setAccepting(null)
  }

  const handleDecline = async (app: Application) => {
    setDeclining(app.id)
    try {
      await fetch('/api/decline-application', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ applicationId: app.id }) })
      setApplications(prev => prev.map(a => a.id === app.id ? { ...a, status: 'rejected' } : a))
    } catch (err) { console.error('Decline error:', err) } finally { setDeclining(null) }
  }

  return (
    <div style={{ marginBottom: '36px' }}>
      <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '14px' }}>
        Applications {applications.length > 0 ? `(${applications.length})` : ''}
      </div>
      {loading ? (
        <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '24px', textAlign: 'center' }}>
          <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>Loading applications…</p>
        </div>
      ) : applications.length === 0 ? (
        <div style={{ background: 'white', borderRadius: '14px', border: '1.5px dashed #e2e8f0', padding: '32px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: '28px', marginBottom: '10px' }}>👀</div>
          <p style={{ fontSize: '14px', fontWeight: 600, color: '#475569', margin: '0 0 4px' }}>No applications yet</p>
          <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>Once cleaners apply to your listing, you'll see them here.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {applications.map(app => (
            <ApplicationCard key={app.id} app={app}
              onAccept={() => handleAccept(app)} onDecline={() => handleDecline(app)}
              onOpenChat={() => onOpenChat(app.id, app.request_id)}
              accepting={accepting === app.id} declining={declining === app.id}
            />
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
  const [showSuccessBanner, setShowSuccessBanner] = useState(false)

  const [startDateModal, setStartDateModal] = useState<{
    applicationId: string; requestId: string; conversationId: string; cleanerName: string; frequency: Frequency
  } | null>(null)
  const [startDateLoading, setStartDateLoading] = useState(false)
  const systemMessageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const timerFiredRef = useRef(false)

  useEffect(() => {
    const init = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.replace('/login'); return }

        const { data: profileData, error: profileError } = await (supabase as any)
          .from('profiles').select('full_name, email, role').eq('id', user.id).single()
        if (profileError || !profileData) throw new Error('Could not load your profile.')
        if (profileData.role !== 'customer' && profileData.role !== 'admin') { router.replace('/cleaner/dashboard'); return }

        const { data: customerRecord } = await (supabase as any)
          .from('customers').select('id').eq('profile_id', user.id).single()
        const customerId = customerRecord?.id ?? null

        const { data: requestData, error: requestError } = customerId
          ? await (supabase as any).from('clean_requests').select('*').eq('customer_id', customerId).order('created_at', { ascending: false })
          : { data: [], error: null }
        if (requestError) throw new Error(requestError.message)

        setProfile(profileData)
        setRequests(requestData ?? [])

        // Check for GoCardless success redirect
        if (searchParams.get('gc_success') === '1') {
          setShowSuccessBanner(true)
        }

        const acceptAppId = searchParams.get('accept')
        const acceptReqId = searchParams.get('request')
        if (acceptAppId && acceptReqId) {
          handleAcceptApplication(acceptAppId, acceptReqId)
          router.replace('/customer/dashboard')
        }

        // Open chat if redirected from GC confirm
        const chatId = searchParams.get('chat')
        if (chatId) {
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('vouchee:open-chat', { detail: { conversationId: chatId } }))
          }, 800)
        }
      } catch (err: any) {
        setError(err?.message ?? 'Something went wrong.')
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [router])

  const handleAcceptApplication = async (applicationId: string, requestId: string) => {
    try {
      const res = await fetch('/api/accept-application', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ applicationId, requestId }) })
      const data = await res.json()
      if (!res.ok || !data.conversationId) { showToast('Could not open chat — please try again'); return }
      window.dispatchEvent(new CustomEvent('vouchee:open-chat', { detail: { conversationId: data.conversationId } }))
    } catch (err) { showToast('Something went wrong — please try again') }
  }

  const handleOpenStartDateModal = (detail: { applicationId: string; requestId: string; conversationId: string; cleanerName: string; frequency: Frequency }) => {
    setStartDateModal(detail)
    timerFiredRef.current = false
    if (systemMessageTimerRef.current) clearTimeout(systemMessageTimerRef.current)
    systemMessageTimerRef.current = setTimeout(async () => {
      timerFiredRef.current = true
      systemMessageTimerRef.current = null
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        await (supabase as any).from('messages').insert({ conversation_id: detail.conversationId, sender_id: user.id, sender_role: 'customer', content: '🗓️ __system__ Customer is selecting a start date…' })
      } catch (e) {}
    }, 60000)
  }

  const handleCancelStartDate = async () => {
    if (systemMessageTimerRef.current) { clearTimeout(systemMessageTimerRef.current); systemMessageTimerRef.current = null }
    const modal = startDateModal
    setStartDateModal(null)
    if (timerFiredRef.current && modal) {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        await (supabase as any).from('messages').insert({ conversation_id: modal.conversationId, sender_id: user.id, sender_role: 'customer', content: '__system__ Customer did not complete set-up.' })
      } catch (e) {}
    }
    timerFiredRef.current = false
  }

  const handleConfirmStartDate = async (startDate: string) => {
    if (!startDateModal) return
    if (systemMessageTimerRef.current) { clearTimeout(systemMessageTimerRef.current); systemMessageTimerRef.current = null }
    timerFiredRef.current = false
    setStartDateLoading(true)
    try {
      const res = await fetch('/api/gocardless/create-flow', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ applicationId: startDateModal.applicationId, requestId: startDateModal.requestId, conversationId: startDateModal.conversationId, startDate }) })
      const data = await res.json()
      if (!res.ok || !data.authorisationUrl) { showToast('Could not set up Direct Debit — please try again'); setStartDateLoading(false); return }
      window.location.href = data.authorisationUrl
    } catch (err) { showToast('Something went wrong — please try again'); setStartDateLoading(false) }
  }

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail?.applicationId && detail?.requestId && detail?.conversationId) handleOpenStartDateModal(detail)
    }
    window.addEventListener('vouchee:approve-cleaner', handler)
    return () => window.removeEventListener('vouchee:approve-cleaner', handler)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleOpenChat = async (applicationId: string, requestId: string) => {
    try {
      const supabase = createClient()
      const { data: app } = await (supabase as any).from('applications').select('cleaner_id').eq('id', applicationId).single()
      if (!app) { showToast('Could not find application'); return }
      const { data: conv } = await (supabase as any).from('conversations').select('id').eq('cleaner_id', app.cleaner_id).eq('clean_request_id', requestId).single()
      if (conv) window.dispatchEvent(new CustomEvent('vouchee:open-chat', { detail: { conversationId: conv.id } }))
      else await handleAcceptApplication(applicationId, requestId)
    } catch (err) { showToast('Could not open chat — please try again') }
  }

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3500) }

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
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
    } catch (err: any) { showToast('Failed to save — please try again') } finally { setSaving(false) }
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
  const fulfilledRequests = requests.filter(r => r.status === 'fulfilled')
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

            {activeRequests.length > 0 && (
              <div style={{ marginBottom: '36px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '14px' }}>Your listing</div>
                {activeRequests.map(req => (
                  <ActiveRequestCard key={req.id} request={req} onPause={() => setModal({ type: 'pause', id: req.id })} onRepublish={() => setModal({ type: 'republish', id: req.id })} onDelete={() => setModal({ type: 'delete', id: req.id })} onEdit={() => setEditingRequest(req)} />
                ))}
              </div>
            )}

            {!hasActive && pausedRequests.length > 0 && (
              <div style={{ marginBottom: '36px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '14px' }}>Paused listing</div>
                {pausedRequests.map(req => (
                  <ActiveRequestCard key={req.id} request={req} onPause={() => setModal({ type: 'pause', id: req.id })} onRepublish={() => setModal({ type: 'republish', id: req.id })} onDelete={() => setModal({ type: 'delete', id: req.id })} onEdit={() => setEditingRequest(req)} />
                ))}
              </div>
            )}

            {activeRequestIds.length > 0 && (
              <ApplicationsSection requestIds={activeRequestIds} requests={activeRequests} onAccept={handleAcceptApplication} onOpenChat={handleOpenChat} />
            )}

            {fulfilledRequests.length > 0 && (
              <div style={{ marginBottom: '36px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '14px' }}>Confirmed cleaners</div>
                {fulfilledRequests.map(req => (
                  <ActiveRequestCard key={req.id} request={req} onPause={() => {}} onRepublish={() => {}} onDelete={() => setModal({ type: 'delete', id: req.id })} onEdit={() => setEditingRequest(req)} />
                ))}
              </div>
            )}

            {pastRequests.filter(r => r.status !== 'paused' && r.status !== 'fulfilled').length > 0 && (
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '14px' }}>Past listings</div>
                {pastRequests.filter(r => r.status !== 'paused' && r.status !== 'fulfilled').map(req => <PastListingRow key={req.id} request={req} />)}
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
          <button onClick={() => setModal({ type: 'signout', id: '' })} style={{ background: 'none', border: '1px solid #fecaca', borderRadius: '8px', padding: '8px 20px', fontSize: '13px', fontWeight: 600, color: '#ef4444', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Sign out</button>
        </div>

        <Footer />

        {modal?.type === 'signout' && <ConfirmModal message="Are you sure you want to sign out?" onConfirm={handleSignOut} onCancel={() => setModal(null)} />}
        {modal?.type === 'pause' && <ConfirmModal message="Pause your request? It won't be visible to cleaners until you republish." onConfirm={() => handlePause(modal.id)} onCancel={() => setModal(null)} />}
        {modal?.type === 'republish' && <ConfirmModal message="Republish your request? It will be visible to cleaners again." onConfirm={() => handleRepublish(modal.id)} onCancel={() => setModal(null)} />}
        {modal?.type === 'delete' && <ConfirmModal message="Permanently remove this request? This cannot be undone." onConfirm={() => handleDelete(modal.id)} onCancel={() => setModal(null)} />}
        {editingRequest && <EditModal request={editingRequest} onSave={handleSaveEdit} onClose={() => setEditingRequest(null)} saving={saving} />}
        {toast && <ComingSoonBanner message={toast} onClose={() => setToast(null)} />}
        {showSuccessBanner && <SuccessBanner onClose={() => setShowSuccessBanner(false)} />}

        {startDateModal && (
          <StartDateModal
            cleanerName={startDateModal.cleanerName} frequency={startDateModal.frequency}
            applicationId={startDateModal.applicationId} requestId={startDateModal.requestId}
            conversationId={startDateModal.conversationId}
            onCancel={handleCancelStartDate} onConfirm={handleConfirmStartDate} loading={startDateLoading}
          />
        )}
      </div>
    </>
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
            {ALL_DAYS.map(day => { const selected = draft.preferred_days.includes(day); return <button key={day} onClick={() => toggleDay(day)} style={{ padding: '7px 14px', borderRadius: '100px', fontSize: '13px', fontWeight: 600, border: selected ? '2px solid #3b82f6' : '1.5px solid #e2e8f0', background: selected ? '#eff6ff' : 'white', color: selected ? '#1d4ed8' : '#64748b', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>{DAY_SHORT[day]}</button> })}
          </div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>Time of day</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '24px' }}>
            {TIME_SLOTS.map(slot => { const selected = draft.time_of_day === slot; return <button key={slot} onClick={() => setDraft(d => ({ ...d, time_of_day: slot }))} style={{ padding: '7px 14px', borderRadius: '100px', fontSize: '13px', fontWeight: 600, border: selected ? '2px solid #3b82f6' : '1.5px solid #e2e8f0', background: selected ? '#eff6ff' : 'white', color: selected ? '#1d4ed8' : '#64748b', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>{slot}</button> })}
          </div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>Tasks requested</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '32px' }}>
            {ALL_TASKS.map(task => { const selected = draft.tasks.includes(task); return <button key={task} onClick={() => toggleTask(task)} style={{ padding: '7px 14px', borderRadius: '100px', fontSize: '13px', fontWeight: 600, border: selected ? '2px solid #22c55e' : '1.5px solid #e2e8f0', background: selected ? '#f0fdf4' : 'white', color: selected ? '#15803d' : '#64748b', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>{TASK_LABELS[task] ?? task}</button> })}
          </div>
          <button onClick={() => onSave(request.id, draft)} disabled={saving} style={{ width: '100%', padding: '14px', background: saving ? '#94a3b8' : '#0f172a', color: 'white', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
            {saving ? 'Saving…' : 'Save & update listing →'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function CustomerDashboard() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif" }}><p style={{ fontSize: '14px', color: '#64748b' }}>Loading…</p></div>}>
      <CustomerDashboardContent />
    </Suspense>
  )
}
