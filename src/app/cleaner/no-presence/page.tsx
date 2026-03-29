'use client'

import { useRouter } from 'next/navigation'
import VoucheeLogoText from '@/assets/vouchee-logo-text.svg'

export default function NoPresenceCleanerPage() {
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
        .ep-logo-wrap { display: flex; justify-content: center; margin-bottom: 24px; }
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
        .ep-submit:disabled { opacity: 0.5; cursor: not-allowed; }
        @media (max-width: 480px) { .ep-h1 { font-size: 24px; } }
      `}</style>

      <div className="ep" suppressHydrationWarning>
        <div className="ep-header">
          <button className="ep-back" onClick={() => router.push('/cleaner')}>← Back</button>
          <div className="ep-logo-wrap">
            <VoucheeLogoText width={140} height={36} />
          </div>
          <h1 className="ep-h1">
            Great cleaners shouldn't need<br />
            <em>a website or ads to get regular work.</em>
          </h1>
          <p className="ep-sub">
            Vouchee brings the work to you. No website, no ads, no social media needed. Just quality local clients in Horsham for you to choose from.
          </p>
        </div>

        <div className="ep-section">
          <div className="ep-section-label">How it works</div>
          <div className="ep-card">
            <div className="ep-steps">
              <div className="ep-step">
                <div className="ep-step-num">1</div>
                <div>
                  <div className="ep-step-title">Register your interest</div>
                  <div className="ep-step-body">Tell us how many hours you're looking for and which areas of Horsham suit you best.</div>
                </div>
              </div>
              <div className="ep-step">
                <div className="ep-step-num">2</div>
                <div>
                  <div className="ep-step-title">We give you access to local customers</div>
                  <div className="ep-step-body">Upon launch, you'll see cleaning requests from customers in Horsham. Every listing shows the hours needed, preferred days, and what they'd like to pay — all upfront.</div>
                </div>
              </div>
              <div className="ep-step">
                <div className="ep-step-num">3</div>
                <div>
                  <div className="ep-step-title">Apply for the work you want</div>
                  <div className="ep-step-body">You choose what to apply for. All customers have taken their time to fill out what they need and created an account — meaning you know they really are looking for help.</div>
                </div>
              </div>
              <div className="ep-step">
                <div className="ep-step-num">4</div>
                <div>
                  <div className="ep-step-title">Build your reputation as you go</div>
                  <div className="ep-step-body">Every customer is prompted to leave you a review, meaning your hard work does the selling for you. No expensive website or ads needed.</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="ep-section">
          <div className="ep-section-label">What you get</div>
          <div className="ep-props">
            <div className="ep-prop">
              <div className="ep-prop-icon">✅</div>
              <div>
                <div className="ep-prop-title">Vetted, quality clients</div>
                <div className="ep-prop-body">Every customer goes through our onboarding process. You'll know exactly what the job involves before you apply — no surprises, no time-wasters.</div>
              </div>
            </div>
            <div className="ep-prop">
              <div className="ep-prop-icon">💷</div>
              <div>
                <div className="ep-prop-title">You set your rate</div>
                <div className="ep-prop-body">Customers post what they'd like to pay, and you're always free to discuss your rate directly with them — Vouchee doesn't take a cut of your hourly earnings.</div>
              </div>
            </div>
            <div className="ep-prop">
              <div className="ep-prop-icon">📅</div>
              <div>
                <div className="ep-prop-title">Work on your terms</div>
                <div className="ep-prop-body">Only apply for jobs that fit your schedule and your area. You're in full control of how much you take on and when.</div>
              </div>
            </div>
            <div className="ep-prop">
              <div className="ep-prop-icon">⭐</div>
              <div>
                <div className="ep-prop-title">Your reputation wins you work</div>
                <div className="ep-prop-body">Each completed clean adds a verified review. The more reviews you have, the stronger your profile becomes — your Vouchee profile does the work a website would, for free.</div>
              </div>
            </div>
          </div>
        </div>

        <div className="ep-section">
          <div className="ep-card" style={{ textAlign: 'center', padding: '32px 24px' }}>
            <p style={{ fontSize: '14px', color: '#64748b', lineHeight: 1.6, marginBottom: '20px' }}>
              Ready to get started? It takes about 4 minutes to complete your application.
            </p>
            <button className="ep-submit" onClick={() => router.push('/cleaner/onboarding')}>
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
