"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const promises = [
  {
    icon: "🔍",
    color: "blue",
    title: "Every cleaner is DBS checked before joining",
    body: "As part of our onboarding process, every cleaner has been DBS checked, verified for public liability insurance (min. £1,000,000), and confirmed their right to work in the UK. We monitor accreditations continuously — if anything lapses, they're suspended until it's resolved.",
  },
  {
    icon: "⭐",
    color: "yellow",
    title: "You choose who comes into your home",
    body: "Browse profiles, view their Vouchee ratings from past customers, and pick someone you genuinely feel good about. No random assignments, no surprises — every decision is yours.",
  },
  {
    icon: "🔒",
    color: "green",
    title: "Nothing leaves your account until you've chosen your cleaner and confirmed your start date",
    body: "Browse and chat completely free. Your Direct Debit only activates once you've selected your cleaner and agreed a start date.",
  },
  {
    icon: "🔄",
    color: "purple",
    title: "No long contracts",
    body: "Give us 30 days notice and that's it — no fees, no awkward calls. If your regular cleaner can't make a session and no cover clean is available through Vouchee, just let us know and we'll credit the missed session against your next payment.",
  },
  {
    icon: "🏠",
    color: "blue",
    title: "A great clean starts with good communication",
    body: "Before your first session, let your cleaner know about allergies, fragile items, or anything needing special care. The more they know, the better the result.",
  },
  {
    icon: "🤝",
    color: "green",
    title: "Staying on the platform means you always have peace of mind",
    body: "The vetting, insurance checks, and accountability that make Vouchee trustworthy only exist within the platform — that's what gives you peace of mind every time your cleaner arrives. Full details in our Terms of Service.",
  },
];

const colorMap: Record<string, { bg: string; shadow: string }> = {
  blue:   { bg: "linear-gradient(135deg, #eff6ff, #dbeafe)", shadow: "0 2px 10px rgba(59,130,246,0.15)" },
  yellow: { bg: "linear-gradient(135deg, #fefce8, #fef08a)", shadow: "0 2px 10px rgba(250,204,21,0.2)" },
  purple: { bg: "linear-gradient(135deg, #f5f3ff, #ede9fe)", shadow: "0 2px 10px rgba(139,92,246,0.15)" },
  green:  { bg: "linear-gradient(135deg, #f0fdf4, #bbf7d0)", shadow: "0 2px 10px rgba(34,197,94,0.15)" },
};

function Checkbox({ checked, onChange, children }: { checked: boolean; onChange: () => void; children: React.ReactNode }) {
  return (
    <label
      style={{ display: "flex", gap: "14px", alignItems: "flex-start", cursor: "pointer", WebkitTapHighlightColor: "transparent" }}
      onClick={e => { e.preventDefault(); onChange(); }}
    >
      <div style={{
        width: "24px", height: "24px", borderRadius: "8px", flexShrink: 0, marginTop: "1px",
        border: checked ? "2px solid #3b82f6" : "2px solid #cbd5e1",
        background: checked ? "linear-gradient(135deg, #3b82f6, #2563eb)" : "white",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "all 0.15s ease",
      }}>
        {checked && (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2.5 7L5.5 10L11.5 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>
      <span style={{ fontSize: "14px", color: "#374151", lineHeight: 1.55 }}>
        {children}
      </span>
    </label>
  )
}

export default function TermsAcceptancePage() {
  const router = useRouter();
  const [agreedGeneral, setAgreedGeneral] = useState(false);
  const [agreedPlatform, setAgreedPlatform] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const canProceed = agreedGeneral && agreedPlatform;

  const handleContinue = async () => {
    if (!canProceed) return;
    setIsSubmitting(true);
    await new Promise(r => setTimeout(r, 600));
    router.push("/request/preview");
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg, #f0f7ff 0%, #fefce8 50%, #f0fdf4 100%)",
      fontFamily: "'DM Sans', sans-serif",
      padding: "24px 16px 48px",
    }}>
      <div style={{ maxWidth: "600px", margin: "0 auto" }}>

        {/* Progress */}
        <div style={{ marginBottom: "32px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "#3b82f6", letterSpacing: "0.05em", textTransform: "uppercase" }}>
              Step 3 of 4
            </div>
          </div>
          <div style={{ height: "4px", background: "#e2e8f0", borderRadius: "100px", overflow: "hidden", marginBottom: "8px" }}>
            <div style={{ height: "100%", width: "75%", background: "linear-gradient(90deg, #3b82f6 0%, #facc15 50%, #22c55e 100%)", borderRadius: "100px" }} />
          </div>
        </div>

        {/* Header */}
        <div style={{ marginBottom: "32px" }}>
          <h1 style={{ fontSize: "30px", fontWeight: 800, color: "#0f172a", margin: "0 0 12px", lineHeight: 1.2 }}>
            Our commitment to you
          </h1>
          <p style={{ fontSize: "16px", color: "#64748b", lineHeight: 1.6, margin: 0 }}>
            Here's exactly what Vouchee commits to you — and what we ask in return. Plain English, no surprises.
          </p>
        </div>

        {/* Promise cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "32px" }}>
          {promises.map((item, i) => {
            const c = colorMap[item.color];
            return (
              <div key={i} style={{
                background: "rgba(255,255,255,0.8)", backdropFilter: "blur(16px)",
                borderRadius: "20px", padding: "20px",
                border: "1.5px solid rgba(255,255,255,0.9)",
                boxShadow: "0 2px 16px rgba(0,0,0,0.05)",
                display: "flex", gap: "16px", alignItems: "flex-start",
              }}>
                <div style={{
                  width: "44px", height: "44px", borderRadius: "12px",
                  background: c.bg, boxShadow: c.shadow,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "22px", flexShrink: 0,
                }}>
                  {item.icon}
                </div>
                <div>
                  <div style={{ fontSize: "15px", fontWeight: 700, color: "#0f172a", marginBottom: "4px", lineHeight: 1.3 }}>
                    {item.title}
                  </div>
                  <div style={{ fontSize: "14px", color: "#64748b", lineHeight: 1.55 }}>
                    {item.body}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Full T&Cs link */}
        <div style={{
          background: "rgba(255,255,255,0.6)", borderRadius: "16px", padding: "16px 20px",
          marginBottom: "24px", border: "1.5px solid rgba(59,130,246,0.12)",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px",
        }}>
          <div style={{ fontSize: "14px", color: "#475569" }}>Want to read the full terms?</div>
          <a href="/legal/terms/customer" target="_blank" rel="noopener noreferrer"
            style={{ fontSize: "14px", fontWeight: 600, color: "#3b82f6", textDecoration: "none", whiteSpace: "nowrap" }}>
            View full T&Cs →
          </a>
        </div>

        {/* Checkboxes */}
        <div style={{
          background: "rgba(255,255,255,0.85)", backdropFilter: "blur(16px)",
          borderRadius: "20px", padding: "24px",
          border: "1.5px solid rgba(255,255,255,0.9)",
          boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
          marginBottom: "24px", display: "flex", flexDirection: "column", gap: "16px",
        }}>
          <Checkbox checked={agreedGeneral} onChange={() => setAgreedGeneral(v => !v)}>
            I have read and agree to Vouchee's{" "}
            <a href="/legal/terms/customer" target="_blank" onClick={e => e.stopPropagation()} style={{ color: "#3b82f6", fontWeight: 600, textDecoration: "none" }}>
              Customer Terms of Service
            </a>{" "}
            and{" "}
            <a href="/legal/privacy" target="_blank" onClick={e => e.stopPropagation()} style={{ color: "#3b82f6", fontWeight: 600, textDecoration: "none" }}>
              Privacy Policy
            </a>
          </Checkbox>

          <div style={{ height: "1px", background: "#f1f5f9" }} />

          <Checkbox checked={agreedPlatform} onChange={() => setAgreedPlatform(v => !v)}>
            I understand that arranging cleaning privately with a cleaner I was introduced to through Vouchee, while they remain registered on the platform, may result in a platform protection fee as set out in the full{" "}
            <a href="/legal/terms/customer" target="_blank" onClick={e => e.stopPropagation()} style={{ color: "#3b82f6", fontWeight: 600, textDecoration: "none" }}>
              Customer Terms of Service
            </a>
          </Checkbox>
        </div>

        {/* CTA */}
        <button
          onClick={handleContinue}
          disabled={!canProceed || isSubmitting}
          style={{
            width: "100%", padding: "18px", borderRadius: "16px", border: "none",
            background: canProceed ? "linear-gradient(135deg, #2563eb, #3b82f6)" : "#e2e8f0",
            color: canProceed ? "white" : "#94a3b8",
            fontSize: "17px", fontWeight: 700, fontFamily: "'DM Sans', sans-serif",
            cursor: canProceed ? "pointer" : "not-allowed",
            transition: "all 0.25s ease",
            boxShadow: canProceed ? "0 4px 20px rgba(37,99,235,0.35)" : "none",
          }}
          onMouseEnter={e => { if (canProceed) (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)"; }}
        >
          {isSubmitting ? "Saving…" : "See my request & create account →"}
        </button>

        {!canProceed && (
          <p style={{ textAlign: "center", fontSize: "13px", color: "#94a3b8", marginTop: "12px" }}>
            Please tick both boxes above to continue
          </p>
        )}

      </div>
    </div>
  );
}
