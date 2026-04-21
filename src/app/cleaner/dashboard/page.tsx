'use client'

import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type ApplicationStatus = 'submitted' | 'approved' | 'rejected' | 'suspended' | 'pending'

interface CleanerProfile {
  full_name: string
  email: string
  phone: string | null
}

interface CleanerData {
  id: string
  application_status: ApplicationStatus
  zones: string[]
  dbs_checked: boolean
  right_to_work: boolean
  has_insurance: boolean
  needs_credentials_help: boolean
  cover_cleans_notify: boolean
  job_notify: boolean
  marketing_opt_in: boolean
  own_supplies: boolean
  created_at: string
  dbs_expiry: string | null
  insurance_expiry: string | null
  cleans_completed: number
}

interface CleanerStats {
  pendingApplications: number
  jobsWon: number
  chatsAccepted: number
  chatsDeclined: number
  uniqueCustomers: number
}

interface NotificationItem {
  id: string
  type: string
  title: string
  body: string | null
  link: string | null
  read: boolean
  created_at: string
}

const ZONE_LABELS: Record<string, string> = {
  central_south_east: 'Central / South East',
  north_west: 'North West',
  north_east_roffey: 'North East / Roffey',
  south_west: 'South West',
  warnham_north: 'Warnham / Surrounding North',
  broadbridge_heath: 'Broadbridge Heath',
  mannings_heath: 'Mannings Heath',
  faygate_kilnwood_vale: 'Faygate / Kilnwood Vale',
  christs_hospital: 'Christs Hospital',
  southwater: 'Southwater',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}
function formatMonthYear(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}
function formatExpiry(iso: string | null) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
function isExpired(iso: string | null) {
  if (!iso) return false
  return new Date(iso) < new Date()
}
function getInitial(name: string) {
  return name.trim().charAt(0).toUpperCase()
}
function formatShortName(fullName: string) {
  const parts = fullName.trim().split(' ')
  return parts.length === 1 ? parts[0] : `${parts[0]} ${parts[parts.length - 1].charAt(0)}.`
}
function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function StatusBadge({ status }: { status: ApplicationStatus }) {
  const map: Record<ApplicationStatus, { label: string; bg: string; color: string; dot: string }> = {
    submitted: { label: 'Under review', bg: '#fef9c3', color: '#854d0e', dot: '#eab308' },
    pending: { label: 'Pending', bg: '#f1f5f9', color: '#475569', dot: '#94a3b8' },
    approved: { label: 'Active', bg: '#dcfce7', color: '#15803d', dot: '#22c55e' },
    rejected: { label: 'Rejected', bg: '#fee2e2', color: '#991b1b', dot: '#ef4444' },
    suspended: { label: 'Suspended', bg: '#fef3c7', color: '#92400e', dot: '#f59e0b' },
  }
  const s = map[status] ?? map.pending
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: s.bg, color: s.color, borderRadius: '100px', padding: '5px 12px', fontSize: '12px', fontWeight: 700 }}>
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: s.dot }} />
      {s.label}
    </span>
  )
}

function CredRow({ active, label, expiry }: { active: boolean; label: string; expiry?: string | null }) {
  const expired = isExpired(expiry ?? null)
  const ok = active && !expired
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: ok ? '#f8fffe' : active && expired ? '#fff8f8' : '#f9fafb', borderRadius: '10px', border: `1px solid ${ok ? '#d1fae5' : active && expired ? '#fecaca' : '#e2e8f0'}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '14px', fontWeight: 800, color: ok ? '#16a34a' : '#dc2626' }}>{ok ? '✓' : '✗'}</span>
        <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>{label}</span>
      </div>
      {expiry && active && (
        <span style={{ fontSize: '11px', fontWeight: 600, color: expired ? '#dc2626' : '#64748b', background: expired ? '#fee2e2' : '#f1f5f9', border: `1px solid ${expired ? '#fecaca' : '#e2e8f0'}`, borderRadius: '6px', padding: '2px 7px' }}>
          {expired ? `⚠ Expired` : `Exp. ${formatExpiry(expiry)}`}
        </span>
      )}
      {!active && <span style={{ fontSize: '11px', color: '#94a3b8' }}>Not verified</span>}
    </div>
  )
}

function StatCard({ value, label, sub, color = '#0f172a', bg = '#f8fafc', border = '#e2e8f0' }: { value: number | string; label: string; sub?: string; color?: string; bg?: string; border?: string }) {
  return (
    <div style={{ background: bg, border: `1.5px solid ${border}`, borderRadius: '16px', padding: '20px 20px 16px', flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: '32px', fontWeight: 800, color, lineHeight: 1, marginBottom: '6px' }}>{value}</div>
      <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: sub ? '2px' : '0' }}>{label}</div>
      {sub && <div style={{ fontSize: '11px', color: '#94a3b8', lineHeight: 1.4 }}>{sub}</div>}
    </div>
  )
}

// ─── TOGGLE SWITCH ──────────────────────────────────────────────────────────
function Toggle({ value, onChange, disabled }: { value: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      aria-pressed={value}
      style={{
        width: '36px',
        height: '22px',
        borderRadius: '100px',
        background: value ? '#16a34a' : '#cbd5e1',
        border: 'none',
        position: 'relative',
        cursor: disabled ? 'wait' : 'pointer',
        transition: 'background 0.15s ease',
        padding: 0,
        flexShrink: 0,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <span style={{
        position: 'absolute',
        top: '3px',
        left: value ? '17px' : '3px',
        width: '16px',
        height: '16px',
        borderRadius: '50%',
        background: 'white',
        transition: 'left 0.15s ease',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </button>
  )
}

// ─── NOTIFICATION ITEM ──────────────────────────────────────────────────────
const NOTIFICATION_ICONS: Record<string, string> = {
  chat_accepted: '💬',
  chat_declined: '😔',
  job_won: '🎉',
  job_lost: '👋',
  new_message: '✉️',
  application_approved: '✅',
  application_rejected: '❌',
  account_suspended: '⚠️',
  default: '🔔',
}

function NotificationRow({ item, onClick }: { item: NotificationItem; onClick: () => void }) {
  const icon = NOTIFICATION_ICONS[item.type] ?? NOTIFICATION_ICONS.default
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        gap: '12px',
        padding: '12px 14px',
        borderRadius: '12px',
        background: item.read ? 'transparent' : '#eff6ff',
        border: `1px solid ${item.read ? '#f1f5f9' : '#bfdbfe'}`,
        cursor: 'pointer',
        transition: 'background 0.15s ease',
        alignItems: 'flex-start',
      }}
    >
      <div style={{ fontSize: '18px', flexShrink: 0, lineHeight: 1, marginTop: '1px' }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '2px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', lineHeight: 1.35 }}>{item.title}</div>
          <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500, flexShrink: 0, whiteSpace: 'nowrap' }}>{relativeTime(item.created_at)}</div>
        </div>
        {item.body && <div style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.45 }}>{item.body}</div>}
      </div>
      {!item.read && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6', flexShrink: 0, marginTop: '6px' }} />}
    </div>
  )
}

// ─── APPROVED DASHBOARD ─────────────────────────────────────────────────────
function ApprovedDashboard({ profile, cleaner, stats, notifications, onTogglePref, onNotificationClick }: {
  profile: CleanerProfile
  cleaner: CleanerData
  stats: CleanerStats
  notifications: NotificationItem[]
  onTogglePref: (field: 'job_notify' | 'cover_cleans_notify' | 'marketing_opt_in') => void
  onNotificationClick: (n: NotificationItem) => void
}) {
  const shortName = formatShortName(profile.full_name)
  const memberSince = formatMonthYear(cleaner.created_at)
  const cleans = cleaner.cleans_completed ?? 0
  const estHours = cleans * 3

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 24px 60px', display: 'grid', gridTemplateColumns: '340px 1fr', gap: '24px', alignItems: 'start' }}>

      {/* ── LEFT COLUMN ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* Profile card — footer removed */}
        <div style={{ background: 'white', borderRadius: '20px', border: '1.5px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>
          <div style={{ padding: '24px 24px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 800, color: 'white' }}>
                    {getInitial(profile.full_name)}
                  </div>
                  <div style={{ position: 'absolute', bottom: 0, right: 0, width: '18px', height: '18px', borderRadius: '50%', background: '#16a34a', border: '2px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', color: 'white', fontWeight: 800 }}>✓</div>
                </div>
                <div>
                  <div style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.2px' }}>{shortName}</div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 500, margin: '2px 0 6px' }}>Member since {memberSince}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {[1,2,3,4,5].map(s => <span key={s} style={{ fontSize: '12px', color: '#e2e8f0' }}>★</span>)}
                    <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, marginLeft: '4px' }}>New cleaner</span>
                  </div>
                </div>
              </div>
              <div style={{ textAlign: 'center', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '12px', padding: '10px 14px', flexShrink: 0 }}>
                <div style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{cleans}</div>
                <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 700, marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cleans</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
              <CredRow active={cleaner.dbs_checked} label="DBS Certificate" expiry={cleaner.dbs_expiry} />
              <CredRow active={cleaner.has_insurance} label="Public Liability Insurance" expiry={cleaner.insurance_expiry} />
              <CredRow active={cleaner.right_to_work} label="Right to Work" />
            </div>

            <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '12px 14px', borderLeft: '3px solid #3b82f6' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Your intro message</div>
              <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8', lineHeight: 1.5, fontStyle: 'italic' }}>
                This is where your message appears when you apply to a customer's listing.
              </p>
            </div>
          </div>
          {/* Footer removed — was "This is how customers see your profile" */}
        </div>

        {/* Notification preferences — now interactive */}
        <div style={{ background: 'white', borderRadius: '20px', border: '1.5px solid #e2e8f0', padding: '20px 20px 16px', boxShadow: '0 2px 16px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '14px' }}>Notification preferences</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {([
              { field: 'job_notify' as const, label: 'Job alerts', value: cleaner.job_notify, icon: '🔔' },
              { field: 'cover_cleans_notify' as const, label: 'Cover clean alerts', value: cleaner.cover_cleans_notify, icon: '🔄' },
              { field: 'marketing_opt_in' as const, label: 'Marketing & updates', value: cleaner.marketing_opt_in, icon: '📣' },
            ]).map(({ field, label, value, icon }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f8fafc' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '14px' }}>{icon}</span>
                  <span style={{ fontSize: '13px', color: '#475569', fontWeight: 500 }}>{label}</span>
                </div>
                <Toggle value={value} onChange={() => onTogglePref(field)} />
              </div>
            ))}
          </div>
        </div>

        {/* Supplies */}
        <div style={{ background: 'linear-gradient(135deg, #fefce8, #fff7ed)', borderRadius: '16px', border: '1.5px solid #fde68a', padding: '18px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#92400e', marginBottom: '2px' }}>Need supplies?</div>
            <div style={{ fontSize: '12px', color: '#b45309' }}>Recommended products for professionals</div>
          </div>
          <a href="/cleaning-supplies" style={{ background: '#f59e0b', color: 'white', borderRadius: '10px', padding: '8px 16px', fontSize: '12px', fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}>
            Browse →
          </a>
        </div>

        <div style={{ background: '#f8faff', borderRadius: '14px', padding: '14px 18px', border: '1px solid #e0e7ff', textAlign: 'center' }}>
          <p style={{ fontSize: '13px', color: '#475569', margin: 0 }}>
            Need help?{' '}
            <a href="mailto:cleaners@vouchee.co.uk" style={{ color: '#3b82f6', fontWeight: 700, textDecoration: 'none' }}>cleaners@vouchee.co.uk</a>
          </p>
        </div>
      </div>

      {/* ── RIGHT COLUMN ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* Welcome bar */}
        <div style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 60%, #3b82f6 100%)', borderRadius: '20px', padding: '24px 28px', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 4px 20px rgba(37,99,235,0.25)' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.75, marginBottom: '4px' }}>Welcome back</div>
            <div style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-0.3px' }}>Hi, {profile.full_name.trim().split(' ')[0]}! 👋</div>
            <div style={{ fontSize: '13px', opacity: 0.8, marginTop: '4px' }}>Here's how your Vouchee business is doing.</div>
          </div>
          <a href="/jobs" style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: 'white', borderRadius: '12px', padding: '10px 20px', fontSize: '13px', fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}>
            Browse jobs →
          </a>
        </div>

        {/* Job activity — with CORRECT stats */}
        <div style={{ background: 'white', borderRadius: '20px', border: '1.5px solid #e2e8f0', padding: '24px', boxShadow: '0 2px 16px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '16px' }}>Job activity</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '12px' }}>
            <StatCard value={stats.pendingApplications} label="Pending applications" sub="Jobs you've applied to awaiting response" bg="#fffbeb" border="#fde68a" color="#92400e" />
            <StatCard value={stats.jobsWon} label="Jobs won" sub="Customers who confirmed their start date" bg="#f0fdf4" border="#86efac" color="#15803d" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            <StatCard value={stats.chatsAccepted} label="Chats accepted" sub="Customers who opened a conversation" bg="#eff6ff" border="#bfdbfe" color="#1d4ed8" />
            <StatCard value={stats.chatsDeclined} label="Chats declined" sub="Customers who passed on your application" bg="#f8fafc" border="#e2e8f0" color="#64748b" />
          </div>
        </div>

        {/* Business metrics */}
        <div style={{ background: 'white', borderRadius: '20px', border: '1.5px solid #e2e8f0', padding: '24px', boxShadow: '0 2px 16px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '16px' }}>Your Vouchee business</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            <StatCard value={cleans} label="Cleans completed" sub="Total jobs completed through Vouchee" bg="#f0fdf4" border="#86efac" color="#15803d" />
            <StatCard value={estHours === 0 ? '—' : `${estHours}h`} label="Est. hours worked" sub="Based on completed cleans" bg="#eff6ff" border="#bfdbfe" color="#1d4ed8" />
            <StatCard value={stats.uniqueCustomers} label="Unique customers" sub="Different households you've worked with" bg="#fdf4ff" border="#e9d5ff" color="#7c3aed" />
          </div>
        </div>

        {/* NEW: Recent notifications (replaces Messages) */}
        <div style={{ background: 'white', borderRadius: '20px', border: '1.5px solid #e2e8f0', padding: '24px', boxShadow: '0 2px 16px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Recent notifications</div>
            {notifications.length > 0 && (
              <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>
                {notifications.filter(n => !n.read).length} unread
              </span>
            )}
          </div>
          {notifications.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 16px', color: '#94a3b8' }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>🔔</div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>You're all caught up</div>
              <div style={{ fontSize: '12px', lineHeight: 1.5 }}>When customers accept your chats or confirm jobs, you'll see updates here.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {notifications.slice(0, 5).map(n => (
                <NotificationRow key={n.id} item={n} onClick={() => onNotificationClick(n)} />
              ))}
            </div>
          )}
        </div>

        {/* Reviews coming soon */}
        <div style={{ background: '#fefce8', border: '1.5px solid #fde68a', borderRadius: '16px', padding: '20px 24px', display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#fef9c3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>⭐</div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>Reviews & profile link</div>
            <div style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5 }}>Once you've completed cleans, your reviews will build here. Share your profile link with customers to collect them. Coming soon.</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── PENDING SCREEN (unchanged) ─────────────────────────────────────────────
function PendingScreen({ profile, cleaner, emailConfirmed }: { profile: CleanerProfile; cleaner: CleanerData; emailConfirmed: boolean }) {
  const firstName = profile.full_name.trim().split(' ')[0]
  const zones = (cleaner.zones ?? []).map(z => ZONE_LABELS[z] ?? z)

  const steps = [
    { icon: '✅', title: 'Application received', desc: `Submitted on ${formatDate(cleaner.created_at)}`, done: true },
    { icon: '📧', title: 'Email confirmed', desc: emailConfirmed ? 'Your email address has been verified' : 'Please check your inbox and click the confirmation link', done: emailConfirmed, active: !emailConfirmed },
    { icon: '🔍', title: 'Application review', desc: "We're reviewing your details — this usually takes 1–3 working days", done: false, active: true },
    { icon: '📞', title: 'Get to know you', desc: "We'll reach out for a short call to get to know you and answer any questions.", done: false },
    { icon: '🎉', title: 'Account approved', desc: "You'll be notified by email once you're live on Vouchee", done: false },
  ]

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', padding: '0 24px 60px' }}>
      <div style={{ background: 'white', borderRadius: '20px', padding: '32px', border: '1.5px solid #e2e8f0', marginBottom: '20px', boxShadow: '0 2px 16px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: 800, color: 'white', flexShrink: 0 }}>
            {getInitial(profile.full_name)}
          </div>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '0 0 4px' }}>Hi {firstName}!</h2>
            <StatusBadge status={cleaner.application_status} />
          </div>
        </div>
        <p style={{ fontSize: '15px', color: '#475569', lineHeight: 1.7, margin: 0 }}>
          Thanks for applying to join Vouchee. We've received your application and will be in touch within <strong>1–3 working days</strong>.
        </p>
      </div>

      <div style={{ background: 'white', borderRadius: '20px', padding: '28px 32px', border: '1.5px solid #e2e8f0', marginBottom: '20px', boxShadow: '0 2px 16px rgba(0,0,0,0.05)' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 24px' }}>What happens next</h3>
        {steps.map((step, i) => (
          <div key={i} style={{ display: 'flex', gap: '16px', position: 'relative' }}>
            {i < steps.length - 1 && (
              <div style={{ position: 'absolute', left: '19px', top: '40px', width: '2px', height: 'calc(100% - 8px)', background: step.done ? '#86efac' : '#e2e8f0' }} />
            )}
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0, background: step.done ? '#dcfce7' : (step as any).active ? '#eff6ff' : '#f8fafc', border: `2px solid ${step.done ? '#86efac' : (step as any).active ? '#93c5fd' : '#e2e8f0'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', zIndex: 1 }}>
              {step.done ? '✓' : step.icon}
            </div>
            <div style={{ paddingBottom: i < steps.length - 1 ? '24px' : '0', flex: 1 }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: step.done ? '#15803d' : (step as any).active ? '#1d4ed8' : '#94a3b8', marginBottom: '2px' }}>{step.title}</div>
              <div style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.5 }}>{step.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ background: 'white', borderRadius: '20px', padding: '28px 32px', border: '1.5px solid #e2e8f0', marginBottom: '20px', boxShadow: '0 2px 16px rgba(0,0,0,0.05)' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 12px' }}>Your application summary</h3>
        {[
          { label: 'Name', value: profile.full_name },
          { label: 'Email', value: profile.email },
          { label: 'Phone', value: profile.phone ?? '—' },
          { label: 'Own supplies', value: cleaner.own_supplies ? 'Yes' : 'No' },
        ].map(({ label, value }) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
            <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>{label}</span>
            <span style={{ fontSize: '13px', color: '#0f172a', fontWeight: 600 }}>{value}</span>
          </div>
        ))}
        <div style={{ padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 500, marginBottom: '10px' }}>Credentials</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <CredRow active={cleaner.dbs_checked} label="DBS Certificate" />
            <CredRow active={cleaner.right_to_work} label="Right to Work" />
            <CredRow active={cleaner.has_insurance} label="Public Liability Insurance" />
          </div>
        </div>
        <div style={{ padding: '12px 0' }}>
          <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 500, marginBottom: '8px' }}>Areas you cover</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {zones.length > 0 ? zones.map(z => <span key={z} style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '4px 10px', fontSize: '12px', fontWeight: 600 }}>{z}</span>) : <span style={{ fontSize: '13px', color: '#94a3b8' }}>None selected</span>}
          </div>
        </div>
      </div>

      <div style={{ background: '#f8faff', borderRadius: '16px', padding: '18px 24px', border: '1px solid #e0e7ff', textAlign: 'center' }}>
        <p style={{ fontSize: '14px', color: '#475569', margin: 0 }}>
          Questions? <a href="mailto:cleaners@vouchee.co.uk" style={{ color: '#3b82f6', fontWeight: 700, textDecoration: 'none' }}>cleaners@vouchee.co.uk</a>
        </p>
      </div>
    </div>
  )
}

// ─── BLOCKED SCREEN (unchanged) ─────────────────────────────────────────────
function BlockedScreen({ status }: { status: 'rejected' | 'suspended' }) {
  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', padding: '0 24px 60px' }}>
      <div style={{ background: 'white', borderRadius: '20px', padding: '40px', border: '1.5px solid #fecaca', textAlign: 'center', boxShadow: '0 2px 16px rgba(0,0,0,0.05)' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>{status === 'rejected' ? '😔' : '⚠️'}</div>
        <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a', margin: '0 0 12px' }}>
          {status === 'rejected' ? 'Application unsuccessful' : 'Account suspended'}
        </h2>
        <p style={{ fontSize: '14px', color: '#64748b', lineHeight: 1.7, margin: '0 0 24px' }}>
          {status === 'rejected'
            ? "Unfortunately we weren't able to approve your application at this time. Please get in touch if you have any questions."
            : "Your account has been suspended. Please contact us to find out more."}
        </p>
        <a href="mailto:cleaners@vouchee.co.uk" style={{ display: 'inline-block', background: '#0f172a', color: 'white', padding: '12px 28px', borderRadius: '12px', fontSize: '14px', fontWeight: 700, textDecoration: 'none' }}>
          Contact us
        </a>
      </div>
    </div>
  )
}

// ─── MAIN PAGE ──────────────────────────────────────────────────────────────
export default function CleanerDashboardPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<CleanerProfile | null>(null)
  const [cleaner, setCleaner] = useState<CleanerData | null>(null)
  const [stats, setStats] = useState<CleanerStats>({ pendingApplications: 0, jobsWon: 0, chatsAccepted: 0, chatsDeclined: 0, uniqueCustomers: 0 })
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [emailConfirmed, setEmailConfirmed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.replace('/login'); return }

        setEmailConfirmed(!!user.email_confirmed_at)

        const { data: profileData, error: profileError } = await supabase
          .from('profiles').select('full_name, email, phone').eq('id', user.id).single()
        if (profileError || !profileData) throw new Error('Could not load your profile.')

        // NOTE: added `id` to select so applications query actually works
        const { data: cleanerData, error: cleanerError } = await supabase
          .from('cleaners')
          .select('id, application_status, zones, dbs_checked, right_to_work, has_insurance, needs_credentials_help, cover_cleans_notify, job_notify, marketing_opt_in, own_supplies, created_at, dbs_expiry, insurance_expiry, cleans_completed')
          .eq('profile_id', user.id).single()
        if (cleanerError || !cleanerData) throw new Error('Could not load your cleaner profile.')

        setProfile(profileData)
        setCleaner(cleanerData as CleanerData)

        // Fetch applications + join clean_requests to know which ones became jobs
        const { data: appData } = await supabase
          .from('applications')
          .select('id, status, request_id, clean_requests(status)')
          .eq('cleaner_id', (cleanerData as any).id)

        if (appData) {
          const apps = appData as Array<{ id: string; status: string; request_id: string; clean_requests: { status: string } | null }>
          const pending = apps.filter(a => a.status === 'pending').length
          const chatsAccepted = apps.filter(a => a.status === 'accepted').length
          const chatsDeclined = apps.filter(a => a.status === 'rejected' || a.status === 'declined').length
          const jobsWon = apps.filter(a => a.status === 'accepted' && a.clean_requests?.status === 'fulfilled').length
          // Unique customers = distinct fulfilled requests where this cleaner won
          const uniqueCustomers = new Set(apps.filter(a => a.status === 'accepted' && a.clean_requests?.status === 'fulfilled').map(a => a.request_id)).size

          setStats({ pendingApplications: pending, jobsWon, chatsAccepted, chatsDeclined, uniqueCustomers })
        }

        // Fetch notifications (table may not exist yet — handle gracefully)
        const { data: notifData, error: notifError } = await supabase
          .from('notifications')
          .select('id, type, title, body, link, read, created_at')
          .eq('cleaner_id', (cleanerData as any).id)
          .order('created_at', { ascending: false })
          .limit(10)

        if (!notifError && notifData) {
          setNotifications(notifData as NotificationItem[])
        }
      } catch (err: any) {
        setError(err?.message ?? 'Something went wrong.')
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [router])

  // Toggle a notification preference — optimistic update with rollback on error
  const togglePreference = async (field: 'job_notify' | 'cover_cleans_notify' | 'marketing_opt_in') => {
    if (!cleaner) return
    const previous = cleaner[field]
    const next = !previous

    setCleaner({ ...cleaner, [field]: next })

    const supabase = createClient()
    const { error } = await (supabase.from('cleaners') as any)
      .update({ [field]: next })
      .eq('id', (cleaner as any).id)

    if (error) {
      // Revert
      setCleaner({ ...cleaner, [field]: previous })
      console.error('Failed to update notification preference:', error)
    }
  }

  const handleNotificationClick = async (n: NotificationItem) => {
    if (!n.read) {
      // Optimistic mark-as-read
      setNotifications(prev => prev.map(item => item.id === n.id ? { ...item, read: true } : item))
      try {
        await fetch('/api/notifications/read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: [n.id] }),
        })
      } catch (e) {
        console.error('Failed to mark notification read:', e)
      }
    }
    if (n.link) router.push(n.link)
  }

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg, #f0f7ff 0%, #fefce8 50%, #f0fdf4 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>🧹</div>
          <p style={{ fontSize: '14px', color: '#64748b' }}>Loading your dashboard…</p>
        </div>
      </div>
    )
  }

  if (error || !profile || !cleaner) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg, #f0f7ff 0%, #fefce8 50%, #f0fdf4 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif", padding: '24px' }}>
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

  const status = cleaner.application_status

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg, #f0f7ff 0%, #fefce8 50%, #f0fdf4 100%)', fontFamily: "'DM Sans', sans-serif", display: 'flex', flexDirection: 'column' }}>
      <Header userRole="cleaner" />
      <main style={{ flex: 1 }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 24px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', margin: '0 0 2px' }}>
              {status === 'approved' ? 'Your dashboard' : 'Application status'}
            </h1>
            <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>{profile.email}</p>
          </div>
          {status === 'approved' && <StatusBadge status={status} />}
        </div>

        {(status === 'submitted' || status === 'pending') && (
          <PendingScreen profile={profile} cleaner={cleaner} emailConfirmed={emailConfirmed} />
        )}

        {status === 'approved' && (
          <ApprovedDashboard
            profile={profile}
            cleaner={cleaner}
            stats={stats}
            notifications={notifications}
            onTogglePref={togglePreference}
            onNotificationClick={handleNotificationClick}
          />
        )}

        {(status === 'rejected' || status === 'suspended') && (
          <BlockedScreen status={status} />
        )}
      </main>

      <div style={{ borderTop: '1px solid #e2e8f0', padding: '24px', display: 'flex', justifyContent: 'center' }}>
        <button
          onClick={handleSignOut}
          style={{ background: 'none', border: '1px solid #fecaca', borderRadius: '8px', padding: '8px 20px', fontSize: '13px', fontWeight: 600, color: '#ef4444', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
        >
          Sign out
        </button>
      </div>
      <Footer />
    </div>
  )
}
