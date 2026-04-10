'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getPostcodeSector, isValidHorshamPostcode } from '@/lib/postcode-sectors'
import { OnboardingShell } from '@/components/layout/onboarding-shell'

const CLEANING_TASKS = [
  { id: 'general',      label: 'General cleaning', description: 'Dusting, tidying, surfaces' },
  { id: 'hoovering',    label: 'Hoovering',         description: 'Carpets and hard floors' },
  { id: 'mopping',      label: 'Mopping',           description: 'Hard floors' },
  { id: 'bathroom',     label: 'Bathroom clean',    description: 'Toilet, sink, shower, bath' },
  { id: 'kitchen',      label: 'Kitchen clean',     description: 'Counters, hob, sink, appliances' },
  { id: 'bins',         label: 'Emptying all bins', description: 'All rooms and kitchen' },
]

const ADDITIONAL_TASKS = [
  { id: 'kitchen_deep',     label: 'Kitchen deep clean',           description: 'Inside cupboards, behind appliances' },
  { id: 'bathroom_deep',    label: 'Bathroom deep clean',          description: 'Grout, limescale, full scrub' },
  { id: 'conservatory',     label: 'Conservatory clean',           description: 'Interior windows and surfaces' },
  { id: 'changing_beds',    label: 'Changing beds',                description: 'Strip and remake beds' },
  { id: 'ironing',          label: 'Ironing',                      description: 'Clothes and linens' },
  { id: 'laundry',          label: 'Laundry',                      description: 'Washing and folding' },
  { id: 'windows_interior', label: 'Interior windows',             description: 'Inside window cleaning' },
  { id: 'fridge',           label: 'Fridge deep clean',            description: 'Inside and out' },
  { id: 'blinds',           label: 'Blinds',                       description: 'Dusting and wiping blinds' },
  { id: 'skirting',         label: 'Skirting boards & doorframes', description: 'Wiping down edges and frames' },
]

const DEEP_CLEAN_TASKS = ['bathroom_deep', 'kitchen_deep', 'fridge', 'conservatory']

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const TIME_SLOTS = [
  'Morning (8am - 12pm)',
  'During the day (8am - 5pm)',
  'Afternoon (12pm - 5pm)',
  'Evening (5pm - 8pm)',
]

const HOURS_OPTIONS = [
  { value: 2,    label: '2 hours' },
  { value: 2.5,  label: '2.5 hours' },
  { value: 3,    label: '3 hours' },
  { value: 3.5,  label: '3.5 hours' },
  { value: 4,    label: '4 hours' },
  { value: 4.5,  label: '4+ hours' },
]

const SECTOR_TO_ZONE: Record<string, string> = {
  "RH121": "central_south_east", "RH122": "central_south_east",
  "RH123": "south_west",         "RH124": "north_east_roffey",
  "RH125": "north_west",         "RH126": "warnham_north",
  "RH127": "warnham_north",      "RH128": "north_west",
  "RH129": "north_west",         "RH120": "faygate_kilnwood_vale",
  "RH130": "christs_hospital",   "RH131": "christs_hospital",
  "RH132": "south_west",         "RH133": "mannings_heath",
  "RH134": "mannings_heath",     "RH135": "central_south_east",
  "RH136": "mannings_heath",     "RH137": "broadbridge_heath",
  "RH138": "broadbridge_heath",  "RH139": "southwater",
  "RH110": "faygate_kilnwood_vale", "RH111": "faygate_kilnwood_vale",
  "RH112": "faygate_kilnwood_vale", "RH113": "faygate_kilnwood_vale",
}

function getZoneFromPostcode(postcode: string): string | null {
  const clean = postcode.toUpperCase().replace(/\s+/g, "")
  return SECTOR_TO_ZONE[clean.slice(0, 5)] ?? SECTOR_TO_ZONE[clean.slice(0, 4)] ?? null
}

function getSuggestedHours(bedrooms: number, bathrooms: number, tasks: string[] = []) {
  const bathBonus = Math.round((Math.max(0, bathrooms - 1) * 0.5) / 0.5) * 0.5
  const deepBonus = tasks.some(t => DEEP_CLEAN_TASKS.includes(t)) ? 0.5 : 0
  let base: { min: number; max: number; preselect: number }
  if (bedrooms <= 1)       base = { min: 2,   max: 3,   preselect: 2   }
  else if (bedrooms === 2) base = { min: 2,   max: 3,   preselect: 2.5 }
  else if (bedrooms === 3) base = { min: 2.5, max: 3.5, preselect: 3   }
  else if (bedrooms === 4) base = { min: 3,   max: 4,   preselect: 3.5 }
  else                     base = { min: 3.5, max: 4,   preselect: 4   }
  return {
    min:       Math.min(base.min + bathBonus + deepBonus, 3.5), // cap min at 3.5 — preselect can reach 4
    max:       Math.min(base.max + bathBonus + deepBonus, 4),
    preselect: Math.min(base.preselect + bathBonus + deepBonus, 4),
  }
}

// Format the range label — show 4+ only when max hits 4 (the ceiling)
function formatSuggestedRange(min: number, max: number): string {
  const maxStr = max >= 4 ? '4+' : `${max}`
  const minStr = `${min}`
  if (minStr === maxStr) return `${minStr} hours`
  return `${minStr}–${maxStr} hours`
}

function RequestStep1Content() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const frequencyPreset = searchParams.get('preset')

  const [bedrooms, setBedrooms]               = useState(2)
  const [bathrooms, setBathrooms]             = useState(1)
  const [postcode, setPostcode]               = useState('')
  const [postcodeError, setPostcodeError]     = useState('')
  const [detectedSector, setDetectedSector]   = useState<string | null>(null)
  const [addressLine1, setAddressLine1]       = useState('')
  const [addressLine2, setAddressLine2]       = useState('')
  const [selectedTasks, setSelectedTasks]     = useState<string[]>(['general', 'hoovering', 'mopping', 'bathroom', 'kitchen'])
  const [showAdditional, setShowAdditional]   = useState(false)
  const [preferredDays, setPreferredDays]     = useState<string[]>([])
  const [preferredTime, setPreferredTime]     = useState('')
  const [hoursPerSession, setHoursPerSession] = useState<number | null>(null)
  const [sessionNotes, setSessionNotes]       = useState('')
  const [userPickedHours, setUserPickedHours] = useState(false)
  const [showErrors, setShowErrors]           = useState(false)

  useEffect(() => { window.scrollTo(0, 0) }, [])

  useEffect(() => {
    const stored = sessionStorage.getItem('cleanRequest')
    const isBackNav = sessionStorage.getItem('_voucheeStep') === 'frequency'
    if (!stored || !isBackNav) return
    try {
      const d = JSON.parse(stored)
      if (d.bedrooms)        setBedrooms(d.bedrooms)
      if (d.bathrooms)       setBathrooms(d.bathrooms)
      if (d.postcode) { setPostcode(d.postcode); if (d.sector) setDetectedSector(d.sector) }
      if (d.addressLine1)    setAddressLine1(d.addressLine1)
      if (d.addressLine2)    setAddressLine2(d.addressLine2)
      if (d.tasks?.length)   setSelectedTasks(d.tasks)
      if (d.preferredDays)   setPreferredDays(d.preferredDays)
      if (d.preferredTime)   setPreferredTime(d.preferredTime)
      if (d.hoursPerSession) { setHoursPerSession(d.hoursPerSession); setUserPickedHours(true) }
      if (d.sessionNotes)    setSessionNotes(d.sessionNotes)
    } catch {}
  }, [])

  const suggested = getSuggestedHours(bedrooms, bathrooms, selectedTasks)

  const handleBedroomsChange = (val: number) => {
    setBedrooms(val)
    if (!userPickedHours) setHoursPerSession(getSuggestedHours(val, bathrooms, selectedTasks).preselect)
  }

  const handleBathroomsChange = (val: number) => {
    setBathrooms(val)
    if (!userPickedHours) setHoursPerSession(getSuggestedHours(bedrooms, val, selectedTasks).preselect)
  }

  const UK_POSTCODE_REGEX = /^[A-Z]{1,2}[0-9][0-9A-Z]?\s?[0-9][A-Z]{2}$/i

  const handlePostcodeChange = (value: string) => {
    setPostcode(value)
    setPostcodeError('')
    setDetectedSector(null)
    if (value.replace(/\s/g, '').length >= 7) {
      if (!UK_POSTCODE_REGEX.test(value.trim())) {
        setPostcodeError('Please enter a valid UK postcode (e.g. RH12 1AB)')
        return
      }
      if (!isValidHorshamPostcode(value)) {
        setPostcodeError('We currently only serve Horsham and surrounding areas (RH12, RH13)')
        return
      }
      const sector = getPostcodeSector(value)
      if (sector) {
        setDetectedSector(sector.sector)
      } else {
        setPostcodeError('Sorry, this postcode is outside our current service area. We cover most of Horsham and surrounding areas.')
      }
    }
  }

  const toggleTask = (id: string) => {
    setSelectedTasks(prev => {
      const next = prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
      if (!userPickedHours) setHoursPerSession(getSuggestedHours(bedrooms, bathrooms, next).preselect)
      return next
    })
  }

  const toggleDay = (day: string) =>
    setPreferredDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day])

  const handleNext = () => {
    const errors = []
    if (!postcode || postcodeError) errors.push('postcode')
    if (detectedSector && !addressLine1.trim()) errors.push('address')
    if (detectedSector && !addressLine2.trim()) errors.push('street')
    if (selectedTasks.length === 0) errors.push('tasks')
    if (!hoursPerSession) errors.push('hours')
    if (preferredDays.length === 0) errors.push('days')
    if (!preferredTime) errors.push('time')

    if (errors.length > 0) { setShowErrors(true); return }

    sessionStorage.setItem('cleanRequest', JSON.stringify({
      bedrooms, bathrooms, postcode, sector: detectedSector,
      zone: getZoneFromPostcode(postcode),
      addressLine1: addressLine1.trim(),
      addressLine2: addressLine2.trim(),
      tasks: selectedTasks, preferredDays, preferredTime,
      hoursPerSession, sessionNotes,
    }))
    sessionStorage.setItem('_voucheeStep', 'frequency')
    router.push(`/request/frequency${frequencyPreset ? `?preset=${frequencyPreset}` : ''}`)
  }

  const allTasks = [...CLEANING_TASKS, ...ADDITIONAL_TASKS]

  // Hours hint: 4.5 in the dropdown means "4+" — treat as high/generous
  const hoursHintState = hoursPerSession !== null ? (() => {
    if (hoursPerSession === 4.5) return 'high'
    if (hoursPerSession < suggested.min) return 'low'
    if (hoursPerSession > suggested.max) return 'high'
    return 'inRange'
  })() : null

  return (
    <>
<style>{`
        * { box-sizing: border-box; }
        .task-btn { transition: all 0.15s ease; }
        .task-btn:hover { border-color: #93c5fd !important; }
        .vou-select { width: 100%; background: rgba(255,255,255,0.8); border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 11px 14px; font-family: 'DM Sans', sans-serif; font-size: 14px; color: #1e293b; appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748b' d='M6 8L1 3h10z'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 14px center; }
        .vou-select:focus { outline: none; border-color: #3b82f6; background-color: white; }
        .vou-select.error { border-color: #ef4444; }
        .vou-input { width: 100%; background: rgba(255,255,255,0.8); border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 11px 14px; font-family: 'DM Sans', sans-serif; font-size: 14px; color: #1e293b; }
        .vou-input:focus { outline: none; border-color: #3b82f6; background: white; }
        .vou-input::placeholder { color: #94a3b8; }
        .vou-input.error { border-color: #ef4444; }
        .vou-textarea { width: 100%; background: rgba(255,255,255,0.8); border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 11px 14px; font-family: 'DM Sans', sans-serif; font-size: 13px; color: #1e293b; resize: vertical; min-height: 80px; line-height: 1.55; }
        .vou-textarea:focus { outline: none; border-color: #3b82f6; background: white; }
        .vou-textarea::placeholder { color: #94a3b8; }
        .continue-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(59,130,246,0.35) !important; }
        .day-btn { padding: 8px 4px; border-radius: 10px; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.15s; border: 2px solid #e2e8f0; background: rgba(255,255,255,0.6); color: #64748b; }
        .day-btn.active { border-color: #3b82f6; background: rgba(59,130,246,0.08); color: #1e40af; }
        .day-btn.error-ring { border-color: #ef4444; }
      `}</style>

      <OnboardingShell>

          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <img
              src="https://www.vouchee.co.uk/full-logo-black.png"
              alt="Vouchee"
              style={{ width: '160px', height: 'auto', display: 'inline-block' }}
            />
          </div>

          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#3b82f6', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Step 1 of 4</div>
              <button onClick={() => router.push('/')} style={{ fontSize: '13px', fontWeight: 600, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>← Back</button>
            </div>
            <div style={{ height: '4px', background: '#e2e8f0', borderRadius: '100px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: '25%', background: 'linear-gradient(90deg, #3b82f6 0%, #facc15 50%, #22c55e 100%)', borderRadius: '100px' }} />
            </div>
          </div>

          <div style={{ marginBottom: '28px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', margin: 0, lineHeight: 1.2 }}>Tell us about your property</h1>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(16px)', borderRadius: '20px', border: '1.5px solid rgba(255,255,255,0.9)', boxShadow: '0 2px 16px rgba(0,0,0,0.05)', padding: '24px', marginBottom: '12px' }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginBottom: '16px' }}>Property size</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '6px' }}>Bedrooms</label>
                <select className="vou-select" value={bedrooms} onChange={e => handleBedroomsChange(Number(e.target.value))}>
                  {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n === 6 ? '6+' : n}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '6px' }}>Bathrooms</label>
                <select className="vou-select" value={bathrooms} onChange={e => handleBathroomsChange(Number(e.target.value))}>
                  {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n === 6 ? '6+' : n}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(16px)', borderRadius: '20px', border: `1.5px solid ${showErrors && (!postcode || postcodeError) ? '#fecaca' : 'rgba(255,255,255,0.9)'}`, boxShadow: '0 2px 16px rgba(0,0,0,0.05)', padding: '24px', marginBottom: '12px' }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginBottom: '16px' }}>Your address</div>

            <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '6px' }}>Postcode</label>
            <input
              className={`vou-input${showErrors && (!postcode || postcodeError) ? ' error' : ''}`}
              placeholder="RH12 1AB"
              value={postcode}
              onChange={e => handlePostcodeChange(e.target.value)}
              style={{ fontSize: '16px', marginBottom: '8px' }}
            />
            {postcodeError && <p style={{ fontSize: '13px', color: '#ef4444', margin: '0 0 8px' }}>{postcodeError}</p>}
            {showErrors && !postcode && !postcodeError && <p style={{ fontSize: '13px', color: '#ef4444', margin: '0 0 8px' }}>Please enter your postcode</p>}

            {detectedSector && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#15803d', margin: '4px 0 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '8px 12px' }}>
                  <span>📍</span> Your area: <strong>{detectedSector}</strong>
                </div>

                <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '6px' }}>
                  House number or name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  className={`vou-input${showErrors && !addressLine1.trim() ? ' error' : ''}`}
                  placeholder="e.g. 14 or Rosewood Cottage"
                  value={addressLine1}
                  onChange={e => setAddressLine1(e.target.value)}
                  style={{ marginBottom: '4px' }}
                />
                {showErrors && !addressLine1.trim() && <p style={{ fontSize: '13px', color: '#ef4444', margin: '0 0 8px' }}>Please enter your house number or name</p>}

                <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569', display: 'block', margin: '10px 0 6px' }}>
                  Street name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  className={`vou-input${showErrors && !addressLine2.trim() ? ' error' : ''}`}
                  placeholder="e.g. Nightingale Road"
                  value={addressLine2}
                  onChange={e => setAddressLine2(e.target.value)}
                  style={{ marginBottom: addressLine2.trim() || !showErrors ? '12px' : '4px' }}
                />
                {showErrors && !addressLine2.trim() && (
                  <p style={{ fontSize: '13px', color: '#ef4444', margin: '0 0 12px' }}>Please enter your street name</p>
                )}

                <div style={{ padding: '10px 14px', background: '#f0fdf4', borderRadius: '10px', border: '1px solid #bbf7d0', display: 'flex', gap: '8px' }}>
                  <span style={{ fontSize: '14px', flexShrink: 0 }}>🔒</span>
                  <span style={{ fontSize: '12px', color: '#166534', lineHeight: 1.5 }}>
                    Only your area will be displayed. Your chosen cleaner will be emailed your full address once you have selected one.
                  </span>
                </div>
              </>
            )}
          </div>

          <div style={{ background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(16px)', borderRadius: '20px', border: '1.5px solid rgba(255,255,255,0.9)', boxShadow: '0 2px 16px rgba(0,0,0,0.05)', padding: '24px', marginBottom: '12px' }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginBottom: '16px' }}>What needs cleaning?</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
              {CLEANING_TASKS.map(task => {
                const selected = selectedTasks.includes(task.id)
                return (
                  <button key={task.id} className="task-btn" type="button" onClick={() => toggleTask(task.id)} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '12px', borderRadius: '14px', border: `2px solid ${selected ? '#3b82f6' : '#e2e8f0'}`, background: selected ? 'rgba(59,130,246,0.06)' : 'rgba(255,255,255,0.6)', cursor: 'pointer', textAlign: 'left' }}>
                    <div style={{ width: '18px', height: '18px', borderRadius: '50%', flexShrink: 0, marginTop: '1px', border: selected ? '2px solid #3b82f6' : '2px solid #cbd5e1', background: selected ? '#3b82f6' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {selected && <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>{task.label}</div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{task.description}</div>
                    </div>
                  </button>
                )
              })}
            </div>

            <button type="button" onClick={() => setShowAdditional(!showAdditional)} style={{ width: '100%', padding: '11px 14px', borderRadius: '12px', border: '1.5px dashed #cbd5e1', background: 'transparent', fontSize: '13px', fontWeight: 600, color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'all 0.2s' }}>
              <span>+ Special requests (deep cleans, ironing, laundry…)</span>
              <span style={{ transform: showAdditional ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', fontSize: '11px' }}>▾</span>
            </button>

            {showAdditional && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px' }}>
                {ADDITIONAL_TASKS.map(task => {
                  const selected = selectedTasks.includes(task.id)
                  return (
                    <button key={task.id} className="task-btn" type="button" onClick={() => toggleTask(task.id)} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '12px', borderRadius: '14px', border: `2px solid ${selected ? '#f59e0b' : '#e2e8f0'}`, background: selected ? 'rgba(245,158,11,0.06)' : 'rgba(255,255,255,0.6)', cursor: 'pointer', textAlign: 'left' }}>
                      <div style={{ width: '18px', height: '18px', borderRadius: '50%', flexShrink: 0, marginTop: '1px', border: selected ? '2px solid #f59e0b' : '2px solid #cbd5e1', background: selected ? '#f59e0b' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {selected && <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>{task.label}</div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{task.description}</div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}

            {selectedTasks.length > 0 && (
              <div style={{ marginTop: '12px', padding: '12px', background: '#f8fafc', borderRadius: '12px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '8px' }}>Selected tasks:</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {selectedTasks.map(id => {
                    const task = allTasks.find(t => t.id === id)
                    if (!task) return null
                    const isSpecial = ADDITIONAL_TASKS.some(t => t.id === id)
                    return (
                      <span key={id} style={{ fontSize: '12px', fontWeight: 600, padding: '3px 10px', borderRadius: '100px', background: isSpecial ? '#fef3c7' : '#eff6ff', color: isSpecial ? '#92400e' : '#1e40af', border: `1px solid ${isSpecial ? '#fde68a' : '#bfdbfe'}` }}>
                        {task.label}
                      </span>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          <div style={{ background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(16px)', borderRadius: '20px', border: `1.5px solid ${showErrors && !hoursPerSession ? '#fecaca' : 'rgba(255,255,255,0.9)'}`, boxShadow: '0 2px 16px rgba(0,0,0,0.05)', padding: '24px', marginBottom: '12px' }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>⏱ How many hours per clean?</div>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 14px', lineHeight: 1.55 }}>
              For a <strong>{bedrooms}-bed / {bathrooms}-bath</strong> home, most customers find{' '}
              <strong>{formatSuggestedRange(suggested.min, suggested.max)}</strong> works well.
            </p>

            <select
              className={`vou-select${showErrors && !hoursPerSession ? ' error' : ''}`}
              value={hoursPerSession?.toString() ?? ''}
              onChange={e => {
                const val = parseFloat(e.target.value)
                setHoursPerSession(isNaN(val) ? null : val)
                setUserPickedHours(true)
              }}
            >
              <option value="" disabled>Select hours</option>
              {HOURS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>

            {showErrors && !hoursPerSession && (
              <p style={{ fontSize: '13px', color: '#ef4444', marginTop: '6px' }}>Please select a session length</p>
            )}

            {hoursPerSession !== null && hoursHintState && (
              <div style={{ marginTop: '10px', padding: '12px 14px', borderRadius: '12px', background: hoursHintState === 'low' ? '#fffbeb' : '#f0fdf4', border: `1px solid ${hoursHintState === 'low' ? '#fde68a' : '#bbf7d0'}`, fontSize: '13px', lineHeight: 1.55 }}>
                {hoursHintState === 'low' && (
                  <p style={{ fontWeight: 600, color: '#92400e', margin: 0 }}>⚠️ On the lower end — typical for this property is {formatSuggestedRange(suggested.min, suggested.max)}. Your cleaner may not be able to cover everything, but you can agree this with them directly.</p>
                )}
                {hoursHintState === 'inRange' && (
                  <p style={{ fontWeight: 600, color: '#166534', margin: 0 }}>✅ This is within the typical range for your home. 💡 Consider asking your cleaner for an extra hour on the first visit to get on top of things.</p>
                )}
                {hoursHintState === 'high' && (
                  <p style={{ fontWeight: 600, color: '#166534', margin: 0 }}>✅ Generous — your cleaner will have plenty of time for a thorough clean.</p>
                )}
              </div>
            )}

            <div style={{ marginTop: '16px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '6px' }}>
                Any notes for your cleaner?{' '}
                <span style={{ fontSize: '11px', fontWeight: 400, color: '#94a3b8' }}>optional</span>
              </label>
              <textarea
                className="vou-textarea"
                placeholder="e.g. please focus extra time on the kitchen each visit, or avoid the top floor on alternate weeks…"
                value={sessionNotes}
                onChange={e => setSessionNotes(e.target.value)}
              />
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(16px)', borderRadius: '20px', border: `1.5px solid ${showErrors && (preferredDays.length === 0 || !preferredTime) ? '#fecaca' : 'rgba(255,255,255,0.9)'}`, boxShadow: '0 2px 16px rgba(0,0,0,0.05)', padding: '24px', marginBottom: '24px' }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginBottom: '16px' }}>📅 Preferred schedule</div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '8px' }}>Preferred days</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                {DAYS_OF_WEEK.map(day => {
                  const active = preferredDays.includes(day)
                  return (
                    <button key={day} type="button" onClick={() => toggleDay(day)}
                      className={`day-btn${active ? ' active' : ''}${showErrors && preferredDays.length === 0 ? ' error-ring' : ''}`}
                    >
                      {day.substring(0, 3)}
                    </button>
                  )
                })}
              </div>
              {showErrors && preferredDays.length === 0 && (
                <p style={{ fontSize: '13px', color: '#ef4444', margin: '6px 0 0' }}>Please select at least one preferred day</p>
              )}
            </div>

            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '6px' }}>Preferred time</label>
              <select
                className={`vou-select${showErrors && !preferredTime ? ' error' : ''}`}
                value={preferredTime}
                onChange={e => setPreferredTime(e.target.value)}
              >
                <option value="" disabled>Select a time preference</option>
                {TIME_SLOTS.map(slot => <option key={slot} value={slot}>{slot}</option>)}
              </select>
              {showErrors && !preferredTime && (
                <p style={{ fontSize: '13px', color: '#ef4444', margin: '6px 0 0' }}>Please select a preferred time</p>
              )}
            </div>
          </div>

          <button
            className="continue-btn"
            onClick={handleNext}
            style={{ width: '100%', padding: '18px', borderRadius: '16px', border: 'none', background: 'linear-gradient(135deg, #2563eb, #3b82f6)', color: 'white', fontSize: '17px', fontWeight: 700, fontFamily: "'Sora', sans-serif", cursor: 'pointer', boxShadow: '0 4px 20px rgba(37,99,235,0.3)', transition: 'transform 0.2s, box-shadow 0.2s' }}
          >
            Continue to pricing →
          </button>

      </OnboardingShell>
    </>
  )
}

export default function RequestStep1Page(): JSX.Element {
  return (
    <Suspense fallback={<div>Loading…</div>}>
      <RequestStep1Content />
    </Suspense>
  )
}
