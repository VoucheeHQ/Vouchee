'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// ─── Types ────────────────────────────────────────────────────────────────────

type RequestStatus = 'active' | 'paused' | 'deleted' | 'pending_review'
type Frequency = 'weekly' | 'fortnightly' | 'monthly'

interface CustomerProfile {
  full_name: string
  email: string
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
  weekly: 'Weekly',
  fortnightly: 'Fortnightly',
  monthly: 'Monthly',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitial(name: string) {
  return name?.trim()?.charAt(0)?.toUpperCase() ?? '?'
}

function getFirstName(name: string) {
  return name?.trim()?.split(' ')?.[0] ?? 'there'
}

function formatDays(days: string[] | null) {
  if (!days || days.length === 0) return null
  const short: Record<string, string> = {
    monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed',
    thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun',
  }
  return days.map(d => short[d.toLowerCase()] ?? d).join(' · ')
}

// ─── Chip ─────────────────────────────────────────────────────────────────────

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      background: '#f1f5f9', borderRadius: '100px',
      padding: '4px 12px', fontSize: '12px',
      fontWeight: 600, color: '#475569',
    }}>
      {children}
    </span>
  )
}

// ─── Action Button ────────────────────────────────────────────────────────────

function ActionBtn({ children, onClick, danger, primary }: {
  children: React.ReactNode
  onClick: () => void
  danger?: boolean
  primary?: boolean
}) {
  return (
    <button onClick={onClick} style={{
      background: primary ? '#3b82f6' : 'none',
      border: `1px solid ${danger ? '#fecaca' : primary ? '#3b82f6' : '#e2e8f0'}`,
      borderRadius: '8px', padding: '6px 14px',
      fontSize: '13px', fontWeight: 600,
      color: danger ? '#ef4444' : primary ? 'white' : '#64748b',
      cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
    }}>
      {children}
    </button>
  )
}

// ─── No Requests Screen ───────────────────────────────────────────────────────

function NoRequestsScreen({ firstName, onPost }: { firstName: string; onPost: () => void }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 24px' }}>
      <div style={{ fontSize: '48px', marginBottom: '20px' }}>🧹</div>
      <h2 style={{
        fontFamily: "'Lora', serif", fontSize: '24px', fontWeight: 700,
        color: '#0f172a', margin: '0 0 12px',
      }}>
        Hi {firstName}, ready to find your cleaner?
      </h2>
      <p style={{ fontSize: '15px', color: '#64748b', lineHeight: 1.7, margin: '0 0 32px', maxWidth: '420px', marginLeft: 'auto', marginRight: 'auto' }}>
        Post your cleaning request and get matched with vetted, local cleaners in Horsham. No contracts, flexible scheduling.
      </p>
      <button onClick={onPost} style={{
        background: '#3b82f6', color: 'white', border: 'none',
        borderRadius: '12px', padding: '14px 32px',
        fontSize: '15px', fontWeight: 700, cursor: 'pointer',
        fontFamily: "'DM Sans', sans-serif",
      }}>
        Post a cleaning request
      </button>
      <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'center', gap: '24px', flexWrap: 'wrap' }}>
        {['DBS checked cleaners', 'Insured & vetted', 'No contracts'].map(t => (
          <span key={t} style={{ fontSize: '13px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ color: '#22c55e', fontWeight: 700 }}>✓</span> {t}
          </span>
        ))}
      </div>
    </div>
  )
}

// ─── Request Card ─────────────────────────────────────────────────────────────

function RequestCard({
  request, onPause, onRepublish, onDelete, onEdit,
}: {
  request: CleaningRequest
  onPause: () => void
  onRepublish: () => void
  onDelete: () => void
  onEdit: () => void
}) {
  const hours = request.hours_per_session ?? 0
  const rate = request.hourly_rate ?? 0
  const freq = request.frequency ?? 'fortnightly'
  const estPerSession = hours && rate ? `~£${(hours * rate).toFixed(2)}` : null
  const pausesLeft = 2 - (request.republish_count ?? 0)
  const isRelocked = request.paused_at
    ? Date.now() - new Date(request.paused_at).getTime() < 24 * 60 * 60 * 1000
    : false

  const locationLabel = request.zone ? (ZONE_LABELS[request.zone] ?? request.zone) : 'Horsham'
  const daysLabel = formatDays(request.preferred_days)
  const visibleTasks = (request.tasks ?? []).slice(0, 6)
  const extraTasks = (request.tasks ?? []).length - 6

  const statusConfig = {
    active:         { label: 'Live — accepting applications', dot: '#22c55e', border: '#bbf7d0', headerBg: '#f0fdf4', textColor: '#15803d' },
    pending_review: { label: 'Under review',                  dot: '#3b82f6', border: '#bfdbfe', headerBg: '#eff6ff', textColor: '#1d4ed8' },
    paused:         { label: 'Paused',                        dot: '#eab308', border: '#fef08a', headerBg: '#fefce8', textColor: '#854d0e' },
    deleted:        { label: 'Deleted',                       dot: '#ef4444', border: '#fecaca', headerBg: '#fef2f2', textColor: '#991b1b' },
  }
  const sc = statusConfig[request.status] ?? statusConfig.active

  return (
    <div style={{
      background: 'white', borderRadius: '16px',
      border: `1.5px solid ${sc.border}`,
      boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      marginBottom: '20px', overflow: 'hidden',
    }}>
      {/* Status header */}
      <div style={{
        background: sc.headerBg, padding: '12px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: sc.dot, display: 'inline-block' }} />
          <span style={{ fontSize: '13px', fontWeight: 700, color: sc.textColor }}>{sc.label}</span>
        </div>
        <button onClick={onEdit} style={{
          display: 'flex', alignItems: 'center', gap: '5px',
          background: 'white', border: '1px solid #e2e8f0',
          borderRadius: '8px', padding: '5px 12px',
          fontSize: '12px', fontWeight: 600, color: '#475569',
          cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
        }}>
          ⚙️ Edit listing
        </button>
      </div>

      {/* Body */}
      <div style={{ padding: '20px' }}>
        {/* Location */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '14px' }}>
          <span style={{ fontSize: '16px' }}>📍</span>
          <span style={{ fontFamily: "'Lora', serif", fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>
            {locationLabel}
          </span>
        </div>

        {/* Info chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
          {request.bedrooms ? <Chip>{request.bedrooms} bed</Chip> : null}
          {request.bathrooms ? <Chip>{request.bathrooms} bath</Chip> : null}
          {hours > 0 ? <Chip>{hours} hrs</Chip> : null}
          {freq ? <Chip>{FREQUENCY_LABEL[freq] ?? freq}</Chip> : null}
          {daysLabel ? <Chip>{daysLabel}</Chip> : null}
          {request.time_of_day ? <Chip>{request.time_of_day}</Chip> : null}
        </div>

        {/* Tasks */}
        {visibleTasks.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
              Tasks
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {visibleTasks.map(task => (
                <span key={task} style={{
                  background: '#f0fdf4', border: '1px solid #bbf7d0',
                  color: '#15803d', fontSize: '12px', fontWeight: 600,
                  padding: '4px 10px', borderRadius: '100px',
                }}>
                  {TASK_LABELS[task] ?? task}
                </span>
              ))}
              {extraTasks > 0 && (
                <span style={{
                  background: '#f1f5f9', color: '#64748b',
                  fontSize: '12px', fontWeight: 600,
                  padding: '4px 10px', borderRadius: '100px',
                }}>
                  +{extraTasks} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Rate */}
        {rate > 0 && (
          <div style={{
            background: '#fefce8', border: '1px solid #fef08a',
            borderRadius: '12px', padding: '14px 16px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
            marginBottom: '16px',
          }}>
            <div>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '4px' }}>
                Offered rate
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#78350f', lineHeight: 1 }}>
                £{rate.toFixed(2)}<span style={{ fontSize: '14px', fontWeight: 500 }}>/hr</span>
              </div>
            </div>
            {estPerSession && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '4px' }}>
                  Est. per session
                </div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#92400e' }}>{estPerSession}</div>
              </div>
            )}
          </div>
        )}

        {/* Pending notice */}
        {request.status === 'pending_review' && (
          <div style={{ padding: '10px 14px', background: '#eff6ff', borderRadius: '10px', border: '1px solid #bfdbfe', marginBottom: '16px' }}>
            <p style={{ margin: 0, fontSize: '13px', color: '#1d4ed8', lineHeight: 1.5 }}>
              ⏳ Your request is under review. We'll notify you once it's live and visible to cleaners.
            </p>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {request.status === 'active' && (
            <>
              {pausesLeft > 0 && <ActionBtn onClick={onPause}>Pause listing</ActionBtn>}
              <ActionBtn onClick={onDelete} danger>Remove listing</ActionBtn>
            </>
          )}
          {request.status === 'paused' && (
            <>
              {!isRelocked
                ? <ActionBtn onClick={onRepublish} primary>Republish</ActionBtn>
                : <span style={{ fontSize: '12px', color: '#94a3b8', alignSelf: 'center' }}>Available to republish in 24h</span>
              }
              <ActionBtn onClick={onDelete} danger>Remove listing</ActionBtn>
            </>
          )}
          {request.status === 'pending_review' && (
            <ActionBtn onClick={onDelete} danger>Remove listing</ActionBtn>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Confirm Modal ────────────────────────────────────────────────────────────

function ConfirmModal({ message, onConfirm, onCancel }: {
  message: string; onConfirm: () => void; onCancel: () => void
}) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 200, padding: '24px',
    }}>
      <div style={{
        background: 'white', borderRadius: '20px', padding: '32px',
        maxWidth: '400px', width: '100%', textAlign: 'center',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }}>
        <p style={{ fontSize: '15px', color: '#0f172a', margin: '0 0 24px', lineHeight: 1.6 }}>{message}</p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button onClick={onCancel} style={{
            background: 'none', border: '1px solid #e2e8f0', borderRadius: '8px',
            padding: '8px 20px', fontSize: '14px', fontWeight: 600, color: '#64748b',
            cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
          }}>Cancel</button>
          <button onClick={onConfirm} style={{
            background: '#ef4444', color: 'white', border: 'none', borderRadius: '8px',
            padding: '8px 20px', fontSize: '14px', fontWeight: 700,
            cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
          }}>Confirm</button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CustomerDashboard() {
  const router = useRouter()
  const [profile, setProfile] = useState<CustomerProfile | null>(null)
  const [requests, setRequests] = useState<CleaningRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modal, setModal] = useState<{ type: 'pause' | 'delete' | 'republish'; id: string } | null>(null)

  useEffect(() => {
    const init = async () => {
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user) { router.replace('/login'); return }

        const userId = session.user.id

        const { data: profileData, error: profileError } = await (supabase as any)
          .from('profiles').select('full_name, email, role').eq('id', userId).single()

        if (profileError || !profileData) throw new Error('Could not load your profile.')
        if (profileData.role !== 'customer') { router.replace('/cleaner/dashboard'); return }

        const { data: requestData, error: requestError } = await (supabase as any)
          .from('clean_requests').select('*')
          .eq('customer_id', userId)
          .neq('status', 'deleted')
          .order('created_at', { ascending: false })

        if (requestError) throw new Error(requestError.message)

        setProfile(profileData)
        setRequests(requestData ?? [])
      } catch (err: any) {
        setError(err?.message ?? 'Something went wrong.')
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [router])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  const handlePause = async (id: string) => {
    const supabase = createClient()
    await (supabase as any).from('clean_requests')
      .update({ status: 'paused', paused_at: new Date().toISOString() }).eq('id', id)
    setRequests(r => r.map(req => req.id === id
      ? { ...req, status: 'paused' as RequestStatus, paused_at: new Date().toISOString() } : req))
    setModal(null)
  }

  const handleRepublish = async (id: string) => {
    const req = requests.find(r => r.id === id)
    if (!req) return
    const supabase = createClient()
    await (supabase as any).from('clean_requests')
      .update({ status: 'active', paused_at: new Date().toISOString(), republish_count: req.republish_count + 1 }).eq('id', id)
    setRequests(r => r.map(req => req.id === id
      ? { ...req, status: 'active' as RequestStatus, republish_count: req.republish_count + 1 } : req))
    setModal(null)
  }

  const handleDelete = async (id: string) => {
    const supabase = createClient()
    await (supabase as any).from('clean_requests').update({ status: 'deleted' }).eq('id', id)
    setRequests(r => r.filter(req => req.id !== id))
    setModal(null)
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>🧹</div>
          <p style={{ fontSize: '14px', color: '#64748b' }}>Loading your dashboard…</p>
        </div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif", padding: '24px' }}>
        <div style={{ background: 'white', borderRadius: '20px', padding: '40px', maxWidth: '400px', textAlign: 'center', border: '1.5px solid #fecaca' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>⚠️</div>
          <p style={{ fontSize: '14px', color: '#dc2626', margin: '0 0 16px' }}>{error ?? 'Could not load your dashboard.'}</p>
          <button onClick={() => router.push('/login')} style={{ background: '#0f172a', color: 'white', border: 'none', borderRadius: '10px', padding: '10px 24px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
            Back to login
          </button>
        </div>
      </div>
    )
  }

  const firstName = getFirstName(profile.full_name)
  const liveCount = requests.filter(r => r.status === 'active').length
  const hasRequests = requests.length > 0

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:wght@400;600;700&family=DM+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
      `}</style>

      <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'DM Sans', sans-serif" }}>

        {/* Nav */}
        <div style={{
          background: 'white', borderBottom: '1px solid #f1f5f9',
          padding: '0 24px', height: '56px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'sticky', top: 0, zIndex: 50,
        }}>
          <a href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '30px', height: '30px', borderRadius: '7px', background: 'linear-gradient(135deg, #3b82f6, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '15px', fontWeight: 800, color: 'white', fontFamily: "'Lora', serif" }}>V</span>
            </div>
            <span style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', fontFamily: "'Lora', serif" }}>Vouchee</span>
          </a>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <a href="/jobs" style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', textDecoration: 'none' }}>View jobs board</a>
            <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 800, color: 'white' }}>
              {getInitial(profile.full_name)}
            </div>
            <button onClick={handleSignOut} style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '5px 12px', fontSize: '13px', fontWeight: 600, color: '#64748b', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
              Sign out
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ maxWidth: '680px', margin: '0 auto', padding: '40px 24px 80px' }}>

          {/* Header */}
          <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1 style={{ fontFamily: "'Lora', serif", fontSize: '30px', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
                Hey {firstName}! 👋
              </h1>
              <p style={{ fontSize: '15px', color: '#64748b' }}>
                {hasRequests
                  ? liveCount > 0 ? 'Your request is live — cleaners can apply.' : `You have ${requests.length} listing${requests.length > 1 ? 's' : ''}.`
                  : 'Post your first cleaning request to get started.'}
              </p>
            </div>
            {hasRequests && (
              <button onClick={() => router.push('/request/property')} style={{
                background: '#3b82f6', color: 'white', border: 'none',
                borderRadius: '10px', padding: '10px 18px',
                fontSize: '14px', fontWeight: 700, cursor: 'pointer',
                fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap', flexShrink: 0,
              }}>
                + New request
              </button>
            )}
          </div>

          {!hasRequests ? (
            <NoRequestsScreen firstName={firstName} onPost={() => router.push('/request/property')} />
          ) : (
            <>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '16px' }}>
                Your listings
              </div>
              {requests.map(req => (
                <RequestCard
                  key={req.id}
                  request={req}
                  onPause={() => setModal({ type: 'pause', id: req.id })}
                  onRepublish={() => setModal({ type: 'republish', id: req.id })}
                  onDelete={() => setModal({ type: 'delete', id: req.id })}
                  onEdit={() => router.push(`/request/property?edit=${req.id}`)}
                />
              ))}
            </>
          )}
        </div>

        {/* Modals */}
        {modal?.type === 'pause' && (
          <ConfirmModal
            message="Pause your request? It won't be visible to cleaners until you republish. You have 2 pauses total."
            onConfirm={() => handlePause(modal.id)}
            onCancel={() => setModal(null)}
          />
        )}
        {modal?.type === 'republish' && (
          <ConfirmModal
            message="Republish your request? It will be visible to cleaners again."
            onConfirm={() => handleRepublish(modal.id)}
            onCancel={() => setModal(null)}
          />
        )}
        {modal?.type === 'delete' && (
          <ConfirmModal
            message="Permanently delete this request? This cannot be undone."
            onConfirm={() => handleDelete(modal.id)}
            onCancel={() => setModal(null)}
          />
        )}
      </div>
    </>
  )
}
