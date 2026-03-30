import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy Policy | Vouchee',
  description: 'How Vouchee collects, uses, and protects your personal data in accordance with UK GDPR and the Data Protection Act 2018.',
}

const LAST_UPDATED = '30 March 2026'
const CONTROLLER = 'Vouchee'
const CONTACT_EMAIL = 'legal@vouchee.co.uk'
const SITE_URL = 'https://www.vouchee.co.uk'

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-white">

      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-50 via-white to-green-50 border-b border-gray-100 py-16">
        <div className="container max-w-3xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-full px-4 py-1.5 text-xs font-semibold text-blue-700 mb-6">
            UK GDPR &amp; Data Protection Act 2018
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4" style={{ fontFamily: 'Lora, serif' }}>
            Privacy Policy
          </h1>
          <p className="text-gray-500 text-sm">
            Last updated: <span className="font-semibold text-gray-700">{LAST_UPDATED}</span>
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="container max-w-3xl mx-auto px-6 py-16">
        <div className="prose prose-gray max-w-none">

          {/* Preamble */}
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 mb-10 not-prose">
            <p className="text-sm text-blue-800 leading-relaxed">
              <strong>Plain-English summary:</strong> Vouchee is a cleaning marketplace connecting homeowners with local cleaners in Horsham. We collect only the information we need to operate that service — such as your name, contact details, and cleaning preferences. We never sell your data. We never share it with third parties for their own marketing. You have the right to access, correct, or delete your data at any time. This policy explains everything in full below.
            </p>
          </div>

          <Section id="1" title="1. Who we are">
            <p>
              <strong>{CONTROLLER}</strong> ("Vouchee", "we", "us", "our") operates the website at <a href={SITE_URL} className="text-blue-600 underline">{SITE_URL}</a> and the associated platform services (together, the "Platform").
            </p>
            <p>
              For the purposes of UK data protection law — including the UK General Data Protection Regulation ("UK GDPR") and the Data Protection Act 2018 ("DPA 2018") — Vouchee is the data controller for personal data processed through the Platform.
            </p>
            <p>
              If you have any questions about this policy or how we handle your data, please contact us at: <a href={`mailto:${CONTACT_EMAIL}`} className="text-blue-600 underline">{CONTACT_EMAIL}</a>
            </p>
          </Section>

          <Section id="2" title="2. What personal data we collect">
            <p>We collect personal data in the following categories:</p>

            <h4 className="font-semibold text-gray-800 mt-4 mb-2">2.1 Data you give us directly</h4>
            <ul>
              <li><strong>Account registration:</strong> Full name, email address, password (stored as a bcrypt hash — we never store your plain-text password), phone number, and role (customer or cleaner).</li>
              <li><strong>Cleaning requests (customers):</strong> Property details including number of bedrooms and bathrooms, preferred cleaning days and times, tasks required, hourly rate offered, and any additional notes you choose to provide.</li>
              <li><strong>Cleaner profile (cleaners):</strong> Years of experience, types of cleaning experience, whether you supply your own equipment, DBS check status, right to work confirmation, public liability insurance status, and the areas of Horsham you are willing to cover.</li>
              <li><strong>Application messages:</strong> Any message you write when applying for a job or communicating through our chat system.</li>
              <li><strong>Payment information:</strong> We do not store card details. Payment processing is handled by GoCardless, a PCI DSS-compliant third party. We receive only limited transaction references necessary to confirm payment status.</li>
            </ul>

            <h4 className="font-semibold text-gray-800 mt-4 mb-2">2.2 Data we collect automatically</h4>
            <ul>
              <li><strong>Usage data:</strong> Pages visited, features used, time and duration of visits, and referring URLs.</li>
              <li><strong>Device and technical data:</strong> IP address, browser type and version, operating system, and device identifiers.</li>
              <li><strong>Cookies and similar technologies:</strong> Session cookies required for authentication, and analytics cookies (if you consent). See Section 9 for full details.</li>
            </ul>

            <h4 className="font-semibold text-gray-800 mt-4 mb-2">2.3 Data we receive from third parties</h4>
            <ul>
              <li><strong>Authentication providers:</strong> If you choose to sign in via a third-party authentication provider (e.g. Google), we receive your name and email address as permitted by that provider.</li>
              <li><strong>Payment processors:</strong> GoCardless may share limited transaction status information with us.</li>
            </ul>

            <h4 className="font-semibold text-gray-800 mt-4 mb-2">2.4 Special category data</h4>
            <p>
              We do not intentionally collect special category data as defined by Article 9 UK GDPR (e.g. health, racial or ethnic origin, religious beliefs, or biometric data). If you voluntarily include such information in a free-text field, we will process it only to the extent necessary to provide the service. You should avoid including special category data unless strictly necessary.
            </p>
            <p>
              DBS (Disclosure and Barring Service) check status is collected from cleaners as a self-declared confirmation. We do not hold copies of DBS certificates.
            </p>
          </Section>

          <Section id="3" title="3. How and why we use your data">
            <p>We process your personal data on the following lawful bases:</p>

            <div className="overflow-x-auto my-4 not-prose">
              <table className="w-full text-sm border border-gray-200 rounded-xl overflow-hidden">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Purpose</th>
                    <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Lawful basis</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {[
                    ['Creating and managing your account', 'Contract (Article 6(1)(b) UK GDPR)'],
                    ['Matching customers with cleaners and facilitating applications', 'Contract (Article 6(1)(b) UK GDPR)'],
                    ['Processing payments via GoCardless', 'Contract (Article 6(1)(b) UK GDPR)'],
                    ['Sending transactional emails (application notifications, booking confirmations, account alerts)', 'Contract (Article 6(1)(b) UK GDPR)'],
                    ['Verifying cleaner eligibility (DBS status, right to work, insurance)', 'Legitimate interests (Article 6(1)(f) UK GDPR) — ensuring platform safety'],
                    ['Detecting and preventing fraud, abuse, or violations of our Terms', 'Legitimate interests (Article 6(1)(f) UK GDPR)'],
                    ['Monitoring keyword violations in chat for safeguarding purposes', 'Legitimate interests (Article 6(1)(f) UK GDPR)'],
                    ['Improving the Platform through analytics', 'Legitimate interests (Article 6(1)(f) UK GDPR)'],
                    ['Sending marketing and promotional emails', 'Consent (Article 6(1)(a) UK GDPR) — you can withdraw at any time'],
                    ['Complying with legal obligations (e.g. tax, court orders)', 'Legal obligation (Article 6(1)(c) UK GDPR)'],
                  ].map(([purpose, basis], i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-700">{purpose}</td>
                      <td className="px-4 py-3 text-gray-500">{basis}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p>
              Where we rely on <strong>legitimate interests</strong>, we have assessed that those interests are not overridden by your rights and freedoms. You may object to processing based on legitimate interests at any time — see Section 7.
            </p>
          </Section>

          <Section id="4" title="4. Who we share your data with">
            <p>We do not sell, rent, or trade your personal data. We share data only as described below:</p>
            <ul>
              <li>
                <strong>Other users of the Platform:</strong> When a cleaner applies for a job, their first name and last initial, profile information, application message, and rating are shared with the customer. A customer's full address is shared with a cleaner <em>only</em> after the customer has accepted that cleaner's application. Customers are not identified by name to cleaners — they are referred to by their area only (e.g. "Central Horsham") until acceptance.
              </li>
              <li>
                <strong>Service providers (data processors):</strong> We use the following third-party processors who act on our instructions and are bound by data processing agreements:
                <ul className="mt-2">
                  <li><strong>Supabase Inc.</strong> — database hosting and authentication (servers located in EU)</li>
                  <li><strong>Vercel Inc.</strong> — web hosting and deployment</li>
                  <li><strong>Resend Inc.</strong> — transactional email delivery</li>
                  <li><strong>GoCardless Ltd.</strong> — Direct Debit payment processing (FCA authorised)</li>
                  <li><strong>PostHog Inc.</strong> — product analytics (if you have consented to analytics cookies)</li>
                </ul>
              </li>
              <li>
                <strong>Legal and regulatory authorities:</strong> We may disclose personal data to law enforcement, regulators, or courts where required to do so by law, or where reasonably necessary to protect the rights, property, or safety of Vouchee, our users, or others.
              </li>
              <li>
                <strong>Business transfers:</strong> In the event of a merger, acquisition, or sale of all or part of our business, personal data may be transferred to the relevant third party. We will notify affected users in advance.
              </li>
            </ul>
          </Section>

          <Section id="5" title="5. International data transfers">
            <p>
              Some of our service providers are based outside the United Kingdom. Where we transfer personal data outside the UK, we ensure that appropriate safeguards are in place, such as:
            </p>
            <ul>
              <li>UK adequacy regulations (where the recipient country has been deemed adequate by the UK government)</li>
              <li>International Data Transfer Agreements (IDTAs) or UK Addenda to the EU Standard Contractual Clauses</li>
              <li>Other appropriate safeguards permitted under UK GDPR Article 46</li>
            </ul>
            <p>
              You may request details of the specific safeguards in place for any international transfers by contacting us at <a href={`mailto:${CONTACT_EMAIL}`} className="text-blue-600 underline">{CONTACT_EMAIL}</a>.
            </p>
          </Section>

          <Section id="6" title="6. How long we keep your data">
            <div className="overflow-x-auto my-4 not-prose">
              <table className="w-full text-sm border border-gray-200 rounded-xl overflow-hidden">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Data type</th>
                    <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Retention period</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {[
                    ['Active account data', 'For the duration of your account, plus 30 days following account deletion request'],
                    ['Completed transaction and booking records', '7 years (to comply with HMRC record-keeping requirements)'],
                    ['Chat messages and application messages', '2 years from the date of the conversation, or until account deletion'],
                    ['Keyword violation logs', '2 years from the date of the violation'],
                    ['Marketing consent records', 'Until you withdraw consent, plus 1 year'],
                    ['Server and access logs', '90 days'],
                    ['Cookie consent records', '1 year'],
                  ].map(([type, period], i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-700">{type}</td>
                      <td className="px-4 py-3 text-gray-500">{period}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p>
              After the applicable retention period, data is securely deleted or anonymised. Where we are legally required to retain data for longer, we will do so but will restrict its processing.
            </p>
          </Section>

          <Section id="7" title="7. Your rights">
            <p>Under UK GDPR, you have the following rights in respect of your personal data:</p>
            <ul>
              <li><strong>Right of access (Article 15):</strong> You may request a copy of all personal data we hold about you (a "Subject Access Request").</li>
              <li><strong>Right to rectification (Article 16):</strong> You may ask us to correct inaccurate or incomplete personal data.</li>
              <li><strong>Right to erasure (Article 17):</strong> You may ask us to delete your personal data in certain circumstances — for example, if the data is no longer necessary for the purpose it was collected, or you withdraw consent.</li>
              <li><strong>Right to restrict processing (Article 18):</strong> You may ask us to suspend processing of your data while a dispute is resolved.</li>
              <li><strong>Right to data portability (Article 20):</strong> Where processing is based on contract or consent and is carried out by automated means, you may request your data in a structured, commonly used, machine-readable format.</li>
              <li><strong>Right to object (Article 21):</strong> You may object to processing based on legitimate interests or for direct marketing purposes at any time.</li>
              <li><strong>Rights related to automated decision-making (Article 22):</strong> We do not make solely automated decisions with legal or similarly significant effects about you.</li>
              <li><strong>Right to withdraw consent:</strong> Where processing is based on your consent, you may withdraw that consent at any time without affecting the lawfulness of processing carried out prior to withdrawal.</li>
            </ul>
            <p>
              To exercise any of these rights, please contact us at <a href={`mailto:${CONTACT_EMAIL}`} className="text-blue-600 underline">{CONTACT_EMAIL}</a>. We will respond within one calendar month. We may need to verify your identity before fulfilling your request.
            </p>
            <p>
              If you are not satisfied with our response, you have the right to lodge a complaint with the <strong>Information Commissioner's Office (ICO)</strong> at <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">ico.org.uk</a> or by calling 0303 123 1113.
            </p>
          </Section>

          <Section id="8" title="8. Security">
            <p>We implement appropriate technical and organisational measures to protect your personal data against unauthorised access, loss, destruction, or alteration. These measures include:</p>
            <ul>
              <li>Encryption of data in transit using TLS 1.2 or higher</li>
              <li>Encrypted storage of passwords using bcrypt hashing</li>
              <li>Role-based access controls limiting which staff can access personal data</li>
              <li>Row-level security on our database to ensure users can only access their own data</li>
              <li>Regular review of security practices and third-party processor agreements</li>
            </ul>
            <p>
              No method of transmission over the internet or electronic storage is completely secure. While we take reasonable precautions, we cannot guarantee absolute security. If we become aware of a data breach that is likely to result in a risk to your rights and freedoms, we will notify you and the ICO as required by law.
            </p>
          </Section>

          <Section id="9" title="9. Cookies">
            <p>We use the following categories of cookies:</p>
            <ul>
              <li>
                <strong>Strictly necessary cookies:</strong> Required for the Platform to function — for example, session authentication cookies that keep you logged in. These cannot be disabled.
              </li>
              <li>
                <strong>Analytics cookies:</strong> Used to understand how users interact with the Platform (e.g. PostHog). These are only set with your consent.
              </li>
            </ul>
            <p>
              You can manage your cookie preferences via the cookie banner on your first visit, or by adjusting your browser settings. Note that disabling certain cookies may affect Platform functionality.
            </p>
          </Section>

          <Section id="10" title="10. Children">
            <p>
              The Platform is not directed at children under the age of 18. We do not knowingly collect personal data from anyone under 18. If you believe a child has provided us with personal data without appropriate parental consent, please contact us at <a href={`mailto:${CONTACT_EMAIL}`} className="text-blue-600 underline">{CONTACT_EMAIL}</a> and we will delete it promptly.
            </p>
          </Section>

          <Section id="11" title="11. Third-party links">
            <p>
              The Platform may contain links to third-party websites. We are not responsible for the privacy practices of those sites. We encourage you to read their privacy policies before providing any personal data to them.
            </p>
          </Section>

          <Section id="12" title="12. Changes to this policy">
            <p>
              We may update this Privacy Policy from time to time to reflect changes in our practices or legal requirements. We will notify you of material changes by email (to the address associated with your account) and/or by displaying a prominent notice on the Platform before the change takes effect. The "Last updated" date at the top of this page will always reflect the most recent version.
            </p>
            <p>
              Your continued use of the Platform after any update constitutes your acknowledgement of the revised policy. If you do not agree with the revised policy, you should stop using the Platform and may request deletion of your account.
            </p>
          </Section>

          <Section id="13" title="13. Contact us">
            <p>
              For any questions, concerns, or requests relating to this Privacy Policy or your personal data, please contact:
            </p>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 mt-3 not-prose">
              <p className="font-semibold text-gray-800 mb-1">Vouchee — Data Controller</p>
              <p className="text-gray-600 text-sm">Email: <a href={`mailto:${CONTACT_EMAIL}`} className="text-blue-600 underline">{CONTACT_EMAIL}</a></p>
              <p className="text-gray-600 text-sm mt-1">Website: <a href={SITE_URL} className="text-blue-600 underline">{SITE_URL}</a></p>
            </div>
          </Section>

        </div>

        {/* Related links */}
        <div className="mt-16 pt-8 border-t border-gray-100 flex flex-wrap gap-4 text-sm">
          <Link href="/legal/terms" className="text-blue-600 hover:underline font-medium">Terms of Service →</Link>
          <Link href="/legal/cookies" className="text-blue-600 hover:underline font-medium">Cookie Policy →</Link>
          <Link href="/" className="text-gray-400 hover:text-gray-600">← Back to home</Link>
        </div>
      </section>
    </main>
  )
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={`section-${id}`} className="mb-10 scroll-mt-8">
      <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100" style={{ fontFamily: 'Lora, serif' }}>
        {title}
      </h2>
      <div className="text-gray-600 leading-relaxed space-y-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-2 [&_li]:text-gray-600 [&_p]:text-gray-600 [&_strong]:text-gray-800 [&_a]:text-blue-600 [&_a]:underline">
        {children}
      </div>
    </section>
  )
}
