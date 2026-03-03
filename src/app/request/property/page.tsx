'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getPostcodeSector, isValidHorshamPostcode } from '@/lib/postcode-sectors'

const CLEANING_TASKS = [
  { id: 'general',          label: 'General cleaning',    description: 'Dusting, tidying, surfaces' },
  { id: 'hoovering',        label: 'Hoovering',           description: 'Carpets and hard floors' },
  { id: 'mopping',          label: 'Mopping',             description: 'Hard floors' },
  { id: 'bathroom',         label: 'Bathroom clean',      description: 'Toilet, sink, shower, bath' },
  { id: 'kitchen',          label: 'Kitchen clean',       description: 'Counters, hob, sink, appliances' },
  { id: 'windows_interior', label: 'Interior windows',    description: 'Inside window cleaning' },
]

const ADDITIONAL_TASKS = [
  { id: 'oven',          label: 'Oven cleaning',        description: 'Deep clean oven interior' },
  { id: 'bathroom_deep', label: 'Bathroom deep clean',  description: 'Grout, limescale, full scrub' },
  { id: 'kitchen_deep',  label: 'Kitchen deep clean',   description: 'Inside cupboards, behind appliances' },
  { id: 'fridge',        label: 'Fridge clean',         description: 'Inside and out' },
  { id: 'blinds',        label: 'Blinds',               description: 'Dusting and wiping blinds' },
  { id: 'mold',          label: 'Mould removal',        description: 'Bathroom and damp areas' },
  { id: 'ironing',       label: 'Ironing',              description: 'Clothes and linens' },
  { id: 'laundry',       label: 'Laundry',              description: 'Washing and folding' },
  { id: 'changing_beds', label: 'Changing beds',        description: 'Strip and remake beds' },
  { id: 'garage',        label: 'Garage / utility',     description: 'Sweeping and tidying' },
]

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const TIME_SLOTS = ['Morning (8am - 12pm)', 'Afternoon (12pm - 5pm)', 'Evening (5pm - 8pm)']
const HOURS_OPTIONS = [
  { value: 1.5, label: '1.5 hours' },
  { value: 2,   label: '2 hours' },
  { value: 2.5, label: '2.5 hours' },
  { value: 3,   label: '3 hours' },
  { value: 3.5, label: '3.5 hours' },
  { value: 4,   label: '4 hours' },
  { value: 4.5, label: '4.5 hours' },
  { value: 5,   label: '5+ hours' },
]
const SECTOR_TO_ZONE: Record<string, string> = {
  "RH121": "central_south_east", "RH122": "central_south_east",
  "RH123": "south_west",         "RH124": "north_east_roffey",
  "RH125": "north_west",         "RH126": "warnham_north",
  "RH127": "warnham_north",      "RH128": "north_west",
  "RH129": "north_west",
  "RH130": "christs_hospital",
  "RH131": "christs_hospital",   "RH132": "south_west",
  "RH133": "mannings_heath",     "RH134": "mannings_heath",
  "RH135": "central_south_east", "RH136": "mannings_heath",
  "RH137": "broadbridge_heath",  "RH138": "broadbridge_heath",
  "RH139": "broadbridge_heath",
  "RH110": "faygate_kilnwood_vale", "RH111": "faygate_kilnwood_vale",
  "RH112": "faygate_kilnwood_vale", "RH113": "faygate_kilnwood_vale",
}

function getZoneFromPostcode(postcode: string): string | null {
  const clean = postcode.toUpperCase().replace(/\s+/g, "")
  // Try 5-char match first (e.g. RH135), then 4-char (e.g. RH12)
  const key5 = clean.slice(0, 5)
  const key4 = clean.slice(0, 4)
  return SECTOR_TO_ZONE[key5] ?? SECTOR_TO_ZONE[key4] ?? null
}
function getSuggestedHours(bedrooms: number) {
  if (bedrooms <= 1) return { min: 1.5, max: 2,   preselect: 1.5 }
  if (bedrooms === 2) return { min: 2,   max: 2.5, preselect: 2   }
  if (bedrooms === 3) return { min: 2.5, max: 3,   preselect: 2.5 }
  if (bedrooms === 4) return { min: 3,   max: 4,   preselect: 3   }
  return                     { min: 4,   max: 5,   preselect: 4   }
}

export default function RequestStep1Page() {
  const router = useRouter()
  const [bedrooms, setBedrooms] = useState(2)
  const [bathrooms, setBathrooms] = useState(1)
  const [postcode, setPostcode] = useState('')
  const [postcodeError, setPostcodeError] = useState('')
  const [detectedSector, setDetectedSector] = useState<string | null>(null)
  const [selectedTasks, setSelectedTasks] = useState<string[]>(['general'])
  const [showAdditional, setShowAdditional] = useState(false)
  const [preferredDays, setPreferredDays] = useState<string[]>([])
  const [preferredTime, setPreferredTime] = useState('')
  const [hoursPerSession, setHoursPerSession] = useState<number | null>(2)
  const [hoursTouched, setHoursTouched] = useState(false)
  const [userPickedHours, setUserPickedHours] = useState(false)

  const suggested = getSuggestedHours(bedrooms)
  const isBelowSuggested = hoursPerSession !== null && hoursPerSession < suggested.min

  const handleBedroomsChange = (val: number) => {
    setBedrooms(val)
    if (!userPickedHours) setHoursPerSession(getSuggestedHours(val).preselect)
  }

  const handlePostcodeChange = (value: string) => {
    setPostcode(value)
    setPostcodeError('')
    setDetectedSector(null)
    if (value.length >= 5) {
      if (!isValidHorshamPostcode(value)) {
        setPostcodeError('We currently only serve Horsham and surrounding areas (RH12, RH13)')
        return
      }
      const sector = getPostcodeSector(value)
      if (sector) setDetectedSector(sector.sector)
    }
  }

  const toggleTask = (id: string) =>
    setSelectedTasks(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id])

  const toggleDay = (day: string) =>
    setPreferredDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day])

  const handleNext = () => {
    if (!postcode || postcodeError) { setPostcodeError('Please enter a valid postcode'); return }
    if (selectedTasks.length === 0) { alert('Please select at least one cleaning task'); return }
    if (!hoursPerSession) { setHoursTouched(true); return }
    sessionStorage.setItem('cleanRequest', JSON.stringify({
      bedrooms, bathrooms, postcode, sector: detectedSector,
      zone: getZoneFromPostcode(postcode),
      tasks: selectedTasks, preferredDays, preferredTime, hoursPerSession,
    }))
    router.push('/request/frequency')
  }

  const allTasks = [...CLEANING_TASKS, ...ADDITIONAL_TASKS]

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
      <style>{`
        * { box-sizing: border-box; }
        .task-btn { transition: all 0.15s ease; }
        .task-btn:hover { border-color: #93c5fd !important; }
        .vou-select { width: 100%; background: rgba(255,255,255,0.8); border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 11px 14px; font-family: 'DM Sans', sans-serif; font-size: 14px; color: #1e293b; appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748b' d='M6 8L1 3h10z'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 14px center; }
        .vou-select:focus { outline: none; border-color: #3b82f6; background-color: white; }
        .vou-input { width: 100%; background: rgba(255,255,255,0.8); border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 11px 14px; font-family: 'DM Sans', sans-serif; font-size: 14px; color: #1e293b; }
        .vou-input:focus { outline: none; border-color: #3b82f6; background: white; }
        .vou-input::placeholder { color: #94a3b8; }
        .continue-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(59,130,246,0.35) !important; }
        .continue-btn:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>

      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #f0f7ff 0%, #fefce8 50%, #f0fdf4 100%)',
        fontFamily: "'DM Sans', sans-serif",
        padding: '24px 16px 48px',
      }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>

          {/* ── Step tracker ── */}
          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#3b82f6', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Step 1 of 4
              </div>
            </div>
            <div style={{ height: '4px', background: '#e2e8f0', borderRadius: '100px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: '25%', background: 'linear-gradient(90deg, #3b82f6 0%, #facc15 50%, #22c55e 100%)', borderRadius: '100px' }} />
            </div>

          </div>

          {/* ── Header ── */}
          <div style={{ marginBottom: '28px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px', lineHeight: 1.2 }}>
              Tell us about your property
            </h1>
            <p style={{ fontSize: '15px', color: '#64748b', lineHeight: 1.6, margin: 0 }}>
              This helps cleaners understand what's involved before they apply
            </p>
          </div>

          {/* ── Property size ── */}
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
                <select className="vou-select" value={bathrooms} onChange={e => setBathrooms(Number(e.target.value))}>
                  {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n === 6 ? '6+' : n}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* ── Postcode ── */}
          <div style={{ background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(16px)', borderRadius: '20px', border: '1.5px solid rgba(255,255,255,0.9)', boxShadow: '0 2px 16px rgba(0,0,0,0.05)', padding: '24px', marginBottom: '12px' }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginBottom: '16px' }}>Your area</div>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '6px' }}>Postcode</label>
            <input
              className="vou-input"
              placeholder="RH12 1AB"
              value={postcode}
              onChange={e => handlePostcodeChange(e.target.value)}
              style={{ borderColor: postcodeError ? '#ef4444' : undefined }}
            />
            {postcodeError && <p style={{ fontSize: '13px', color: '#ef4444', marginTop: '6px' }}>{postcodeError}</p>}
            {detectedSector && (
              <div style={{ marginTop: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#0f172a', marginBottom: '4px' }}>
                  <span>📍</span> Your area: <strong>{detectedSector}</strong>
                </div>
                <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
                  We only publish your area — you share your full address with your chosen cleaner when you're ready.
                </p>
              </div>
            )}
          </div>

          {/* ── Tasks ── */}
          <div style={{ background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(16px)', borderRadius: '20px', border: '1.5px solid rgba(255,255,255,0.9)', boxShadow: '0 2px 16px rgba(0,0,0,0.05)', padding: '24px', marginBottom: '12px' }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginBottom: '16px' }}>What needs cleaning?</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
              {CLEANING_TASKS.map(task => {
                const selected = selectedTasks.includes(task.id)
                return (
                  <button key={task.id} className="task-btn" type="button" onClick={() => toggleTask(task.id)} style={{
                    display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '12px',
                    borderRadius: '14px', border: `2px solid ${selected ? '#3b82f6' : '#e2e8f0'}`,
                    background: selected ? 'rgba(59,130,246,0.06)' : 'rgba(255,255,255,0.6)',
                    cursor: 'pointer', textAlign: 'left',
                  }}>
                    <div style={{
                      width: '18px', height: '18px', borderRadius: '50%', flexShrink: 0, marginTop: '1px',
                      border: selected ? '2px solid #3b82f6' : '2px solid #cbd5e1',
                      background: selected ? '#3b82f6' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
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

            {/* Additional tasks toggle */}
            <button type="button" onClick={() => setShowAdditional(!showAdditional)} style={{
              width: '100%', padding: '11px 14px', borderRadius: '12px',
              border: '1.5px dashed #cbd5e1', background: 'transparent',
              fontSize: '13px', fontWeight: 600, color: '#64748b', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              transition: 'all 0.2s',
            }}>
              <span>+ Special requests (oven, deep cleans, ironing…)</span>
              <span style={{ transform: showAdditional ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', fontSize: '11px' }}>▾</span>
            </button>

            {showAdditional && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px' }}>
                {ADDITIONAL_TASKS.map(task => {
                  const selected = selectedTasks.includes(task.id)
                  return (
                    <button key={task.id} className="task-btn" type="button" onClick={() => toggleTask(task.id)} style={{
                      display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '12px',
                      borderRadius: '14px', border: `2px solid ${selected ? '#f59e0b' : '#e2e8f0'}`,
                      background: selected ? 'rgba(245,158,11,0.06)' : 'rgba(255,255,255,0.6)',
                      cursor: 'pointer', textAlign: 'left',
                    }}>
                      <div style={{
                        width: '18px', height: '18px', borderRadius: '50%', flexShrink: 0, marginTop: '1px',
                        border: selected ? '2px solid #f59e0b' : '2px solid #cbd5e1',
                        background: selected ? '#f59e0b' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
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

            {/* Selected summary */}
            {selectedTasks.length > 0 && (
              <div style={{ marginTop: '12px', padding: '12px', background: '#f8fafc', borderRadius: '12px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '8px' }}>Selected tasks:</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {selectedTasks.map(id => {
                    const task = allTasks.find(t => t.id === id)
                    if (!task) return null
                    const isSpecial = ADDITIONAL_TASKS.some(t => t.id === id)
                    return (
                      <span key={id} style={{
                        fontSize: '12px', fontWeight: 600, padding: '3px 10px', borderRadius: '100px',
                        background: isSpecial ? '#fef3c7' : '#eff6ff',
                        color: isSpecial ? '#92400e' : '#1e40af',
                        border: `1px solid ${isSpecial ? '#fde68a' : '#bfdbfe'}`,
                      }}>{task.label}</span>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ── Hours per session ── */}
          <div style={{ background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(16px)', borderRadius: '20px', border: '1.5px solid rgba(255,255,255,0.9)', boxShadow: '0 2px 16px rgba(0,0,0,0.05)', padding: '24px', marginBottom: '12px' }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
              ⏱ How long per session?
            </div>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 14px' }}>
              💡 Not sure? Most customers with a <strong>{bedrooms}-bedroom</strong> home start with <strong>{suggested.preselect} hours</strong> and adjust after their first clean.
            </p>
            <select
              className="vou-select"
              value={hoursPerSession?.toString() ?? ''}
              onChange={e => {
                const val = parseFloat(e.target.value)
                setHoursPerSession(isNaN(val) ? null : val)
                setHoursTouched(true)
                setUserPickedHours(true)
              }}
            >
              <option value="">Select session length</option>
              {HOURS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
            {isBelowSuggested && (
              <div style={{ marginTop: '10px', padding: '10px 14px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', fontSize: '13px', color: '#92400e' }}>
                ⚠️ Most cleaners recommend at least <strong>{suggested.min} hours</strong> for a {bedrooms}-bed home — you can agree the final time directly with your cleaner.
              </div>
            )}
            {hoursTouched && !hoursPerSession && (
              <p style={{ fontSize: '13px', color: '#ef4444', marginTop: '6px' }}>Please select a session length</p>
            )}
          </div>

          {/* ── Schedule preference ── */}
          <div style={{ background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(16px)', borderRadius: '20px', border: '1.5px solid rgba(255,255,255,0.9)', boxShadow: '0 2px 16px rgba(0,0,0,0.05)', padding: '24px', marginBottom: '24px' }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginBottom: '16px' }}>
              📅 Preferred schedule <span style={{ fontSize: '12px', fontWeight: 400, color: '#94a3b8' }}>— optional</span>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '8px' }}>Preferred days</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                {DAYS_OF_WEEK.map(day => {
                  const active = preferredDays.includes(day)
                  return (
                    <button key={day} type="button" onClick={() => toggleDay(day)} style={{
                      padding: '8px 4px', borderRadius: '10px', fontSize: '12px', fontWeight: 600,
                      border: `2px solid ${active ? '#3b82f6' : '#e2e8f0'}`,
                      background: active ? 'rgba(59,130,246,0.08)' : 'rgba(255,255,255,0.6)',
                      color: active ? '#1e40af' : '#64748b', cursor: 'pointer', transition: 'all 0.15s',
                    }}>{day.substring(0, 3)}</button>
                  )
                })}
              </div>
              <p style={{ fontSize: '12px', color: '#94a3b8', margin: '6px 0 0' }}>Leave blank if you have no preference</p>
            </div>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '6px' }}>Preferred time</label>
              <select className="vou-select" value={preferredTime} onChange={e => setPreferredTime(e.target.value)}>
                <option value="">No preference</option>
                {TIME_SLOTS.map(slot => <option key={slot} value={slot}>{slot}</option>)}
              </select>
            </div>
          </div>

          {/* ── CTA ── */}
          <button
            className="continue-btn"
            onClick={handleNext}
            style={{
              width: '100%', padding: '18px', borderRadius: '16px', border: 'none',
              background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
              color: 'white', fontSize: '17px', fontWeight: 700,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              cursor: 'pointer', boxShadow: '0 4px 20px rgba(37,99,235,0.3)',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
          >
            Continue to pricing →
          </button>

        </div>
      </div>
    </>
  )
}
