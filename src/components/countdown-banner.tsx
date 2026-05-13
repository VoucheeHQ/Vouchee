'use client'

import { useEffect, useState } from 'react'
import { LAUNCH_DATE, LAUNCH_DATETIME_LABEL, isLaunched } from '@/lib/launch'

// ─────────────────────────────────────────────────────────────────────────────
// CountdownBanner
// ─────────────────────────────────────────────────────────────────────────────
// A slim, sticky-feeling banner counting down to LAUNCH_DATE. Mounted at the
// top of the public marketing pages. Auto-hides the moment isLaunched()
// returns true, so the banner just disappears at 12 PM on 1 June without any
// manual cleanup needed afterwards.
//
// Renders nothing on the server (returns null until mounted) to avoid the
// hydration mismatch you'd otherwise get from comparing client clock to
// build-time clock.

function getRemaining(): { days: number; hours: number; minutes: number; seconds: number; done: boolean } {
  const ms = LAUNCH_DATE.getTime() - Date.now()
  if (ms <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, done: true }
  const days = Math.floor(ms / 86400000)
  const hours = Math.floor((ms % 86400000) / 3600000)
  const minutes = Math.floor((ms % 3600000) / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  return { days, hours, minutes, seconds, done: false }
}

function Cell({ value, label }: { value: number; label: string }) {
  return (
    <div style={{ textAlign: 'center', minWidth: '52px' }}>
      <div style={{ fontSize: '24px', fontWeight: 800, color: 'white', lineHeight: 1, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.5px' }}>
        {String(value).padStart(2, '0')}
      </div>
      <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '4px', fontWeight: 600 }}>
        {label}
      </div>
    </div>
  )
}

export function CountdownBanner() {
  const [mounted, setMounted] = useState(false)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    setMounted(true)
    const id = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(id)
  }, [])

  // SSR: render nothing. We rely on the client-side tick to render the live
  // countdown; doing it server-side would burn in a stale value at build.
  if (!mounted) return null

  // Once launched, the banner disappears forever.
  if (isLaunched()) return null

  const { days, hours, minutes, seconds } = getRemaining()
  // tick is used only to trigger re-renders; explicit reference keeps the
  // setInterval from being optimised away as unused.
  void tick

  return (
    <div style={{
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0f172a 100%)',
      padding: '14px 20px',
      fontFamily: "'DM Sans', sans-serif",
      borderBottom: '1px solid rgba(255,255,255,0.05)',
    }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
        <div style={{ fontSize: '14px', fontWeight: 700, color: 'white', letterSpacing: '-0.2px' }}>
          🚀 Vouchee launches {LAUNCH_DATETIME_LABEL}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <Cell value={days} label="Days" />
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '20px', fontWeight: 200 }}>:</div>
          <Cell value={hours} label="Hours" />
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '20px', fontWeight: 200 }}>:</div>
          <Cell value={minutes} label="Min" />
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '20px', fontWeight: 200 }}>:</div>
          <Cell value={seconds} label="Sec" />
        </div>
      </div>
    </div>
  )
}
