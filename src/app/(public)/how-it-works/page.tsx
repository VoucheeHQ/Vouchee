import Link from 'next/link'

export const metadata = {
  title: 'How It Works | Vouchee',
  description: 'See how Vouchee connects Horsham homeowners with vetted local cleaners — simple, transparent, and built on trust.',
}

const steps = [
  {
    number: '01',
    emoji: '📋',
    // Feedback: "Tell us what you need" feels easier, less effort
    title: 'Tell us what you need',
    body: 'Describe your home — how many bedrooms, which tasks, how often, and what rate you\'re happy to pay. It takes about 2 minutes and your listing goes live straight away.',
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
    // Feedback: "You don't have to search or chase — cleaners come to you."
    body: 'Cleaners in your area see your listing and apply — with a short message introducing themselves. You don\'t have to search or chase — cleaners come to you.',
    aside: 'Every cleaner on Vouchee has been manually checked — DBS certificate, right to work, and public liability insurance. No exceptions.',
    asideIcon: '✅',
    color: '#8b5cf6',
    bg: '#f5f3ff',
    border: '#ddd6fe',
  },
  {
    number: '03',
    emoji: '💬',
    // Feedback: "Chat with cleaners and choose who feels right" is more natural
    title: 'Chat with cleaners and choose who feels right',
    body: 'Open a chat with any cleaner who applies — ask questions, get a feel for them, read their reviews. Take your time. There\'s no pressure.',
    aside: 'Reviews are verified — they only come from real Vouchee customers who\'ve had cleans completed.',
    asideIcon: '⭐',
    color: '#f59e0b',
    bg: '#fffbeb',
    border: '#fde68a',
    // Mid-page CTA goes after this step
    midCTA: true,
  },
  {
    number: '04',
    emoji: '📅',
    title: 'Pick a start date and you\'re set',
    // Feedback: Separates payments clearly, removes confusion
    body: 'Once you\'re happy, choose your cleaner and pick a start date. You\'ll set up a small monthly Direct Debit for the Vouchee service fee — your cleaner is paid separately, directly by you.',
    aside: 'The Vouchee fee is £9.99–£24.99/month depending on frequency. Your cleaner\'s pay goes directly to them — we never touch it.',
    asideIcon: '💰',
    color: '#16a34a',
    bg: '#f0fdf4',
    border: '#bbf7d0',
  },
  {
    number: '05',
    emoji: '🏠',
    title: 'Your cleaner gets everything they need',
    body: 'Once you confirm, your cleaner receives your full address and start date by email. The chat stays open so you can sort any last details — parking, access, specific instructions.',
    aside: 'This is the first and only time your address is shared. It goes directly to your chosen cleaner, nobody else.',
    asideIcon: '🔐',
    color: '#06b6d4',
    bg: '#ecfeff',
    border: '#a5f3fc',
  },
  {
    number: '06',
    emoji: '🧹',
    // Feedback: Lead with benefit — "Your cleaner gets paid directly"
    title: 'Your cleaner gets paid directly',
    body: 'You pay your cleaner directly — cash, bank transfer, whatever you agree. Vouchee isn\'t involved in that payment.',
    aside: 'Cleaners keep 100% of their hourly rate. The Vouchee fee is separate — not a cut of their earnings.',
    asideIcon: '🤝',
    color: '#10b981',
    bg: '#ecfdf5',
    border: '#6ee7b7',
  },
  {
    number: '07',
    emoji: '🔄',
    title: 'It just keeps going — on your terms',
    // Feedback: Remove "you can" → more confident tone
    body: 'Regular cleans, on your schedule, with someone who knows your home. Pause, edit, or cancel anytime. No contracts, no awkward conversations.',
    aside: 'Cancel anytime with 30 days\' notice. Your cleaner is always notified and given fair warning.',
    asideIcon: '🛡️',
    color: '#6366f1',
    bg: '#eef2ff',
    border: '#c7d2fe',
  },
]

const reassurances = [
  { icon: '🔍', title: 'Manually vetted', body: 'Every cleaner is checked in person before they join — DBS, insurance, right to work.' },
  { icon: '🔒', title: 'Address protected', body: 'Your address stays private until you\'ve chosen your cleaner and confirmed a start date.' },
  { icon: '💬', title: 'Safe messaging', body: 'All chats happen on platform. Our team monitors for any off-platform contact attempts.' },
  { icon: '💰', title: 'No hidden fees', body: 'One small monthly fee. Your cleaner keeps every penny of what you pay them.' },
  { icon: '⭐', title: 'Real reviews', body: 'Every review is tied to a completed clean. No fake ratings, no gaming the system.' },
  { icon: '🛡️', title: 'Cancel anytime', body: '30 days\' notice, no penalty, no guilt. We just ask you let your cleaner know.' },
]

export default function HowItWorksPage() {
  return (
    <>
      {/* Hero — feedback: more outcome-focused headline */}
      <div style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)', borderBottom: '1px solid #e2e8f0', padding: '72px 24px 64px' }}>
        <div style={{ maxWidth: '680px', margin: '0 auto', textAlign: 'center', fontFamily: "'DM Sans', sans-serif" }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '100px', padding: '6px 16px', fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '24px' }}>
            <span>✨</span> Simple from start to finish
          </div>
          <h1 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 800, color: '#0f172a', margin: '0 0 20px', lineHeight: 1.15, letterSpacing: '-0.5px' }}>
            Find a trusted local cleaner — without the hassle
          </h1>
          <p style={{ fontSize: '18px', color: '#475569', lineHeight: 1.7, margin: '0 0 36px', maxWidth: '520px', marginLeft: 'auto', marginRight: 'auto' }}>
            Post your request, compare vetted cleaners, and choose who feels right. No agencies, no pressure.
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
      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '80px 24px', fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {steps.map((step, i) => (
            <>
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

              {/* Mid-page CTA after step 03 — feedback: increases conversions significantly */}
              {(step as any).midCTA && (
                <div key={`cta-${i}`} style={{ margin: '0 0 48px 88px' }}>
                  <div style={{ background: 'linear-gradient(135deg, #eff6ff, #f0fdf4)', border: '1.5px solid #bfdbfe', borderRadius: '16px', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', marginBottom: '2px' }}>Ready to find your cleaner?</div>
                      <div style={{ fontSize: '13px', color: '#64748b' }}>Post a request in 2 minutes — free until you choose someone.</div>
                    </div>
                    <Link href="/request/property" style={{ background: '#2563eb', color: 'white', borderRadius: '10px', padding: '11px 22px', fontSize: '14px', fontWeight: 700, textDecoration: 'none', display: 'inline-block', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      Post a request →
                    </Link>
                  </div>
                </div>
              )}
            </>
          ))}
        </div>
      </div>

      {/* Trust grid */}
      <div style={{ background: '#0f172a', padding: '80px 24px', fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ maxWidth: '760px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h2 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 800, color: 'white', margin: '0 0 12px', letterSpacing: '-0.3px' }}>
              Built on trust
            </h2>
            <p style={{ fontSize: '16px', color: '#94a3b8', margin: 0 }}>
              Every decision we make is designed to protect both sides.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
            {reassurances.map((r, i) => (
              <div key={i} style={{ background: '#1e293b', borderRadius: '16px', padding: '24px', border: '1px solid #334155' }}>
                <div style={{ fontSize: '28px', marginBottom: '12px' }}>{r.icon}</div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: 'white', marginBottom: '6px' }}>{r.title}</div>
                <div style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.6 }}>{r.body}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div style={{ padding: '80px 24px', textAlign: 'center', background: '#f8fafc', fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ maxWidth: '520px', margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 800, color: '#0f172a', margin: '0 0 14px', letterSpacing: '-0.3px' }}>
            Ready to get started?
          </h2>
          <p style={{ fontSize: '16px', color: '#64748b', margin: '0 0 32px', lineHeight: 1.7 }}>
            Post your first request in 2 minutes. No commitment until you choose a cleaner.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/request/property" style={{ background: '#2563eb', color: 'white', borderRadius: '12px', padding: '14px 32px', fontSize: '15px', fontWeight: 700, textDecoration: 'none', display: 'inline-block' }}>
              Post a request →
            </Link>
            <Link href="/faq" style={{ background: 'white', color: '#0f172a', border: '1.5px solid #e2e8f0', borderRadius: '12px', padding: '14px 32px', fontSize: '15px', fontWeight: 700, textDecoration: 'none', display: 'inline-block' }}>
              Read the FAQ
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
