'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

// ─────────────────────────────────────────────────────────────────────────────
// CustomerNameModal — first name + last name editor for the customer dashboard
// greeting. Persists to profiles.full_name as `${first} ${last}`. The first-
// name half is what the cleaner acceptance email reads (split on space), so
// updating here automatically threads through.
// ─────────────────────────────────────────────────────────────────────────────

function isValidName(name: string): boolean {
  return name.trim().length >= 1 && /^[A-Za-zÀ-ÖØ-öø-ÿ'\- ]+$/.test(name.trim())
}

function splitName(full: string): { first: string; last: string } {
  const parts = (full ?? '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return { first: '', last: '' }
  if (parts.length === 1) return { first: parts[0], last: '' }
  return { first: parts[0], last: parts.slice(1).join(' ') }
}

interface Props {
  profileId: string
  initialFullName: string
  onClose: () => void
  onSaved: (nextFullName: string) => void
}

export function CustomerNameModal({ profileId, initialFullName, onClose, onSaved }: Props) {
  const seed = splitName(initialFullName)
  const [firstName, setFirstName] = useState(seed.first)
  const [lastName, setLastName]   = useState(seed.last)
  const [errors, setErrors]       = useState<{ first?: string; last?: string }>({})
  const [saving, setSaving]       = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const handleSave = async () => {
    const e: { first?: string; last?: string } = {}
    if (!firstName.trim()) e.first = 'Please enter your first name.'
    else if (!isValidName(firstName)) e.first = 'Use only letters, spaces, hyphens, or apostrophes.'
    if (!lastName.trim()) e.last = 'Please enter your last name.'
    else if (!isValidName(lastName)) e.last = 'Use only letters, spaces, hyphens, or apostrophes.'
    setErrors(e)
    if (Object.keys(e).length > 0) return

    setSaving(true)
    setSaveError(null)
    const next = `${firstName.trim()} ${lastName.trim()}`
    try {
      const supabase = createClient()
      const { error } = await (supabase.from('profiles') as any)
        .update({ full_name: next })
        .eq('id', profileId)
      if (error) {
        console.error('Save name failed:', error)
        setSaveError('Could not save your name — please try again.')
        setSaving(false)
        return
      }
      onSaved(next)
      onClose()
    } catch (err: any) {
      console.error('Save name threw:', err)
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
          background: 'white', borderRadius: '24px', width: '100%', maxWidth: '440px',
          maxHeight: '88vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
        }}
      >
        <div style={{
          position: 'sticky', top: 0, background: 'white', borderBottom: '1px solid #f1f5f9',
          padding: '18px 24px', zIndex: 10, borderRadius: '24px 24px 0 0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div style={{ fontSize: '17px', fontWeight: 700, color: '#0f172a' }}>Your name</div>
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

        <div style={{ padding: '24px' }}>
          <p style={{ margin: '0 0 18px', fontSize: '13px', color: '#64748b', lineHeight: 1.55 }}>
            This is the name cleaners will see when you accept their application.
          </p>

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>First name</label>
            <input
              type="text"
              value={firstName}
              onChange={e => { setFirstName(e.target.value); if (errors.first) setErrors(x => ({ ...x, first: undefined })) }}
              placeholder="e.g. Sarah"
              style={errors.first ? inputErrorStyle : inputStyle}
              autoComplete="given-name"
            />
            {errors.first && <p style={fieldErrorStyle}>⚠ {errors.first}</p>}
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>Last name</label>
            <input
              type="text"
              value={lastName}
              onChange={e => { setLastName(e.target.value); if (errors.last) setErrors(x => ({ ...x, last: undefined })) }}
              placeholder="e.g. Mitchell"
              style={errors.last ? inputErrorStyle : inputStyle}
              autoComplete="family-name"
            />
            {errors.last && <p style={fieldErrorStyle}>⚠ {errors.last}</p>}
          </div>

          {saveError && (
            <div style={{
              background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px',
              padding: '10px 14px', marginBottom: '14px', fontSize: '12px', color: '#dc2626'
            }}>
              {saveError}
            </div>
          )}

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
                flex: 1, padding: '12px', background: saving ? '#93c5fd' : '#3b82f6', color: 'white',
                border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: 700,
                cursor: saving ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif",
                boxShadow: saving ? 'none' : '0 2px 8px rgba(59,130,246,0.25)',
              }}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
