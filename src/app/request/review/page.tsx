"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

const TASK_LABELS: Record<string, string> = {
  general: "General cleaning",
  hoovering: "Hoovering",
  mopping: "Mopping",
  bathroom: "Bathroom clean",
  kitchen: "Kitchen clean",
  windows_interior: "Interior windows",
  oven: "Oven cleaning",
  bathroom_deep: "Bathroom deep clean",
  kitchen_deep: "Kitchen deep clean",
  fridge: "Fridge clean",
  blinds: "Blinds",
  mold: "Mould removal",
  ironing: "Ironing",
  laundry: "Laundry",
  changing_beds: "Changing beds",
  garage: "Garage / utility",
}

const PRICING: Record<string, { pricePerSession: number; monthlyCharge: number; sessionsPerMonth: string; label: string }> = {
  weekly:      { pricePerSession: 9.99,  monthlyCharge: 43.33, sessionsPerMonth: "~4.33 sessions/month", label: "Weekly" },
  fortnightly: { pricePerSession: 14.99, monthlyCharge: 32.48, sessionsPerMonth: "~2.17 sessions/month", label: "Fortnightly" },
  monthly:     { pricePerSession: 19.99, monthlyCharge: 19.99, sessionsPerMonth: "1 session/month",      label: "Monthly" },
}

// Map postcode sector → zone enum
const SECTOR_TO_ZONE: Record<string, string> = {
  "RH121": "central_south_east",
  "RH122": "central_south_east",
  "RH125": "north_west",
  "RH124": "north_east_roffey",
  "RH123": "south_west",
  "RH126": "warnham_north",
  "RH138": "broadbridge_heath",
  "RH136": "mannings_heath",
  "RH110": "faygate_kilnwood_vale",
  "RH130": "christs_hospital",
}

function getSectorFromPostcode(postcode: string): string | null {
  if (!postcode) return null
  const clean = postcode.toUpperCase().replace(/\s+/g, " ").trim()
  // Try matching known sectors
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
  tasks?: string[]
  preferredDays?: string[]
  preferredTime?: string
  scheduleNotes?: string
  frequency?: string
  hourlyRate?: number
  hoursPerSession?: number
  finalNotes?: string
}

// ── Storage helpers ────────────────────────────────────────────

const STORAGE_KEY = "cleanRequest"
const BACKUP_KEY = "cleanRequest_backup"
const PUBLISHED_KEY = "cleanRequest_published_id"

function saveRequestData(data: Partial<RequestData>) {
  try {
    const existing = getRequestData() ?? {}
    const merged = JSON.stringify({ ...existing, ...data })
    sessionStorage.setItem(STORAGE_KEY, merged)
    localStorage.setItem(BACKUP_KEY, merged)
  } catch {}
}

function getRequestData(): RequestData | null {
  try {
    // Try sessionStorage first, fall back to localStorage backup
    const session = sessionStorage.getItem(STORAGE_KEY)
    if (session) return JSON.parse(session)
    const backup = localStorage.getItem(BACKUP_KEY)
    if (backup) {
      sessionStorage.setItem(STORAGE_KEY, backup)
      return JSON.parse(backup)
    }
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

// ── Supabase publish ───────────────────────────────────────────

async function publishRequest(data: RequestData, userId: string): Promise<string> {
  const supabase = createClient()

  // 1. Upsert profile full_name if available
  // (already handled in preview page, but do it again in case they came via OAuth)
  // No-op if full_name is already set

  // 2. Ensure customer record exists
  const { data: existingCustomer } = await supabase
    .from("customers")
    .select("id")
    .eq("profile_id", userId)
    .single()

  let customerId: string

  if (existingCustomer) {
    customerId = existingCustomer.id
    // Update frequency in case it changed
    await supabase
      .from("customers")
      .update({ frequency: data.frequency ?? "fortnightly" })
      .eq("id", customerId)
  } else {
    // Create customer record
    const { data: newCustomer, error: customerError } = await supabase
      .from("customers")
      .insert({
        profile_id: userId,
        postcode: data.postcode ?? "",
        city: "Horsham",
        address_line1: "",
        frequency: (data.frequency ?? "fortnightly") as any,
        subscription_status: "pending",
      })
      .select("id")
      .single()

    if (customerError || !newCustomer) throw new Error("Failed to create customer record")
    customerId = newCustomer.id
  }

  // 3. Derive zone from postcode or sector label
  const zone = data.zone
    || (data.postcode ? getSectorFromPostcode(data.postcode) : null)
    || null

  // 4. Insert the clean request
  const { data: inserted, error: insertError } = await supabase
    .from("clean_requests")
    .insert({
      customer_id: customerId,
      status: "pending",
      service_type: "regular" as any, // default; can be updated
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
      customer_notes: data.finalNotes ?? null,
      price_per_session: data.hourlyRate && data.hoursPerSession
        ? data.hourlyRate * data.hoursPerSession
        : null,
    })
    .select("id")
    .single()

  if (insertError || !inserted) {
    console.error("Insert error:", insertError)
    throw new Error(insertError?.message ?? "Failed to publish request")
  }

  return inserted.id
}

// ── UI helpers ─────────────────────────────────────────────────

function SectionCard({ title, icon, onEdit, children }: {
  title: string; icon: string; onEdit: () => void; children: React.ReactNode
}) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.82)", backdropFilter: "blur(16px)",
      borderRadius: "20px", border: "1.5px solid rgba(255,255,255,0.9)",
      boxShadow: "0 2px 16px rgba(0,0,0,0.05)", overflow: "hidden", marginBottom: "12px",
    }}>
      <div style={{
        padding: "14px 20px", display: "flex", alignItems: "center",
        justifyContent: "space-between", borderBottom: "1px solid #f1f5f9",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "17px" }}>{icon}</span>
          <span style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>{title}</span>
        </div>
        <button onClick={onEdit} style={{
          fontSize: "13px", fontWeight: 600, color: "#3b82f6", background: "none",
          border: "none", cursor: "pointer", padding: "4px 10px", borderRadius: "8px",
          fontFamily: "'DM Sans', sans-serif",
        }}
          onMouseEnter={e => (e.currentTarget.style.background = "#eff6ff")}
          onMouseLeave={e => (e.currentTarget.style.background = "none")}
        >Edit</button>
      </div>
      <div style={{ padding: "16px 20px" }}>{children}</div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", marginBottom: "6px" }}>
      <span style={{ fontSize: "13px", color: "#94a3b8", flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: "13px", color: "#1e293b", fontWeight: 500, textAlign: "right" }}>{value}</span>
    </div>
  )
}

function Tag({ label }: { label: string }) {
  return (
    <span style={{
      display: "inline-block",
      background: "linear-gradient(135deg, #eff6ff, #dbeafe)",
      color: "#2563eb", fontSize: "12px", fontWeight: 600,
      padding: "4px 10px", borderRadius: "100px", margin: "3px",
    }}>{label}</span>
  )
}

// ── Published preview ──────────────────────────────────────────

function PublishedPreview({ data, pricing, rate, hours, estimated }: {
  data: RequestData
  pricing: typeof PRICING[string]
  rate: number
  hours: number | null
  estimated: number | null
}) {
  const taskLabels = (data.tasks ?? []).map(id => TASK_LABELS[id] ?? id)

  return (
    <div style={{
      background: "rgba(255,255,255,0.95)", borderRadius: "24px",
      border: "1.5px solid rgba(255,255,255,0.9)",
      boxShadow: "0 8px 40px rgba(59,130,246,0.12)",
      overflow: "hidden", marginBottom: "24px",
    }}>
      <div style={{
        background: "linear-gradient(135deg, #1e40af, #3b82f6)",
        padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ fontSize: "12px", fontWeight: 700, color: "rgba(255,255,255,0.9)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
          📋 Your published request
        </div>
        <div style={{ background: "rgba(255,255,255,0.2)", borderRadius: "100px", padding: "3px 10px", fontSize: "11px", fontWeight: 700, color: "white" }}>
          Live preview
        </div>
      </div>
      <div style={{ padding: "20px" }}>
        <div style={{ marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
            <span style={{ fontSize: "16px" }}>📍</span>
            <span style={{ fontSize: "17px", fontWeight: 800, color: "#0f172a" }}>
              {data.sector || data.postcode || "Your area"}
            </span>
          </div>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {[
              data.bedrooms ? `${data.bedrooms} bed` : null,
              data.bathrooms ? `${data.bathrooms} bath` : null,
              pricing.label,
            ].filter(Boolean).map((tag, i) => (
              <span key={i} style={{ background: "#f1f5f9", borderRadius: "100px", padding: "3px 10px", fontSize: "12px", fontWeight: 500, color: "#64748b" }}>{tag}</span>
            ))}
          </div>
        </div>
        {taskLabels.length > 0 && (
          <div style={{ marginBottom: "16px" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              What's needed
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", margin: "-2px" }}>
              {taskLabels.map((t, i) => (
                <span key={i} style={{ display: "inline-block", margin: "2px", background: "linear-gradient(135deg, #f0fdf4, #dcfce7)", color: "#166534", fontSize: "12px", fontWeight: 600, padding: "4px 10px", borderRadius: "100px" }}>{t}</span>
              ))}
            </div>
          </div>
        )}
        {(data.preferredDays?.length || data.preferredTime) && (
          <div style={{ marginBottom: "16px" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Preferred schedule
            </div>
            <div style={{ fontSize: "13px", color: "#475569" }}>
              {data.preferredDays?.length ? data.preferredDays.join(", ") : "Flexible on days"}
              {data.preferredTime ? ` · ${data.preferredTime}` : ""}
            </div>
          </div>
        )}
        <div style={{ background: "linear-gradient(135deg, #fefce8, rgba(254,240,138,0.2))", border: "1.5px solid #fef08a", borderRadius: "14px", padding: "14px 16px", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: "11px", color: "#92400e", fontWeight: 600 }}>Offered rate</div>
            <div style={{ fontSize: "22px", fontWeight: 800, color: "#78350f" }}>
              £{rate.toFixed(2)}<span style={{ fontSize: "13px", fontWeight: 500 }}>/hr</span>
            </div>
            {hours && <div style={{ fontSize: "12px", color: "#92400e", marginTop: "2px" }}>~{hours} hrs per session</div>}
          </div>
          {estimated && (
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "11px", color: "#92400e", fontWeight: 600 }}>Est. per session</div>
              <div style={{ fontSize: "18px", fontWeight: 700, color: "#78350f" }}>~£{estimated.toFixed(2)}</div>
            </div>
          )}
        </div>
        <div style={{ marginTop: "12px", padding: "10px 14px", background: "rgba(59,130,246,0.06)", borderRadius: "10px", display: "flex", gap: "8px" }}>
          <span style={{ fontSize: "13px", flexShrink: 0 }}>🔒</span>
          <span style={{ fontSize: "12px", color: "#475569", lineHeight: 1.5 }}>
            Your full address is never shown on your listing.
          </span>
        </div>
      </div>
    </div>
  )
}

// ── Confirmation popup ─────────────────────────────────────────

function ConfirmationPopup({ onConfirm, onCancel, isPublishing }: {
  onConfirm: () => void; onCancel: () => void; isPublishing: boolean
}) {
  const [checks, setChecks] = useState({ rate: false, details: false, directDebit: false, address: false })
  const allChecked = Object.values(checks).every(Boolean)
  const toggle = (k: keyof typeof checks) => setChecks(p => ({ ...p, [k]: !p[k] }))

  const items: [keyof typeof checks, string][] = [
    ["rate",        "I'm happy with the hourly rate I've advertised"],
    ["details",     "My tasks and property details are accurate"],
    ["directDebit", "I understand my Direct Debit only starts once I've chosen a cleaner and confirmed a start date"],
    ["address",     "I will share my full address directly with my chosen cleaner before the first session"],
  ]

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(15,23,42,0.6)", backdropFilter: "blur(6px)", display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "0 16px 32px" }}>
      <div style={{ width: "100%", maxWidth: "520px", background: "white", borderRadius: "28px", padding: "28px 24px 24px", boxShadow: "0 -8px 40px rgba(0,0,0,0.15)", animation: "slideUp 0.3s ease" }}>
        <style>{`@keyframes slideUp { from { transform: translateY(40px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <div style={{ fontSize: "36px", marginBottom: "10px" }}>🚀</div>
          <h3 style={{ fontSize: "20px", fontWeight: 800, color: "#0f172a", margin: "0 0 6px" }}>Ready to go live?</h3>
          <p style={{ fontSize: "14px", color: "#64748b", margin: 0, lineHeight: 1.5 }}>
            Cleaners in your area will be able to see and apply to your request.
          </p>
        </div>
        <div style={{ background: "#f8fafc", borderRadius: "16px", padding: "16px", marginBottom: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>Confirm before publishing</div>
          {items.map(([key, label]) => (
            <label key={key} style={{ display: "flex", gap: "12px", alignItems: "flex-start", cursor: "pointer" }}>
              <div onClick={() => toggle(key)} style={{ width: "22px", height: "22px", borderRadius: "6px", flexShrink: 0, marginTop: "1px", border: checks[key] ? "2px solid #3b82f6" : "2px solid #cbd5e1", background: checks[key] ? "linear-gradient(135deg, #3b82f6, #2563eb)" : "white", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s ease", cursor: "pointer" }}>
                {checks[key] && <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M2.5 7L5.5 10L11.5 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              </div>
              <span style={{ fontSize: "13px", color: "#374151", lineHeight: 1.5 }}>{label}</span>
            </label>
          ))}
        </div>
        <div style={{ background: "linear-gradient(135deg, #fef2f2, #fee2e2)", border: "1.5px solid #fca5a5", borderRadius: "12px", padding: "10px 14px", marginBottom: "20px", display: "flex", gap: "8px" }}>
          <span style={{ fontSize: "13px", flexShrink: 0 }}>⚠️</span>
          <span style={{ fontSize: "12px", color: "#991b1b", lineHeight: 1.5 }}>You can pause or remove your request at any time from your dashboard.</span>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={onCancel} disabled={isPublishing} style={{ flex: 1, padding: "14px", borderRadius: "14px", border: "1.5px solid #e2e8f0", background: "white", fontSize: "15px", fontWeight: 600, color: "#64748b", cursor: isPublishing ? "not-allowed" : "pointer", fontFamily: "'DM Sans', sans-serif" }}>
            Go back
          </button>
          <button
            onClick={allChecked && !isPublishing ? onConfirm : undefined}
            style={{ flex: 2, padding: "14px", borderRadius: "14px", border: "none", background: allChecked && !isPublishing ? "linear-gradient(135deg, #16a34a, #22c55e)" : "#e2e8f0", color: allChecked && !isPublishing ? "white" : "#94a3b8", fontSize: "15px", fontWeight: 700, cursor: allChecked && !isPublishing ? "pointer" : "not-allowed", fontFamily: "'DM Sans', sans-serif", boxShadow: allChecked && !isPublishing ? "0 4px 16px rgba(22,163,74,0.3)" : "none", transition: "all 0.2s ease" }}
          >
            {isPublishing ? "Publishing…" : "🚀 Go live"}
          </button>
        </div>
        {!allChecked && !isPublishing && (
          <p style={{ textAlign: "center", fontSize: "12px", color: "#94a3b8", marginTop: "10px" }}>Tick all four to continue</p>
        )}
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────

export default function ReviewPublishPage() {
  const router = useRouter()
  const [data, setData] = useState<RequestData | null>(null)
  const [showPopup, setShowPopup] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [published, setPublished] = useState(false)
  const [publishedZone, setPublishedZone] = useState<string>("")
  const [userId, setUserId] = useState<string | null>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const publishLock = useRef(false) // Prevents double-publish

  // ── On mount: restore data + check auth ─────────────────────
  useEffect(() => {
    const loaded = getRequestData()
    if (!loaded) {
      router.push("/request/property")
      return
    }
    setData(loaded)

    // Check if already published this session
    const alreadyPublishedId = getPublishedId()
    if (alreadyPublishedId) {
      setPublished(true)
      setPublishedZone(loaded.sector ?? loaded.postcode ?? "your area")
      return
    }

    // Check auth state (handles OAuth redirect return)
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserId(session.user.id)
      }
      setAuthChecked(true)
    })

    // Listen for auth changes (OAuth provider switches, login events)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUserId(session.user.id)
      } else {
        setUserId(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  // ── Publish handler ──────────────────────────────────────────
  const handlePublish = async () => {
    // Guard: prevent double-publish
    if (publishLock.current || isPublishing) return
    publishLock.current = true

    if (!data) { publishLock.current = false; return }
    if (!userId) {
      toast.error("Please sign in before publishing.")
      setShowPopup(false)
      router.push("/request/preview")
      publishLock.current = false
      return
    }

    setShowPopup(false)
    setIsPublishing(true)

    try {
      const requestId = await publishRequest(data, userId)

      // Mark as published so page refresh doesn't re-publish
      setPublishedId(requestId)

      // Clear the form data
      clearRequestData()

      setPublishedZone(data.sector ?? data.postcode ?? "your area")
      setPublished(true)
      toast.success("Your request is live!")
    } catch (err: any) {
      console.error("Publish error:", err)
      toast.error(err.message ?? "Something went wrong. Please try again.")
      publishLock.current = false
    } finally {
      setIsPublishing(false)
    }
  }

  // ── Loading state ────────────────────────────────────────────
  if (!data || !authChecked) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ fontSize: "14px", color: "#94a3b8" }}>Loading…</div>
    </div>
  )

  // ── Success state ────────────────────────────────────────────
  if (published) return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg, #f0f7ff 0%, #fefce8 50%, #f0fdf4 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif", padding: "24px", textAlign: "center" }}>
      <div style={{ maxWidth: "400px" }}>
        <div style={{ fontSize: "64px", marginBottom: "24px" }}>🎉</div>
        <h2 style={{ fontSize: "28px", fontWeight: 800, color: "#0f172a", margin: "0 0 12px" }}>You're live!</h2>
        <p style={{ fontSize: "16px", color: "#64748b", lineHeight: 1.6, margin: "0 0 28px" }}>
          Your request is now visible to cleaners in {publishedZone}. You'll be notified as soon as someone applies.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <button onClick={() => router.push("/dashboard")} style={{ padding: "16px 32px", borderRadius: "14px", border: "none", background: "linear-gradient(135deg, #2563eb, #3b82f6)", color: "white", fontSize: "16px", fontWeight: 700, fontFamily: "'DM Sans', sans-serif", cursor: "pointer", boxShadow: "0 4px 20px rgba(37,99,235,0.35)" }}>
            Go to my dashboard →
          </button>
          <Link href="/jobs" style={{ padding: "14px 32px", borderRadius: "14px", border: "1.5px solid #e2e8f0", background: "white", color: "#64748b", fontSize: "14px", fontWeight: 600, fontFamily: "'DM Sans', sans-serif", textDecoration: "none", display: "block" }}>
            See your request on the jobs board →
          </Link>
        </div>
      </div>
    </div>
  )

  // ── Derive display values ────────────────────────────────────
  const pricing = PRICING[data.frequency ?? ""] ?? PRICING.fortnightly
  const taskLabels = (data.tasks ?? []).map(id => TASK_LABELS[id] ?? id)
  const rate = typeof data.hourlyRate === "number" ? data.hourlyRate : 0
  const hours = typeof data.hoursPerSession === "number" ? data.hoursPerSession : null
  const estimated = rate > 0 && hours ? rate * hours : null

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg, #f0f7ff 0%, #fefce8 50%, #f0fdf4 100%)", fontFamily: "'DM Sans', sans-serif", padding: "24px 16px 48px" }}>
      <div style={{ maxWidth: "600px", margin: "0 auto" }}>

        {/* Progress */}
        <div style={{ marginBottom: "28px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "#3b82f6", letterSpacing: "0.05em", textTransform: "uppercase" }}>Step 5 of 5</div>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "#22c55e", background: "#f0fdf4", padding: "2px 10px", borderRadius: "100px" }}>Almost there!</div>
          </div>
          <div style={{ height: "4px", background: "#e2e8f0", borderRadius: "100px", overflow: "hidden" }}>
            <div style={{ height: "100%", width: "100%", background: "linear-gradient(90deg, #3b82f6, #22c55e)", borderRadius: "100px" }} />
          </div>
        </div>

        {/* Header */}
        <div style={{ marginBottom: "24px" }}>
          <h1 style={{ fontSize: "28px", fontWeight: 800, color: "#0f172a", margin: "0 0 8px", lineHeight: 1.2 }}>Review & publish</h1>
          <p style={{ fontSize: "15px", color: "#64748b", lineHeight: 1.6, margin: 0 }}>
            Check everything looks right, then publish your request for cleaners to see.
          </p>
        </div>

        {/* Not signed in warning */}
        {!userId && (
          <div style={{ background: "#fffbeb", border: "1.5px solid #fcd34d", borderRadius: "16px", padding: "14px 18px", marginBottom: "20px", display: "flex", gap: "10px", alignItems: "flex-start" }}>
            <span style={{ fontSize: "16px", flexShrink: 0 }}>⚠️</span>
            <div>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "#92400e", marginBottom: "4px" }}>You're not signed in</div>
              <div style={{ fontSize: "13px", color: "#a16207", lineHeight: 1.5 }}>
                Your request details are saved. <Link href="/request/preview" style={{ color: "#2563eb", fontWeight: 600, textDecoration: "none" }}>Sign in or create an account</Link> to publish.
              </div>
            </div>
          </div>
        )}

        {/* Preview */}
        <PublishedPreview data={data} pricing={pricing} rate={rate} hours={hours} estimated={estimated} />

        {/* Editable sections */}
        <div style={{ fontSize: "12px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "12px" }}>Your details</div>

        <SectionCard title="Property" icon="🏠" onEdit={() => router.push("/request/property")}>
          <Row label="Area" value={data.sector || data.postcode || "—"} />
          <Row label="Bedrooms" value={data.bedrooms ? `${data.bedrooms}` : "—"} />
          <Row label="Bathrooms" value={data.bathrooms ? `${data.bathrooms}` : "—"} />
          <div style={{ marginTop: "10px", padding: "10px 12px", background: "rgba(59,130,246,0.06)", borderRadius: "10px", display: "flex", gap: "8px" }}>
            <span style={{ fontSize: "13px" }}>🔒</span>
            <span style={{ fontSize: "12px", color: "#64748b", lineHeight: 1.5 }}>Your full address is not shown on your listing.</span>
          </div>
        </SectionCard>

        <SectionCard title="What needs doing" icon="✅" onEdit={() => router.push("/request/property")}>
          {taskLabels.length > 0
            ? <div style={{ display: "flex", flexWrap: "wrap", margin: "-3px" }}>{taskLabels.map((t, i) => <Tag key={i} label={t} />)}</div>
            : <span style={{ fontSize: "13px", color: "#94a3b8" }}>No tasks selected</span>}
        </SectionCard>

        <SectionCard title="Schedule preference" icon="📅" onEdit={() => router.push("/request/property")}>
          <Row label="Days" value={data.preferredDays?.length ? data.preferredDays.join(", ") : "No preference"} />
          <Row label="Time" value={data.preferredTime || "No preference"} />
          {data.scheduleNotes && (
            <div style={{ marginTop: "8px" }}>
              <div style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "4px" }}>Notes</div>
              <div style={{ fontSize: "13px", color: "#475569", fontStyle: "italic" }}>"{data.scheduleNotes}"</div>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Payments" icon="💷" onEdit={() => router.push("/request/frequency")}>
          <div style={{ background: "linear-gradient(135deg, #f0fdf4, #dcfce7)", borderRadius: "14px", padding: "14px 16px" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "#166534", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px" }}>Paid directly to your cleaner</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: "24px", fontWeight: 800, color: "#166534" }}>
                  {rate > 0 ? `£${rate.toFixed(2)}` : "Not set"}<span style={{ fontSize: "13px", fontWeight: 500 }}>{rate > 0 ? "/hr" : ""}</span>
                </div>
                {hours && <div style={{ fontSize: "12px", color: "#16a34a", marginTop: "2px" }}>~{hours} hrs per session</div>}
              </div>
              {estimated && (
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "11px", color: "#16a34a", fontWeight: 600 }}>Est. per session</div>
                  <div style={{ fontSize: "20px", fontWeight: 800, color: "#166534" }}>~£{estimated.toFixed(2)}</div>
                </div>
              )}
            </div>
          </div>
        </SectionCard>

        {/* What happens next */}
        <div style={{ background: "rgba(255,255,255,0.7)", backdropFilter: "blur(16px)", borderRadius: "20px", padding: "20px", border: "1.5px solid rgba(255,255,255,0.9)", marginBottom: "24px" }}>
          <div style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a", marginBottom: "14px" }}>What happens next</div>
          {[
            { icon: "👀", text: "Cleaners in your area see your request and can apply" },
            { icon: "📩", text: "You're notified when someone applies — accept or decline each one" },
            { icon: "💬", text: "Open a chat with cleaners you're interested in before committing" },
            { icon: "✅", text: "Choose your cleaner, confirm a start date — your Direct Debit begins then" },
          ].map((step, i) => (
            <div key={i} style={{ display: "flex", gap: "12px", alignItems: "flex-start", marginBottom: i < 3 ? "10px" : 0 }}>
              <span style={{ fontSize: "17px", flexShrink: 0 }}>{step.icon}</span>
              <span style={{ fontSize: "13px", color: "#475569", lineHeight: 1.5 }}>{step.text}</span>
            </div>
          ))}
        </div>

        {/* Publish CTA */}
        <button
          onClick={() => userId ? setShowPopup(true) : router.push("/request/preview")}
          disabled={isPublishing}
          style={{ width: "100%", padding: "20px", borderRadius: "16px", border: "none", background: isPublishing ? "#e2e8f0" : "linear-gradient(135deg, #16a34a, #22c55e)", color: isPublishing ? "#94a3b8" : "white", fontSize: "18px", fontWeight: 800, fontFamily: "'DM Sans', sans-serif", cursor: isPublishing ? "not-allowed" : "pointer", boxShadow: isPublishing ? "none" : "0 6px 24px rgba(22,163,74,0.35)", transition: "all 0.25s ease" }}
          onMouseEnter={e => { if (!isPublishing) (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)" }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)" }}
        >
          {isPublishing ? "Publishing…" : userId ? "🚀 Publish my request" : "Sign in to publish →"}
        </button>

        <p style={{ textAlign: "center", fontSize: "12px", color: "#94a3b8", marginTop: "12px", lineHeight: 1.5 }}>
          Your Direct Debit does not start until you've accepted a cleaner.{" "}
          <Link href="/legal/terms" style={{ color: "#3b82f6", textDecoration: "none", fontWeight: 500 }}>Full terms</Link>
        </p>
      </div>

      {showPopup && <ConfirmationPopup onConfirm={handlePublish} onCancel={() => setShowPopup(false)} isPublishing={isPublishing} />}
    </div>
  )
}
