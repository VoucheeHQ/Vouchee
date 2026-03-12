"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

const TASK_LABELS: Record<string, string> = {
  general: "General cleaning", general_cleaning: "General cleaning",
  hoovering: "Hoovering", mopping: "Mopping",
  bathroom: "Bathroom clean", bathroom_deep_clean: "Bathroom deep clean",
  kitchen: "Kitchen clean", kitchen_deep_clean: "Kitchen deep clean",
  windows_interior: "Interior windows", oven: "Oven cleaning",
  bathroom_deep: "Bathroom deep clean", kitchen_deep: "Kitchen deep clean",
  fridge: "Fridge clean", blinds: "Blinds", mold: "Mould removal",
  ironing: "Ironing", laundry: "Laundry", changing_beds: "Changing beds",
  garage: "Garage / utility",
}

const PRICING: Record<string, { monthlyCharge: number; sessionsPerMonth: string; label: string }> = {
  weekly:      { monthlyCharge: 43.33, sessionsPerMonth: "~4.33/month", label: "Weekly" },
  fortnightly: { monthlyCharge: 32.48, sessionsPerMonth: "~2.17/month", label: "Fortnightly" },
  monthly:     { monthlyCharge: 19.99, sessionsPerMonth: "1/month",     label: "Monthly" },
}

const SECTOR_TO_ZONE: Record<string, string> = {
  "RH121": "central_south_east", "RH122": "central_south_east",
  "RH125": "north_west", "RH124": "north_east_roffey",
  "RH123": "south_west", "RH126": "warnham_north",
  "RH138": "broadbridge_heath", "RH136": "mannings_heath",
  "RH110": "faygate_kilnwood_vale", "RH130": "christs_hospital",
}

function getSectorFromPostcode(postcode: string): string | null {
  const clean = postcode.toUpperCase().replace(/\s+/g, "")
  for (const sector of Object.keys(SECTOR_TO_ZONE)) {
    if (clean.startsWith(sector)) return SECTOR_TO_ZONE[sector]
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
  frequency?: string
  hourlyRate?: number
  hoursPerSession?: number
  finalNotes?: string
  extraHoursNote?: string
}

function saveRequestData(data: Partial<RequestData>) {
  try {
    const existing = loadRequestData() ?? {}
    const merged = JSON.stringify({ ...existing, ...data })
    sessionStorage.setItem("cleanRequest", merged)
    localStorage.setItem("cleanRequest_backup", merged)
  } catch {}
}

function loadRequestData(): RequestData | null {
  try {
    const session = sessionStorage.getItem("cleanRequest")
    if (session) return JSON.parse(session)
    const backup = localStorage.getItem("cleanRequest_backup")
    if (backup) { sessionStorage.setItem("cleanRequest", backup); return JSON.parse(backup) }
    return null
  } catch { return null }
}

function clearRequestData() {
  try {
    sessionStorage.removeItem("cleanRequest")
    localStorage.removeItem("cleanRequest_backup")
  } catch {}
}

async function publishRequest(data: RequestData, userId: string): Promise<void> {
  const supabase = createClient()

  const zone = data.zone || (data.postcode ? getSectorFromPostcode(data.postcode) : null)

  const { error: insertError } = await (supabase as any)
    .from("clean_requests")
    .insert({
      customer_id: userId,
      status: "pending_review",
      service_type: "regular",
      zone,
      property_type: "house",
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
        ? data.hourlyRate * data.hoursPerSession : null,
    })

  if (insertError) throw new Error(insertError.message)
}

function PreviewCard({ data }: { data: RequestData }) {
  const pricing = PRICING[data.frequency ?? ""] ?? PRICING.fortnightly
  const tasks = (data.tasks ?? []).map(id => TASK_LABELS[id] ?? id)
  const rate = typeof data.hourlyRate === "number" ? data.hourlyRate : 0
  const hours = typeof data.hoursPerSession === "number" ? data.hoursPerSession : null

  return (
    <div style={{ background: "white", borderRadius: "20px", boxShadow: "0 4px 24px rgba(0,0,0,0.10)", overflow: "hidden", marginBottom: "16px", border: "1px solid #e8edf2" }}>
      <div style={{ background: "linear-gradient(135deg, #1a56db, #3b82f6)", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: "12px", fontWeight: 700, color: "rgba(255,255,255,0.9)", letterSpacing: "0.05em", textTransform: "uppercase" }}>📋 Your request preview</div>
        <div style={{ background: "rgba(255,255,255,0.18)", borderRadius: "100px", padding: "3px 12px", fontSize: "11px", fontWeight: 700, color: "white" }}>Goes live on publish</div>
      </div>
      <div style={{ padding: "18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
          <span>📍</span>
          <span style={{ fontSize: "18px", fontWeight: 800, color: "#0f172a" }}>{data.sector || data.postcode || "Your area"}</span>
        </div>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "14px" }}>
          {[data.bedrooms ? `${data.bedrooms} bed` : null, data.bathrooms ? `${data.bathrooms} bath` : null, hours ? `${hours} hrs/session` : null, pricing.label]
            .filter(Boolean).map((chip, i) => (
              <span key={i} style={{ background: "#f1f5f9", borderRadius: "100px", padding: "4px 12px", fontSize: "12px", fontWeight: 600, color: "#475569" }}>{chip}</span>
            ))}
        </div>
        {tasks.length > 0 && (
          <div style={{ marginBottom: "14px" }}>
            <div style={{ fontSize: "10px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>Tasks</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {tasks.map((t, i) => (
                <span key={i} style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#15803d", fontSize: "12px", fontWeight: 600, padding: "4px 12px", borderRadius: "100px" }}>{t}</span>
              ))}
            </div>
          </div>
        )}
        {(data.preferredDays?.length || data.preferredTime) && (
          <div style={{ marginBottom: "14px" }}>
            <div style={{ fontSize: "10px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" }}>Preferred slot</div>
            <div style={{ fontSize: "13px", color: "#475569" }}>
              {data.preferredDays?.length ? data.preferredDays.join(", ") : "Flexible"}
              {data.preferredTime ? ` · ${data.preferredTime}` : ""}
            </div>
          </div>
        )}
        <div style={{ height: "1px", background: "#f1f5f9", margin: "14px 0" }} />
        <div style={{ display: "flex", gap: "12px" }}>
          <div style={{ flex: 1, background: "#fefce8", border: "1px solid #fef08a", borderRadius: "14px", padding: "14px 16px" }}>
            <div style={{ fontSize: "10px", fontWeight: 700, color: "#92400e", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "4px" }}>Offered hourly rate</div>
            <div style={{ fontSize: "22px", fontWeight: 800, color: "#78350f", lineHeight: 1 }}>
              {rate > 0 ? `£${rate.toFixed(2)}` : "Not set"}<span style={{ fontSize: "13px", fontWeight: 500 }}>{rate > 0 ? "/hr" : ""}</span>
            </div>
            <div style={{ fontSize: "11px", color: "#a16207", marginTop: "4px" }}>Paid directly to your cleaner</div>
          </div>
          <div style={{ flex: 1, background: "#f0f5ff", border: "1px solid #c7d7f9", borderRadius: "14px", padding: "14px 16px" }}>
            <div style={{ fontSize: "10px", fontWeight: 700, color: "#3451a7", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "4px" }}>Vouchee service fee</div>
            <div style={{ fontSize: "22px", fontWeight: 700, color: "#3b5fc0", lineHeight: 1 }}>
              £{pricing.monthlyCharge}<span style={{ fontSize: "13px", fontWeight: 500 }}>/mo</span>
            </div>
            <div style={{ fontSize: "11px", color: "#5272c4", marginTop: "4px" }}>Billed monthly by Direct Debit</div>
          </div>
        </div>
        <div style={{ marginTop: "12px", padding: "10px 14px", background: "#f8fafc", borderRadius: "10px", display: "flex", gap: "8px", border: "1px solid #e2e8f0" }}>
          <span style={{ fontSize: "13px", flexShrink: 0 }}>✅</span>
          <span style={{ fontSize: "12px", color: "#475569", lineHeight: 1.5 }}>
            No commitment — your Direct Debit only starts once you've chosen a cleaner and agreed a start date.
          </span>
        </div>
      </div>
    </div>
  )
}

export default function PreviewAndPublishPage() {
  const router = useRouter()
  const [data, setData] = useState<RequestData | null>(null)
  const [finalNotes, setFinalNotes] = useState(() => {
    try {
      const stored = sessionStorage.getItem('cleanRequest')
      if (stored) {
        const d = JSON.parse(stored)
        return d.extraHoursNote ?? d.finalNotes ?? ''
      }
    } catch {}
    return ''
  })
  const [loading, setLoading] = useState(false)
  const [showEmailForm, setShowEmailForm] = useState(false)
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  useEffect(() => {
    const loaded = loadRequestData()
    if (!loaded) { router.push("/request/property"); return }
    setData(loaded)
    setFinalNotes((prev: string) => prev || loaded.extraHoursNote || loaded.finalNotes || '')

    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setUserId(session.user.id)
    })
  }, [router])

  const handlePublish = async (uid: string) => {
    if (!data) return
    setLoading(true)
    try {
      await publishRequest({ ...data, finalNotes: finalNotes || undefined }, uid)
      clearRequestData()
      toast.success("You're live! 🎉")
      router.push("/customer/dashboard")
    } catch (err: any) {
      toast.error(err.message || "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  const handleOAuth = async (provider: "google" | "facebook" | "apple") => {
    try {
      saveRequestData({ finalNotes: finalNotes || undefined })
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/request/preview` },
      })
      if (error) throw error
    } catch {
      toast.error(`${provider} sign-up unavailable. Please use email.`)
    }
  }

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!data) return
    setLoading(true)
    try {
      saveRequestData({ finalNotes: finalNotes || undefined })
      const supabase = createClient()

      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email, password,
        options: { data: { full_name: fullName } },
      })

      let uid: string | undefined

      if (signUpError || !authData.user) {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
        if (signInError) throw signInError
        uid = signInData.user?.id
      } else {
        uid = authData.user?.id
      }

      if (!uid) throw new Error("Could not get user ID")
      await handlePublish(uid)
    } catch (err: any) {
      toast.error(err.message || "Something went wrong")
      setLoading(false)
    }
  }

  if (!data) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontSize: "14px", color: "#94a3b8" }}>Loading…</div>
    </div>
  )

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&family=DM+Sans:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        .signup-input:focus { outline: none; border-color: #3b82f6 !important; }
        .signup-input::placeholder { color: #94a3b8; }
        .oauth-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(0,0,0,0.12) !important; }
        .publish-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(22,163,74,0.4) !important; }
        .publish-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .notes-input:focus { outline: none; border-color: #3b82f6 !important; }
      `}</style>

      <div style={{ minHeight: "100vh", background: "linear-gradient(160deg, #f0f7ff 0%, #fefce8 50%, #f0fdf4 100%)", fontFamily: "'DM Sans', sans-serif", padding: "24px 16px 48px" }}>
        <div style={{ maxWidth: "520px", margin: "0 auto" }}>

          {/* Progress */}
          <div style={{ marginBottom: "28px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "#3b82f6", letterSpacing: "0.05em", textTransform: "uppercase" }}>Step 4 of 4</div>
              <div style={{ fontSize: "12px", fontWeight: 600, color: "#22c55e", background: "#f0fdf4", padding: "2px 10px", borderRadius: "100px" }}>Final step!</div>
            </div>
            <div style={{ height: "4px", background: "#e2e8f0", borderRadius: "100px", overflow: "hidden" }}>
              <div style={{ height: "100%", width: "100%", background: "linear-gradient(90deg, #3b82f6 0%, #facc15 50%, #22c55e 100%)", borderRadius: "100px" }} />
            </div>
          </div>

          {/* Header */}
          <div style={{ marginBottom: "20px" }}>
            <h1 style={{ fontSize: "26px", fontWeight: 800, color: "#0f172a", margin: "0 0 6px", lineHeight: 1.2 }}>Here's your request</h1>
            <p style={{ fontSize: "14px", color: "#64748b", margin: 0 }}>This is exactly what cleaners will see.</p>
          </div>

          {/* Preview card */}
          <PreviewCard data={{ ...data, finalNotes }} />

          {/* Notes */}
          <div style={{ background: "rgba(255,255,255,0.85)", borderRadius: "20px", padding: "20px", border: "1.5px solid rgba(255,255,255,0.9)", boxShadow: "0 2px 16px rgba(0,0,0,0.05)", marginBottom: "16px" }}>
            <label style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a", display: "block", marginBottom: "6px" }}>
              Anything else your cleaner should know?
            </label>
            <p style={{ fontSize: "13px", color: "#64748b", margin: "0 0 10px", lineHeight: 1.5 }}>
              Specific timings, access instructions, pets, preferences — anything not covered above.
            </p>
            <textarea
              className="notes-input"
              placeholder="e.g. We have a dog (friendly!). Key safe on the front porch. Prefer mornings between 9–11am if possible."
              value={finalNotes}
              onChange={e => setFinalNotes(e.target.value)}
              rows={3}
              style={{ width: "100%", background: "#f8faff", border: "1.5px solid #e2e8f0", borderRadius: "12px", padding: "12px 14px", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", color: "#1e293b", resize: "vertical", lineHeight: 1.5 }}
            />
          </div>

          {/* Publish section */}
          <div style={{ background: "rgba(255,255,255,0.85)", borderRadius: "28px", padding: "28px", border: "1.5px solid rgba(255,255,255,0.9)", boxShadow: "0 4px 32px rgba(59,130,246,0.08)" }}>

            {userId ? (
              /* ── Already logged in ── */
              <>
                <div style={{ textAlign: "center", marginBottom: "20px" }}>
                  <div style={{ fontSize: "20px", marginBottom: "8px" }}>🚀</div>
                  <div style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a", marginBottom: "4px" }}>Ready to go live?</div>
                  <div style={{ fontSize: "13px", color: "#64748b" }}>Your request will be visible to cleaners in your area instantly.</div>
                </div>
                <button
                  className="publish-btn"
                  onClick={() => handlePublish(userId)}
                  disabled={loading}
                  style={{ width: "100%", background: "linear-gradient(135deg, #16a34a, #22c55e)", color: "white", border: "none", borderRadius: "14px", padding: "18px", fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: "17px", cursor: "pointer", boxShadow: "0 4px 16px rgba(22,163,74,0.3)", transition: "transform 0.2s, box-shadow 0.2s" }}
                >
                  {loading ? "Publishing…" : "🚀 Publish my request"}
                </button>
                <div style={{ marginTop: "12px", textAlign: "center", fontSize: "12px", color: "#94a3b8" }}>
                  You can pause or remove your request at any time from your dashboard.
                </div>
              </>
            ) : (
              /* ── Not logged in ── */
              <>
                <div style={{ textAlign: "center", marginBottom: "20px" }}>
                  <div style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a", marginBottom: "4px" }}>
                    One step away from a cleaner you can trust
                  </div>
                  <div style={{ fontSize: "13px", color: "#64748b" }}>Create your free account to publish instantly</div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
                  {[
                    { provider: "google" as const, label: "Continue with Google & publish", bg: "white", color: "#1e293b", border: "1.5px solid #e2e8f0", shadow: "0 2px 8px rgba(0,0,0,0.06)", icon: <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg> },
                    { provider: "facebook" as const, label: "Continue with Facebook & publish", bg: "#1877F2", color: "white", border: "none", shadow: "0 2px 8px rgba(24,119,242,0.3)", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg> },
                    { provider: "apple" as const, label: "Continue with Apple & publish", bg: "#000", color: "white", border: "none", shadow: "0 2px 8px rgba(0,0,0,0.2)", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg> },
                  ].map(({ provider, label, bg, color, border, shadow, icon }) => (
                    <button key={provider} className="oauth-btn" onClick={() => handleOAuth(provider)}
                      style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", background: bg, border, borderRadius: "14px", padding: "13px 20px", fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600, fontSize: "14px", color, cursor: "pointer", transition: "transform 0.2s, box-shadow 0.2s", boxShadow: shadow }}>
                      {icon}{label}
                    </button>
                  ))}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                  <div style={{ flex: 1, height: "1px", background: "#e2e8f0" }} />
                  <span style={{ fontSize: "12px", color: "#94a3b8", fontWeight: 500 }}>or sign up with email</span>
                  <div style={{ flex: 1, height: "1px", background: "#e2e8f0" }} />
                </div>

                {!showEmailForm ? (
                  <button onClick={() => setShowEmailForm(true)}
                    style={{ width: "100%", background: "#f8faff", border: "1.5px solid #e2e8f0", borderRadius: "14px", padding: "13px 20px", fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600, fontSize: "14px", color: "#475569", cursor: "pointer" }}>
                    ✉️ Continue with Email
                  </button>
                ) : (
                  <form onSubmit={handleEmailSignup} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                    <div>
                      <label style={{ fontSize: "13px", fontWeight: 600, color: "#475569", display: "block", marginBottom: "6px" }}>Full name</label>
                      <input className="signup-input" type="text" placeholder="John Smith" value={fullName} onChange={e => setFullName(e.target.value)} required disabled={loading}
                        style={{ width: "100%", background: "#f8faff", border: "1.5px solid #e2e8f0", borderRadius: "12px", padding: "12px 14px", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", color: "#1e293b" }} />
                    </div>
                    <div>
                      <label style={{ fontSize: "13px", fontWeight: 600, color: "#475569", display: "block", marginBottom: "6px" }}>Email address</label>
                      <input className="signup-input" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required disabled={loading}
                        style={{ width: "100%", background: "#f8faff", border: "1.5px solid #e2e8f0", borderRadius: "12px", padding: "12px 14px", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", color: "#1e293b" }} />
                    </div>
                    <div>
                      <label style={{ fontSize: "13px", fontWeight: 600, color: "#475569", display: "block", marginBottom: "6px" }}>Password</label>
                      <input className="signup-input" type="password" placeholder="At least 6 characters" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} disabled={loading}
                        style={{ width: "100%", background: "#f8faff", border: "1.5px solid #e2e8f0", borderRadius: "12px", padding: "12px 14px", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", color: "#1e293b" }} />
                    </div>
                    <button className="publish-btn" type="submit" disabled={loading}
                      style={{ width: "100%", background: "linear-gradient(135deg, #16a34a, #22c55e)", color: "white", border: "none", borderRadius: "14px", padding: "16px", fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: "16px", cursor: "pointer", boxShadow: "0 4px 16px rgba(22,163,74,0.3)", transition: "transform 0.2s, box-shadow 0.2s" }}>
                      {loading ? "Publishing…" : "🚀 Create account & publish"}
                    </button>
                  </form>
                )}

                <div style={{ marginTop: "16px", textAlign: "center", fontSize: "13px" }}>
                  <span style={{ color: "#64748b" }}>Already have an account? </span>
                  <Link href="/auth/login?redirectTo=/request/preview" style={{ color: "#3b82f6", fontWeight: 700, textDecoration: "none" }}>Log in</Link>
                </div>
              </>
            )}
          </div>

        </div>
      </div>
    </>
  )
}
