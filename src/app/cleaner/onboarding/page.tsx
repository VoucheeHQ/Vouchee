'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Check, ChevronDown, ExternalLink } from 'lucide-react'

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

const TASKS = [
  { id: 'general_cleaning', label: 'General cleaning', special: false },
  { id: 'hoovering', label: 'Hoovering', special: false },
  { id: 'mopping', label: 'Mopping', special: false },
  { id: 'bathroom_deep_clean', label: 'Bathroom deep clean', special: false },
  { id: 'kitchen_deep_clean', label: 'Kitchen deep clean', special: false },
  { id: 'ironing', label: 'Ironing', special: true },
  { id: 'windows_interior', label: 'Interior windows', special: true },
  { id: 'laundry', label: 'Laundry', special: true },
  { id: 'changing_beds', label: 'Changing beds', special: true },
  { id: 'blinds', label: 'Blinds', special: true },
  { id: 'fridge', label: 'Fridge clean', special: true },
  { id: 'mold', label: 'Mould removal', special: true },
]

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const TIMES = ['Morning (8am – 12pm)', 'Afternoon (12pm – 5pm)', 'Evening (5pm – 8pm)', 'Flexible']

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

function ToggleChip({ label, selected, onClick, special }: { label: string; selected: boolean; onClick: () => void; special?: boolean }) {
  return (
    <button onClick={onClick} style={{
      padding: '7px 16px', borderRadius: '100px', fontSize: '13px', fontWeight: 600,
      cursor: 'pointer', border: '1.5px solid', transition: 'all 0.15s',
      background: selected ? (special ? '#fefce8' : '#eff6ff') : 'white',
      borderColor: selected ? (special ? '#fde047' : '#93c5fd') : '#e2e8f0',
      color: selected ? (special ? '#854d0e' : '#1d4ed8') : '#64748b',
    }}>{label}</button>
  )
}

function CheckToggle({ label, checked, onChange, description }: { label: string; checked: boolean; onChange: (v: boolean) => void; description?: string }) {
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
  const firstName = form.full_name?.split(' ')[0] ?? 'Your'
  const lastInitial = form.full_name?.split(' ')?.[1]?.[0] ?? 'N'
  const now = new Date()
  const monthYear = now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

  return (
    <div style={{
      background: 'white', borderRadius: '20px', border: '2px solid #e2e8f0',
      boxShadow: '0 8px 32px rgba(0,0,0,0.08)', overflow: 'hidden', maxWidth: '380px', margin: '0 auto',
    }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #eff6ff, #dbeafe)', padding: '20px 20px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {/* Avatar placeholder */}
          <div style={{
            width: '52px', height: '52px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '20px', fontWeight: 800, color: 'white', flexShrink: 0,
          }}>
            {firstName[0]?.toUpperCase() ?? 'Y'}
          </div>
          <div>
            <div style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
              {firstName} {lastInitial}.
            </div>
            <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
              Member since {monthYear}
            </div>
          </div>
        </div>

        {/* Rating */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '12px' }}>
          <div style={{ display: 'flex', gap: '2px' }}>
            {[1,2,3,4,5].map(i => (
              <span key={i} style={{ fontSize: '14px', color: '#f59e0b' }}>★</span>
            ))}
          </div>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>5.0</span>
          <span style={{ fontSize: '13px', color: '#94a3b8' }}>· New to platform</span>
        </div>
      </div>

      {/* Verified badges */}
      <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
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
        {!form.dbs_checked && !form.right_to_work && !form.has_insurance && (
          <span style={{ fontSize: '13px', color: '#94a3b8' }}>Complete your credentials to show verified badges</span>
        )}
      </div>

      {/* Blurred review teasers */}
      <div style={{ padding: '14px 20px' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>Reviews</div>
        {[
          { text: 'Absolutely brilliant — left the house spotless. Would highly recommend to anyone looking for a reliable cleaner in the area.', name: 'Emma T.' },
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
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showJobFilters, setShowJobFilters] = useState(false)

  const [form, setForm] = useState({
    // Personal
    full_name: '',
    email: '',
    password: '',
    phone: '',
    // Experience
    years_experience: '',
    own_supplies: false,
    bio: '',
    // Credentials
    dbs_checked: false,
    dbs_number: '',
    right_to_work: false,
    has_insurance: false,
    insurance_provider: '',
    // Zones & availability
    zones: [] as string[],
    availability_days: [] as string[],
    time_of_day: '',
    // Tasks & rate
    tasks: [] as string[],
    hourly_rate: '',
    // Notifications
    cover_cleans_notify: true,
    job_notify: true,
    job_notify_filters: {} as Record<string, any>,
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

    // Basic validation
    if (!form.full_name.trim()) return setError('Please enter your full name.')
    if (!form.email.trim()) return setError('Please enter your email address.')
    if (form.password.length < 8) return setError('Password must be at least 8 characters.')
    if (!form.phone.trim()) return setError('Please enter your phone number.')
    if (form.zones.length === 0) return setError('Please select at least one zone.')
    if (form.tasks.length === 0) return setError('Please select at least one task.')
    if (!form.hourly_rate) return setError('Please enter your hourly rate.')

    setSubmitting(true)

    try {
      const supabase = createClient()

      // 1. Create auth account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email.trim(),
        password: form.password,
        options: {
          data: { full_name: form.full_name.trim() },
        },
      })

      if (authError) throw new Error(authError.message)
      if (!authData.user) throw new Error('Account creation failed. Please try again.')

      const userId = authData.user.id

      // 2. Upsert profile with cleaner role
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

      // 3. Insert cleaner record
      const { error: cleanerError } = await (supabase as any)
        .from('cleaners')
        .insert({
          profile_id: userId,
          application_status: 'submitted',
          bio: form.bio.trim() || null,
          years_experience: form.years_experience ? parseInt(form.years_experience) : null,
          own_supplies: form.own_supplies,
          dbs_checked: form.dbs_checked,
          dbs_number: form.dbs_number.trim() || null,
          right_to_work: form.right_to_work,
          has_insurance: form.has_insurance,
          insurance_provider: form.insurance_provider.trim() || null,
          zones: form.zones,
          availability_days: form.availability_days,
          time_of_day: form.time_of_day || null,
          tasks: form.tasks,
          hourly_rate: form.hourly_rate ? parseFloat(form.hourly_rate) : null,
          cover_cleans_notify: form.cover_cleans_notify,
          job_notify: form.job_notify,
          job_notify_filters: form.job_notify_filters,
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
      <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg, #f0f7ff 0%, #fefce8 50%, #f0fdf4 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ background: 'white', borderRadius: '24px', padding: '48px 40px', maxWidth: '480px', width: '100%', textAlign: 'center', boxShadow: '0 8px 40px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: '56px', marginBottom: '16px' }}>🎉</div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', marginBottom: '12px' }}>Application submitted!</h1>
          <p style={{ fontSize: '15px', color: '#64748b', lineHeight: 1.6, marginBottom: '8px' }}>
            Thanks for applying to join Vouchee. We'll review your application and be in touch within a few days to arrange a quick call.
          </p>
          <p style={{ fontSize: '14px', color: '#94a3b8', lineHeight: 1.6, marginBottom: '32px' }}>
            In the meantime, keep an eye on your inbox — we may follow up with a few questions.
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
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg, #3b82f6, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '16px', fontWeight: 800, color: 'white' }}>V</span>
            </div>
            <span style={{ fontSize: '17px', fontWeight: 700, color: '#0f172a' }}>Vouchee</span>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '40px 24px 80px' }}>

        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div style={{ display: 'inline-block', background: 'linear-gradient(135deg, #eff6ff, #dbeafe)', border: '1px solid #93c5fd', borderRadius: '100px', padding: '6px 16px', fontSize: '13px', fontWeight: 600, color: '#1d4ed8', marginBottom: '16px' }}>
            Cleaner application
          </div>
          <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a', marginBottom: '12px', lineHeight: 1.2 }}>
            Join the Vouchee network
          </h1>
          <p style={{ fontSize: '16px', color: '#64748b', lineHeight: 1.6, maxWidth: '480px', margin: '0 auto' }}>
            Tell us about yourself and we'll be in touch to arrange a quick call. Before you start, make sure you have your DBS number and insurance details to hand.
          </p>
        </div>

        <div style={{ background: 'white', borderRadius: '24px', padding: '40px', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>

          {/* ── Section 1: Personal details ── */}
          <SectionHeader step={1} title="Personal details" subtitle="This is how we'll contact you. Your surname won't be shown publicly." />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={labelStyle}>Full name</label>
              <input style={inputStyle} placeholder="e.g. Sarah Mitchell" value={form.full_name}
                onChange={e => set('full_name', e.target.value)} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Email address</label>
                <input type="email" style={inputStyle} placeholder="sarah@example.com" value={form.email}
                  onChange={e => set('email', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Phone number</label>
                <input type="tel" style={inputStyle} placeholder="07700 000000" value={form.phone}
                  onChange={e => set('phone', e.target.value)} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Password</label>
              <input type="password" style={inputStyle} placeholder="At least 8 characters" value={form.password}
                onChange={e => set('password', e.target.value)} />
              <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '6px' }}>This creates your Vouchee account. You'll use it to log in once approved.</p>
            </div>
          </div>

          <Divider />

          {/* ── Section 2: Experience ── */}
          <SectionHeader step={2} title="Your experience" subtitle="Help us understand your background. Be honest — this helps us match you with the right customers." />

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
              <label style={labelStyle}>About you</label>
              <textarea style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }} rows={4}
                placeholder="Tell customers a little about yourself — your approach to cleaning, what you enjoy, any specialisms. Keep it friendly and genuine."
                value={form.bio} onChange={e => set('bio', e.target.value)} />
              <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '6px' }}>This will appear on your profile once approved.</p>
            </div>
            <CheckToggle
              label="I bring my own cleaning supplies and equipment"
              checked={form.own_supplies}
              onChange={v => set('own_supplies', v)}
              description="Customers value cleaners who arrive fully equipped — it makes scheduling much easier."
            />
          </div>

          <Divider />

          {/* ── Section 3: Credentials ── */}
          <SectionHeader step={3} title="Credentials" subtitle="You don't need all of these to apply, but verified cleaners get significantly more interest from customers." />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <CheckToggle
              label="I have a valid DBS check"
              checked={form.dbs_checked}
              onChange={v => set('dbs_checked', v)}
            />
            {form.dbs_checked && (
              <div style={{ marginLeft: '0', paddingLeft: '0' }}>
                <label style={labelStyle}>DBS certificate number <span style={{ color: '#94a3b8', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional but recommended)</span></label>
                <input style={inputStyle} placeholder="e.g. 001234567890" value={form.dbs_number}
                  onChange={e => set('dbs_number', e.target.value)} />
              </div>
            )}

            <CheckToggle
              label="I have the right to work in the UK"
              checked={form.right_to_work}
              onChange={v => set('right_to_work', v)}
            />

            <CheckToggle
              label="I have public liability insurance"
              checked={form.has_insurance}
              onChange={v => set('has_insurance', v)}
            />

            {form.has_insurance && (
              <div>
                <label style={labelStyle}>Insurance provider <span style={{ color: '#94a3b8', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
                <input style={inputStyle} placeholder="e.g. Hiscox, Simply Business" value={form.insurance_provider}
                  onChange={e => set('insurance_provider', e.target.value)} />
              </div>
            )}

            {!form.has_insurance && (
              <div style={{ background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: '12px', padding: '14px 16px' }}>
                <p style={{ fontSize: '13px', color: '#92400e', margin: '0 0 8px', lineHeight: 1.5 }}>
                  <strong>No insurance yet?</strong> Public liability insurance protects you if something goes wrong on the job. It's affordable and customers expect it.
                </p>
                <a
                  href="https://www.simplybusiness.co.uk"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '13px', fontWeight: 600, color: '#b45309', textDecoration: 'none' }}
                >
                  Get a quote with Simply Business <ExternalLink size={12} />
                </a>
                <span style={{ fontSize: '11px', color: '#b45309', display: 'block', marginTop: '4px' }}>Affiliate link — we may earn a small commission</span>
              </div>
            )}
          </div>

          <Divider />

          {/* ── Section 4: Zones & availability ── */}
          <SectionHeader step={4} title="Where & when you work" subtitle="Select every zone you're happy to cover. You can always update this from your dashboard later." />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={labelStyle}>Zones you cover</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {ZONES.map(z => (
                  <ToggleChip key={z.id} label={z.label}
                    selected={form.zones.includes(z.id)}
                    onClick={() => toggleArr('zones', z.id)} />
                ))}
              </div>
            </div>
            <div>
              <label style={labelStyle}>Preferred days</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {DAYS.map(d => (
                  <ToggleChip key={d} label={d.slice(0, 3)}
                    selected={form.availability_days.includes(d)}
                    onClick={() => toggleArr('availability_days', d)} />
                ))}
              </div>
            </div>
            <div>
              <label style={labelStyle}>Preferred time of day</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {TIMES.map(t => (
                  <ToggleChip key={t} label={t}
                    selected={form.time_of_day === t}
                    onClick={() => set('time_of_day', form.time_of_day === t ? '' : t)} />
                ))}
              </div>
            </div>
          </div>

          <Divider />

          {/* ── Section 5: Tasks & rate ── */}
          <SectionHeader step={5} title="What you offer" subtitle="Select the tasks you're comfortable with. Only tick what you can genuinely deliver well." />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ ...labelStyle, marginBottom: '4px' }}>Standard tasks</label>
              <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 10px' }}>Included in a regular clean</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {TASKS.filter(t => !t.special).map(t => (
                  <ToggleChip key={t.id} label={t.label}
                    selected={form.tasks.includes(t.id)}
                    onClick={() => toggleArr('tasks', t.id)} />
                ))}
              </div>
            </div>
            <div>
              <label style={{ ...labelStyle, marginBottom: '4px' }}>Specialist tasks</label>
              <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 10px' }}>Additional services customers can request</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {TASKS.filter(t => t.special).map(t => (
                  <ToggleChip key={t.id} label={t.label} special
                    selected={form.tasks.includes(t.id)}
                    onClick={() => toggleArr('tasks', t.id)} />
                ))}
              </div>
            </div>
            <div>
              <label style={labelStyle}>Your hourly rate (£)</label>
              <div style={{ position: 'relative', maxWidth: '200px' }}>
                <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '15px', color: '#64748b', fontWeight: 600 }}>£</span>
                <input type="number" step="0.50" min="12" max="50"
                  style={{ ...inputStyle, paddingLeft: '28px' }}
                  placeholder="0.00" value={form.hourly_rate}
                  onChange={e => set('hourly_rate', e.target.value)} />
              </div>
              <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '6px' }}>Customers in Horsham typically offer £13–£18/hr for regular cleans.</p>
            </div>
          </div>

          <Divider />

          {/* ── Section 6: Notifications ── */}
          <SectionHeader step={6} title="Notifications" subtitle="Choose what you'd like to hear about. You can update these from your dashboard at any time." />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <CheckToggle
              label="🔔 Notify me about cover clean opportunities"
              checked={form.cover_cleans_notify}
              onChange={v => set('cover_cleans_notify', v)}
              description="Cover cleans are one-off jobs where a cleaner needs cover. These are first-come, first-served and a great way to earn extra."
            />

            <CheckToggle
              label="🔔 Notify me about new job postings in my zones"
              checked={form.job_notify}
              onChange={v => set('job_notify', v)}
              description="We'll alert you when new customers post requests in the areas you cover."
            />

            {form.job_notify && (
              <div style={{ marginLeft: '0' }}>
                <button
                  onClick={() => setShowJobFilters(!showJobFilters)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: '13px', fontWeight: 600, color: '#3b82f6', padding: '4px 0',
                  }}
                >
                  <ChevronDown size={14} style={{ transform: showJobFilters ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
                  {showJobFilters ? 'Hide' : 'Customise'} job notification filters
                </button>

                {showJobFilters && (
                  <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '14px', padding: '18px', marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <p style={{ fontSize: '13px', color: '#64748b', margin: 0, lineHeight: 1.5 }}>
                      Only notify me about jobs that match these preferences. Leave blank to receive all notifications.
                    </p>
                    <div>
                      <label style={labelStyle}>Minimum hourly rate</label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {['£13+', '£14+', '£15+', '£16+', '£17+', '£18+'].map(r => {
                          const val = parseInt(r.replace('£', '').replace('+', ''))
                          const selected = form.job_notify_filters.min_rate === val
                          return (
                            <ToggleChip key={r} label={r} selected={selected}
                              onClick={() => set('job_notify_filters', { ...form.job_notify_filters, min_rate: selected ? undefined : val })} />
                          )
                        })}
                      </div>
                    </div>
                    <div>
                      <label style={labelStyle}>Minimum hours per session</label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {['2h+', '2.5h+', '3h+', '3.5h+', '4h+'].map(h => {
                          const val = parseFloat(h.replace('h+', ''))
                          const selected = form.job_notify_filters.min_hours === val
                          return (
                            <ToggleChip key={h} label={h} selected={selected}
                              onClick={() => set('job_notify_filters', { ...form.job_notify_filters, min_hours: selected ? undefined : val })} />
                          )
                        })}
                      </div>
                    </div>
                    <div>
                      <label style={labelStyle}>Frequency</label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {[{ id: 'weekly', label: 'Weekly only' }, { id: 'fortnightly', label: 'Fortnightly only' }, { id: 'any', label: 'Any frequency' }].map(f => {
                          const selected = form.job_notify_filters.frequency === f.id
                          return (
                            <ToggleChip key={f.id} label={f.label} selected={selected}
                              onClick={() => set('job_notify_filters', { ...form.job_notify_filters, frequency: selected ? undefined : f.id })} />
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <CheckToggle
              label="📣 Keep me updated on Vouchee news and promotions"
              checked={form.marketing_opt_in}
              onChange={v => set('marketing_opt_in', v)}
              description="Occasional emails about platform updates, product launches, and exclusive offers. Unsubscribe any time."
            />
          </div>

          <Divider />

          {/* ── Section 7: Card preview ── */}
          <SectionHeader step={7} title="Your cleaner card" subtitle="This is how customers will see you when you apply for jobs. Reviews appear after your first completed clean." />

          <CardPreview form={form} />

          <Divider />

          {/* ── Submit ── */}
          <div>
            <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.6, marginBottom: '20px', textAlign: 'center' }}>
              By submitting you confirm that the information above is accurate and agree to Vouchee's{' '}
              <a href="/terms" style={{ color: '#3b82f6', fontWeight: 600, textDecoration: 'none' }}>Terms of Service</a>{' '}
              and{' '}
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
                fontSize: '16px', fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s', boxShadow: submitting ? 'none' : '0 4px 16px rgba(59,130,246,0.3)',
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
