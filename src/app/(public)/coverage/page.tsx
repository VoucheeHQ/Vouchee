import Link from 'next/link'

export const metadata = {
  title: 'Coverage Area | Vouchee',
  description: 'Vouchee connects vetted local cleaners with homeowners across Horsham and surrounding areas including Broadbridge Heath, Southwater, Mannings Heath and more.',
}

const zones = [
  'Central Horsham',
  'Roffey',
  'Broadbridge Heath',
  'Southwater',
  'Kilnwood Vale',
  'Mannings Heath',
  "Christ's Hospital",
  'Warnham',
  'North Horsham',
  'South West Horsham',
]

export default function CoveragePage() {
  return (
    <>
      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)', borderBottom: '1px solid #e2e8f0', padding: '64px 24px 56px', textAlign: 'center', fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '100px', padding: '6px 16px', fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '24px' }}>
            <span>📍</span> Horsham & surrounding areas
          </div>
          <h1 style={{ fontSize: 'clamp(28px, 5vw, 48px)', fontWeight: 800, color: '#0f172a', margin: '0 0 16px', letterSpacing: '-0.4px', lineHeight: 1.15 }}>
            Where we operate
          </h1>
          <p style={{ fontSize: '17px', color: '#64748b', margin: '0', lineHeight: 1.7, maxWidth: '480px', marginLeft: 'auto', marginRight: 'auto' }}>
            Vouchee was made in Horsham, for Horsham — and we're growing into the communities around it.
          </p>
        </div>
      </div>

      {/* Map + zones */}
      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '64px 24px 80px', fontFamily: "'DM Sans', sans-serif" }}>

        {/* Map */}
        <div style={{ borderRadius: '20px', overflow: 'hidden', border: '1.5px solid #e2e8f0', boxShadow: '0 4px 24px rgba(0,0,0,0.07)', marginBottom: '48px', background: '#e8f4f8' }}>
          <img
            src="/Vouchee_service_area.png"
            alt="Vouchee service area map covering Horsham and surrounding areas"
            style={{ width: '100%', height: 'auto', display: 'block' }}
          />
        </div>

        {/* Zones list */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px', letterSpacing: '-0.2px' }}>Areas we cover</h2>
          <p style={{ fontSize: '15px', color: '#64748b', margin: 0 }}>Every listing shows which zone it's in so cleaners always know where the work is.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px', marginBottom: '64px' }}>
          {zones.map((zone) => (
            <div key={zone} style={{ background: 'white', border: '1.5px solid #e2e8f0', borderRadius: '12px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2563eb', flexShrink: 0 }} />
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>{zone}</span>
            </div>
          ))}
        </div>

        {/* Not in your area notice */}
        <div style={{ background: '#fefce8', border: '1.5px solid #fde68a', borderRadius: '16px', padding: '24px 28px', marginBottom: '48px', display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '24px', flexShrink: 0 }}>📣</span>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#78350f', marginBottom: '4px' }}>Not in your area yet?</div>
            <div style={{ fontSize: '14px', color: '#92400e', lineHeight: 1.65 }}>
              We're expanding. If you're just outside our current coverage, drop us a message at{' '}
              <a href="mailto:contact@vouchee.co.uk" style={{ color: '#b45309', fontWeight: 600 }}>contact@vouchee.co.uk</a>{' '}
              and we'll let you know when we reach you.
            </div>
          </div>
        </div>

        {/* CTAs */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={{ background: 'white', border: '1.5px solid #e2e8f0', borderRadius: '20px', padding: '32px 28px', textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>🏠</div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>Need a cleaner?</h3>
            <p style={{ fontSize: '14px', color: '#64748b', lineHeight: 1.6, margin: '0 0 20px' }}>Post a request in 2 minutes and let vetted cleaners apply to you.</p>
            <Link href="/request/property" style={{ display: 'inline-block', background: '#2563eb', color: 'white', borderRadius: '10px', padding: '12px 24px', fontSize: '14px', fontWeight: 700, textDecoration: 'none' }}>
              Post a request →
            </Link>
          </div>
          <div style={{ background: 'white', border: '1.5px solid #e2e8f0', borderRadius: '20px', padding: '32px 28px', textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>🧹</div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>Are you a cleaner?</h3>
            <p style={{ fontSize: '14px', color: '#64748b', lineHeight: 1.6, margin: '0 0 20px' }}>Apply to join Vouchee and find regular local work on your terms.</p>
            <Link href="/cleaner" style={{ display: 'inline-block', background: '#0f172a', color: 'white', borderRadius: '10px', padding: '12px 24px', fontSize: '14px', fontWeight: 700, textDecoration: 'none' }}>
              Apply as a cleaner →
            </Link>
          </div>
        </div>

      </div>
    </>
  )
}
