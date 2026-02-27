'use client'

import { useState } from 'react'

const platformPoints = [
  {
    icon: '💷',
    title: 'Free to join. No cut on your regular earnings.',
    body: 'Vouchee charges customers a subscription fee — not you. On regular cleaning work, your full hourly rate is paid by the customer directly to you.',
  },
  {
    icon: '🏠',
    title: 'What customers use Vouchee for.',
    body: 'Homeowners know cleaners found through Vouchee have been vetted, hold up-to-date credentials and take their work seriously. So when a customer posts a request, you know they are committed.',
  },
  {
    icon: '⭐',
    title: 'Use Vouchee ratings to win more work.',
    body: 'We know how challenging and costly it can be building an online presence that represents you well. Vouchee actively prompts customers to provide you with verified reviews to help you win more customers — taking away the stress and letting your work speak for itself.',
  },
  {
    icon: '📣',
    title: 'We handle the rest.',
    body: 'Vouchee works with local partners and continuously invests in advertising across Horsham to keep new customer requests flowing. You can focus on cleaning and we\'ll handle the rest.',
  },
]

const howItWorks = [
  {
    step: '1',
    title: 'Browse job listings',
    body: 'See all active customer requests in your area. Each listing shows the location, tasks, preferred schedule and offered hourly rate — everything you need to decide if it\'s right for you.',
  },
  {
    step: '2',
    title: 'You apply',
    body: 'If you see a job you like, apply using 1 credit. The customer will get an email and notification letting them know you\'ve applied, where they can see your message, your Vouchee rating and how long you\'ve been on the platform.',
  },
  {
    step: '3',
    title: 'You connect',
    body: 'When a customer accepts your request, a chat opens so you can confirm your rate, a start date and all work requirements. Everything is agreed between you and the customer — Vouchee just makes the introduction.',
  },
  {
    step: '4',
    title: 'You get paid',
    body: 'The customer pays you directly for your time. No platform middleman, no waiting on transfers. Your money, your way.',
  },
]

const workPoints = [
  {
    icon: '📍',
    title: 'Only near you.',
    body: 'Every job listing shows which area it\'s located in. Meaning you can choose work that fits around your schedule. No more 30 minutes on the bus between jobs.',
  },
  {
    icon: '🤝',
    title: 'You\'re in control.',
    body: 'You decide which jobs to apply for. You\'re never assigned work or pressured into a booking. Every customer you take on is one you\'ve chosen.',
  },
  {
    icon: '💰',
    title: 'Hourly rates you\'re happy with.',
    body: 'Every listing shows the customer\'s offered hourly rate upfront. You\'re welcome to negotiate this directly with the customer — only taking on work where the rate works for you.',
  },
  {
    icon: '📅',
    title: 'Work around your life.',
    body: 'Each listing shows the customer\'s preferred days and times. Find the jobs that fit your existing schedule — not the other way around.',
  },
]

const faqs = [
  {
    q: 'What is an application credit?',
    a: 'When you apply to a customer\'s job listing, it uses one application credit. Credits keep applications intentional — customers receive genuine interest from cleaners who have reviewed their request, not mass automated responses. Your credits grow as your reputation does.',
  },
  {
    q: 'What area does Vouchee cover?',
    a: 'We currently operate in Horsham and surrounding areas — RH12 and RH13 postcodes. We\'re focused on building a strong local network before expanding.',
  },
  {
    q: 'I already have my own clients. Does that matter?',
    a: 'Not at all. Vouchee is a way to fill gaps in your schedule with vetted, reliable customers — not replace existing relationships. You stay self-employed and in full control of your diary.',
  },
  {
    q: 'What do I need to register?',
    a: 'You\'ll need self-employed status with proof (Ltd company or sole trader), a clean and current DBS check, public liability insurance (minimum £1,000,000) and right to work in the UK. Still getting these in order? Register your interest now and we\'ll be in touch when you\'re ready.',
  },
  {
    q: 'When can I start?',
    a: 'We\'re building our cleaner network now ahead of launch. Register today and you\'ll be among the first to get access — plus 20 application credits the moment your account is approved.',
  },
]

const milestones = [
  { icon: '✅', trigger: 'Account created with full profile', credits: '+20 credits', early: '+30 bonus for early cleaners' },
  { icon: '📨', trigger: 'First application sent',            credits: '+2 credits',  early: null },
  { icon: '🤝', trigger: 'First job accepted',                credits: '+5 credits',  early: '+10 bonus for early cleaners' },
  { icon: '🏠', trigger: 'First clean completed',             credits: '+5 credits',  early: null },
  { icon: '⭐', trigger: 'First 5★ review received',          credits: '+5 credits',  early: '+10 bonus for early cleaners' },
  { icon: '📈', trigger: '3 reviews of 4★ or above',          credits: '+10 credits', early: '+20 bonus for early cleaners' },
  { icon: '🔗', trigger: 'Referred cleaner completes first clean', credits: '+25 credits', early: null },
]

const tiers = [
  { name: 'Bronze', color: '#92400e', bg: '#fef3c7', border: '#fcd34d', trigger: '5 reviews of 4★ or above',  credits: '2 credits refreshed monthly',  detail: 'Your first Vouchee badge. A monthly credit top-up to keep work flowing.' },
  { name: 'Silver', color: '#475569', bg: '#f1f5f9', border: '#cbd5e1', trigger: '15 reviews of 4★ or above', credits: '10 credits refreshed monthly', detail: 'A recognised badge that shows customers you\'re established and trusted.' },
  { name: 'Gold',   color: '#b45309', bg: '#fef9c3', border: '#fde047', trigger: '50 reviews of 4★ or above', credits: 'Unlimited credits',            detail: 'The highest Vouchee badge. Unrestricted access to every listing on the platform.' },
]

const creditBundles = [
  { amount: 1,   price: '£2.50', perCredit: '£2.50/credit' },
  { amount: 10,  price: '£15',   perCredit: '£1.50/credit' },
  { amount: 30,  price: '£25',   perCredit: '£0.83/credit' },
  { amount: 50,  price: '£40',   perCredit: '£0.80/credit' },
  { amount: 100, price: '£60',   perCredit: '£0.60/credit' },
]

// Mock job listing data
const mockJob = {
  area: 'Central Horsham',
  postedAgo: '2 hours ago',
  bedrooms: 4,
  bathrooms: 1,
  hours: 4.5,
  frequency: 'Weekly',
  preferredDays: ['Tuesday', 'Wednesday', 'Thursday'],
  preferredTime: 'Morning',
  rate: 17.50,
  estPerSession: 78.75,
  tasks: ['General cleaning', 'Hoovering', 'Kitchen deep clean', 'Bathroom deep clean'],
  specialRequests: ['Ironing'],
  notes: 'We have a friendly dog. Key safe on front porch. Happy to discuss start date.',
}

function MockJobCard() {
  const [expanded, setExpanded] = useState(false)
  return (
    <div style={{
      background: 'white', borderRadius: '20px',
      boxShadow: '0 4px 32px rgba(0,0,0,0.10)',
      overflow: 'hidden', border: '1px solid #e8edf2',
    }}>
      {/* Card header */}
      <div style={{
        background: 'linear-gradient(135deg, #1a56db, #3b82f6)',
        padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.85)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          📋 Example job listing
        </div>
        <div style={{ background: 'rgba(34,197,94,0.25)', border: '1px solid rgba(34,197,94,0.4)', borderRadius: '100px', padding: '3px 10px', fontSize: '11px', fontWeight: 700, color: '#86efac' }}>
          ● Live
        </div>
      </div>

      <div style={{ padding: '20px' }}>
        {/* Location + time */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '15px' }}>📍</span>
            <span style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.3px' }}>{mockJob.area}</span>
          </div>
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>{mockJob.postedAgo}</span>
        </div>

        {/* Property chips */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
          {[
            `${mockJob.bedrooms} bed`,
            `${mockJob.bathrooms} bath`,
            `${mockJob.hours} hrs/session`,
            mockJob.frequency,
          ].map((chip, i) => (
            <span key={i} style={{
              background: '#f1f5f9', borderRadius: '100px',
              padding: '4px 12px', fontSize: '12px', fontWeight: 600, color: '#475569',
            }}>{chip}</span>
          ))}
        </div>

        <div style={{ height: '1px', background: '#f1f5f9', margin: '0 0 14px' }} />

        {/* Tasks */}
        <div style={{ marginBottom: '14px' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Tasks</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {mockJob.tasks.map((t, i) => (
              <span key={i} style={{
                background: '#f0fdf4', border: '1px solid #bbf7d0',
                color: '#15803d', fontSize: '12px', fontWeight: 600,
                padding: '4px 12px', borderRadius: '100px',
              }}>{t}</span>
            ))}
            {mockJob.specialRequests.map((t, i) => (
              <span key={i} style={{
                background: '#fef9c3', border: '1px solid #fde047',
                color: '#854d0e', fontSize: '12px', fontWeight: 600,
                padding: '4px 12px', borderRadius: '100px',
              }}>{t}</span>
            ))}
          </div>
        </div>

        {/* Schedule */}
        <div style={{ marginBottom: '14px' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Preferred schedule</div>
          <div style={{ fontSize: '13px', color: '#475569' }}>
            {mockJob.preferredDays.join(', ')} · {mockJob.preferredTime}
          </div>
        </div>

        {/* Notes */}
        {expanded && (
          <div style={{ marginBottom: '14px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Customer notes</div>
            <div style={{ fontSize: '13px', color: '#475569', fontStyle: 'italic' }}>"{mockJob.notes}"</div>
          </div>
        )}

        <div style={{ height: '1px', background: '#f1f5f9', margin: '0 0 14px' }} />

        {/* Rate row */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
          <div style={{ flex: 1, background: '#fefce8', border: '1px solid #fef08a', borderRadius: '12px', padding: '12px 14px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '3px' }}>Offered rate</div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#78350f', lineHeight: 1 }}>
              £{mockJob.rate.toFixed(2)}<span style={{ fontSize: '12px', fontWeight: 500 }}>/hr</span>
            </div>
          </div>
          <div style={{ flex: 1, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '12px 14px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '3px' }}>Est. per session</div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#15803d', lineHeight: 1 }}>
              £{mockJob.estPerSession.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Expand toggle */}
        <button onClick={() => setExpanded(!expanded)} style={{
          width: '100%', padding: '10px', borderRadius: '10px',
          border: '1.5px solid #e2e8f0', background: 'transparent',
          fontSize: '13px', fontWeight: 600, color: '#64748b',
          cursor: 'pointer', marginBottom: '10px',
          fontFamily: "'DM Sans', sans-serif",
        }}>
          {expanded ? 'Show less ▲' : 'See customer notes ▼'}
        </button>

        {/* Apply button — disabled/demo */}
        <button style={{
          width: '100%', padding: '14px', borderRadius: '12px',
          border: 'none', background: 'linear-gradient(135deg, #1a56db, #3b82f6)',
          color: 'white', fontSize: '15px', fontWeight: 700,
          cursor: 'not-allowed', opacity: 0.5,
          fontFamily: "'DM Sans', sans-serif",
        }}>
          Apply (1 credit) — demo only
        </button>
      </div>
    </div>
  )
}

export default function CleanerWhyVoucheePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    await new Promise(r => setTimeout(r, 800))
    setSubmitted(true)
    setSubmitting(false)
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600;700&family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .cp { min-height: 100vh; background: #f8f9fb; font-family: 'DM Sans', sans-serif; }

        .hero {
          background: linear-gradient(150deg, #0f2942 0%, #1a3f63 60%, #1e5080 100%);
          padding: 72px 20px 88px; position: relative; overflow: hidden;
        }
        .hero::before { content: ''; position: absolute; top: -80px; right: -80px; width: 500px; height: 500px; background: radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 65%); border-radius: 50%; }
        .hero::after  { content: ''; position: absolute; bottom: -60px; left: -60px; width: 320px; height: 320px; background: radial-gradient(circle, rgba(34,197,94,0.1) 0%, transparent 65%); border-radius: 50%; }
        .hero-inner { max-width: 680px; margin: 0 auto; position: relative; z-index: 1; }
        .hero-badge { display: inline-flex; align-items: center; gap: 8px; background: rgba(34,197,94,0.15); border: 1px solid rgba(34,197,94,0.3); color: #86efac; font-size: 11px; font-weight: 700; padding: 6px 14px; border-radius: 100px; margin-bottom: 24px; letter-spacing: 0.07em; text-transform: uppercase; }
        .hero-badge-dot { width: 6px; height: 6px; border-radius: 50%; background: #22c55e; }
        .hero h1 { font-family: 'Lora', serif; font-size: clamp(28px, 5.5vw, 46px); font-weight: 700; color: white; line-height: 1.18; margin-bottom: 18px; letter-spacing: -0.3px; }
        .hero-sub { font-size: 16px; color: rgba(255,255,255,0.72); line-height: 1.75; margin-bottom: 36px; max-width: 540px; }
        .hero-stats { display: flex; }
        .hero-stat { padding: 16px 28px 16px 0; margin-right: 28px; border-right: 1px solid rgba(255,255,255,0.12); }
        .hero-stat:last-child { border-right: none; }
        .hero-stat-num { font-family: 'Lora', serif; font-size: 30px; font-weight: 700; color: white; line-height: 1; }
        .hero-stat-label { font-size: 12px; color: rgba(255,255,255,0.5); margin-top: 5px; }
        .wave { display: block; width: 100%; margin-bottom: -2px; }

        .section { padding: 56px 20px; }
        .section-alt { padding: 56px 20px; background: white; }
        .section-dark { padding: 56px 20px; background: linear-gradient(150deg, #0f2942, #1a3f63); }
        .section-inner { max-width: 680px; margin: 0 auto; }
        .section-label { font-size: 11px; font-weight: 700; color: #3b82f6; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 10px; }
        .section-label-light { font-size: 11px; font-weight: 700; color: #86efac; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 10px; }
        .section-title { font-family: 'Lora', serif; font-size: clamp(22px, 4vw, 32px); font-weight: 700; color: #0f172a; line-height: 1.2; margin-bottom: 12px; letter-spacing: -0.2px; }
        .section-title-light { font-family: 'Lora', serif; font-size: clamp(22px, 4vw, 32px); font-weight: 700; color: white; line-height: 1.2; margin-bottom: 12px; letter-spacing: -0.2px; }
        .section-sub { font-size: 15px; color: #64748b; line-height: 1.7; margin-bottom: 36px; }
        .section-sub-light { font-size: 15px; color: rgba(255,255,255,0.65); line-height: 1.7; margin-bottom: 36px; }

        .platform-grid { display: flex; flex-direction: column; gap: 10px; }
        .platform-card { background: white; border-radius: 18px; padding: 20px 22px; border: 1px solid #e8edf2; display: flex; gap: 16px; align-items: flex-start; box-shadow: 0 1px 4px rgba(0,0,0,0.04); transition: box-shadow 0.2s, transform 0.2s; }
        .platform-card:hover { box-shadow: 0 4px 20px rgba(0,0,0,0.07); transform: translateY(-1px); }
        .platform-icon { width: 42px; height: 42px; border-radius: 12px; background: #f0f7ff; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; }
        .platform-title { font-size: 15px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
        .platform-body { font-size: 14px; color: #64748b; line-height: 1.6; }

        .steps-grid { display: flex; flex-direction: column; gap: 0; }
        .step-item { display: flex; gap: 20px; padding-bottom: 28px; position: relative; }
        .step-item:last-child { padding-bottom: 0; }
        .step-item:not(:last-child)::before { content: ''; position: absolute; left: 19px; top: 40px; bottom: 0; width: 2px; background: rgba(255,255,255,0.1); }
        .step-num { width: 40px; height: 40px; border-radius: 50%; background: rgba(59,130,246,0.2); border: 2px solid rgba(59,130,246,0.4); display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 800; color: #93c5fd; flex-shrink: 0; font-family: 'Lora', serif; }
        .step-title { font-size: 15px; font-weight: 700; color: white; margin-bottom: 6px; }
        .step-body { font-size: 14px; color: rgba(255,255,255,0.65); line-height: 1.6; }

        .work-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .work-card { background: white; border-radius: 16px; padding: 18px; border: 1px solid #e8edf2; }
        .work-icon { font-size: 22px; margin-bottom: 10px; }
        .work-title { font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 5px; }
        .work-body { font-size: 13px; color: #64748b; line-height: 1.6; }

        .tiers-grid { display: flex; flex-direction: column; gap: 10px; }
        .tier-card { border-radius: 16px; padding: 16px 18px; display: flex; align-items: flex-start; gap: 14px; border: 1.5px solid; }
        .tier-badge { font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; padding: 4px 10px; border-radius: 100px; white-space: nowrap; margin-top: 2px; }
        .tier-trigger { font-size: 12px; color: #94a3b8; margin-bottom: 3px; }
        .tier-credits { font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 3px; }
        .tier-detail { font-size: 12px; color: #64748b; }

        .faq-list { display: flex; flex-direction: column; gap: 8px; }
        .faq-item { background: white; border: 1px solid #e8edf2; border-radius: 16px; overflow: hidden; }
        .faq-question { width: 100%; padding: 18px 20px; background: none; border: none; display: flex; align-items: center; justify-content: space-between; font-family: 'DM Sans', sans-serif; font-size: 15px; font-weight: 600; color: #0f172a; cursor: pointer; text-align: left; gap: 12px; }
        .faq-chevron { font-size: 12px; color: #94a3b8; transition: transform 0.2s; flex-shrink: 0; }
        .faq-chevron.open { transform: rotate(180deg); }
        .faq-answer { padding: 0 20px 18px; font-size: 14px; color: #64748b; line-height: 1.7; }

        .form-section { background: linear-gradient(160deg, #f0f7ff 0%, #fefce8 50%, #f0fdf4 100%); padding: 64px 20px; }
        .form-card { max-width: 520px; margin: 0 auto; background: white; border-radius: 28px; padding: 40px; box-shadow: 0 8px 48px rgba(0,0,0,0.08); }
        .form-eyebrow { display: inline-flex; align-items: center; gap: 6px; background: #fef9c3; border: 1px solid #fde047; color: #854d0e; font-size: 11px; font-weight: 700; padding: 5px 12px; border-radius: 100px; margin-bottom: 16px; letter-spacing: 0.06em; text-transform: uppercase; }
        .form-title { font-family: 'Lora', serif; font-size: 26px; font-weight: 700; color: #0f172a; margin-bottom: 8px; line-height: 1.2; }
        .form-sub { font-size: 14px; color: #64748b; margin-bottom: 28px; line-height: 1.6; }
        .form-group { margin-bottom: 16px; }
        .form-label { font-size: 13px; font-weight: 600; color: #475569; display: block; margin-bottom: 6px; }
        .form-input { width: 100%; padding: 12px 14px; background: #f8faff; border: 1.5px solid #e2e8f0; border-radius: 12px; font-family: 'DM Sans', sans-serif; font-size: 14px; color: #1e293b; transition: border-color 0.2s; }
        .form-input:focus { outline: none; border-color: #3b82f6; background: white; }
        .form-input::placeholder { color: #94a3b8; }
        .form-submit { width: 100%; padding: 16px; border: none; border-radius: 14px; background: linear-gradient(135deg, #0f2942, #1a3f63); color: white; font-family: 'DM Sans', sans-serif; font-size: 16px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 20px rgba(15,41,66,0.3); transition: transform 0.2s, box-shadow 0.2s; margin-top: 8px; }
        .form-submit:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(15,41,66,0.35); }
        .form-submit:disabled { opacity: 0.6; cursor: not-allowed; }
        .form-note { font-size: 12px; color: #94a3b8; text-align: center; margin-top: 12px; line-height: 1.5; }
        .success-state { text-align: center; padding: 20px 0; }
        .success-icon { font-size: 48px; margin-bottom: 16px; }
        .success-title { font-family: 'Lora', serif; font-size: 24px; font-weight: 700; color: #0f172a; margin-bottom: 8px; }
        .success-sub { font-size: 15px; color: #64748b; line-height: 1.6; }
        .divider { height: 1px; background: #e8edf2; max-width: 680px; margin: 0 auto; }

        @media (max-width: 520px) {
          .work-grid { grid-template-columns: 1fr; }
          .hero-stats { flex-wrap: wrap; }
          .hero-stat { padding: 10px 16px 10px 0; margin-right: 16px; }
          .form-card { padding: 28px 20px; }
        }
      `}</style>

      <div className="cp">

        {/* ── Hero ── */}
        <div className="hero">
          <div className="hero-inner">
            <div className="hero-badge"><span className="hero-badge-dot" />Now recruiting in Horsham</div>
            <h1>Why find cleaning work through Vouchee?</h1>
            <p className="hero-sub">
              Vouchee connects vetted, self-employed cleaners with local homeowners looking for someone they can rely on — week after week. Free to join, and we never take a cut of your regular earnings.
            </p>
            <div className="hero-stats">
              <div className="hero-stat"><div className="hero-stat-num">£0</div><div className="hero-stat-label">Cost to join</div></div>
              <div className="hero-stat"><div className="hero-stat-num">0%</div><div className="hero-stat-label">Cut of your rate</div></div>
              <div className="hero-stat"><div className="hero-stat-num">Local</div><div className="hero-stat-label">Horsham area only</div></div>
            </div>
          </div>
        </div>

        <svg className="wave" viewBox="0 0 1440 48" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ background: '#1a3f63' }}>
          <path d="M0 48L60 42.7C120 37.3 240 26.7 360 24C480 21.3 600 26.7 720 29.3C840 32 960 32 1080 28C1200 24 1320 16 1380 12L1440 8V0H1380C1320 0 1200 0 1080 0C960 0 840 0 720 0C600 0 480 0 360 0C240 0 120 0 60 0H0V48Z" fill="#f8f9fb"/>
        </svg>

        {/* ── Section 1: The Platform ── */}
        <div className="section">
          <div className="section-inner">
            <div className="section-label">The platform</div>
            <h2 className="section-title">Built to work for you</h2>
            <p className="section-sub">Here's what Vouchee is, what it does, and why it's different.</p>
            <div className="platform-grid">
              {platformPoints.map((p, i) => (
                <div key={i} className="platform-card">
                  <div className="platform-icon">{p.icon}</div>
                  <div>
                    <div className="platform-title">{p.title}</div>
                    <div className="platform-body">{p.body}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Section 2: How it works ── */}
        <div className="section-dark">
          <div className="section-inner">
            <div className="section-label-light">The process</div>
            <h2 className="section-title-light">What does finding work look like?</h2>
            <p className="section-sub-light">Here's what to expect once you are registered and ready to find work.</p>
            <div className="steps-grid">
              {howItWorks.map((s, i) => (
                <div key={i} className="step-item">
                  <div className="step-num">{s.step}</div>
                  <div>
                    <div className="step-title">{s.title}</div>
                    <div className="step-body">{s.body}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Section 3: The work ── */}
        <div className="section-alt">
          <div className="section-inner">
            <div className="section-label">The work</div>
            <h2 className="section-title">You're in control</h2>
            <p className="section-sub">Every job you take on is one you've chosen. Here's what that looks like in practice.</p>
            <div className="work-grid">
              {workPoints.map((w, i) => (
                <div key={i} className="work-card">
                  <div className="work-icon">{w.icon}</div>
                  <div className="work-title">{w.title}</div>
                  <div className="work-body">{w.body}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Section 4: Job preview ── */}
        <div className="section">
          <div className="section-inner">
            <div className="section-label">The listings</div>
            <h2 className="section-title">A real job listing, in full</h2>
            <p className="section-sub">
              Every request looks similar to this. Area, tasks, how many hours, how often, preferred days and a summary of what you could earn. Everything you need to decide if it's for you.
            </p>
            <MockJobCard />
            <div style={{ marginTop: '14px', padding: '12px 16px', background: '#f0f7ff', border: '1px solid #bfdbfe', borderRadius: '12px', fontSize: '13px', color: '#1e40af', lineHeight: 1.6 }}>
              💡 Green tags are regular tasks. Yellow tags are special requests. The offered rate and estimated session earnings are shown upfront to help you choose the jobs for you.
            </div>
          </div>
        </div>

        {/* ── Section 5: Benefits ── */}
        <div className="section-alt">
          <div className="section-inner">
            <div className="section-label">The benefits</div>
            <h2 className="section-title">Vouchee rewards your hard work</h2>
            <p className="section-sub">
              Application credits are how you apply to job listings. You'll receive 20 credits when you join. You can also earn more through milestones, and purchase top-ups at any time.
            </p>

            {/* Early cleaner banner */}
            <div style={{ background: 'linear-gradient(135deg, #0f2942, #1a3f63)', borderRadius: '16px', padding: '20px 22px', marginBottom: '24px', border: '1px solid rgba(99,179,237,0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <span style={{ fontSize: '24px', flexShrink: 0 }}>🎉</span>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'white', marginBottom: '4px' }}>
                    Early cleaner bonus — first 10 cleaners only
                  </div>
                  <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>
                    The first 10 cleaners to register receive boosted bonuses on key milestones. More credits, faster progression, and a head start on winning work.
                  </div>
                </div>
              </div>
            </div>

            {/* Milestones */}
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#3b82f6', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>Milestone credits</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '28px' }}>
              {milestones.map((m, i) => (
                <div key={i} style={{ background: 'white', border: '1px solid #e8edf2', borderRadius: '14px', padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <span style={{ fontSize: '18px', flexShrink: 0, marginTop: '1px' }}>{m.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5 }}>{m.trigger}</div>
                    {m.early && (
                      <div style={{ fontSize: '11px', color: '#d97706', fontWeight: 600, marginTop: '2px' }}>🎉 {m.early}</div>
                    )}
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#22c55e', whiteSpace: 'nowrap' }}>{m.credits}</div>
                </div>
              ))}
            </div>

            {/* Tiers */}
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#3b82f6', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>Earn your Vouchee badge</div>
            <div className="tiers-grid" style={{ marginBottom: '28px' }}>
              {tiers.map((tier, i) => (
                <div key={i} className="tier-card" style={{ background: tier.bg, borderColor: tier.border }}>
                  <div><div className="tier-badge" style={{ background: tier.border, color: tier.color }}>{tier.name}</div></div>
                  <div style={{ flex: 1 }}>
                    <div className="tier-trigger">{tier.trigger}</div>
                    <div className="tier-credits">{tier.credits}</div>
                    <div className="tier-detail">{tier.detail}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Credit bundles */}
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#3b82f6', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>Top up anytime</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {creditBundles.map((b, i) => (
                <div key={i} style={{ background: i === 2 ? '#f0f7ff' : 'white', border: i === 2 ? '1.5px solid #bfdbfe' : '1px solid #e8edf2', borderRadius: '14px', padding: '14px 16px', position: 'relative' }}>
                  {i === 2 && <div style={{ position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%)', background: '#3b82f6', color: 'white', fontSize: '10px', fontWeight: 700, padding: '3px 10px', borderRadius: '100px', whiteSpace: 'nowrap', letterSpacing: '0.05em' }}>MOST POPULAR</div>}
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>{b.amount} {b.amount === 1 ? 'credit' : 'credits'}</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#3b82f6', lineHeight: 1.2 }}>{b.price}</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>{b.perCredit}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Section 6: FAQ ── */}
        <div className="section">
          <div className="section-inner">
            <div className="section-label">Common questions</div>
            <h2 className="section-title">What you need to know</h2>
            <div className="faq-list">
              {faqs.map((faq, i) => (
                <div key={i} className="faq-item">
                  <button className="faq-question" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                    <span>{faq.q}</span>
                    <span className={`faq-chevron${openFaq === i ? ' open' : ''}`}>▾</span>
                  </button>
                  {openFaq === i && <div className="faq-answer">{faq.a}</div>}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Form ── */}
        <div className="form-section">
          <div className="form-card">
            {submitted ? (
              <div className="success-state">
                <div className="success-icon">✅</div>
                <div className="success-title">We'll be in touch soon</div>
                <p className="success-sub">Thanks for registering. We'll reach out as soon as your account can go live — and remember, you'll receive 20 application credits the moment you're approved.</p>
              </div>
            ) : (
              <>
                <div className="form-eyebrow">🎁 20 credits on approval</div>
                <div className="form-title">Register your interest today</div>
                <p className="form-sub">We're building our cleaner network ahead of launch. Register now and you'll be among the first to get access — plus your signup credit bonus the moment your account is approved.</p>
                <form onSubmit={handleSubmit}>
                  <div className="form-group">
                    <label className="form-label">Your name</label>
                    <input className="form-input" type="text" placeholder="Jane Smith" value={name} onChange={e => setName(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email address</label>
                    <input className="form-input" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone number <span style={{ fontWeight: 400, color: '#94a3b8' }}>— optional</span></label>
                    <input className="form-input" type="tel" placeholder="07700 900000" value={phone} onChange={e => setPhone(e.target.value)} />
                  </div>
                  <button className="form-submit" type="submit" disabled={submitting}>
                    {submitting ? 'Sending…' : 'Register my interest →'}
                  </button>
                </form>
                <p className="form-note">No spam, no commitment. We'll only contact you about your Vouchee application.</p>
              </>
            )}
          </div>
        </div>

      </div>
    </>
  )
}
