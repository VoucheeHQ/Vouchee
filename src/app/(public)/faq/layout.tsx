import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: { absolute: 'FAQ — Vouchee' },
  description: "Frequently asked questions about Vouchee — pricing, vetting, payment, and what happens if your cleaner can't make it.",
  alternates: { canonical: '/faq' },
  openGraph: {
    title: 'FAQ — Vouchee',
    description: "Frequently asked questions about Vouchee — pricing, vetting, payment, and what happens if your cleaner can't make it.",
    url: '/faq',
    images: ['/og-image.jpg'],
  },
}

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'How does Vouchee work?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'You post your request describing your home, the tasks, and the rate you\'re happy to pay. Local, vetted cleaners apply to you — you review their profiles, chat, and choose who feels right. Once you accept a cleaner, everything is confirmed via email and you\'re ready to go.',
      },
    },
    {
      '@type': 'Question',
      name: 'How much does Vouchee cost?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'The Vouchee service fee is £39.96/month for weekly cleans (£9.99 × 4), £29.98/month for fortnightly (£14.99 × 2), or £24.99/month for monthly. Billed by Direct Debit — no commission on what you pay your cleaner, no booking fees.',
      },
    },
    {
      '@type': 'Question',
      name: 'How do I pay my cleaner?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'You pay your cleaner directly — cash, bank transfer, or whatever you agree between yourselves. Vouchee only handles the service fee via Direct Debit. We never take a cut of your cleaner\'s earnings.',
      },
    },
    {
      '@type': 'Question',
      name: 'How are cleaners vetted?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Every cleaner must provide a valid DBS certificate, public liability insurance, and proof of their right to work in the UK. We also personally interview each cleaner to ensure they meet our standards.',
      },
    },
    {
      '@type': 'Question',
      name: 'When does my cleaner get my address?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Only once you\'ve accepted them and confirmed a start date. Your address is never shown in your listing or shared during the application or chat stage.',
      },
    },
    {
      '@type': 'Question',
      name: 'What areas do you cover?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'We currently cover Horsham and surrounding areas, including Broadbridge Heath, Southwater, Kilnwood Vale, Mannings Heath, Christ\'s Hospital and Warnham.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can I cancel?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes, anytime — just give 30 days\' notice. Your Direct Debit will be cancelled and no further payments will be taken.',
      },
    },
    {
      '@type': 'Question',
      name: 'How long does it take to find a cleaner?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Most customers receive their first application within a few hours, and many secure a cleaner within a couple of days.',
      },
    },
  ],
}

export default function FaqLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      {children}
    </>
  )
}
