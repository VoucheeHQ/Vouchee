'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'

/**
 * Feedback modal — event-driven.
 *
 * Mount once per page that should support feedback. The modal stays hidden
 * until a button elsewhere on the page dispatches a 'vouchee:open-feedback'
 * event with { type: 'bug' | 'suggestion' } in detail. The type controls
 * the modal heading and placeholder copy.
 *
 * The user's account is already linked server-side via session — no need
 * to ask for their email. The /api/feedback route resolves the contact
 * email from their profile automatically.
 */
type FeedbackType = 'bug' | 'suggestion'

export function FeedbackWidget() {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<FeedbackType>('suggestion')
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Listen for buttons elsewhere asking to open us
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ type?: FeedbackType }>).detail
      const next: FeedbackType = detail?.type === 'bug' ? 'bug' : 'suggestion'
      setType(next)
      setBody('')
      setOpen(true)
    }
    window.addEventListener('vouchee:open-feedback', handler as EventListener)
    return () => window.removeEventListener('vouchee:open-feedback', handler as EventListener)
  }, [])

  if (!open) return null

  const handleSubmit = async () => {
    if (!body.trim()) {
      toast.error('Please tell us a bit about what you have in mind')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          body: body.trim(),
          pageUrl: typeof window !== 'undefined' ? window.location.href : undefined,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err?.error ?? 'Could not send feedback — please try again')
        return
      }
      toast.success('Thanks — feedback sent!')
      setBody('')
      setOpen(false)
    } catch {
      toast.error('Network error — please try again')
    } finally {
      setSubmitting(false)
    }
  }

  const typeLabel = type === 'bug' ? 'Bug report' : 'Suggestion'
  const typeEmoji = type === 'bug' ? '🐛' : '💡'
  const typeColor = type === 'bug' ? '#b91c1c' : '#0369a1'
  const typeBg = type === 'bug' ? '#fef2f2' : '#f0f9ff'
  const typeBorder = type === 'bug' ? '#fecaca' : '#bae6fd'

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Send ${typeLabel.toLowerCase()}`}
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        background: 'rgba(15,23,42,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
        fontFamily: "'DM Sans', sans-serif",
      }}
      onClick={() => !submitting && setOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'white', borderRadius: '20px',
          maxWidth: '480px', width: '100%', maxHeight: '90vh', overflow: 'auto',
          padding: '24px 24px 22px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
      >
        {/* Header: type label as a coloured pill so user sees immediately what they're filling in */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              background: typeBg, border: `1px solid ${typeBorder}`,
              color: typeColor,
              padding: '5px 12px', borderRadius: '999px',
              fontSize: '12px', fontWeight: 700,
            }}>
              <span style={{ fontSize: '14px' }}>{typeEmoji}</span>
              <span>{typeLabel}</span>
            </span>
          </div>
          <button
            type="button"
            onClick={() => !submitting && setOpen(false)}
            aria-label="Close"
            style={{ background: 'transparent', border: 'none', fontSize: '22px', color: '#94a3b8', cursor: 'pointer', padding: 0, lineHeight: 1 }}
          >×</button>
        </div>

        <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
          {type === 'bug' ? 'Tell us what went wrong' : 'Share your idea'}
        </div>
        <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px', lineHeight: 1.5 }}>
          {type === 'bug'
            ? 'Describe what happened, what you expected, and any steps to reproduce. We\u2019ll get back to you using the email on your account.'
            : 'The more detail the better. We read every message and reply using the email on your account.'}
        </div>

        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={type === 'bug'
            ? 'e.g. When I click \u201CApply\u201D the page reloads but nothing happens. I expected to see a confirmation.'
            : 'e.g. It would be helpful to have a way to mark which days I\u2019m not available so I don\u2019t get notifications on those days.'}
          maxLength={5000}
          rows={6}
          autoFocus
          disabled={submitting}
          style={{
            width: '100%', boxSizing: 'border-box',
            background: 'white', border: '1.5px solid #cbd5e1', borderRadius: '10px',
            padding: '10px 12px', fontSize: '14px', fontFamily: 'inherit', color: '#0f172a',
            resize: 'vertical', minHeight: '120px',
          }}
        />
        <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', textAlign: 'right' }}>
          {body.length}/5000
        </div>

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '20px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setOpen(false)}
            disabled={submitting}
            style={{ background: 'transparent', color: '#475569', border: 'none', padding: '10px 16px', borderRadius: '10px', fontSize: '13.5px', fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}
          >Cancel</button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !body.trim()}
            style={{
              background: submitting || !body.trim() ? '#94a3b8' : '#0f172a',
              color: 'white', border: 'none',
              padding: '10px 18px', borderRadius: '10px',
              fontSize: '13.5px', fontWeight: 700,
              cursor: submitting || !body.trim() ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
            }}
          >{submitting ? 'Sending\u2026' : 'Send'}</button>
        </div>
      </div>
    </div>
  )
}
