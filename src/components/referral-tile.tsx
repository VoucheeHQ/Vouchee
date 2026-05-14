'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

// Dashboard tile shown to customers. Pulls the customer's referral_token
// (assigned automatically on customer-row creation by the migration trigger)
// and their referral_credits stats, then renders a share link + counters.
//
// Style matches the rest of the customer dashboard — DM Sans, 14px border
// radius, soft border, white background.

interface Stats {
  pending: number   // referees signed up but haven't passed the 24h gate yet
  applied: number   // successful, credited referrals
  skipped: number   // referrer was inactive at trigger (referee still got theirs)
}

export function ReferralTile({ customerId }: { customerId: string }) {
  const [token, setToken] = useState<string | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [copied, setCopied] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const { data: cust } = await (supabase as any)
        .from('customers')
        .select('referral_token')
        .eq('id', customerId)
        .single() as { data: { referral_token: string | null } | null }
      if (cancelled) return
      setToken(cust?.referral_token ?? null)

      const { data: credits } = await (supabase as any)
        .from('referral_credits')
        .select('state, referrer_skipped_reason')
        .eq('referrer_customer_id', customerId) as { data: Array<{ state: string; referrer_skipped_reason: string | null }> | null }
      if (cancelled) return
      const rows = credits ?? []
      setStats({
        pending: rows.filter(r => r.state === 'pending').length,
        applied: rows.filter(r => r.state === 'applied' && !r.referrer_skipped_reason).length,
        skipped: rows.filter(r => r.state === 'applied' && !!r.referrer_skipped_reason).length,
      })
    }
    load()
    return () => { cancelled = true }
  }, [customerId])

  const link = token
    ? `${typeof window !== 'undefined' ? window.location.origin : 'https://www.vouchee.co.uk'}/?ref=${token}`
    : null

  const copy = async () => {
    if (!link) return
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (e) {
      // Older browsers / iframe contexts: fall back to select
    }
  }

  if (!token) return null

  return (
    <div style={{ marginBottom: '36px' }}>
      <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '14px' }}>Refer a friend</div>
      <div style={{ background: 'white', borderRadius: '16px', border: '1.5px solid #e2e8f0', padding: '22px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' }}>
          <div style={{ fontSize: '24px', lineHeight: 1 }}>🎁</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>Get a month free for every friend you refer</div>
            <div style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.5 }}>
              Share your invite link. When a friend signs up, picks a cleaner and their cleans start, you both get one month free — automatically applied to your next direct debit.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '18px' }}>
          <input
            readOnly
            value={link ?? ''}
            onClick={e => { (e.target as HTMLInputElement).select() }}
            style={{ flex: 1, padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '13px', fontFamily: "'DM Sans', sans-serif", outline: 'none', color: '#0f172a', background: '#f8fafc' }}
          />
          <button
            onClick={copy}
            style={{ background: copied ? '#16a34a' : '#0f172a', color: 'white', border: 'none', borderRadius: '10px', padding: '10px 18px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", minWidth: '90px' }}
          >
            {copied ? 'Copied ✓' : 'Copy link'}
          </button>
        </div>

        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '12px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Pending</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{stats.pending}</div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>signed up, not started</div>
            </div>
            <div style={{ background: '#f0fdf4', borderRadius: '10px', padding: '12px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Free months</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{stats.applied}</div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>credited to you</div>
            </div>
            <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '12px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Total</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{stats.pending + stats.applied + stats.skipped}</div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>friends invited</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
