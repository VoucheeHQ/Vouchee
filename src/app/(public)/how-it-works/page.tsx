import Link from 'next/link'

export const metadata = {
  title: 'How It Works | Vouchee',
  description: 'See how Vouchee connects Horsham homeowners with vetted local cleaners — simple, transparent, and built on trust.',
}

const steps = [
  {
    number: '01',
    emoji: '📋',
    title: 'Tell us what you need',
    body: 'Describe your home — how many bedrooms, which tasks, how often, and what rate you\'re happy to pay. It takes about 4 minutes and you\'ll be getting applications in no time.',
    aside: 'Your full address is never included in your listing. Cleaners only see your area.',
    asideIcon: '🔒',
    color: '#3b82f6',
    bg: '#eff6ff',
    border: '#bfdbfe',
  },
  {
    number: '02',
    emoji: '📬',
    title: 'Local cleaners apply to you',
    body: 'Cleaners in your area see your listing and apply with a short message introducing themselves. You don\'t have to search, compare dozens of profiles, or chase anyone. They come to you.',
    aside: 'Every cleaner on Vouchee has been interviewed, has a valid DBS certificate, right to work, and public liability insurance. No exceptions.',
    asideIcon: '✅',
    color: '#8b5cf6',
    bg: '#f5f3ff',
    border: '#ddd6fe',
  },
  {
    number: '03',
    emoji: '💬',
    title: 'Chat with cleaners and choose who feels right',
    body: 'When a cleaner applies, you can chat with them directly — ask questions, check their ratings, and get a feel before deciding.',
    aside: 'Reviews are verified — they only come from real Vouchee customers who\'ve had cleans completed.',
    asideIcon: '⭐',
    color: '#f59e0b',
    bg: '#fffbeb',
    border: '#fde68a',
  },
  {
    number: '04',
    emoji: '📅',
    title: 'Pick a start date and you\'re set',
    body: 'Once you\'ve chosen your cleaner, pick a start date and you\'re ready to go. You\'ll set up a small monthly Direct Debit for the Vouchee service fee — your cleaner is paid separately.',
    aside: 'The Vouchee service fee is £9.99/clean for weekly, £14.99/clean for fortnightly, £24.99/month for monthly.',
    asideIcon: '💰',
    color: '#16a34a',
    bg: '#f0fdf4',
    border: '#bbf7d0',
  },
  {
    number: '05',
    emoji: '🏠',
    title: 'Your cleaner gets everything they need',
    body: 'Once you confirm, your cleaner receives your full address, contact info and start date by email. The chat stays open so you can sort any last details — parking, access, specific instructions.',
    aside: 'This is the first and only time your information is shared. It goes directly to your chosen cleaner, nobody else.',
    asideIcon: '🔐',
    color: '#06b6d4',
    bg: '#ecfeff',
    border: '#a5f3fc',
  },
  {
    number: '06',
    emoji: '🧹',
    title: 'Your cleaner gets paid directly',
    body: 'You pay your cleaner directly — cash, bank transfer, whatever you agree. Vouchee isn\'t involved in that payment. This keeps things simple and transparent.',
    aside: 'Cleaners keep 100% of their hourly rate. The Vouchee fee is separate — not a cut of their earnings.',
    asideIcon: '🤝',
    color: '#10b981',
    bg: '#ecfdf5',
    border: '#6ee7b7',
  },
  {
    number: '07',
    emoji: '🔄',
    title: 'Need a different cleaner?',
    body: 'You can repost your request in seconds and find a better match.',
    aside: 'We\'ll even discount your first clean with a new cleaner to help you get back on track.',
    asideIcon: '💙',
    color: '#6366f1',
    bg: '#eef2ff',
    border: '#c7d2fe',
  },
  {
    number: '08',
    emoji: '😌',
    title: 'You can finally relax',
    body: 'Regular cleans, on your schedule, with someone who knows your home. Pause, edit, or cancel anytime — no contracts, no awkward conversations.',
    aside: 'Cancel anytime with 30 days\' notice. Your cleaner is always notified and given fair warning.',
    asideIcon: '🛡️',
    color: '#0ea5e9',
    bg: '#f0f9ff',
    border: '#bae6fd',
  },
]

const reassurances = [
  { icon: '🔍', title: 'Manually vetted', body: 'Every cleaner is interviewed prior to approval. We also require insurance, DBS, and right to work before they go live.' },
  { icon: '🔒', title: 'Address protected', body: 'Your address stays private until you\'ve chosen your cleaner and confirmed a start date.' },
  { icon: '💬', title: 'Safe messaging', body: 'All chats happen on-platform, keeping everything secure and easy to manage.' },
  { icon: '💰', title: 'No hidden fees', body: 'One small monthly fee. Your cleaner keeps every penny of what you pay them.' },
  { icon: '⭐', title: 'Real reviews', body: 'Every review is tied to a completed clean. No fake ratings, no gaming the system.' },
  { icon: '🛡️', title: 'Cancel anytime', body: 'No penalties — just give your cleaner fair notice.' },
]

export default function HowItWorksPage() {
  return (
    <>
      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)', borderBottom: '1px solid #e2e8f0', padding: '72px 24px 64px' }}>
        <div style={{ maxWidth: '680px', margin: '0 auto', textAlign: 'center', fontFamily: "'DM Sans', sans-serif" }}>
          <h1 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 800, color: '#0f172a', margin: '0 0 20px', lineHeight: 1.15, letterSpacing: '-0.5px' }}>
            Find a trusted local cleaner — without the hassle
          </h1>
          <p style={{ fontSize: '18px', color: '#475569', lineHeight: 1.7, margin: '0 0 36px', maxWidth: '520px', marginLeft: 'auto', marginRight: 'auto' }}>
            Post your request and cleaners come to you. Compare, chat, and choose who feels right.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/request/property" style={{ background: '#2563eb', color: 'white', borderRadius: '12px', padding: '14px 28px', fontSize: '15px', fontWeight: 700, textDecoration: 'none', display: 'inline-block' }}>
              Post a request →
            </Link>
            <Link href="/cleaner" style={{ background: 'white', color: '#0f172a', border: '1.5px solid #e2e8f0', borderRadius: '12px', padding: '14px 28px', fontSize: '15px', fontWeight: 700, textDecoration: 'none', display: 'inline-block' }}>
              Apply as a cleaner
            </Link>
          </div>
        </div>
      </div>

      {/* Steps */}
      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '80px 24px 48px', fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {steps.map((step, i) => (
            <div key={i} style={{ display: 'flex', position: 'relative' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: '56px', marginRight: '32px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: step.bg, border: `2px solid ${step.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0, zIndex: 1 }}>
                  {step.emoji}
                </div>
                {i < steps.length - 1 && (
                  <div style={{ width: '2px', flex: 1, background: 'linear-gradient(to bottom, #e2e8f0, #f1f5f9)', minHeight: '40px', marginTop: '4px' }} />
                )}
              </div>
              <div style={{ flex: 1, paddingBottom: i < steps.length - 1 ? '48px' : '0' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: step.color, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px' }}>
                  Step {step.number}
                </div>
                <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: '0 0 12px', letterSpacing: '-0.2px', lineHeight: 1.3 }}>
                  {step.title}
                </h2>
                <p style={{ fontSize: '15px', color: '#475569', lineHeight: 1.75, margin: '0 0 16px' }}>
                  {step.body}
                </p>
                <div style={{ background: step.bg, border: `1.5px solid ${step.border}`, borderRadius: '12px', padding: '12px 16px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '16px', flexShrink: 0, marginTop: '1px' }}>{step.asideIcon}</span>
                  <p style={{ margin: 0, fontSize: '13px', color: '#374151', lineHeight: 1.6, fontWeight: 500 }}>{step.aside}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sandwiched CTA — between steps and trust section */}
      <div style={{ padding: '40px 24px', textAlign: 'center', background: '#f8fafc', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ maxWidth: '520px', margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(22px, 4vw, 32px)', fontWeight: 800, color: '#0f172a', margin: '0 0 12px', letterSpacing: '-0.3px' }}>
            Ready to get started?
          </h2>
          <p style={{ fontSize: '15px', color: '#64748b', margin: '0 0 24px', lineHeight: 1.7 }}>
            Post your request in 4 minutes. No commitment until you choose a cleaner.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/request/property" style={{ background: '#2563eb', color: 'white', borderRadius: '12px', padding: '13px 28px', fontSize: '15px', fontWeight: 700, textDecoration: 'none', display: 'inline-block' }}>
              Post a request →
            </Link>
            <Link href="/faq" style={{ background: 'white', color: '#0f172a', border: '1.5px solid #e2e8f0', borderRadius: '12px', padding: '13px 28px', fontSize: '15px', fontWeight: 700, textDecoration: 'none', display: 'inline-block' }}>
              Read the FAQ
            </Link>
          </div>
        </div>
      </div>

      {/* Trust grid — blue, no subtitle */}
      <div style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 60%, #3b82f6 100%)', padding: '80px 24px', fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ maxWidth: '760px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h2 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 800, color: 'white', margin: '0', letterSpacing: '-0.3px' }}>
              Built on trust
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
            {reassurances.map((r, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.12)', borderRadius: '16px', padding: '24px', border: '1px solid rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)' }}>
                <div style={{ fontSize: '28px', marginBottom: '12px' }}>{r.icon}</div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: 'white', marginBottom: '6px' }}>{r.title}</div>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.75)', lineHeight: 1.6 }}>{r.body}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
