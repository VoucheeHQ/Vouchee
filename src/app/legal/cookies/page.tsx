import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Cookie Policy | Vouchee',
  description: 'How Vouchee uses cookies and similar technologies on vouchee.co.uk.',
}

export default function CookiePolicyPage() {
  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '64px 24px 96px', fontFamily: "'DM Sans', sans-serif" }}>

      <div style={{ marginBottom: '48px' }}>
        <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Legal</p>
        <h1 style={{ fontSize: 'clamp(28px, 5vw, 42px)', fontWeight: 800, color: '#0f172a', margin: '0 0 16px', letterSpacing: '-0.4px', lineHeight: 1.15 }}>
          Cookie Policy
        </h1>
        <p style={{ fontSize: '15px', color: '#64748b', margin: 0 }}>Last updated: 14 May 2026</p>
      </div>

      <div style={{ fontSize: '15px', color: '#374151', lineHeight: 1.8 }}>

        <Section title="What are cookies?">
          Cookies are small text files placed on your device when you visit a website. They help the site remember information about your visit — such as whether you're logged in — and can be used to improve how the site works.
        </Section>

        <Section title="How Vouchee uses cookies">
          Vouchee uses a small number of cookies that are strictly necessary for the platform to function. We do not use advertising cookies, tracking pixels, or third-party marketing cookies.
          <br /><br />
          The cookies we set are:
        </Section>

        <CookieTable cookies={[
          {
            name: 'sb-*-auth-token',
            purpose: 'Authentication',
            description: 'Set by Supabase to keep you logged in. Without this cookie, you would be signed out on every page load.',
            duration: 'Session / up to 7 days',
            type: 'Strictly necessary',
          },
          {
            name: 'vouchee_cookie_consent_v1',
            purpose: 'Cookie preferences',
            description: 'Stores your cookie consent choices so we do not show you the banner on every visit. Stored in your browser using localStorage rather than a traditional cookie.',
            duration: '12 months',
            type: 'Strictly necessary',
          },
          {
            name: 'vouchee_ref',
            purpose: 'Referral attribution',
            description: 'Set when you arrive via a friend\'s personal invite link (e.g. vouchee.co.uk/?ref=…). Remembers which friend referred you so we can apply the correct free-month credits to both accounts when you complete signup. Only contains an opaque referral token, not your name or any contact details. First-touch attribution — never overwritten.',
            duration: '30 days',
            type: 'Strictly necessary',
          },
          {
            name: 'ph_* (PostHog)',
            purpose: 'Analytics',
            description: 'Set by PostHog only if you have opted in to analytics cookies. Used to understand how the platform is used so we can improve it. Not used for advertising.',
            duration: '12 months',
            type: 'Analytics (opt-in)',
          },
        ]} />

        <Section title="Analytics">
          Vouchee uses PostHog for product analytics to understand how the platform is being used. PostHog is only loaded if you opt in via the cookie banner. No personal information is shared with PostHog beyond anonymised usage data, and we do not use Google Analytics, Facebook Pixel, or any other advertising or tracking technologies.
        </Section>

        <Section title="Amazon affiliate links">
          The <Link href="/cleaning-supplies" style={{ color: '#2563eb', fontWeight: 600 }}>Cleaning Supplies</Link> page contains affiliate links to Amazon. When you click through to Amazon, Amazon may set their own cookies on your device. These are governed by{' '}
          <a href="https://www.amazon.co.uk/gp/help/customer/display.html?nodeId=201890250" target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', fontWeight: 600 }}>Amazon's own cookie policy</a>.
          Vouchee does not control or have access to any cookies set by Amazon.
        </Section>

        <Section title="How to manage cookies">
          You can control and delete cookies through your browser settings. Please note that disabling strictly necessary cookies will prevent you from logging in or completing payments on Vouchee.
          <br /><br />
          Browser guides:
          <ul style={{ marginTop: '12px', paddingLeft: '20px', lineHeight: 2 }}>
            <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb' }}>Google Chrome</a></li>
            <li><a href="https://support.mozilla.org/en-US/kb/enhanced-tracking-protection-firefox-desktop" target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb' }}>Mozilla Firefox</a></li>
            <li><a href="https://support.apple.com/en-gb/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb' }}>Apple Safari</a></li>
            <li><a href="https://support.microsoft.com/en-us/windows/manage-cookies-in-microsoft-edge-168dab11-0753-043d-7c16-ede5947fc64d" target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb' }}>Microsoft Edge</a></li>
          </ul>
        </Section>

        <Section title="Changes to this policy">
          We may update this Cookie Policy from time to time. Any changes will be posted on this page with an updated date. Continued use of the platform after changes constitutes acceptance of the updated policy.
        </Section>

        <Section title="Contact us">
          If you have any questions about how we use cookies, please contact us at{' '}
          <a href="mailto:contact@vouchee.co.uk" style={{ color: '#2563eb', fontWeight: 600 }}>contact@vouchee.co.uk</a>.
        </Section>

        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '32px', marginTop: '48px', display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
          <Link href="/legal/privacy" style={{ color: '#2563eb', fontSize: '14px', fontWeight: 600 }}>Privacy Policy</Link>
          <Link href="/legal/terms/customer" style={{ color: '#2563eb', fontSize: '14px', fontWeight: 600 }}>Customer Terms</Link>
          <Link href="/legal/terms/cleaner" style={{ color: '#2563eb', fontSize: '14px', fontWeight: 600 }}>Cleaner Terms</Link>
        </div>

      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '40px' }}>
      <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', margin: '0 0 12px', letterSpacing: '-0.2px' }}>{title}</h2>
      <div style={{ color: '#374151', lineHeight: 1.8 }}>{children}</div>
    </div>
  )
}

function CookieTable({ cookies }: {
  cookies: { name: string; purpose: string; description: string; duration: string; type: string }[]
}) {
  return (
    <div style={{ marginBottom: '40px', overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
            {['Cookie', 'Purpose', 'Description', 'Duration', 'Type'].map(h => (
              <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cookies.map((c, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? 'white' : '#fafafa' }}>
              <td style={{ padding: '12px 14px', fontFamily: 'monospace', color: '#2563eb', fontWeight: 600, whiteSpace: 'nowrap' }}>{c.name}</td>
              <td style={{ padding: '12px 14px', fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap' }}>{c.purpose}</td>
              <td style={{ padding: '12px 14px', color: '#475569', lineHeight: 1.6 }}>{c.description}</td>
              <td style={{ padding: '12px 14px', color: '#64748b', whiteSpace: 'nowrap' }}>{c.duration}</td>
              <td style={{ padding: '12px 14px' }}>
                <span style={{ background: '#f0fdf4', color: '#16a34a', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '100px', whiteSpace: 'nowrap' }}>{c.type}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
