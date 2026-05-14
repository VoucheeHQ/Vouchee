'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/header'

interface Stats {
  totalCustomers: number; totalCleaners: number; activeListings: number
  totalApplications: number; totalConversations: number; totalMessages: number; violationsToday: number
}
interface UserRow { id: string; full_name: string; email: string; role: string; created_at: string; suspended?: boolean }
interface ListingRow { id: string; status: string; created_at: string; zone: string | null; bedrooms: number; bathrooms: number; hourly_rate: number; frequency: string; customer_name: string; customer_email: string; hidden?: boolean; hidden_reviewed_at?: string | null }
interface ApplicationRow { id: string; status: string; created_at: string; message?: string; cleaner_name: string; customer_name: string; zone: string; pending_reviewed_at?: string | null }
interface ConversationRow { id: string; created_at: string; cleaner_name: string; customer_name: string; zone: string; message_count: number; last_message: string; last_message_at: string | null; cleaner_id?: string }
interface ViolationRow { id: string; created_at: string; conversation_id: string; message_content: string; triggered_keywords: string[]; sender_role: string; sender_name: string; sender_id: string; reviewed_at: string | null }
interface KeywordRow { id: string; keyword: string; created_at: string }

type Tab = 'overview' | 'users' | 'cleaners' | 'listings' | 'applications' | 'conversations' | 'violations' | 'keywords' | 'customer-view' | 'cleaner-view' | 'tests'

const ZONE_LABELS: Record<string, string> = {
  central_south_east: 'Central / South East', north_west: 'North West',
  north_east_roffey: 'North East / Roffey', south_west: 'South West',
  warnham_north: 'Warnham / North', broadbridge_heath: 'Broadbridge Heath',
  mannings_heath: 'Mannings Heath', faygate_kilnwood_vale: 'Faygate / Kilnwood Vale',
  christs_hospital: "Christ's Hospital", southwater: 'Southwater',
}

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
// "12 Mar 2026 · 3d ago" — used in table cells where both the absolute
// date (for scanning trends) and the relative age (for recency feel) matter.
function dual(iso: string) {
  return `${fmt(iso)} · ${ago(iso)}`
}

async function adminAction(body: Record<string, unknown>) {
  const res = await fetch('/api/admin/actions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  if (!res.ok) { const err = await res.json(); console.error('Admin action failed:', err); return false }
  return true
}

function StatCard({ label, value, color = '#2563eb', sub }: { label: string; value: number | string; color?: string; sub?: string }) {
  return (
    <div style={{ background: 'white', borderRadius: '14px', padding: '20px 24px', border: '1.5px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
      <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>{label}</div>
      <div style={{ fontSize: '32px', fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>{sub}</div>}
    </div>
  )
}

function Badge({ label, color }: { label: string; color: string }) {
  const cfg: Record<string, { bg: string; text: string; border: string }> = {
    green: { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' }, yellow: { bg: '#fefce8', text: '#854d0e', border: '#fef08a' },
    red: { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' }, blue: { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
    gray: { bg: '#f8fafc', text: '#64748b', border: '#e2e8f0' }, purple: { bg: '#f5f3ff', text: '#6d28d9', border: '#ddd6fe' },
    orange: { bg: '#fff7ed', text: '#c2410c', border: '#fed7aa' },
  }
  const c = cfg[color] ?? cfg.gray
  return <span style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}`, borderRadius: '100px', padding: '2px 10px', fontSize: '11px', fontWeight: 700 }}>{label}</span>
}

function ConfirmModal({ message, onConfirm, onCancel, danger = true }: { message: string; onConfirm: () => void; onCancel: () => void; danger?: boolean }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ background: 'white', borderRadius: '20px', padding: '32px', maxWidth: '400px', width: '100%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <p style={{ fontSize: '15px', color: '#0f172a', margin: '0 0 24px', lineHeight: 1.6 }}>{message}</p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button onClick={onCancel} style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 20px', fontSize: '14px', fontWeight: 600, color: '#64748b', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Cancel</button>
          <button onClick={onConfirm} style={{ background: danger ? '#ef4444' : '#2563eb', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 20px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Confirm</button>
        </div>
      </div>
    </div>
  )
}

function ConversationModal({ conversationId, cleanerName, customerName, onClose }: { conversationId: string; cleanerName: string; customerName: string; onClose: () => void }) {
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  useEffect(() => {
    const load = async () => {
      const { data } = await (supabase as any).from('messages').select('*').eq('conversation_id', conversationId).order('created_at', { ascending: true })
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
          {loading ? <p style={{ color: '#94a3b8', fontSize: '13px', textAlign: 'center' }}>Loading…</p>
            : messages.length === 0 ? <p style={{ color: '#94a3b8', fontSize: '13px', textAlign: 'center' }}>No messages yet</p>
            : messages.map(msg => {
              const hasViolation = ['07', '+44', 'whatsapp', 'email', '@', 'bank', 'go direct', 'go private', 'direct payment', 'cash', 'address'].some(w => msg.content?.toLowerCase().includes(w))
              return (
                <div key={msg.id} style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: msg.sender_role === 'cleaner' ? '#2563eb' : '#16a085', textTransform: 'uppercase', marginBottom: '3px' }}>
                    {msg.sender_role === 'cleaner' ? cleanerName : customerName}
                    <span style={{ fontWeight: 400, color: '#94a3b8', marginLeft: '8px' }}>{new Date(msg.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} · {fmt(msg.created_at)}</span>
                  </div>
                  <div style={{ padding: '8px 12px', borderRadius: '10px', fontSize: '13px', lineHeight: 1.5, background: hasViolation ? '#fef2f2' : '#f8fafc', border: hasViolation ? '1px solid #fecaca' : '1px solid #f1f5f9', color: '#0f172a' }}>
                    {msg.content}{hasViolation && <span style={{ marginLeft: '8px', fontSize: '10px', fontWeight: 700, color: '#dc2626' }}>⚠ keyword</span>}
                  </div>
                </div>
              )
            })}
        </div>
      </div>
    </div>
  )
}

// ─── Test Card ────────────────────────────────────────────────────────────────
function TestCard({ title, description, buttonLabel, buttonColor = '#2563eb', comingSoon = false, onRun }: {
  title: string; description: string; buttonLabel: string; buttonColor?: string; comingSoon?: boolean
  onRun?: () => Promise<{ success: boolean; message: string }>
}) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [resultMsg, setResultMsg] = useState('')
  const run = async () => {
    if (!onRun || comingSoon) return
    setStatus('loading'); setResultMsg('')
    try {
      const result = await onRun()
      setStatus(result.success ? 'success' : 'error')
      setResultMsg(result.message)
    } catch (e: any) { setStatus('error'); setResultMsg(e.message ?? 'Unknown error') }
  }
  return (
    <div style={{ background: 'white', borderRadius: '16px', border: '1.5px solid #e2e8f0', padding: '24px 28px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>{title}</div>
          <div style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.6 }}>{description}</div>
        </div>
        {comingSoon ? (
          <span style={{ background: '#f8fafc', color: '#94a3b8', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 16px', fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap' }}>Coming soon</span>
        ) : (
          <button onClick={run} disabled={status === 'loading'} style={{ background: status === 'loading' ? '#94a3b8' : buttonColor, color: 'white', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '13px', fontWeight: 700, cursor: status === 'loading' ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap', flexShrink: 0 }}>
            {status === 'loading' ? 'Sending…' : buttonLabel}
          </button>
        )}
      </div>
      {status === 'success' && <div style={{ marginTop: '12px', padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', fontSize: '13px', color: '#15803d', fontWeight: 600 }}>✅ {resultMsg}</div>}
      {status === 'error' && <div style={{ marginTop: '12px', padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', fontSize: '13px', color: '#dc2626', fontWeight: 600 }}>❌ {resultMsg}</div>}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// CLEANER CRM
// ═══════════════════════════════════════════════════════════════

interface CleanerRow {
  id: string
  profile_id: string
  full_name: string
  email: string
  application_status: 'submitted' | 'in_review' | 'approved' | 'rejected' | 'suspended' | 'pending' | null
  submission_reviewed_at: string | null
  created_at: string
  dbs_checked: boolean
  has_insurance: boolean
  right_to_work: boolean
  interview_notes: string | null
  interview_qualifying: Record<string, string> | null
  interview_platform: Record<string, boolean> | null
  approved_at: string | null
  rejected_at: string | null
  rejection_reason: string | null
  cleans_completed: number | null
  // Document verification fields (added phase 2)
  dbs_verified: boolean
  dbs_file_url: string | null
  dbs_expiry: string | null
  dbs_uploaded_at: string | null
  insurance_verified: boolean
  insurance_file_url: string | null
  insurance_expiry: string | null
  insurance_uploaded_at: string | null
  right_to_work_verified: boolean
  right_to_work_file_url: string | null
  right_to_work_expiry: string | null
  right_to_work_uploaded_at: string | null
  suspension_reason: string | null
  suspended_at: string | null
}

// DRAFT QUESTIONS — edit freely, stored in DB as JSONB keys so you can tweak copy without migration churn
const QUALIFYING_QUESTIONS = [
  { id: 'q1', label: 'Why do you want to join Vouchee?' },
  { id: 'q2', label: 'How many years of professional cleaning experience do you have?' },
  { id: 'q3', label: 'Do you have your own transport, and do you bring your own supplies?' },
  { id: 'q4', label: 'What are you hoping to get out of the platform?' },
  { id: 'q5', label: 'Do you have your DBS and insurance ready to provide now?' },
]

const PLATFORM_CHECKLIST = [
  { id: 'p1', label: 'Explained: off-platform contact results in a ban from Vouchee' },
  { id: 'p2', label: 'Explained: how payments work (customer Direct Debit → cleaner directly)' },
  { id: 'p3', label: 'Explained: job application process and customer expectations' },
  { id: 'p4', label: 'Explained: what happens if a customer cancels' },
]

// ─── Sort state + helper ─────────────────────────────────────────────────
// Each tab tracks its own { key, dir } object. Clicking the same header
// flips direction; clicking a new header sets key + defaults to desc.
type SortDir = 'asc' | 'desc'
interface SortState { key: string; dir: SortDir }

function flipSort(prev: SortState, key: string): SortState {
  if (prev.key === key) return { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
  return { key, dir: 'desc' }
}

// Generic stable sort by string/number/Date key. NULL/undefined sorts last.
function sortRows<T extends Record<string, any>>(rows: T[], state: SortState): T[] {
  const dir = state.dir === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => {
    const av = a[state.key]
    const bv = b[state.key]
    if (av == null && bv == null) return 0
    if (av == null) return 1
    if (bv == null) return -1
    if (typeof av === 'string' && typeof bv === 'string') return av.localeCompare(bv) * dir
    if (av < bv) return -1 * dir
    if (av > bv) return 1 * dir
    return 0
  })
}

// "Load 25 more" button shown at the bottom of paginated tables. Hides
// when search is active or when the last batch returned < 25 rows.
function LoadMoreButton({ visible, loading, onClick }: { visible: boolean; loading: boolean; onClick: () => void }) {
  if (!visible) return null
  return (
    <div style={{ padding: '12px', textAlign: 'center', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
      <button onClick={onClick} disabled={loading} style={{ background: 'white', color: '#0f172a', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 20px', fontSize: '12px', fontWeight: 600, cursor: loading ? 'wait' : 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
        {loading ? 'Loading…' : 'Load 25 more'}
      </button>
    </div>
  )
}

// Clickable column header with sort-direction indicator.
function SortableTh({ label, sortKey, state, onChange }: { label: string; sortKey: string; state: SortState; onChange: (k: string) => void }) {
  const active = state.key === sortKey
  return (
    <th onClick={() => onChange(sortKey)} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: active ? '#0f172a' : '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>
      {label}
      <span style={{ marginLeft: '6px', opacity: active ? 1 : 0.3, fontSize: '10px' }}>
        {active ? (state.dir === 'asc' ? '▲' : '▼') : '▾'}
      </span>
    </th>
  )
}

function PipelineCount({ label, count, color, active, onClick }: { label: string; count: number; color: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      flex: 1, minWidth: '140px',
      background: active ? color : 'white',
      color: active ? 'white' : '#0f172a',
      border: `1.5px solid ${active ? color : '#e2e8f0'}`,
      borderRadius: '12px',
      padding: '14px 16px',
      cursor: 'pointer',
      fontFamily: "'DM Sans', sans-serif",
      textAlign: 'left',
      transition: 'all 0.15s'
    }}>
      <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', opacity: active ? 0.9 : 0.6, marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '24px', fontWeight: 800, lineHeight: 1 }}>{count}</div>
    </button>
  )
}

function DocumentUploadSlot({
  cleanerId, docType, label, fileUrl, verified, expiry, uploadedAt, onChange,
}: {
  cleanerId: string
  docType: 'dbs' | 'insurance' | 'right_to_work'
  label: string
  fileUrl: string | null
  verified: boolean
  expiry: string | null
  uploadedAt: string | null
  onChange: () => void
}) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingExpiry, setPendingExpiry] = useState(expiry ?? '')
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [savingExpiry, setSavingExpiry] = useState(false)
  const [removing, setRemoving] = useState(false)

  // Expiry status calc
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const expiryDate = expiry ? new Date(expiry) : null
  const daysUntilExpiry = expiryDate ? Math.floor((expiryDate.getTime() - today.getTime()) / 86400000) : null
  const expiryState: 'none' | 'expired' | 'expiring_soon' | 'ok' =
    !expiryDate ? 'none' :
    daysUntilExpiry! < 0 ? 'expired' :
    daysUntilExpiry! <= 30 ? 'expiring_soon' : 'ok'

  const doUpload = async () => {
    if (!pendingFile) return
    setUploading(true); setError(null)
    try {
      const fd = new FormData()
      fd.append('file', pendingFile)
      fd.append('cleanerId', cleanerId)
      fd.append('docType', docType)
      if (pendingExpiry.trim()) fd.append('expiry', pendingExpiry)
      const res = await fetch('/api/admin/upload-cleaner-doc', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Upload failed')
      } else {
        setPendingFile(null)
        onChange()
      }
    } catch (e: any) {
      setError(e.message ?? 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const saveExpiryOnly = async () => {
    setSavingExpiry(true); setError(null)
    try {
      const res = await fetch('/api/admin/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_doc_expiry', cleanerId, docType, expiry: pendingExpiry }),
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error ?? 'Save failed')
      } else {
        onChange()
      }
    } catch (e: any) { setError(e.message ?? 'Save failed') }
    finally { setSavingExpiry(false) }
  }

  const remove = async () => {
    if (!confirm(`Remove the ${label} file? This marks it as not verified.`)) return
    setRemoving(true); setError(null)
    try {
      const res = await fetch('/api/admin/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove_document', cleanerId, docType }),
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error ?? 'Remove failed')
      } else {
        setPendingExpiry('')
        onChange()
      }
    } catch (e: any) { setError(e.message ?? 'Remove failed') }
    finally { setRemoving(false) }
  }

  const borderColor =
    expiryState === 'expired' ? '#fecaca' :
    expiryState === 'expiring_soon' ? '#fde68a' :
    verified ? '#bbf7d0' : '#e2e8f0'
  const bgColor =
    expiryState === 'expired' ? '#fef2f2' :
    expiryState === 'expiring_soon' ? '#fefce8' :
    verified ? '#f0fdf4' : '#f8fafc'

  return (
    <div style={{ background: bgColor, border: `1.5px solid ${borderColor}`, borderRadius: '12px', padding: '14px 16px', marginBottom: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', gap: '10px' }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>{label}</div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {verified
            ? <Badge label="✓ Verified" color="green" />
            : <Badge label="Not verified" color="gray" />}
          {expiryState === 'expired' && <Badge label="⚠ Expired" color="red" />}
          {expiryState === 'expiring_soon' && <Badge label={`${daysUntilExpiry}d left`} color="yellow" />}
        </div>
      </div>

      {verified && fileUrl ? (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
            <a href={fileUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px', fontWeight: 600, color: '#2563eb', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              📄 View file
            </a>
            {uploadedAt && <span style={{ fontSize: '11px', color: '#94a3b8' }}>uploaded {fmt(uploadedAt)}</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', whiteSpace: 'nowrap' }}>Expiry:</label>
            <input
              type="date"
              value={pendingExpiry}
              onChange={e => setPendingExpiry(e.target.value)}
              style={{ flex: 1, padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', fontFamily: "'DM Sans', sans-serif", color: '#0f172a', outline: 'none' }}
            />
            {pendingExpiry !== (expiry ?? '') && (
              <button
                onClick={saveExpiryOnly}
                disabled={savingExpiry}
                style={{ background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', padding: '5px 10px', fontSize: '11px', fontWeight: 700, cursor: savingExpiry ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif" }}
              >
                {savingExpiry ? '…' : 'Save'}
              </button>
            )}
          </div>
          {!pendingExpiry && (
            <div style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic', marginBottom: '8px' }}>No expiry set (non-expiring document)</div>
          )}
          <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
            <label style={{ display: 'inline-block', cursor: 'pointer' }}>
              <input
                type="file"
                accept="application/pdf,image/jpeg,image/png"
                onChange={e => setPendingFile(e.target.files?.[0] ?? null)}
                style={{ display: 'none' }}
              />
              <span style={{ display: 'inline-block', background: 'white', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '5px 10px', fontSize: '11px', fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>
                🔄 Replace file
              </span>
            </label>
            {pendingFile && (
              <>
                <span style={{ fontSize: '11px', color: '#64748b', alignSelf: 'center' }}>{pendingFile.name}</span>
                <button onClick={doUpload} disabled={uploading} style={{ background: '#16a34a', color: 'white', border: 'none', borderRadius: '6px', padding: '5px 12px', fontSize: '11px', fontWeight: 700, cursor: uploading ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                  {uploading ? 'Uploading…' : 'Upload'}
                </button>
                <button onClick={() => setPendingFile(null)} style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '5px 10px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', color: '#64748b', fontFamily: "'DM Sans', sans-serif" }}>
                  Cancel
                </button>
              </>
            )}
            <button onClick={remove} disabled={removing} style={{ marginLeft: 'auto', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '6px', padding: '5px 10px', fontSize: '11px', fontWeight: 600, cursor: removing ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
              {removing ? '…' : '🗑 Remove'}
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '10px' }}>No file uploaded yet.</div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', whiteSpace: 'nowrap' }}>Expiry (optional):</label>
            <input
              type="date"
              value={pendingExpiry}
              onChange={e => setPendingExpiry(e.target.value)}
              style={{ flex: 1, padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', fontFamily: "'DM Sans', sans-serif", color: '#0f172a', outline: 'none' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ display: 'inline-block', cursor: 'pointer' }}>
              <input
                type="file"
                accept="application/pdf,image/jpeg,image/png"
                onChange={e => setPendingFile(e.target.files?.[0] ?? null)}
                style={{ display: 'none' }}
              />
              <span style={{ display: 'inline-block', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>
                📎 Choose file
              </span>
            </label>
            {pendingFile && (
              <>
                <span style={{ fontSize: '12px', color: '#64748b' }}>{pendingFile.name}</span>
                <button onClick={doUpload} disabled={uploading} style={{ background: '#16a34a', color: 'white', border: 'none', borderRadius: '6px', padding: '6px 14px', fontSize: '12px', fontWeight: 700, cursor: uploading ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                  {uploading ? 'Uploading…' : 'Upload & verify'}
                </button>
              </>
            )}
          </div>
          <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '6px' }}>PDF, JPG, or PNG — max 10 MB</div>
        </div>
      )}

      {error && (
        <div style={{ marginTop: '8px', padding: '6px 10px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', fontSize: '11px', color: '#dc2626' }}>
          ⚠ {error}
        </div>
      )}
    </div>
  )
}

// ─── Activity timeline ───────────────────────────────────────────────────
// Renders a chronological story of the cleaner's journey using fields
// already on the cleaner row. Each event shows label + relative+absolute
// date. Skips events that haven't happened yet (null timestamps).
function ActivityTimeline({ cleaner, convCount, latestConvAt }: { cleaner: CleanerRow; convCount: number; latestConvAt: string | null }) {
  type Event = { at: string; emoji: string; label: string; color: string }
  const events: Event[] = []
  if (cleaner.created_at) events.push({ at: cleaner.created_at, emoji: '📝', label: 'Applied to Vouchee', color: '#3b82f6' })
  if ((cleaner as any).dbs_uploaded_at) events.push({ at: (cleaner as any).dbs_uploaded_at, emoji: '🛡️', label: 'DBS uploaded', color: '#22c55e' })
  if ((cleaner as any).insurance_uploaded_at) events.push({ at: (cleaner as any).insurance_uploaded_at, emoji: '📋', label: 'Insurance uploaded', color: '#22c55e' })
  if ((cleaner as any).right_to_work_uploaded_at) events.push({ at: (cleaner as any).right_to_work_uploaded_at, emoji: '✅', label: 'Right to work uploaded', color: '#22c55e' })
  if ((cleaner as any).approved_at) events.push({ at: (cleaner as any).approved_at, emoji: '🎉', label: 'Approved', color: '#16a34a' })
  if ((cleaner as any).rejected_at) events.push({ at: (cleaner as any).rejected_at, emoji: '🚪', label: 'Rejected', color: '#dc2626' })
  if ((cleaner as any).suspended_at) events.push({ at: (cleaner as any).suspended_at, emoji: '⏸️', label: 'Suspended', color: '#dc2626' })
  if (latestConvAt) events.push({ at: latestConvAt, emoji: '💬', label: `Most recent conversation (${convCount} total)`, color: '#0f172a' })

  if (events.length === 0) return null
  events.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())

  return (
    <div style={{ marginBottom: '28px' }}>
      <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>Activity</div>
      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px 18px' }}>
        {events.map((ev, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 0', borderTop: i > 0 ? '1px solid #f1f5f9' : 'none' }}>
            <div style={{ fontSize: '18px', width: '24px', textAlign: 'center', flexShrink: 0 }}>{ev.emoji}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: ev.color, lineHeight: 1.3 }}>{ev.label}</div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>{fmt(ev.at)} · {ago(ev.at)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

interface ViolationCounts {
  cleanerSaid: number    // # violations where this cleaner used a keyword
  customersSaid: number  // # violations where customers in their chats used keywords
  conversationsTouched: number  // # distinct convs that contain at least one violation
}

function CleanerDrawer({ cleaner: initialCleaner, onClose, onSaved }: { cleaner: CleanerRow; onClose: () => void; onSaved: () => void }) {
  // Track the cleaner's state internally so we can refresh the drawer
  // after an upload/verify without closing it
  const [cleaner, setCleaner] = useState<CleanerRow>(initialCleaner)
  const [cleanerConvos, setCleanerConvos] = useState<ConversationRow[]>([])
  const [loadingConvos, setLoadingConvos] = useState(true)
  const [viewingCleanerConv, setViewingCleanerConv] = useState<ConversationRow | null>(null)
  const [violationCounts, setViolationCounts] = useState<ViolationCounts | null>(null)
  const supabase = createClient()

  const loadCleanerConversations = async () => {
    setLoadingConvos(true)
    const { data: convs } = await (supabase as any)
      .from('conversations')
      .select('id, created_at, cleaner_id, customer_id, clean_request_id')
      .eq('cleaner_id', cleaner.id)
      .order('created_at', { ascending: false })
    if (!convs) { setLoadingConvos(false); return }
    const enriched = await Promise.all((convs as any[]).map(async (conv) => {
      const { data: customer } = await (supabase as any).from('profiles').select('full_name').eq('id', conv.customer_id).single()
      const { data: req } = await (supabase as any).from('clean_requests').select('zone').eq('id', conv.clean_request_id).single()
      const { data: msgs, count } = await (supabase as any).from('messages').select('content, created_at', { count: 'exact' }).eq('conversation_id', conv.id).order('created_at', { ascending: false }).limit(1)
      return {
        id: conv.id,
        created_at: conv.created_at,
        cleaner_name: cleaner.full_name,
        customer_name: (customer as any)?.full_name ?? 'Unknown',
        zone: req?.zone ?? '—',
        message_count: count ?? 0,
        last_message: msgs?.[0]?.content ?? '',
        last_message_at: msgs?.[0]?.created_at ?? null,
      } as ConversationRow
    }))
    setCleanerConvos(enriched)
    setLoadingConvos(false)
  }

  useEffect(() => {
    loadCleanerConversations()
    loadViolationCounts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleaner.id])

  // Cleaner-level violation totals — used to spot patterns like
  // "cleaner repeatedly tries to drag chats off-platform" or "customer
  // who joins this cleaner's chats tends to cancel after a few months".
  // Counted on the violation row level (each flagged message counts once,
  // regardless of how many keywords it triggered).
  const loadViolationCounts = async () => {
    // 1. Conversations this cleaner is in
    const { data: convs } = await (supabase as any)
      .from('conversations').select('id').eq('cleaner_id', cleaner.id) as { data: { id: string }[] | null }
    const convIds = (convs ?? []).map(c => c.id)
    if (convIds.length === 0) { setViolationCounts({ cleanerSaid: 0, customersSaid: 0, conversationsTouched: 0 }); return }

    // 2. Violations across those conversations
    const { data: viols } = await (supabase as any)
      .from('keyword_violations')
      .select('conversation_id, sender_role')
      .in('conversation_id', convIds) as { data: { conversation_id: string; sender_role: string }[] | null }
    const rows = viols ?? []
    const cleanerSaid = rows.filter(r => r.sender_role === 'cleaner').length
    const customersSaid = rows.filter(r => r.sender_role === 'customer').length
    const conversationsTouched = new Set(rows.map(r => r.conversation_id)).size
    setViolationCounts({ cleanerSaid, customersSaid, conversationsTouched })
  }

  const refreshCleaner = async () => {
    const { data: c } = await (supabase as any)
      .from('cleaners')
      .select('id, profile_id, application_status, submission_reviewed_at, created_at, dbs_checked, has_insurance, right_to_work, interview_notes, interview_qualifying, interview_platform, approved_at, rejected_at, rejection_reason, cleans_completed, dbs_verified, dbs_file_url, dbs_expiry, dbs_uploaded_at, insurance_verified, insurance_file_url, insurance_expiry, insurance_uploaded_at, right_to_work_verified, right_to_work_file_url, right_to_work_expiry, right_to_work_uploaded_at, suspension_reason, suspended_at')
      .eq('id', cleaner.id)
      .single()
    if (c) setCleaner({ ...cleaner, ...(c as any) })
    onSaved() // refresh parent list too so pipeline counts stay correct
  }

  const [qualifying, setQualifying] = useState<Record<string, string>>(cleaner.interview_qualifying ?? {})
  const [platform, setPlatform] = useState<Record<string, boolean>>(cleaner.interview_platform ?? {})
  const [notes, setNotes] = useState<string>(cleaner.interview_notes ?? '')
  const [saving, setSaving] = useState(false)
  const [busy, setBusy] = useState<'idle' | 'approving' | 'rejecting'>('idle')
  const [rejectPrompt, setRejectPrompt] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const saveInterview = async () => {
    setSaving(true)
    const ok = await adminAction({
      action: 'save_interview',
      cleanerId: cleaner.id,
      notes: notes.trim() || null,
      qualifying: Object.keys(qualifying).length ? qualifying : null,
      platform: Object.keys(platform).length ? platform : null,
    })
    setSaving(false)
    if (ok) refreshCleaner()
  }

  const approve = async () => {
    setBusy('approving')
    const ok = await adminAction({ action: 'approve_cleaner', cleanerId: cleaner.id })
    setBusy('idle')
    if (ok) { onSaved(); onClose() }
  }

  const reject = async () => {
    setBusy('rejecting')
    const ok = await adminAction({ action: 'reject_cleaner', cleanerId: cleaner.id, reason: rejectReason.trim() || null })
    setBusy('idle')
    if (ok) { onSaved(); onClose() }
  }

  const reapprove = async () => {
    const allVerified = cleaner.dbs_verified && cleaner.insurance_verified && cleaner.right_to_work_verified
    if (!allVerified) {
      alert('All three documents must be uploaded and verified before re-approving.')
      return
    }
    setBusy('approving')
    const ok = await adminAction({ action: 'reapprove_cleaner', cleanerId: cleaner.id })
    setBusy('idle')
    if (ok) { onSaved(); onClose() }
  }

  const statusLabel = cleaner.application_status ?? 'submitted'
  const statusColor =
    statusLabel === 'approved' ? 'green' :
    statusLabel === 'rejected' ? 'red' :
    statusLabel === 'in_review' ? 'yellow' :
    statusLabel === 'suspended' ? 'red' : 'blue'

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 500, display: 'flex', justifyContent: 'flex-end' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'white', width: '100%', maxWidth: '640px', height: '100vh', overflowY: 'auto', boxShadow: '-8px 0 40px rgba(0,0,0,0.1)' }}>
        <div style={{ padding: '24px 28px', borderBottom: '1px solid #f1f5f9', position: 'sticky', top: 0, background: 'white', zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '0 0 4px' }}>{cleaner.full_name}</h2>
              <div style={{ fontSize: '13px', color: '#64748b' }}>{cleaner.email}</div>
              <div style={{ marginTop: '8px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <Badge label={statusLabel} color={statusColor} />
                {cleaner.dbs_checked && <Badge label="DBS ✓" color="green" />}
                {cleaner.has_insurance && <Badge label="Insured ✓" color="green" />}
                {cleaner.right_to_work && <Badge label="Right to work ✓" color="green" />}
              </div>
            </div>
            <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', fontSize: '16px', cursor: 'pointer', color: '#64748b', flexShrink: 0 }}>✕</button>
          </div>
        </div>

        <div style={{ padding: '24px 28px' }}>
          {/* Activity timeline — derived from cleaner row + conversations
              count (already loaded). Ascending chronological so the latest
              event sits at the bottom; quick visual story of where they're at. */}
          <ActivityTimeline cleaner={cleaner} convCount={cleanerConvos.length} latestConvAt={cleanerConvos[0]?.created_at ?? null} />

          {/* ─── Violation totals across this cleaner's chats ───────────
              Helps spot a cleaner who repeatedly pushes off-platform,
              and customers in their chats who do the same (those
              customers are the ones most likely to ghost after a few
              months of paid clean). */}
          {violationCounts && (violationCounts.cleanerSaid > 0 || violationCounts.customersSaid > 0) && (
            <div style={{ marginBottom: '28px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>Off-platform signals</div>
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '14px 18px', display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Cleaner said</div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>{violationCounts.cleanerSaid}</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>flagged messages</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Customers said</div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>{violationCounts.customersSaid}</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>flagged messages</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Across</div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>{violationCounts.conversationsTouched}</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>of {cleanerConvos.length} chats</div>
                </div>
              </div>
            </div>
          )}

          {/* Qualifying questions */}
          <div style={{ marginBottom: '28px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>Qualifying questions</div>
            {QUALIFYING_QUESTIONS.map(q => (
              <div key={q.id} style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#0f172a', marginBottom: '6px' }}>{q.label}</label>
                <textarea
                  value={qualifying[q.id] ?? ''}
                  onChange={e => setQualifying(prev => ({ ...prev, [q.id]: e.target.value }))}
                  rows={2}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '13px', fontFamily: "'DM Sans', sans-serif", outline: 'none', resize: 'vertical', color: '#0f172a', boxSizing: 'border-box' }}
                />
              </div>
            ))}
          </div>

          {/* Platform coverage checklist */}
          <div style={{ marginBottom: '28px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>Platform coverage</div>
            <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '14px 16px' }}>
              {PLATFORM_CHECKLIST.map(p => (
                <label key={p.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '6px 0', cursor: 'pointer', fontSize: '13px', color: '#0f172a' }}>
                  <input
                    type="checkbox"
                    checked={!!platform[p.id]}
                    onChange={e => setPlatform(prev => ({ ...prev, [p.id]: e.target.checked }))}
                    style={{ marginTop: '3px', cursor: 'pointer' }}
                  />
                  <span>{p.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Free-text notes */}
          <div style={{ marginBottom: '28px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Interview notes</div>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={5}
              placeholder="General thoughts from the call…"
              style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1.5px solid #e2e8f0', fontSize: '14px', fontFamily: "'DM Sans', sans-serif", outline: 'none', resize: 'vertical', color: '#0f172a', boxSizing: 'border-box' }}
            />
          </div>

          {/* Documents — 3 upload slots */}
          <div style={{ marginBottom: '28px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>Documents</div>

            {/* Claims vs Verified — show the delta */}
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '10px 12px', fontSize: '12px', color: '#1e40af', marginBottom: '12px', lineHeight: 1.5 }}>
              💡 <strong>At signup, {cleaner.full_name.split(' ')[0]} claimed:</strong>{' '}
              {cleaner.dbs_checked ? '✓ DBS' : '✗ DBS'},{' '}
              {cleaner.has_insurance ? '✓ Insurance' : '✗ Insurance'},{' '}
              {cleaner.right_to_work ? '✓ Right to Work' : '✗ Right to Work'}.
              {' '}Upload files below to verify each.
            </div>

            <DocumentUploadSlot
              cleanerId={cleaner.id}
              docType="dbs"
              label="🛡️ DBS Certificate"
              fileUrl={cleaner.dbs_file_url}
              verified={cleaner.dbs_verified}
              expiry={cleaner.dbs_expiry}
              uploadedAt={cleaner.dbs_uploaded_at}
              onChange={refreshCleaner}
            />
            <DocumentUploadSlot
              cleanerId={cleaner.id}
              docType="insurance"
              label="📋 Public Liability Insurance"
              fileUrl={cleaner.insurance_file_url}
              verified={cleaner.insurance_verified}
              expiry={cleaner.insurance_expiry}
              uploadedAt={cleaner.insurance_uploaded_at}
              onChange={refreshCleaner}
            />
            <DocumentUploadSlot
              cleanerId={cleaner.id}
              docType="right_to_work"
              label="✅ Right to Work"
              fileUrl={cleaner.right_to_work_file_url}
              verified={cleaner.right_to_work_verified}
              expiry={cleaner.right_to_work_expiry}
              uploadedAt={cleaner.right_to_work_uploaded_at}
              onChange={refreshCleaner}
            />
          </div>

          {/* Conversation history */}
          <div style={{ marginBottom: '28px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Conversation history</span>
              {!loadingConvos && <span style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8' }}>{cleanerConvos.length} {cleanerConvos.length === 1 ? 'conversation' : 'conversations'}</span>}
            </div>
            {loadingConvos ? (
              <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                Loading conversations…
              </div>
            ) : cleanerConvos.length === 0 ? (
              <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                💬 No conversations yet
              </div>
            ) : (
              <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
                {cleanerConvos.map((conv, i) => (
                  <button
                    key={conv.id}
                    onClick={() => setViewingCleanerConv(conv)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      background: 'white',
                      border: 'none',
                      borderBottom: i < cleanerConvos.length - 1 ? '1px solid #f1f5f9' : 'none',
                      padding: '12px 14px',
                      cursor: 'pointer',
                      fontFamily: "'DM Sans', sans-serif",
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'white')}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>{conv.customer_name}</div>
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>· {ZONE_LABELS[conv.zone] ?? conv.zone}</span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {conv.last_message || <span style={{ fontStyle: 'italic', color: '#94a3b8' }}>No messages</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px', flexShrink: 0 }}>
                      <span style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: '100px', padding: '1px 8px', fontSize: '10px', fontWeight: 700 }}>
                        {conv.message_count} {conv.message_count === 1 ? 'msg' : 'msgs'}
                      </span>
                      <span style={{ fontSize: '10px', color: '#94a3b8' }}>
                        {conv.last_message_at ? ago(conv.last_message_at) : ago(conv.created_at)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Save interview progress */}
          <button
            onClick={saveInterview}
            disabled={saving}
            style={{ width: '100%', padding: '12px', background: saving ? '#94a3b8' : '#2563eb', color: 'white', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif", marginBottom: '24px' }}
          >
            {saving ? 'Saving…' : '💾 Save interview progress'}
          </button>

          {/* Decision buttons */}
          <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>Decision</div>

            {cleaner.application_status === 'approved' && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '12px 14px', fontSize: '13px', color: '#15803d', marginBottom: '12px' }}>
                ✅ Approved{cleaner.approved_at ? ` on ${fmt(cleaner.approved_at)}` : ''}
              </div>
            )}
            {cleaner.application_status === 'rejected' && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '12px 14px', fontSize: '13px', color: '#dc2626', marginBottom: '12px' }}>
                ❌ Rejected{cleaner.rejected_at ? ` on ${fmt(cleaner.rejected_at)}` : ''}
                {cleaner.rejection_reason && <div style={{ marginTop: '4px', fontStyle: 'italic' }}>"{cleaner.rejection_reason}"</div>}
              </div>
            )}
            {cleaner.application_status === 'suspended' && (
              <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '10px', padding: '12px 14px', fontSize: '13px', color: '#c2410c', marginBottom: '12px' }}>
                ⚠ Suspended{cleaner.suspended_at ? ` on ${fmt(cleaner.suspended_at)}` : ''}
                {cleaner.suspension_reason && <div style={{ marginTop: '4px', fontStyle: 'italic' }}>"{cleaner.suspension_reason}"</div>}
                <div style={{ marginTop: '8px', fontSize: '12px' }}>Upload replacement docs above, then click Re-approve.</div>
              </div>
            )}

            {/* Re-approve button shown for suspended cleaners */}
            {cleaner.application_status === 'suspended' && !rejectPrompt && (
              <button
                onClick={reapprove}
                disabled={busy !== 'idle' || !cleaner.dbs_verified || !cleaner.insurance_verified || !cleaner.right_to_work_verified}
                title={(!cleaner.dbs_verified || !cleaner.insurance_verified || !cleaner.right_to_work_verified) ? 'All three documents must be uploaded and verified first' : ''}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: (cleaner.dbs_verified && cleaner.insurance_verified && cleaner.right_to_work_verified) ? '#16a34a' : '#e2e8f0',
                  color: (cleaner.dbs_verified && cleaner.insurance_verified && cleaner.right_to_work_verified) ? 'white' : '#94a3b8',
                  border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 700,
                  cursor: (cleaner.dbs_verified && cleaner.insurance_verified && cleaner.right_to_work_verified) ? 'pointer' : 'not-allowed',
                  fontFamily: "'DM Sans', sans-serif", marginBottom: '10px'
                }}
              >
                {busy === 'approving' ? 'Re-approving…' : '🔓 Re-approve cleaner'}
              </button>
            )}

            {!rejectPrompt && (
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={approve}
                  disabled={busy !== 'idle' || cleaner.application_status === 'approved'}
                  style={{ flex: 1, padding: '12px', background: cleaner.application_status === 'approved' ? '#e2e8f0' : '#16a34a', color: cleaner.application_status === 'approved' ? '#94a3b8' : 'white', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 700, cursor: cleaner.application_status === 'approved' ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif" }}
                >
                  {busy === 'approving' ? 'Approving…' : '✅ Approve'}
                </button>
                <button
                  onClick={() => setRejectPrompt(true)}
                  disabled={busy !== 'idle' || cleaner.application_status === 'rejected'}
                  style={{ flex: 1, padding: '12px', background: cleaner.application_status === 'rejected' ? '#e2e8f0' : '#fef2f2', color: cleaner.application_status === 'rejected' ? '#94a3b8' : '#dc2626', border: cleaner.application_status === 'rejected' ? 'none' : '1px solid #fecaca', borderRadius: '10px', fontSize: '14px', fontWeight: 700, cursor: cleaner.application_status === 'rejected' ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif" }}
                >
                  ❌ Reject
                </button>
              </div>
            )}

            {rejectPrompt && (
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>Why are you rejecting? (private, for your records)</label>
                <textarea
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  rows={3}
                  placeholder="e.g. Didn't show up to interview"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #fecaca', fontSize: '13px', fontFamily: "'DM Sans', sans-serif", outline: 'none', resize: 'vertical', color: '#0f172a', boxSizing: 'border-box', marginBottom: '10px' }}
                />
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => { setRejectPrompt(false); setRejectReason('') }}
                    style={{ flex: 1, padding: '10px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '13px', fontWeight: 600, color: '#64748b', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={reject}
                    disabled={busy !== 'idle'}
                    style={{ flex: 1, padding: '10px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: busy !== 'idle' ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif" }}
                  >
                    {busy === 'rejecting' ? 'Rejecting…' : 'Confirm rejection'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {viewingCleanerConv && (
        <ConversationModal
          conversationId={viewingCleanerConv.id}
          cleanerName={viewingCleanerConv.cleaner_name}
          customerName={viewingCleanerConv.customer_name}
          onClose={() => setViewingCleanerConv(null)}
        />
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('overview')
  const [stats, setStats] = useState<Stats | null>(null)
  const [users, setUsers] = useState<UserRow[]>([])
  const [listings, setListings] = useState<ListingRow[]>([])
  const [applications, setApplications] = useState<ApplicationRow[]>([])
  const [conversations, setConversations] = useState<ConversationRow[]>([])
  const [violations, setViolations] = useState<ViolationRow[]>([])
  const [keywords, setKeywords] = useState<KeywordRow[]>([])
  const [newKeyword, setNewKeyword] = useState('')
  const [savingKeyword, setSavingKeyword] = useState(false)
  const [keywordError, setKeywordError] = useState<string | null>(null)
  // Hourly-digest toggle state. null = not yet loaded.
  const [digestOn, setDigestOn] = useState<boolean | null>(null)
  const [savingDigest, setSavingDigest] = useState(false)
  const [loading, setLoading] = useState(true)
  const [userSearch, setUserSearch] = useState('')
  const [listingSearch, setListingSearch] = useState('')
  const [cleanerSearch, setCleanerSearch] = useState('')
  const [applicationSearch, setApplicationSearch] = useState('')
  const [conversationSearch, setConversationSearch] = useState('')
  const [viewingConv, setViewingConv] = useState<ConversationRow | null>(null)
  // Loading state for "view chat" launched from a violation card — that
  // row's conversation may not be in the loaded `conversations` set, so we
  // resolve it on demand via openConversationById.
  const [loadingConv, setLoadingConv] = useState<string | null>(null)
  const [confirmAction, setConfirmAction] = useState<{ message: string; onConfirm: () => void } | null>(null)
  const [listingFilter, setListingFilter] = useState<'all' | 'active' | 'hidden'>('all')
  const [cleanersList, setCleanersList] = useState<CleanerRow[]>([])
  const [cleanerFilter, setCleanerFilter] = useState<'all' | 'submitted' | 'in_review' | 'approved' | 'rejected'>('submitted')
  const [viewingCleaner, setViewingCleaner] = useState<CleanerRow | null>(null)
  // Per-tab "loading more on search" indicator. Doesn't block the page,
  // just shows in the search bar so the admin knows something's happening.
  const [searching, setSearching] = useState<Record<string, boolean>>({})
  // "New since you last looked" per-tab counts. Realtime INSERT events
  // increment these; switching to a tab resets it to 0.
  const [newCounts, setNewCounts] = useState<Record<string, number>>({})
  // Stats panel refresh state — spinner on the manual button.
  const [statsRefreshing, setStatsRefreshing] = useState(false)
  // Per-tab refs to the search input so "/" can focus the right one.
  const userSearchInputRef = useRef<HTMLInputElement | null>(null)
  const cleanerSearchInputRef = useRef<HTMLInputElement | null>(null)
  const listingSearchInputRef = useRef<HTMLInputElement | null>(null)
  const applicationSearchInputRef = useRef<HTMLInputElement | null>(null)
  const conversationSearchInputRef = useRef<HTMLInputElement | null>(null)
  // Per-tab sort state — default to most-recent (created_at desc).
  const [userSort, setUserSort] = useState<SortState>({ key: 'created_at', dir: 'desc' })
  const [cleanerSort, setCleanerSort] = useState<SortState>({ key: 'created_at', dir: 'desc' })
  const [listingSort, setListingSort] = useState<SortState>({ key: 'created_at', dir: 'desc' })
  const [applicationSort, setApplicationSort] = useState<SortState>({ key: 'created_at', dir: 'desc' })
  // "More to load" flags — set false when a load returns < 25 rows. Hides
  // the Load more button at the bottom of the table. Reset to true on the
  // initial mount load.
  const [hasMore, setHasMore] = useState<Record<string, boolean>>({ users: true, cleaners: true, listings: true, applications: true, conversations: true })
  // "Loading more" spinner state per tab.
  const [loadingMore, setLoadingMore] = useState<Record<string, boolean>>({})
  const supabase = createClient()

  // Tab switcher: sets the tab AND clears the "new since you last looked"
  // counter for that tab, AND syncs the tabRef used by realtime callbacks.
  const switchTab = (next: Tab) => {
    setTab(next)
    tabRef.current = next
    setNewCounts(c => ({ ...c, [next]: 0 }))
  }

  // Wraps the corresponding load function with the current offset (state
  // length) + a per-tab "loadingMore" spinner so the button can show
  // "Loading…". Used by every table's LoadMoreButton.
  const loadMoreFor = async (key: string) => {
    setLoadingMore(m => ({ ...m, [key]: true }))
    try {
      if (key === 'users') await loadUsers('', users.length)
      else if (key === 'cleaners') await loadCleaners('', cleanersList.length)
      else if (key === 'listings') await loadListings('', listings.length)
      else if (key === 'applications') await loadApplications('', applications.length)
      else if (key === 'conversations') await loadConversations('', conversations.length)
    } finally {
      setLoadingMore(m => ({ ...m, [key]: false }))
    }
  }

  // Debounced server-side search: each tab watches its own search state and
  // re-fires the matching load function 300ms after the admin stops typing.
  // The empty-string branch resets to the default 25-row view.
  useEffect(() => {
    const t = setTimeout(() => {
      setSearching(s => ({ ...s, users: true }))
      loadUsers(userSearch).finally(() => setSearching(s => ({ ...s, users: false })))
    }, userSearch ? 300 : 0)
    return () => clearTimeout(t)
  }, [userSearch])
  useEffect(() => {
    const t = setTimeout(() => {
      setSearching(s => ({ ...s, cleaners: true }))
      loadCleaners(cleanerSearch).finally(() => setSearching(s => ({ ...s, cleaners: false })))
    }, cleanerSearch ? 300 : 0)
    return () => clearTimeout(t)
  }, [cleanerSearch])
  useEffect(() => {
    const t = setTimeout(() => {
      setSearching(s => ({ ...s, listings: true }))
      loadListings(listingSearch).finally(() => setSearching(s => ({ ...s, listings: false })))
    }, listingSearch ? 300 : 0)
    return () => clearTimeout(t)
  }, [listingSearch])
  useEffect(() => {
    const t = setTimeout(() => {
      setSearching(s => ({ ...s, applications: true }))
      loadApplications(applicationSearch).finally(() => setSearching(s => ({ ...s, applications: false })))
    }, applicationSearch ? 300 : 0)
    return () => clearTimeout(t)
  }, [applicationSearch])
  useEffect(() => {
    const t = setTimeout(() => {
      setSearching(s => ({ ...s, conversations: true }))
      loadConversations(conversationSearch).finally(() => setSearching(s => ({ ...s, conversations: false })))
    }, conversationSearch ? 300 : 0)
    return () => clearTimeout(t)
  }, [conversationSearch])

  // ─── Realtime: keep refs of the current search + tab in sync ──────────
  // Without these, the realtime callbacks below would close over stale
  // values and reload the wrong search context after an INSERT.
  const userSearchRef = useRef(userSearch); useEffect(() => { userSearchRef.current = userSearch }, [userSearch])
  const cleanerSearchRef = useRef(cleanerSearch); useEffect(() => { cleanerSearchRef.current = cleanerSearch }, [cleanerSearch])
  const listingSearchRef = useRef(listingSearch); useEffect(() => { listingSearchRef.current = listingSearch }, [listingSearch])
  const applicationSearchRef = useRef(applicationSearch); useEffect(() => { applicationSearchRef.current = applicationSearch }, [applicationSearch])
  const conversationSearchRef = useRef(conversationSearch); useEffect(() => { conversationSearchRef.current = conversationSearch }, [conversationSearch])
  const tabRef = useRef<Tab>('overview')

  // ─── Realtime subscriptions ──────────────────────────────────────────
  // INSERTs on cleaners / applications / keyword_violations / clean_requests
  // re-fire the matching list load AND bump the "new since you last looked"
  // counter for that tab (unless the admin is already viewing it). Stats
  // also re-pull because counts change.
  useEffect(() => {
    const bump = (tabName: string) => {
      if (tabRef.current === tabName) return // already looking — no badge
      setNewCounts(c => ({ ...c, [tabName]: (c[tabName] ?? 0) + 1 }))
    }
    const channel = supabase.channel('admin-dashboard-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'cleaners' }, () => {
        loadCleaners(cleanerSearchRef.current); loadStats(); bump('cleaners')
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'applications' }, () => {
        loadApplications(applicationSearchRef.current); loadStats(); bump('applications')
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'keyword_violations' }, () => {
        loadViolations(); loadStats(); bump('violations')
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'clean_requests' }, () => {
        loadListings(listingSearchRef.current); loadStats(); bump('listings')
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'conversations' }, () => {
        loadConversations(conversationSearchRef.current); loadStats()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  // ─── Keyboard shortcuts ────────────────────────────────────────────────
  //   /     → focus the active tab's search box
  //   Esc   → close drawer / modal if one is open
  // Skipped when the user is already typing in a textarea/input so the
  // shortcuts don't fight with normal text entry.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const inField = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable
      if (e.key === '/' && !inField) {
        e.preventDefault()
        const refByTab: Record<string, React.RefObject<HTMLInputElement | null>> = {
          users: userSearchInputRef,
          cleaners: cleanerSearchInputRef,
          listings: listingSearchInputRef,
          applications: applicationSearchInputRef,
          conversations: conversationSearchInputRef,
        }
        refByTab[tabRef.current]?.current?.focus()
        return
      }
      if (e.key === 'Escape') {
        // Drawer / modal close priority — only one should ever be open.
        if (viewingCleaner) { setViewingCleaner(null); return }
        if (viewingConv) { setViewingConv(null); return }
        if (confirmAction) { setConfirmAction(null); return }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [viewingCleaner, viewingConv, confirmAction])

  // Auto-refresh stats every 30s while the admin is on the overview tab.
  // No interval on other tabs — the realtime channel handles incremental
  // updates, and we don't want unnecessary background queries.
  useEffect(() => {
    if (tab !== 'overview') return
    const id = setInterval(() => { loadStats() }, 30000)
    return () => clearInterval(id)
  }, [tab])

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }
      const { data: profile } = await (supabase as any).from('profiles').select('role').eq('id', user.id).single()
      if (!profile || profile.role !== 'admin') { router.replace('/login'); return }
      // Stats + violations don't have a dedicated search effect; everything
      // else is fired by the per-tab search useEffects above (which run on
      // mount with empty search = default 25-row load).
      await Promise.all([loadStats(), loadViolations(), loadKeywords(), loadSettings()])
      setLoading(false)
    }
    init()
  }, [])

  const loadStats = async () => {
    const [{ count: customers }, { count: cleaners }, { count: listingsCount }, { count: apps }, { count: convs }, { count: msgs }, { count: viols }] = await Promise.all([
      (supabase as any).from('customers').select('*', { count: 'exact', head: true }),
      (supabase as any).from('cleaners').select('*', { count: 'exact', head: true }),
      (supabase as any).from('clean_requests').select('*', { count: 'exact', head: true }).eq('status', 'active').not('hidden', 'eq', true),
      (supabase as any).from('applications').select('*', { count: 'exact', head: true }),
      (supabase as any).from('conversations').select('*', { count: 'exact', head: true }),
      (supabase as any).from('messages').select('*', { count: 'exact', head: true }),
      (supabase as any).from('keyword_violations').select('*', { count: 'exact', head: true }).gte('created_at', new Date(Date.now() - 86400000).toISOString()),
    ])
    setStats({ totalCustomers: customers ?? 0, totalCleaners: cleaners ?? 0, activeListings: listingsCount ?? 0, totalApplications: apps ?? 0, totalConversations: convs ?? 0, totalMessages: msgs ?? 0, violationsToday: viols ?? 0 })
  }

  // Default load = 25 most recent. When a search term is supplied, hit the
  // server with an ilike on name + email so we can find people who aren't
  // in the first 25. When offset > 0, we're paginating — append to state
  // rather than replacing, and update hasMore based on the returned count.
  const loadUsers = async (search = '', offset = 0) => {
    let q = (supabase as any)
      .from('profiles')
      .select('id, full_name, email, role, created_at, suspended')
      .in('role', ['customer', 'cleaner'])
      .order('created_at', { ascending: false })
    const s = search.trim()
    if (s) {
      q = q.or(`full_name.ilike.%${s}%,email.ilike.%${s}%`).limit(100)
    } else {
      q = q.range(offset, offset + 24)
    }
    const { data } = await q
    const rows = data ?? []
    if (offset > 0) setUsers(prev => [...prev, ...rows])
    else setUsers(rows)
    if (!s) setHasMore(m => ({ ...m, users: rows.length === 25 }))
  }

  // Two-query load (was N+1 per cleaner). When a search term is supplied,
  // we first find matching profile ids, then load only cleaners whose
  // profile_id is in that set. Default = 25 most recent. Offset > 0
  // paginates (append + update hasMore).
  const loadCleaners = async (search = '', offset = 0) => {
    const s = search.trim()

    // ── Step 1: optional profile-id pre-filter for search ──
    let profileFilterIds: string[] | null = null
    if (s) {
      const { data: matches } = await (supabase as any)
        .from('profiles')
        .select('id')
        .or(`full_name.ilike.%${s}%,email.ilike.%${s}%`)
        .limit(200)
      profileFilterIds = ((matches as any[]) ?? []).map(p => p.id)
      if (profileFilterIds.length === 0) { setCleanersList([]); return }
    }

    // ── Step 2: cleaners (filtered by profile_id when searching) ──
    let cq = (supabase as any)
      .from('cleaners')
      .select('id, profile_id, application_status, submission_reviewed_at, created_at, dbs_checked, has_insurance, right_to_work, interview_notes, interview_qualifying, interview_platform, approved_at, rejected_at, rejection_reason, cleans_completed, dbs_verified, dbs_file_url, dbs_expiry, dbs_uploaded_at, insurance_verified, insurance_file_url, insurance_expiry, insurance_uploaded_at, right_to_work_verified, right_to_work_file_url, right_to_work_expiry, right_to_work_uploaded_at, suspension_reason, suspended_at')
      .order('created_at', { ascending: false })
    if (profileFilterIds) cq = cq.in('profile_id', profileFilterIds).limit(100)
    else cq = cq.range(offset, offset + 24)
    const { data: cleaners } = await cq
    if (!cleaners || (cleaners as any[]).length === 0) {
      if (offset === 0) setCleanersList([])
      if (!s) setHasMore(m => ({ ...m, cleaners: false }))
      return
    }

    // ── Step 3: batch profile lookup (replaces N+1 per-row .single()) ──
    const profileIds = (cleaners as any[]).map(c => c.profile_id)
    const { data: profiles } = await (supabase as any)
      .from('profiles').select('id, full_name, email').in('id', profileIds)
    const pMap = new Map(((profiles as any[]) ?? []).map(p => [p.id, p]))

    const enriched = (cleaners as any[]).map(c => ({
      ...c,
      full_name: (pMap.get(c.profile_id) as any)?.full_name ?? '—',
      email: (pMap.get(c.profile_id) as any)?.email ?? '—',
    })) as CleanerRow[]
    if (offset > 0) setCleanersList(prev => [...prev, ...enriched])
    else setCleanersList(enriched)
    if (!s) setHasMore(m => ({ ...m, cleaners: enriched.length === 25 }))
  }

  // Three-query load (was N+1 per listing). Search matches customer name,
  // customer email, or zone string. Default = 25 most recent. Offset > 0
  // paginates.
  const loadListings = async (search = '', offset = 0) => {
    const s = search.trim()

    // ── Step 1: when searching, build the set of matching customer_ids
    let customerFilterIds: string[] | null = null
    if (s) {
      const { data: matchingProfiles } = await (supabase as any)
        .from('profiles').select('id')
        .or(`full_name.ilike.%${s}%,email.ilike.%${s}%`).limit(200)
      const profileIds = ((matchingProfiles as any[]) ?? []).map(p => p.id)
      if (profileIds.length > 0) {
        const { data: matchingCustomers } = await (supabase as any)
          .from('customers').select('id').in('profile_id', profileIds).limit(200)
        customerFilterIds = ((matchingCustomers as any[]) ?? []).map(c => c.id)
      } else {
        customerFilterIds = []
      }
    }

    // ── Step 2: listings (filtered by zone-match OR customer match) ──
    let rq = (supabase as any)
      .from('clean_requests')
      .select('id, status, created_at, zone, bedrooms, bathrooms, hourly_rate, frequency, customer_id, hidden, hidden_reviewed_at')
      .order('created_at', { ascending: false })
    if (s && customerFilterIds !== null) {
      if (customerFilterIds.length > 0) {
        rq = rq.or(`zone.ilike.%${s}%,customer_id.in.(${customerFilterIds.join(',')})`).limit(100)
      } else {
        // No matching customers — fall back to zone-only search.
        rq = rq.ilike('zone', `%${s}%`).limit(100)
      }
    } else {
      rq = rq.range(offset, offset + 24)
    }
    const { data: reqs } = await rq
    if (!reqs || (reqs as any[]).length === 0) {
      if (offset === 0) setListings([])
      if (!s) setHasMore(m => ({ ...m, listings: false }))
      return
    }

    // ── Step 3: batch customer + profile lookups ──
    const customerIds = Array.from(new Set((reqs as any[]).map(r => r.customer_id)))
    const { data: customers } = await (supabase as any)
      .from('customers').select('id, profile_id').in('id', customerIds)
    const cMap = new Map(((customers as any[]) ?? []).map(c => [c.id, c.profile_id]))
    const profileIds = Array.from(new Set(((customers as any[]) ?? []).map(c => c.profile_id)))
    const { data: profiles } = profileIds.length > 0
      ? await (supabase as any).from('profiles').select('id, full_name, email').in('id', profileIds)
      : { data: [] }
    const pMap = new Map(((profiles as any[]) ?? []).map(p => [p.id, p]))

    const enriched = (reqs as any[]).map(r => {
      const pid = cMap.get(r.customer_id)
      const p = pid ? (pMap.get(pid) as any) : null
      return {
        id: r.id, status: r.status, created_at: r.created_at, zone: r.zone,
        bedrooms: r.bedrooms, bathrooms: r.bathrooms, hourly_rate: r.hourly_rate,
        frequency: r.frequency, hidden: r.hidden ?? false,
        hidden_reviewed_at: r.hidden_reviewed_at ?? null,
        customer_name: p?.full_name ?? 'Unknown',
        customer_email: p?.email ?? '',
      }
    })
    if (offset > 0) setListings(prev => [...prev, ...enriched])
    else setListings(enriched)
    if (!s) setHasMore(m => ({ ...m, listings: enriched.length === 25 }))
  }

  // Helper: given a list of cleaner ids and customer (profiles.id) ids,
  // return Maps from id → full_name. Used by applications and conversations
  // loads which both enrich rows with cleaner + customer names.
  const fetchNameMaps = async (cleanerIds: string[], customerProfileIds: string[]) => {
    const [{ data: cleaners }, { data: customerProfiles }] = await Promise.all([
      cleanerIds.length > 0
        ? (supabase as any).from('cleaners').select('id, profile_id').in('id', cleanerIds)
        : Promise.resolve({ data: [] }),
      customerProfileIds.length > 0
        ? (supabase as any).from('profiles').select('id, full_name').in('id', customerProfileIds)
        : Promise.resolve({ data: [] }),
    ])
    // Cleaners → cleaner.profile_id → profile.full_name
    const cleanerProfileIds = ((cleaners as any[]) ?? []).map(c => c.profile_id)
    const { data: cleanerProfiles } = cleanerProfileIds.length > 0
      ? await (supabase as any).from('profiles').select('id, full_name').in('id', cleanerProfileIds)
      : { data: [] }
    const cProfileMap = new Map(((cleanerProfiles as any[]) ?? []).map(p => [p.id, p.full_name]))
    const cleanerNameMap = new Map(((cleaners as any[]) ?? []).map(c => [c.id, cProfileMap.get(c.profile_id) ?? 'Unknown']))
    const customerNameMap = new Map(((customerProfiles as any[]) ?? []).map(p => [p.id, p.full_name ?? 'Unknown']))
    return { cleanerNameMap, customerNameMap }
  }

  // Batch-load with optional text search across cleaner name / customer name / zone.
  // Default = 25 most recent, search = up to 100 matches. Offset > 0 paginates.
  const loadApplications = async (search = '', offset = 0) => {
    const s = search.trim()
    const { data: apps } = s
      ? await searchApplications(s)
      : await (supabase as any).from('applications').select('id, status, created_at, message, cleaner_id, request_id, pending_reviewed_at').order('created_at', { ascending: false }).range(offset, offset + 24)
    if (!apps || (apps as any[]).length === 0) {
      if (offset === 0) setApplications([])
      if (!s) setHasMore(m => ({ ...m, applications: false }))
      return
    }

    // Batch-fetch request zones + customer_ids
    const reqIds = Array.from(new Set((apps as any[]).map(a => a.request_id)))
    const { data: reqs } = await (supabase as any).from('clean_requests').select('id, zone, customer_id').in('id', reqIds)
    const reqMap = new Map(((reqs as any[]) ?? []).map(r => [r.id, r]))

    // Build cleaner-id + customer-profile-id sets
    const cleanerIds = Array.from(new Set((apps as any[]).map(a => a.cleaner_id)))
    const customerIds = Array.from(new Set(((reqs as any[]) ?? []).map(r => r.customer_id)))
    const { data: customers } = customerIds.length > 0
      ? await (supabase as any).from('customers').select('id, profile_id').in('id', customerIds)
      : { data: [] }
    const customerProfileIdMap = new Map(((customers as any[]) ?? []).map(c => [c.id, c.profile_id]))
    const customerProfileIds = Array.from(new Set(Array.from(customerProfileIdMap.values()))) as string[]

    const { cleanerNameMap, customerNameMap } = await fetchNameMaps(cleanerIds, customerProfileIds)

    const enriched = (apps as any[]).map(app => {
      const r = (reqMap.get(app.request_id) as any) ?? {}
      const customerProfileId = customerProfileIdMap.get(r.customer_id)
      return {
        id: app.id, status: app.status, created_at: app.created_at, message: app.message,
        pending_reviewed_at: app.pending_reviewed_at ?? null,
        cleaner_name: cleanerNameMap.get(app.cleaner_id) ?? 'Unknown',
        customer_name: customerProfileId ? (customerNameMap.get(customerProfileId) ?? 'Unknown') : 'Unknown',
        zone: r.zone ?? '—',
      }
    })
    if (offset > 0) setApplications(prev => [...prev, ...enriched])
    else setApplications(enriched)
    if (!s) setHasMore(m => ({ ...m, applications: enriched.length === 25 }))
  }

  // Server-side search across applications by joining through the related
  // tables. We pre-resolve which cleaner/customer/zone ids match the term,
  // then pull applications referencing any of them.
  const searchApplications = async (s: string) => {
    // Profile name matches (covers both cleaner-side and customer-side names)
    const { data: matchingProfiles } = await (supabase as any)
      .from('profiles').select('id').ilike('full_name', `%${s}%`).limit(200)
    const matchedProfileIds = ((matchingProfiles as any[]) ?? []).map(p => p.id)

    // Cleaner ids whose profile_id is in the matched set
    const { data: matchingCleaners } = matchedProfileIds.length > 0
      ? await (supabase as any).from('cleaners').select('id').in('profile_id', matchedProfileIds).limit(200)
      : { data: [] }
    const cleanerIdMatches = ((matchingCleaners as any[]) ?? []).map(c => c.id)

    // Customer ids whose profile_id is in the matched set
    const { data: matchingCustomers } = matchedProfileIds.length > 0
      ? await (supabase as any).from('customers').select('id').in('profile_id', matchedProfileIds).limit(200)
      : { data: [] }
    const customerIdMatches = ((matchingCustomers as any[]) ?? []).map(c => c.id)

    // Request ids whose zone matches OR whose customer is in the matched set
    const { data: matchingReqs } = await (supabase as any)
      .from('clean_requests').select('id').or(
        customerIdMatches.length > 0
          ? `zone.ilike.%${s}%,customer_id.in.(${customerIdMatches.join(',')})`
          : `zone.ilike.%${s}%`
      ).limit(200)
    const reqIdMatches = ((matchingReqs as any[]) ?? []).map(r => r.id)

    // Final OR: cleaner match OR request match
    const orParts: string[] = []
    if (cleanerIdMatches.length > 0) orParts.push(`cleaner_id.in.(${cleanerIdMatches.join(',')})`)
    if (reqIdMatches.length > 0) orParts.push(`request_id.in.(${reqIdMatches.join(',')})`)
    if (orParts.length === 0) return { data: [] }
    return (supabase as any)
      .from('applications').select('id, status, created_at, message, cleaner_id, request_id, pending_reviewed_at')
      .or(orParts.join(',')).order('created_at', { ascending: false }).limit(100)
  }

  const loadConversations = async (search = '', offset = 0) => {
    const s = search.trim()
    const { data: convs } = s
      ? await searchConversations(s)
      : await (supabase as any).from('conversations').select('id, created_at, cleaner_id, customer_id, clean_request_id').order('created_at', { ascending: false }).range(offset, offset + 24)
    if (!convs || (convs as any[]).length === 0) {
      if (offset === 0) setConversations([])
      if (!s) setHasMore(m => ({ ...m, conversations: false }))
      return
    }

    // Batch zone lookup
    const reqIds = Array.from(new Set((convs as any[]).map(c => c.clean_request_id)))
    const { data: reqs } = reqIds.length > 0
      ? await (supabase as any).from('clean_requests').select('id, zone').in('id', reqIds)
      : { data: [] }
    const zoneMap = new Map(((reqs as any[]) ?? []).map(r => [r.id, r.zone]))

    // Batch cleaner + customer (customer_id on conversations is profiles.id directly)
    const cleanerIds = Array.from(new Set((convs as any[]).map(c => c.cleaner_id)))
    const customerProfileIds = Array.from(new Set((convs as any[]).map(c => c.customer_id)))
    const { cleanerNameMap, customerNameMap } = await fetchNameMaps(cleanerIds, customerProfileIds)

    // Batch last-message + count per conversation. Single query for the
    // latest message per conv, plus a separate count query. Both replace
    // the previous per-row .limit(1) inside the loop.
    const convIds = (convs as any[]).map(c => c.id)
    const { data: latestMsgs } = convIds.length > 0
      ? await (supabase as any)
          .from('messages').select('conversation_id, content, created_at')
          .in('conversation_id', convIds).order('created_at', { ascending: false })
      : { data: [] }
    const lastByConv = new Map<string, { content: string; created_at: string }>()
    const countByConv = new Map<string, number>()
    for (const m of ((latestMsgs as any[]) ?? [])) {
      countByConv.set(m.conversation_id, (countByConv.get(m.conversation_id) ?? 0) + 1)
      if (!lastByConv.has(m.conversation_id)) lastByConv.set(m.conversation_id, { content: m.content, created_at: m.created_at })
    }

    const enriched = (convs as any[]).map(c => ({
      id: c.id, created_at: c.created_at, cleaner_id: c.cleaner_id,
      cleaner_name: cleanerNameMap.get(c.cleaner_id) ?? 'Unknown',
      customer_name: customerNameMap.get(c.customer_id) ?? 'Unknown',
      zone: zoneMap.get(c.clean_request_id) ?? '—',
      message_count: countByConv.get(c.id) ?? 0,
      last_message: lastByConv.get(c.id)?.content ?? '',
      last_message_at: lastByConv.get(c.id)?.created_at ?? null,
    }))
    if (offset > 0) setConversations(prev => [...prev, ...enriched])
    else setConversations(enriched)
    if (!s) setHasMore(m => ({ ...m, conversations: enriched.length === 25 }))
  }

  const searchConversations = async (s: string) => {
    // Same profile-name match → cleaner/customer id resolution as
    // searchApplications. Conversations.customer_id is profiles.id directly,
    // so we OR profile_ids in instead of customer_ids.
    const { data: matchingProfiles } = await (supabase as any)
      .from('profiles').select('id').ilike('full_name', `%${s}%`).limit(200)
    const matchedProfileIds = ((matchingProfiles as any[]) ?? []).map(p => p.id)

    const { data: matchingCleaners } = matchedProfileIds.length > 0
      ? await (supabase as any).from('cleaners').select('id').in('profile_id', matchedProfileIds).limit(200)
      : { data: [] }
    const cleanerIdMatches = ((matchingCleaners as any[]) ?? []).map(c => c.id)

    const orParts: string[] = []
    if (cleanerIdMatches.length > 0) orParts.push(`cleaner_id.in.(${cleanerIdMatches.join(',')})`)
    if (matchedProfileIds.length > 0) orParts.push(`customer_id.in.(${matchedProfileIds.join(',')})`)
    if (orParts.length === 0) return { data: [] }
    return (supabase as any)
      .from('conversations').select('id, created_at, cleaner_id, customer_id, clean_request_id')
      .or(orParts.join(',')).order('created_at', { ascending: false }).limit(100)
  }

  // No text search on violations — they're a small daily list. Just batch
  // the profile lookup to remove the N+1.
  const loadViolations = async () => {
    const { data } = await (supabase as any)
      .from('keyword_violations')
      .select('id, created_at, conversation_id, message_content, triggered_keywords, sender_role, sender_id, reviewed_at')
      .order('created_at', { ascending: false }).limit(100)
    if (!data) return
    const senderIds = Array.from(new Set((data as any[]).map(v => v.sender_id)))
    const { data: profiles } = senderIds.length > 0
      ? await (supabase as any).from('profiles').select('id, full_name').in('id', senderIds)
      : { data: [] }
    const pMap = new Map(((profiles as any[]) ?? []).map(p => [p.id, p.full_name]))
    const enriched = (data as any[]).map(v => ({ ...v, sender_name: pMap.get(v.sender_id) ?? 'Unknown' }))
    setViolations(enriched)
  }

  // ─── Keyword + settings loads ────────────────────────────────────────────
  const loadKeywords = async () => {
    try {
      const res = await fetch('/api/admin/keywords', { credentials: 'include' })
      if (!res.ok) return
      const json = await res.json() as { keywords?: KeywordRow[] }
      setKeywords(json.keywords ?? [])
    } catch (e) { /* non-fatal */ }
  }

  const addKeyword = async () => {
    const k = newKeyword.trim().toLowerCase()
    if (!k) return
    setSavingKeyword(true); setKeywordError(null)
    try {
      const res = await fetch('/api/admin/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: k }),
      })
      const json = await res.json()
      if (!res.ok) {
        setKeywordError(json.error ?? 'Failed to add keyword')
        return
      }
      setNewKeyword('')
      await loadKeywords()
    } finally {
      setSavingKeyword(false)
    }
  }

  const removeKeyword = async (id: string) => {
    const res = await fetch(`/api/admin/keywords?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
    if (res.ok) setKeywords(prev => prev.filter(k => k.id !== id))
  }

  const loadSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings', { credentials: 'include' })
      if (!res.ok) return
      const json = await res.json() as { settings?: Record<string, any> }
      const v = json.settings?.hourly_violation_digest
      setDigestOn(v === true || v === 'true')
    } catch (e) {}
  }

  const toggleDigest = async (next: boolean) => {
    setSavingDigest(true)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'hourly_violation_digest', value: next }),
      })
      if (res.ok) setDigestOn(next)
    } finally {
      setSavingDigest(false)
    }
  }

  // Open a conversation by id even if it's not in the currently loaded
  // `conversations` set. Used by the violation cards' "View chat" button
  // (a violation can come from any age of conversation, not just the 25
  // loaded into the table).
  const openConversationById = async (convId: string) => {
    const existing = conversations.find(c => c.id === convId)
    if (existing) { setViewingConv(existing); return }
    setLoadingConv(convId)
    try {
      const { data: conv } = await (supabase as any)
        .from('conversations')
        .select('id, created_at, cleaner_id, customer_id, clean_request_id')
        .eq('id', convId).single()
      if (!conv) return
      const [{ data: req }, { cleanerNameMap, customerNameMap }] = await Promise.all([
        (supabase as any).from('clean_requests').select('zone').eq('id', conv.clean_request_id).single(),
        fetchNameMaps([conv.cleaner_id], [conv.customer_id]),
      ])
      const enriched: ConversationRow = {
        id: conv.id, created_at: conv.created_at, cleaner_id: conv.cleaner_id,
        cleaner_name: cleanerNameMap.get(conv.cleaner_id) ?? 'Unknown',
        customer_name: customerNameMap.get(conv.customer_id) ?? 'Unknown',
        zone: req?.zone ?? '—',
        message_count: 0, last_message: '', last_message_at: null,
      }
      setViewingConv(enriched)
    } finally {
      setLoadingConv(null)
    }
  }

  // Generic dismiss-from-badge helper.
  const dismissReview = async (entityType: 'cleaner' | 'application' | 'listing' | 'violation', entityId: string) => {
    const ok = await adminAction({ action: 'dismiss_review', entityType, entityId, dismissed: true })
    if (!ok) return
    const stamp = new Date().toISOString()
    if (entityType === 'cleaner') setCleanersList(prev => prev.map(c => c.id === entityId ? { ...c, submission_reviewed_at: stamp } : c))
    if (entityType === 'application') setApplications(prev => prev.map(a => a.id === entityId ? { ...a, pending_reviewed_at: stamp } : a))
    if (entityType === 'listing') setListings(prev => prev.map(l => l.id === entityId ? { ...l, hidden_reviewed_at: stamp } : l))
    if (entityType === 'violation') setViolations(prev => prev.map(v => v.id === entityId ? { ...v, reviewed_at: stamp } : v))
  }

  const suspendUser = async (userId: string, suspended: boolean) => {
    const ok = await adminAction({ action: 'suspend_user', userId, suspended })
    if (ok) setUsers(prev => prev.map(u => u.id === userId ? { ...u, suspended } : u))
  }

  const hideListing = async (id: string, hidden: boolean) => {
    const ok = await adminAction({ action: 'hide_listing', listingId: id, hidden })
    if (ok) setListings(prev => prev.map(l => l.id === id ? { ...l, hidden } : l))
  }

  const deleteListing = async (id: string) => {
    const ok = await adminAction({ action: 'delete_listing', listingId: id })
    if (ok) setListings(prev => prev.filter(l => l.id !== id))
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

  // Search is now server-side, so client-side filtering of users + listings
  // is a pass-through (kept as aliases for the template's existing refs).
  // The listing filter (all/active/hidden) stays client-side because it's
  // an attribute the admin toggles on the loaded set, not a search term.
  const filteredUsers = users
  const filteredListings = listings
    .filter(l => listingFilter === 'all' ? true : listingFilter === 'hidden' ? l.hidden : !l.hidden && l.status !== 'deleted')

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'users', label: 'Users', icon: '👥' },
    { id: 'cleaners', label: 'Cleaners', icon: '🧹' },
    { id: 'listings', label: 'Listings', icon: '🏠' },
    { id: 'applications', label: 'Applications', icon: '📋' },
    { id: 'conversations', label: 'Conversations', icon: '💬' },
    { id: 'violations', label: 'Violations', icon: '🚨' },
    { id: 'keywords', label: 'Keywords', icon: '🔑' },
    { id: 'customer-view', label: 'Customer view', icon: '👤' },
    { id: 'cleaner-view', label: 'Cleaner view', icon: '🧹' },
    { id: 'tests', label: 'Tests', icon: '🧪' },
  ]

  // ─── Work-queue counts shown in tab badges ──────────────────────────────
  // A row contributes to the badge when:
  //   - its state still calls for admin attention (submitted/pending/hidden
  //     for the list tabs; today's date for violations), AND
  //   - admin has not explicitly dismissed it via dismiss_review.
  // Acting on a row (approve/reject/un-hide) clears the underlying state and
  // therefore the badge entry; "Dismiss" leaves the state alone but sets
  // *_reviewed_at so the row drops off the badge.
  const startOfToday = (() => { const d = new Date(); d.setHours(0,0,0,0); return d.getTime() })()
  const needsReview = {
    cleaners: cleanersList.filter(c =>
      (c.application_status === 'submitted' || c.application_status === 'in_review') &&
      !c.submission_reviewed_at
    ),
    applications: applications.filter(a => a.status === 'pending' && !a.pending_reviewed_at),
    listings: listings.filter(l => l.hidden && !l.hidden_reviewed_at),
    violations: violations.filter(v => new Date(v.created_at).getTime() >= startOfToday && !v.reviewed_at),
  }

  return (
    <>
      <style>{`* { box-sizing: border-box; }`}</style>
      <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'DM Sans', sans-serif" }}>
        <Header userRole="admin" />
        <div style={{ maxWidth: '1300px', margin: '0 auto', padding: '40px 24px 80px' }}>

          <div style={{ marginBottom: '32px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>Admin Portal</h1>
              <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>Full platform visibility and controls</p>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <button onClick={() => switchTab('customer-view')} style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>👤 Customer view</button>
              <button onClick={() => switchTab('cleaner-view')} style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>🧹 Cleaner view</button>
              <button onClick={async () => { const supabase = createClient(); await supabase.auth.signOut(); router.refresh(); router.replace('/') }}
                style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Sign out</button>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '4px', marginBottom: '32px', background: 'white', padding: '4px', borderRadius: '12px', border: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => switchTab(t.id)} style={{ padding: '8px 14px', borderRadius: '9px', border: 'none', cursor: 'pointer', background: tab === t.id ? '#0f172a' : 'transparent', color: tab === t.id ? 'white' : '#64748b', fontSize: '12px', fontWeight: 600, fontFamily: "'DM Sans', sans-serif", display: 'flex', alignItems: 'center', gap: '5px' }}>
                {t.icon} {t.label}
                {/* Persistent "needs review" badges — count = rows where the
                    underlying state still needs admin attention AND admin
                    hasn't dismissed them. Acting on or dismissing the rows
                    clears the badge. */}
                {t.id === 'cleaners' && needsReview.cleaners.length > 0 && (
                  <span style={{ background: '#2563eb', color: 'white', borderRadius: '100px', padding: '0 5px', fontSize: '10px', fontWeight: 700 }}>{needsReview.cleaners.length}</span>
                )}
                {t.id === 'applications' && needsReview.applications.length > 0 && (
                  <span style={{ background: '#2563eb', color: 'white', borderRadius: '100px', padding: '0 5px', fontSize: '10px', fontWeight: 700 }}>{needsReview.applications.length}</span>
                )}
                {t.id === 'violations' && needsReview.violations.length > 0 && (
                  <span style={{ background: '#ef4444', color: 'white', borderRadius: '100px', padding: '0 5px', fontSize: '10px', fontWeight: 700 }}>{needsReview.violations.length}</span>
                )}
                {t.id === 'listings' && needsReview.listings.length > 0 && (
                  <span style={{ background: '#f59e0b', color: 'white', borderRadius: '100px', padding: '0 5px', fontSize: '10px', fontWeight: 700 }}>{needsReview.listings.length}</span>
                )}
                {/* "+N new" pulse for rows that arrived via realtime since the admin last opened this tab */}
                {(newCounts[t.id] ?? 0) > 0 && tab !== t.id && (
                  <span style={{ background: '#22c55e', color: 'white', borderRadius: '100px', padding: '0 5px', fontSize: '10px', fontWeight: 700, marginLeft: '2px' }} title={`${newCounts[t.id]} new since you looked`}>+{newCounts[t.id]}</span>
                )}
              </button>
            ))}
          </div>

          {/* ── Overview ── */}
          {tab === 'overview' && stats && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ fontSize: '13px', color: '#94a3b8' }}>Auto-refreshes every 30 seconds while this tab is open</div>
                <button
                  onClick={async () => { setStatsRefreshing(true); await loadStats(); setStatsRefreshing(false) }}
                  disabled={statsRefreshing}
                  style={{ background: 'white', color: '#0f172a', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '6px 14px', fontSize: '12px', fontWeight: 600, cursor: statsRefreshing ? 'wait' : 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                  {statsRefreshing ? 'Refreshing…' : '↻ Refresh now'}
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px', marginBottom: '32px' }}>
                <StatCard label="Customers" value={stats.totalCustomers} color="#16a085" />
                <StatCard label="Cleaners" value={stats.totalCleaners} color="#2563eb" />
                <StatCard label="Active listings" value={stats.activeListings} color="#8e44ad" />
                <StatCard label="Applications" value={stats.totalApplications} color="#e67e22" />
                <StatCard label="Conversations" value={stats.totalConversations} color="#0f172a" />
                <StatCard label="Total messages" value={stats.totalMessages} color="#0f172a" />
                <StatCard label="Violations today" value={stats.violationsToday} color={stats.violationsToday > 0 ? '#dc2626' : '#22c55e'} sub={stats.violationsToday > 0 ? 'Needs attention' : 'All clear'} />
              </div>
              {/* Hourly digest toggle — when ON, /api/log-violation skips
                  per-event email and the cron sends a roll-up every hour;
                  when OFF, every violation emails the admin in real time. */}
              <div style={{ background: 'white', borderRadius: '14px', border: '1.5px solid #e2e8f0', padding: '14px 18px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '240px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>Hourly violation digest</div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                    {digestOn === null ? 'Loading…' : digestOn ? 'On — one summary email per hour (the in-portal badge still pings in real time).' : 'Off — every violation sends a separate email to all admins.'}
                  </div>
                </div>
                <button
                  onClick={() => digestOn !== null && toggleDigest(!digestOn)}
                  disabled={digestOn === null || savingDigest}
                  style={{
                    background: digestOn ? '#16a34a' : 'white',
                    color: digestOn ? 'white' : '#0f172a',
                    border: `1px solid ${digestOn ? '#16a34a' : '#e2e8f0'}`,
                    borderRadius: '999px', padding: '6px 16px', fontSize: '12px', fontWeight: 700,
                    cursor: digestOn === null || savingDigest ? 'wait' : 'pointer',
                    fontFamily: "'DM Sans', sans-serif", minWidth: '80px',
                  }}
                >
                  {savingDigest ? '…' : digestOn ? 'On' : 'Off'}
                </button>
              </div>
              {violations.length > 0 && (
                <div style={{ background: 'white', borderRadius: '16px', border: '1.5px solid #fecaca', padding: '20px 24px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#dc2626', marginBottom: '16px' }}>🚨 Recent keyword violations</div>
                  {violations.slice(0, 5).map(v => (
                    <div key={v.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13px', color: '#0f172a', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>"{v.message_content}"</div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>{v.sender_name} · {v.sender_role} · {ago(v.created_at)}</div>
                      </div>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', flexShrink: 0 }}>
                        {v.triggered_keywords.map(k => (<span key={k} style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '4px', padding: '1px 6px', fontSize: '10px', fontWeight: 700 }}>{k}</span>))}
                      </div>
                    </div>
                  ))}
                  {violations.length > 5 && <button onClick={() => switchTab('violations')} style={{ marginTop: '12px', background: 'none', border: 'none', color: '#dc2626', fontSize: '12px', fontWeight: 700, cursor: 'pointer', padding: 0 }}>View all {violations.length} violations →</button>}
                </div>
              )}
            </div>
          )}

          {/* ── Cleaners (approval CRM) ── */}
          {tab === 'cleaners' && (
            <div>
              <div style={{ marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                <input ref={cleanerSearchInputRef} value={cleanerSearch} onChange={e => setCleanerSearch(e.target.value)} placeholder="Search by name or email… (/)" style={{ padding: '10px 16px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '14px', fontFamily: "'DM Sans', sans-serif", outline: 'none', width: '300px', color: '#0f172a' }} />
                {searching.cleaners && <span style={{ fontSize: '12px', color: '#94a3b8' }}>Searching…</span>}
                <span style={{ fontSize: '13px', color: '#94a3b8' }}>{cleanersList.length} {cleanerSearch ? 'match' : 'recent'}{cleanersList.length === 1 ? '' : 'es'}</span>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
                <PipelineCount label="Submitted" count={cleanersList.filter(c => c.application_status === 'submitted').length} color="#2563eb" active={cleanerFilter === 'submitted'} onClick={() => setCleanerFilter('submitted')} />
                <PipelineCount label="In review" count={cleanersList.filter(c => c.application_status === 'in_review').length} color="#f59e0b" active={cleanerFilter === 'in_review'} onClick={() => setCleanerFilter('in_review')} />
                <PipelineCount label="Approved" count={cleanersList.filter(c => c.application_status === 'approved').length} color="#16a34a" active={cleanerFilter === 'approved'} onClick={() => setCleanerFilter('approved')} />
                <PipelineCount label="Rejected" count={cleanersList.filter(c => c.application_status === 'rejected').length} color="#dc2626" active={cleanerFilter === 'rejected'} onClick={() => setCleanerFilter('rejected')} />
                <PipelineCount label="All" count={cleanersList.length} color="#0f172a" active={cleanerFilter === 'all'} onClick={() => setCleanerFilter('all')} />
              </div>

              <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead><tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <SortableTh label="Cleaner" sortKey="full_name" state={cleanerSort} onChange={k => setCleanerSort(s => flipSort(s, k))} />
                    <SortableTh label="Email" sortKey="email" state={cleanerSort} onChange={k => setCleanerSort(s => flipSort(s, k))} />
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Checks</th>
                    <SortableTh label="Signed up" sortKey="created_at" state={cleanerSort} onChange={k => setCleanerSort(s => flipSort(s, k))} />
                    <SortableTh label="Status" sortKey="application_status" state={cleanerSort} onChange={k => setCleanerSort(s => flipSort(s, k))} />
                    <th style={{ padding: '12px 16px' }}></th>
                  </tr></thead>
                  <tbody>
                    {sortRows(cleanersList.filter(c => cleanerFilter === 'all' ? true : (c.application_status ?? 'submitted') === cleanerFilter), cleanerSort)
                      .map((c, i, arr) => {
                        const isBadgeRow = (c.application_status === 'submitted' || c.application_status === 'in_review') && !c.submission_reviewed_at
                        return (
                        <tr key={c.id} style={{ borderBottom: i < arr.length - 1 ? '1px solid #f1f5f9' : 'none', background: isBadgeRow ? '#eff6ff' : 'white', borderLeft: isBadgeRow ? '3px solid #2563eb' : '3px solid transparent' }}>
                          <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f172a' }}>{c.full_name}</td>
                          <td style={{ padding: '12px 16px', color: '#64748b' }}>{c.email}</td>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <span title="DBS" style={{ fontSize: '11px', opacity: c.dbs_checked ? 1 : 0.25 }}>🛡️</span>
                              <span title="Insurance" style={{ fontSize: '11px', opacity: c.has_insurance ? 1 : 0.25 }}>📋</span>
                              <span title="Right to work" style={{ fontSize: '11px', opacity: c.right_to_work ? 1 : 0.25 }}>✅</span>
                            </div>
                          </td>
                          <td style={{ padding: '12px 16px', color: '#94a3b8', whiteSpace: 'nowrap' }}>{dual(c.created_at)}</td>
                          <td style={{ padding: '12px 16px' }}>
                            <Badge
                              label={c.application_status ?? 'submitted'}
                              color={
                                c.application_status === 'approved' ? 'green' :
                                c.application_status === 'rejected' ? 'red' :
                                c.application_status === 'in_review' ? 'yellow' :
                                c.application_status === 'suspended' ? 'red' : 'blue'
                              }
                            />
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                              <button onClick={() => setViewingCleaner(c)} style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '4px 12px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                                Review →
                              </button>
                              {isBadgeRow && (
                                <button title="Hide from notification badge without acting" onClick={() => dismissReview('cleaner', c.id)} style={{ background: 'white', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '4px 10px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                                  ✕ Dismiss
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )})}
                    {cleanersList.filter(c => cleanerFilter === 'all' ? true : (c.application_status ?? 'submitted') === cleanerFilter).length === 0 && (
                      <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>No cleaners in this state</td></tr>
                    )}
                  </tbody>
                </table>
                <LoadMoreButton visible={!cleanerSearch && (hasMore.cleaners ?? true)} loading={!!loadingMore.cleaners} onClick={() => loadMoreFor('cleaners')} />
              </div>
            </div>
          )}

          {/* ── Users ── */}
          {tab === 'users' && (
            <div>
              <div style={{ marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                <input ref={userSearchInputRef} value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="Search by name or email… (/)" style={{ padding: '10px 16px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '14px', fontFamily: "'DM Sans', sans-serif", outline: 'none', width: '300px', color: '#0f172a' }} />
                {searching.users && <span style={{ fontSize: '12px', color: '#94a3b8' }}>Searching…</span>}
                <span style={{ fontSize: '13px', color: '#94a3b8' }}>{filteredUsers.length} {userSearch ? 'matches' : 'recent users'}</span>
              </div>
              <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead><tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <SortableTh label="Name" sortKey="full_name" state={userSort} onChange={k => setUserSort(s => flipSort(s, k))} />
                    <SortableTh label="Email" sortKey="email" state={userSort} onChange={k => setUserSort(s => flipSort(s, k))} />
                    <SortableTh label="Role" sortKey="role" state={userSort} onChange={k => setUserSort(s => flipSort(s, k))} />
                    <SortableTh label="Joined" sortKey="created_at" state={userSort} onChange={k => setUserSort(s => flipSort(s, k))} />
                    <SortableTh label="Status" sortKey="suspended" state={userSort} onChange={k => setUserSort(s => flipSort(s, k))} />
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Actions</th>
                  </tr></thead>
                  <tbody>
                    {sortRows(filteredUsers, userSort).map((u, i, arr) => (
                      <tr key={u.id} style={{ borderBottom: i < filteredUsers.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f172a' }}>{u.full_name}</td>
                        <td style={{ padding: '12px 16px', color: '#64748b' }}>{u.email}</td>
                        <td style={{ padding: '12px 16px' }}><Badge label={u.role} color={u.role === 'cleaner' ? 'blue' : 'green'} /></td>
                        <td style={{ padding: '12px 16px', color: '#94a3b8', whiteSpace: 'nowrap' }}>{dual(u.created_at)}</td>
                        <td style={{ padding: '12px 16px' }}><Badge label={u.suspended ? 'Suspended' : 'Active'} color={u.suspended ? 'red' : 'green'} /></td>
                        <td style={{ padding: '12px 16px' }}>
                          <button onClick={() => suspendUser(u.id, !u.suspended)} style={{ background: u.suspended ? '#f0fdf4' : '#fef2f2', color: u.suspended ? '#15803d' : '#dc2626', border: `1px solid ${u.suspended ? '#bbf7d0' : '#fecaca'}`, borderRadius: '8px', padding: '4px 12px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                            {u.suspended ? 'Reinstate' : 'Suspend'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <LoadMoreButton visible={!userSearch && (hasMore.users ?? true)} loading={!!loadingMore.users} onClick={() => loadMoreFor('users')} />
              </div>
            </div>
          )}

          {/* ── Listings ── */}
          {tab === 'listings' && (
            <div>
              <div style={{ marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                <input ref={listingSearchInputRef} value={listingSearch} onChange={e => setListingSearch(e.target.value)} placeholder="Search by customer or zone… (/)" style={{ padding: '10px 16px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '14px', fontFamily: "'DM Sans', sans-serif", outline: 'none', width: '280px', color: '#0f172a' }} />
                {searching.listings && <span style={{ fontSize: '12px', color: '#94a3b8' }}>Searching…</span>}
                <div style={{ display: 'flex', gap: '4px', background: 'white', padding: '4px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  {(['all', 'active', 'hidden'] as const).map(f => <button key={f} onClick={() => setListingFilter(f)} style={{ padding: '5px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: listingFilter === f ? '#0f172a' : 'transparent', color: listingFilter === f ? 'white' : '#64748b', fontSize: '12px', fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>{f.charAt(0).toUpperCase() + f.slice(1)}</button>)}
                </div>
                <span style={{ fontSize: '13px', color: '#94a3b8' }}>{filteredListings.length} listings</span>
              </div>
              <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead><tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <SortableTh label="Customer" sortKey="customer_name" state={listingSort} onChange={k => setListingSort(s => flipSort(s, k))} />
                    <SortableTh label="Zone" sortKey="zone" state={listingSort} onChange={k => setListingSort(s => flipSort(s, k))} />
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Details</th>
                    <SortableTh label="Status" sortKey="status" state={listingSort} onChange={k => setListingSort(s => flipSort(s, k))} />
                    <SortableTh label="Posted" sortKey="created_at" state={listingSort} onChange={k => setListingSort(s => flipSort(s, k))} />
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Actions</th>
                  </tr></thead>
                  <tbody>
                    {sortRows(filteredListings, listingSort).map((l, i) => {
                      const isBadgeRow = l.hidden && !l.hidden_reviewed_at
                      return (
                      <tr key={l.id} style={{ borderBottom: i < filteredListings.length - 1 ? '1px solid #f1f5f9' : 'none', opacity: l.hidden ? 0.6 : 1, background: isBadgeRow ? '#fff7ed' : 'white', borderLeft: isBadgeRow ? '3px solid #f59e0b' : '3px solid transparent' }}>
                        <td style={{ padding: '12px 16px' }}><div style={{ fontWeight: 600, color: '#0f172a' }}>{l.customer_name}</div><div style={{ fontSize: '11px', color: '#94a3b8' }}>{l.customer_email}</div></td>
                        <td style={{ padding: '12px 16px', color: '#64748b' }}>{ZONE_LABELS[l.zone ?? ''] ?? l.zone ?? '—'}</td>
                        <td style={{ padding: '12px 16px', color: '#64748b' }}>{l.bedrooms}bd · {l.bathrooms}ba · £{l.hourly_rate}/hr · {l.frequency}</td>
                        <td style={{ padding: '12px 16px' }}><div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}><Badge label={l.status} color={l.status === 'active' ? 'green' : l.status === 'pending_review' ? 'yellow' : 'gray'} />{l.hidden && <Badge label="Hidden" color="orange" />}</div></td>
                        <td style={{ padding: '12px 16px', color: '#94a3b8', whiteSpace: 'nowrap' }}>{dual(l.created_at)}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            <button onClick={() => hideListing(l.id, !l.hidden)} style={{ background: l.hidden ? '#fff7ed' : '#f8fafc', color: l.hidden ? '#c2410c' : '#64748b', border: `1px solid ${l.hidden ? '#fed7aa' : '#e2e8f0'}`, borderRadius: '6px', padding: '4px 10px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>{l.hidden ? '👁 Unhide' : '🚫 Hide'}</button>
                            {isBadgeRow && (
                              <button title="Hide from notification badge without un-hiding the listing" onClick={() => dismissReview('listing', l.id)} style={{ background: 'white', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '4px 10px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>✕ Dismiss</button>
                            )}
                            <button onClick={() => setConfirmAction({ message: `Permanently delete this listing from ${l.customer_name}? This cannot be undone.`, onConfirm: () => { deleteListing(l.id); setConfirmAction(null) } })} style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '6px', padding: '4px 10px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>🗑 Delete</button>
                          </div>
                        </td>
                      </tr>
                    )})}
                  </tbody>
                </table>
                <LoadMoreButton visible={!listingSearch && (hasMore.listings ?? true)} loading={!!loadingMore.listings} onClick={() => loadMoreFor('listings')} />
              </div>
              <div style={{ marginTop: '16px', padding: '14px 18px', background: '#fefce8', border: '1px solid #fef08a', borderRadius: '10px', fontSize: '13px', color: '#92400e' }}>
                💡 <strong>Hidden</strong> listings are removed from the cleaner jobs page but remain in the database. <strong>Delete</strong> marks them as deleted — irreversible from here but recoverable via Supabase if needed.
              </div>
            </div>
          )}

          {/* ── Applications ── */}
          {tab === 'applications' && (
            <div>
              <div style={{ marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                <input ref={applicationSearchInputRef} value={applicationSearch} onChange={e => setApplicationSearch(e.target.value)} placeholder="Search by cleaner, customer or zone… (/)" style={{ padding: '10px 16px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '14px', fontFamily: "'DM Sans', sans-serif", outline: 'none', width: '320px', color: '#0f172a' }} />
                {searching.applications && <span style={{ fontSize: '12px', color: '#94a3b8' }}>Searching…</span>}
                <span style={{ fontSize: '13px', color: '#94a3b8' }}>{applications.length} {applicationSearch ? 'matches' : 'recent applications'}</span>
              </div>
              <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead><tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <SortableTh label="Cleaner" sortKey="cleaner_name" state={applicationSort} onChange={k => setApplicationSort(s => flipSort(s, k))} />
                    <SortableTh label="Customer" sortKey="customer_name" state={applicationSort} onChange={k => setApplicationSort(s => flipSort(s, k))} />
                    <SortableTh label="Zone" sortKey="zone" state={applicationSort} onChange={k => setApplicationSort(s => flipSort(s, k))} />
                    <SortableTh label="Status" sortKey="status" state={applicationSort} onChange={k => setApplicationSort(s => flipSort(s, k))} />
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Message</th>
                    <SortableTh label="Date" sortKey="created_at" state={applicationSort} onChange={k => setApplicationSort(s => flipSort(s, k))} />
                    <th style={{ padding: '12px 16px' }}></th>
                  </tr></thead>
                  <tbody>
                    {sortRows(applications, applicationSort).map((app, i) => {
                      const isBadgeRow = app.status === 'pending' && !app.pending_reviewed_at
                      return (
                      <tr key={app.id} style={{ borderBottom: i < applications.length - 1 ? '1px solid #f1f5f9' : 'none', background: isBadgeRow ? '#eff6ff' : 'white', borderLeft: isBadgeRow ? '3px solid #2563eb' : '3px solid transparent' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f172a' }}>{app.cleaner_name}</td>
                        <td style={{ padding: '12px 16px', color: '#64748b' }}>{app.customer_name}</td>
                        <td style={{ padding: '12px 16px', color: '#64748b' }}>{ZONE_LABELS[app.zone] ?? app.zone}</td>
                        <td style={{ padding: '12px 16px' }}><Badge label={app.status} color={app.status === 'accepted' ? 'green' : app.status === 'pending' ? 'yellow' : 'red'} /></td>
                        <td style={{ padding: '12px 16px', color: '#64748b', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{app.message || '—'}</td>
                        <td style={{ padding: '12px 16px', color: '#94a3b8', whiteSpace: 'nowrap' }}>{dual(app.created_at)}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          {isBadgeRow && (
                            <button title="Hide from notification badge" onClick={() => dismissReview('application', app.id)} style={{ background: 'white', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '4px 10px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>✕ Dismiss</button>
                          )}
                        </td>
                      </tr>
                    )})}
                  </tbody>
                </table>
                <LoadMoreButton visible={!applicationSearch && (hasMore.applications ?? true)} loading={!!loadingMore.applications} onClick={() => loadMoreFor('applications')} />
              </div>
            </div>
          )}

          {/* ── Conversations ── */}
          {tab === 'conversations' && (
            <div>
              <div style={{ marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                <input ref={conversationSearchInputRef} value={conversationSearch} onChange={e => setConversationSearch(e.target.value)} placeholder="Search by cleaner or customer name… (/)" style={{ padding: '10px 16px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '14px', fontFamily: "'DM Sans', sans-serif", outline: 'none', width: '320px', color: '#0f172a' }} />
                {searching.conversations && <span style={{ fontSize: '12px', color: '#94a3b8' }}>Searching…</span>}
                <span style={{ fontSize: '13px', color: '#94a3b8' }}>{conversations.length} {conversationSearch ? 'matches' : 'recent conversations'}</span>
              </div>
              <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead><tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>{['Cleaner', 'Customer', 'Zone', 'Messages', 'Last message', 'Started', ''].map(h => <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>)}</tr></thead>
                  <tbody>
                    {conversations.map((conv, i) => (
                      <tr key={conv.id} style={{ borderBottom: i < conversations.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f172a' }}>{conv.cleaner_name}</td>
                        <td style={{ padding: '12px 16px', color: '#64748b' }}>{conv.customer_name}</td>
                        <td style={{ padding: '12px 16px', color: '#64748b' }}>{ZONE_LABELS[conv.zone] ?? conv.zone}</td>
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f172a' }}>{conv.message_count}</td>
                        <td style={{ padding: '12px 16px', color: '#64748b', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{conv.last_message || '—'}</td>
                        <td style={{ padding: '12px 16px', color: '#94a3b8', whiteSpace: 'nowrap' }}>{dual(conv.created_at)}</td>
                        <td style={{ padding: '12px 16px' }}><button onClick={() => setViewingConv(conv)} style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '4px 12px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Read →</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <LoadMoreButton visible={!conversationSearch && (hasMore.conversations ?? true)} loading={!!loadingMore.conversations} onClick={() => loadMoreFor('conversations')} />
              </div>
            </div>
          )}

          {/* ── Violations ── */}
          {tab === 'violations' && (
            <div>
              <div style={{ marginBottom: '16px', fontSize: '13px', color: '#94a3b8' }}>
                {violations.length} violations logged · {needsReview.violations.length} need review today
              </div>
              {violations.length === 0 ? (
                <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '48px', textAlign: 'center' }}>
                  <div style={{ fontSize: '32px', marginBottom: '12px' }}>✅</div>
                  <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>No violations logged yet</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {violations.map(v => {
                    const todayUnreviewed = new Date(v.created_at).getTime() >= startOfToday && !v.reviewed_at
                    return (
                    <div key={v.id} style={{ background: todayUnreviewed ? '#fff5f5' : 'white', borderRadius: '14px', border: '1.5px solid #fecaca', padding: '16px 20px', borderLeft: todayUnreviewed ? '4px solid #ef4444' : '1.5px solid #fecaca', opacity: v.reviewed_at ? 0.7 : 1 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '10px' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '14px', color: '#0f172a', marginBottom: '4px', fontStyle: 'italic' }}>"{v.message_content}"</div>
                          <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                            {v.sender_name} · {v.sender_role} · {ago(v.created_at)}
                            {v.reviewed_at && <span style={{ marginLeft: '8px', color: '#16a34a' }}>· reviewed</span>}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '6px', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                          <button disabled={loadingConv === v.conversation_id} onClick={() => openConversationById(v.conversation_id)} style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '8px', padding: '4px 12px', fontSize: '12px', fontWeight: 600, cursor: loadingConv === v.conversation_id ? 'wait' : 'pointer', fontFamily: "'DM Sans', sans-serif" }}>{loadingConv === v.conversation_id ? 'Loading…' : 'View chat →'}</button>
                          <button title="Jump to the sender in the Users tab" onClick={() => { setUserSearch(v.sender_name); switchTab('users') }} style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '4px 12px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>View user →</button>
                          <button onClick={() => setConfirmAction({ message: `Suspend ${v.sender_name}? They won't be able to log in until reinstated.`, onConfirm: () => { suspendUser(v.sender_id, true); setConfirmAction(null) } })} style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '8px', padding: '4px 12px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Suspend</button>
                          {todayUnreviewed && (
                            <button title="Mark this violation reviewed (clears it from today's badge count)" onClick={() => dismissReview('violation', v.id)} style={{ background: 'white', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '4px 12px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>✓ Mark reviewed</button>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {v.triggered_keywords.map(k => (<span key={k} style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '6px', padding: '2px 8px', fontSize: '11px', fontWeight: 700 }}>⚠ {k}</span>))}
                      </div>
                    </div>
                  )})}
                </div>
              )}
            </div>
          )}

          {/* ── Keywords ── */}
          {tab === 'keywords' && (
            <div>
              <div style={{ marginBottom: '16px', fontSize: '13px', color: '#94a3b8' }}>
                Words that trigger the off-platform warning in chat. The check is case-insensitive, normalised against obvious bypasses (e.g. "w h a t s a p p"), and runs both client- and server-side.
              </div>
              <div style={{ background: 'white', borderRadius: '14px', border: '1.5px solid #e2e8f0', padding: '20px 22px', marginBottom: '20px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '10px' }}>Add a keyword</div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    value={newKeyword}
                    onChange={e => { setNewKeyword(e.target.value); if (keywordError) setKeywordError(null) }}
                    onKeyDown={e => { if (e.key === 'Enter' && !savingKeyword) addKeyword() }}
                    placeholder="e.g. telegram, signal, paypal"
                    style={{ flex: 1, minWidth: '220px', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '14px', fontFamily: "'DM Sans', sans-serif", outline: 'none', color: '#0f172a' }}
                  />
                  <button onClick={addKeyword} disabled={savingKeyword || !newKeyword.trim()} style={{ background: savingKeyword || !newKeyword.trim() ? '#94a3b8' : '#2563eb', color: 'white', border: 'none', borderRadius: '10px', padding: '10px 20px', fontSize: '13px', fontWeight: 700, cursor: savingKeyword || !newKeyword.trim() ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                    {savingKeyword ? 'Adding…' : 'Add keyword'}
                  </button>
                </div>
                {keywordError && <div style={{ marginTop: '10px', fontSize: '12px', color: '#dc2626' }}>{keywordError}</div>}
              </div>
              <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <div style={{ padding: '12px 20px', borderBottom: '1px solid #f1f5f9', fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {keywords.length} active keyword{keywords.length === 1 ? '' : 's'}
                </div>
                {keywords.length === 0 ? (
                  <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>No keywords yet.</div>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '16px 20px' }}>
                    {keywords.map(k => (
                      <span key={k.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '100px', padding: '6px 12px', fontSize: '13px', fontWeight: 600 }}>
                        {k.keyword}
                        <button onClick={() => removeKeyword(k.id)} title="Remove" style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '13px', padding: 0, lineHeight: 1 }}>✕</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Customer view ── */}
          {tab === 'customer-view' && (
            <div>
              <div style={{ marginBottom: '16px', padding: '12px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', fontSize: '13px', color: '#15803d', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>ℹ️</span><span>You're viewing the customer dashboard as admin.</span>
              </div>
              <iframe src="/customer/dashboard" style={{ width: '100%', height: '85vh', border: 'none', borderRadius: '16px', boxShadow: '0 2px 16px rgba(0,0,0,0.08)' }} />
            </div>
          )}

          {/* ── Cleaner view ── */}
          {tab === 'cleaner-view' && (
            <div>
              <div style={{ marginBottom: '16px', padding: '12px 16px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', fontSize: '13px', color: '#1d4ed8', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>ℹ️</span><span>You're viewing the cleaner dashboard as admin.</span>
              </div>
              <iframe src="/cleaner/dashboard" style={{ width: '100%', height: '85vh', border: 'none', borderRadius: '16px', boxShadow: '0 2px 16px rgba(0,0,0,0.08)' }} />
            </div>
          )}

          {/* ── Tests ── */}
          {tab === 'tests' && (
            <div>
              <div style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>Email tests</h2>
                <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>Preview platform emails without going through the full user flow. Each test card shows where the email will be sent.</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                {/* New: Application received emails — sends both at once to the logged-in admin */}
                <TestCard
                  title="📧 Application received emails (cleaner + admin alert)"
                  description="Sends both emails fired when a cleaner submits their application: the 'Thanks for applying' email to the cleaner, plus the 'New application' alert to admin. Both go to your logged-in admin email so you can preview them side by side. Uses dummy applicant data."
                  buttonLabel="Send test emails →"
                  buttonColor="#2563eb"
                  onRun={async () => {
                    const res = await fetch('/api/admin/test-application-emails', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                    })
                    const data = await res.json()
                    if (!res.ok || !data.success) {
                      return { success: false, message: data.error ?? 'Request failed' }
                    }
                    const cleanerOK = !data.cleaner?.error
                    const adminOK = !data.admin?.error
                    if (cleanerOK && adminOK) {
                      return { success: true, message: `Both emails sent to ${data.sentTo}` }
                    }
                    // Partial success — surface which one failed so we can debug
                    const failures: string[] = []
                    if (!cleanerOK) failures.push(`cleaner: ${data.cleaner.error}`)
                    if (!adminOK) failures.push(`admin: ${data.admin.error}`)
                    return { success: false, message: failures.join(' | ') }
                  }}
                />

<TestCard
                  title="✅ Cleaner decision emails (approval + rejection)"
                  description="Sends both decision emails fired when admin approves or rejects a cleaner: the celebration 'Welcome to Vouchee' email plus the kind generic rejection email. Both go to your logged-in admin email so you can preview them side by side. Uses dummy applicant 'Alex'."
                  buttonLabel="Send test emails →"
                  buttonColor="#16a34a"
                  onRun={async () => {
                    const res = await fetch('/api/admin/test-cleaner-decision-emails', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                    })
                    const data = await res.json()
                    if (!res.ok || !data.success) {
                      return { success: false, message: data.error ?? 'Request failed' }
                    }
                    const approvalOK = !data.approval?.error
                    const rejectionOK = !data.rejection?.error
                    if (approvalOK && rejectionOK) {
                      return { success: true, message: `Both emails sent to ${data.sentTo}` }
                    }
                    const failures: string[] = []
                    if (!approvalOK) failures.push(`approval: ${data.approval.error}`)
                    if (!rejectionOK) failures.push(`rejection: ${data.rejection.error}`)
                    return { success: false, message: failures.join(' | ') }
                  }}
                />
                <TestCard
                  title="🧹 Cleaner acceptance email"
                  description="Sends the 'You've been chosen' email that a cleaner receives when a customer selects them and confirms a start date via GoCardless. Uses Alison C. as the cleaner and Adam Bell as the customer. Sends to adamjbell95@gmail.com."
                  buttonLabel="Send test email →"
                  buttonColor="#2563eb"
                  onRun={async () => {
                    const res = await fetch(
                      '/api/admin/test-cleaner-email?applicationId=5d2c5f56-080d-48cd-b552-a666881bde38&startDate=2026-04-17'
                    )
                    const data = await res.json()
                    if (data.success) return { success: true, message: `Sent to ${data.sentTo}` }
                    return { success: false, message: data.error ?? 'Failed' }
                  }}
                />

                <TestCard
                  title="👤 Customer confirmation email"
                  description="Sends the confirmation email that a customer receives after they've set up their Direct Debit and their cleaner has been assigned. Includes cleaner details, start date, tasks, and cleaning supplies link. Sends to adamjbell95@gmail.com."
                  buttonLabel="Send test email →"
                  buttonColor="#16a34a"
                  onRun={async () => {
                    const res = await fetch(
                      '/api/admin/test-customer-email?applicationId=5d2c5f56-080d-48cd-b552-a666881bde38&startDate=2026-04-17'
                    )
                    const data = await res.json()
                    if (data.success) return { success: true, message: `Sent to ${data.sentTo}` }
                    return { success: false, message: data.error ?? 'Failed' }
                  }}
                />

                {/* New-listing admin alert — both live and pre-launch variants */}
                <TestCard
                  title="🎉 New-listing admin alert (live + pre-launch)"
                  description="Sends the admin-inbox alert that fires every time a customer posts a new listing. Sends both flavours — the green 'live' variant (post-launch) and the blue 'pre-launch' variant — so you can preview the visual + copy side-by-side. Template imported from src/lib/emails/new-listing-admin-alert.ts so edits flow through to live emails too."
                  buttonLabel="Send test emails →"
                  buttonColor="#16a34a"
                  onRun={async () => {
                    const res = await fetch('/api/admin/test-new-listing-alert', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                    })
                    const data = await res.json()
                    if (!res.ok || !data.success) {
                      return { success: false, message: data.error ?? 'Request failed' }
                    }
                    const liveOK = !data.live?.error
                    const preOK = !data.preLaunch?.error
                    if (liveOK && preOK) return { success: true, message: `Both emails sent to ${data.sentTo}` }
                    const failures: string[] = []
                    if (!liveOK) failures.push(`live: ${data.live.error}`)
                    if (!preOK) failures.push(`pre-launch: ${data.preLaunch.error}`)
                    return { success: false, message: failures.join(' | ') }
                  }}
                />

                {/* Pre-launch emails — sends both flavours (immediate confirmation + 24h reminder)
                    so you can preview the visual + copy side-by-side. Templates are imported from
                    src/lib/emails/pre-launch-received.ts and pre-launch-24h-reminder.ts,
                    so editing those changes what the next test renders. */}
                <TestCard
                  title="📫 Pre-launch emails (received + 24h reminder)"
                  description="Sends both flavours of the pre-launch flow: the immediate 'You're on the early list' confirmation that fires when a customer posts a listing before 1 June, and the '24-hour reminder' with the confirm-your-listing CTA that the cron fires the day before launch. Both go to your logged-in admin email so you can compare the styling side-by-side. The confirm link in the reminder points at a placeholder UUID — clicking it will redirect with pre_launch_confirm=notfound, which is expected."
                  buttonLabel="Send test emails →"
                  buttonColor="#2563eb"
                  onRun={async () => {
                    const res = await fetch('/api/admin/test-pre-launch-emails', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                    })
                    const data = await res.json()
                    if (!res.ok || !data.success) {
                      return { success: false, message: data.error ?? 'Request failed' }
                    }
                    const receivedOK = !data.received?.error
                    const reminderOK = !data.reminder?.error
                    if (receivedOK && reminderOK) {
                      return { success: true, message: `Both emails sent to ${data.sentTo}` }
                    }
                    const failures: string[] = []
                    if (!receivedOK) failures.push(`received: ${data.received.error}`)
                    if (!reminderOK) failures.push(`reminder: ${data.reminder.error}`)
                    return { success: false, message: failures.join(' | ') }
                  }}
                />

                {/* Launch flip — bulk converts all pre-launch listings to live and fires alerts.
                    Use ONCE on launch day, after flipping NEXT_PUBLIC_LAUNCHED to 'true' in Vercel. */}
                <TestCard
                  title="🚀 Launch all pending listings"
                  description="Flips every clean_request whose status is 'pre_launch_pending' to 'active' and fires a cleaner-job-alert for each. Use this ONCE on launch day, immediately after switching NEXT_PUBLIC_LAUNCHED to 'true' in Vercel. Re-running is safe (no rows match)."
                  buttonLabel="Launch all pending →"
                  buttonColor="#dc2626"
                  onRun={async () => {
                    const ok = window.confirm('LAUNCH: flip every pre-launch listing to live and email all matching cleaners. Continue?')
                    if (!ok) return { success: false, message: 'Cancelled.' }
                    const res = await fetch('/api/admin/launch-listings', { method: 'POST' })
                    const data = await res.json()
                    if (!res.ok) return { success: false, message: data.error ?? 'Failed' }
                    return { success: true, message: `Flipped ${data.flipped}, alerted ${data.alerted} cleaners.` }
                  }}
                />

                {/* Cleaner job alert — sends both regular and cover variants so we can preview the visual differences side-by-side */}
                <TestCard
                  title="🆘 Cleaner job alert emails (regular + cover)"
                  description="Sends both flavours of the real-time cleaner job alert: a regular weekly clean and a cover clean (one-off urgent job with date + time-window + pay-direct messaging). Both go to your logged-in admin email so you can compare the styling side-by-side. Templates are imported from the same shared lib production uses, so editing src/lib/emails/cleaner-job-alert.ts changes what the next test renders."
                  buttonLabel="Send test emails →"
                  buttonColor="#a855f7"
                  onRun={async () => {
                    const res = await fetch('/api/admin/test-cleaner-job-alert-email', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                    })
                    const data = await res.json()
                    if (!res.ok || !data.success) {
                      return { success: false, message: data.error ?? 'Request failed' }
                    }
                    const regularOK = !data.regular?.error
                    const coverOK = !data.cover?.error
                    if (regularOK && coverOK) {
                      return { success: true, message: `Both emails sent to ${data.sentTo}` }
                    }
                    const failures: string[] = []
                    if (!regularOK) failures.push(`regular: ${data.regular.error}`)
                    if (!coverOK) failures.push(`cover: ${data.cover.error}`)
                    return { success: false, message: failures.join(' | ') }
                  }}
                />

              </div>
            </div>
          )}

        </div>

        {viewingCleaner && <CleanerDrawer cleaner={viewingCleaner} onClose={() => setViewingCleaner(null)} onSaved={loadCleaners} />}
        {viewingConv && <ConversationModal conversationId={viewingConv.id} cleanerName={viewingConv.cleaner_name} customerName={viewingConv.customer_name} onClose={() => setViewingConv(null)} />}
        {confirmAction && <ConfirmModal message={confirmAction.message} onConfirm={confirmAction.onConfirm} onCancel={() => setConfirmAction(null)} />}
      </div>
    </>
  )
}
