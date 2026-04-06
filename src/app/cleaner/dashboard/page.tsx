'use client'
import { Header } from '@/components/layout/header'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// ─── Types ────────────────────────────────────────────────────────────────────

type ApplicationStatus = 'submitted' | 'approved' | 'rejected' | 'suspended' | 'pending'

interface CleanerProfile {
  full_name: string
  email: string
  phone: string | null
}

interface CleanerData {
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
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

function getInitial(name: string) {
  return name.trim().charAt(0).toUpperCase()
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ApplicationStatus }) {
  const map: Record<ApplicationStatus, { label: string; bg: string; color: string; dot: string }> = {
    submitted: { label: 'Under review', bg: '#fef9c3', color: '#854d0e', dot: '#eab308' },
    pending:   { label: 'Pending',      bg: '#f1f5f9', color: '#475569', dot: '#94a3b8' },
    approved:  { label: 'Active',       bg: '#dcfce7', color: '#15803d', dot: '#22c55e' },
    rejected:  { label: 'Rejected',     bg: '#fee2e2', color: '#991b1b', dot: '#ef4444' },
    suspended: { label: 'Suspended',    bg: '#fef3c7', color: '#92400e', dot: '#f59e0b' },
  }
  const s = map[status] ?? map.pending
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '6px',
      background: s.bg, color: s.color,
      borderRadius: '100px', padding: '5px 12px',
      fontSize: '12px', fontWeight: 700,
    }}>
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: s.dot }} />
      {s.label}
    </span>
  )
}

function CredentialChip({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '8px',
      padding: '8px 14px',
      background: ok ? '#f0fdf4' : '#fef2f2',
      border: `1px solid ${ok ? '#86efac' : '#fecaca'}`,
      borderRadius: '10px',
      fontSize: '13px', fontWeight: 600,
      color: ok ? '#15803d' : '#dc2626',
    }}>
      <span>{ok ? '✅' : '❌'}</span>
      {label}
    </div>
  )
}

function ZoneChip({ label }: { label: string }) {
  return (
    <span style={{
      background: '#eff6ff', color: '#1d4ed8',
      border: '1px solid #bfdbfe',
      borderRadius: '8px', padding: '5px 12px',
      fontSize: '12px', fontWeight: 600,
    }}>
      {label}
    </span>
  )
}

function SummaryRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      padding: '12px 0', borderBottom: '1px solid #f1f5f9', gap: '12px',
    }}>
      <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: '13px', color: '#0f172a', fontWeight: 600, textAlign: 'right' }}>{value}</span>
    </div>
  )
}

// ─── Pending Screen ───────────────────────────────────────────────────────────

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
    <div style={{ maxWidth: '640px', margin: '0 auto', padding: '0 0 60px' }}>
      <div style={{ background: 'white', borderRadius: '20px', padding: '32px', border: '1.5px solid #e2e8f0', marginBottom: '20px', boxShadow: '0 2px 16px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: 800, color: 'white', fontFamily: 'Lora, serif', flexShrink: 0 }}>
            {getInitial(profile.full_name)}
          </div>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '0 0 4px', fontFamily: 'Lora, serif' }}>Hi {firstName}!</h2>
            <StatusBadge status={cleaner.application_status} />
          </div>
        </div>
        <p style={{ fontSize: '15px', color: '#475569', lineHeight: 1.7, margin: 0 }}>
          Thanks for applying to join Vouchee. We've received your application and will be in touch within <strong>1–3 working days</strong>. In the meantime, here's a summary of what you submitted.
        </p>
      </div>

      <div style={{ background: 'white', borderRadius: '20px', padding: '28px 32px', border: '1.5px solid #e2e8f0', marginBottom: '20px', boxShadow: '0 2px 16px rgba(0,0,0,0.05)' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 24px' }}>What happens next</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          {steps.map((step, i) => (
            <div key={i} style={{ display: 'flex', gap: '16px', position: 'relative' }}>
              {i < steps.length - 1 && (
                <div style={{ position: 'absolute', left: '19px', top: '40px', width: '2px', height: 'calc(100% - 8px)', background: step.done ? '#86efac' : '#e2e8f0' }} />
              )}
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0, background: step.done ? '#dcfce7' : step.active ? '#eff6ff' : '#f8fafc', border: `2px solid ${step.done ? '#86efac' : step.active ? '#93c5fd' : '#e2e8f0'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', zIndex: 1 }}>
                {step.done ? '✓' : step.icon}
              </div>
              <div style={{ paddingBottom: i < steps.length - 1 ? '24px' : '0', flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: step.done ? '#15803d' : step.active ? '#1d4ed8' : '#94a3b8', marginBottom: '2px' }}>{step.title}</div>
                <div style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.5 }}>{step.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: '20px', padding: '28px 32px', border: '1.5px solid #e2e8f0', marginBottom: '20px', boxShadow: '0 2px 16px rgba(0,0,0,0.05)' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 4px' }}>Your application summary</h3>
        <SummaryRow label="Name" value={profile.full_name} />
        <SummaryRow label="Email" value={profile.email} />
        <SummaryRow label="Phone" value={profile.phone ?? '—'} />
        <SummaryRow label="Own supplies" value={cleaner.own_supplies ? 'Yes' : 'No'} />
        <div style={{ padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 500, marginBottom: '10px' }}>Credentials</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            <CredentialChip ok={cleaner.dbs_checked} label="DBS check" />
            <CredentialChip ok={cleaner.right_to_work} label="Right to work" />
            <CredentialChip ok={cleaner.has_insurance} label="Insurance" />
          </div>
          {cleaner.needs_credentials_help && (
            <p style={{ fontSize: '12px', color: '#92400e', background: '#fef9c3', border: '1px solid #fde68a', borderRadius: '8px', padding: '8px 12px', marginTop: '10px', marginBottom: 0, fontWeight: 500 }}>
              📧 A credentials guide is being sent to your email address.
            </p>
          )}
        </div>
        <div style={{ padding: '12px 0' }}>
          <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 500, marginBottom: '10px' }}>Areas you cover</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {zones.length > 0 ? zones.map(z => <ZoneChip key={z} label={z} />) : <span style={{ fontSize: '13px', color: '#94a3b8' }}>None selected</span>}
          </div>
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: '20px', padding: '28px 32px', border: '1.5px solid #e2e8f0', marginBottom: '20px', boxShadow: '0 2px 16px rgba(0,0,0,0.05)' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 16px' }}>Notification preferences</h3>
        {[
          { label: 'Cover clean alerts', value: cleaner.cover_cleans_notify },
          { label: 'New job request alerts', value: cleaner.job_notify },
          { label: 'Marketing & updates', value: cleaner.marketing_opt_in },
        ].map(({ label, value }) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f8fafc' }}>
            <span style={{ fontSize: '14px', color: '#475569', fontWeight: 500 }}>{label}</span>
            <span style={{ fontSize: '12px', fontWeight: 700, padding: '3px 10px', borderRadius: '100px', background: value ? '#dcfce7' : '#f1f5f9', color: value ? '#15803d' : '#94a3b8' }}>
              {value ? 'On' : 'Off'}
            </span>
          </div>
        ))}
      </div>

      <div style={{ background: '#f8faff', borderRadius: '16px', padding: '20px 24px', border: '1px solid #e0e7ff', textAlign: 'center' }}>
        <p style={{ fontSize: '14px', color: '#475569', margin: 0, lineHeight: 1.6 }}>
          Questions about your application?{' '}
          <a href="mailto:cleaners@vouchee.co.uk" style={{ color: '#3b82f6', fontWeight: 700, textDecoration: 'none' }}>cleaners@vouchee.co.uk</a>
        </p>
      </div>
    </div>
  )
}

// ─── Approved Shell ───────────────────────────────────────────────────────────

function ApprovedShell({ profile }: { profile: CleanerProfile }) {
  const firstName = profile.full_name.trim().split(' ')[0]

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', padding: '0 0 60px' }}>

      {/* Welcome card */}
      <div style={{
        background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
        borderRadius: '20px', padding: '32px', marginBottom: '20px',
        color: 'white', boxShadow: '0 8px 32px rgba(59,130,246,0.25)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: 800, color: 'white', fontFamily: 'Lora, serif', border: '2px solid rgba(255,255,255,0.3)', flexShrink: 0 }}>
            {getInitial(profile.full_name)}
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.8, marginBottom: '4px' }}>Approved cleaner</div>
            <h2 style={{ fontSize: '22px', fontWeight: 800, margin: 0, fontFamily: 'Lora, serif' }}>Welcome, {firstName}!</h2>
          </div>
        </div>
        <p style={{ fontSize: '14px', opacity: 0.9, lineHeight: 1.6, margin: '0 0 20px' }}>
          You're live on Vouchee. Customers in your areas can now see your application when they post a cleaning request.
        </p>
        <a
          href="/jobs"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            background: 'white', color: '#2563eb',
            borderRadius: '12px', padding: '10px 20px',
            fontSize: '14px', fontWeight: 700, textDecoration: 'none',
            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
          }}
        >
          Browse available jobs →
        </a>
      </div>

      {/* Info panels */}
      {[
        { icon: '🔔', title: 'Job alerts', desc: "You'll be notified when a customer posts a request in your area. Check your email to manage notification preferences.", colour: '#eff6ff', border: '#bfdbfe', iconBg: '#dbeafe' },
        { icon: '⭐', title: 'Reviews & profile link', desc: 'Share your personal Vouchee profile link with existing customers to collect reviews. Coming soon.', colour: '#fefce8', border: '#fde68a', iconBg: '#fef9c3' },
        { icon: '💬', title: 'Messages', desc: "When a customer accepts your application, your conversation will appear here.", colour: '#f0fdf4', border: '#86efac', iconBg: '#dcfce7' },
      ].map(panel => (
        <div key={panel.title} style={{ background: panel.colour, border: `1.5px solid ${panel.border}`, borderRadius: '16px', padding: '24px', marginBottom: '16px', display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: panel.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>
            {panel.icon}
          </div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>{panel.title}</div>
            <div style={{ fontSize: '13px', color: '#475569', lineHeight: 1.6 }}>{panel.desc}</div>
          </div>
        </div>
      ))}

      <div style={{ background: '#f8faff', borderRadius: '16px', padding: '20px 24px', border: '1px solid #e0e7ff', textAlign: 'center' }}>
        <p style={{ fontSize: '14px', color: '#475569', margin: 0, lineHeight: 1.6 }}>
          Need help?{' '}
          <a href="mailto:cleaners@vouchee.co.uk" style={{ color: '#3b82f6', fontWeight: 700, textDecoration: 'none' }}>cleaners@vouchee.co.uk</a>
        </p>
      </div>
    </div>
  )
}

// ─── Rejected / Suspended Screen ─────────────────────────────────────────────

function BlockedScreen({ status }: { status: 'rejected' | 'suspended' }) {
  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', padding: '0 0 60px' }}>
      <div style={{ background: 'white', borderRadius: '20px', padding: '40px', border: '1.5px solid #fecaca', textAlign: 'center', boxShadow: '0 2px 16px rgba(0,0,0,0.05)' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>{status === 'rejected' ? '😔' : '⚠️'}</div>
        <h2 style={{ fontFamily: 'Lora, serif', fontSize: '22px', fontWeight: 700, color: '#0f172a', margin: '0 0 12px' }}>
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

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CleanerDashboardPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<CleanerProfile | null>(null)
  const [cleaner, setCleaner] = useState<CleanerData | null>(null)
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

        const { data: cleanerData, error: cleanerError } = await supabase
          .from('cleaners')
          .select('application_status, zones, dbs_checked, right_to_work, has_insurance, needs_credentials_help, cover_cleans_notify, job_notify, marketing_opt_in, own_supplies, created_at')
          .eq('profile_id', user.id).single()
        if (cleanerError || !cleanerData) throw new Error('Could not load your cleaner profile.')

        setProfile(profileData)
        setCleaner(cleanerData)
      } catch (err: any) {
        setError(err?.message ?? 'Something went wrong.')
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [router])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg, #f0f7ff 0%, #fefce8 50%, #f0fdf4 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Sans, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>🧹</div>
          <p style={{ fontSize: '14px', color: '#64748b' }}>Loading your dashboard…</p>
        </div>
      </div>
    )
  }

  if (error || !profile || !cleaner) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg, #f0f7ff 0%, #fefce8 50%, #f0fdf4 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Sans, sans-serif', padding: '24px' }}>
        <div style={{ background: 'white', borderRadius: '20px', padding: '40px', maxWidth: '400px', textAlign: 'center', border: '1.5px solid #fecaca' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>⚠️</div>
          <p style={{ fontSize: '14px', color: '#dc2626', margin: '0 0 16px' }}>{error ?? 'Could not load your dashboard.'}</p>
          <button onClick={() => router.push('/login')} style={{ background: '#0f172a', color: 'white', border: 'none', borderRadius: '10px', padding: '10px 24px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
            Back to login
          </button>
        </div>
      </div>
    )
  }

  const status = cleaner.application_status

  return (
<>
      <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg, #f0f7ff 0%, #fefce8 50%, #f0fdf4 100%)', fontFamily: 'DM Sans, sans-serif' }}>
        <Header userRole="cleaner" />

        {/* Page heading */}
        <div style={{ maxWidth: '640px', margin: '0 auto', padding: '40px 24px 20px' }}>
          <h1 style={{ fontFamily: 'Lora, serif', fontSize: '28px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>
            {status === 'approved' ? 'Your dashboard' : 'Application status'}
          </h1>
          <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>{profile.email}</p>
        </div>

        {/* Main content */}
        <div style={{ padding: '0 24px' }}>
          {(status === 'submitted' || status === 'pending') && (
            <PendingScreen profile={profile} cleaner={cleaner} emailConfirmed={emailConfirmed} />
          )}
          {status === 'approved' && <ApprovedShell profile={profile} />}
          {(status === 'rejected' || status === 'suspended') && (
            <BlockedScreen status={status} />
          )}
        </div>
      </div>
    </>
  )
}
