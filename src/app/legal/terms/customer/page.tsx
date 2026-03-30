import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Customer Terms of Service | Vouchee',
  description: 'The terms and conditions governing Customers\' use of the Vouchee platform, including subscription terms, vetting process, and platform rules.',
}

const LAST_UPDATED = 'March 2026'
const CONTACT_EMAIL = 'legal@vouchee.co.uk'
const SITE_URL = 'https://www.vouchee.co.uk'

export default function CustomerTermsPage() {
  return (
    <main className="min-h-screen bg-white">

      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-50 via-white to-green-50 border-b border-gray-100 py-16">
        <div className="container max-w-3xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-full px-4 py-1.5 text-xs font-semibold text-blue-700 mb-4">
            For Customers · Governed by the laws of England and Wales
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4" style={{ fontFamily: 'Lora, serif' }}>
            Customer Terms of Service
          </h1>
          <p className="text-gray-500 text-sm mb-4">
            Last updated: <span className="font-semibold text-gray-700">{LAST_UPDATED}</span> · Version 7.0
          </p>
          <p className="text-sm text-gray-500 max-w-xl mx-auto">
            These terms apply specifically to homeowners using Vouchee to find a cleaner. If you are a cleaner looking for work, please read the{' '}
            <Link href="/legal/terms/cleaner" className="text-blue-600 underline">Cleaner Terms of Service</Link>.
          </p>
        </div>
      </section>

      <section className="container max-w-3xl mx-auto px-6 py-16">
        <div className="prose prose-gray max-w-none">

          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-10 not-prose">
            <p className="text-sm text-amber-800 leading-relaxed">
              <strong>Please read these terms carefully.</strong> By creating an account and using Vouchee, you confirm that you have read, understood, and agree to be bound by these Terms. If you do not agree, you must not use the platform. These terms constitute a legally binding agreement between you and Vouchee.
            </p>
          </div>

          <Section id="1" title="1. Who We Are and What This Is">
            <p>Vouchee is an online marketplace that connects homeowners ("Customers") with self-employed domestic cleaners ("Cleaners") in the Horsham area. We provide the platform, the tools, and the framework — but we are not a cleaning company, and we do not employ any of the Cleaners listed on our platform.</p>
            <p>By creating an account and using Vouchee, you confirm that you have read, understood, and agree to these Terms. If you do not agree, please do not use the platform.</p>
            <p>You must be 18 years of age or older to create an account on Vouchee. By registering, you confirm that you meet this requirement. Vouchee accepts no liability for any use of the platform by a person who has misrepresented their age.</p>
          </Section>

          <Section id="2" title="2. The Nature of Our Platform">
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 not-prose mb-4">
              <p className="text-sm font-bold text-blue-800">Vouchee is a marketplace, not an employer or service provider.</p>
            </div>
            <ul>
              <li>Cleaners on Vouchee are self-employed individuals, not employees, workers, or agents of Vouchee.</li>
              <li>Vouchee does not supervise, direct, or control the manner in which Cleaners perform their services.</li>
              <li>The cleaning contract is formed directly between the Customer and the Cleaner once a booking is confirmed.</li>
              <li>Vouchee facilitates the introduction and provides tools for communication, scheduling, and payment — but we are not a party to the cleaning contract itself.</li>
              <li>The quality, safety, and outcome of any clean is the responsibility of the Cleaner you have chosen.</li>
            </ul>
            <p>While Vouchee operates platform tools including payment processing, in-platform messaging, and credential verification, the operation of these tools does not make Vouchee a party to the cleaning arrangement, nor does it create any employment, worker, or agency relationship between Vouchee and any Cleaner.</p>
          </Section>

          <Section id="3" title="3. Our Vetting Process">
            <p>We take the quality and safety of Cleaners on our platform seriously. Before any Cleaner is approved to list on Vouchee, they must:</p>
            <ul>
              <li>Complete an interview with a member of the Vouchee team</li>
              <li>Provide a valid DBS (Disclosure and Barring Service) certificate</li>
              <li>Provide valid Public Liability Insurance with a minimum coverage of £1,000,000</li>
              <li>Provide proof of their right to work in the United Kingdom</li>
            </ul>
            <p>We actively monitor these accreditations and notify Cleaners when any document is approaching its expiry date. If any accreditation lapses or cannot be verified, the Cleaner will be temporarily suspended from the platform until the issue is resolved.</p>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 not-prose mt-4">
              <p className="text-sm font-semibold text-gray-700 mb-2">Important limitations of our vetting process:</p>
              <ul className="text-sm text-gray-600 list-disc pl-5 space-y-1">
                <li>A clear DBS certificate confirms that a Cleaner had no recorded criminal history at the time of the check. It is not a guarantee of future conduct, nor does it account for offences committed after the check date.</li>
                <li>While we take reasonable steps to verify documents submitted by Cleaners, Vouchee cannot guarantee the authenticity of documents and is not liable for losses arising from fraudulent or inaccurate documentation that was not reasonably detectable by us at the time of verification.</li>
                <li>Vouchee's vetting process represents reasonable due diligence appropriate to a marketplace platform. It does not constitute a guarantee of a Cleaner's character, conduct, or capability.</li>
              </ul>
            </div>
            <p>Customers with specific safeguarding requirements — for example, those with children or vulnerable adults regularly present in the home — should notify Vouchee prior to booking. Vouchee will endeavour to accommodate such requests but cannot guarantee enhanced checks beyond our standard process unless specifically agreed in writing.</p>
          </Section>

          <Section id="4" title="4. Customer Responsibilities">
            <p>As a Customer, you agree to:</p>
            <ul>
              <li>Provide accurate information about your property, requirements, and preferred schedule when publishing a request</li>
              <li>Treat Cleaners with respect and professionalism at all times</li>
              <li>Ensure safe and reasonable access to your property at the agreed time</li>
              <li>Inform your Cleaner in advance of any allergies, sensitivities, health conditions, specialist surfaces, valuable items, or fragile objects requiring special care or attention</li>
              <li>Ensure that any cleaning equipment you provide for use by the Cleaner is in a safe and serviceable condition. Where a Customer provides equipment that causes injury or damage due to a defect, the Customer accepts responsibility for that equipment</li>
              <li>Maintain your property in a condition that is reasonably safe for the Cleaner to work in, in accordance with your obligations as an occupier under the Occupiers' Liability Act 1957</li>
              <li>Pay for all sessions as agreed through the Vouchee platform</li>
              <li>Not attempt to arrange, continue, or pay for cleaning services outside of the Vouchee platform with any Cleaner you have been introduced to through us</li>
            </ul>
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 not-prose mt-4">
              <p className="text-sm font-bold text-green-800 mb-1">Your address is protected</p>
              <p className="text-sm text-green-700">Your full property address is treated as private information. It is not visible to Cleaners who browse or apply for your listing. Your full address is disclosed to a Cleaner only after you have formally accepted their application through the platform, via a confirmation email from Vouchee. No address data is shared at any earlier stage of the process.</p>
            </div>
          </Section>

          <Section id="5" title="5. Cleaner Responsibilities">
            <p>As a Cleaner, you agree to:</p>
            <ul>
              <li>Provide accurate and truthful information in your profile and application at all times</li>
              <li>Maintain all required accreditations (DBS, Public Liability Insurance, Right to Work) for the duration of your time on the platform, and notify Vouchee promptly of any changes or lapses</li>
              <li>Carry out cleaning sessions to a reasonable professional standard using appropriate care and skill</li>
              <li>Communicate promptly and professionally with Customers through the Vouchee platform</li>
              <li>Comply with all applicable health and safety obligations while working at a Customer's property</li>
              <li>Fulfil their own obligations as a self-employed individual with respect to tax, National Insurance, and any other statutory requirements</li>
              <li>Not attempt to arrange, continue, or accept payment for cleaning services outside of the Vouchee platform with any Customer they have been introduced to through us</li>
            </ul>
            <p>Where a serious complaint is received from a Customer regarding a Cleaner's conduct, safety, or behaviour, Vouchee reserves the right to suspend that Cleaner's account immediately and without prior notice pending investigation.</p>
          </Section>

          <Section id="6" title="6. Platform Integrity — Off-Platform Arrangements">
            <p>This clause exists to protect the sustainability of the platform that both Customers and Cleaners rely on, and to ensure that the protections built into the platform — including vetting, insurance requirements, and monitored communication — are not circumvented.</p>

            <h4 className="font-semibold text-gray-800 mt-4 mb-2">6.1 Why This Matters</h4>
            <p>When a Customer and Cleaner arrange work outside of Vouchee, both parties lose the protections the platform provides: credential monitoring ceases, payments are unprotected, and dispute resolution is unavailable. The platform protection fee described below is not a penalty — it is a genuine pre-estimate of the loss suffered by Vouchee when an introduction is taken off-platform, including lost subscription revenue, marketing and customer acquisition costs, platform development and operational costs, and loss of brand value and network integrity.</p>

            <h4 className="font-semibold text-gray-800 mt-4 mb-2">6.2 Customers</h4>
            <p>If a Customer is found to have arranged, continued, or paid for cleaning services outside of the Vouchee platform with a Cleaner they were introduced to through Vouchee, the following applies where both of these conditions are met:</p>
            <ul>
              <li>The introduction took place within the preceding <strong>24 months</strong>, and</li>
              <li>The Cleaner <strong>remains a registered active member</strong> of the Vouchee platform at the time the off-platform arrangement is made</li>
            </ul>
            <p>Where both conditions are met:</p>
            <ul>
              <li>The Customer will receive a formal written warning on first occurrence</li>
              <li>A platform protection fee of <strong>£300</strong> will be invoiced, representing a genuine and reasonable pre-estimate of the loss likely to be suffered by Vouchee</li>
              <li>The Customer's account may be suspended or permanently closed at Vouchee's discretion</li>
              <li>Vouchee reserves the right to pursue recovery of this fee through appropriate legal channels</li>
            </ul>
            <p>Customers who choose to arrange services outside of Vouchee do so entirely at their own risk. Vouchee shall have no liability in respect of any loss, damage, theft, injury, or other harm arising from any arrangement made outside of the platform.</p>

            <h4 className="font-semibold text-gray-800 mt-4 mb-2">6.3 Cleaners</h4>
            <p>If a Cleaner is found to have solicited, arranged, or accepted work from a Customer they were introduced to through Vouchee, outside of the Vouchee platform, a progressive consequence structure applies — full details are set out in the <Link href="/legal/terms/cleaner" className="text-blue-600 underline">Cleaner Terms of Service</Link>, including the circumstances that may lead to immediate permanent removal.</p>
          </Section>

          <Section id="7" title="7. In-Platform Messaging and Monitoring">
            <p>To help keep both Customers and Cleaners safe, and to protect against fraud and off-platform arrangements, Vouchee operates automated safety systems on in-platform messages.</p>
            <p>These systems exist to:</p>
            <ul>
              <li>Protect both parties from fraud and unsafe arrangements</li>
              <li>Flag potential attempts to move conversations off the platform</li>
              <li>Support the investigation of complaints or disputes where needed</li>
            </ul>
            <p>Where a message is flagged by our automated systems — for example, because it contains a phone number, email address, social media handle, or reference to direct payment — you will be shown a warning before the message is sent. Messages that trigger a keyword flag are logged server-side in a secure violations record. In some cases, Vouchee staff may review flagged conversations to investigate a complaint, safeguard a user, or take action under Clause 6.</p>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 not-prose my-4">
              <p className="text-sm font-semibold text-amber-800">Your full property address is never transmitted through the chat system.</p>
              <p className="text-sm text-amber-700 mt-1">Address disclosure occurs only via the formal acceptance email described in Clause 4. Any message containing a full or partial address will be flagged as a safety concern.</p>
            </div>
            <p>This monitoring is conducted on the basis of legitimate interest and in accordance with our <Link href="/legal/privacy" className="text-blue-600 underline">Privacy Policy</Link>. By using our messaging system, you consent to this monitoring.</p>
          </Section>

          <Section id="8" title="8. Property Damage">
            <p>Cleaners on Vouchee are required to hold valid Public Liability Insurance. In the event of damage to your property caused by a Cleaner during a session:</p>
            <ul>
              <li>Claims for property damage should be directed in the first instance to the Cleaner's Public Liability Insurer</li>
              <li>Vouchee will provide reasonable assistance in facilitating this process, including sharing relevant insurance details held on file</li>
              <li>Vouchee is not a party to the cleaning contract and is not liable for property damage caused by a Cleaner</li>
            </ul>
            <p>Customers accept that minor, incidental damage may occasionally occur during the course of a domestic clean. Customers are encouraged to ensure their home contents insurance policy covers domestic workers and cleaning-related incidents.</p>
            <p>Customers are responsible for informing their Cleaner in advance of any surfaces, materials, or items requiring specialist care. Where damage arises from a failure to disclose such information, responsibility rests with the Customer.</p>
          </Section>

          <Section id="9" title="9. Cleaner Non-Attendance">
            <p>Vouchee is not liable for any loss, cost, or damage arising from a Cleaner's failure to attend a scheduled session, including but not limited to lost earnings, annual leave taken in anticipation of a session, or any other consequential financial loss.</p>
            <p>Where a Cleaner is unable to attend, Customers are encouraged to use the Vouchee cover clean feature to arrange a replacement session at short notice. The cover clean feature is planned for availability at launch. Vouchee will make reasonable efforts to facilitate cover in such circumstances but cannot guarantee availability.</p>
          </Section>

          <Section id="10" title="10. Force Majeure">
            <p>Neither Vouchee nor any Cleaner shall be considered in breach of their obligations where non-performance is caused by circumstances genuinely outside their reasonable control, including but not limited to illness, severe weather, transport disruption, or other events beyond reasonable anticipation. In such cases, Customers are encouraged to use the cover clean feature (planned for launch) to arrange an alternative session.</p>
          </Section>

          <Section id="11" title="11. Subscriptions and Payments">
            <h4 className="font-semibold text-gray-800 mt-2 mb-2">11.1 Customer Subscriptions</h4>
            <p>Customers pay a monthly platform fee based on their chosen subscription tier. Payments are processed via <strong>GoCardless</strong>, an FCA-authorised payment service provider. By confirming your start date, you authorise Vouchee to collect payments via Direct Debit through GoCardless in accordance with the Direct Debit Guarantee.</p>
            <p>Your Direct Debit will not begin until you have selected a Cleaner and confirmed your first clean start date. Your first payment will be calculated on a pro-rata basis — you will only be charged for the number of days remaining in your first billing period from your confirmed start date.</p>

            <h4 className="font-semibold text-gray-800 mt-4 mb-2">11.2 Cancellation</h4>
            <p>Subscriptions operate on a 30-day rolling basis. To cancel, you must give 30 days' written notice through the platform. You will continue to have full access to the platform during this notice period.</p>
            <p>Where a Cleaner becomes unavailable during an active notice period through no fault of the Customer, Vouchee may, at its discretion, suspend subscription charges until a suitable replacement Cleaner has been selected.</p>
            <p>Where a Customer does not wish to find a replacement Cleaner, they may request a subscription pause through the platform. The 30-day notice period will still apply, but no charges will be collected during that period. At the end of the notice period the subscription will be cancelled.</p>
            <p>No refunds will be issued for partial months within a notice period where a Cleaner remains available.</p>

            <h4 className="font-semibold text-gray-800 mt-4 mb-2">11.3 Cleaner Hourly Rate</h4>
            <p>The hourly rate paid to your Cleaner is set by you during the request process and agreed between you and the Cleaner. This is paid through the platform and is separate from the platform subscription fee.</p>
          </Section>

          <Section id="12" title="12. Credits and Rewards (Cleaners)">
            <p>Cleaners on Vouchee participate in a rewards programme. From a Customer's perspective:</p>
            <ul>
              <li>Credits are what Cleaners use to apply for your job listing</li>
              <li>Each application a Cleaner submits costs them 1 credit, which encourages genuine and considered applications</li>
              <li>Cleaners at Gold tier (100+ verified 4-star reviews) apply at no credit cost, reflecting their proven track record on the platform</li>
              <li>Credits have no cash value and are not visible to or managed by Customers</li>
            </ul>
            <p>Vouchee reserves the right to modify the rewards programme at any time with reasonable notice to Cleaners. Changes to the Cleaner rewards programme do not affect Customer subscriptions or pricing.</p>
          </Section>

          <Section id="13" title="13. Our Commitment to Customers">
            <p>If you are unhappy with your chosen Cleaner, you may re-publish your request at any time. Vouchee may, at its discretion, offer a discounted first session with a replacement Cleaner to help you find the right fit.</p>
            <p>This commitment is subject to:</p>
            <ul>
              <li>The original Cleaner having completed at least one session</li>
              <li>The concern being raised within 7 days of the session in question</li>
              <li>The issue being reported through the Vouchee platform</li>
            </ul>
            <p>This is a discretionary goodwill offering and does not constitute a contractual guarantee or warranty. It does not affect your statutory rights.</p>
          </Section>

          <Section id="14" title="14. Limitation of Liability">
            <p>To the maximum extent permitted by applicable law:</p>
            <ul>
              <li>Vouchee is not liable for any loss, damage, theft, injury, or other harm caused by a Cleaner during or in connection with a cleaning session</li>
              <li>Vouchee is not liable for any failure by a Cleaner to attend a scheduled session</li>
              <li>Vouchee is not liable for the quality or outcome of any cleaning service</li>
              <li>Vouchee is not liable for losses arising from a Customer's failure to disclose relevant information to their Cleaner as set out in Clause 4</li>
              <li>Vouchee is not liable for criminal acts, theft, or intentional harm committed by a Cleaner. Customers are encouraged to ensure their home contents insurance covers theft by domestic workers.</li>
              <li>Vouchee's total liability to you in connection with the platform shall not exceed the total subscription fees paid by you in the 3 months prior to the event giving rise to the claim</li>
            </ul>
            <p>Nothing in this clause excludes or limits our liability for:</p>
            <ul>
              <li>Death or personal injury caused by our negligence</li>
              <li>Fraud or fraudulent misrepresentation</li>
              <li>Any liability that cannot be lawfully excluded or limited under the Consumer Rights Act 2015, the Unfair Contract Terms Act 1977, or any other applicable legislation</li>
              <li>Any failure by Vouchee to exercise reasonable care in operating the platform</li>
            </ul>
          </Section>

          <Section id="15" title="15. Reviews and User-Generated Content">
            <p>Vouchee hosts reviews and ratings submitted by Customers about Cleaners. By submitting a review, you grant Vouchee a non-exclusive, royalty-free licence to display, reproduce, and use that content on the platform and in our marketing materials.</p>
            <p>You agree that any review you submit is truthful, based on genuine experience, and does not contain defamatory, discriminatory, or misleading content.</p>
            <p>Vouchee reserves the right to remove any review that we reasonably believe to be fraudulent, fabricated, defamatory, or in breach of these Terms.</p>
          </Section>

          <Section id="16" title="16. Data Protection and Privacy">
            <p>Vouchee processes personal data in accordance with UK GDPR and the Data Protection Act 2018. Full details of what data we collect, how we use it, how long we retain it, and your rights are set out in our <Link href="/legal/privacy" className="text-blue-600 underline">Privacy Policy</Link>.</p>
            <p>In the event of a data breach affecting your personal data, Vouchee will notify you and the Information Commissioner's Office in accordance with our legal obligations.</p>
          </Section>

          <Section id="17" title="17. Intellectual Property">
            <p>All content on the Vouchee platform — including the design, logo, copy, and software — is owned by or licensed to Vouchee Ltd and may not be reproduced without our written permission.</p>
            <p>By uploading content to Vouchee (including profile photos, descriptions, and reviews), you grant Vouchee a non-exclusive, royalty-free licence to use that content for the purposes of operating and promoting the platform. You confirm that you own or have the right to use any content you upload.</p>
          </Section>

          <Section id="18" title="18. Platform Availability and Changes">
            <p>Vouchee will make reasonable efforts to keep the platform available and functioning. However, we do not guarantee uninterrupted access and are not liable for losses arising from downtime, technical issues, or temporary unavailability.</p>
            <p>We reserve the right to modify, suspend, or discontinue any part of the platform at any time. In the event that Vouchee ceases trading, we will provide reasonable notice to active users and our liability in respect of pre-paid subscriptions will be limited to a pro-rata refund of unused subscription fees paid in advance.</p>
          </Section>

          <Section id="19" title="19. Account Suspension and Termination">
            <p>Vouchee reserves the right to suspend or terminate any account at any time if:</p>
            <ul>
              <li>These Terms have been breached</li>
              <li>We reasonably suspect fraudulent, abusive, or harmful behaviour</li>
              <li>A Cleaner's accreditations are found to be invalid or fraudulent</li>
              <li>A Customer has failed to pay outstanding fees or the platform protection fee under Clause 6</li>
            </ul>
            <p>Upon termination, any unused credits held by a Cleaner account will be forfeited. Termination does not affect any rights or obligations that have already arisen.</p>
          </Section>

          <Section id="20" title="20. Disputes Between Customers and Cleaners">
            <p>Vouchee may, at its discretion, assist in mediating disputes between Customers and Cleaners, but we are under no obligation to do so and our involvement in any such mediation is not binding on either party.</p>
            <p>Where a dispute cannot be resolved through the platform, the parties are encouraged to seek independent legal advice. Any disputes arising from or in connection with the use of the platform or these Terms shall be governed by the laws of <strong>England and Wales</strong>, and the parties submit to the exclusive jurisdiction of the courts of England and Wales.</p>
          </Section>

          <Section id="21" title="21. Changes to These Terms">
            <p>We may update these Terms from time to time. If we make significant changes, we will notify you by email and display a notice on the platform at least 14 days before the changes take effect. Continued use of Vouchee after changes take effect constitutes acceptance of the revised Terms. If you do not accept the revised Terms, you may cancel your account in accordance with Clause 11.2.</p>
          </Section>

          <Section id="22" title="22. Severability">
            <p>If any provision of these Terms is found to be unenforceable or invalid by a court of competent jurisdiction, that provision will be modified to the minimum extent necessary to make it enforceable, or severed if modification is not possible. The remaining provisions will continue in full force and effect.</p>
          </Section>

          <Section id="23" title="23. Entire Agreement">
            <p>These Terms, together with our <Link href="/legal/privacy" className="text-blue-600 underline">Privacy Policy</Link> and Cookie Policy, constitute the entire agreement between you and Vouchee in relation to your use of the platform and supersede any prior agreements or representations.</p>
          </Section>

          <Section id="24" title="24. Session Cancellations">
            <p>The following cancellation policy applies to individual cleaning sessions and is separate from the platform subscription cancellation terms in Clause 11.2.</p>
            <p>Where a Customer cancels a scheduled session with less than 24 hours' notice, the Cleaner may charge a cancellation fee of up to 50% of the agreed session rate. This fee is payable to the Cleaner directly and Vouchee accepts no liability for disputes arising from session cancellations.</p>
            <p>Cleaners should notify Customers of any inability to attend as early as possible. Where a Cleaner cancels with less than 24 hours' notice without a genuine reason, this may be taken into account in any dispute resolution process and may affect their standing on the platform.</p>
          </Section>

          <Section id="25" title="25. Key Holding and Property Access">
            <p>Vouchee does not hold, manage, or have any visibility of keys, access codes, or any other means of entry to a Customer's property. Any arrangement regarding property access is made directly between the Customer and the Cleaner and is entirely outside of Vouchee's control.</p>
            <p>Vouchee accepts no liability for lost keys, unauthorised access, locksmith costs, lock replacement, or any security breach arising from any access arrangement made between a Customer and a Cleaner. Customers are solely responsible for deciding what level of access to grant their Cleaner and for any consequences arising from that decision.</p>
          </Section>

          <Section id="26" title="26. No Partnership or Agency">
            <p>Nothing in these Terms creates, or should be construed as creating, a partnership, joint venture, agency, franchise, or employment relationship between Vouchee and any Cleaner or Customer. No party has authority to bind the other in any way. Cleaners are independent self-employed individuals and Vouchee acts solely as a platform operator facilitating introductions between Customers and Cleaners.</p>
          </Section>

          <Section id="27" title="27. Assignment">
            <p>Vouchee may assign or transfer its rights and obligations under these Terms to another entity as part of a sale, merger, or restructuring of the business. Where this occurs, we will notify users and the assignee will be bound by these Terms. Users may not assign or transfer their rights or obligations under these Terms to any third party without Vouchee's prior written consent.</p>
          </Section>

          <Section id="28" title="28. Contact">
            <p>If you have any questions about these Terms, please contact:</p>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 mt-3 not-prose">
              <p className="font-semibold text-gray-800 mb-1">Vouchee — Legal</p>
              <p className="text-gray-600 text-sm">Email: <a href={`mailto:${CONTACT_EMAIL}`} className="text-blue-600 underline">{CONTACT_EMAIL}</a></p>
              <p className="text-gray-600 text-sm mt-1">Website: <a href={SITE_URL} className="text-blue-600 underline">{SITE_URL}</a></p>
            </div>
          </Section>

          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mt-8 not-prose">
            <p className="text-xs text-gray-500 leading-relaxed italic">
              This document is a working draft prepared for solicitor review prior to publication. Priority review areas: Clauses 2 (marketplace status / employment classification), 6 (platform protection fee enforceability), 14 (limitation of liability under Consumer Rights Act 2015), and 16 (UK GDPR compliance). Updated March 2026 to reflect GoCardless payment processing, address disclosure policy, keyword violation logging, and cover clean feature status.
            </p>
          </div>

        </div>

        <div className="mt-16 pt-8 border-t border-gray-100 flex flex-wrap gap-4 text-sm">
          <Link href="/legal/terms/cleaner" className="text-blue-600 hover:underline font-medium">Cleaner Terms →</Link>
          <Link href="/legal/privacy" className="text-blue-600 hover:underline font-medium">Privacy Policy →</Link>
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
