import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Cleaner Terms of Service | Vouchee',
  description: 'The terms and conditions governing Cleaners\' use of the Vouchee platform, including self-employment obligations, tax responsibilities, and platform rules.',
}

const LAST_UPDATED = 'March 2026'
const CONTACT_EMAIL = 'legal@vouchee.co.uk'
const SITE_URL = 'https://www.vouchee.co.uk'

export default function CleanerTermsPage() {
  return (
    <main className="min-h-screen bg-white">

      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-50 via-white to-green-50 border-b border-gray-100 py-16">
        <div className="container max-w-3xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-green-50 border border-green-100 rounded-full px-4 py-1.5 text-xs font-semibold text-green-700 mb-4">
            For Cleaners · Governed by the laws of England and Wales
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4" style={{ fontFamily: 'Lora, serif' }}>
            Cleaner Terms of Service
          </h1>
          <p className="text-gray-500 text-sm mb-4">
            Last updated: <span className="font-semibold text-gray-700">{LAST_UPDATED}</span> · Version 3.0
          </p>
          <p className="text-sm text-gray-500 max-w-xl mx-auto">
            These terms apply specifically to Cleaners on the Vouchee platform. If you are a homeowner looking for a cleaner, please read the{' '}
            <Link href="/legal/terms/customer" className="text-blue-600 underline">Customer Terms of Service</Link>.
          </p>
        </div>
      </section>

      <section className="container max-w-3xl mx-auto px-6 py-16">
        <div className="prose prose-gray max-w-none">

          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-10 not-prose">
            <p className="text-sm text-amber-800 leading-relaxed">
              <strong>Please read these terms carefully.</strong> By creating a Cleaner account and using Vouchee, you confirm that you have read, understood, and agree to be bound by these Terms. If you do not agree, you must not use the platform. These terms constitute a legally binding agreement between you and Vouchee.
            </p>
          </div>

          <Section id="1" title="1. Who We Are and What This Is">
            <p>Vouchee is an online marketplace that connects self-employed domestic cleaners ("Cleaners") with homeowners ("Customers") in the Horsham area. We provide the platform, the tools, and the framework to help you find and manage cleaning work — but we are not your employer, and we do not direct or control how you carry out your work.</p>
            <p>By creating a Cleaner account and using Vouchee, you confirm that you have read, understood, and agree to these Terms. If you do not agree, please do not use the platform.</p>
            <p>You must be 18 years of age or older to register as a Cleaner on Vouchee. By registering, you confirm that you meet this requirement.</p>
          </Section>

          <Section id="2" title="2. Your Self-Employment Status">
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 not-prose mb-4">
              <p className="text-sm font-bold text-blue-800">Your relationship with Vouchee is that of an independent self-employed contractor, not an employee or worker.</p>
            </div>
            <ul>
              <li>Vouchee does not employ you, engage you as a worker, or direct and control how you carry out your cleaning work.</li>
              <li>Vouchee does not supervise, direct, or control the manner in which you perform your services at any Customer's property.</li>
              <li>You are free to work for other clients, platforms, or businesses outside of Vouchee, provided you comply with Clause 6 of these Terms regarding Customers introduced through Vouchee.</li>
              <li>You are responsible for setting your own availability, accepting or declining jobs, and managing your own schedule.</li>
              <li>Nothing in these Terms, and nothing arising from your use of the Vouchee platform, creates or should be construed as creating an employment relationship, a worker relationship, a partnership, a joint venture, or any agency between you and Vouchee.</li>
              <li>Vouchee does not guarantee you any minimum level of work, income, or job availability through the platform.</li>
            </ul>
          </Section>

          <Section id="3" title="3. Your Tax and Legal Obligations">
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-5 not-prose mb-4">
              <p className="text-sm font-bold text-red-800 mb-2">⚠ You must be registered with HMRC before accepting your first booking through Vouchee.</p>
              <p className="text-sm text-red-700">This is a condition of using the platform, not a suggestion. You must be operating as one of the following before your first session takes place:</p>
              <ul className="text-sm text-red-700 list-disc pl-5 mt-2 space-y-1">
                <li>A <strong>sole trader</strong> registered with HMRC for Self Assessment, or</li>
                <li>A <strong>limited company</strong> registered with Companies House, with appropriate payroll or dividend arrangements in place</li>
              </ul>
            </div>
            <p>Vouchee may request evidence of your HMRC registration or company registration at any time. If you cannot provide satisfactory evidence, your account may be suspended until the matter is resolved.</p>
            <p>As a self-employed individual or limited company, you are solely responsible for:</p>
            <ul>
              <li>Maintaining accurate accounting records of all income earned, including income from Vouchee and all other sources</li>
              <li>Submitting a Self Assessment tax return to HMRC each year, or managing your limited company accounts in accordance with Companies House and HMRC requirements</li>
              <li>Paying all Income Tax and Class 2 and Class 4 National Insurance contributions due on your earnings by the relevant deadlines</li>
              <li>Monitoring your annual turnover across all income sources and registering for VAT with HMRC if your turnover reaches or exceeds the current VAT registration threshold — check HMRC for the current figure as this may change</li>
              <li>Complying with all other legislation applicable to self-employed individuals or limited companies operating in the United Kingdom</li>
            </ul>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 not-prose my-4">
              <p className="text-sm font-bold text-gray-800 mb-2">Vouchee's position is clear:</p>
              <ul className="text-sm text-gray-700 list-disc pl-5 space-y-1">
                <li>Vouchee does not deduct Income Tax, National Insurance, or VAT from any payments made to you</li>
                <li>Vouchee does not provide payslips, P60s, P45s, or any other employment-related documentation</li>
                <li>Vouchee does not manage, advise on, or accept any responsibility for your tax position</li>
                <li>Vouchee will not be liable for any penalties, fines, surcharges, or interest charged by HMRC arising from your failure to register, file returns, or pay tax correctly and on time</li>
                <li>Any suggestion that your use of the Vouchee platform implies employment status or entitlement to employment-related benefits — including holiday pay, sick pay, maternity pay, or pension contributions — is expressly excluded</li>
              </ul>
            </div>
            <p>You are strongly encouraged to maintain proper accounting records from the day you register on Vouchee and to seek advice from a qualified accountant or bookkeeper if you are unsure of your obligations. HMRC's website (<a href="https://www.gov.uk/self-employed" target="_blank" rel="noopener noreferrer">gov.uk/self-employed</a>) also provides free guidance for self-employed individuals.</p>
          </Section>

          <Section id="4" title="4. Required Accreditations">
            <p>Before your Cleaner account can be activated and made visible to Customers, you must provide the following:</p>
            <ul>
              <li>A valid <strong>DBS (Disclosure and Barring Service) certificate</strong> — standard check minimum</li>
              <li>Valid <strong>Public Liability Insurance</strong> with a minimum coverage of £1,000,000</li>
              <li>Proof of your <strong>right to work in the United Kingdom</strong></li>
              <li>Completion of a <strong>Vouchee onboarding interview</strong></li>
            </ul>
            <p><strong>Maintaining your accreditations:</strong></p>
            <p>Your accreditations must remain valid for the entire duration of your time on the platform. You agree to:</p>
            <ul>
              <li>Notify Vouchee promptly — and in any event no later than 7 days — if any accreditation lapses, is withdrawn, or materially changes</li>
              <li>Provide updated documentation when requested by Vouchee</li>
              <li>Renew accreditations before they expire and provide updated copies to Vouchee</li>
            </ul>
            <p>Vouchee will send reminder notifications as accreditations approach their expiry date. If any accreditation lapses and is not renewed within a reasonable period, your account will be temporarily suspended until the issue is resolved. Repeated lapses may result in permanent removal from the platform.</p>
            <p>Providing false, fraudulent, or misleading documentation is a serious breach of these Terms and will result in immediate and permanent removal from the platform. Vouchee reserves the right to report fraudulent documentation to the relevant authorities.</p>
          </Section>

          <Section id="5" title="5. Your Responsibilities as a Cleaner">
            <p>As a Cleaner on Vouchee, you agree to:</p>
            <ul>
              <li>Provide accurate, truthful, and up-to-date information in your profile at all times</li>
              <li>Carry out all cleaning sessions to a reasonable professional standard, with appropriate care and skill</li>
              <li>Arrive at the agreed time and location for every scheduled session, or notify the Customer and Vouchee as early as possible if you are unable to attend</li>
              <li>Communicate promptly and professionally with Customers through the Vouchee platform at all times</li>
              <li>Treat Customers, their property, and their belongings with respect</li>
              <li>Follow any reasonable instructions provided by the Customer regarding their preferences, specialist surfaces, or fragile items</li>
              <li>Comply with all applicable health and safety obligations while working at a Customer's property</li>
              <li>Use cleaning products and equipment in a safe and appropriate manner</li>
              <li>Not bring unauthorised persons onto a Customer's property during a session</li>
              <li>Report any accidents, damage, or incidents to Vouchee promptly through the platform</li>
              <li>Not solicit or request payment outside of the Vouchee platform. Voluntary tips or gifts offered freely by Customers are permitted but may not be solicited or requested in any form.</li>
            </ul>
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 not-prose mt-4">
              <p className="text-sm font-bold text-blue-800 mb-2">Address disclosure and confidentiality</p>
              <p className="text-sm text-blue-700">A Customer's full property address is private and is not visible to you at any point during the browsing or application process. You will receive the full address only after the Customer has formally accepted your application through the platform. Address disclosure is made via a confirmation email from Vouchee sent to you upon acceptance. You must not attempt to identify, request, or transmit a Customer's address through any other means, including the in-platform chat system.</p>
              <p className="text-sm text-blue-700 mt-2">You must treat any address information received through Vouchee as strictly confidential and use it solely for the purpose of attending the agreed cleaning sessions. You must not retain, share, or use address information after your engagement with that Customer has ended.</p>
            </div>
          </Section>

          <Section id="6" title="6. Platform Integrity — Off-Platform Arrangements">
            <p>This clause exists to protect the sustainability of the platform that both Cleaners and Customers rely on, and to ensure that the framework Vouchee provides — including vetting, insurance requirements, payment protection, and monitored communication — is not circumvented.</p>

            <h4 className="font-semibold text-gray-800 mt-4 mb-2">6.1 Why This Matters</h4>
            <p>When a Cleaner and Customer arrange work outside of Vouchee, both parties lose the protections the platform provides: credential monitoring ceases, payments are unprotected, and dispute resolution is unavailable. The restrictions below are not designed to prevent you from working freely — they are designed to protect the introduction relationship that Vouchee invested in facilitating.</p>

            <h4 className="font-semibold text-gray-800 mt-4 mb-2">6.2 The Restriction</h4>
            <p>You agree not to solicit, arrange, accept, or carry out cleaning work — whether paid or unpaid — directly with any Customer you were introduced to through Vouchee, outside of the Vouchee platform, where:</p>
            <ul>
              <li>The introduction took place within the preceding <strong>24 months</strong>, and</li>
              <li>The Customer <strong>remains a registered active user</strong> of the Vouchee platform at the time the off-platform arrangement is made</li>
            </ul>
            <p>Both conditions must be met for this clause to apply. If a Customer has deactivated their Vouchee account, or if more than 24 months have passed since the original introduction, this restriction no longer applies.</p>

            <h4 className="font-semibold text-gray-800 mt-4 mb-2">6.3 Consequences of Breach</h4>
            <div className="overflow-x-auto my-4 not-prose">
              <table className="w-full text-sm border border-gray-200 rounded-xl overflow-hidden">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Offence</th>
                    <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Consequence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr><td className="px-4 py-3 text-gray-700">First offence</td><td className="px-4 py-3 text-gray-600">Formal written warning. No further action if behaviour does not continue.</td></tr>
                  <tr><td className="px-4 py-3 text-gray-700">Second offence</td><td className="px-4 py-3 text-gray-600">6-month suspension. Upon reinstatement, account marked as reinstated following suspension, visible to Customers.</td></tr>
                  <tr><td className="px-4 py-3 text-gray-700">Third offence</td><td className="px-4 py-3 text-gray-600">Permanent removal from Vouchee with no right of appeal.</td></tr>
                </tbody>
              </table>
            </div>
            <p>Vouchee reserves the right to bypass the above stages and proceed directly to permanent removal where conduct is deemed serious, deliberate, or repeated in a short timeframe.</p>

            <h4 className="font-semibold text-gray-800 mt-4 mb-2">6.4 What This Does Not Restrict</h4>
            <p>For the avoidance of doubt, this clause does not prevent you from:</p>
            <ul>
              <li>Working with any client you found independently of Vouchee</li>
              <li>Working on any other platform or through any other route</li>
              <li>Working with a former Vouchee Customer where more than 24 months have passed since your introduction through the platform</li>
              <li>Working with a former Vouchee Customer who has formally deactivated their Vouchee account</li>
            </ul>
          </Section>

          <Section id="7" title="7. Session Cancellations">
            <p>You agree to give Customers as much notice as possible if you are unable to attend a scheduled session.</p>
            <p>Where you cancel a session with less than 24 hours' notice without a genuine reason, you may not be entitled to a cancellation fee, and repeated short-notice cancellations may affect your standing on the platform and may result in suspension or removal.</p>
            <p>Where a Customer cancels a session with less than 24 hours' notice, you may charge a cancellation fee of up to 50% of the agreed session rate. This should be raised through the Vouchee platform and not pursued directly with the Customer outside of the platform.</p>
          </Section>

          <Section id="8" title="8. Property, Keys, and Access">
            <p>You agree to treat all access arrangements — including keys, key safes, and door codes — with the utmost care and confidentiality.</p>
            <ul>
              <li>You must not share, copy, or allow any third party to use any means of access provided to you by a Customer</li>
              <li>You must return or hand back any keys or access materials promptly upon request or upon the end of your engagement with that Customer</li>
              <li>You must notify Vouchee immediately if any access materials are lost, stolen, or compromised</li>
            </ul>
            <p>Vouchee does not hold or manage keys or access codes and accepts no liability for lost keys or access materials. Responsibility for any costs arising from lost keys, locksmith fees, or lock replacement rests with the Cleaner where negligence can be demonstrated. Nothing in this clause prevents you from relying on your Public Liability Insurance policy in accordance with its terms where cover applies.</p>
          </Section>

          <Section id="9" title="9. In-Platform Messaging">
            <p>All messages sent through the Vouchee platform are subject to automated safety systems designed to protect both Cleaners and Customers from fraud and off-platform arrangements.</p>
            <p>Where a message is flagged — for example, because it contains a phone number, email address, social media handle, or reference to direct payment — you will be shown a warning before the message is sent. Messages that trigger a keyword flag are logged server-side in a secure violations record. In some cases, Vouchee staff may review flagged conversations to investigate a complaint, safeguard a user, or take action under Clause 6.</p>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 not-prose my-4">
              <p className="text-sm font-semibold text-amber-800">You must not transmit a Customer's address through the chat system at any time.</p>
              <p className="text-sm text-amber-700 mt-1">Address disclosure occurs only via the formal acceptance email described in Clause 5. Messages containing a full or partial address will be flagged as a safety concern and may result in account review.</p>
            </div>
            <p>This monitoring is conducted on the basis of legitimate interest and in accordance with our Privacy Policy. By using our messaging system, you consent to this monitoring.</p>
          </Section>

          <Section id="10" title="10. Credits, Tiers, and Rewards">
            <p>Vouchee operates a rewards programme designed to recognise and reward Cleaners who deliver consistent, high-quality work on the platform. Full details of the current rewards programme are published on the Rewards page of the platform.</p>

            <h4 className="font-semibold text-gray-800 mt-4 mb-2">10.1 Sign-Up Credits</h4>
            <p>All new Cleaners who successfully complete the onboarding process and have their accreditations verified will receive <strong>20 credits</strong> as a sign-up bonus, available to use immediately.</p>

            <h4 className="font-semibold text-gray-800 mt-4 mb-2">10.2 Milestone Credits</h4>
            <div className="overflow-x-auto my-4 not-prose">
              <table className="w-full text-sm border border-gray-200 rounded-xl overflow-hidden">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Milestone</th>
                    <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Credits awarded</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {[['3 verified reviews', '10 credits'],['10 verified reviews', '15 credits'],['25 verified reviews', '20 credits'],['50 verified reviews', '30 credits'],['100 verified reviews', '50 credits']].map(([m, c]) => (
                    <tr key={m}><td className="px-4 py-3 text-gray-700">{m}</td><td className="px-4 py-3 text-gray-600">{c}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p>Milestone credits are awarded once per milestone and are not repeatable.</p>

            <h4 className="font-semibold text-gray-800 mt-4 mb-2">10.3 Tier Structure and Monthly Credits</h4>
            <div className="overflow-x-auto my-4 not-prose">
              <table className="w-full text-sm border border-gray-200 rounded-xl overflow-hidden">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Tier</th>
                    <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Threshold</th>
                    <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Monthly Credits</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr><td className="px-4 py-3 text-gray-700">🥉 Bronze</td><td className="px-4 py-3 text-gray-600">20 verified 4+ star reviews</td><td className="px-4 py-3 text-gray-600">5 credits/month</td></tr>
                  <tr><td className="px-4 py-3 text-gray-700">🥈 Silver</td><td className="px-4 py-3 text-gray-600">50 verified 4+ star reviews</td><td className="px-4 py-3 text-gray-600">10 credits/month</td></tr>
                  <tr><td className="px-4 py-3 text-gray-700">🥇 Gold</td><td className="px-4 py-3 text-gray-600">100 verified 4+ star reviews</td><td className="px-4 py-3 text-gray-600">Unlimited credits</td></tr>
                </tbody>
              </table>
            </div>
            <p>Monthly credits that are unused at the end of the month are forfeited and do not carry over. Tier status is reviewed monthly. Where a Cleaner's qualifying review count falls below the threshold for their current tier, they will enter a 30-day review period during which their tier and monthly allocation are retained.</p>

            <h4 className="font-semibold text-gray-800 mt-4 mb-2">10.4 Quests and Challenges</h4>
            <p>Vouchee may from time to time offer time-limited quests or challenges that award bonus credits or other platform benefits upon completion. Quest availability, terms, and rewards are published on the platform and may change at any time. Quests that are withdrawn before completion will not result in partial credit awards unless otherwise stated at the time the quest was offered.</p>

            <h4 className="font-semibold text-gray-800 mt-4 mb-2">10.5 Spending Credits</h4>
            <ul>
              <li>Each job application costs <strong>1 credit</strong>, except for Gold tier Cleaners who apply at no credit cost</li>
              <li>Credits are <strong>non-refundable</strong> once a homeowner has opened and reviewed your application</li>
              <li>Credits <strong>will be refunded</strong> if a job listing expires without the homeowner opening your application</li>
              <li>Credits have <strong>no cash value</strong> and cannot be transferred between accounts</li>
            </ul>

            <h4 className="font-semibold text-gray-800 mt-4 mb-2">10.6 Purchasing Credits</h4>
            <p>Additional credits will be available for purchase through the Vouchee credit store when this feature launches. The rates will be published on the platform at that time. Purchased credits that remain unused may be refunded within 14 days of purchase in accordance with applicable consumer law. After 14 days, purchased credits are non-refundable except where required by law.</p>

            <h4 className="font-semibold text-gray-800 mt-4 mb-2">10.7 Admin Credits</h4>
            <p>During early platform operation, Vouchee may at its discretion grant selected Cleaners complimentary credits or temporary unlimited access. This is a discretionary arrangement and may be withdrawn at any time with reasonable notice.</p>

            <h4 className="font-semibold text-gray-800 mt-4 mb-2">10.8 Credits on Termination</h4>
            <p>Upon account deactivation or termination, any unused credits are forfeited with no entitlement to refund, except for purchased credits within the 14-day window described in Clause 10.6.</p>

            <h4 className="font-semibold text-gray-800 mt-4 mb-2">10.9 Changes to the Rewards Programme</h4>
            <p>Vouchee reserves the right to introduce, modify, suspend, or discontinue any element of the rewards programme at any time. Where changes are material, Vouchee will provide at least 14 days notice before the change takes effect. Nothing in the rewards programme creates any contractual entitlement to a specific level of credits, tier status, or quest availability beyond what is explicitly confirmed in writing by Vouchee at the time of award.</p>
          </Section>

          <Section id="11" title="11. Reviews and Ratings">
            <p>Customers may leave reviews and ratings for Cleaners following a completed session. These reviews are visible to other Customers on the platform.</p>
            <p>You agree that you will not:</p>
            <ul>
              <li>Solicit, incentivise, or arrange for friends, family, or associates to leave false or misleading reviews</li>
              <li>Threaten, pressure, or attempt to influence a Customer to remove or change a genuine review</li>
              <li>Post or arrange for others to post negative reviews about other Cleaners on the platform</li>
            </ul>
            <p>Vouchee reserves the right to remove any review that we reasonably believe to be fraudulent or in breach of these Terms, and to suspend or remove accounts engaged in review manipulation.</p>
          </Section>

          <Section id="12" title="12. Payments">
            <p>Payments for cleaning sessions are processed through the Vouchee platform via <strong>GoCardless</strong>, an FCA-authorised payment service provider operating via Direct Debit. You agree to:</p>
            <ul>
              <li>Set your hourly rate accurately and not misrepresent the time spent on a session</li>
              <li>Not request or accept cash payments, bank transfers, or any other form of payment from Customers outside of the Vouchee platform</li>
              <li>Raise any payment disputes through the Vouchee platform promptly</li>
            </ul>
            <p>Vouchee charges a platform fee on payments processed. The current fee structure is published on the platform and may be updated with reasonable notice.</p>
          </Section>

          <Section id="13" title="13. Account Deactivation">
            <p>If you wish to leave the Vouchee platform, you must formally deactivate your account through the platform. Informal requests made outside the platform will not be accepted as formal deactivation.</p>

            <h4 className="font-semibold text-gray-800 mt-4 mb-2">13.1 The Deactivation Process</h4>
            <p>To deactivate your account you must:</p>
            <ol className="list-decimal pl-5 space-y-2 text-gray-600">
              <li>Navigate to Account Settings and select Deactivate Account</li>
              <li>Select your reason for leaving from the options provided</li>
              <li>Confirm that you understand your account will be reset if you choose to return</li>
              <li>Confirm that the off-platform restriction in Clause 6.2 continues to apply for 24 months from your last introduction to an active Vouchee Customer, regardless of deactivation</li>
              <li>Complete the optional exit interview</li>
            </ol>
            <p>Deactivation will be confirmed within 2 business days of completing the above steps.</p>

            <h4 className="font-semibold text-gray-800 mt-4 mb-2">13.2 Exit Interview</h4>
            <p>Before deactivation is confirmed, you will be invited to complete a short optional exit interview. This is entirely optional and will not delay or affect your deactivation request in any way.</p>

            <h4 className="font-semibold text-gray-800 mt-4 mb-2">13.3 Staying Registered at No Cost</h4>
            <p>Remaining registered on Vouchee incurs no ongoing cost. If you no longer wish to receive job notifications or Customer communications, these can be toggled off independently in your notification settings without deactivating your account.</p>

            <h4 className="font-semibold text-gray-800 mt-4 mb-2">13.4 Reactivation</h4>
            <p>If you choose to return to Vouchee after deactivation, reactivation is treated as a new registration — your previous ratings, reviews, jobs completed, and time on platform will not be restored. You will be required to resubmit all accreditation documents and complete a new onboarding interview.</p>
          </Section>

          <Section id="14" title="14. Suspension and Termination by Vouchee">
            <p>Vouchee reserves the right to suspend or permanently remove any Cleaner account at any time if:</p>
            <ul>
              <li>These Terms have been breached</li>
              <li>Any accreditation is found to be invalid, fraudulent, or has lapsed without renewal</li>
              <li>We reasonably suspect fraudulent, abusive, dangerous, or harmful behaviour</li>
              <li>A serious complaint is received from a Customer that warrants immediate action</li>
              <li>You are found to have arranged off-platform work in breach of Clause 6</li>
            </ul>
            <p>Where possible, Vouchee will notify you of the reason for suspension or removal. In cases involving serious allegations or safety concerns, suspension may be immediate and without prior notice. Upon permanent removal, any unused credits are forfeited with no entitlement to refund.</p>
          </Section>

          <Section id="15" title="15. Limitation of Liability">
            <p>To the maximum extent permitted by applicable law:</p>
            <ul>
              <li>Vouchee is not liable for any loss of income, loss of work, or financial loss arising from job unavailability, platform downtime, or changes to the platform</li>
              <li>Vouchee is not liable for the conduct, actions, or omissions of any Customer</li>
              <li>Vouchee is not liable for any injury, accident, or damage that occurs while you are carrying out a cleaning session</li>
              <li>Vouchee does not guarantee any minimum level of work or earnings through the platform</li>
              <li>Vouchee's total liability to you in connection with the platform shall not exceed the total value of credits purchased by you in the 3 months prior to the event giving rise to the claim</li>
            </ul>
            <p>Nothing in this clause excludes or limits our liability for:</p>
            <ul>
              <li>Death or personal injury caused by our negligence</li>
              <li>Fraud or fraudulent misrepresentation</li>
              <li>Any liability that cannot be lawfully excluded or limited under applicable legislation</li>
              <li>Any failure by Vouchee to exercise reasonable care in operating the platform</li>
            </ul>
          </Section>

          <Section id="16" title="16. Data Protection and Privacy">
            <p>Vouchee processes your personal data — including identity documents, DBS certificates, and insurance documentation — in accordance with UK GDPR and the Data Protection Act 2018.</p>
            <p>Full details of what data we collect, how we use it, how long we retain it, and your rights are set out in our <Link href="/legal/privacy" className="text-blue-600 underline">Privacy Policy</Link>.</p>
            <p>Credential documents submitted for verification purposes are retained for the duration of your registration and for a reasonable period thereafter in accordance with our data retention policy. You have the right to request deletion of your personal data subject to our legal obligations to retain certain records.</p>
            <p>In the event of a data breach affecting your personal data, Vouchee will notify you and the Information Commissioner's Office in accordance with our legal obligations.</p>
          </Section>

          <Section id="17" title="17. Intellectual Property">
            <p>All content on the Vouchee platform — including the design, logo, copy, and software — is owned by or licensed to Vouchee Ltd and may not be reproduced without our written permission.</p>
            <p>By uploading content to Vouchee (including profile photos and descriptions), you grant Vouchee a non-exclusive, royalty-free licence to use that content for the purposes of operating and promoting the platform. You confirm that you own or have the right to use any content you upload.</p>
          </Section>

          <Section id="18" title="18. Platform Availability and Changes">
            <p>Vouchee will make reasonable efforts to keep the platform available and functioning. However, we do not guarantee uninterrupted access and are not liable for losses arising from downtime, technical issues, or temporary unavailability.</p>
            <p>We reserve the right to modify, suspend, or discontinue any part of the platform at any time. Where changes materially affect Cleaners — including changes to the credit system, fee structure, or platform rules — we will provide reasonable notice before changes take effect.</p>
          </Section>

          <Section id="19" title="19. Force Majeure">
            <p>Neither you nor Vouchee shall be considered in breach of these Terms where non-performance is caused by circumstances genuinely outside your reasonable control, including but not limited to serious illness, severe weather, transport disruption, family emergency, or other events beyond reasonable anticipation.</p>
            <p>Where you are unable to attend a scheduled session due to force majeure, you agree to notify the Customer and Vouchee as early as possible so that alternative cover arrangements can be made. Repeated use of force majeure as a reason for non-attendance, where a pattern suggests the reason is not genuine, may be taken into account in any assessment of your standing on the platform.</p>
          </Section>

          <Section id="20" title="20. No Partnership or Agency">
            <p>Nothing in these Terms creates, or should be construed as creating, a partnership, joint venture, agency, franchise, or employment relationship between Vouchee and any Cleaner. You have no authority to bind Vouchee in any way. You operate as an independent self-employed individual and Vouchee acts solely as a platform operator facilitating introductions between Cleaners and Customers.</p>
          </Section>

          <Section id="21" title="21. Assignment">
            <p>Vouchee may assign or transfer its rights and obligations under these Terms to another entity as part of a sale, merger, or restructuring of the business. Where this occurs, we will notify you and the assignee will be bound by these Terms. You may not assign or transfer your rights or obligations under these Terms to any third party without Vouchee's prior written consent.</p>
          </Section>

          <Section id="22" title="22. Disputes">
            <p>Vouchee may, at its discretion, assist in mediating disputes between Cleaners and Customers, but we are under no obligation to do so and our involvement in any such mediation is not binding on either party.</p>
            <p>Any disputes arising from or in connection with these Terms shall be governed by the laws of <strong>England and Wales</strong>, and the parties submit to the exclusive jurisdiction of the courts of England and Wales.</p>
          </Section>

          <Section id="23" title="23. Changes to These Terms">
            <p>We may update these Terms from time to time. If we make significant changes, we will notify you by email and display a notice on the platform at least 14 days before the changes take effect. Continued use of Vouchee after changes take effect constitutes acceptance of the revised Terms.</p>
          </Section>

          <Section id="24" title="24. Severability">
            <p>If any provision of these Terms is found to be unenforceable or invalid, that provision will be modified to the minimum extent necessary to make it enforceable, or severed if modification is not possible. The remaining provisions will continue in full force and effect.</p>
          </Section>

          <Section id="25" title="25. Entire Agreement">
            <p>These Terms, together with our <Link href="/legal/privacy" className="text-blue-600 underline">Privacy Policy</Link> and Cookie Policy, constitute the entire agreement between you and Vouchee in relation to your use of the platform as a Cleaner and supersede any prior agreements or representations.</p>
          </Section>

          <Section id="26" title="26. Contact">
            <p>If you have any questions about these Terms, please contact:</p>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 mt-3 not-prose">
              <p className="font-semibold text-gray-800 mb-1">Vouchee — Legal</p>
              <p className="text-gray-600 text-sm">Email: <a href={`mailto:${CONTACT_EMAIL}`} className="text-blue-600 underline">{CONTACT_EMAIL}</a></p>
              <p className="text-gray-600 text-sm mt-1">Website: <a href={SITE_URL} className="text-blue-600 underline">{SITE_URL}</a></p>
            </div>
          </Section>

          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mt-8 not-prose">
            <p className="text-xs text-gray-500 leading-relaxed italic">
              This document is a working draft prepared for solicitor review prior to publication. Priority review areas: Clauses 2 (self-employment / worker status), 6 (off-platform restriction enforceability and 24-month window), 10 (credit system — consumer credit regulations), and 13 (deactivation process and data retention). Should be reviewed alongside the Customer Terms of Service to ensure consistency between both documents.
            </p>
          </div>

        </div>

        <div className="mt-16 pt-8 border-t border-gray-100 flex flex-wrap gap-4 text-sm">
          <Link href="/legal/terms/customer" className="text-blue-600 hover:underline font-medium">Customer Terms →</Link>
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
