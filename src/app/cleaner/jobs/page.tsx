"use client";

import { useEffect, useRef, useState } from "react";

const INITIAL_CREDITS = 20;

const jobData = [
  {
    id: 1,
    area: "Broadbridge Heath",
    postedAgo: "12 minutes ago",
    pay: 15.5,
    hours: "3 hrs",
    estPerSession: "£46.50",
    frequency: "Weekly",
    frequencyKey: "weekly",
    days: ["monday", "wednesday"],
    daysLabel: "Mon, Wed",
    time: "Morning",
    tasks: ["General clean", "Hoovering", "Kitchen deep clean", "Windows"],
    fulfilled: false,
  },
  {
    id: 2,
    area: "Horsham Central",
    postedAgo: "1 hour ago",
    pay: 18.0,
    hours: "2.5 hrs",
    estPerSession: "£45.00",
    frequency: "Fortnightly",
    frequencyKey: "fortnightly",
    days: ["friday"],
    daysLabel: "Friday",
    time: "Afternoon",
    tasks: ["General clean", "Oven clean", "Hoovering", "Blinds"],
    fulfilled: false,
  },
  {
    id: 3,
    area: "Mannings Heath",
    postedAgo: "3 hours ago",
    pay: 16.0,
    hours: "Not confirmed",
    estPerSession: "TBC",
    frequency: "Weekly",
    frequencyKey: "weekly",
    days: ["tuesday", "thursday"],
    daysLabel: "Tue, Thu",
    time: "No preference",
    tasks: ["General clean", "Mold removal", "Hoovering"],
    fulfilled: false,
  },
  {
    id: 4,
    area: "Kilnwood Vale",
    postedAgo: "2 days ago",
    pay: 14.5,
    hours: "2 hrs",
    estPerSession: "£29.00",
    frequency: "Monthly",
    frequencyKey: "monthly",
    days: ["saturday"],
    daysLabel: "Saturday",
    time: "Morning",
    tasks: ["General clean", "Hoovering"],
    fulfilled: true,
    fulfilledDaysLeft: 8,
  },
];

type Job = typeof jobData[0];

function JobCard({ job, onApply }: { job: Job; onApply: (area: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{
        background: job.fulfilled ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.88)",
        backdropFilter: "blur(12px)",
        borderRadius: "22px",
        border: "1.5px solid rgba(255,255,255,0.95)",
        boxShadow: "0 4px 24px rgba(59,130,246,0.07), 0 1px 4px rgba(0,0,0,0.05)",
        display: "flex",
        flexDirection: "column" as const,
        overflow: "hidden",
        opacity: visible ? (job.fulfilled ? 0.45 : 1) : 0,
        filter: job.fulfilled ? "grayscale(0.5)" : "none",
        transform: visible ? "translateY(0)" : "translateY(12px)",
        transition: "opacity 0.5s ease, transform 0.5s ease",
        pointerEvents: job.fulfilled ? "none" : "auto",
      }}
    >
      {/* Strip */}
      <div style={{
        background: job.fulfilled
          ? "linear-gradient(135deg, #f1f5f9, #e2e8f0)"
          : "linear-gradient(135deg, #eff6ff, #dbeafe)",
        padding: "18px 20px 14px",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: "8px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{
            width: "38px", height: "38px", background: "white",
            borderRadius: "12px", display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: "18px",
            boxShadow: "0 2px 8px rgba(59,130,246,0.12)", flexShrink: 0,
          }}>📍</div>
          <div>
            <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: "15px", fontWeight: 700, color: "#0f172a" }}>
              {job.area}
            </div>
            <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>{job.postedAgo}</div>
          </div>
        </div>
        <span style={{
          display: "inline-flex", alignItems: "center", gap: "4px",
          padding: "4px 10px", borderRadius: "100px", fontSize: "11px",
          fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0,
          background: job.fulfilled ? "rgba(148,163,184,0.15)" : "rgba(34,197,94,0.12)",
          color: job.fulfilled ? "#64748b" : "#15803d",
          border: job.fulfilled ? "1px solid rgba(148,163,184,0.25)" : "1px solid rgba(34,197,94,0.25)",
        }}>
          {job.fulfilled ? "✓ Fulfilled" : "● Live"}
        </span>
      </div>

      {/* Body */}
      <div style={{ padding: "16px 20px", flex: 1 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: "6px", marginBottom: "14px" }}>
          <span style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: "22px",
            fontWeight: 800, color: job.fulfilled ? "#94a3b8" : "#16a34a", letterSpacing: "-0.5px",
          }}>
            £{job.pay.toFixed(2)}
          </span>
          <span style={{ fontSize: "13px", color: "#64748b" }}>/ hr · {job.hours}/session</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "14px" }}>
          {[
            { label: "Frequency", value: job.frequency },
            { label: "Preferred Days", value: job.daysLabel },
            { label: "Preferred Time", value: job.time },
            { label: "Est. / session", value: job.estPerSession },
          ].map(({ label, value }) => (
            <div key={label} style={{ background: "#f8faff", borderRadius: "10px", padding: "8px 10px" }}>
              <div style={{ fontSize: "10px", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "2px" }}>
                {label}
              </div>
              <div style={{ fontSize: "13px", fontWeight: 700, color: "#1e293b", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {value}
              </div>
            </div>
          ))}
        </div>

        <div style={{ fontSize: "10px", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "7px" }}>
          Tasks
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
          {job.tasks.map(task => (
            <span key={task} style={{
              background: "#f1f5f9", color: "#475569", fontSize: "11px",
              fontWeight: 500, padding: "4px 10px", borderRadius: "100px",
              border: "1px solid #e2e8f0",
            }}>
              {task}
            </span>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{
        padding: "14px 20px", borderTop: "1px solid #f1f5f9",
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px",
      }}>
        {job.fulfilled ? (
          <div style={{ fontSize: "12px", color: "#94a3b8", fontWeight: 500 }}>
            ✓ Cleaner found — visible {job.fulfilledDaysLeft} more days
          </div>
        ) : (
          <>
            <div style={{ fontSize: "12px", color: "#64748b" }}>Posted {job.postedAgo}</div>
            <button
              onClick={() => onApply(job.area)}
              style={{
                background: "linear-gradient(135deg, #3b82f6, #2563eb)",
                color: "white", border: "none", borderRadius: "100px",
                padding: "10px 18px", fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 700, fontSize: "13px", cursor: "pointer",
                boxShadow: "0 3px 12px rgba(59,130,246,0.28)",
                whiteSpace: "nowrap",
              }}
            >
              Apply →
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function ApplyModal({
  area, credits, onClose, onSubmit,
}: {
  area: string;
  credits: number;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit() {
    if (credits <= 0) return;
    onSubmit();
    setSubmitted(true);
  }

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)",
        backdropFilter: "blur(6px)", zIndex: 200,
        display: "flex", alignItems: "center", justifyContent: "center", padding: "20px",
      }}
    >
      <div style={{
        background: "white", borderRadius: "28px", maxWidth: "480px", width: "100%",
        maxHeight: "90vh", overflowY: "auto", padding: "32px",
        boxShadow: "0 24px 80px rgba(0,0,0,0.2)",
      }}>
        {!submitted ? (
          <>
            <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: "#3b82f6", marginBottom: "8px" }}>
              You&apos;re about to apply
            </div>
            <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: "20px", fontWeight: 800, color: "#0f172a", marginBottom: "6px", letterSpacing: "-0.3px" }}>
              Job in {area}
            </div>
            <div style={{ fontSize: "14px", color: "#64748b", lineHeight: 1.5, marginBottom: "20px" }}>
              The homeowner will be notified that you&apos;re interested. Here&apos;s what they&apos;ll see when you apply:
            </div>

            {/* Info shared */}
            <div style={{ background: "#f8faff", borderRadius: "16px", padding: "18px", marginBottom: "20px", border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: "12px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "14px" }}>
                Information shared with homeowner
              </div>
              {[
                { icon: "⭐", label: "Your rating", value: "4.8 / 5" },
                { icon: "📅", label: "Member since", value: "March 2024" },
                { icon: "✅", label: "Jobs completed", value: "14 clients" },
              ].map(({ icon, label, value }) => (
                <div key={label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
                  <span style={{ fontSize: "13px", color: "#64748b" }}>{icon} {label}</span>
                  <span style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>{value}</span>
                </div>
              ))}
              {[
                { icon: "🪪", label: "DBS Certificate" },
                { icon: "🛡️", label: "Public Liability Insurance" },
                { icon: "📋", label: "Right to Work" },
              ].map(({ icon, label }) => (
                <div key={label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
                  <span style={{ fontSize: "13px", color: "#64748b" }}>{icon} {label}</span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "rgba(34,197,94,0.1)", color: "#16a34a", border: "1px solid rgba(34,197,94,0.2)", borderRadius: "100px", padding: "3px 10px", fontSize: "11px", fontWeight: 700 }}>
                    ✓ Vouchee Verified
                  </span>
                </div>
              ))}
            </div>

            {/* Blurred reviews */}
            <div style={{ background: "#f1f5f9", borderRadius: "12px", padding: "14px", marginBottom: "20px", position: "relative", overflow: "hidden" }}>
              <div style={{ fontSize: "12px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "10px" }}>Recent reviews</div>
              <div style={{ filter: "blur(4px)", userSelect: "none", pointerEvents: "none" }}>
                {["\"Absolutely fantastic — always on time and leaves the house spotless.\" — Customer, Horsham Central",
                  "\"Really thorough and friendly. My kitchen has never looked so clean.\" — Customer, Broadbridge Heath",
                  "\"Reliable, professional and great attention to detail.\" — Customer, Mannings Heath"].map((r, i) => (
                  <div key={i} style={{ fontSize: "13px", color: "#475569", lineHeight: 1.5, marginBottom: "8px", paddingBottom: "8px", borderBottom: i < 2 ? "1px solid #e2e8f0" : "none" }}>{r}</div>
                ))}
              </div>
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(248,250,255,0.6)", fontSize: "12px", fontWeight: 600, color: "#64748b", textAlign: "center", padding: "12px" }}>
                🔒 Full reviews visible to homeowner once you&apos;re accepted
              </div>
            </div>

            {/* Message */}
            <div style={{ fontSize: "13px", fontWeight: 600, color: "#475569", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
              Add a message
              <span style={{ fontSize: "11px", fontWeight: 500, color: "#94a3b8", background: "#f1f5f9", padding: "2px 8px", borderRadius: "100px" }}>Optional</span>
            </div>
            <textarea
              placeholder="e.g. I have my own car and I'm available to start next week..."
              style={{
                width: "100%", border: "1.5px solid #e2e8f0", borderRadius: "14px",
                padding: "14px", fontFamily: "'DM Sans', sans-serif", fontSize: "14px",
                color: "#1e293b", resize: "none", height: "100px", background: "#f8faff",
                marginBottom: "16px", outline: "none",
              }}
            />

            {/* T&C warning */}
            <div style={{ background: "rgba(250,204,21,0.1)", border: "1px solid rgba(250,204,21,0.3)", borderRadius: "12px", padding: "12px 14px", fontSize: "12px", color: "#92400e", lineHeight: 1.5, marginBottom: "20px", display: "flex", gap: "8px" }}>
              ⚠️ Arranging work directly with a homeowner outside of Vouchee is a breach of our Terms &amp; Conditions and may result in removal from the platform.
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={onClose} style={{ flex: 1, background: "#f1f5f9", color: "#64748b", border: "none", borderRadius: "100px", padding: "14px", fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: "14px", cursor: "pointer" }}>
                Cancel
              </button>
              {credits === 0 ? (
                <button style={{ flex: 2, background: "linear-gradient(135deg, #facc15, #f59e0b)", color: "#1e293b", border: "none", borderRadius: "100px", padding: "14px", fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: "14px", cursor: "pointer", boxShadow: "0 4px 16px rgba(250,204,21,0.35)" }}>
                  Purchase credits →
                </button>
              ) : (
                <button onClick={handleSubmit} style={{ flex: 2, background: "linear-gradient(135deg, #3b82f6, #2563eb)", color: "white", border: "none", borderRadius: "100px", padding: "14px", fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: "14px", cursor: "pointer", boxShadow: "0 4px 16px rgba(59,130,246,0.3)" }}>
                  Send application (1 credit) →
                </button>
              )}
            </div>
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ width: "72px", height: "72px", background: "linear-gradient(135deg, #dcfce7, #bbf7d0)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "32px", margin: "0 auto 16px" }}>✓</div>
            <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: "20px", fontWeight: 800, color: "#0f172a", marginBottom: "8px" }}>Application sent!</div>
            <div style={{ fontSize: "14px", color: "#64748b", lineHeight: 1.6, marginBottom: "24px" }}>
              The homeowner has been notified that you&apos;re interested. You&apos;ll hear back if they&apos;d like to connect.
            </div>
            <button onClick={onClose} style={{ width: "100%", background: "linear-gradient(135deg, #3b82f6, #2563eb)", color: "white", border: "none", borderRadius: "100px", padding: "14px", fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: "14px", cursor: "pointer" }}>
              Back to jobs
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CleanerJobs() {
  const [credits, setCredits] = useState(INITIAL_CREDITS);
  const [modalArea, setModalArea] = useState<string | null>(null);
  const [filterPay, setFilterPay] = useState("");
  const [filterFreq, setFilterFreq] = useState("");
  const [filterDay, setFilterDay] = useState("");
  const [filtered, setFiltered] = useState(jobData);

  function applyFilters() {
    const minPay = parseFloat(filterPay) || 0;
    setFiltered(jobData.filter(job => {
      const payMatch = !minPay || job.pay >= minPay;
      const freqMatch = !filterFreq || job.frequencyKey === filterFreq;
      const dayMatch = !filterDay || job.days.includes(filterDay);
      return payMatch && freqMatch && dayMatch;
    }));
  }

  function handleApply(area: string) { setModalArea(area); }

  function handleSubmit() {
    setCredits(c => Math.max(0, c - 1));
    setModalArea(null);
  }

  const creditState = credits === 0 ? "critical" : credits <= 2 ? "critical" : credits <= 5 ? "low" : "ok";

  const activeCount = filtered.filter(j => !j.fulfilled).length;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&family=DM+Sans:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.7} }
      `}</style>

      <div style={{ minHeight: "100vh", background: "linear-gradient(160deg, #eff6ff 0%, #f8faff 50%, #fffbeb 100%)" }}>

        {/* Credit Banner */}
        {creditState !== "ok" && (
          <div style={{
            padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "center",
            gap: "8px", fontSize: "13px", fontWeight: 500, textAlign: "center",
            background: creditState === "critical" ? "rgba(239,68,68,0.07)" : "rgba(250,204,21,0.12)",
            borderBottom: creditState === "critical" ? "1px solid rgba(239,68,68,0.2)" : "1px solid rgba(250,204,21,0.3)",
            color: creditState === "critical" ? "#991b1b" : "#92400e",
          }}>
            {credits === 0
              ? <>🚫 You have no credits remaining. <a href="/cleaner/credits" style={{ fontWeight: 700, color: "inherit" }}>Purchase credits</a> to continue applying.</>
              : credits <= 2
              ? <>⚠️ Only {credits} credit{credits === 1 ? "" : "s"} remaining. <a href="/cleaner/credits" style={{ fontWeight: 700, color: "inherit" }}>Top up now</a> to keep applying.</>
              : <>💛 Running low — {credits} credits remaining. <a href="/cleaner/credits" style={{ fontWeight: 700, color: "inherit" }}>Visit the credit store</a> to top up.</>
            }
          </div>
        )}

        {/* Header */}
        <div style={{
          background: "rgba(255,255,255,0.85)", backdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(59,130,246,0.1)", padding: "16px 24px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          position: "sticky", top: 0, zIndex: 100,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: "20px", color: "#1e293b" }}>
            <div style={{ width: "36px", height: "36px", background: "linear-gradient(135deg, #3b82f6, #2563eb)", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "18px", fontWeight: 800 }}>V</div>
            Vouchee
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ fontSize: "14px", color: "#64748b" }}>Viewing as <span style={{ color: "#3b82f6", fontWeight: 600 }}>Cleaner</span></div>
            <div style={{
              display: "flex", alignItems: "center", gap: "6px",
              background: creditState === "ok" ? "rgba(59,130,246,0.08)" : creditState === "low" ? "rgba(250,204,21,0.12)" : "rgba(239,68,68,0.08)",
              border: `1.5px solid ${creditState === "ok" ? "rgba(59,130,246,0.15)" : creditState === "low" ? "rgba(250,204,21,0.4)" : "rgba(239,68,68,0.25)"}`,
              borderRadius: "100px", padding: "6px 14px",
              fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: "13px", fontWeight: 700,
              color: creditState === "ok" ? "#3b82f6" : creditState === "low" ? "#b45309" : "#dc2626",
              animation: creditState === "critical" ? "pulse 1.5s ease infinite" : "none",
              cursor: "pointer",
            }}>
              {credits} / {INITIAL_CREDITS} credits
            </div>
          </div>
        </div>

        {/* Page */}
        <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "32px 20px 80px" }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
            <div>
              <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: "26px", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.5px" }}>Available Jobs</h1>
              <p style={{ fontSize: "14px", color: "#64748b", marginTop: "4px" }}>Showing jobs in your area — most recent first</p>
            </div>
            <p style={{ fontSize: "13px", color: "#94a3b8" }}>
              <span style={{ color: "#3b82f6", fontWeight: 600 }}>{activeCount}</span> jobs available
            </p>
          </div>

          {/* Filters */}
          <div style={{ background: "rgba(255,255,255,0.8)", backdropFilter: "blur(12px)", borderRadius: "20px", padding: "16px 20px", border: "1.5px solid rgba(255,255,255,0.9)", boxShadow: "0 2px 16px rgba(59,130,246,0.06)", marginBottom: "28px", display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "flex-end" }}>
            {[
              { label: "Min Pay", id: "pay", value: filterPay, onChange: setFilterPay, options: [["", "Any rate"], ["14", "£14+/hr"], ["16", "£16+/hr"], ["18", "£18+/hr"]] },
              { label: "Frequency", id: "freq", value: filterFreq, onChange: setFilterFreq, options: [["", "Any frequency"], ["weekly", "Weekly"], ["fortnightly", "Fortnightly"], ["monthly", "Monthly"]] },
              { label: "Preferred Day", id: "day", value: filterDay, onChange: setFilterDay, options: [["", "Any day"], ["monday", "Monday"], ["tuesday", "Tuesday"], ["wednesday", "Wednesday"], ["thursday", "Thursday"], ["friday", "Friday"], ["saturday", "Saturday"], ["sunday", "Sunday"]] },
            ].map(({ label, id, value, onChange, options }) => (
              <div key={id} style={{ display: "flex", flexDirection: "column", gap: "5px", flex: 1, minWidth: "130px" }}>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.8px" }}>{label}</label>
                <select
                  value={value}
                  onChange={e => onChange(e.target.value)}
                  style={{ background: "#f8faff", border: "1.5px solid #e2e8f0", borderRadius: "12px", padding: "9px 12px", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", color: "#1e293b", cursor: "pointer" }}
                >
                  {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
            ))}
            <button onClick={applyFilters} style={{ background: "#3b82f6", color: "white", border: "none", borderRadius: "12px", padding: "10px 20px", fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: "14px", cursor: "pointer", alignSelf: "flex-end", whiteSpace: "nowrap" }}>
              Apply Filters
            </button>
          </div>

          {/* Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "18px" }}>
            {filtered.map(job => (
              <JobCard key={job.id} job={job} onApply={handleApply} />
            ))}
          </div>
        </div>
      </div>

      {/* Modal */}
      {modalArea && (
        <ApplyModal
          area={modalArea}
          credits={credits}
          onClose={() => setModalArea(null)}
          onSubmit={handleSubmit}
        />
      )}
    </>
  );
}
