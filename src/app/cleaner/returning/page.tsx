'use client'

import { useRouter } from 'next/navigation'

export default function ReturningCleanerPage() {
  const router = useRouter()

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href="https://fonts.googleapis.com/css2?family=Lora:wght@400;600;700&family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <style suppressHydrationWarning>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .ep { min-height: 100vh; font-family: 'DM Sans', sans-serif; background: linear-gradient(160deg, #f0f7ff 0%, #fefce8 50%, #f0fdf4 100%); }
        .ep-header { padding: 40px 20px 48px; text-align: center; max-width: 600px; margin: 0 auto; }
        .ep-back { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; color: #64748b; cursor: pointer; background: none; border: none; font-family: 'DM Sans', sans-serif; margin-bottom: 28px; padding: 0; transition: color 0.15s; }
        .ep-back:hover { color: #0f172a; }
        .ep-logo { font-family: 'Lora', serif; font-size: 44px; font-weight: 700; color: #0f172a; letter-spacing: -0.5px; margin-bottom: 24px; display: block; }
        .ep-logo span { color: #22c55e; }
        .ep-h1 { font-family: 'Lora', serif; font-size: clamp(24px, 5vw, 36px); font-weight: 700; color: #0f172a; line-height: 1.2; letter-spacing: -0.3px; margin-bottom: 16px; }
        .ep-h1 em { font-style: normal; color: #3b82f6; }
        .ep-sub { font-size: 16px; color: #475569; line-height: 1.65; max-width: 480px; margin: 0 auto; }
        .ep-section { padding: 0 20px 40px; max-width: 600px; margin: 0 auto; }
        .ep-section-label { font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 16px; }
        .ep-card { background: rgba(255,255,255,0.82); backdrop-filter: blur(16px); border-radius: 20px; border: 1.5px solid rgba(255,255,255,0.9); box-shadow: 0 2px 16px rgba(0,0,0,0.05); padding: 24px; margin-bottom: 12px; }
        .ep-steps { display: flex; flex-direction: column; gap: 0; }
        .ep-step { display: flex; gap: 16px; align-items: flex-start; padding: 20px 0; border-bottom: 1px solid rgba(0,0,0,0.05); }
        .ep-step:last-child { border-bottom: none; padding-bottom: 0; }
        .ep-step-num { width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, #3b82f6, #22c55e); display: flex; align-items: center; justify-content: center; font-size: 15px; font-weight: 800; color: white; flex-shrink: 0; font-family: 'Lora', serif; }
        .ep-step-title { font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
        .ep-step-body { font-size: 13px; color: #64748b; line-height: 1.55; }
        .ep-props { display: flex; flex-direction: column; gap: 10px; }
        .ep-prop { display: flex; align-items: flex-start; gap: 12px; padding: 16px; background: rgba(255,255,255,0.7); border-radius: 14px; border: 1.5px solid rgba(255,255,255,0.9); }
        .ep-prop-icon { font-size: 22px; flex-shrink: 0; margin-top: 1px; }
        .ep-prop-title { font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 2px; }
        .ep-prop-body { font-size: 12px; color: #64748b; line-height: 1.55; }
        .ep-submit { width: 100%; padding: 15px; background: linear-gradient(90deg, #3b82f6 0%, #22c55e 100%); color: white; font-family: 'DM Sans', sans-serif; font-size: 15px; font-weight: 700; border: none; border-radius: 14px; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 16px rgba(59,130,246,0.25); margin-top: 4px; }
        .ep-submit:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(59,130,246,0.35); }
        @media (max-width: 480px) { .ep-h1 { font-size: 24px; } }
      `}</style>

      <div className="ep" suppressHydrationWarning>

        <div className="ep-header">
          <button className="ep-back" onClick={() => router.push('/cleaner')}>← Back</button>
          <div className="ep-logo">Vou<span>chee</span></div>
          <h1 className="ep-h1">
            Your experience still counts.<br />
            <em>Let's get your diary full again.</em>
          </h1>
          <p className="ep-sub">
            Whether life got in the way or you just needed a break, your cleaning experience still counts. Vouchee helps fill your diary with committed local clients, around whatever schedule suits you.
          </p>
        </div>

        {/* ── How it works ── */}
        <div className="ep-section">
          <div className="ep-section-label">How it works</div>
          <div className="ep-card">
            <div className="ep-steps">
              <div className="ep-step">
                <div className="ep-step-num">1</div>
                <div>
                  <div className="ep-step-title">Register your interest</div>
                  <div className="ep-step-body">Tell us how many hours you're looking for and which parts of Horsham you'd like to work in, and we'll ensure you have a steady stream of customers to choose from.</div>
                </div>
              </div>
              <div className="ep-step">
                <div className="ep-step-num">2</div>
                <div>
                  <div className="ep-step-title">Browse real local job listings</div>
                  <div className="ep-step-body">Upon launch, you'll see cleaning requests from real customers in Horsham, including their area, hours needed, preferred schedule, and what they're offering to pay — everything you need to decide if a job is right for you, before you even apply.</div>
                </div>
              </div>
              <div className="ep-step">
                <div className="ep-step-num">3</div>
                <div>
                  <div className="ep-step-title">Apply for the right jobs for you</div>
                  <div className="ep-step-body">View all available work across Horsham and apply only for what fits around your life — no pressure, no minimum commitment.</div>
                </div>
              </div>
              <div className="ep-step">
                <div className="ep-step-num">4</div>
                <div>
                  <div className="ep-step-title">Build your reputation as you go</div>
                  <div className="ep-step-body">Every accepted job through Vouchee earns a verified review on your profile. The faster you build reviews, the easier it becomes to win new clients.</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── What you get ── */}
        <div className="ep-section">
          <div className="ep-section-label">Why Vouchee works for you</div>
          <div className="ep-props">
            <div className="ep-prop">
              <div className="ep-prop-icon">🔄</div>
              <div>
                <div className="ep-prop-title">Rebuild your client base fast</div>
                <div className="ep-prop-body">No waiting for word-of-mouth to spread. Vouchee gives you access to customers who are already looking — so you can fill your diary as quickly or as gradually as you like.</div>
              </div>
            </div>
            <div className="ep-prop">
              <div className="ep-prop-icon">🙌</div>
              <div>
                <div className="ep-prop-title">No judgement on the gap</div>
                <div className="ep-prop-body">It doesn't matter how long you've been away. Customers care about the work you do for them, not what you did before. Your Vouchee profile starts fresh and grows from your first clean.</div>
              </div>
            </div>
            <div className="ep-prop">
              <div className="ep-prop-icon">🕐</div>
              <div>
                <div className="ep-prop-title">Start at your own pace</div>
                <div className="ep-prop-body">Ease back in with a few hours a week, or go for it from the start. You choose what you apply for, with no minimum commitments and no pressure.</div>
              </div>
            </div>
            <div className="ep-prop">
              <div className="ep-prop-icon">💷</div>
              <div>
                <div className="ep-prop-title">Your rate, your terms</div>
                <div className="ep-prop-body">Customers post what they're offering, and you can discuss your rate with them directly. Vouchee doesn't take a cut of your hourly earnings — ever.</div>
                <div style={{ marginTop: '8px', fontSize: '12px', fontWeight: 700, color: '#22c55e' }}>Most Horsham customers post between £14.5–17.5/hr</div>
              </div>
            </div>
            <div className="ep-prop">
              <div className="ep-prop-icon">✅</div>
              <div>
                <div className="ep-prop-title">Vetted customers, no time-wasters</div>
                <div className="ep-prop-body">Every customer goes through our onboarding process. You'll know exactly what's involved before you apply — no nasty surprises when you arrive.</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── CTA ── */}
        <div className="ep-section">
          <div className="ep-card" style={{ textAlign: 'center', padding: '32px 24px' }}>
            <p style={{ fontSize: '14px', color: '#64748b', lineHeight: 1.6, marginBottom: '20px' }}>
              Ready to get started? It takes about 4 minutes to complete your application.
            </p>
            <button
              className="ep-submit"
              onClick={() => router.push('/cleaner/onboarding')}
            >
              Continue →
            </button>
            <p style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center', lineHeight: 1.5, marginTop: '14px' }}>
              Have a question first?{' '}
              <a href="mailto:cleaners@vouchee.co.uk" style={{ color: '#3b82f6', fontWeight: 600, textDecoration: 'none' }}>
                cleaners@vouchee.co.uk
              </a>
            </p>
          </div>
        </div>

      </div>
    </>
  )
}
