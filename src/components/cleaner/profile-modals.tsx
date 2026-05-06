'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

// ─────────────────────────────────────────────────────────────────────────────
// Cleaner profile modals — Notifications + Personal Details.
//
// Two self-contained modals used by /cleaner/dashboard. Both follow a
// "save button" pattern (no auto-save) and persist directly to Supabase
// via the cleaner's profile_id / cleaner.id.
//
// Notifications modal: zones grid (text bubbles, grey/green) + cover cleans
// toggle + marketing toggle. Empty zones is allowed — hint shows underneath.
//
// Personal details modal: name + phone (validated) + read-only email with
// a redirect-to-support note. Self-serve email change is intentionally OUT
// for v1.
// ─────────────────────────────────────────────────────────────────────────────

// All 9 Horsham zones — same set as onboarding form (AREA_TO_ID)
// Using the database-side IDs as keys, friendly labels as values.
const ZONE_OPTIONS: { id: string; label: string }[] = [
  { id: 'central_south_east',     label: 'Central / South East' },
  { id: 'north_west',             label: 'North West' },
  { id: 'north_east_roffey',      label: 'North East / Roffey' },
  { id: 'south_west',             label: 'South West' },
  { id: 'warnham_north',          label: 'Warnham / North' },
  { id: 'broadbridge_heath',      label: 'Broadbridge Heath' },
  { id: 'mannings_heath',         label: 'Mannings Heath' },
  { id: 'faygate_kilnwood_vale',  label: 'Faygate / Kilnwood Vale' },
  { id: 'christs_hospital',       label: "Christ's Hospital" },
]

// ─── Validation helpers (mirror onboarding form) ────────────────────────────
// Kept in this file so the modal validates identically to signup. If we
// ever centralise these, this is one of the places to update.

function isValidName(name: string): boolean {
  return name.trim().length >= 2 && /^[A-Za-zÀ-ÖØ-öø-ÿ'\- ]+$/.test(name.trim())
}

function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/[\s\-()]/g, '')
  return /^(\+44|0)7\d{9}$/.test(digits) || /^(\+44|0)[1-9]\d{8,9}$/.test(digits)
}

// ─── Shared modal shell ──────────────────────────────────────────────────────
// Identical visual shell used by both modals — close button top-right,
// blurred backdrop, sticky header, scrollable body.

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
        fontFamily: "'DM Sans', sans-serif"
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'white', borderRadius: '24px', width: '100%', maxWidth: '520px',
          maxHeight: '88vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
        }}
      >
        <div style={{
          position: 'sticky', top: 0, background: 'white', borderBottom: '1px solid #f1f5f9',
          padding: '18px 24px', zIndex: 10, borderRadius: '24px 24px 0 0'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '17px', fontWeight: 700, color: '#0f172a' }}>{title}</div>
            <button
              onClick={onClose}
              aria-label="Close"
              style={{
                background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px',
                fontSize: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#64748b'
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

// ═════════════════════════════════════════════════════════════════════════════
// NotificationsModal — zones grid + cover_cleans_notify + marketing_opt_in
// ═════════════════════════════════════════════════════════════════════════════

interface NotificationsModalProps {
  cleanerId: string
  initialZones: string[]
  initialCoverCleans: boolean
  initialMarketing: boolean
  onClose: () => void
  onSaved: (next: { zones: string[]; cover_cleans_notify: boolean; marketing_opt_in: boolean }) => void
}

export function NotificationsModal({
  cleanerId,
  initialZones,
  initialCoverCleans,
  initialMarketing,
  onClose,
  onSaved,
}: NotificationsModalProps) {
  const [zones, setZones]                     = useState<string[]>(initialZones ?? [])
  const [coverCleans, setCoverCleans]         = useState<boolean>(initialCoverCleans)
  const [marketing, setMarketing]             = useState<boolean>(initialMarketing)
  const [saving, setSaving]                   = useState(false)
  const [saveError, setSaveError]             = useState<string | null>(null)

  const toggleZone = (id: string) => {
    setZones(prev => prev.includes(id) ? prev.filter(z => z !== id) : [...prev, id])
  }

  const selectAll = () => setZones(ZONE_OPTIONS.map(z => z.id))
  const clearAll  = () => setZones([])

  const allSelected = zones.length === ZONE_OPTIONS.length

  const handleSave = async () => {
    setSaving(true)
    setSaveError(null)
    try {
      const supabase = createClient()
      const { error } = await (supabase.from('cleaners') as any)
        .update({
          zones,
          cover_cleans_notify: coverCleans,
          marketing_opt_in: marketing,
        })
        .eq('id', cleanerId)

      if (error) {
        console.error('Save notifications failed:', error)
        setSaveError('Could not save your changes — please try again.')
        setSaving(false)
        return
      }

      onSaved({ zones, cover_cleans_notify: coverCleans, marketing_opt_in: marketing })
      onClose()
    } catch (err: any) {
      console.error('Save notifications threw:', err)
      setSaveError('Something went wrong — please try again.')
      setSaving(false)
    }
  }

  return (
    <ModalShell title="Notification preferences" onClose={onClose}>
      {/* ── Zones section ────────────────────────────────────────────────── */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '2px' }}>
              Areas you want job alerts for
            </div>
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>
              Tap zones to toggle on/off
            </div>
          </div>
          <button
            onClick={allSelected ? clearAll : selectAll}
            style={{
              background: 'none', border: 'none', fontSize: '12px', fontWeight: 600,
              color: '#3b82f6', cursor: 'pointer', padding: '4px 8px', fontFamily: "'DM Sans', sans-serif",
              flexShrink: 0,
            }}
          >
            {allSelected ? 'Clear all' : 'Select all'}
          </button>
        </div>

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px',
        }}>
          {ZONE_OPTIONS.map(z => {
            const on = zones.includes(z.id)
            return (
              <button
                key={z.id}
                onClick={() => toggleZone(z.id)}
                style={{
                  padding: '9px 12px', borderRadius: '10px', fontSize: '12px', fontWeight: 600,
                  cursor: 'pointer', border: '1.5px solid', textAlign: 'left',
                  transition: 'all 0.15s', fontFamily: "'DM Sans', sans-serif",
                  background:    on ? '#f0fdf4' : '#f8fafc',
                  borderColor:   on ? '#86efac' : '#e2e8f0',
                  color:         on ? '#15803d' : '#94a3b8',
                }}
              >
                {on ? '✓ ' : ''}{z.label}
              </button>
            )
          })}
        </div>

        {zones.length === 0 && (
          <p style={{ fontSize: '12px', color: '#94a3b8', margin: '10px 0 0', lineHeight: 1.5 }}>
            No zones selected — you won&apos;t receive job alerts.
          </p>
        )}
      </div>

      {/* ── Cover cleans toggle ─────────────────────────────────────────── */}
      <div style={{
        background: '#f8fafc', borderRadius: '12px', padding: '14px 16px', marginBottom: '10px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '2px' }}>
            🔄 Cover clean alerts
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.5 }}>
            One-off jobs where another cleaner needs cover. Often higher pay, fills quickly.
          </div>
        </div>
        <ModalToggle value={coverCleans} onChange={() => setCoverCleans(v => !v)} />
      </div>

      {/* ── Marketing toggle ────────────────────────────────────────────── */}
      <div style={{
        background: '#f8fafc', borderRadius: '12px', padding: '14px 16px', marginBottom: '20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '2px' }}>
            📣 Updates &amp; promotions
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.5 }}>
            Occasional emails about new features, tips, and offers.
          </div>
        </div>
        <ModalToggle value={marketing} onChange={() => setMarketing(v => !v)} />
      </div>

      {/* ── Error message ───────────────────────────────────────────────── */}
      {saveError && (
        <div style={{
          background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px',
          padding: '10px 14px', marginBottom: '14px', fontSize: '12px', color: '#dc2626'
        }}>
          {saveError}
        </div>
      )}

      {/* ── Save / cancel buttons ───────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={onClose}
          disabled={saving}
          style={{
            flex: 1, padding: '12px', background: 'white', color: '#475569',
            border: '1.5px solid #e2e8f0', borderRadius: '12px', fontSize: '14px', fontWeight: 600,
            cursor: saving ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            flex: 1, padding: '12px', background: saving ? '#86efac' : '#16a34a', color: 'white',
            border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: 700,
            cursor: saving ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif",
            boxShadow: saving ? 'none' : '0 2px 8px rgba(22,163,74,0.25)',
          }}
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </ModalShell>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// PersonalDetailsModal — name, phone, email (read-only with redirect)
// ═════════════════════════════════════════════════════════════════════════════

interface PersonalDetailsModalProps {
  profileId: string
  initialFullName: string
  initialEmail: string
  initialPhone: string | null
  onClose: () => void
  onSaved: (next: { full_name: string; phone: string }) => void
}

export function PersonalDetailsModal({
  profileId,
  initialFullName,
  initialEmail,
  initialPhone,
  onClose,
  onSaved,
}: PersonalDetailsModalProps) {
  const [fullName, setFullName]   = useState(initialFullName)
  const [phone, setPhone]         = useState(initialPhone ?? '')
  const [errors, setErrors]       = useState<{ fullName?: string; phone?: string }>({})
  const [saving, setSaving]       = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const handleSave = async () => {
    const e: { fullName?: string; phone?: string } = {}
    if (!fullName.trim()) e.fullName = 'Please enter your full name.'
    else if (!isValidName(fullName)) e.fullName = 'Use only letters, spaces, hyphens, or apostrophes.'
    if (!phone.trim()) e.phone = 'Please enter your phone number.'
    else if (!isValidPhone(phone)) e.phone = 'Please enter a valid UK phone number (e.g. 07700 900000).'
    setErrors(e)
    if (Object.keys(e).length > 0) return

    setSaving(true)
    setSaveError(null)
    try {
      const supabase = createClient()
      const { error } = await (supabase.from('profiles') as any)
        .update({
          full_name: fullName.trim(),
          phone: phone.trim(),
        })
        .eq('id', profileId)

      if (error) {
        console.error('Save personal details failed:', error)
        setSaveError('Could not save your changes — please try again.')
        setSaving(false)
        return
      }

      onSaved({ full_name: fullName.trim(), phone: phone.trim() })
      onClose()
    } catch (err: any) {
      console.error('Save personal details threw:', err)
      setSaveError('Something went wrong — please try again.')
      setSaving(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', background: '#f8faff', border: '1.5px solid #e2e8f0', borderRadius: '12px',
    padding: '11px 14px', fontSize: '14px', color: '#0f172a',
    fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box', outline: 'none',
  }
  const inputErrorStyle: React.CSSProperties = { ...inputStyle, borderColor: '#fca5a5', background: '#fff5f5' }
  const labelStyle: React.CSSProperties = {
    fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase',
    letterSpacing: '0.06em', display: 'block', marginBottom: '6px',
  }
  const fieldErrorStyle: React.CSSProperties = {
    fontSize: '12px', color: '#dc2626', marginTop: '6px', fontWeight: 500,
  }

  return (
    <ModalShell title="Your details" onClose={onClose}>
      {/* ── Full name ─────────────────────────────────────────────────── */}
      <div style={{ marginBottom: '16px' }}>
        <label style={labelStyle}>Full name</label>
        <input
          type="text"
          value={fullName}
          onChange={e => { setFullName(e.target.value); if (errors.fullName) setErrors(x => ({ ...x, fullName: undefined })) }}
          placeholder="e.g. Sarah Mitchell"
          style={errors.fullName ? inputErrorStyle : inputStyle}
        />
        {errors.fullName && <p style={fieldErrorStyle}>⚠ {errors.fullName}</p>}
      </div>

      {/* ── Phone ────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: '16px' }}>
        <label style={labelStyle}>Phone number</label>
        <input
          type="tel"
          value={phone}
          onChange={e => { setPhone(e.target.value); if (errors.phone) setErrors(x => ({ ...x, phone: undefined })) }}
          placeholder="07700 000000"
          style={errors.phone ? inputErrorStyle : inputStyle}
        />
        {errors.phone && <p style={fieldErrorStyle}>⚠ {errors.phone}</p>}
      </div>

      {/* ── Email (read-only) ────────────────────────────────────────── */}
      <div style={{ marginBottom: '20px' }}>
        <label style={labelStyle}>Email address</label>
        <input
          type="email"
          value={initialEmail}
          readOnly
          style={{
            ...inputStyle,
            background: '#f1f5f9', color: '#64748b', cursor: 'not-allowed',
          }}
        />
        <p style={{ fontSize: '12px', color: '#94a3b8', margin: '6px 0 0', lineHeight: 1.5 }}>
          To change your email, contact{' '}
          <a href="mailto:cleaners@vouchee.co.uk" style={{ color: '#3b82f6', fontWeight: 600 }}>
            cleaners@vouchee.co.uk
          </a>.
        </p>
      </div>

      {/* ── Save error ────────────────────────────────────────────────── */}
      {saveError && (
        <div style={{
          background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px',
          padding: '10px 14px', marginBottom: '14px', fontSize: '12px', color: '#dc2626'
        }}>
          {saveError}
        </div>
      )}

      {/* ── Save / cancel buttons ───────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={onClose}
          disabled={saving}
          style={{
            flex: 1, padding: '12px', background: 'white', color: '#475569',
            border: '1.5px solid #e2e8f0', borderRadius: '12px', fontSize: '14px', fontWeight: 600,
            cursor: saving ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            flex: 1, padding: '12px', background: saving ? '#86efac' : '#16a34a', color: 'white',
            border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: 700,
            cursor: saving ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif",
            boxShadow: saving ? 'none' : '0 2px 8px rgba(22,163,74,0.25)',
          }}
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </ModalShell>
  )
}

// ─── Local toggle component (matches Toggle in cleaner dashboard) ────────────
// Local copy so the modal file is self-contained and doesn't need to import
// from the dashboard page. Visually identical to the dashboard's Toggle.

function ModalToggle({ value, onChange }: { value: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      aria-pressed={value}
      style={{
        width: '36px', height: '22px', borderRadius: '100px',
        background: value ? '#16a34a' : '#cbd5e1',
        border: 'none', position: 'relative', cursor: 'pointer',
        transition: 'background 0.15s ease', padding: 0, flexShrink: 0,
      }}
    >
      <span style={{
        position: 'absolute', top: '3px',
        left: value ? '17px' : '3px',
        width: '16px', height: '16px', borderRadius: '50%', background: 'white',
        transition: 'left 0.15s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </button>
  )
}
