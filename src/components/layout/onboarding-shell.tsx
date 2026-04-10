'use client'

// ─── Design tokens (single source of truth) ───────────────────────────────────
const SHELL = {
  maxWidth:     '560px',
  padding:      '24px 16px 48px',
  background:   'linear-gradient(160deg, #f0f7ff 0%, #fefce8 50%, #f0fdf4 100%)',
  fontFamily:   "'DM Sans', sans-serif",
  logoUrl:      'https://www.vouchee.co.uk/full-logo-black.png',
  logoWidth:    '160px',
  logoMB:       '28px',
  progressMB:   '32px',
  titleMB:      '28px',
  titleFont:    "'Sora', sans-serif",
  titleSize:    '28px',
  titleWeight:  800,
  titleColor:   '#0f172a',
  subtitleSize: '15px',
  subtitleColor:'#64748b',
}

interface OnboardingShellProps {
  children:   React.ReactNode
  step:       number
  title:      string
  subtitle?:  string
  onBack?:    () => void
  backLabel?: string
}

export function OnboardingShell({
  children,
  step,
  title,
  subtitle,
  onBack,
  backLabel = '← Back',
}: OnboardingShellProps) {

  const isAlmostThere = step >= 4
  const stepLabel     = isAlmostThere ? 'Almost there' : `Step ${step} of 4`
  const progressPct   = isAlmostThere ? 100 : (step / 4) * 100

  return (
    <div style={{
      minHeight:  '100vh',
      background: SHELL.background,
      fontFamily: SHELL.fontFamily,
      padding:    SHELL.padding,
    }}>
      <div style={{ maxWidth: SHELL.maxWidth, margin: '0 auto' }}>

        {/* ── Logo ── */}
        <div style={{ textAlign: 'center', marginBottom: SHELL.logoMB }}>
          <img
            src={SHELL.logoUrl}
            alt="Vouchee"
            style={{ width: SHELL.logoWidth, height: 'auto', display: 'inline-block' }}
          />
        </div>

        {/* ── Progress bar ── */}
        <div style={{ marginBottom: SHELL.progressMB }}>
          <div style={{
            display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', marginBottom: '8px',
          }}>
            <div style={{
              fontSize: '13px', fontWeight: 600, color: '#3b82f6',
              letterSpacing: '0.05em', textTransform: 'uppercase' as const,
            }}>
              {stepLabel}
            </div>
            {onBack && (
              <button
                onClick={onBack}
                style={{
                  fontSize: '13px', fontWeight: 600, color: '#94a3b8',
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontFamily: SHELL.fontFamily,
                }}
              >
                {backLabel}
              </button>
            )}
          </div>
          <div style={{ height: '4px', background: '#e2e8f0', borderRadius: '100px', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${progressPct}%`,
              background: 'linear-gradient(90deg, #3b82f6 0%, #facc15 50%, #22c55e 100%)',
              borderRadius: '100px',
            }} />
          </div>
        </div>

        {/* ── Title + subtitle ── */}
        <div style={{ marginBottom: SHELL.titleMB, textAlign: 'center' }}>
          <h1 style={{
            fontSize:   SHELL.titleSize,
            fontWeight: SHELL.titleWeight,
            color:      SHELL.titleColor,
            margin:     subtitle ? '0 0 8px' : '0',
            lineHeight: 1.2,
            fontFamily: SHELL.titleFont,
          }}>
            {title}
          </h1>
          {subtitle && (
            <p style={{
              fontSize:   SHELL.subtitleSize,
              color:      SHELL.subtitleColor,
              lineHeight: 1.6,
              margin:     0,
            }}>
              {subtitle}
            </p>
          )}
        </div>

        {/* ── Page content ── */}
        {children}

      </div>
    </div>
  )
}
