'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// ─── Types ────────────────────────────────────────────────────────────────────

type RequestStatus = 'active' | 'paused' | 'deleted'
type Frequency = 'weekly' | 'fortnightly' | 'monthly'

interface CustomerProfile {
  full_name: string
  email: string
}

interface CleaningRequest {
  id: string
  bedrooms: number
  bathrooms: number
  hours: number
  hourly_rate: number
  frequency: Frequency
  tasks: string[]
  status: RequestStatus
  created_at: string
  goes_live_at: string | null
  paused_at: string | null
  republish_count: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const FREQUENCY_LABEL: Record<Frequency, string> = {
  weekly: 'Weekly',
  fortnightly: 'Fortnightly',
  monthly: 'Monthly',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

function getInitial(name: string) {
  return name.trim().charAt(0).toUpperCase()
}

function getWeeklyTotal(hours: number, rate: number, frequency: Frequency) {
  const multiplier = frequency === 'weekly' ? 1 : frequency === 'fortnightly' ? 0.5 : 0.25
  return (hours * rate * multiplier).toFixed(2)
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: RequestStatus }) {
  const map = {
    active:  { label: 'Active',  bg: '#dcfce7', color: '#15803d', dot: '#22c55e' },
    paused:  { label: 'Paused',  bg: '#fef9c3', color: '#854d0e', dot: '#eab308' },
    deleted: { label: 'Deleted', bg: '#fee2e2', color: '#991b1b', dot: '#ef4444' },
  }
  const s = map[status] ?? map.active
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '6px',
      background: s.bg, color: s.color,
      borderRadius: '100px', padding: '5px 12px',
      fontSize: '12px', fontWeight: 700,
    }}>
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: s.dot }} />
      {s.label}
    </span>
  )
}

// ─── No Requests Screen ───────────────────────────────────────────────────────

function NoRequestsScreen({ profile, onPost }: { profile: CustomerProfile; onPost: () => void }) {
  const firstName = profile.full_name.trim().split(' ')[0]
  return (
    <div style={{ maxWidth: '560px', margin: '0 auto', padding: '0 0 60px', textAlign: 'center' }}>
      <div style={{
        background: 'white', borderRadius: '20px', padding: '48px 40px',
        border: '1.5px solid #e2e8f0', boxShadow: '0 2px 16px rgba(0,0,0,0.05)',
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🧹</div>
        <h2 style={{ fontFamily: 'Lora, serif', fontSize: '22px', fontWeight: 700, color: '#0f172a', margin: '0 0 12px' }}>
          Hi {firstName}, ready to find your cleaner?
        </h2>
        <p style={{ fontSize: '15px', color: '#64748b', lineHeight: 1.7, margin: '0 0 32px' }}>
          Post your cleaning request and get matched with vetted, local cleaners in Horsham. No contracts, flexible scheduling.
        </p>
        <button
          onClick={onPost}
          style={{
            background: '#3b82f6', color: 'white', border: 'none',
            borderRadius: '12px', padding: '14px 32px',
            fontSize: '15px', fontWeight: 700, cursor: 'pointer',
            fontFamily: 'DM Sans, sans-serif',
          }}
        >
          Post a cleaning request
        </button>
        <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'center', gap: '24px' }}>
          {['DBS checked cleaners', 'Insured & vetted', 'No contracts'].map(t => (
            <span key={t} style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ color: '#22c55e' }}>✓</span> {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Request Card ─────────────────────────────────────────────────────────────

function RequestCard({
  request,
  onPause,
  onRepublish,
  onDelete,
  onEdit,
}: {
  request: CleaningRequest
  onPause: () => void
  onRepublish: () => void
  onDelete: () => void
  onEdit: () => void
}) {
  const weeklyTotal = getWeeklyTotal(request.hours, request.hourly_rate, request.frequency)
  const pausesLeft = 2 - request.republish_count
  const isRelocked = request.paused_at
    ? Date.now() - new Date(request.paused_at).getTime() < 24 * 60 * 60 * 1000
    : false

  return (
    <div style={{
      background: 'white', borderRadius: '20px',
      border: '1.5px solid #e2e8f0',
      boxShadow: '0 2px 16px rgba(0,0,0,0.05)',
      marginBottom: '20px', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '20px 24px',
        borderBottom: '1px solid #f1f5f9',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
            {request.bedrooms} bed · {request.bathrooms} bath · {request.hours}h
          </div>
          <div style={{ fontSize: '13px', color: '#64748b' }}>
            {FREQUENCY_LABEL[request.frequency]} · £{request.hourly_rate}/hr · ~£{weeklyTotal}/week
          </div>
        </div>
        <StatusBadge status={request.status} />
      </div>

      {/* Tasks */}
      <div style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9' }}>
        <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
          Tasks
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {(request.tasks ?? []).map(task => (
            <span key={task} style={{
              background: '#f8fafc', border: '1px solid #e2e8f0',
              borderRadius: '8px', padding: '4px 10px',
              fontSize: '12px', color: '#475569', fontWeight: 500,
            }}>
              {task}
            </span>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{
        padding: '14px 24px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: '#fafafa',
      }}>
        <span style={{ fontSize: '12px', color: '#94a3b8' }}>
          Posted {formatDate(request.created_at)}
        </span>
        <div style={{ display: 'flex', gap: '8px' }}>
          {request.status === 'active' && (
            <>
              <button onClick={onEdit} style={ghostBtn}>Edit</button>
              {pausesLeft > 0 && (
                <button onClick={onPause} style={ghostBtn}>Pause</button>
              )}
              <button onClick={onDelete} style={{ ...ghostBtn, color: '#ef4444', borderColor: '#fecaca' }}>Delete</button>
            </>
          )}
          {request.status === 'paused' && (
            <>
              {!isRelocked && (
                <button onClick={onRepublish} style={{ ...ghostBtn, background: '#3b82f6', color: 'white', borderColor: '#3b82f6' }}>
                  Republish
                </button>
              )}
              {isRelocked && (
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>Available to republish in 24h</span>
              )}
              <button onClick={onDelete} style={{ ...ghostBtn, color: '#ef4444', borderColor: '#fecaca' }}>Delete</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

const ghostBtn: React.CSSProperties = {
  background: 'none', border: '1px solid #e2e8f0',
  borderRadius: '8px', padding: '6px 14px',
  fontSize: '13px', fontWeight: 600, color: '#64748b',
  cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
}

// ─── Confirm Modal ────────────────────────────────────────────────────────────

function ConfirmModal({ message, onConfirm, onCancel }: {
  message: string
  onConfirm: () => void
  onCancel: () => void
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
      }}>
        <p style={{ fontSize: '15px', color: '#0f172a', margin: '0 0 24px', lineHeight: 1.6 }}>{message}</p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button onClick={onCancel} style={ghostBtn}>Cancel</button>
          <button onClick={onConfirm} style={{
            background: '#ef4444', color: 'white', border: 'none',
            borderRadius: '8px', padding: '8px 20px',
            fontSize: '14px', fontWeight: 700, cursor: 'pointer',
            fontFamily: 'DM Sans, sans-serif',
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
          .from('profiles')
          .select('full_name, email, role')
          .eq('id', userId)
          .single()

        if (profileError || !profileData) throw new Error('Could not load your profile.')
        if (profileData.role !== 'customer') { router.replace('/cleaner/dashboard'); return }

        const { data: requestData } = await (supabase as any)
          .from('requests')
          .select('*')
          .eq('user_id', userId)
          .neq('status', 'deleted')
          .order('created_at', { ascending: false })

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
    await (supabase as any).from('requests').update({ status: 'paused', paused_at: new Date().toISOString() }).eq('id', id)
    setRequests(r => r.map(req => req.id === id ? { ...req, status: 'paused', paused_at: new Date().toISOString() } : req))
    setModal(null)
  }

  const handleRepublish = async (id: string) => {
    const req = requests.find(r => r.id === id)
    if (!req) return
    const supabase = createClient()
    await (supabase as any).from('requests').update({
      status: 'active',
      paused_at: new Date().toISOString(),
      republish_count: req.republish_count + 1,
    }).eq('id', id)
    setRequests(r => r.map(req => req.id === id ? { ...req, status: 'active', republish_count: req.republish_count + 1 } : req))
    setModal(null)
  }

  const handleDelete = async (id: string) => {
    const supabase = createClient()
    await (supabase as any).from('requests').update({ status: 'deleted' }).eq('id', id)
    setRequests(r => r.filter(req => req.id !== id))
    setModal(null)
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #f0f7ff 0%, #fefce8 50%, #f0fdf4 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'DM Sans, sans-serif',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>🧹</div>
          <p style={{ fontSize: '14px', color: '#64748b' }}>Loading your dashboard…</p>
        </div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #f0f7ff 0%, #fefce8 50%, #f0fdf4 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'DM Sans, sans-serif', padding: '24px',
      }}>
        <div style={{
          background: 'white', borderRadius: '20px', padding: '40px',
          maxWidth: '400px', textAlign: 'center', border: '1.5px solid #fecaca',
        }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>⚠️</div>
          <p style={{ fontSize: '14px', color: '#dc2626', margin: '0 0 16px' }}>{error ?? 'Could not load your dashboard.'}</p>
          <button
            onClick={() => router.push('/login')}
            style={{
              background: '#0f172a', color: 'white', border: 'none',
              borderRadius: '10px', padding: '10px 24px',
              fontSize: '14px', fontWeight: 700, cursor: 'pointer',
              fontFamily: 'DM Sans, sans-serif',
            }}
          >
            Back to login
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link
        href="https://fonts.googleapis.com/css2?family=Lora:wght@400;600;700&family=DM+Sans:wght@400;500;600;700;800&display=swap"
        rel="stylesheet"
      />
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #f0f7ff 0%, #fefce8 50%, #f0fdf4 100%)',
        fontFamily: 'DM Sans, sans-serif',
      }}>

        {/* Top bar */}
        <div style={{
          background: 'white', borderBottom: '1px solid #f1f5f9',
          padding: '0 24px', height: '60px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'sticky', top: 0, zIndex: 50,
        }}>
          <a href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '8px',
              background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: '16px', fontWeight: 800, color: 'white', fontFamily: 'Lora, serif' }}>V</span>
            </div>
            <span style={{ fontSize: '17px', fontWeight: 700, color: '#0f172a', fontFamily: 'Lora, serif' }}>Vouchee</span>
          </a>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '14px', fontWeight: 800, color: 'white',
            }}>
              {getInitial(profile.full_name)}
            </div>
            <button
              onClick={handleSignOut}
              style={{
                background: 'none', border: '1px solid #e2e8f0',
                borderRadius: '8px', padding: '6px 14px',
                fontSize: '13px', fontWeight: 600, color: '#64748b',
                cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
              }}
            >
              Sign out
            </button>
          </div>
        </div>

        {/* Page heading */}
        <div style={{ maxWidth: '680px', margin: '0 auto', padding: '40px 24px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <h1 style={{
              fontFamily: 'Lora, serif',
              fontSize: '28px', fontWeight: 700, color: '#0f172a',
              margin: '0 0 4px',
            }}>
              Your dashboard
            </h1>
            <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>{profile.email}</p>
          </div>
          {requests.length > 0 && (
            <button
              onClick={() => router.push('/request/property')}
              style={{
                background: '#3b82f6', color: 'white', border: 'none',
                borderRadius: '10px', padding: '10px 20px',
                fontSize: '14px', fontWeight: 700, cursor: 'pointer',
                fontFamily: 'DM Sans, sans-serif', whiteSpace: 'nowrap',
              }}
            >
              + New request
            </button>
          )}
        </div>

        {/* Content */}
        <div style={{ maxWidth: '680px', margin: '0 auto', padding: '0 24px 60px' }}>
          {requests.length === 0 ? (
            <NoRequestsScreen profile={profile} onPost={() => router.push('/request/property')} />
          ) : (
            requests.map(req => (
              <RequestCard
                key={req.id}
                request={req}
                onPause={() => setModal({ type: 'pause', id: req.id })}
                onRepublish={() => setModal({ type: 'republish', id: req.id })}
                onDelete={() => setModal({ type: 'delete', id: req.id })}
                onEdit={() => router.push(`/request/property?edit=${req.id}`)}
              />
            ))
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
