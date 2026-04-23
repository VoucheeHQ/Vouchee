'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/header'

interface Stats {
  totalCustomers: number; totalCleaners: number; activeListings: number
  totalApplications: number; totalConversations: number; totalMessages: number; violationsToday: number
}
interface UserRow { id: string; full_name: string; email: string; role: string; created_at: string; suspended?: boolean }
interface ListingRow { id: string; status: string; created_at: string; zone: string | null; bedrooms: number; bathrooms: number; hourly_rate: number; frequency: string; customer_name: string; customer_email: string; hidden?: boolean }
interface ApplicationRow { id: string; status: string; created_at: string; message?: string; cleaner_name: string; customer_name: string; zone: string }
interface ConversationRow { id: string; created_at: string; cleaner_name: string; customer_name: string; zone: string; message_count: number; last_message: string; last_message_at: string | null }
interface ViolationRow { id: string; created_at: string; conversation_id: string; message_content: string; triggered_keywords: string[]; sender_role: string; sender_name: string }

type Tab = 'overview' | 'users' | 'cleaners' | 'listings' | 'applications' | 'conversations' | 'violations' | 'customer-view' | 'cleaner-view' | 'tests'

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
  { id: 'q3', label: 'Do you have your own transport? (needed for Horsham patch)' },
  { id: 'q4', label: 'What\'s your typical availability — weekdays, evenings, weekends?' },
  { id: 'q5', label: 'Do you bring your own supplies, or expect customers to provide?' },
]

const PLATFORM_CHECKLIST = [
  { id: 'p1', label: 'Explained: no off-platform contact before mandate confirmed' },
  { id: 'p2', label: 'Explained: how payment works (customer Direct Debit → cleaner directly)' },
  { id: 'p3', label: 'Explained: Vouchee\'s 10% fee structure' },
  { id: 'p4', label: 'Explained: job application flow + customer expectations' },
  { id: 'p5', label: 'Explained: what happens if a customer cancels' },
]

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

function CleanerDrawer({ cleaner: initialCleaner, onClose, onSaved }: { cleaner: CleanerRow; onClose: () => void; onSaved: () => void }) {
  // Track the cleaner's state internally so we can refresh the drawer
  // after an upload/verify without closing it
  const [cleaner, setCleaner] = useState<CleanerRow>(initialCleaner)
  const [cleanerConvos, setCleanerConvos] = useState<ConversationRow[]>([])
  const [loadingConvos, setLoadingConvos] = useState(true)
  const [viewingCleanerConv, setViewingCleanerConv] = useState<ConversationRow | null>(null)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleaner.id])

  const refreshCleaner = async () => {
    const { data: c } = await (supabase as any)
      .from('cleaners')
      .select('id, profile_id, application_status, created_at, dbs_checked, has_insurance, right_to_work, interview_notes, interview_qualifying, interview_platform, approved_at, rejected_at, rejection_reason, cleans_completed, dbs_verified, dbs_file_url, dbs_expiry, dbs_uploaded_at, insurance_verified, insurance_file_url, insurance_expiry, insurance_uploaded_at, right_to_work_verified, right_to_work_file_url, right_to_work_expiry, right_to_work_uploaded_at, suspension_reason, suspended_at')
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
  const [loading, setLoading] = useState(true)
  const [userSearch, setUserSearch] = useState('')
  const [listingSearch, setListingSearch] = useState('')
  const [viewingConv, setViewingConv] = useState<ConversationRow | null>(null)
  const [confirmAction, setConfirmAction] = useState<{ message: string; onConfirm: () => void } | null>(null)
  const [listingFilter, setListingFilter] = useState<'all' | 'active' | 'hidden'>('all')
  const [cleanersList, setCleanersList] = useState<CleanerRow[]>([])
  const [cleanerFilter, setCleanerFilter] = useState<'all' | 'submitted' | 'in_review' | 'approved' | 'rejected'>('submitted')
  const [viewingCleaner, setViewingCleaner] = useState<CleanerRow | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }
      const { data: profile } = await (supabase as any).from('profiles').select('role').eq('id', user.id).single()
      if (!profile || profile.role !== 'admin') { router.replace('/login'); return }
      await Promise.all([loadStats(), loadUsers(), loadCleaners(), loadListings(), loadApplications(), loadConversations(), loadViolations()])
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

  const loadUsers = async () => {
    const { data } = await (supabase as any).from('profiles').select('id, full_name, email, role, created_at, suspended').in('role', ['customer', 'cleaner']).order('created_at', { ascending: false }).limit(200)
    setUsers(data ?? [])
  }

  const loadCleaners = async () => {
    const { data: cleaners } = await (supabase as any)
      .from('cleaners')
      .select('id, profile_id, application_status, created_at, dbs_checked, has_insurance, right_to_work, interview_notes, interview_qualifying, interview_platform, approved_at, rejected_at, rejection_reason, cleans_completed, dbs_verified, dbs_file_url, dbs_expiry, dbs_uploaded_at, insurance_verified, insurance_file_url, insurance_expiry, insurance_uploaded_at, right_to_work_verified, right_to_work_file_url, right_to_work_expiry, right_to_work_uploaded_at, suspension_reason, suspended_at')
      .order('created_at', { ascending: false })
      .limit(200)
    if (!cleaners) return
    const enriched = await Promise.all((cleaners as any[]).map(async c => {
      const { data: p } = await (supabase as any).from('profiles').select('full_name, email').eq('id', c.profile_id).single()
      return {
        ...c,
        full_name: (p as any)?.full_name ?? '—',
        email: (p as any)?.email ?? '—',
      } as CleanerRow
    }))
    setCleanersList(enriched)
  }

  const loadListings = async () => {
    const { data: reqs } = await (supabase as any).from('clean_requests').select('id, status, created_at, zone, bedrooms, bathrooms, hourly_rate, frequency, customer_id, hidden').order('created_at', { ascending: false }).limit(200)
    if (!reqs) return
    const enriched = await Promise.all(reqs.map(async (r: any) => {
      const { data: cust } = await (supabase as any).from('customers').select('profiles(full_name, email)').eq('id', r.customer_id).single()
      return { id: r.id, status: r.status, created_at: r.created_at, zone: r.zone, bedrooms: r.bedrooms, bathrooms: r.bathrooms, hourly_rate: r.hourly_rate, frequency: r.frequency, hidden: r.hidden ?? false, customer_name: (cust as any)?.profiles?.full_name ?? 'Unknown', customer_email: (cust as any)?.profiles?.email ?? '' }
    }))
    setListings(enriched)
  }

  const loadApplications = async () => {
    const { data: apps } = await (supabase as any).from('applications').select('id, status, created_at, message, cleaner_id, request_id').order('created_at', { ascending: false }).limit(100)
    if (!apps) return
    const enriched = await Promise.all(apps.map(async (app: any) => {
      const { data: cleaner } = await (supabase as any).from('cleaners').select('profiles(full_name)').eq('id', app.cleaner_id).single()
      const { data: req } = await (supabase as any).from('clean_requests').select('zone, customer_id').eq('id', app.request_id).single()
      const { data: customer } = req ? await (supabase as any).from('customers').select('profiles(full_name)').eq('id', req.customer_id).single() : { data: null }
      return { id: app.id, status: app.status, created_at: app.created_at, message: app.message, cleaner_name: cleaner?.profiles?.full_name ?? 'Unknown', customer_name: (customer as any)?.profiles?.full_name ?? 'Unknown', zone: req?.zone ?? '—' }
    }))
    setApplications(enriched)
  }

  const loadConversations = async () => {
    const { data: convs } = await (supabase as any).from('conversations').select('id, created_at, cleaner_id, customer_id, clean_request_id').order('created_at', { ascending: false }).limit(100)
    if (!convs) return
    const enriched = await Promise.all(convs.map(async (conv: any) => {
      const { data: cleaner } = await (supabase as any).from('cleaners').select('profiles(full_name)').eq('id', conv.cleaner_id).single()
      const { data: customer } = await (supabase as any).from('profiles').select('full_name').eq('id', conv.customer_id).single()
      const { data: req } = await (supabase as any).from('clean_requests').select('zone').eq('id', conv.clean_request_id).single()
      const { data: msgs, count } = await (supabase as any).from('messages').select('content, created_at', { count: 'exact' }).eq('conversation_id', conv.id).order('created_at', { ascending: false }).limit(1)
      return { id: conv.id, created_at: conv.created_at, cleaner_name: cleaner?.profiles?.full_name ?? 'Unknown', customer_name: (customer as any)?.full_name ?? 'Unknown', zone: req?.zone ?? '—', message_count: count ?? 0, last_message: msgs?.[0]?.content ?? '', last_message_at: msgs?.[0]?.created_at ?? null }
    }))
    setConversations(enriched)
  }

  const loadViolations = async () => {
    const { data } = await (supabase as any).from('keyword_violations').select('id, created_at, conversation_id, message_content, triggered_keywords, sender_role, sender_id').order('created_at', { ascending: false }).limit(100)
    if (!data) return
    const enriched = await Promise.all((data as any[]).map(async (v) => {
      const { data: profile } = await (supabase as any).from('profiles').select('full_name').eq('id', v.sender_id).single()
      return { ...v, sender_name: (profile as any)?.full_name ?? 'Unknown' }
    }))
    setViolations(enriched)
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

  const filteredUsers = users.filter(u => u.full_name?.toLowerCase().includes(userSearch.toLowerCase()) || u.email?.toLowerCase().includes(userSearch.toLowerCase()))
  const filteredListings = listings
    .filter(l => listingFilter === 'all' ? true : listingFilter === 'hidden' ? l.hidden : !l.hidden && l.status !== 'deleted')
    .filter(l => l.customer_name?.toLowerCase().includes(listingSearch.toLowerCase()) || l.zone?.toLowerCase().includes(listingSearch.toLowerCase()))

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'users', label: 'Users', icon: '👥' },
    { id: 'cleaners', label: 'Cleaners', icon: '🧹' },
    { id: 'listings', label: 'Listings', icon: '🏠' },
    { id: 'applications', label: 'Applications', icon: '📋' },
    { id: 'conversations', label: 'Conversations', icon: '💬' },
    { id: 'violations', label: 'Violations', icon: '🚨' },
    { id: 'customer-view', label: 'Customer view', icon: '👤' },
    { id: 'cleaner-view', label: 'Cleaner view', icon: '🧹' },
    { id: 'tests', label: 'Tests', icon: '🧪' },
  ]

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
              <button onClick={() => setTab('customer-view')} style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>👤 Customer view</button>
              <button onClick={() => setTab('cleaner-view')} style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>🧹 Cleaner view</button>
              <button onClick={async () => { const supabase = createClient(); await supabase.auth.signOut(); router.refresh(); router.replace('/') }}
                style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Sign out</button>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '4px', marginBottom: '32px', background: 'white', padding: '4px', borderRadius: '12px', border: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: '8px 14px', borderRadius: '9px', border: 'none', cursor: 'pointer', background: tab === t.id ? '#0f172a' : 'transparent', color: tab === t.id ? 'white' : '#64748b', fontSize: '12px', fontWeight: 600, fontFamily: "'DM Sans', sans-serif", display: 'flex', alignItems: 'center', gap: '5px' }}>
                {t.icon} {t.label}
                {t.id === 'violations' && violations.filter(v => { const today = new Date(); today.setHours(0,0,0,0); return new Date(v.created_at) >= today }).length > 0 && (
                  <span style={{ background: '#ef4444', color: 'white', borderRadius: '100px', padding: '0 5px', fontSize: '10px', fontWeight: 700 }}>{violations.filter(v => { const today = new Date(); today.setHours(0,0,0,0); return new Date(v.created_at) >= today }).length}</span>
                )}
                {t.id === 'listings' && listings.filter(l => l.hidden).length > 0 && (
                  <span style={{ background: '#f59e0b', color: 'white', borderRadius: '100px', padding: '0 5px', fontSize: '10px', fontWeight: 700 }}>{listings.filter(l => l.hidden).length}</span>
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
                  {violations.length > 5 && <button onClick={() => setTab('violations')} style={{ marginTop: '12px', background: 'none', border: 'none', color: '#dc2626', fontSize: '12px', fontWeight: 700, cursor: 'pointer', padding: 0 }}>View all {violations.length} violations →</button>}
                </div>
              )}
            </div>
          )}

          {/* ── Cleaners (approval CRM) ── */}
          {tab === 'cleaners' && (
            <div>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
                <PipelineCount label="Submitted" count={cleanersList.filter(c => c.application_status === 'submitted').length} color="#2563eb" active={cleanerFilter === 'submitted'} onClick={() => setCleanerFilter('submitted')} />
                <PipelineCount label="In review" count={cleanersList.filter(c => c.application_status === 'in_review').length} color="#f59e0b" active={cleanerFilter === 'in_review'} onClick={() => setCleanerFilter('in_review')} />
                <PipelineCount label="Approved" count={cleanersList.filter(c => c.application_status === 'approved').length} color="#16a34a" active={cleanerFilter === 'approved'} onClick={() => setCleanerFilter('approved')} />
                <PipelineCount label="Rejected" count={cleanersList.filter(c => c.application_status === 'rejected').length} color="#dc2626" active={cleanerFilter === 'rejected'} onClick={() => setCleanerFilter('rejected')} />
                <PipelineCount label="All" count={cleanersList.length} color="#0f172a" active={cleanerFilter === 'all'} onClick={() => setCleanerFilter('all')} />
              </div>

              <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead><tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>{['Cleaner', 'Email', 'Checks', 'Signed up', 'Status', ''].map(h => <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>)}</tr></thead>
                  <tbody>
                    {cleanersList
                      .filter(c => cleanerFilter === 'all' ? true : (c.application_status ?? 'submitted') === cleanerFilter)
                      .map((c, i, arr) => (
                        <tr key={c.id} style={{ borderBottom: i < arr.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                          <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f172a' }}>{c.full_name}</td>
                          <td style={{ padding: '12px 16px', color: '#64748b' }}>{c.email}</td>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <span title="DBS" style={{ fontSize: '11px', opacity: c.dbs_checked ? 1 : 0.25 }}>🛡️</span>
                              <span title="Insurance" style={{ fontSize: '11px', opacity: c.has_insurance ? 1 : 0.25 }}>📋</span>
                              <span title="Right to work" style={{ fontSize: '11px', opacity: c.right_to_work ? 1 : 0.25 }}>✅</span>
                            </div>
                          </td>
                          <td style={{ padding: '12px 16px', color: '#94a3b8', whiteSpace: 'nowrap' }}>{ago(c.created_at)}</td>
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
                            <button onClick={() => setViewingCleaner(c)} style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '4px 12px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                              Review →
                            </button>
                          </td>
                        </tr>
                      ))}
                    {cleanersList.filter(c => cleanerFilter === 'all' ? true : (c.application_status ?? 'submitted') === cleanerFilter).length === 0 && (
                      <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>No cleaners in this state</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Users ── */}
          {tab === 'users' && (
            <div>
              <div style={{ marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                <input value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="Search by name or email…" style={{ padding: '10px 16px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '14px', fontFamily: "'DM Sans', sans-serif", outline: 'none', width: '300px', color: '#0f172a' }} />
                <span style={{ fontSize: '13px', color: '#94a3b8' }}>{filteredUsers.length} users</span>
              </div>
              <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead><tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>{['Name', 'Email', 'Role', 'Joined', 'Status', 'Actions'].map(h => <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>)}</tr></thead>
                  <tbody>
                    {filteredUsers.map((u, i) => (
                      <tr key={u.id} style={{ borderBottom: i < filteredUsers.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f172a' }}>{u.full_name}</td>
                        <td style={{ padding: '12px 16px', color: '#64748b' }}>{u.email}</td>
                        <td style={{ padding: '12px 16px' }}><Badge label={u.role} color={u.role === 'cleaner' ? 'blue' : 'green'} /></td>
                        <td style={{ padding: '12px 16px', color: '#94a3b8' }}>{fmt(u.created_at)}</td>
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
              </div>
            </div>
          )}

          {/* ── Listings ── */}
          {tab === 'listings' && (
            <div>
              <div style={{ marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                <input value={listingSearch} onChange={e => setListingSearch(e.target.value)} placeholder="Search by customer or zone…" style={{ padding: '10px 16px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '14px', fontFamily: "'DM Sans', sans-serif", outline: 'none', width: '280px', color: '#0f172a' }} />
                <div style={{ display: 'flex', gap: '4px', background: 'white', padding: '4px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  {(['all', 'active', 'hidden'] as const).map(f => <button key={f} onClick={() => setListingFilter(f)} style={{ padding: '5px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: listingFilter === f ? '#0f172a' : 'transparent', color: listingFilter === f ? 'white' : '#64748b', fontSize: '12px', fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>{f.charAt(0).toUpperCase() + f.slice(1)}</button>)}
                </div>
                <span style={{ fontSize: '13px', color: '#94a3b8' }}>{filteredListings.length} listings</span>
              </div>
              <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead><tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>{['Customer', 'Zone', 'Details', 'Status', 'Posted', 'Actions'].map(h => <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>)}</tr></thead>
                  <tbody>
                    {filteredListings.map((l, i) => (
                      <tr key={l.id} style={{ borderBottom: i < filteredListings.length - 1 ? '1px solid #f1f5f9' : 'none', opacity: l.hidden ? 0.6 : 1 }}>
                        <td style={{ padding: '12px 16px' }}><div style={{ fontWeight: 600, color: '#0f172a' }}>{l.customer_name}</div><div style={{ fontSize: '11px', color: '#94a3b8' }}>{l.customer_email}</div></td>
                        <td style={{ padding: '12px 16px', color: '#64748b' }}>{ZONE_LABELS[l.zone ?? ''] ?? l.zone ?? '—'}</td>
                        <td style={{ padding: '12px 16px', color: '#64748b' }}>{l.bedrooms}bd · {l.bathrooms}ba · £{l.hourly_rate}/hr · {l.frequency}</td>
                        <td style={{ padding: '12px 16px' }}><div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}><Badge label={l.status} color={l.status === 'active' ? 'green' : l.status === 'pending_review' ? 'yellow' : 'gray'} />{l.hidden && <Badge label="Hidden" color="orange" />}</div></td>
                        <td style={{ padding: '12px 16px', color: '#94a3b8', whiteSpace: 'nowrap' }}>{ago(l.created_at)}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button onClick={() => hideListing(l.id, !l.hidden)} style={{ background: l.hidden ? '#fff7ed' : '#f8fafc', color: l.hidden ? '#c2410c' : '#64748b', border: `1px solid ${l.hidden ? '#fed7aa' : '#e2e8f0'}`, borderRadius: '6px', padding: '4px 10px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>{l.hidden ? '👁 Unhide' : '🚫 Hide'}</button>
                            <button onClick={() => setConfirmAction({ message: `Permanently delete this listing from ${l.customer_name}? This cannot be undone.`, onConfirm: () => { deleteListing(l.id); setConfirmAction(null) } })} style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '6px', padding: '4px 10px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>🗑 Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ marginTop: '16px', padding: '14px 18px', background: '#fefce8', border: '1px solid #fef08a', borderRadius: '10px', fontSize: '13px', color: '#92400e' }}>
                💡 <strong>Hidden</strong> listings are removed from the cleaner jobs page but remain in the database. <strong>Delete</strong> marks them as deleted — irreversible from here but recoverable via Supabase if needed.
              </div>
            </div>
          )}

          {/* ── Applications ── */}
          {tab === 'applications' && (
            <div>
              <div style={{ marginBottom: '16px', fontSize: '13px', color: '#94a3b8' }}>{applications.length} applications</div>
              <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead><tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>{['Cleaner', 'Customer', 'Zone', 'Status', 'Message', 'Date'].map(h => <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>)}</tr></thead>
                  <tbody>
                    {applications.map((app, i) => (
                      <tr key={app.id} style={{ borderBottom: i < applications.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f172a' }}>{app.cleaner_name}</td>
                        <td style={{ padding: '12px 16px', color: '#64748b' }}>{app.customer_name}</td>
                        <td style={{ padding: '12px 16px', color: '#64748b' }}>{ZONE_LABELS[app.zone] ?? app.zone}</td>
                        <td style={{ padding: '12px 16px' }}><Badge label={app.status} color={app.status === 'accepted' ? 'green' : app.status === 'pending' ? 'yellow' : 'red'} /></td>
                        <td style={{ padding: '12px 16px', color: '#64748b', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{app.message || '—'}</td>
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
                  <thead><tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>{['Cleaner', 'Customer', 'Zone', 'Messages', 'Last message', 'Started', ''].map(h => <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>)}</tr></thead>
                  <tbody>
                    {conversations.map((conv, i) => (
                      <tr key={conv.id} style={{ borderBottom: i < conversations.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f172a' }}>{conv.cleaner_name}</td>
                        <td style={{ padding: '12px 16px', color: '#64748b' }}>{conv.customer_name}</td>
                        <td style={{ padding: '12px 16px', color: '#64748b' }}>{ZONE_LABELS[conv.zone] ?? conv.zone}</td>
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f172a' }}>{conv.message_count}</td>
                        <td style={{ padding: '12px 16px', color: '#64748b', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{conv.last_message || '—'}</td>
                        <td style={{ padding: '12px 16px', color: '#94a3b8', whiteSpace: 'nowrap' }}>{ago(conv.created_at)}</td>
                        <td style={{ padding: '12px 16px' }}><button onClick={() => setViewingConv(conv)} style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '4px 12px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Read →</button></td>
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
                          <div style={{ fontSize: '14px', color: '#0f172a', marginBottom: '4px', fontStyle: 'italic' }}>"{v.message_content}"</div>
                          <div style={{ fontSize: '12px', color: '#94a3b8' }}>{v.sender_name} · {v.sender_role} · {ago(v.created_at)}</div>
                        </div>
                        <button onClick={() => { const conv = conversations.find(c => c.id === v.conversation_id); if (conv) setViewingConv(conv) }} style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '8px', padding: '4px 12px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", flexShrink: 0 }}>View chat →</button>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {v.triggered_keywords.map(k => (<span key={k} style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '6px', padding: '2px 8px', fontSize: '11px', fontWeight: 700 }}>⚠ {k}</span>))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
                <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>All test emails send to <strong>adamjbell95@gmail.com</strong> using live test data.</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                <TestCard
                  title="🧹 Cleaner acceptance email"
                  description="Sends the 'You've been chosen' email that a cleaner receives when a customer selects them and confirms a start date via GoCardless. Uses Alison C. as the cleaner and Adam Bell as the customer."
                  buttonLabel="Send test email →"
                  buttonColor="#2563eb"
                  onRun={async () => {
                    const res = await fetch(
                      '/api/admin/test-cleaner-email?secret=vouchee-test&applicationId=5d2c5f56-080d-48cd-b552-a666881bde38&startDate=2026-04-17&overrideTo=adamjbell95@gmail.com'
                    )
                    const data = await res.json()
                    if (data.success) return { success: true, message: `Sent to ${data.sentTo}` }
                    return { success: false, message: data.error ?? 'Failed' }
                  }}
                />

                <TestCard
                  title="👤 Customer confirmation email"
                  description="Sends the confirmation email that a customer receives after they've set up their Direct Debit and their cleaner has been assigned. Includes cleaner details, start date, tasks, and cleaning supplies link."
                  buttonLabel="Send test email →"
                  buttonColor="#16a34a"
                  onRun={async () => {
                    const res = await fetch(
                      '/api/admin/test-customer-email?secret=vouchee-test&applicationId=5d2c5f56-080d-48cd-b552-a666881bde38&startDate=2026-04-17&overrideTo=adamjbell95@gmail.com'
                    )
                    const data = await res.json()
                    if (data.success) return { success: true, message: `Sent to ${data.sentTo}` }
                    return { success: false, message: data.error ?? 'Failed' }
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
