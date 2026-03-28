'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const handleSubmit = async () => {
    setError(null)
    if (!password || password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      const supabase = createClient()
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError

      setDone(true)
      // Get role and redirect to correct dashboard
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await (supabase as any)
          .from('profiles').select('role').eq('id', user.id).single()
        const role = profile?.role
        setTimeout(() => {
          if (role === 'admin') router.replace('/admin/dashboard')
          else if (role === 'cleaner') router.replace('/cleaner/dashboard')
          else router.replace('/customer/dashboard')
        }, 2000)
      }
    } catch (err: any) {
      setError(err?.message ?? 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#f8fafc',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'DM Sans', sans-serif", padding: '24px',
    }}>
      <div style={{ background: 'white', borderRadius: '20px', padding: '40px', maxWidth: '400px', width: '100%', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0' }}>

        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔑</div>
          <h1 style={{ fontFamily: "'Lora', serif", fontSize: '24px', fontWeight: 700, color: '#0f172a', margin: '0 0 8px' }}>
            Set new password
          </h1>
          <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
            Choose a strong password for your account
          </p>
        </div>

        {done ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>✅</div>
            <p style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a', margin: '0 0 4px' }}>Password updated!</p>
            <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>Redirecting you to your dashboard…</p>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                New password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                style={{
                  width: '100%', padding: '12px 14px', borderRadius: '10px',
                  border: '1.5px solid #e2e8f0', fontSize: '14px', outline: 'none',
                  fontFamily: "'DM Sans', sans-serif", color: '#0f172a',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                Confirm password
              </label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Repeat your new password"
                onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
                style={{
                  width: '100%', padding: '12px 14px', borderRadius: '10px',
                  border: `1.5px solid ${error && error.includes('match') ? '#fca5a5' : '#e2e8f0'}`,
                  fontSize: '14px', outline: 'none',
                  fontFamily: "'DM Sans', sans-serif", color: '#0f172a',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '10px 14px', marginBottom: '16px', fontSize: '13px', color: '#dc2626' }}>
                {error}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading || !password || !confirm}
              style={{
                width: '100%', padding: '13px', borderRadius: '10px', border: 'none',
                background: loading || !password || !confirm ? '#e2e8f0' : '#0f172a',
                color: loading || !password || !confirm ? '#94a3b8' : 'white',
                fontSize: '15px', fontWeight: 700, cursor: loading || !password || !confirm ? 'not-allowed' : 'pointer',
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {loading ? 'Updating…' : 'Update password →'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
