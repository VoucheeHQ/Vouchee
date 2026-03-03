'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Settings, X, ChevronRight, Calendar, User, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const TASK_LABELS: Record<string, string> = {
  general: "General cleaning", hoovering: "Hoovering", mopping: "Mopping",
  bathroom: "Bathroom clean", kitchen: "Kitchen clean", windows_interior: "Interior windows",
  oven: "Oven cleaning", bathroom_deep: "Bathroom deep clean", kitchen_deep: "Kitchen deep clean",
  fridge: "Fridge clean", blinds: "Blinds", mold: "Mould removal",
  ironing: "Ironing", laundry: "Laundry", changing_beds: "Changing beds", garage: "Garage / utility",
  // also support the new task key format
  general_cleaning: "General cleaning", bathroom_deep_clean: "Bathroom deep clean",
  kitchen_deep_clean: "Kitchen deep clean",
}

const ZONE_LABELS: Record<string, string> = {
  central_south_east: "Central Horsham", north_west: "North West Horsham",
  north_east_roffey: "North East / Roffey", south_west: "South West Horsham",
  warnham_north: "Warnham & North", broadbridge_heath: "Broadbridge Heath",
  mannings_heath: "Mannings Heath", faygate_kilnwood_vale: "Faygate / Kilnwood Vale",
  christs_hospital: "Christ's Hospital",
}

const FREQUENCY_LABELS: Record<string, string> = {
  weekly: "Weekly", fortnightly: "Fortnightly", monthly: "Monthly",
}

interface CleanRequest {
  id: string
  status: string
  zone: string | null
  bedrooms: number
  bathrooms: number
  hourly_rate: number | null
  hours_per_session: number | null
  tasks: string[] | null
  preferred_days: string[] | null
  time_of_day: string | null
  customer_notes: string | null
  created_at: string
  customers?: { frequency: string | null }
}

// ── Listing Card ──────────────────────────────────────────────

function ListingCard({ request, onEdit }: { request: CleanRequest; onEdit: () => void }) {
  const zone = request.zone ? (ZONE_LABELS[request.zone] ?? request.zone) : "Horsham"
  const tasks = (request.tasks ?? []).map(t => TASK_LABELS[t] ?? t).filter(Boolean)
  const days = request.preferred_days ?? []
  const freq = request.customers?.frequency
  const isLive = request.status === "pending"

  return (
    <div style={{
      background: "white", borderRadius: "20px",
      border: `2px solid ${isLive ? "#bbf7d0" : "#e2e8f0"}`,
      boxShadow: "0 2px 16px rgba(0,0,0,0.06)", overflow: "hidden",
    }}>
      {/* Card header */}
      <div style={{
        background: isLive ? "linear-gradient(135deg, #f0fdf4, #dcfce7)" : "#f8fafc",
        padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between",
        borderBottom: "1px solid #f1f5f9",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{
            width: "8px", height: "8px", borderRadius: "50%",
            background: isLive ? "#22c55e" : "#94a3b8",
            boxShadow: isLive ? "0 0 0 3px rgba(34,197,94,0.2)" : "none",
          }} />
          <span style={{ fontSize: "14px", fontWeight: 700, color: isLive ? "#166534" : "#64748b" }}>
            {isLive ? "Live — visible to cleaners" : "Not live"}
          </span>
        </div>
        <button
          onClick={onEdit}
          style={{
            display: "flex", alignItems: "center", gap: "6px",
            background: "white", border: "1.5px solid #e2e8f0", borderRadius: "10px",
            padding: "6px 12px", cursor: "pointer", fontSize: "13px", fontWeight: 600,
            color: "#475569", transition: "all 0.15s",
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#3b82f6"; (e.currentTarget as HTMLButtonElement).style.color = "#3b82f6" }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#e2e8f0"; (e.currentTarget as HTMLButtonElement).style.color = "#475569" }}
        >
          <Settings size={14} />
          Edit listing
        </button>
      </div>

      <div style={{ padding: "20px" }}>
        {/* Zone + chips */}
        <div style={{ marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
            <span>📍</span>
            <span style={{ fontSize: "18px", fontWeight: 800, color: "#0f172a" }}>{zone}</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {[
              request.bedrooms ? `${request.bedrooms} bed` : null,
              request.bathrooms ? `${request.bathrooms} bath` : null,
              request.hours_per_session ? `${request.hours_per_session} hrs` : null,
              freq ? FREQUENCY_LABELS[freq] ?? freq : null,
              days.length ? days.map(d => d.slice(0, 3)).join(" · ") : null,
              request.time_of_day ?? null,
            ].filter(Boolean).map((chip, i) => (
              <span key={i} style={{ background: "#f1f5f9", borderRadius: "100px", padding: "4px 12px", fontSize: "12px", fontWeight: 600, color: "#475569" }}>{chip}</span>
            ))}
          </div>
        </div>

        {/* Tasks */}
        {tasks.length > 0 && (
          <div style={{ marginBottom: "16px" }}>
            <div style={{ fontSize: "10px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>Tasks</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {tasks.slice(0, 5).map((t, i) => (
                <span key={i} style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#15803d", fontSize: "12px", fontWeight: 600, padding: "4px 12px", borderRadius: "100px" }}>{t}</span>
              ))}
              {tasks.length > 5 && (
                <span style={{ fontSize: "12px", color: "#94a3b8", padding: "4px 8px" }}>+{tasks.length - 5} more</span>
              )}
            </div>
          </div>
        )}

        {/* Rate */}
        {request.hourly_rate && (
          <div style={{ background: "#fefce8", border: "1px solid #fef08a", borderRadius: "14px", padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: "10px", fontWeight: 700, color: "#92400e", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "4px" }}>Offered rate</div>
              <div style={{ fontSize: "22px", fontWeight: 800, color: "#78350f" }}>
                £{request.hourly_rate.toFixed(2)}<span style={{ fontSize: "13px", fontWeight: 500 }}>/hr</span>
              </div>
            </div>
            {request.hours_per_session && (
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "10px", fontWeight: 700, color: "#92400e", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "4px" }}>Est. per session</div>
                <div style={{ fontSize: "18px", fontWeight: 700, color: "#78350f" }}>
                  ~£{(request.hourly_rate * request.hours_per_session).toFixed(2)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── New listing banner ────────────────────────────────────────

function NewListingBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div style={{
      background: "linear-gradient(135deg, #eff6ff, #dbeafe)",
      border: "1.5px solid #93c5fd", borderRadius: "16px",
      padding: "16px 20px", marginBottom: "24px",
      display: "flex", alignItems: "flex-start", gap: "14px",
    }}>
      <span style={{ fontSize: "24px", flexShrink: 0 }}>🎉</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: "15px", fontWeight: 700, color: "#1e40af", marginBottom: "4px" }}>
          Your request is live!
        </div>
        <div style={{ fontSize: "13px", color: "#3b82f6", lineHeight: 1.5 }}>
          Cleaners in your area can now see and apply to your listing. We'll notify you when someone applies.
        </div>
      </div>
      <button onClick={onDismiss} style={{ background: "none", border: "none", cursor: "pointer", color: "#93c5fd", padding: "2px", flexShrink: 0 }}>
        <X size={18} />
      </button>
    </div>
  )
}

// ── Main dashboard ────────────────────────────────────────────

function DashboardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isNew = searchParams.get("new") === "1"

  const [user, setUser] = useState<any>(null)
  const [requests, setRequests] = useState<CleanRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewBanner, setShowNewBanner] = useState(isNew)

  useEffect(() => {
    const init = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      setUser(user)

      // Fetch their clean requests via customer
      const { data: customer } = await (supabase as any)
        .from("customers")
        .select("id, frequency")
        .eq("profile_id", user.id)
        .single() as { data: { id: string; frequency: string } | null }

      if (customer) {
        const { data: reqs } = await (supabase as any)
          .from("clean_requests")
          .select("*")
          .eq("customer_id", customer.id)
          .order("created_at", { ascending: false })

        if (reqs) {
          setRequests(reqs.map((r: any) => ({ ...r, customers: { frequency: customer.frequency } })))
        }
      }

      setLoading(false)
    }
    init()
  }, [router])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="spinner h-8 w-8" />
    </div>
  )

  const firstName = user?.user_metadata?.full_name?.split(" ")[0] ?? "there"
  const activeRequests = requests.filter(r => r.status === "pending")

  return (
    <div className="min-h-screen bg-surface-secondary">
      {/* Header */}
      <div className="border-b border-ink/5 bg-surface">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
              <span className="text-lg font-bold text-white">V</span>
            </div>
            <span className="text-lg font-semibold text-ink">Vouchee</span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleSignOut}>Sign out</Button>
        </div>
      </div>

      <div className="container py-10">
        {/* Greeting */}
        <div className="mb-8">
          <h1 className="mb-1 text-3xl font-bold text-ink">Hey {firstName}! 👋</h1>
          <p className="text-ink-secondary">
            {activeRequests.length > 0
              ? "Your request is live — cleaners can apply."
              : "Post a request to find a cleaner in your area."}
          </p>
        </div>

        {/* New listing banner */}
        {showNewBanner && <NewListingBanner onDismiss={() => setShowNewBanner(false)} />}

        {/* Active listings */}
        {requests.length > 0 ? (
          <div style={{ marginBottom: "32px" }}>
            <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a", marginBottom: "16px" }}>
              Your listing{requests.length > 1 ? "s" : ""}
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {requests.map(req => (
                <ListingCard
                  key={req.id}
                  request={req}
                  onEdit={() => router.push(`/dashboard/listing/${req.id}/edit`)}
                />
              ))}
            </div>
          </div>
        ) : (
          <div style={{ background: "white", borderRadius: "20px", border: "2px dashed #e2e8f0", padding: "40px", textAlign: "center", marginBottom: "32px" }}>
            <div style={{ fontSize: "40px", marginBottom: "12px" }}>🏠</div>
            <div style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a", marginBottom: "8px" }}>No active listings</div>
            <div style={{ fontSize: "14px", color: "#64748b", marginBottom: "20px" }}>Post a request and cleaners in your area will be able to apply.</div>
            <button
              onClick={() => router.push("/request/property")}
              style={{ background: "#0f172a", color: "white", border: "none", borderRadius: "12px", padding: "12px 24px", fontSize: "14px", fontWeight: 700, cursor: "pointer" }}
            >
              Post a request →
            </button>
          </div>
        )}

        {/* What happens next */}
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-ink/5">
          <h2 className="mb-4 text-base font-bold text-ink">What happens next</h2>
          <ol className="space-y-3">
            {[
              { label: "Cleaners apply", desc: "Vetted cleaners in your area will see your request and apply" },
              { label: "You review applications", desc: "See their ratings, experience, and chat before deciding" },
              { label: "Arrange your first clean", desc: "Confirm a start date and we'll set up payments" },
            ].map((step, i) => (
              <li key={i} className="flex gap-3">
                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-medium text-brand-700">{i + 1}</div>
                <div>
                  <strong className="text-ink">{step.label}</strong>
                  <p className="text-sm text-ink-secondary">{step.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  )
}

export default function CustomerDashboard() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="spinner h-8 w-8" /></div>}>
      <DashboardContent />
    </Suspense>
  )
}
