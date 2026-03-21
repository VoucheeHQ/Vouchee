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

function getSectorFromPostcode(postcode: string): string | null {
  if (!postcode) return null
  const clean = postcode.toUpperCase().replace(/\s+/g, "").trim()
  for (const sector of Object.keys(SECTOR_TO_ZONE)) {
    if (clean.startsWith(sector.replace(" ", ""))) return SECTOR_TO_ZONE[sector]
  }
  return null
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

// ── Edit Modal (same pattern as dashboard) ─────────────────────────────────

const ALL_TASKS_EDIT = [
  { id: 'general', label: 'General cleaning' }, { id: 'hoovering', label: 'Hoovering' },
  { id: 'mopping', label: 'Mopping' }, { id: 'bathroom', label: 'Bathroom clean' },
  { id: 'kitchen', label: 'Kitchen clean' }, { id: 'bins', label: 'Emptying all bins' },
  { id: 'bathroom_deep', label: 'Bathroom deep clean' }, { id: 'kitchen_deep', label: 'Kitchen deep clean' },
  { id: 'ironing', label: 'Ironing' }, { id: 'laundry', label: 'Laundry' },
  { id: 'changing_beds', label: 'Changing beds' }, { id: 'windows_interior', label: 'Interior windows' },
  { id: 'fridge', label: 'Fridge clean' }, { id: 'blinds', label: 'Blinds' },
  { id: 'skirting', label: 'Skirting boards' }, { id: 'conservatory', label: 'Conservatory' },
]

const TIME_SLOTS = ['Morning (8am - 12pm)', 'Afternoon (12pm - 5pm)', 'Evening (5pm - 8pm)']
const ALL_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const DAY_SHORT: Record<string, string> = { monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun' }

function EditModal({ data, onSave, onClose }: {
  data: RequestData
  onSave: (updated: Partial<RequestData>) => void
  onClose: () => void
}) {
  const [bedrooms, setBedrooms] = useState(data.bedrooms ?? 2)
  const [bathrooms, setBathrooms] = useState(data.bathrooms ?? 1)
  const [hours, setHours] = useState(data.hoursPerSession ?? 3)
  const [rate, setRate] = useState(data.hourlyRate ?? 16)
  const [days, setDays] = useState<string[]>((data.preferredDays ?? []).map(d => d.toLowerCase()))
  const [time, setTime] = useState(data.preferredTime ?? '')
  const [tasks, setTasks] = useState<string[]>(data.tasks ?? [])
  const [notes, setNotes] = useState(data.sessionNotes ?? '')

  const toggleDay = (d: string) => setDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])
  const toggleTask = (t: string) => setTasks(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])

  const estPerSession = (hours * rate).toFixed(2)

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 200 }}>
      <div style={{ background: 'white', borderRadius: '24px 24px 0 0', width: '100%', maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 -8px 40px rgba(0,0,0,0.15)', fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ position: 'sticky', top: 0, background: 'white', borderBottom: '1px solid #f1f5f9', padding: '16px 24px', zIndex: 10 }}>
          <div style={{ width: '40px', height: '4px', background: '#e2e8f0', borderRadius: '2px', margin: '0 auto 16px' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>Edit your request</div>
            <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>✕</button>
          </div>
        </div>

        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Property */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>Property</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { label: 'Bedrooms', val: bedrooms, set: setBedrooms, min: 1, max: 8 },
                { label: 'Bathrooms', val: bathrooms, set: setBathrooms, min: 1, max: 6 },
                { label: 'Hours per session', val: hours, set: setHours, min: 1, max: 10, step: 0.5, suffix: ' hrs' },
                { label: 'Hourly rate', val: rate, set: setRate, min: 12, max: 40, step: 0.5, prefix: '£', suffix: '/hr' },
              ].map(({ label, val, set, min, max, step = 1, prefix = '', suffix = '' }) => (
                <div key={label} style={{ background: '#f8fafc', borderRadius: '12px', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>{label}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button onClick={() => set((v: number) => Math.max(min, parseFloat((v - step).toFixed(2))))} disabled={val <= min} style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1.5px solid #e2e8f0', background: val <= min ? '#f8fafc' : 'white', fontSize: '18px', color: val <= min ? '#cbd5e1' : '#0f172a', cursor: val <= min ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                    <span style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', minWidth: '56px', textAlign: 'center' }}>{prefix}{typeof val === 'number' && !Number.isInteger(val) ? val.toFixed(1) : val}{suffix}</span>
                    <button onClick={() => set((v: number) => Math.min(max, parseFloat((v + step).toFixed(2))))} disabled={val >= max} style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1.5px solid #e2e8f0', background: val >= max ? '#f8fafc' : 'white', fontSize: '18px', color: val >= max ? '#cbd5e1' : '#0f172a', cursor: val >= max ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '8px', padding: '10px 14px', background: '#fefce8', border: '1px solid #fef08a', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span style={{ color: '#92400e', fontWeight: 600 }}>Est. per session</span>
              <span style={{ color: '#78350f', fontWeight: 800 }}>~£{estPerSession}</span>
            </div>
          </div>

          {/* Tasks */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>Tasks</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {ALL_TASKS_EDIT.map(task => {
                const sel = tasks.includes(task.id)
                return (
                  <button key={task.id} onClick={() => toggleTask(task.id)} style={{ padding: '7px 14px', borderRadius: '100px', fontSize: '13px', fontWeight: 600, border: sel ? '2px solid #22c55e' : '1.5px solid #e2e8f0', background: sel ? '#f0fdf4' : 'white', color: sel ? '#15803d' : '#64748b', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                    {task.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Schedule */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>Preferred days</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
              {ALL_DAYS.map(day => {
                const sel = days.includes(day)
                return <button key={day} onClick={() => toggleDay(day)} style={{ padding: '7px 14px', borderRadius: '100px', fontSize: '13px', fontWeight: 600, border: sel ? '2px solid #3b82f6' : '1.5px solid #e2e8f0', background: sel ? '#eff6ff' : 'white', color: sel ? '#1d4ed8' : '#64748b', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>{DAY_SHORT[day]}</button>
              })}
            </div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>Preferred time</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
              {TIME_SLOTS.map(slot => {
                const sel = time === slot
                return <button key={slot} onClick={() => setTime(sel ? '' : slot)} style={{ padding: '7px 14px', borderRadius: '100px', fontSize: '13px', fontWeight: 600, border: sel ? '2px solid #3b82f6' : '1.5px solid #e2e8f0', background: sel ? '#eff6ff' : 'white', color: sel ? '#1d4ed8' : '#64748b', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>{slot}</button>
              })}
            </div>
          </div>

          {/* Notes */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>Notes for your cleaner</div>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. focus extra time on the kitchen, avoid the top floor on alternate weeks…" style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #e2e8f0', borderRadius: '12px', fontSize: '13px', fontFamily: "'DM Sans', sans-serif", resize: 'vertical', minHeight: '72px', outline: 'none', color: '#0f172a', boxSizing: 'border-box' }} />
          </div>

          <button
            onClick={() => onSave({ bedrooms, bathrooms, hoursPerSession: hours, hourlyRate: rate, preferredDays: days, preferredTime: time, tasks, sessionNotes: notes })}
            style={{ width: '100%', padding: '14px', background: '#0f172a', color: 'white', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
          >
            Save changes
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

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
      setPublishedZone(loaded.sector ?? loaded.postcode ?? "your area")
      return
    }

    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setUserId(session.user.id)
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
      const requestId = await publishRequest(data, userId)
      setPublishedId(requestId)
      clearRequestData()
      setPublishedZone(data.sector ?? data.postcode ?? "your area")
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
  const taskLabels = (data.tasks ?? []).map(id => TASK_LABELS[id] ?? id)
  const rate = typeof data.hourlyRate === "number" ? data.hourlyRate : 0
  const hours = typeof data.hoursPerSession === "number" ? data.hoursPerSession : null
  const estPerSession = rate > 0 && hours ? rate * hours : null
  const daysLabel = data.preferredDays?.length ? data.preferredDays.map(d => d.slice(0,3)).join(' · ') : null

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
      <div style={{ minHeight: "100vh", background: "linear-gradient(160deg, #f0f7ff 0%, #fefce8 50%, #f0fdf4 100%)", fontFamily: "'DM Sans', sans-serif", padding: "24px 16px 48px" }}>
        <div style={{ maxWidth: "540px", margin: "0 auto" }}>

          {/* Progress */}
          <div style={{ marginBottom: "28px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "#3b82f6", letterSpacing: "0.05em", textTransform: "uppercase" }}>Almost there</div>
              <button onClick={() => router.back()} style={{ fontSize: "13px", fontWeight: 600, color: "#94a3b8", background: "none", border: "none", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>← Back</button>
            </div>
            <div style={{ height: "4px", background: "#e2e8f0", borderRadius: "100px", overflow: "hidden" }}>
              <div style={{ height: "100%", width: "100%", background: "linear-gradient(90deg, #3b82f6, #22c55e)", borderRadius: "100px" }} />
            </div>
          </div>

          {/* Header */}
          <div style={{ marginBottom: "24px" }}>
            <h1 style={{ fontSize: "26px", fontWeight: 800, color: "#0f172a", margin: "0 0 6px" }}>Here's your listing</h1>
            <p style={{ fontSize: "14px", color: "#64748b", margin: 0 }}>This is exactly what cleaners will see. Happy with it? Go live.</p>
          </div>

          {/* Not signed in warning */}
          {!userId && (
            <div style={{ background: "#fffbeb", border: "1.5px solid #fcd34d", borderRadius: "16px", padding: "14px 18px", marginBottom: "20px", display: "flex", gap: "10px", alignItems: "flex-start" }}>
              <span style={{ fontSize: "16px", flexShrink: 0 }}>⚠️</span>
              <div>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "#92400e", marginBottom: "4px" }}>You're not signed in</div>
                <div style={{ fontSize: "13px", color: "#a16207", lineHeight: 1.5 }}>
                  <Link href="/request/preview" style={{ color: "#2563eb", fontWeight: 600, textDecoration: "none" }}>Sign in or create an account</Link> to publish your request.
                </div>
              </div>
            </div>
          )}

          {/* Preview card */}
          <div style={{ background: "white", borderRadius: "20px", border: "1.5px solid #e2e8f0", boxShadow: "0 4px 24px rgba(0,0,0,0.07)", overflow: "hidden", marginBottom: "16px" }}>

            {/* Card header */}
            <div style={{ background: "linear-gradient(135deg, #1e40af, #3b82f6)", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "2px" }}>Your listing preview</div>
                <div style={{ fontSize: "18px", fontWeight: 800, color: "white" }}>
                  📍 {data.sector || data.postcode || "Your area"}
                </div>
              </div>
              <button
                onClick={() => setShowEdit(true)}
                style={{ background: "rgba(255,255,255,0.15)", border: "1.5px solid rgba(255,255,255,0.3)", borderRadius: "10px", padding: "8px 16px", fontSize: "13px", fontWeight: 700, color: "white", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}
              >
                ✏️ Edit
              </button>
            </div>

            <div style={{ padding: "20px" }}>

              {/* Property + schedule chips */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "16px" }}>
                {data.bedrooms && <span style={{ background: "#f1f5f9", borderRadius: "100px", padding: "4px 12px", fontSize: "12px", fontWeight: 600, color: "#475569" }}>{data.bedrooms} bed</span>}
                {data.bathrooms && <span style={{ background: "#f1f5f9", borderRadius: "100px", padding: "4px 12px", fontSize: "12px", fontWeight: 600, color: "#475569" }}>{data.bathrooms} bath</span>}
                {hours && <span style={{ background: "#f1f5f9", borderRadius: "100px", padding: "4px 12px", fontSize: "12px", fontWeight: 600, color: "#475569" }}>{hours} hrs</span>}
                {pricing && <span style={{ background: "#f1f5f9", borderRadius: "100px", padding: "4px 12px", fontSize: "12px", fontWeight: 600, color: "#475569" }}>{pricing.label}</span>}
                {daysLabel && <span style={{ background: "#f1f5f9", borderRadius: "100px", padding: "4px 12px", fontSize: "12px", fontWeight: 600, color: "#475569" }}>{daysLabel}</span>}
                {data.preferredTime && <span style={{ background: "#f1f5f9", borderRadius: "100px", padding: "4px 12px", fontSize: "12px", fontWeight: 600, color: "#475569" }}>{data.preferredTime}</span>}
              </div>

              {/* Tasks */}
              {taskLabels.length > 0 && (
                <div style={{ marginBottom: "16px" }}>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>Tasks</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {taskLabels.map((t, i) => (
                      <span key={i} style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#15803d", fontSize: "12px", fontWeight: 600, padding: "4px 10px", borderRadius: "100px" }}>{t}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {(data.sessionNotes || data.scheduleNotes) && (
                <div style={{ marginBottom: "16px", padding: "10px 14px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>Notes</div>
                  <div style={{ fontSize: "13px", color: "#475569", fontStyle: "italic" }}>"{data.sessionNotes || data.scheduleNotes}"</div>
                </div>
              )}

              {/* Address privacy notice */}
              <div style={{ padding: "10px 14px", background: "rgba(59,130,246,0.05)", borderRadius: "10px", display: "flex", gap: "8px" }}>
                <span style={{ fontSize: "13px", flexShrink: 0 }}>🔒</span>
                <span style={{ fontSize: "12px", color: "#475569", lineHeight: 1.5 }}>Only your area is shown publicly. Your full address is only shared with your chosen cleaner.</span>
              </div>
            </div>
          </div>

          {/* Payment summary */}
          <div style={{ background: "white", borderRadius: "20px", border: "1.5px solid #e2e8f0", padding: "20px", marginBottom: "24px", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
            <div style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a", marginBottom: "14px" }}>💷 Payment summary</div>

            {/* Cleaner payment — primary */}
            <div style={{ background: "#fefce8", border: "1px solid #fef08a", borderRadius: "12px", padding: "14px 16px", marginBottom: "10px" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#92400e", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>Paid directly to your cleaner</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                <div>
                  <div style={{ fontSize: "22px", fontWeight: 800, color: "#78350f", lineHeight: 1 }}>
                    £{rate > 0 ? rate.toFixed(2) : "—"}<span style={{ fontSize: "13px", fontWeight: 500 }}>/hr</span>
                  </div>
                  {hours && <div style={{ fontSize: "12px", color: "#92400e", marginTop: "3px" }}>{hours} hrs per session</div>}
                </div>
                {estPerSession && (
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "11px", color: "#92400e", fontWeight: 600 }}>Est. per session</div>
                    <div style={{ fontSize: "18px", fontWeight: 800, color: "#78350f" }}>~£{estPerSession.toFixed(2)}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Vouchee fee — secondary */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
              <div>
                <div style={{ fontSize: "12px", fontWeight: 600, color: "#475569" }}>Vouchee platform fee</div>
                <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>{pricing.label} plan · billed monthly</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "15px", fontWeight: 700, color: "#64748b" }}>£{pricing.pricePerSession.toFixed(2)}/clean</div>
                <div style={{ fontSize: "11px", color: "#94a3b8" }}>£{pricing.monthlyCharge.toFixed(2)}/month</div>
              </div>
            </div>

            <p style={{ fontSize: "11px", color: "#94a3b8", margin: "10px 0 0", lineHeight: 1.5 }}>
              Your Direct Debit doesn't start until you've chosen your cleaner and confirmed a start date.
            </p>
          </div>

          {/* Go live CTA */}
          <button
            onClick={() => userId ? handlePublish() : router.push("/auth/login?redirectTo=/request/preview")}
            disabled={isPublishing}
            style={{
              width: "100%", padding: "20px", borderRadius: "16px", border: "none",
              background: isPublishing ? "#e2e8f0" : "linear-gradient(135deg, #16a34a, #22c55e)",
              color: isPublishing ? "#94a3b8" : "white",
              fontSize: "18px", fontWeight: 800,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              cursor: isPublishing ? "not-allowed" : "pointer",
              boxShadow: isPublishing ? "none" : "0 6px 24px rgba(22,163,74,0.35)",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={e => { if (!isPublishing) (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)" }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)" }}
          >
            {isPublishing ? "Publishing…" : userId ? "🚀 Go live" : "Sign in to publish →"}
          </button>

          <p style={{ textAlign: "center", fontSize: "12px", color: "#94a3b8", marginTop: "12px", lineHeight: 1.5 }}>
            You can pause or remove your listing at any time from your dashboard.{" "}
            <Link href="/legal/terms" style={{ color: "#3b82f6", textDecoration: "none" }}>Full terms</Link>
          </p>

        </div>
      </div>

      {showEdit && (
        <EditModal data={data} onSave={handleSaveEdit} onClose={() => setShowEdit(false)} />
      )}
    </>
  )
}
