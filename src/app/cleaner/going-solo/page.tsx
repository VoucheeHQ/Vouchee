'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'

function CoverageMap() {
  return (
    <div style={{ width: '100%', borderRadius: '16px', overflow: 'hidden', border: '1.5px solid #e2e8f0', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', background: '#e8f4f8', position: 'relative' }}>
      <TransformWrapper initialScale={1} minScale={1} maxScale={4} centerOnInit>
        {({ zoomIn, zoomOut, resetTransform }) => (
          <>
            <TransformComponent wrapperStyle={{ width: '100%', display: 'block' }} contentStyle={{ width: '100%' }}>
              <img src="/Vouchee_service_area.png" alt="Vouchee service area map" style={{ width: '100%', height: 'auto', display: 'block' }} draggable={false} />
            </TransformComponent>
            <div style={{ position: 'absolute', bottom: '12px', right: '12px', display: 'flex', flexDirection: 'column', gap: '4px', zIndex: 10 }}>
              <button onClick={() => zoomIn()} style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'white', border: '1px solid #e2e8f0', fontSize: '18px', fontWeight: 700, color: '#0f172a', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', fontFamily: 'DM Sans, sans-serif' }}>+</button>
              <button onClick={() => zoomOut()} style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'white', border: '1px solid #e2e8f0', fontSize: '18px', fontWeight: 700, color: '#0f172a', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', fontFamily: 'DM Sans, sans-serif' }}>−</button>
              <button onClick={() => resetTransform()} style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'white', border: '1px solid #e2e8f0', fontSize: '11px', fontWeight: 700, color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', fontFamily: 'DM Sans, sans-serif' }}>↺</button>
            </div>
            <div style={{ position: 'absolute', bottom: '12px', left: '12px', background: 'rgba(255,255,255,0.85)', borderRadius: '8px', padding: '5px 10px', fontSize: '11px', color: '#64748b', fontFamily: 'DM Sans, sans-serif', fontWeight: 600, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
              Scroll to zoom · Drag to pan
            </div>
          </>
        )}
      </TransformWrapper>
    </div>
  )
}

export default function GoingSoloCleanerPage() {
  const router = useRouter()
  const [creditsOpen, setCreditsOpen] = useState(false)
  const [form, setForm] = useState({
    name: '', email: '', phone: '',
    hours: '',
    readiness: '',
  })
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const canSubmit = form.name && form.email && form.hours

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    await new Promise(r => setTimeout(r, 800))
    setSubmitted(true)
    setSubmitting(false)
  }

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
        .ep-credits-hero { background: linear-gradient(135deg, #eff6ff, #f0fdf4); border-radius: 20px; border: 1.5px solid #bfdbfe; padding: 24px; margin-bottom: 10px; text-align: center; }
        .ep-credits-badge { display: inline-flex; align-items: center; gap: 8px; background: #3b82f6; color: white; font-size: 13px; font-weight: 700; padding: 6px 14px; border-radius: 100px; margin-bottom: 14px; }
        .ep-credits-headline { font-family: 'Lora', serif; font-size: 20px; font-weight: 700; color: #0f172a; line-height: 1.3; margin-bottom: 10px; }
        .ep-credits-body { font-size: 13px; color: #475569; line-height: 1.65; }
        .ep-credits-expand { display: flex; align-items: center; justify-content: space-between; width: 100%; background: transparent; border: 1.5px dashed #cbd5e1; border-radius: 14px; padding: 13px 16px; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 600; color: #64748b; cursor: pointer; transition: all 0.2s; margin-top: 4px; }
        .ep-credits-expand:hover { border-color: #3b82f6; color: #3b82f6; }
        .ep-credits-detail { background: rgba(255,255,255,0.7); border-radius: 14px; border: 1.5px solid #e2e8f0; padding: 18px; margin-top: 8px; }
        .ep-credits-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #f1f5f9; }
        .ep-credits-row:last-child { border-bottom: none; padding-bottom: 0; }
        .ep-credits-milestone { font-size: 13px; font-weight: 600; color: #0f172a; }
        .ep-credits-reward { font-size: 12px; font-weight: 700; color: #22c55e; }
        .ep-form { display: flex; flex-direction: column; gap: 16px; }
        .ep-label { font-size: 13px; font-weight: 600; color: #475569; display: block; margin-bottom: 6px; }
        .ep-input { width: 100%; background: rgba(255,255,255,0.8); border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 11px 14px; font-family: 'DM Sans', sans-serif; font-size: 14px; color: #1e293b; outline: none; transition: border-color 0.15s; }
        .ep-input:focus { border-color: #3b82f6; background: white; }
        .ep-input::placeholder { color: #94a3b8; }
        .ep-select { width: 100%; background: rgba(255,255,255,0.8); border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 11px 14px; font-family: 'DM Sans', sans-serif; font-size: 14px; color: #1e293b; appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748b' d='M6 8L1 3h10z'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 14px center; outline: none; }
        .ep-select:focus { border-color: #3b82f6; }
        .ep-areas { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .ep-area { border-radius: 10px; padding: 9px 12px; font-size: 12px; font-weight: 600; cursor: pointer; border: 1.5px solid #e2e8f0; background: rgba(255,255,255,0.7); color: #475569; transition: all 0.15s; text-align: left; font-family: 'DM Sans', sans-serif; }
        .ep-area.selected { border-color: #3b82f6; background: rgba(59,130,246,0.06); color: #1e40af; }
        .ep-submit { width: 100%; padding: 15px; background: linear-gradient(90deg, #3b82f6 0%, #22c55e 100%); color: white; font-family: 'DM Sans', sans-serif; font-size: 15px; font-weight: 700; border: none; border-radius: 14px; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 16px rgba(59,130,246,0.25); margin-top: 4px; }
        .ep-submit:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(59,130,246,0.35); }
        .ep-submit:disabled { opacity: 0.5; cursor: not-allowed; }
        .ep-success { text-align: center; padding: 48px 24px; }
        .ep-success-icon { font-size: 56px; margin-bottom: 20px; }
        .ep-success-title { font-family: 'Lora', serif; font-size: 26px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }
        .ep-success-body { font-size: 15px; color: #64748b; line-height: 1.65; }
        @media (max-width: 480px) { .ep-areas { grid-template-columns: 1fr; } .ep-h1 { font-size: 24px; } }
      `}</style>

      <div className="ep" suppressHydrationWarning>

        <div className="ep-header">
          <button className="ep-back" onClick={() => router.push('/cleaner')}>← Back</button>
          <div className="ep-logo">Vou<span>chee</span></div>
          <h1 className="ep-h1">
            Ready to work for yourself?<br />
            <em>We'll help you land your first clients.</em>
          </h1>
          <p className="ep-sub">
            Going self-employed is a big step — finding your own clients is the hardest part. Vouchee connects you with vetted homeowners in Horsham who are actively looking for a cleaner, so you can build your own book of work from day one.
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
                  <div className="ep-step-title">Register your interest now</div>
                  <div className="ep-step-body">Tell us how many hours you're looking for and which parts of Horsham suit you. We'll have everything ready for you when we launch.</div>
                </div>
              </div>
              <div className="ep-step">
                <div className="ep-step-num">2</div>
                <div>
                  <div className="ep-step-title">Browse real local job listings</div>
                  <div className="ep-step-body">When we go live, you'll see cleaning requests from real customers — including their area, hours needed, preferred schedule, and what they're offering to pay. No guesswork.</div>
                </div>
              </div>
              <div className="ep-step">
                <div className="ep-step-num">3</div>
                <div>
                  <div className="ep-step-title">Apply and agree terms directly</div>
                  <div className="ep-step-body">Apply for the jobs that work for you and agree everything — rate, start date, and expectations — directly with the customer. You're your own boss from the start.</div>
                </div>
              </div>
              <div className="ep-step">
                <div className="ep-step-num">4</div>
                <div>
                  <div className="ep-step-title">Build your own reputation</div>
                  <div className="ep-step-body">Every job through Vouchee earns a verified review on your profile. The faster you build reviews, the easier it becomes to win new clients — without relying on anyone else.</div>
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
              <div className="ep-prop-icon">🚀</div>
              <div>
                <div className="ep-prop-title">Hit the ground running</div>
                <div className="ep-prop-body">Instead of waiting weeks for word-of-mouth to kick in, you'll have access to real job listings from day one — customers who are ready and waiting for a cleaner.</div>
              </div>
            </div>
            <div className="ep-prop">
              <div className="ep-prop-icon">💷</div>
              <div>
                <div className="ep-prop-title">Keep more of what you earn</div>
                <div className="ep-prop-body">Working for yourself means no agency taking a cut. Vouchee doesn't take a percentage of your hourly rate either — what you agree with the customer is what you get.</div>
              </div>
            </div>
            <div className="ep-prop">
              <div className="ep-prop-icon">🗓️</div>
              <div>
                <div className="ep-prop-title">You choose your own schedule</div>
                <div className="ep-prop-body">No rota, no manager, no minimum hours. Apply only for the jobs that suit your availability, and build your diary at your own pace.</div>
              </div>
            </div>
            <div className="ep-prop">
              <div className="ep-prop-icon">⭐</div>
              <div>
                <div className="ep-prop-title">A profile that grows with you</div>
                <div className="ep-prop-body">Every clean earns a verified review. Over time your Vouchee profile becomes your reputation — something you own, that works for you even when you're not actively looking.</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Credits ── */}
        <div className="ep-section">
          <div className="ep-section-label">Early access offer</div>
          <div className="ep-credits-hero">
            <div className="ep-credits-badge">🎁 Pre-launch perk</div>
            <div className="ep-credits-headline">Register now and enjoy unlimited free application credits for your first month</div>
            <div className="ep-credits-body">
              As an early access cleaner, apply for as much work as you want during our launch month — no credits needed. It's our way of saying thank you for being first.
            </div>
          </div>
          <button className="ep-credits-expand" onClick={() => setCreditsOpen(o => !o)}>
            <span>+ How do credits work after that?</span>
            <span style={{ transition: 'transform 0.2s', transform: creditsOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>↓</span>
          </button>
          {creditsOpen && (
            <div className="ep-credits-detail">
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>Quests — earn as you go</div>
              {[
                { label: 'First application sent', reward: '+2 credits', bonus: null },
                { label: 'First job accepted', reward: '+5 credits', bonus: '+10 early cleaner bonus' },
                { label: 'First clean completed', reward: '+5 credits', bonus: null },
                { label: 'First 5★ review received', reward: '+5 credits', bonus: '+10 early cleaner bonus' },
                { label: '3 reviews of 4★ or above', reward: '+10 credits', bonus: '+20 early cleaner bonus' },
                { label: 'Referred cleaner completes first clean', reward: '+25 credits', bonus: null },
              ].map((q, i) => (
                <div key={i} className="ep-credits-row">
                  <div>
                    <span className="ep-credits-milestone">{q.label}</span>
                    {q.bonus && <div style={{ fontSize: '11px', color: '#22c55e', fontWeight: 600, marginTop: '2px' }}>🎁 {q.bonus}</div>}
                  </div>
                  <span className="ep-credits-reward">{q.reward}</span>
                </div>
              ))}
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '16px 0 10px' }}>Badges — monthly credit refresh</div>
              {[
                { badge: '🥉 Bronze', req: '5 reviews of 4★+', reward: '2 credits/month', detail: 'Your first Vouchee badge' },
                { badge: '🥈 Silver', req: '15 reviews of 4★+', reward: '10 credits/month', detail: 'A recognised badge customers trust' },
                { badge: '🥇 Gold', req: '50 reviews of 4★+', reward: 'Unlimited credits', detail: 'Unrestricted access to every listing' },
              ].map((b, i) => (
                <div key={i} className="ep-credits-row">
                  <div>
                    <span className="ep-credits-milestone">{b.badge} — {b.req}</span>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>{b.detail}</div>
                  </div>
                  <span className="ep-credits-reward">{b.reward}</span>
                </div>
              ))}
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '14px', lineHeight: 1.5, borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                No subscription, no monthly fee. Credits are only used when you apply for work. You can also top up anytime — find out more on your dashboard after registering.
              </div>
            </div>
          )}
        </div>

        {/* ── Form ── */}
        <div className="ep-section">
          <div className="ep-section-label">Register your interest</div>
          {submitted ? (
            <div className="ep-card ep-success">
              <div className="ep-success-icon">🎉</div>
              <div className="ep-success-title">You're on the list!</div>
              <div className="ep-success-body">We'll be in touch before launch with everything you need to hit the ground running. Your first month is completely free.</div>
            </div>
          ) : (
            <div className="ep-card">
              <div className="ep-form">
                <div>
                  <label className="ep-label">Your name</label>
                  <input className="ep-input" placeholder="Jane Smith" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <label className="ep-label">Email address</label>
                  <input className="ep-input" type="email" placeholder="jane@example.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div>
                  <label className="ep-label">Phone number <span style={{ color: '#94a3b8', fontWeight: 400 }}>(optional)</span></label>
                  <input className="ep-input" type="tel" placeholder="07700 900000" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
                <div>
                  <label className="ep-label">Where are you in your plans to go self-employed?</label>
                  <select className="ep-select" value={form.readiness} onChange={e => setForm(f => ({ ...f, readiness: e.target.value }))}>
                    <option value="">Select...</option>
                    <option value="thinking">Just exploring the idea</option>
                    <option value="soon">Planning to make the move soon</option>
                    <option value="ready">Ready to go — just need clients</option>
                    <option value="part-time">Looking to start part-time alongside my current job</option>
                  </select>
                </div>
                <div>
                  <label className="ep-label">Hours you're looking to fill</label>
                  <select className="ep-select" value={form.hours} onChange={e => setForm(f => ({ ...f, hours: e.target.value }))}>
                    <option value="">Select...</option>
                    <option value="1-5">1–5 hours per week</option>
                    <option value="5-10">5–10 hours per week</option>
                    <option value="10+">10+ hours per week</option>
                  </select>
                </div>
                <div>
                  <label className="ep-label">Areas you cover <span style={{ color: '#94a3b8', fontWeight: 400 }}>(for reference)</span></label>
                  <CoverageMap />
                </div>
                <div>
                  <label className="ep-label">Which areas are you happy to work in? <span style={{ color: '#94a3b8', fontWeight: 400 }}>(select all that apply)</span></label>
                  <div className="ep-areas">
                    {['Central / South East', 'North West', 'North East / Roffey', 'South West', 'Warnham / Surrounding North', 'Broadbridge Heath', 'Mannings Heath', 'Faygate / Kilnwood Vale', 'Christs Hospital'].map(area => {
                      const selected = (form as any).selectedAreas?.includes(area) || false
                      return (
                        <button key={area} type="button"
                          className={`ep-area${selected ? ' selected' : ''}`}
                          onClick={() => setForm(f => {
                            const areas = (f as any).selectedAreas || []
                            return { ...f, selectedAreas: areas.includes(area) ? areas.filter((a: string) => a !== area) : [...areas, area] }
                          })}>
                          {selected ? '✓ ' : ''}{area}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <button className="ep-submit" onClick={handleSubmit} disabled={!canSubmit || submitting}>
                  {submitting ? 'Registering...' : 'Register my interest →'}
                </button>
                <p style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center', lineHeight: 1.5 }}>
                  No commitment. We'll be in touch before launch. Your current employer is never contacted.
                </p>
              </div>
            </div>
          )}
        </div>

      </div>
    </>
  )
}
