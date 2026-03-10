'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Check, Eye, EyeOff } from 'lucide-react'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'

// ── Constants ─────────────────────────────────────────────────

const ALL_AREAS = [
  'Central / South East',
  'North West',
  'North East / Roffey',
  'South West',
  'Warnham / Surrounding North',
  'Broadbridge Heath',
  'Mannings Heath',
  'Faygate / Kilnwood Vale',
  'Christs Hospital',
]

const AREA_TO_ID: Record<string, string> = {
  'Central / South East':       'central_south_east',
  'North West':                  'north_west',
  'North East / Roffey':        'north_east_roffey',
  'South West':                  'south_west',
  'Warnham / Surrounding North': 'warnham_north',
  'Broadbridge Heath':           'broadbridge_heath',
  'Mannings Heath':              'mannings_heath',
  'Faygate / Kilnwood Vale':    'faygate_kilnwood_vale',
  'Christs Hospital':            'christs_hospital',
}

const EXPERIENCE_TYPES = [
  { id: 'domestic',       label: 'Domestic cleaning' },
  { id: 'end_of_tenancy', label: 'End of tenancy cleaning' },
  { id: 'office',         label: 'Office / commercial cleaning' },
  { id: 'holiday_let',   label: 'Holiday let / Airbnb turnaround' },
  { id: 'care_home',     label: 'Care homes / assisted living' },
  { id: 'hospitality',   label: 'Hospitality / hotel housekeeping' },
]

// ── Validation helpers ────────────────────────────────────────

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

function isValidPhone(phone: string) {
  const digits = phone.replace(/[\s\-\(\)]/g, '')
  return /^(\+44|0)7\d{9}$/.test(digits) || /^(\+44|0)[1-9]\d{8,9}$/.test(digits)
}

function isValidName(name: string) {
  return name.trim().length >= 2 && /^[A-Za-zÀ-ÖØ-öø-ÿ'\- ]+$/.test(name.trim())
}

function isValidPassword(password: string) {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)
  )
}

// ── Coverage map ──────────────────────────────────────────────

function CoverageMap() {
  return (
    <div style={{
      width: '100%', borderRadius: '16px', overflow: 'hidden',
      border: '1.5px solid #e2e8f0', boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      background: '#e8f4f8', position: 'relative',
    }}>
      <TransformWrapper initialScale={1} minScale={1} maxScale={4} centerOnInit>
        {({ zoomIn, zoomOut, resetTransform }) => (
          <>
            <TransformComponent wrapperStyle={{ width: '100%', display: 'block' }} contentStyle={{ width: '100%' }}>
              <img
                src="/Vouchee_service_area.png"
                alt="Vouchee service area map"
                style={{ width: '100%', height: 'auto', display: 'block' }}
                draggable={false}
              />
            </TransformComponent>
            <div style={{ position: 'absolute', bottom: '12px', right: '12px', display: 'flex', flexDirection: 'column', gap: '4px', zIndex: 10 }}>
              <button onClick={() => zoomIn()} style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'white', border: '1px solid #e2e8f0', fontSize: '18px', fontWeight: 700, color: '#0f172a', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', fontFamily: 'inherit' }}>+</button>
              <button onClick={() => zoomOut()} style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'white', border: '1px solid #e2e8f0', fontSize: '18px', fontWeight: 700, color: '#0f172a', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', fontFamily: 'inherit' }}>−</button>
              <button onClick={() => resetTransform()} style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'white', border: '1px solid #e2e8f0', fontSize: '11px', fontWeight: 700, color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', fontFamily: 'inherit' }}>↺</button>
            </div>
            <div style={{ position: 'absolute', bottom: '12px', left: '12px', background: 'rgba(255,255,255,0.85)', borderRadius: '8px', padding: '5px 10px', fontSize: '11px', color: '#64748b', fontFamily: 'inherit', fontWeight: 600, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
              Scroll to zoom · Drag to pan
            </div>
          </>
        )}
      </TransformWrapper>
    </div>
  )
}

// ── Zone selector ─────────────────────────────────────────────

function ZoneSelector({ selectedAreas, onToggle, onToggleAll }: {
  selectedAreas: string[]
  onToggle: (area: string) => void
  onToggleAll: () => void
}) {
  const allSelected = selectedAreas.includes('__all__')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <CoverageMap />
      <div>
        <p style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
          Which areas are you happy to work in?
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <button type="button" onClick={onToggleAll} style={{
            gridColumn: '1 / -1', borderRadius: '10px', padding: '9px 12px',
            fontSize: '12px', fontWeight: 600, cursor: 'pointer',
            border: '1.5px solid', textAlign: 'left', transition: 'all 0.15s', fontFamily: 'inherit',
            background: allSelected ? 'rgba(59,130,246,0.06)' : 'rgba(255,255,255,0.7)',
            borderColor: allSelected ? '#3b82f6' : '#e2e8f0',
            color: allSelected ? '#1e40af' : '#475569',
          }}>
            {allSelected ? '✓ ' : ''}All areas
          </button>
          {!allSelected && ALL_AREAS.map(area => {
            const selected = selectedAreas.includes(area)
            return (
              <button key={area} type="button" onClick={() => onToggle(area)} style={{
                borderRadius: '10px', padding: '9px 12px',
                fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                border: '1.5px solid', textAlign: 'left', transition: 'all 0.15s', fontFamily: 'inherit',
                background: selected ? 'rgba(59,130,246,0.06)' : 'rgba(255,255,255,0.7)',
                borderColor: selected ? '#3b82f6' : '#e2e8f0',
                color: selected ? '#1e40af' : '#475569',
              }}>
                {selected ? '✓ ' : ''}{area}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Helper components ─────────────────────────────────────────

function SectionHeader({ step, title, subtitle }: { step: number; title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
        <div style={{
          width: '28px', height: '28px', borderRadius: '50%',
          background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '13px', fontWeight: 700, color: 'white', flexShrink: 0,
        }}>{step}</div>
        <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>{title}</h2>
      </div>
      {subtitle && (
        <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 0 38px', lineHeight: 1.5 }}>{subtitle}</p>
      )}
    </div>
  )
}

function Divider() {
  return <div style={{ height: '1px', background: '#e2e8f0', margin: '36px 0' }} />
}

function ToggleChip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      padding: '7px 16px', borderRadius: '100px', fontSize: '13px', fontWeight: 600,
      cursor: 'pointer', border: '1.5px solid', transition: 'all 0.15s', fontFamily: 'inherit',
      background: selected ? '#eff6ff' : 'white',
      borderColor: selected ? '#93c5fd' : '#e2e8f0',
      color: selected ? '#1d4ed8' : '#64748b',
    }}>{label}</button>
  )
}

function CheckToggle({ label, checked, onChange, description }: {
  label: string; checked: boolean; onChange: (v: boolean) => void; description?: string
}) {
  return (
    <button onClick={() => onChange(!checked)} style={{
      display: 'flex', alignItems: 'flex-start', gap: '12px', width: '100%',
      background: checked ? '#f0fdf4' : '#f8fafc',
      border: `1.5px solid ${checked ? '#86efac' : '#e2e8f0'}`,
      borderRadius: '12px', padding: '14px 16px', cursor: 'pointer', textAlign: 'left',
      transition: 'all 0.15s', fontFamily: 'inherit',
    }}>
      <div style={{
        width: '20px', height: '20px', borderRadius: '6px', flexShrink: 0, marginTop: '1px',
        background: checked ? '#16a34a' : 'white',
        border: `2px solid ${checked ? '#16a34a' : '#cbd5e1'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
      }}>
        {checked && <Check size={12} color="white" strokeWidth={3} />}
      </div>
      <div>
        <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>{label}</div>
        {description && (
          <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px', lineHeight: 1.4 }}>{description}</div>
        )}
      </div>
    </button>
  )
}

// ── Application card preview ──────────────────────────────────
// Shows cleaners exactly what a customer sees when they apply

function ApplicationCardPreview({ form }: { form: any }) {
  const nameParts = (form.full_name ?? '').trim().split(' ')
  const firstName = nameParts[0] || 'First name'
  const lastInitial = nameParts[1]?.[0] ? `${nameParts[1][0]}.` : ''
  const displayName = lastInitial ? `${firstName} ${lastInitial}` : firstName
  const now = new Date()
  const monthYear = now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

  return (
    <div style={{ maxWidth: '420px', margin: '0 auto' }}>

      {/* Card */}
      <div style={{
        background: 'white', borderRadius: '20px', border: '2px solid #e2e8f0',
        boxShadow: '0 8px 32px rgba(0,0,0,0.08)', overflow: 'hidden',
      }}>

        {/* Header bar — name, member since, always-verified badges */}
        <div style={{
          background: '#f8fafc', borderBottom: '1px solid #e2e8f0',
          padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '10px',
        }}>
          <div style={{
            width: '38px', height: '38px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '15px', fontWeight: 800, color: 'white', flexShrink: 0,
          }}>
            {firstName[0]?.toUpperCase() || 'V'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>{displayName}</div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>Member since {monthYear}</div>
          </div>
          {/* Badges are always shown — account only goes live once verified */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end', flexShrink: 0 }}>
            {['DBS checked', 'Right to work', 'Insured'].map(badge => (
              <span key={badge} style={{
                display: 'flex', alignItems: 'center', gap: '3px',
                background: '#f0fdf4', border: '1px solid #86efac',
                borderRadius: '100px', padding: '3px 8px',
                fontSize: '10px', fontWeight: 700, color: '#15803d', whiteSpace: 'nowrap',
              }}>
                <Check size={9} strokeWidth={3} /> {badge}
              </span>
            ))}
          </div>
        </div>

        {/* Chat bubble — application message */}
        <div style={{ padding: '16px 16px 10px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
            <div style={{
              width: '28px', height: '28px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '11px', fontWeight: 800, color: 'white', flexShrink: 0, marginTop: '2px',
            }}>
              {firstName[0]?.toUpperCase() || 'V'}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{
                background: '#eff6ff',
                borderRadius: '4px 18px 18px 18px',
                padding: '12px 14px',
                border: '1px solid #bfdbfe',
              }}>
                <p style={{
                  fontSize: '14px', color: '#1e40af', lineHeight: 1.6, margin: 0, fontStyle: 'italic',
                }}>
                  "Your chosen message to this customer would appear here — introduce yourself, mention your experience, or let them know why you'd be a great fit."
                </p>
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', paddingLeft: '2px' }}>
                {displayName} · Just now
              </div>
            </div>
          </div>
        </div>

        {/* Rating */}
        <div style={{
          padding: '8px 16px 12px', display: 'flex', alignItems: 'center', gap: '6px',
          borderBottom: '1px solid #f1f5f9',
        }}>
          {[1,2,3,4,5].map(i => <span key={i} style={{ fontSize: '14px', color: '#f59e0b' }}>★</span>)}
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>5.0</span>
          <span style={{ fontSize: '13px', color: '#94a3b8' }}>· 0 cleans completed</span>
        </div>

        {/* Blurred reviews */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Reviews</div>
          {[
            { text: 'Absolutely brilliant — left the house spotless. Would highly recommend to anyone looking for a reliable cleaner.', name: 'Emma T.' },
            { text: 'Very professional and thorough. Always on time and incredibly easy to communicate with. A real gem!', name: 'James R.' },
          ].map((review, i) => (
            <div key={i} style={{
              background: '#f8fafc', borderRadius: '10px', padding: '10px 12px',
              marginBottom: i === 0 ? '6px' : 0,
              filter: 'blur(3.5px)', userSelect: 'none', pointerEvents: 'none',
            }}>
              <div style={{ fontSize: '12px', color: '#475569', lineHeight: 1.5, marginBottom: '4px' }}>"{review.text}"</div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8' }}>— {review.name}</div>
            </div>
          ))}
          <div style={{ textAlign: 'center', marginTop: '8px', fontSize: '12px', color: '#94a3b8' }}>
            Accept a cleaner's application to view their reviews.
          </div>
        </div>

        {/* Accept / Reject */}
        <div style={{ padding: '14px 16px', display: 'flex', gap: '10px' }}>
          <button style={{
            flex: 1, padding: '12px', borderRadius: '12px',
            background: 'linear-gradient(135deg, #22c55e, #16a34a)',
            color: 'white', border: 'none', fontSize: '13px', fontWeight: 700,
            cursor: 'default', fontFamily: 'inherit',
            boxShadow: '0 2px 8px rgba(34,197,94,0.25)',
          }}>
            ✓ Accept &amp; open chat
          </button>
          <button style={{
            flex: 1, padding: '12px', borderRadius: '12px',
            background: '#f8fafc', color: '#64748b',
            border: '1.5px solid #e2e8f0', fontSize: '13px', fontWeight: 700,
            cursor: 'default', fontFamily: 'inherit',
          }}>
            ✕ Decline &amp; notify
          </button>
        </div>

      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────

export default function CleanerOnboarding() {
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [missingCredentials, setMissingCredentials] = useState(false)
  const [platformAgreement, setPlatformAgreement] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    confirm_password: '',
    phone: '',
    years_experience: '',
    experience_types: [] as string[],
    experience_other: '',
    own_supplies: false,
    dbs_checked: false,
    right_to_work: false,
    has_insurance: false,
    needs_credentials_help: false,
    selectedAreas: [] as string[],
    cover_cleans_notify: true,
    job_notify: true,
    marketing_opt_in: false,
  })

  const set = (key: string, value: any) => {
    setForm(f => {
      const next = { ...f, [key]: value }

      // Live password validation
      if (key === 'password') {
        if (value && !isValidPassword(value)) {
          setErrors(e => ({ ...e, password: 'Must be 8+ characters, one uppercase letter, and one number or symbol.' }))
        } else {
          setErrors(e => { const n = { ...e }; delete n.password; return n })
        }
        // Re-check confirm match
        if (next.confirm_password) {
          if (value !== next.confirm_password) {
            setErrors(e => ({ ...e, confirm_password: 'Passwords do not match.' }))
          } else {
            setErrors(e => { const n = { ...e }; delete n.confirm_password; return n })
          }
        }
      }

      // Live confirm password validation
      if (key === 'confirm_password') {
        if (value && value !== next.password) {
          setErrors(e => ({ ...e, confirm_password: 'Passwords do not match.' }))
        } else {
          setErrors(e => { const n = { ...e }; delete n.confirm_password; return n })
        }
      }

      return next
    })
    // Clear non-password field errors on change
    if (key !== 'password' && key !== 'confirm_password') {
      if (errors[key]) setErrors(e => { const next = { ...e }; delete next[key]; return next })
    }
  }

  const toggleArr = (key: string, value: string) => {
    const arr = (form as any)[key] as string[]
    set(key, arr.includes(value) ? arr.filter((v: string) => v !== value) : [...arr, value])
  }

  const handleToggleArea = (area: string) => {
    setForm(f => {
      const areas = f.selectedAreas.filter(a => a !== '__all__')
      return {
        ...f,
        selectedAreas: areas.includes(area) ? areas.filter(a => a !== area) : [...areas, area],
      }
    })
  }

  const handleToggleAll = () => {
    setForm(f => ({
      ...f,
      selectedAreas: f.selectedAreas.includes('__all__') ? [] : ['__all__'],
    }))
  }

  const validate = () => {
    const e: Record<string, string> = {}

    if (!form.full_name.trim()) {
      e.full_name = 'Please enter your full name.'
    } else if (!isValidName(form.full_name)) {
      e.full_name = 'Name should only contain letters, spaces, hyphens or apostrophes — no numbers.'
    }

    if (!form.email.trim()) {
      e.email = 'Please enter your email address.'
    } else if (!isValidEmail(form.email)) {
      e.email = 'Please enter a valid email address (e.g. you@example.com).'
    }

    if (!form.phone.trim()) {
      e.phone = 'Please enter your phone number.'
    } else if (!isValidPhone(form.phone)) {
      e.phone = 'Please enter a valid UK phone number (e.g. 07700 900000).'
    }

    if (!form.password) {
      e.password = 'Please set a password.'
    } else if (!isValidPassword(form.password)) {
      e.password = 'Password must be at least 8 characters and include one uppercase letter and one number or symbol.'
    }

    if (!form.confirm_password) {
      e.confirm_password = 'Please confirm your password.'
    } else if (form.password !== form.confirm_password) {
      e.confirm_password = 'Passwords do not match — please check and try again.'
    }

    if (form.selectedAreas.length === 0) {
      e.selectedAreas = 'Please select at least one area you\'re happy to cover.'
    }

    if (!platformAgreement) {
      e.platformAgreement = 'You must read and agree to this before submitting your application.'
    }

    return e
  }

  const handleSubmit = async () => {
    setSubmitError(null)
    const e = validate()
    if (Object.keys(e).length > 0) {
      setErrors(e)
      const firstKey = Object.keys(e)[0]
      const el = document.getElementById(`field-${firstKey}`)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

    setSubmitting(true)
    try {
      const supabase = createClient()

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email.trim(),
        password: form.password,
        options: { data: { full_name: form.full_name.trim() } },
      })
      if (authError) throw new Error(authError.message)
      if (!authData.user) throw new Error('Account creation failed. Please try again.')

      const userId = authData.user.id

      const { error: profileError } = await (supabase as any)
        .from('profiles')
        .upsert({
          id: userId,
          email: form.email.trim(),
          full_name: form.full_name.trim(),
          phone: form.phone.trim(),
          role: 'cleaner',
        }, { onConflict: 'id' })
      if (profileError) throw new Error(profileError.message)

      const zones = form.selectedAreas.includes('__all__')
        ? Object.values(AREA_TO_ID)
        : form.selectedAreas.map(a => AREA_TO_ID[a]).filter(Boolean)

      const experienceFull = [
        ...form.experience_types,
        ...(form.experience_other.trim() ? [`other: ${form.experience_other.trim()}`] : []),
      ]

      const { error: cleanerError } = await (supabase as any)
        .from('cleaners')
        .insert({
          profile_id: userId,
          application_status: 'submitted',
          years_experience: form.years_experience ? parseInt(form.years_experience) : null,
          bio: experienceFull.length > 0 ? experienceFull.join(', ') : null,
          own_supplies: form.own_supplies,
          dbs_checked: form.dbs_checked,
          right_to_work: form.right_to_work,
          has_insurance: form.has_insurance,
          needs_credentials_help: form.needs_credentials_help,
          zones,
          cover_cleans_notify: form.cover_cleans_notify,
          job_notify: form.job_notify,
          marketing_opt_in: form.marketing_opt_in,
          onboarding_completed_at: new Date().toISOString(),
        })
      if (cleanerError) throw new Error(cleanerError.message)

      setSubmitted(true)
    } catch (err: any) {
      setSubmitError(err?.message ?? 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const inputStyle = {
    width: '100%', background: '#f8faff', border: '1.5px solid #e2e8f0',
    borderRadius: '12px', padding: '12px 14px', fontSize: '14px', color: '#1e293b',
    fontFamily: 'inherit', boxSizing: 'border-box' as const, outline: 'none',
  }
  const inputErrorStyle = { ...inputStyle, borderColor: '#fca5a5', background: '#fff5f5' }
  const labelStyle = {
    fontSize: '12px', fontWeight: 700 as const, color: '#64748b',
    textTransform: 'uppercase' as const, letterSpacing: '0.06em', display: 'block', marginBottom: '8px',
  }
  const fieldErrorStyle = { fontSize: '12px', color: '#dc2626', marginTop: '6px', fontWeight: 500 as const }

  // ── Success screen ──────────────────────────────────────────

  if (submitted) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #f0f7ff 0%, #fefce8 50%, #f0fdf4 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
      }}>
        <div style={{
          background: 'white', borderRadius: '24px', padding: '48px 40px',
          maxWidth: '480px', width: '100%', textAlign: 'center',
          boxShadow: '0 8px 40px rgba(0,0,0,0.08)',
        }}>
          <div style={{ fontSize: '56px', marginBottom: '16px' }}>🎉</div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', marginBottom: '12px' }}>Application submitted!</h1>
          <p style={{ fontSize: '15px', color: '#64748b', lineHeight: 1.6, marginBottom: '8px' }}>
            Thanks for applying to join Vouchee. We'll review your application and be in touch within 3 working days to arrange a quick call.
          </p>
          <p style={{ fontSize: '14px', color: '#94a3b8', lineHeight: 1.6, marginBottom: '32px' }}>
            Keep an eye on your inbox — we may follow up with a few questions beforehand.
          </p>
          <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: '14px', padding: '16px', marginBottom: '28px' }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#15803d', lineHeight: 1.5 }}>
              ✅ Your account has been created. Once approved, you'll be able to log in and start applying for jobs.
            </div>
          </div>
          <a href="mailto:cleaners@vouchee.co.uk" style={{ fontSize: '14px', color: '#3b82f6', fontWeight: 600, textDecoration: 'none' }}>
            Questions? cleaners@vouchee.co.uk
          </a>
        </div>
      </div>
    )
  }

  // ── Main form ───────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg, #f0f7ff 0%, #fefce8 50%, #f0fdf4 100%)' }}>

      {/* Minimal header */}
      <div style={{ borderBottom: '1px solid #e2e8f0', background: 'white', padding: '0 24px' }}>
        <div style={{ maxWidth: '680px', margin: '0 auto', height: '60px', display: 'flex', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '8px',
              background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: '16px', fontWeight: 800, color: 'white' }}>V</span>
            </div>
            <span style={{ fontSize: '17px', fontWeight: 700, color: '#0f172a' }}>Vouchee</span>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '40px 24px 80px' }}>

        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a', marginBottom: '12px', lineHeight: 1.2 }}>
            Tell us about yourself
          </h1>
          <p style={{ fontSize: '16px', color: '#64748b', lineHeight: 1.6, maxWidth: '480px', margin: '0 auto' }}>
            Fill in the form below and we'll be in touch within 3 working days. <em>It takes roughly 4 minutes to complete this final step.</em>
          </p>
        </div>

        <div style={{ background: 'white', borderRadius: '24px', padding: '40px', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>

          {/* ── 1: Personal details ── */}
          <SectionHeader
            step={1}
            title="Personal details"
            subtitle="This is how we'll contact you. Your surname won't be shown publicly."
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            <div id="field-full_name">
              <label style={labelStyle}>Full name</label>
              <input
                style={errors.full_name ? inputErrorStyle : inputStyle}
                placeholder="e.g. Sarah Mitchell"
                value={form.full_name}
                onChange={e => set('full_name', e.target.value)}
              />
              {errors.full_name && <p style={fieldErrorStyle}>⚠ {errors.full_name}</p>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div id="field-email">
                <label style={labelStyle}>Email address</label>
                <input
                  type="email"
                  style={errors.email ? inputErrorStyle : inputStyle}
                  placeholder="sarah@example.com"
                  value={form.email}
                  onChange={e => set('email', e.target.value)}
                />
                {errors.email && <p style={fieldErrorStyle}>⚠ {errors.email}</p>}
              </div>
              <div id="field-phone">
                <label style={labelStyle}>Phone number</label>
                <input
                  type="tel"
                  style={errors.phone ? inputErrorStyle : inputStyle}
                  placeholder="07700 000000"
                  value={form.phone}
                  onChange={e => set('phone', e.target.value)}
                />
                {errors.phone && <p style={fieldErrorStyle}>⚠ {errors.phone}</p>}
              </div>
            </div>

            <div id="field-password">
              <label style={labelStyle}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  style={{ ...(errors.password ? inputErrorStyle : inputStyle), paddingRight: '44px' }}
                  placeholder="At least 8 characters"
                  value={form.password}
                  onChange={e => set('password', e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  style={{
                    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px',
                    transition: 'color 0.15s',
                  }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '6px' }}>
                Must include at least one uppercase letter and one number or symbol (e.g. <span style={{ fontFamily: 'monospace' }}>Cleaning1!</span>).
              </p>
              {errors.password && <p style={fieldErrorStyle}>⚠ {errors.password}</p>}
            </div>

            <div id="field-confirm_password">
              <label style={labelStyle}>Confirm password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showConfirm ? 'text' : 'password'}
                  style={{ ...(errors.confirm_password ? inputErrorStyle : inputStyle), paddingRight: '44px' }}
                  placeholder="Re-enter your password"
                  value={form.confirm_password}
                  onChange={e => set('confirm_password', e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(v => !v)}
                  style={{
                    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px',
                    transition: 'color 0.15s',
                  }}
                  aria-label={showConfirm ? 'Hide password' : 'Show password'}
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.confirm_password && <p style={fieldErrorStyle}>⚠ {errors.confirm_password}</p>}
              {!errors.confirm_password && form.confirm_password && form.password === form.confirm_password && (
                <p style={{ fontSize: '12px', color: '#16a34a', marginTop: '6px', fontWeight: 600 }}>✓ Passwords match</p>
              )}
            </div>

          </div>

          <Divider />

          {/* ── 2: Experience ── */}
          <SectionHeader step={2} title="Your experience" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={labelStyle}>Years of cleaning experience</label>
              <select
                style={{ ...inputStyle, appearance: 'none' as const, cursor: 'pointer' }}
                value={form.years_experience}
                onChange={e => set('years_experience', e.target.value)}
              >
                <option value="">Select…</option>
                <option value="0">Less than 1 year</option>
                <option value="1">1–2 years</option>
                <option value="3">3–5 years</option>
                <option value="6">6–10 years</option>
                <option value="11">10+ years</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Types of cleaning experience</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                {EXPERIENCE_TYPES.map(t => (
                  <ToggleChip key={t.id} label={t.label}
                    selected={form.experience_types.includes(t.id)}
                    onClick={() => toggleArr('experience_types', t.id)} />
                ))}
                <ToggleChip label="Other"
                  selected={form.experience_types.includes('other')}
                  onClick={() => toggleArr('experience_types', 'other')} />
              </div>
              {form.experience_types.includes('other') && (
                <input
                  style={inputStyle}
                  placeholder="Please describe your other cleaning experience"
                  value={form.experience_other}
                  onChange={e => set('experience_other', e.target.value)}
                />
              )}
            </div>
            <CheckToggle
              label="I bring my own cleaning supplies and equipment"
              checked={form.own_supplies}
              onChange={v => set('own_supplies', v)}
              description="Make sure to agree with customers which products you'll use beforehand — some prefer eco-friendly products or have allergies."
            />
          </div>

          <Divider />

          {/* ── 3: Credentials ── */}
          <SectionHeader
            step={3}
            title="Credentials & accreditations"
            subtitle="Vouchee requires all cleaners to have a valid DBS check, right to work in the UK, and public liability insurance. If you don't have everything yet, we can help."
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <CheckToggle label="I have a valid DBS check" checked={form.dbs_checked} onChange={v => set('dbs_checked', v)} />
            <CheckToggle label="I have the right to work in the UK" checked={form.right_to_work} onChange={v => set('right_to_work', v)} />
            <CheckToggle label="I have public liability insurance" checked={form.has_insurance} onChange={v => set('has_insurance', v)} />

            {(!form.dbs_checked || !form.right_to_work || !form.has_insurance) && (
              <div style={{ marginTop: '4px' }}>
                <button
                  onClick={() => {
                    const opening = !missingCredentials
                    setMissingCredentials(opening)
                    if (opening) set('needs_credentials_help', true)
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    background: missingCredentials ? '#fffbeb' : '#f8fafc',
                    border: `1.5px solid ${missingCredentials ? '#fde68a' : '#e2e8f0'}`,
                    borderRadius: '12px', padding: '12px 16px', cursor: 'pointer',
                    fontSize: '14px', fontWeight: 600,
                    color: missingCredentials ? '#92400e' : '#475569',
                    width: '100%', textAlign: 'left', transition: 'all 0.15s', fontFamily: 'inherit',
                  }}
                >
                  <span style={{ fontSize: '16px' }}>📋</span>
                  I don't have everything just yet
                </button>

                {missingCredentials && (
                  <div style={{
                    background: '#fffbeb', border: '1.5px solid #fde68a',
                    borderRadius: '12px', padding: '16px', marginTop: '8px',
                    display: 'flex', flexDirection: 'column', gap: '12px',
                  }}>
                    <p style={{ fontSize: '14px', color: '#92400e', margin: 0, lineHeight: 1.6 }}>
                      No problem — you can still apply. Tick the box below and we'll email you a step-by-step guide on how to get your DBS certificate and public liability insurance.
                    </p>
                    <CheckToggle
                      label="Email me a simple step-by-step guide on getting a DBS check and public liability insurance."
                      checked={form.needs_credentials_help}
                      onChange={v => set('needs_credentials_help', v)}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          <Divider />

          {/* ── 4: Zone map ── */}
          <div id="field-selectedAreas">
            <SectionHeader
              step={4}
              title="Where you work"
              subtitle="Select the areas of Horsham you'd like to cover. You can update this from your dashboard at any time."
            />
            <ZoneSelector
              selectedAreas={form.selectedAreas}
              onToggle={handleToggleArea}
              onToggleAll={handleToggleAll}
            />
            {errors.selectedAreas && <p style={{ ...fieldErrorStyle, marginTop: '10px' }}>⚠ {errors.selectedAreas}</p>}
          </div>

          <Divider />

          {/* ── 5: Notifications ── */}
          <SectionHeader step={5} title="Notifications" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <CheckToggle
              label="🔔 Notify me about cover clean requests"
              checked={form.cover_cleans_notify}
              onChange={v => set('cover_cleans_notify', v)}
              description="Cover cleans are one-off jobs where a customer needs cover. These requests often pay more and go quickly."
            />
            <CheckToggle
              label="🔔 Notify me about new cleaning requests"
              checked={form.job_notify}
              onChange={v => set('job_notify', v)}
              description="We'll alert you when customers post new cleaning requests in the areas you cover."
            />
            {form.job_notify && (
              <div style={{ background: '#f0f9ff', border: '1.5px solid #bae6fd', borderRadius: '12px', padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <span style={{ fontSize: '16px', flexShrink: 0 }}>💡</span>
                <p style={{ fontSize: '13px', color: '#0369a1', margin: 0, lineHeight: 1.5 }}>
                  You're free to adjust what jobs you're notified for from your dashboard at any time. Area, hourly rate, preferred days and more.
                </p>
              </div>
            )}
            <CheckToggle
              label="📣 Keep me informed with Vouchee updates and promotions"
              checked={form.marketing_opt_in}
              onChange={v => set('marketing_opt_in', v)}
              description="Occasional emails about your account, platform updates, product launches, and exclusive offers."
            />
          </div>

          <Divider />

          {/* ── 6: Card preview ── */}
          <SectionHeader
            step={6}
            title="Your cleaner card"
            subtitle="This is exactly what a customer sees when you apply for one of their jobs."
          />
          <ApplicationCardPreview form={form} />

          <Divider />

          {/* ── Platform agreement (mandatory) ── */}
          <div id="field-platformAgreement" style={{ marginBottom: '28px' }}>
            <div style={{
              background: platformAgreement ? '#f0fdf4' : '#fafafa',
              border: `2px solid ${errors.platformAgreement ? '#fca5a5' : platformAgreement ? '#86efac' : '#e2e8f0'}`,
              borderRadius: '16px', padding: '20px', transition: 'all 0.2s',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                <button
                  onClick={() => {
                    setPlatformAgreement(!platformAgreement)
                    if (errors.platformAgreement) setErrors(e => { const next = { ...e }; delete next.platformAgreement; return next })
                  }}
                  style={{
                    width: '22px', height: '22px', borderRadius: '6px', flexShrink: 0, marginTop: '2px',
                    background: platformAgreement ? '#16a34a' : 'white',
                    border: `2px solid ${platformAgreement ? '#16a34a' : '#cbd5e1'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit', padding: 0,
                  }}
                >
                  {platformAgreement && <Check size={13} color="white" strokeWidth={3} />}
                </button>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', margin: '0 0 8px', lineHeight: 1.55 }}>
                    I understand that customers introduced through Vouchee must be managed through the platform. Taking these customers private is a breach of Vouchee's Terms and may result in my account being permanently removed.
                  </p>
                  <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
                    Note: You are paid directly by the customer for your time — <strong style={{ color: '#64748b' }}>Vouchee does not take a cut of your hourly earnings.</strong> This agreement applies to customer relationships, not payments.
                  </p>
                </div>
              </div>
            </div>
            {errors.platformAgreement && <p style={{ ...fieldErrorStyle, marginTop: '8px' }}>⚠ {errors.platformAgreement}</p>}
          </div>

          {/* ── Submit ── */}
          <div>
            <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.6, marginBottom: '20px', textAlign: 'center' }}>
              By submitting you confirm that the information above is accurate and agree to Vouchee's{' '}
              <a href="/terms" style={{ color: '#3b82f6', fontWeight: 600, textDecoration: 'none' }}>Terms of Service</a>
              {' '}and{' '}
              <a href="/privacy" style={{ color: '#3b82f6', fontWeight: 600, textDecoration: 'none' }}>Privacy Policy</a>.
            </p>

            {submitError && (
              <div style={{ background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: '12px', padding: '14px 16px', marginBottom: '16px' }}>
                <p style={{ fontSize: '14px', color: '#dc2626', margin: 0, fontWeight: 600 }}>{submitError}</p>
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={submitting}
              style={{
                width: '100%', padding: '16px',
                background: submitting ? '#86efac' : 'linear-gradient(135deg, #3b82f6, #6366f1)',
                color: 'white', border: 'none', borderRadius: '14px',
                fontSize: '16px', fontWeight: 700,
                cursor: submitting ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                boxShadow: submitting ? 'none' : '0 4px 16px rgba(59,130,246,0.3)',
                fontFamily: 'inherit',
              }}
            >
              {submitting ? 'Submitting your application…' : 'Submit application →'}
            </button>

            <p style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center', marginTop: '12px' }}>
              Questions before applying?{' '}
              <a href="mailto:cleaners@vouchee.co.uk" style={{ color: '#3b82f6', fontWeight: 600, textDecoration: 'none' }}>
                cleaners@vouchee.co.uk
              </a>
            </p>
          </div>

        </div>
      </div>
    </div>
  )
}
