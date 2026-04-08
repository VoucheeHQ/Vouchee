"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

const TASK_LABELS: Record<string, string> = {
  general: "General cleaning", hoovering: "Hoovering", mopping: "Mopping",
  bathroom: "Bathroom clean", kitchen: "Kitchen clean",
  windows_interior: "Interior windows", oven: "Oven cleaning",
  bathroom_deep: "Bathroom deep clean", kitchen_deep: "Kitchen deep clean",
  fridge: "Fridge clean", blinds: "Blinds", mold: "Mould removal",
  ironing: "Ironing", laundry: "Laundry", changing_beds: "Changing beds",
  garage: "Garage / utility", bins: "Emptying all bins",
  skirting: "Skirting boards & doorframes", conservatory: "Conservatory clean",
}

const STANDARD_TASKS = ['general', 'hoovering', 'mopping', 'bathroom', 'kitchen', 'bins']
const EXTRA_TASKS = ['bathroom_deep', 'kitchen_deep', 'ironing', 'laundry', 'changing_beds', 'windows_interior', 'fridge', 'blinds', 'skirting', 'conservatory']

const PRICING: Record<string, { pricePerSession: number; monthlyCharge: number; label: string }> = {
  weekly:      { pricePerSession: 9.99,  monthlyCharge: 43.33, label: "Weekly" },
  fortnightly: { pricePerSession: 14.99, monthlyCharge: 32.48, label: "Fortnightly" },
  monthly:     { pricePerSession: 24.99, monthlyCharge: 24.99, label: "Monthly" },
}

const SECTOR_TO_ZONE: Record<string, string> = {
  "RH121": "central_south_east", "RH122": "central_south_east",
  "RH125": "north_west",         "RH124": "north_east_roffey",
  "RH123": "south_west",         "RH126": "warnham_north",
  "RH138": "broadbridge_heath",  "RH136": "mannings_heath",
  "RH110": "faygate_kilnwood_vale", "RH130": "christs_hospital",
}

const ZONE_LABELS: Record<string, string> = {
  central_south_east: "Central Horsham",
  north_west: "North West Horsham",
  north_east_roffey: "North East / Roffey",
  south_west: "South West Horsham",
  warnham_north: "Warnham & North",
  broadbridge_heath: "Broadbridge Heath",
  mannings_heath: "Mannings Heath",
  faygate_kilnwood_vale: "Faygate / Kilnwood Vale",
  christs_hospital: "Christ's Hospital",
  southwater: "Southwater",
}

const HOURS_MAX = 4.5
const HOURS_MIN = 1
const RATE_MAX  = 30.5
const RATE_MIN  = 12
const RATE_STEP = 0.5
const BED_MAX   = 6
const BATH_MAX  = 6

function formatHours(h: number) {
  if (h >= HOURS_MAX) return "4+ hrs"
  return `${Number.isInteger(h) ? h : h.toFixed(1)} hrs`
}

function formatRate(r: number) {
  if (r >= RATE_MAX) return "£30+"
  return `£${r.toFixed(2)}/hr`
}

function formatBedrooms(n: number) {
  return n >= BED_MAX ? `${BED_MAX}+` : `${n}`
}

function formatBathrooms(n: number) {
  return n >= BATH_MAX ? `${BATH_MAX}+` : `${n}`
}

function getSectorFromPostcode(postcode: string): string | null {
  if (!postcode) return null
  const clean = postcode.toUpperCase().replace(/\s+/g, "").trim()
  for (const sector of Object.keys(SECTOR_TO_ZONE)) {
    if (clean.startsWith(sector.replace(" ", ""))) return SECTOR_TO_ZONE[sector]
  }
  return null
}

function getAreaLabel(data: { zone?: string; postcode?: string }): string {
  const zone = data.zone || (data.postcode ? getSectorFromPostcode(data.postcode) : null)
  if (zone && ZONE_LABELS[zone]) return ZONE_LABELS[zone]
  return data.postcode ?? "Your area"
}

function formatPostcode(raw: string): string {
  const clean = raw.toUpperCase().replace(/\s+/g, "")
  if (clean.length > 4) return clean.slice(0, -3) + " " + clean.slice(-3)
  return raw.toUpperCase()
}

function formatAddress(line1: string, line2: string, postcode: string): string {
  const parts = [line1, line2].filter(Boolean)
  const formatted = postcode ? formatPostcode(postcode) : ""
  return [...parts, formatted, "West Sussex"].filter(Boolean).join(", ")
}

interface RequestData {
  bedrooms?: number
  bathrooms?: number
  postcode?: string
  sector?: string
  zone?: string
  addressLine1?: string
  addressLine2?: string
  tasks?: string[]
  preferredDays?: string[]
  preferredTime?: string
  scheduleNotes?: string
  sessionNotes?: string
  frequency?: string
  hourlyRate?: number
  hoursPerSession?: number
  finalNotes?: string
}

const STORAGE_KEY = "cleanRequest"
const BACKUP_KEY = "cleanRequest_backup"
const PUBLISHED_KEY = "cleanRequest_published_id"

function getRequestData(): RequestData | null {
  try {
    const session = sessionStorage.getItem(STORAGE_KEY)
    if (session) return JSON.parse(session)
    const backup = localStorage.getItem(BACKUP_KEY)
    if (backup) { sessionStorage.setItem(STORAGE_KEY, backup); return JSON.parse(backup) }
    return null
  } catch { return null }
}

function clearRequestData() {
  try {
    sessionStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(BACKUP_KEY)
    localStorage.removeItem(PUBLISHED_KEY)
  } catch {}
}

function getPublishedId(): string | null {
  try { return localStorage.getItem(PUBLISHED_KEY) } catch { return null }
}

function setPublishedId(id: string) {
  try { localStorage.setItem(PUBLISHED_KEY, id) } catch {}
}

async function publishRequest(data: RequestData, userId: string): Promise<string> {
  const supabase = createClient()
  const { data: existingCustomer } = await (supabase as any)
    .from("customers").select("id").eq("profile_id", userId).single() as { data: { id: string } | null }

  let customerId: string
  if (existingCustomer) {
    customerId = existingCustomer.id
    await (supabase as any).from("customers").update({
      frequency: data.frequency ?? "fortnightly",
      address_line1: data.addressLine1 ?? "",
      address_line2: data.addressLine2 ?? "",
      postcode: data.postcode ?? "",
    }).eq("id", customerId)
  } else {
    const { data: newCustomer, error: customerError } = await (supabase as any)
      .from("customers").insert({
        profile_id: userId,
        postcode: data.postcode ?? "",
        city: "Horsham",
        address_line1: data.addressLine1 ?? "",
        address_line2: data.addressLine2 ?? "",
        frequency: (data.frequency ?? "fortnightly") as any,
        subscription_status: "pending",
      }).select("id").single()
    if (customerError || !newCustomer) throw new Error("Failed to create customer record")
    customerId = newCustomer.id
  }

  // Role guard — double-check server side before inserting
  const { data: { user: currentUser } } = await supabase.auth.getUser()
  if (currentUser) {
    const { data: roleCheck } = await (supabase as any)
      .from('profiles').select('role').eq('id', currentUser.id).single()
    if (roleCheck?.role === 'cleaner') throw new Error('Cleaners cannot post listings.')
  }

  const zone = data.zone || (data.postcode ? getSectorFromPostcode(data.postcode) : null) || null
  const { data: inserted, error: insertError } = await (supabase as any)
    .from("clean_requests").insert({
      customer_id: customerId,
      status: "pending",
      service_type: "regular" as any,
      zone: zone as any,
      bedrooms: data.bedrooms ?? 2,
      bathrooms: data.bathrooms ?? 1,
      has_pets: false,
      preferred_days: data.preferredDays ?? [],
      preferred_day: data.preferredDays?.[0] ?? null,
      time_of_day: data.preferredTime ?? null,
      hourly_rate: data.hourlyRate ?? null,
      hours_per_session: data.hoursPerSession ?? null,
      tasks: data.tasks ?? [],
      customer_notes: data.sessionNotes ?? data.finalNotes ?? null,
      price_per_session: data.hourlyRate && data.hoursPerSession ? data.hourlyRate * data.hoursPerSession : null,
    }).select("id").single()

  if (insertError || !inserted) throw new Error(insertError?.message ?? "Failed to publish request")
  return inserted.id
}

function Stepper({ label, value, onDown, onUp, atMin, atMax, display }: {
  label: string; value: number; onDown: () => void; onUp: () => void
  atMin: boolean; atMax: boolean; display: string
}) {
  return (
    <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button onClick={onDown} disabled={atMin} style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1.5px solid #e2e8f0', background: atMin ? '#f8fafc' : 'white', fontSize: '18px', color: atMin ? '#cbd5e1' : '#0f172a', cursor: atMin ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 300 }}>−</button>
        <span style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', minWidth: '72px', textAlign: 'center' }}>{display}</span>
        <button onClick={onUp} disabled={atMax} style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1.5px solid #e2e8f0', background: atMax ? '#f8fafc' : 'white', fontSize: '18px', color: atMax ? '#cbd5e1' : '#0f172a', cursor: atMax ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 300 }}>+</button>
      </div>
    </div>
  )
}

const ALL_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const DAY_SHORT: Record<string, string> = {
  monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed',
  thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun',
}
const TIME_SLOTS = [
  'Morning (8am - 12pm)',
  'During the day (8am - 5pm)',
  'Afternoon (12pm - 5pm)',
  'Evening (5pm - 8pm)',
]

const STANDARD_TASK_LIST = [
  { id: 'general', label: 'General cleaning' }, { id: 'hoovering', label: 'Hoovering' },
  { id: 'mopping', label: 'Mopping' },           { id: 'bathroom', label: 'Bathroom clean' },
  { id: 'kitchen', label: 'Kitchen clean' },     { id: 'bins', label: 'Emptying all bins' },
]
const EXTRA_TASK_LIST = [
  { id: 'bathroom_deep', label: 'Bathroom deep clean' }, { id: 'kitchen_deep', label: 'Kitchen deep clean' },
  { id: 'ironing', label: 'Ironing' },                   { id: 'laundry', label: 'Laundry' },
  { id: 'changing_beds', label: 'Changing beds' },       { id: 'windows_interior', label: 'Interior windows' },
  { id: 'fridge', label: 'Fridge clean' },               { id: 'blinds', label: 'Blinds' },
  { id: 'skirting', label: 'Skirting boards' },          { id: 'conservatory', label: 'Conservatory' },
]

function EditModal({ data, onSave, onClose }: {
  data: RequestData; onSave: (updated: Partial<RequestData>) => void; onClose: () => void
}) {
  const [bedrooms, setBedrooms]   = useState(data.bedrooms ?? 2)
  const [bathrooms, setBathrooms] = useState(data.bathrooms ?? 1)
  const [hours, setHours]         = useState(Math.min(data.hoursPerSession ?? 3, HOURS_MAX))
  const [rate, setRate]           = useState(Math.min(data.hourlyRate ?? 16, RATE_MAX))
  const [days, setDays]           = useState<string[]>((data.preferredDays ?? []).map(d => d.toLowerCase()))
  const [time, setTime]           = useState(data.preferredTime ?? '')
  const [tasks, setTasks]         = useState<string[]>(data.tasks ?? [])
  const [notes, setNotes]         = useState(data.sessionNotes ?? data.scheduleNotes ?? '')

  const toggleDay  = (d: string) => setDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])
  const toggleTask = (t: string) => setTasks(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])

  const displayRate  = rate  >= RATE_MAX  ? 30 : rate
  const displayHours = hours >= HOURS_MAX ? 4  : hours
  const estPerClean  = (displayHours * displayRate).toFixed(2)

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '20px', fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ background: 'white', borderRadius: '24px', width: '100%', maxWidth: '580px', maxHeight: '88vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ position: 'sticky', top: 0, background: 'white', borderBottom: '1px solid #f1f5f9', padding: '18px 24px', zIndex: 10, borderRadius: '24px 24px 0 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>Edit your request</div>
            <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>✕</button>
          </div>
        </div>
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '22px' }}>
          <div style={{ background: '#fefce8', border: '1px solid #fef08a', borderRadius: '12px', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '2px' }}>Offered rate</div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#78350f' }}>{formatRate(rate)}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '2px' }}>Est. per clean</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#92400e' }}>~£{estPerClean}</div>
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>Property & clean info</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Stepper label="Bedrooms" value={bedrooms} onDown={() => setBedrooms(v => Math.max(1, v - 1))} onUp={() => setBedrooms(v => Math.min(BED_MAX, v + 1))} atMin={bedrooms <= 1} atMax={bedrooms >= BED_MAX} display={formatBedrooms(bedrooms)} />
              <Stepper label="Bathrooms" value={bathrooms} onDown={() => setBathrooms(v => Math.max(1, v - 1))} onUp={() => setBathrooms(v => Math.min(BATH_MAX, v + 1))} atMin={bathrooms <= 1} atMax={bathrooms >= BATH_MAX} display={formatBathrooms(bathrooms)} />
              <Stepper label="Hours per clean" value={hours} onDown={() => setHours(v => Math.max(HOURS_MIN, parseFloat((v - 0.5).toFixed(1))))} onUp={() => setHours(v => Math.min(HOURS_MAX, parseFloat((v + 0.5).toFixed(1))))} atMin={hours <= HOURS_MIN} atMax={hours >= HOURS_MAX} display={formatHours(hours)} />
              <Stepper label="Hourly rate" value={rate} onDown={() => setRate(v => Math.max(RATE_MIN, parseFloat((v - RATE_STEP).toFixed(2))))} onUp={() => setRate(v => Math.min(RATE_MAX, parseFloat((v + RATE_STEP).toFixed(2))))} atMin={rate <= RATE_MIN} atMax={rate >= RATE_MAX} display={formatRate(rate)} />
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>Standard tasks</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {STANDARD_TASK_LIST.map(task => { const sel = tasks.includes(task.id); return <button key={task.id} onClick={() => toggleTask(task.id)} style={{ padding: '7px 14px', borderRadius: '100px', fontSize: '13px', fontWeight: 600, border: sel ? '2px solid #3b82f6' : '1.5px solid #e2e8f0', background: sel ? '#eff6ff' : 'white', color: sel ? '#1d4ed8' : '#64748b', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>{task.label}</button> })}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>Special requests</div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '10px' }}>Deep cleans, ironing, laundry etc.</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {EXTRA_TASK_LIST.map(task => { const sel = tasks.includes(task.id); return <button key={task.id} onClick={() => toggleTask(task.id)} style={{ padding: '7px 14px', borderRadius: '100px', fontSize: '13px', fontWeight: 600, border: sel ? '2px solid #f59e0b' : '1.5px solid #e2e8f0', background: sel ? '#fffbeb' : 'white', color: sel ? '#92400e' : '#64748b', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>{task.label}</button> })}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>Preferred days</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
              {ALL_DAYS.map(day => { const sel = days.includes(day); return <button key={day} onClick={() => toggleDay(day)} style={{ padding: '7px 14px', borderRadius: '100px', fontSize: '13px', fontWeight: 600, border: sel ? '2px solid #3b82f6' : '1.5px solid #e2e8f0', background: sel ? '#eff6ff' : 'white', color: sel ? '#1d4ed8' : '#64748b', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>{DAY_SHORT[day]}</button> })}
            </div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>Time of day</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {TIME_SLOTS.map(slot => { const sel = time === slot; return <button key={slot} onClick={() => setTime(sel ? '' : slot)} style={{ padding: '7px 14px', borderRadius: '100px', fontSize: '13px', fontWeight: 600, border: sel ? '2px solid #3b82f6' : '1.5px solid #e2e8f0', background: sel ? '#eff6ff' : 'white', color: sel ? '#1d4ed8' : '#64748b', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>{slot}</button> })}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>Notes for your cleaner</div>
            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '10px', lineHeight: 1.4 }}>💡 Customers who add notes get better results — tell your cleaner what matters most to you.</div>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Please focus extra time on the kitchen each visit. Avoid the top floor on alternate weeks. The cat is friendly!" style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #e2e8f0', borderRadius: '12px', fontSize: '13px', fontFamily: "'DM Sans', sans-serif", resize: 'vertical', minHeight: '88px', outline: 'none', color: '#0f172a', boxSizing: 'border-box', lineHeight: 1.55 }} />
          </div>
          <button onClick={() => onSave({ bedrooms, bathrooms, hoursPerSession: hours, hourlyRate: rate, preferredDays: days, preferredTime: time, tasks, sessionNotes: notes })} style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg, #16a34a, #22c55e)', color: 'white', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", boxShadow: '0 4px 16px rgba(22,163,74,0.25)' }}>
            Save changes
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ReviewPublishPage() {
  const router = useRouter()
  const [data, setData] = useState<RequestData | null>(null)
  const [showEdit, setShowEdit] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [published, setPublished] = useState(false)
  const [publishedZone, setPublishedZone] = useState<string>("")
  const [userId, setUserId] = useState<string | null>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const publishLock = useRef(false)

  useEffect(() => {
    const loaded = getRequestData()
    if (!loaded) { router.push("/request/property"); return }
    setData(loaded)
    if (getPublishedId()) {
      setPublished(true)
      setPublishedZone(getAreaLabel(loaded))
      return
    }
    const supabase = createClient()
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        // Role guard: cleaners cannot post listings
        const { data: profile } = await (supabase as any)
          .from('profiles').select('role').eq('id', session.user.id).single()
        if (profile?.role === 'cleaner') {
          router.replace('/cleaner/dashboard')
          return
        }
        setUserId(session.user.id)
      }
      setAuthChecked(true)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) setUserId(session.user.id)
      else setUserId(null)
    })
    return () => subscription.unsubscribe()
  }, [router])

  const handleSaveEdit = (updated: Partial<RequestData>) => {
    const newData = { ...data, ...updated }
    setData(newData)
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(newData))
      localStorage.setItem(BACKUP_KEY, JSON.stringify(newData))
    } catch {}
    setShowEdit(false)
  }

  const handlePublish = async () => {
    if (publishLock.current || isPublishing) return
    publishLock.current = true
    if (!data) { publishLock.current = false; return }
    if (!userId) {
      toast.error("Please sign in before publishing.")
      router.push("/auth/login?redirectTo=/request/preview")
      publishLock.current = false
      return
    }
    setIsPublishing(true)
    try {
      // ✅ Final safety check — block cleaners from publishing
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await (supabase as any)
          .from('profiles').select('role').eq('id', user.id).single()
        if ((profile as any)?.role === 'cleaner') {
          router.replace('/cleaner/dashboard')
          publishLock.current = false
          return
        }
      }
      const requestId = await publishRequest(data, userId)
      setPublishedId(requestId)
      clearRequestData()
      setPublishedZone(getAreaLabel(data))
      setPublished(true)
      toast.success("Your request is live!")
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong. Please try again.")
      publishLock.current = false
    } finally {
      setIsPublishing(false)
    }
  }

  if (!data || !authChecked) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ fontSize: "14px", color: "#94a3b8" }}>Loading…</div>
    </div>
  )

  if (published) return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg, #f0f7ff 0%, #fefce8 50%, #f0fdf4 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif", padding: "24px", textAlign: "center" }}>
      <div style={{ maxWidth: "400px" }}>
        <div style={{ fontSize: "64px", marginBottom: "24px" }}>🎉</div>
        <h2 style={{ fontSize: "28px", fontWeight: 800, color: "#0f172a", margin: "0 0 12px" }}>You're live!</h2>
        <p style={{ fontSize: "16px", color: "#64748b", lineHeight: 1.6, margin: "0 0 28px" }}>
          Your request is now visible to cleaners in {publishedZone}. You'll be notified as soon as someone applies.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <button onClick={() => router.push("/customer/dashboard")} style={{ padding: "16px 32px", borderRadius: "14px", border: "none", background: "linear-gradient(135deg, #2563eb, #3b82f6)", color: "white", fontSize: "16px", fontWeight: 700, fontFamily: "'DM Sans', sans-serif", cursor: "pointer", boxShadow: "0 4px 20px rgba(37,99,235,0.35)" }}>
            Go to my dashboard →
          </button>
          <Link href="/jobs" style={{ padding: "14px 32px", borderRadius: "14px", border: "1.5px solid #e2e8f0", background: "white", color: "#64748b", fontSize: "14px", fontWeight: 600, fontFamily: "'DM Sans', sans-serif", textDecoration: "none", display: "block" }}>
            See your request on the jobs board →
          </Link>
        </div>
      </div>
    </div>
  )

  const pricing = PRICING[data.frequency ?? ""] ?? PRICING.fortnightly
  const rate = typeof data.hourlyRate === "number" ? data.hourlyRate : 0
  const hours = typeof data.hoursPerSession === "number" ? data.hoursPerSession : null
  const displayRate = rate >= RATE_MAX ? 30 : rate
  const displayHours = hours !== null && hours >= HOURS_MAX ? 4 : hours
  const estPerClean = rate > 0 && hours ? displayRate * (displayHours ?? 0) : null
  const daysLabel = data.preferredDays?.length ? data.preferredDays.map(d => d.slice(0, 3)).join(' · ') : null
  const addressFormatted = formatAddress(data.addressLine1 ?? '', data.addressLine2 ?? '', data.postcode ?? '')
  const notes = data.sessionNotes || data.scheduleNotes
  const areaLabel = getAreaLabel(data)

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
      <style>{`* { box-sizing: border-box; } .go-live-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(22,163,74,0.4) !important; }`}</style>

      <div style={{ minHeight: "100vh", background: "linear-gradient(160deg, #f0f7ff 0%, #fefce8 50%, #f0fdf4 100%)", fontFamily: "'DM Sans', sans-serif", padding: "24px 16px 48px" }}>
        <div style={{ maxWidth: "540px", margin: "0 auto" }}>

          <div style={{ marginBottom: "28px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "#3b82f6", letterSpacing: "0.05em", textTransform: "uppercase" }}>Almost there</div>
              <button onClick={() => router.back()} style={{ fontSize: "13px", fontWeight: 600, color: "#94a3b8", background: "none", border: "none", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>← Back</button>
            </div>
            <div style={{ height: "4px", background: "#e2e8f0", borderRadius: "100px", overflow: "hidden" }}>
              <div style={{ height: "100%", width: "100%", background: "linear-gradient(90deg, #3b82f6, #22c55e)", borderRadius: "100px" }} />
            </div>
          </div>

          <div style={{ marginBottom: "20px" }}>
            <h1 style={{ fontSize: "26px", fontWeight: 800, color: "#0f172a", margin: "0 0 6px" }}>Here's your listing</h1>
            <p style={{ fontSize: "14px", color: "#64748b", margin: 0 }}>This is what cleaners will see. Happy with it? Go live.</p>
          </div>

          {!userId && (
            <div style={{ background: "#fffbeb", border: "1.5px solid #fcd34d", borderRadius: "16px", padding: "14px 18px", marginBottom: "16px", display: "flex", gap: "10px", alignItems: "flex-start" }}>
              <span style={{ fontSize: "16px", flexShrink: 0 }}>⚠️</span>
              <div>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "#92400e", marginBottom: "4px" }}>You're not signed in</div>
                <div style={{ fontSize: "13px", color: "#a16207" }}>
                  <Link href="/request/preview" style={{ color: "#2563eb", fontWeight: 600, textDecoration: "none" }}>Sign in or create an account</Link> to publish.
                </div>
              </div>
            </div>
          )}

          <div style={{ background: "white", borderRadius: "20px", border: "1.5px solid #e2e8f0", boxShadow: "0 4px 24px rgba(0,0,0,0.07)", overflow: "hidden", marginBottom: "14px" }}>

            <div style={{ background: "linear-gradient(135deg, #1e40af, #3b82f6)", padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ fontSize: "10px", fontWeight: 700, color: "rgba(255,255,255,0.65)", textTransform: "uppercase", letterSpacing: "0.08em", background: "rgba(255,255,255,0.12)", borderRadius: "100px", padding: "3px 10px", whiteSpace: "nowrap" }}>Live preview</div>
                {/* ✅ FIX: use areaLabel which resolves zone → human readable name */}
                <div style={{ fontSize: "16px", fontWeight: 800, color: "white" }}>📍 {areaLabel}</div>
              </div>
              <button onClick={() => setShowEdit(true)} title="Edit listing" style={{ background: "rgba(255,255,255,0.15)", border: "1.5px solid rgba(255,255,255,0.25)", borderRadius: "10px", width: "36px", height: "36px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                </svg>
              </button>
            </div>

            <div style={{ padding: "18px 20px" }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "14px" }}>
                {data.bedrooms && <span style={{ background: "#f1f5f9", borderRadius: "100px", padding: "4px 12px", fontSize: "12px", fontWeight: 600, color: "#475569" }}>{formatBedrooms(data.bedrooms)} bed</span>}
                {data.bathrooms && <span style={{ background: "#f1f5f9", borderRadius: "100px", padding: "4px 12px", fontSize: "12px", fontWeight: 600, color: "#475569" }}>{formatBathrooms(data.bathrooms)} bath</span>}
                {hours !== null && <span style={{ background: "#f1f5f9", borderRadius: "100px", padding: "4px 12px", fontSize: "12px", fontWeight: 600, color: "#475569" }}>{formatHours(hours)}</span>}
                {pricing && <span style={{ background: "#f1f5f9", borderRadius: "100px", padding: "4px 12px", fontSize: "12px", fontWeight: 600, color: "#475569" }}>{pricing.label}</span>}
                {daysLabel && <span style={{ background: "#f1f5f9", borderRadius: "100px", padding: "4px 12px", fontSize: "12px", fontWeight: 600, color: "#475569" }}>{daysLabel}</span>}
                {data.preferredTime && <span style={{ background: "#f1f5f9", borderRadius: "100px", padding: "4px 12px", fontSize: "12px", fontWeight: 600, color: "#475569" }}>{data.preferredTime}</span>}
              </div>

              {(data.tasks ?? []).length > 0 && (
                <div style={{ marginBottom: "14px" }}>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>Tasks</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {(data.tasks ?? []).map((id, i) => {
                      const isExtra = EXTRA_TASKS.includes(id)
                      return (
                        <span key={i} style={{ background: isExtra ? "#fffbeb" : "#f0fdf4", border: `1px solid ${isExtra ? "#fde68a" : "#bbf7d0"}`, color: isExtra ? "#92400e" : "#15803d", fontSize: "12px", fontWeight: 600, padding: "4px 10px", borderRadius: "100px" }}>
                          {TASK_LABELS[id] ?? id}
                        </span>
                      )
                    })}
                  </div>
                </div>
              )}

              <div style={{ marginBottom: "14px" }}>
                {notes ? (
                  <div style={{ padding: "10px 14px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>Notes for cleaner</div>
                    <div style={{ fontSize: "13px", color: "#475569", fontStyle: "italic" }}>"{notes}"</div>
                  </div>
                ) : (
                  <button onClick={() => setShowEdit(true)} style={{ width: "100%", padding: "10px 14px", background: "#f8fafc", border: "1.5px dashed #cbd5e1", borderRadius: "10px", cursor: "pointer", textAlign: "left", fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "14px" }}>✍️</span>
                    <span style={{ fontSize: "13px", color: "#64748b" }}><strong style={{ color: "#475569" }}>Add notes for your cleaner</strong> — customers who add notes get better results</span>
                  </button>
                )}
              </div>

              <div style={{ background: "linear-gradient(135deg, #fefce8, rgba(254,240,138,0.2))", border: "1.5px solid #fef08a", borderRadius: "12px", padding: "14px 16px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "14px" }}>
                <div>
                  <div style={{ fontSize: "11px", color: "#92400e", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Offered rate</div>
                  <div style={{ fontSize: "22px", fontWeight: 800, color: "#78350f" }}>{formatRate(rate)}</div>
                  {hours !== null && <div style={{ fontSize: "12px", color: "#92400e", marginTop: "2px" }}>{formatHours(hours)} per clean</div>}
                </div>
                {estPerClean !== null && (
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "11px", color: "#92400e", fontWeight: 600 }}>Est. per clean</div>
                    <div style={{ fontSize: "18px", fontWeight: 700, color: "#78350f" }}>~£{estPerClean.toFixed(2)}</div>
                  </div>
                )}
              </div>

              <div style={{ padding: "10px 14px", background: "rgba(59,130,246,0.05)", borderRadius: "10px", border: "1px solid #dbeafe", display: "flex", gap: "8px", alignItems: "flex-start" }}>
                <span style={{ fontSize: "14px", flexShrink: 0 }}>🔒</span>
                <div>
                  <div style={{ fontSize: "12px", fontWeight: 600, color: "#1e40af", marginBottom: "2px" }}>{areaLabel}, West Sussex</div>
                  <div style={{ fontSize: "11px", color: "#3b82f6", lineHeight: 1.4 }}>Only your area is shown publicly. Your full address is only shared with your chosen cleaner.</div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ background: "white", borderRadius: "14px", border: "1px solid #e2e8f0", padding: "14px 18px", marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a", marginBottom: "2px" }}>Vouchee fee · {pricing.label}</div>
              <div style={{ fontSize: "11px", color: "#94a3b8" }}>Direct Debit set up once you've chosen a cleaner and start date</div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0, marginLeft: "12px" }}>
              <div style={{ fontSize: "15px", fontWeight: 800, color: "#475569" }}>£{pricing.pricePerSession.toFixed(2)}<span style={{ fontSize: "11px", fontWeight: 500 }}>/clean</span></div>
              <div style={{ fontSize: "11px", color: "#94a3b8" }}>£{pricing.monthlyCharge.toFixed(2)}/mo</div>
            </div>
          </div>

          <button className="go-live-btn" onClick={() => userId ? handlePublish() : router.push("/auth/login?redirectTo=/request/preview")} disabled={isPublishing} style={{ width: "100%", padding: "20px", borderRadius: "16px", border: "none", background: isPublishing ? "#e2e8f0" : "linear-gradient(135deg, #16a34a, #22c55e)", color: isPublishing ? "#94a3b8" : "white", fontSize: "18px", fontWeight: 800, fontFamily: "'Plus Jakarta Sans', sans-serif", cursor: isPublishing ? "not-allowed" : "pointer", boxShadow: isPublishing ? "none" : "0 4px 20px rgba(22,163,74,0.3)", transition: "transform 0.2s, box-shadow 0.2s" }}>
            {isPublishing ? "Publishing…" : userId ? "🚀 Go live" : "Sign in to publish →"}
          </button>

          <p style={{ textAlign: "center", fontSize: "12px", color: "#94a3b8", marginTop: "12px", lineHeight: 1.5 }}>
            You can pause or remove your listing at any time from your dashboard.{" "}
            <Link href="/legal/terms" style={{ color: "#3b82f6", textDecoration: "none" }}>Full terms</Link>
          </p>

        </div>
      </div>

      {showEdit && <EditModal data={data} onSave={handleSaveEdit} onClose={() => setShowEdit(false)} />}
    </>
  )
}
