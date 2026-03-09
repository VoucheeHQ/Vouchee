'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Check, ExternalLink } from 'lucide-react'

// ── Constants ─────────────────────────────────────────────────

const ZONES = [
  { id: 'central_south_east', label: 'Central Horsham' },
  { id: 'north_west', label: 'North West Horsham' },
  { id: 'north_east_roffey', label: 'North East / Roffey' },
  { id: 'south_west', label: 'South West Horsham' },
  { id: 'warnham_north', label: 'Warnham & North' },
  { id: 'broadbridge_heath', label: 'Broadbridge Heath' },
  { id: 'mannings_heath', label: 'Mannings Heath' },
  { id: 'faygate_kilnwood_vale', label: 'Faygate / Kilnwood Vale' },
  { id: 'christs_hospital', label: "Christ's Hospital" },
]

const EXPERIENCE_TYPES = [
  { id: 'domestic', label: 'Domestic cleaning' },
  { id: 'end_of_tenancy', label: 'End of tenancy cleaning' },
  { id: 'office', label: 'Office / commercial cleaning' },
  { id: 'holiday_let', label: 'Holiday let / Airbnb turnaround' },
]

// ── Zone SVG Map ──────────────────────────────────────────────

const ZONE_POSITIONS: Record<string, { cx: number; cy: number }> = {
  warnham_north:          { cx: 160, cy: 60  },
  north_west:             { cx: 95,  cy: 135 },
  north_east_roffey:      { cx: 230, cy: 120 },
  broadbridge_heath:      { cx: 82,  cy: 200 },
  central_south_east:     { cx: 192, cy: 192 },
  faygate_kilnwood_vale:  { cx: 298, cy: 178 },
  south_west:             { cx: 112, cy: 268 },
  mannings_heath:         { cx: 255, cy: 272 },
  christs_hospital:       { cx: 160, cy: 318 },
}

function ZoneMap({ selected, onToggle }: { selected: string[]; onToggle: (id: string) => void }) {
  const allSelected = ZONES.every(z => selected.includes(z.id))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{
        background: '#f0f7ff', border: '2px solid #bfdbfe',
        borderRadius: '16px', padding: '16px', overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '4px', gap: '8px' }}>
          <button
            onClick={() => { if (allSelected) { ZONES.forEach(z => onToggle(z.id)) } else { ZONES.forEach(z => { if (!selected.includes(z.id)) onToggle(z.id) }) } }}
            style={{ fontSize: '12px', fontWeight: 600, color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px' }}
          >
            {allSelected ? 'Clear all' : 'Select all'}
          </button>
        </div>

        <svg viewBox="0 0 380 370" style={{ width: '100%', maxWidth: '420px', display: 'block', margin: '0 auto' }}>
          <ellipse cx="192" cy="190" rx="172" ry="158" fill="#dbeafe" opacity="0.35" />

          {ZONES.map(zone => {
            const pos = ZONE_POSITIONS[zone.id]
            const isSelected = selected.includes(zone.id)
            const words = zone.label.split(' ')
            const line1 = words.slice(0, 2).join(' ')
            const line2 = words.slice(2).join(' ')

            return (
              <g key={zone.id} onClick={() => onToggle(zone.id)} style={{ cursor: 'pointer' }}>
                {isSelected && (
                  <circle cx={pos.cx} cy={pos.cy} r={35} fill="#dbeafe" stroke="#93c5fd" strokeWidth={1} opacity={0.6} />
                )}
                <circle
                  cx={pos.cx} cy={pos.cy} r={28}
                  fill={isSelected ? '#3b82f6' : 'white'}
                  stroke={isSelected ? '#1d4ed8' : '#93c5fd'}
                  strokeWidth={2}
                  style={{ transition: 'all 0.18s' }}
                />
                <text
                  x={pos.cx}
                  y={line2 ? pos.cy - 5 : pos.cy + 1}
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize="8" fontWeight="700"
                  fill={isSelected ? 'white' : '#1e40af'}
                  style={{ userSelect: 'none', pointerEvents: 'none' }}
                >
                  {line1}
                </text>
                {line2 && (
                  <text
                    x={pos.cx} y={pos.cy + 8}
                    textAnchor="middle" dominantBaseline="middle"
                    fontSize="8" fontWeight="700"
                    fill={isSelected ? 'white' : '#1e40af'}
                    style={{ userSelect: 'none', pointerEvents: 'none' }}
                  >
                    {line2}
                  </text>
                )}
              </g>
            )
          })}
        </svg>

        <p style={{ fontSize: '12px', color: '#64748b', textAlign: 'center', margin: '8px 0 0' }}>
          Tap a zone to select or deselect it. You'll only see jobs in your selected zones.
        </p>
      </div>

      {selected.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {selected.map(id => {
            const zone = ZONES.find(z => z.id === id)
            return zone ? (
              <span key={id} style={{
                background: '#eff6ff', border: '1.5px solid #93c5fd', borderRadius: '100px',
                padding: '4px 12px', fontSize: '12px', fontWeight: 600, color: '#1d4ed8',
              }}>{zone.label}</span>
            ) : null
          })}
        </div>
      )}
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
      {subtitle && <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 0 38px', lineHeight: 1.5 }}>{subtitle}</p>}
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
      cursor: 'pointer', border: '1.5px solid', transition: 'all 0.15s',
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
      transition: 'all 0.15s',
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
        {description && <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px', lineHeight: 1.4 }}>{description}</div>}
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
      <div style={{ padding: '14px 20px' }}>
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
    insurance_provider: '',
    insurance_expiry_date: '',
    needs_credentials_help: false,
    zones: [] as string[],
    cover_cleans_notify: true,
    job_notify: true,
    marketing_opt_in: false,
  })

  const set = (key: string, value: any) => setForm(f => ({ ...f, [key]: value }))
  const toggleArr = (key: string, value: string) => {
    const arr = (form as any)[key] as string[]
    set(key, arr.includes(value) ? arr.filter((v: string) => v !== value) : [...arr, value])
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
    if (form.zones.length === 0) return setError('Please select at least one zone on the map.')

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
          insurance_provider: form.insurance_provider.trim() || null,
          insurance_expiry_date: form.insurance_expiry_date || null,
          needs_credentials_help: form.needs_credentials_help,
          zones: form.zones,
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
            Fill in the form below and we'll be in touch within 3 working days to arrange a quick call. Have your insurance details to hand if you have them.
          </p>
        </div>

        <div style={{ background: 'white', borderRadius: '24px', padding: '40px', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>

          {/* ── 1: Personal details ── */}
          <SectionHeader step={1} title="Personal details" subtitle="This is how we'll contact you. Your surname won't be shown publicly." />
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

            {form.has_insurance && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '4px' }}>
                <div>
                  <label style={labelStyle}>Insurance provider <span style={{ color: '#94a3b8', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
                  <input style={inputStyle} placeholder="e.g. Hiscox, Simply Business"
                    value={form.insurance_provider} onChange={e => set('insurance_provider', e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Insurance expiry date <span style={{ color: '#94a3b8', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional — we'll remind you before it expires)</span></label>
                  <input type="date" style={inputStyle}
                    value={form.insurance_expiry_date} onChange={e => set('insurance_expiry_date', e.target.value)} />
                </div>
              </div>
            )}

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
                    width: '100%', textAlign: 'left', transition: 'all 0.15s',
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
          <ZoneMap selected={form.zones} onToggle={id => toggleArr('zones', id)} />

          <Divider />

          {/* ── 5: Notifications ── */}
          <SectionHeader
            step={5}
            title="Notifications"
            subtitle="Select what you'd like to be notified about. You're welcome to adjust from your dashboard any time."
          />
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
                  You're free to specify what kind of job postings you're interested in — minimum rate, hours, frequency and more — from your dashboard once you're approved.
                </p>
              </div>
            )}
            <CheckToggle
              label="📣 Keep me informed with Vouchee updates and promotions"
              checked={form.marketing_opt_in}
              onChange={v => set('marketing_opt_in', v)}
              description="Occasional emails about your account, platform updates, product launches, and exclusive offers. Adjust preferences on your dashboard anytime."
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
