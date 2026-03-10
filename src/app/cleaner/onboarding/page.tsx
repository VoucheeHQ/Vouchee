'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Check, ExternalLink } from 'lucide-react'
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

// Map area label → Supabase zone ID
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
  { id: 'domestic',      label: 'Domestic cleaning' },
  { id: 'end_of_tenancy', label: 'End of tenancy cleaning' },
  { id: 'office',        label: 'Office / commercial cleaning' },
  { id: 'holiday_let',   label: 'Holiday let / Airbnb turnaround' },
  { id: 'care_home',     label: 'Care homes / assisted living' },
  { id: 'hospitality',   label: 'Hospitality / hotel housekeeping' },
]

// ── Coverage map — exact copy from established cleaner page ───

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

// ── Zone selector — exact pattern from established cleaner page ─

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
          Which areas are you happy to work in?{' '}
          <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(select all that apply)</span>
        </p>

        {/* All areas — full width */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <button
            type="button"
            onClick={onToggleAll}
            style={{
              gridColumn: '1 / -1',
              borderRadius: '10px', padding: '9px 12px',
              fontSize: '12px', fontWeight: 600, cursor: 'pointer',
              border: '1.5px solid', textAlign: 'left', transition: 'all 0.15s', fontFamily: 'inherit',
              background: allSelected ? 'rgba(59,130,246,0.06)' : 'rgba(255,255,255,0.7)',
              borderColor: allSelected ? '#3b82f6' : '#e2e8f0',
              color: allSelected ? '#1e40af' : '#475569',
            }}
          >
            {allSelected ? '✓ ' : ''}All areas
          </button>

          {!allSelected && ALL_AREAS.map(area => {
            const selected = selectedAreas.includes(area)
            return (
              <button
                key={area}
                type="button"
                onClick={() => onToggle(area)}
                style={{
                  borderRadius: '10px', padding: '9px 12px',
                  fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                  border: '1.5px solid', textAlign: 'left', transition: 'all 0.15s', fontFamily: 'inherit',
                  background: selected ? 'rgba(59,130,246,0.06)' : 'rgba(255,255,255,0.7)',
                  borderColor: selected ? '#3b82f6' : '#e2e8f0',
                  color: selected ? '#1e40af' : '#475569',
                }}
              >
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

// ── Card Preview ──────────────────────────────────────────────

function CardPreview({ form }: { form: any }) {
  const nameParts = (form.full_name ?? '').trim().split(' ')
  const firstName = nameParts[0] || 'First name'
  const lastInitial = nameParts[1]?.[0] ? `${nameParts[1][0]}.` : ''
  const now = new Date()
  const monthYear = now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
  const hasAnyBadge = form.dbs_checked || form.right_to_work || form.has_insurance

  return (
    <div style={{
      background: 'white', borderRadius: '20px', border: '2px solid #e2e8f0',
      boxShadow: '0 8px 32px rgba(0,0,0,0.08)', overflow: 'hidden', maxWidth: '380px', margin: '0 auto',
    }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #eff6ff, #dbeafe)', padding: '20px 20px 16px' }}>
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
            {firstName}{lastInitial ? ` ${lastInitial}` : ''}
          </div>
          <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
            Member since {monthYear}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ display: 'flex', gap: '2px' }}>
            {[1,2,3,4,5].map(i => <span key={i} style={{ fontSize: '14px', color: '#f59e0b' }}>★</span>)}
          </div>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>5.0</span>
          <span style={{ fontSize: '13px', color: '#94a3b8' }}>· 0 cleans completed</span>
        </div>
      </div>

      {/* Verified badges */}
      <div style={{
        padding: '14px 20px', borderBottom: '1px solid #f1f5f9',
        display: 'flex', flexWrap: 'wrap', gap: '8px', minHeight: '52px', alignItems: 'center',
      }}>
        {hasAnyBadge ? (
          <>
            {form.dbs_checked && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '100px', padding: '4px 12px', fontSize: '12px', fontWeight: 600, color: '#15803d' }}>
                <Check size={11} strokeWidth={3} /> DBS checked
              </span>
            )}
            {form.right_to_work && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '100px', padding: '4px 12px', fontSize: '12px', fontWeight: 600, color: '#15803d' }}>
                <Check size={11} strokeWidth={3} /> Right to work
              </span>
            )}
            {form.has_insurance && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '100px', padding: '4px 12px', fontSize: '12px', fontWeight: 600, color: '#15803d' }}>
                <Check size={11} strokeWidth={3} /> Insured
              </span>
            )}
          </>
        ) : (
          <span style={{ fontSize: '13px', color: '#94a3b8' }}>Verified badges will appear here</span>
        )}
      </div>

      {/* Blurred reviews */}
      <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>Reviews</div>
        {[
          { text: 'Absolutely brilliant — left the house spotless. Would highly recommend to anyone looking for a reliable cleaner.', name: 'Emma T.' },
          { text: 'Very professional and thorough. Always on time and incredibly easy to communicate with. A real gem!', name: 'James R.' },
        ].map((review, i) => (
          <div key={i} style={{
            background: '#f8fafc', borderRadius: '12px', padding: '12px 14px',
            marginBottom: i === 0 ? '8px' : 0,
            filter: 'blur(4px)', userSelect: 'none', pointerEvents: 'none',
          }}>
            <div style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5, marginBottom: '6px' }}>"{review.text}"</div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8' }}>— {review.name}</div>
          </div>
        ))}
        <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '12px', color: '#94a3b8' }}>
          Reviews visible after your first completed clean
        </div>
      </div>

      {/* Chat opt-in */}
      <div style={{ padding: '16px 20px' }}>
        <div style={{ background: '#f0f9ff', border: '1.5px solid #bae6fd', borderRadius: '14px', padding: '14px 16px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#0369a1', marginBottom: '6px' }}>
            💬 Allow customers to start a chat?
          </div>
          <p style={{ fontSize: '12px', color: '#0369a1', margin: '0 0 12px', lineHeight: 1.5 }}>
            Customers who like your profile can send you a message before you've applied to their job. You can accept or decline each request.
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => {}}
              style={{
                flex: 1, padding: '8px', borderRadius: '10px', fontSize: '12px', fontWeight: 700,
                cursor: 'pointer', border: '1.5px solid', fontFamily: 'inherit', transition: 'all 0.15s',
                background: form.allow_chat ? '#eff6ff' : 'white',
                borderColor: form.allow_chat ? '#93c5fd' : '#e2e8f0',
                color: form.allow_chat ? '#1d4ed8' : '#64748b',
              }}
            >
              ✓ Yes, allow chats
            </button>
            <button
              onClick={() => {}}
              style={{
                flex: 1, padding: '8px', borderRadius: '10px', fontSize: '12px', fontWeight: 700,
                cursor: 'pointer', border: '1.5px solid', fontFamily: 'inherit', transition: 'all 0.15s',
                background: !form.allow_chat ? '#fef2f2' : 'white',
                borderColor: !form.allow_chat ? '#fecaca' : '#e2e8f0',
                color: !form.allow_chat ? '#dc2626' : '#64748b',
              }}
            >
              ✕ No, not yet
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────

export default function CleanerOnboarding() {
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [missingCredentials, setMissingCredentials] = useState(false)

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    phone: '',
    years_experience: '',
    experience_types: [] as string[],
    experience_other: '',
    own_supplies: false,
    dbs_checked: false,
    right_to_work: false,
    has_insurance: false,
    needs_credentials_help: false,
    // Zone selection uses area labels; converted to IDs on submit
    selectedAreas: [] as string[],
    cover_cleans_notify: true,
    job_notify: true,
    marketing_opt_in: false,
    allow_chat: true,
  })

  const set = (key: string, value: any) => setForm(f => ({ ...f, [key]: value }))

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

  const inputStyle = {
    width: '100%', background: '#f8faff', border: '1.5px solid #e2e8f0',
    borderRadius: '12px', padding: '12px 14px', fontSize: '14px', color: '#1e293b',
    fontFamily: 'inherit', boxSizing: 'border-box' as const,
  }
  const labelStyle = {
    fontSize: '12px', fontWeight: 700 as const, color: '#64748b',
    textTransform: 'uppercase' as const, letterSpacing: '0.06em', display: 'block', marginBottom: '8px',
  }

  const handleSubmit = async () => {
    setError(null)
    if (!form.full_name.trim()) return setError('Please enter your full name.')
    if (!form.email.trim()) return setError('Please enter your email address.')
    if (form.password.length < 8) return setError('Password must be at least 8 characters.')
    if (!form.phone.trim()) return setError('Please enter your phone number.')
    if (form.selectedAreas.length === 0) return setError('Please select at least one area you\'re happy to cover.')

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

      // Convert area labels to zone IDs; __all__ expands to all IDs
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
      setError(err?.message ?? 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Success screen ────────────────────────────────────────

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

  // ── Main form ─────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg, #f0f7ff 0%, #fefce8 50%, #f0fdf4 100%)' }}>

      {/* Minimal header — no nav */}
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
            Fill in the form below and we'll be in touch within 3 working days to arrange a quick call. Have your insurance details to hand if you have them.
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
            <div>
              <label style={labelStyle}>Full name</label>
              <input style={inputStyle} placeholder="e.g. Sarah Mitchell"
                value={form.full_name} onChange={e => set('full_name', e.target.value)} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Email address</label>
                <input type="email" style={inputStyle} placeholder="sarah@example.com"
                  value={form.email} onChange={e => set('email', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Phone number</label>
                <input type="tel" style={inputStyle} placeholder="07700 000000"
                  value={form.phone} onChange={e => set('phone', e.target.value)} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Password</label>
              <input type="password" style={inputStyle} placeholder="At least 8 characters"
                value={form.password} onChange={e => set('password', e.target.value)} />
              <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '6px' }}>
                This creates your Vouchee account. You'll use it to log in once approved.
              </p>
            </div>
          </div>

          <Divider />

          {/* ── 2: Experience ── */}
          <SectionHeader step={2} title="Your experience" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={labelStyle}>Years of cleaning experience</label>
              <select style={{ ...inputStyle, appearance: 'none' as const, cursor: 'pointer' }}
                value={form.years_experience} onChange={e => set('years_experience', e.target.value)}>
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
                <input style={inputStyle} placeholder="Please describe your other cleaning experience"
                  value={form.experience_other} onChange={e => set('experience_other', e.target.value)} />
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
                  onClick={() => setMissingCredentials(!missingCredentials)}
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
                  <div style={{ background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: '12px', padding: '16px', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <p style={{ fontSize: '14px', color: '#92400e', margin: 0, lineHeight: 1.6 }}>
                      No problem — you can still apply. We'll send you a step-by-step guide on how to get your DBS certificate and public liability insurance once you submit.
                    </p>
                    <CheckToggle
                      label="Send me the guide when I apply"
                      checked={form.needs_credentials_help}
                      onChange={v => set('needs_credentials_help', v)}
                      description="We'll include links to trusted providers and our insurance partners."
                    />
                    {!form.has_insurance && (
                      <div style={{ paddingTop: '12px', borderTop: '1px solid #fde68a' }}>
                        <p style={{ fontSize: '13px', color: '#92400e', margin: '0 0 8px' }}>
                          Want to sort your insurance now?
                        </p>
                        <a
                          href="https://www.simplybusiness.co.uk"
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '13px', fontWeight: 600, color: '#b45309', textDecoration: 'none' }}
                        >
                          Get a quote with Simply Business <ExternalLink size={12} />
                        </a>
                        <span style={{ fontSize: '11px', color: '#b45309', display: 'block', marginTop: '4px' }}>
                          Affiliate link — we may earn a small commission at no cost to you
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <Divider />

          {/* ── 4: Zone map ── */}
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
            subtitle="This is how customers will see you when you apply for jobs. Watch it update as you fill in your details above."
          />
          <CardPreview form={form} />

          <Divider />

          {/* ── Submit ── */}
          <div>
            <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.6, marginBottom: '20px', textAlign: 'center' }}>
              By submitting you confirm that the information above is accurate and agree to Vouchee's{' '}
              <a href="/terms" style={{ color: '#3b82f6', fontWeight: 600, textDecoration: 'none' }}>Terms of Service</a>
              {' '}and{' '}
              <a href="/privacy" style={{ color: '#3b82f6', fontWeight: 600, textDecoration: 'none' }}>Privacy Policy</a>.
            </p>

            {error && (
              <div style={{ background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: '12px', padding: '14px 16px', marginBottom: '16px' }}>
                <p style={{ fontSize: '14px', color: '#dc2626', margin: 0, fontWeight: 600 }}>{error}</p>
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
