'use client'

import { useRouter } from 'next/navigation'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'

type Option = {
  emoji: string
  title: string
  body: string
  route: string
  color: string
  muted?: boolean
}

const options: Option[] = [
  {
    emoji: '🏡',
    title: 'I\'m self-employed with my own clients and online presence',
    body: 'Looking to fill specific slots with quality local clients.',
    route: '/cleaner/established',
    color: '#3b82f6',
  },
  {
    emoji: '📣',
    title: 'I\'m self-employed but don\'t have much online presence',
    body: 'No website or ads needed. Vouchee builds your reputation and brings clients to you.',
    route: '/cleaner/no-presence',
    color: '#8b5cf6',
  },
  {
    emoji: '🔓',
    title: 'I work for a company or agency but want to go self-employed',
    body: 'Looking for a way to have reviews and get my own customers.',
    route: '/cleaner/going-solo',
    color: '#f59e0b',
  },
  {
    emoji: '🔄',
    title: 'I used to clean and want to get back into it',
    body: 'You have experience and want to build your diary quickly.',
    route: '/cleaner/returning',
    color: '#22c55e',
  },
  {
    emoji: '🤔',
    title: 'None of these quite fit',
    body: 'New to cleaning and want to know how to get started.',
    route: '/cleaner/new-to-cleaning',
    color: '#94a3b8',
    muted: true,
  },
]

function CoverageMap() {
  return (
    <div style={{ width: '100%', borderRadius: '16px', overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', background: '#e8f4f8', position: 'relative' }}>
      <TransformWrapper
        initialScale={1}
        minScale={1}
        maxScale={4}
        centerOnInit
      >
        {({ zoomIn, zoomOut, resetTransform }) => (
          <>
            <TransformComponent
              wrapperStyle={{ width: '100%', display: 'block' }}
              contentStyle={{ width: '100%' }}
            >
              <img
                src="/Vouchee_service_area.png"
                alt="Vouchee service area map"
                style={{ width: '100%', height: 'auto', display: 'block' }}
                draggable={false}
              />
            </TransformComponent>
            <div style={{
              position: 'absolute', bottom: '12px', right: '12px',
              display: 'flex', flexDirection: 'column', gap: '4px', zIndex: 10,
            }}>
              <button onClick={() => zoomIn()} style={{
                width: '32px', height: '32px', borderRadius: '8px',
                background: 'white', border: '1px solid #e2e8f0',
                fontSize: '18px', fontWeight: 700, color: '#0f172a',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)', fontFamily: 'DM Sans, sans-serif',
              }}>+</button>
              <button onClick={() => zoomOut()} style={{
                width: '32px', height: '32px', borderRadius: '8px',
                background: 'white', border: '1px solid #e2e8f0',
                fontSize: '18px', fontWeight: 700, color: '#0f172a',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)', fontFamily: 'DM Sans, sans-serif',
              }}>−</button>
              <button onClick={() => resetTransform()} style={{
                width: '32px', height: '32px', borderRadius: '8px',
                background: 'white', border: '1px solid #e2e8f0',
                fontSize: '11px', fontWeight: 700, color: '#64748b',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)', fontFamily: 'DM Sans, sans-serif',
              }}>↺</button>
            </div>
            <div style={{
              position: 'absolute', bottom: '12px', left: '12px',
              background: 'rgba(255,255,255,0.85)', borderRadius: '8px',
              padding: '5px 10px', fontSize: '11px', color: '#64748b',
              fontFamily: 'DM Sans, sans-serif', fontWeight: 600,
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            }}>
              Scroll to zoom · Drag to pan
            </div>
          </>
        )}
      </TransformWrapper>
    </div>
  )
}

export default function CleanerSelectionPage() {
  const router = useRouter()

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href="https://fonts.googleapis.com/css2?family=Lora:wght@400;600;700&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <style suppressHydrationWarning>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .sp { min-height: 100vh; font-family: 'DM Sans', sans-serif; background: linear-gradient(160deg, #f0f7ff 0%, #fefce8 50%, #f0fdf4 100%); display: flex; flex-direction: column; }

        .sp-header {
          padding: 48px 20px 32px; text-align: center; position: relative;
        }
        .sp-header-inner { max-width: 560px; margin: 0 auto; position: relative; z-index: 1; }

        .sp-logo { font-family: 'Lora', serif; font-size: 44px; font-weight: 700; color: #0f172a; margin-bottom: 4px; letter-spacing: -0.5px; line-height: 1; }
        .sp-logo span { color: #22c55e; }
        .sp-tagline { font-size: 14px; color: #64748b; margin-bottom: 22px; }
        .sp-header h1 { font-family: 'Lora', serif; font-size: clamp(19px, 3.8vw, 27px); font-weight: 700; color: #0f172a; line-height: 1.28; letter-spacing: -0.2px; }

        .sp-proof { background: rgba(255,255,255,0.6); backdrop-filter: blur(12px); border-top: 1px solid rgba(255,255,255,0.8); border-bottom: 1px solid rgba(255,255,255,0.8); padding: 16px 20px; margin-top: 24px; }
        .sp-proof-inner { max-width: 560px; margin: 0 auto; display: flex; justify-content: center; gap: 0; }
        .sp-proof-item { flex: 1; text-align: center; padding: 0 12px; border-right: 1px solid #e2e8f0; }
        .sp-proof-item:last-child { border-right: none; }
        .sp-proof-num { font-family: 'Lora', serif; font-size: 20px; font-weight: 700; color: #0f172a; line-height: 1; }
        .sp-proof-label { font-size: 10px; color: #94a3b8; margin-top: 3px; text-transform: uppercase; letter-spacing: 0.05em; }

        .sp-body { flex: 1; padding: 32px 20px 16px; }
        .sp-inner { max-width: 560px; margin: 0 auto; }
        .sp-prompt { font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.09em; text-align: center; margin-bottom: 14px; }

        .sp-options { display: flex; flex-direction: column; gap: 9px; }
        .sp-option {
          background: rgba(255,255,255,0.82); backdrop-filter: blur(16px); border-radius: 20px; padding: 17px 18px;
          border: 1.5px solid rgba(255,255,255,0.9); display: flex; align-items: center; gap: 14px;
          cursor: pointer; text-align: left; width: 100%;
          font-family: 'DM Sans', sans-serif;
          box-shadow: 0 2px 16px rgba(0,0,0,0.05);
          transition: border-color 0.15s, box-shadow 0.15s, transform 0.15s;
        }
        .sp-option:hover { box-shadow: 0 8px 32px rgba(0,0,0,0.1); transform: translateY(-2px); }
        .sp-emoji-wrap { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 22px; flex-shrink: 0; }
        .sp-option-title { font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 3px; line-height: 1.3; }
        .sp-option-body { font-size: 12px; color: #64748b; line-height: 1.5; }
        .sp-arrow { font-size: 17px; color: #cbd5e1; transition: color 0.15s, transform 0.15s; flex-shrink: 0; margin-left: auto; padding-left: 8px; }
        .sp-option:hover .sp-arrow { transform: translateX(3px); }

        .sp-map-section { padding: 28px 20px 40px; }
        .sp-map-inner { max-width: 560px; margin: 0 auto; }
        .sp-map-header { text-align: center; margin-bottom: 14px; }
        .sp-map-eyebrow { font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.09em; margin-bottom: 6px; }
        .sp-map-title { font-family: 'Lora', serif; font-size: 19px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
        .sp-map-sub { font-size: 13px; color: #64748b; line-height: 1.55; }
        .sp-map-wrap { border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 2px 12px rgba(0,0,0,0.06); }

        .sp-footer { text-align: center; padding: 8px 20px 36px; }
        .sp-footer p { font-size: 13px; color: #94a3b8; }
        .sp-footer a { color: #3b82f6; text-decoration: none; font-weight: 600; }

        @media (max-width: 480px) {
          .sp-logo { font-size: 36px; }
          .sp-proof-num { font-size: 17px; }
          .sp-option { padding: 14px; }
        }
      `}</style>

      <div className="sp" suppressHydrationWarning>
        <div className="sp-header">
          <div className="sp-header-inner">
            <div className="sp-logo">Vou<span>chee</span></div>
            <div className="sp-tagline">Find regular cleaning work in Horsham</div>
            <h1>Which best describes where you are right now?</h1>
          </div>
          <div className="sp-proof">
            <div className="sp-proof-inner">
              <div className="sp-proof-item">
                <div className="sp-proof-num">8</div>
                <div className="sp-proof-label">Cleaners registered</div>
              </div>
              <div className="sp-proof-item">
                <div className="sp-proof-num">Pre-launch</div>
                <div className="sp-proof-label">Early access open</div>
              </div>
              <div className="sp-proof-item">
                <div className="sp-proof-num">Horsham</div>
                <div className="sp-proof-label">Coverage area</div>
              </div>
            </div>
          </div>
        </div>

        <div className="sp-body">
          <div className="sp-inner">
            <div className="sp-prompt">Which position describes you best?</div>
            <div className="sp-options">
              {options.map((opt, i) => (
                <div key={i}>
                  {opt.muted && (
                    <div style={{ borderTop: '1px dashed #e2e8f0', margin: '4px 0 12px' }} />
                  )}
                  <button
                    className="sp-option"
                    onClick={() => router.push(opt.route)}
                    style={opt.muted ? { background: 'transparent', borderStyle: 'dashed', borderColor: '#cbd5e1', boxShadow: 'none' } : {}}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = opt.color
                      const arrow = e.currentTarget.querySelector('.sp-arrow') as HTMLElement
                      if (arrow) arrow.style.color = opt.color
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = opt.muted ? '#cbd5e1' : '#e2e8f0'
                      const arrow = e.currentTarget.querySelector('.sp-arrow') as HTMLElement
                      if (arrow) arrow.style.color = '#cbd5e1'
                    }}
                  >
                    <div className="sp-emoji-wrap" style={{ background: opt.muted ? '#f1f5f9' : `${opt.color}18` }}>
                      {opt.emoji}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div className="sp-option-title" style={opt.muted ? { color: '#64748b', fontWeight: 600 } : {}}>{opt.title}</div>
                      <div className="sp-option-body">{opt.body}</div>
                    </div>
                    <div className="sp-arrow">→</div>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="sp-map-section">
          <div className="sp-map-inner">
            <div className="sp-map-header">
              <div className="sp-map-eyebrow">Coverage area</div>
              <div className="sp-map-title">All work is local to you</div>
              <div className="sp-map-sub">Every listing shows which area it's in before you apply.</div>
            </div>
            <CoverageMap />
          </div>
        </div>

        <div className="sp-footer">
          <p>Already registered? <a href="/cleaner/login">Sign in here</a></p>
        </div>
      </div>
    </>
  )
}
