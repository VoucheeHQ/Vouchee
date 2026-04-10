interface OnboardingShellProps {
    children: React.ReactNode
  }
  
  export function OnboardingShell({ children }: OnboardingShellProps) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #f0f7ff 0%, #fefce8 50%, #f0fdf4 100%)',
        fontFamily: "'DM Sans', sans-serif",
        padding: '24px 16px 48px',
      }}>
        <div style={{ maxWidth: '560px', margin: '0 auto' }}>
          {children}
        </div>
      </div>
    )
  }
  