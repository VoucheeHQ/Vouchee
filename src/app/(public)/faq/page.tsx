'use client'

import { useState } from 'react'
import Link from 'next/link'

const faqs = [
  {
    category: 'Getting started',
    emoji: '🚀',
    questions: [
      {
        q: 'How does Vouchee work?',
        a: 'You post a listing describing your home, the tasks you need done, and the rate you\'re willing to pay. Vetted local cleaners then apply to you. You chat with them, check their reviews, and choose who you want. Once you accept a cleaner, they get your address and a start date, and regular cleans begin.',
      },
      {
        q: 'Do I have to search for a cleaner myself?',
        a: 'No — that\'s the whole point. You post your request and cleaners apply to you. You\'ll see their profile, read their message, and choose who feels right. No browsing endless directories.',
      },
      {
        q: 'How long does it take to find a cleaner?',
        a: 'Most customers receive their first application within a few days of posting. Vouchee operates in the Horsham area, so availability varies by zone — but we\'ll always let you know if demand is high in your area.',
      },
      {
        q: 'What areas do you cover?',
        a: 'We currently cover Horsham and the surrounding areas — including Central Horsham, Roffey, Broadbridge Heath, Southwater, Mannings Heath, and more. You can see the full coverage map when you sign up.',
      },
    ],
  },
  {
    category: 'Pricing',
    emoji: '💰',
    questions: [
      {
        q: 'How much does Vouchee cost?',
        a: 'There\'s a small monthly service fee: £9.99/month for weekly cleans, £14.99/month for fortnightly, and £24.99/month for monthly. That\'s it. No commission on what you pay your cleaner, no booking fees.',
      },
      {
        q: 'How do I pay my cleaner?',
        a: 'You pay your cleaner directly — cash, bank transfer, or whatever you agree between yourselves. Vouchee only handles the service fee via Direct Debit. We never touch your cleaner\'s pay.',
      },
      {
        q: 'What does the service fee actually cover?',
        a: 'It covers the platform — the vetting, the matching, the messaging system, the reviews, and the support. Think of it like a small subscription to a service that finds and manages your cleaner relationship for you.',
      },
      {
        q: 'Can I cancel and stop paying?',
        a: 'Yes, anytime. Just give 30 days\' notice. Your Direct Debit will be cancelled and no further payments will be taken. Your cleaner will be notified and given fair warning about their final clean.',
      },
    ],
  },
  {
    category: 'Cleaners & vetting',
    emoji: '✅',
    questions: [
      {
        q: 'How are cleaners vetted?',
        a: 'Every cleaner goes through a manual review before they\'re approved. We check their DBS certificate, verify their right to work in the UK, and confirm they have valid public liability insurance. We also do a brief introductory call. No exceptions.',
      },
      {
        q: 'When does my cleaner get my address?',
        a: 'Only once you\'ve accepted them and confirmed a start date. Your address is never shown in your listing and is never shared during the application or chat stage. It\'s sent directly to your chosen cleaner by email when you confirm.',
      },
      {
        q: 'What if I\'m not happy with my cleaner?',
        a: 'Get in touch with us at contact@vouchee.co.uk and we\'ll help you sort it. You can also remove your listing and post a new one to find a different cleaner. We take quality seriously and will follow up on any complaints.',
      },
      {
        q: 'Can my cleaner work for other people too?',
        a: 'Yes — cleaners on Vouchee are self-employed and free to take on other clients. Vouchee is a marketplace, not an employer. Your cleaner works on their own terms, which is exactly why the quality is higher.',
      },
    ],
  },
  {
    category: 'Managing your clean',
    emoji: '🧹',
    questions: [
      {
        q: 'Can I pause my listing?',
        a: 'Yes. You can pause your listing from your dashboard at any time — for example if you\'re going on holiday. Your cleaner relationship stays intact and you can reactivate when you\'re ready.',
      },
      {
        q: 'What if I want to change my cleaner?',
        a: 'You can remove your current listing and post a new one. We\'re working on a smoother process for this, but for now just let us know and we\'ll help you through it.',
      },
      {
        q: 'Can I change how often I have a clean?',
        a: 'Yes — contact us at contact@vouchee.co.uk and we\'ll update your plan. The monthly service fee will adjust to reflect your new frequency.',
      },
      {
        q: 'What happens if my cleaner cancels?',
        a: 'That\'s between you and your cleaner to arrange directly — they\'re self-employed and will rebook at a time that suits you both. If there\'s a pattern of unreliability, let us know and we\'ll get involved.',
      },
    ],
  },
  {
    category: 'For cleaners',
    emoji: '🫧',
    questions: [
      {
        q: 'How do I join Vouchee as a cleaner?',
        a: 'Head to vouchee.co.uk/cleaner and fill in the application form. It takes about 4 minutes. We\'ll review your application and be in touch within 3 working days.',
      },
      {
        q: 'Do I need my own insurance and DBS?',
        a: 'Yes — all cleaners must have a valid DBS check, public liability insurance, and the right to work in the UK. If you don\'t have everything yet, we can point you in the right direction when you apply.',
      },
      {
        q: 'How do I get paid?',
        a: 'Customers pay you directly for your time — cash, bank transfer, or whatever you agree. Vouchee doesn\'t take a cut of your hourly rate. We charge a small fee to customers for using the platform, not to you.',
      },
      {
        q: 'Can I choose which jobs I take?',
        a: 'Completely. You apply to the jobs you want, in the areas you want. You\'re self-employed — you decide your own schedule, your own rate, and your own clients.',
      },
    ],
  },
]

function AccordionItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ borderBottom: '1px solid rgba(226,232,240,0.8)' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', padding: '18px 0', background: 'none', border: 'none',
          cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", textAlign: 'left', gap: '16px',
        }}
      >
        <span style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a', lineHeight: 1.45 }}>{q}</span>
        <span style={{
          width: '24px', height: '24px', borderRadius: '50%', flexShrink: 0,
          background: open ? '#eff6ff' : '#f1f5f9',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '14px', color: open ? '#2563eb' : '#94a3b8',
          transform: open ? 'rotate(45deg)' : 'none',
          transition: 'transform 0.2s ease, background 0.2s ease, color 0.2s ease',
        }}>+</span>
      </button>
      {open && (
        <div style={{ paddingBottom: '18px' }}>
          <p style={{ margin: 0, fontSize: '14px', color: '#475569', lineHeight: 1.8 }}>{a}</p>
        </div>
      )}
    </div>
  )
}

export default function FAQPage() {
  const [activeCategory, setActiveCategory] = useState(0)

  return (
    <>
      <style>{`* { box-sizing: border-box; } .faq-sidebar-btn:hover { background: rgba(255,255,255,0.7) !important; }`}</style>

      <div style={{ background: 'linear-gradient(160deg, #eff6ff 0%, #f0fdf4 40%, #fefce8 70%, #f0fdf4 100%)', minHeight: '100%' }}>

        {/* Hero — no subtitle */}
        <div style={{ padding: '72px 24px 56px', textAlign: 'center' }}>
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <h1 style={{
              fontSize: 'clamp(28px, 5vw, 50px)', fontWeight: 800, color: '#0f172a',
              margin: '0', letterSpacing: '-0.5px', lineHeight: 1.1,
              fontFamily: "'DM Sans', sans-serif",
            }}>
              Frequently asked questions
            </h1>
          </div>
        </div>

        {/* Main content */}
        <div style={{
          maxWidth: '900px', margin: '0 auto', padding: '0 24px 80px',
          display: 'flex', gap: '32px', alignItems: 'flex-start',
        }}>

          {/* iOS-style sidebar */}
          <div style={{ width: '200px', flexShrink: 0, position: 'sticky', top: '24px' }}>
            <div style={{
              background: 'rgba(255,255,255,0.6)',
              backdropFilter: 'blur(16px)',
              borderRadius: '18px',
              border: '1px solid rgba(255,255,255,0.8)',
              padding: '8px',
              boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
            }}>
              {faqs.map((cat, i) => (
                <button
                  key={i}
                  className="faq-sidebar-btn"
                  onClick={() => setActiveCategory(i)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    width: '100%', padding: '11px 14px',
                    background: activeCategory === i ? 'white' : 'transparent',
                    border: 'none', borderRadius: '12px',
                    cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                    fontSize: '13px', fontWeight: activeCategory === i ? 700 : 500,
                    color: activeCategory === i ? '#0f172a' : '#64748b',
                    textAlign: 'left',
                    boxShadow: activeCategory === i ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                    marginBottom: '2px', transition: 'all 0.15s ease',
                  }}
                >
                  <span style={{ fontSize: '15px', flexShrink: 0 }}>{cat.emoji}</span>
                  <span style={{ lineHeight: 1.3 }}>{cat.category}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Questions */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {faqs.map((cat, i) => (
              <div key={i} style={{ display: activeCategory === i ? 'block' : 'none' }}>
                <div style={{
                  background: 'rgba(255,255,255,0.7)',
                  backdropFilter: 'blur(16px)',
                  borderRadius: '20px',
                  padding: '8px 28px',
                  border: '1px solid rgba(255,255,255,0.9)',
                  boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
                }}>
                  {cat.questions.map((item, j) => (
                    <AccordionItem key={j} q={item.q} a={item.a} />
                  ))}
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* CTA */}
      <div style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 60%, #3b82f6 100%)', padding: '64px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: '480px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '26px', fontWeight: 800, color: 'white', margin: '0 0 12px', fontFamily: "'DM Sans', sans-serif", letterSpacing: '-0.3px' }}>
            Still have questions?
          </h2>
          <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.85)', margin: '0 0 28px', lineHeight: 1.7, fontFamily: "'DM Sans', sans-serif" }}>
            We're a small team but we actually reply! Drop us a message any time :)
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="mailto:contact@vouchee.co.uk" style={{ background: 'white', color: '#1d4ed8', borderRadius: '12px', padding: '13px 28px', fontSize: '15px', fontWeight: 700, textDecoration: 'none', display: 'inline-block', fontFamily: "'DM Sans', sans-serif" }}>
              Email us →
            </a>
            <Link href="/how-it-works" style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '12px', padding: '13px 28px', fontSize: '15px', fontWeight: 700, textDecoration: 'none', display: 'inline-block', fontFamily: "'DM Sans', sans-serif" }}>
              How it works
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
