'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/header'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Stats {
  totalCustomers: number
  totalCleaners: number
  activeListings: number
  totalApplications: number
  totalConversations: number
  totalMessages: number
  violationsToday: number
}

interface UserRow {
  id: string
  full_name: string
  email: string
  role: string
  created_at: string
  suspended?: boolean
}

interface ApplicationRow {
  id: string
  status: string
  created_at: string
  message?: string
  cleaner_name: string
  customer_name: string
  zone: string
}

interface ConversationRow {
  id: string
  created_at: string
  cleaner_name: string
  customer_name: string
  zone: string
  message_count: number
  last_message: string
  last_message_at: string | null
}

interface ViolationRow {
  id: string
  created_at: string
  conversation_id: string
  message_content: string
  triggered_keywords: string[]
  sender_role: string
  sender_name: string
}

type Tab = 'overview' | 'users' | 'applications' | 'conversations' | 'violations'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ago(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, color = '#2563eb', sub }: { label: string; value: number | string; color?: string; sub?: string }) {
  return (
    <div style={{ background: 'white', borderRadius: '14px', padding: '20px 24px', border: '1.5px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
      <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>{label}</div>
      <div style={{ fontSize: '32px', fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>{sub}</div>}
    </div>
  )
}

// ─── Badge ────────────────────────────────────────────────────────────────────

function Badge({ label, color }: { label: string; color: string }) {
  const cfg: Record<string, { bg: string; text: string; border: string }> = {
    green:  { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
    yellow: { bg: '#fefce8', text: '#854d0e', border: '#fef08a' },
    red:    { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
    blue:   { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
    gray:   { bg: '#f8fafc', text: '#64748b', border: '#e2e8f0' },
    purple: { bg: '#f5f3ff', text: '#6d28d9', border: '#ddd6fe' },
  }
  const c = cfg[color] ?? cfg.gray
  return (
    <span style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}`, borderRadius: '100px', padding: '2px 10px', fontSize: '11px', fontWeight: 700 }}>
      {label}
    </span>
  )
}

// ─── Conversation Modal ───────────────────────────────────────────────────────

function ConversationModal({ conversationId, cleanerName, customerName, onClose }: {
  conversationId: string
  cleanerName: string
  customerName: string
  onClose: () => void
}) {
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data } = await (supabase as any)
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
      setMessages(data ?? [])
      setLoading(false)
    }
    load()
  }, [conversationId])

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ background: 'white', borderRadius: '20px', width: '100%', maxWidth: '560px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>{cleanerName} ↔ {customerName}</div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>{messages.length} messages</div>
          </div>
          <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', fontSize: '16px', cursor: 'pointer', color: '#64748b' }}>✕</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {loading ? (
            <p style={{ color: '#94a3b8', fontSize: '13px', textAlign: 'center' }}>Loading…</p>
          ) : messages.length === 0 ? (
            <p style={{ color: '#94a3b8', fontSize: '13px', textAlign: 'center' }}>No messages yet</p>
          ) : (
            messages.map(msg => {
              const hasViolation = ['07', '+44', 'whatsapp', 'email', '@', 'bank', 'go direct', 'go private', 'direct payment', 'cash', 'address']
                .some(w => msg.content?.toLowerCase().includes(w))
              return (
                <div key={msg.id} style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: msg.sender_role === 'cleaner' ? '#2563eb' : '#16a085', textTransform: 'uppercase', marginBottom: '3px' }}>
                    {msg.sender_role === 'cleaner' ? cleanerName : customerName}
                    <span style={{ fontWeight: 400, color: '#94a3b8', marginLeft: '8px' }}>
                      {new Date(msg.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} · {fmt(msg.created_at)}
                    </span>
                  </div>
                  <div style={{
                    padding: '8px 12px', borderRadius: '10px', fontSize: '13px', lineHeight: 1.5,
                    background: hasViolation ? '#fef2f2' : '#f8fafc',
                    border: hasViolation ? '1px solid #fecaca' : '1px solid #f1f5f9',
                    color: '#0f172a',
                  }}>
                    {msg.content}
                    {hasViolation && <span style={{ marginLeft: '8px', fontSize: '10px', fontWeight: 700, color: '#dc2626' }}>⚠ keyword</span>}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('overview')
  const [stats, setStats] = useState<Stats | null>(null)
  const [users, setUsers] = useState<UserRow[]>([])
  const [applications, setApplications] = useState<ApplicationRow[]>([])
  const [conversations, setConversations] = useState<ConversationRow[]>([])
  const [violations, setViolations] = useState<ViolationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [userSearch, setUserSearch] = useState('')
  const [viewingConv, setViewingConv] = useState<ConversationRow | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }

      const { data: profile } = await (supabase as any)
        .from('profiles').select('role').eq('id', user.id).single()

      if (!profile || profile.role !== 'admin') {
        router.replace('/login')
        return
      }

      await Promise.all([loadStats(), loadUsers(), loadApplications(), loadConversations(), loadViolations()])
      setLoading(false)
    }
    init()
  }, [])

  const loadStats = async () => {
    const [
      { count: customers },
      { count: cleaners },
      { count: listings },
      { count: apps },
      { count: convs },
      { count: msgs },
      { count: viols },
    ] = await Promise.all([
      (supabase as any).from('customers').select('*', { count: 'exact', head: true }),
      (supabase as any).from('cleaners').select('*', { count: 'exact', head: true }),
      (supabase as any).from('clean_requests').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      (supabase as any).from('applications').select('*', { count: 'exact', head: true }),
      (supabase as any).from('conversations').select('*', { count: 'exact', head: true }),
      (supabase as any).from('messages').select('*', { count: 'exact', head: true }),
      (supabase as any).from('keyword_violations').select('*', { count: 'exact', head: true })
        .gte('created_at', new Date(Date.now() - 86400000).toISOString()),
    ])
    setStats({
      totalCustomers: customers ?? 0,
      totalCleaners: cleaners ?? 0,
      activeListings: listings ?? 0,
      totalApplications: apps ?? 0,
      totalConversations: convs ?? 0,
      totalMessages: msgs ?? 0,
      violationsToday: viols ?? 0,
    })
  }

  const loadUsers = async () => {
    const { data } = await (supabase as any)
      .from('profiles')
      .select('id, full_name, email, role, created_at')
      .in('role', ['customer', 'cleaner'])
      .order('created_at', { ascending: false })
      .limit(200)
    setUsers(data ?? [])
  }

  const loadApplications = async () => {
    const { data: apps } = await (supabase as any)
      .from('applications')
      .select('id, status, created_at, message, cleaner_id, request_id')
      .order('created_at', { ascending: false })
      .limit(100)

    if (!apps) return

    const enriched = await Promise.all(apps.map(async (app: any) => {
      const { data: cleaner } = await (supabase as any)
        .from('cleaners').select('profiles(full_name)').eq('id', app.cleaner_id).single()
      const { data: req } = await (supabase as any)
        .from('clean_requests').select('zone, customer_id').eq('id', app.request_id).single()
      const { data: customer } = req ? await (supabase as any)
        .from('customers').select('profiles(full_name)').eq('id', req.customer_id).single() : { data: null }

      return {
        id: app.id,
        status: app.status,
        created_at: app.created_at,
        message: app.message,
        cleaner_name: cleaner?.profiles?.full_name ?? 'Unknown',
        customer_name: (customer as any)?.profiles?.full_name ?? 'Unknown',
        zone: req?.zone ?? '—',
      }
    }))
    setApplications(enriched)
  }

  const loadConversations = async () => {
    const { data: convs } = await (supabase as any)
      .from('conversations')
      .select('id, created_at, cleaner_id, customer_id, clean_request_id')
      .order('created_at', { ascending: false })
      .limit(100)

    if (!convs) return

    const enriched = await Promise.all(convs.map(async (conv: any) => {
      const { data: cleaner } = await (supabase as any)
        .from('cleaners').select('profiles(full_name)').eq('id', conv.cleaner_id).single()
      const { data: customer } = await (supabase as any)
        .from('profiles').select('full_name').eq('id', conv.customer_id).single()
      const { data: req } = await (supabase as any)
        .from('clean_requests').select('zone').eq('id', conv.clean_request_id).single()
      const { data: msgs, count } = await (supabase as any)
        .from('messages').select('content, created_at', { count: 'exact' })
        .eq('conversation_id', conv.id)
        .order('created_at', { ascending: false })
        .limit(1)

      return {
        id: conv.id,
        created_at: conv.created_at,
        cleaner_name: cleaner?.profiles?.full_name ?? 'Unknown',
        customer_name: (customer as any)?.full_name ?? 'Unknown',
        zone: req?.zone ?? '—',
        message_count: count ?? 0,
        last_message: msgs?.[0]?.content ?? '',
        last_message_at: msgs?.[0]?.created_at ?? null,
      }
    }))
    setConversations(enriched)
  }

  const loadViolations = async () => {
    const { data } = await (supabase as any)
      .from('keyword_violations')
      .select('id, created_at, conversation_id, message_content, triggered_keywords, sender_role, sender_id')
      .order('created_at', { ascending: false })
      .limit(100)

    if (!data) return

    const enriched = await Promise.all((data as any[]).map(async (v) => {
      const { data: profile } = await (supabase as any)
        .from('profiles').select('full_name').eq('id', v.sender_id).single()
      return {
        ...v,
        sender_name: (profile as any)?.full_name ?? 'Unknown',
      }
    }))
    setViolations(enriched)
  }

  const suspendUser = async (userId: string, suspended: boolean) => {
    await (supabase as any).from('profiles').update({ suspended }).eq('id', userId)
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, suspended } : u))
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔐</div>
          <p style={{ color: '#64748b', fontSize: '14px' }}>Loading admin portal…</p>
        </div>
      </div>
    )
  }

  const filteredUsers = users.filter(u =>
    u.full_name?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email?.toLowerCase().includes(userSearch.toLowerCase())
  )

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'users', label: 'Users', icon: '👥' },
    { id: 'applications', label: 'Applications', icon: '📋' },
    { id: 'conversations', label: 'Conversations', icon: '💬' },
    { id: 'violations', label: 'Violations', icon: '🚨' },
  ]

  return (
    <>
      <style>{`* { box-sizing: border-box; }`}</style>
      <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'DM Sans', sans-serif" }}>
        <Header userRole="admin" />

        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 24px 80px' }}>

          {/* Page title */}
          <div style={{ marginBottom: '32px' }}>
            <h1 style={{ fontFamily: "'Lora', serif", fontSize: '28px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>
              Admin Portal
            </h1>
            <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>Full platform visibility and controls</p>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '4px', marginBottom: '32px', background: 'white', padding: '4px', borderRadius: '12px', border: '1px solid #e2e8f0', width: 'fit-content' }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                padding: '8px 18px', borderRadius: '9px', border: 'none', cursor: 'pointer',
                background: tab === t.id ? '#0f172a' : 'transparent',
                color: tab === t.id ? 'white' : '#64748b',
                fontSize: '13px', fontWeight: 600, fontFamily: "'DM Sans', sans-serif",
                display: 'flex', alignItems: 'center', gap: '6px',
              }}>
                {t.icon} {t.label}
                {t.id === 'violations' && violations.filter(v => {
                  const today = new Date(); today.setHours(0,0,0,0)
                  return new Date(v.created_at) >= today
                }).length > 0 && (
                  <span style={{ background: '#ef4444', color: 'white', borderRadius: '100px', padding: '0 6px', fontSize: '10px', fontWeight: 700 }}>
                    {violations.filter(v => { const today = new Date(); today.setHours(0,0,0,0); return new Date(v.created_at) >= today }).length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* ── Overview ── */}
          {tab === 'overview' && stats && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px', marginBottom: '32px' }}>
                <StatCard label="Customers" value={stats.totalCustomers} color="#16a085" />
                <StatCard label="Cleaners" value={stats.totalCleaners} color="#2563eb" />
                <StatCard label="Active listings" value={stats.activeListings} color="#8e44ad" />
                <StatCard label="Applications" value={stats.totalApplications} color="#e67e22" />
                <StatCard label="Conversations" value={stats.totalConversations} color="#0f172a" />
                <StatCard label="Total messages" value={stats.totalMessages} color="#0f172a" />
                <StatCard label="Violations today" value={stats.violationsToday} color={stats.violationsToday > 0 ? '#dc2626' : '#22c55e'} sub={stats.violationsToday > 0 ? 'Needs attention' : 'All clear'} />
              </div>

              {/* Recent violations summary */}
              {violations.length > 0 && (
                <div style={{ background: 'white', borderRadius: '16px', border: '1.5px solid #fecaca', padding: '20px 24px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#dc2626', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    🚨 Recent keyword violations
                  </div>
                  {violations.slice(0, 5).map(v => (
                    <div key={v.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13px', color: '#0f172a', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          "{v.message_content}"
                        </div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                          {v.sender_name} · {v.sender_role} · {ago(v.created_at)}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', flexShrink: 0 }}>
                        {v.triggered_keywords.map(k => (
                          <span key={k} style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '4px', padding: '1px 6px', fontSize: '10px', fontWeight: 700 }}>{k}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                  {violations.length > 5 && (
                    <button onClick={() => setTab('violations')} style={{ marginTop: '12px', background: 'none', border: 'none', color: '#dc2626', fontSize: '12px', fontWeight: 700, cursor: 'pointer', padding: 0 }}>
                      View all {violations.length} violations →
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Users ── */}
          {tab === 'users' && (
            <div>
              <div style={{ marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                <input
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  placeholder="Search by name or email…"
                  style={{ padding: '10px 16px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '14px', fontFamily: "'DM Sans', sans-serif", outline: 'none', width: '300px', color: '#0f172a' }}
                />
                <span style={{ fontSize: '13px', color: '#94a3b8' }}>{filteredUsers.length} users</span>
              </div>
              <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      {['Name', 'Email', 'Role', 'Joined', 'Status', 'Actions'].map(h => (
                        <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u, i) => (
                      <tr key={u.id} style={{ borderBottom: i < filteredUsers.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f172a' }}>{u.full_name}</td>
                        <td style={{ padding: '12px 16px', color: '#64748b' }}>{u.email}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <Badge label={u.role} color={u.role === 'cleaner' ? 'blue' : 'green'} />
                        </td>
                        <td style={{ padding: '12px 16px', color: '#94a3b8' }}>{fmt(u.created_at)}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <Badge label={u.suspended ? 'Suspended' : 'Active'} color={u.suspended ? 'red' : 'green'} />
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <button
                            onClick={() => suspendUser(u.id, !u.suspended)}
                            style={{
                              background: u.suspended ? '#f0fdf4' : '#fef2f2',
                              color: u.suspended ? '#15803d' : '#dc2626',
                              border: `1px solid ${u.suspended ? '#bbf7d0' : '#fecaca'}`,
                              borderRadius: '8px', padding: '4px 12px', fontSize: '12px',
                              fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                            }}
                          >
                            {u.suspended ? 'Reinstate' : 'Suspend'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Applications ── */}
          {tab === 'applications' && (
            <div>
              <div style={{ marginBottom: '16px', fontSize: '13px', color: '#94a3b8' }}>{applications.length} applications</div>
              <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      {['Cleaner', 'Customer', 'Zone', 'Status', 'Message', 'Date'].map(h => (
                        <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {applications.map((app, i) => (
                      <tr key={app.id} style={{ borderBottom: i < applications.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f172a' }}>{app.cleaner_name}</td>
                        <td style={{ padding: '12px 16px', color: '#64748b' }}>{app.customer_name}</td>
                        <td style={{ padding: '12px 16px', color: '#64748b' }}>{app.zone}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <Badge
                            label={app.status}
                            color={app.status === 'accepted' ? 'green' : app.status === 'pending' ? 'yellow' : 'red'}
                          />
                        </td>
                        <td style={{ padding: '12px 16px', color: '#64748b', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {app.message || '—'}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#94a3b8', whiteSpace: 'nowrap' }}>{ago(app.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Conversations ── */}
          {tab === 'conversations' && (
            <div>
              <div style={{ marginBottom: '16px', fontSize: '13px', color: '#94a3b8' }}>{conversations.length} conversations</div>
              <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      {['Cleaner', 'Customer', 'Zone', 'Messages', 'Last message', 'Started', ''].map(h => (
                        <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {conversations.map((conv, i) => (
                      <tr key={conv.id} style={{ borderBottom: i < conversations.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f172a' }}>{conv.cleaner_name}</td>
                        <td style={{ padding: '12px 16px', color: '#64748b' }}>{conv.customer_name}</td>
                        <td style={{ padding: '12px 16px', color: '#64748b' }}>{conv.zone}</td>
                        <td style={{ padding: '12px 16px', color: '#0f172a', fontWeight: 600 }}>{conv.message_count}</td>
                        <td style={{ padding: '12px 16px', color: '#64748b', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {conv.last_message || '—'}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#94a3b8', whiteSpace: 'nowrap' }}>{ago(conv.created_at)}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <button
                            onClick={() => setViewingConv(conv)}
                            style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '4px 12px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
                          >
                            Read →
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Violations ── */}
          {tab === 'violations' && (
            <div>
              <div style={{ marginBottom: '16px', fontSize: '13px', color: '#94a3b8' }}>{violations.length} violations logged</div>
              {violations.length === 0 ? (
                <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '48px', textAlign: 'center' }}>
                  <div style={{ fontSize: '32px', marginBottom: '12px' }}>✅</div>
                  <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>No violations logged yet</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {violations.map(v => (
                    <div key={v.id} style={{ background: 'white', borderRadius: '14px', border: '1.5px solid #fecaca', padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '10px' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '14px', color: '#0f172a', marginBottom: '4px', fontStyle: 'italic' }}>
                            "{v.message_content}"
                          </div>
                          <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                            {v.sender_name} · {v.sender_role} · {ago(v.created_at)}
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            const conv = conversations.find(c => c.id === v.conversation_id)
                            if (conv) setViewingConv(conv)
                          }}
                          style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '8px', padding: '4px 12px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", flexShrink: 0 }}
                        >
                          View chat →
                        </button>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {v.triggered_keywords.map(k => (
                          <span key={k} style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '6px', padding: '2px 8px', fontSize: '11px', fontWeight: 700 }}>
                            ⚠ {k}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Conversation reader modal */}
        {viewingConv && (
          <ConversationModal
            conversationId={viewingConv.id}
            cleanerName={viewingConv.cleaner_name}
            customerName={viewingConv.customer_name}
            onClose={() => setViewingConv(null)}
          />
        )}
      </div>
    </>
  )
}
