"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

const cards = [
  {
    icon: "⚡",
    color: "yellow",
    title: "Connect with top reviewed cleaners within minutes",
    body: "No more trawling Facebook groups or taking a chance on someone you know nothing about. Vouchee gives you instant access to a network of trusted, local cleaners actively looking for work in your area. Post your request and receive enquiries within minutes.",
    delay: 0,
  },
  {
    icon: "🎯",
    color: "purple",
    title: "You choose your cleaner",
    body: "Browse cleaner profiles, read reviews from real locals, and pick someone you actually feel good about. No random assignments, just your choice, every time.",
    delay: 80,
  },
  {
    icon: "💷",
    color: "green",
    title: "Cleaners keep 100% of their hourly rate",
    body: "Unlike agencies, Vouchee doesn't take a cut of your cleaner's pay. You agree the hourly rate directly with your cleaner and they keep every penny — meaning great cleaners are happy to work through the platform.",
    delay: 160,
  },
  {
    icon: "✅",
    color: "blue",
    title: "Vouchee vetted",
    body: "Every cleaner is interviewed before joining and must hold a valid DBS certificate, public liability insurance and proof of right to work. We actively monitor all accreditations and if anything lapses, the cleaner is removed until it's renewed. We check, so you don't have to.",
    delay: 240,
  },
  {
    icon: "📍",
    color: "green",
    title: "Locally reviewed",
    body: "Every cleaner on Vouchee is vouched for by your neighbours. You can see their rating, what customers are saying about their services, how long they've been with Vouchee and how many clients they've helped. Everything you need to know before you say yes.",
    delay: 320,
  },
  {
    icon: "🔒",
    color: "yellow",
    title: "No payment until you're ready",
    body: "Browse cleaners, chat with them, and confirm your choice. All before a single penny leaves your account. Your direct debit only starts once you've said yes.",
    delay: 400,
  },
  {
    icon: "📅",
    color: "purple",
    title: "Cancel anytime",
    body: "We work on a simple 30 day rolling contract. Give us 30 days notice and you're free to go, no awkward calls, no hidden fees. We'd rather earn your loyalty every month than lock you in.",
    delay: 480,
  },
  {
    icon: "🏠",
    color: "blue",
    title: "Your regular cleaner unavailable?",
    body: "If your cleaner can't make it, you can request a cover clean at the tap of a button. Vouchee instantly alerts available cleaners in your area so your home is taken care of, no matter what.",
    delay: 560,
  },
];

const colorMap = {
  blue: {
    bg: "linear-gradient(135deg, #eff6ff, #dbeafe)",
    shadow: "0 2px 12px rgba(59,130,246,0.13)",
  },
  yellow: {
    bg: "linear-gradient(135deg, #fefce8, #fef08a)",
    shadow: "0 2px 12px rgba(250,204,21,0.18)",
  },
  purple: {
    bg: "linear-gradient(135deg, #f5f3ff, #ede9fe)",
    shadow: "0 2px 12px rgba(139,92,246,0.13)",
  },
  green: {
    bg: "linear-gradient(135deg, #f0fdf4, #bbf7d0)",
    shadow: "0 2px 12px rgba(34,197,94,0.13)",
  },
};

function Card({ icon, color, title, body, delay }: {
  icon: string;
  color: "blue" | "yellow" | "purple" | "green";
  title: string;
  body: string;
  delay: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.15 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const c = colorMap[color];

  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(32px)",
        transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`,
        background: "rgba(255,255,255,0.72)",
        backdropFilter: "blur(16px)",
        borderRadius: "24px",
        padding: "32px",
        boxShadow: "0 4px 32px rgba(59,130,246,0.08), 0 1px 4px rgba(0,0,0,0.06)",
        border: "1.5px solid rgba(255,255,255,0.9)",
        display: "flex",
        gap: "20px",
        alignItems: "flex-start",
      }}
    >
      <div
        style={{
          width: "56px",
          height: "56px",
          borderRadius: "16px",
          background: c.bg,
          boxShadow: c.shadow,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "26px",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <h3 style={{
          margin: "0 0 8px",
          fontSize: "18px",
          fontWeight: 700,
          color: "#1e293b",
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          letterSpacing: "-0.3px",
        }}>
          {title}
        </h3>
        <p style={{
          margin: 0,
          fontSize: "15px",
          color: "#64748b",
          lineHeight: 1.65,
          fontFamily: "'DM Sans', sans-serif",
        }}>
          {body}
        </p>
      </div>
    </div>
  );
}

function CommitmentBoxDefault() {
  return (
    <div style={{
      background: "linear-gradient(135deg, #1e40af, #3b82f6)",
      borderRadius: "28px", padding: "36px",
      position: "relative", overflow: "hidden",
    }}>
      <div style={{ position: "absolute", top: "-40px", right: "-40px", width: "180px", height: "180px", borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />
      <div style={{ position: "absolute", bottom: "-60px", right: "60px", width: "240px", height: "240px", borderRadius: "50%", background: "rgba(250,204,21,0.12)" }} />
      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "12px", fontWeight: 600, letterSpacing: "1.5px", textTransform: "uppercase", color: "#fde68a", marginBottom: "10px" }}>Our commitment to you</p>
      <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: "24px", fontWeight: 800, color: "white", marginBottom: "12px", letterSpacing: "-0.5px", position: "relative", zIndex: 1 }}>Unhappy? Find a replacement for free.</h2>
      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "15px", color: "rgba(255,255,255,0.82)", lineHeight: 1.65, position: "relative", zIndex: 1, marginBottom: "28px" }}>
        If your chosen cleaner does not meet your expectations, you can re-publish your ad at the press of a button and we&apos;ll discount your first session with your new cleaner, to make sure it&apos;s a good fit.
      </p>
      <Link href="/request/property" style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "#facc15", color: "#1e293b", fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: "15px", padding: "14px 26px", borderRadius: "100px", textDecoration: "none", position: "relative", zIndex: 1, boxShadow: "0 4px 20px rgba(250,204,21,0.4)" }}>
        Find my cleaner →
      </Link>
    </div>
  )
}

function CommitmentBox() {
  const searchParams = useSearchParams();
  const from = searchParams.get("from");
  const isFromFrequency = from === "frequency";

  return (
    <div style={{
      background: "linear-gradient(135deg, #1e40af, #3b82f6)",
      borderRadius: "28px", padding: "36px",
      position: "relative", overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", top: "-40px", right: "-40px",
        width: "180px", height: "180px", borderRadius: "50%",
        background: "rgba(255,255,255,0.08)",
      }} />
      <div style={{
        position: "absolute", bottom: "-60px", right: "60px",
        width: "240px", height: "240px", borderRadius: "50%",
        background: "rgba(250,204,21,0.12)",
      }} />

      <p style={{
        fontFamily: "'DM Sans', sans-serif", fontSize: "12px", fontWeight: 600,
        letterSpacing: "1.5px", textTransform: "uppercase",
        color: "#fde68a", marginBottom: "10px",
      }}>
        Our commitment to you
      </p>
      <h2 style={{
        fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: "24px",
        fontWeight: 800, color: "white", marginBottom: "12px",
        letterSpacing: "-0.5px", position: "relative", zIndex: 1,
      }}>
        Unhappy? Find a replacement for free.
      </h2>
      <p style={{
        fontFamily: "'DM Sans', sans-serif", fontSize: "15px",
        color: "rgba(255,255,255,0.82)", lineHeight: 1.65,
        position: "relative", zIndex: 1, marginBottom: "28px",
      }}>
        If your chosen cleaner does not meet your expectations, you can re-publish your
        ad at the press of a button and we&apos;ll discount your first session with your
        new cleaner, to make sure it&apos;s a good fit.
      </p>

      {isFromFrequency ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", position: "relative", zIndex: 1 }}>
          <Link
            href="/request/frequency"
            style={{
              display: "inline-flex", alignItems: "center", gap: "8px",
              background: "#facc15", color: "#1e293b",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 700, fontSize: "15px",
              padding: "14px 26px", borderRadius: "100px",
              textDecoration: "none",
              boxShadow: "0 4px 20px rgba(250,204,21,0.4)",
              alignSelf: "flex-start",
            }}
          >
            Continue publishing →
          </Link>
          <p style={{
            fontFamily: "'DM Sans', sans-serif", fontSize: "13px",
            color: "rgba(255,255,255,0.6)", margin: 0,
          }}>
            You were almost there — pick up where you left off.
          </p>
        </div>
      ) : (
        <Link
          href="/request/property"
          style={{
            display: "inline-flex", alignItems: "center", gap: "8px",
            background: "#facc15", color: "#1e293b",
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontWeight: 700, fontSize: "15px",
            padding: "14px 26px", borderRadius: "100px",
            textDecoration: "none", position: "relative", zIndex: 1,
            boxShadow: "0 4px 20px rgba(250,204,21,0.4)",
          }}
        >
          Find my cleaner →
        </Link>
      )}
    </div>
  );
}

export default function WhyVouchee() {
  const [heroVisible, setHeroVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setHeroVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&family=DM+Sans:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
      `}</style>

      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(160deg, #eff6ff 0%, #f8faff 40%, #fffbeb 100%)",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Background blobs */}
        <div style={{
          position: "fixed", top: "-120px", right: "-120px",
          width: "480px", height: "480px", borderRadius: "50%",
          background: "radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)",
          pointerEvents: "none", zIndex: 0,
        }} />
        <div style={{
          position: "fixed", bottom: "-80px", left: "-80px",
          width: "360px", height: "360px", borderRadius: "50%",
          background: "radial-gradient(circle, rgba(250,204,21,0.15) 0%, transparent 70%)",
          pointerEvents: "none", zIndex: 0,
        }} />

        <div style={{
          position: "relative", zIndex: 1,
          maxWidth: "680px", margin: "0 auto",
          padding: "60px 24px 80px",
        }}>
          {/* Hero */}
          <div style={{
            opacity: heroVisible ? 1 : 0,
            transform: heroVisible ? "translateY(0)" : "translateY(20px)",
            transition: "opacity 0.7s ease, transform 0.7s ease",
          }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: "6px",
              background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)",
              borderRadius: "100px", padding: "6px 14px", fontSize: "13px",
              fontWeight: 600, color: "#3b82f6", fontFamily: "'DM Sans', sans-serif",
              marginBottom: "20px",
            }}>
              ✦ For homeowners in Horsham
            </div>

            <h1 style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: "clamp(32px, 6vw, 48px)",
              fontWeight: 800, color: "#0f172a",
              lineHeight: 1.15, letterSpacing: "-1px", marginBottom: "18px",
            }}>
              Cleaning you can trust,{" "}
              <span style={{
                background: "linear-gradient(135deg, #3b82f6, #60a5fa)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}>
                on your terms.
              </span>
            </h1>

            <p style={{
              fontFamily: "'DM Sans', sans-serif", fontSize: "17px",
              color: "#475569", lineHeight: 1.7, marginBottom: "48px", maxWidth: "520px",
            }}>
              Vouchee connects you with local, vouched-for cleaners and puts you in complete
              control of who gives you a helping hand at home. No guesswork, no surprises.
            </p>

            <div style={{
              width: "48px", height: "4px",
              background: "linear-gradient(90deg, #3b82f6, #facc15)",
              borderRadius: "100px", marginBottom: "40px",
            }} />
          </div>

          {/* Cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "56px" }}>
            {cards.map((card, i) => (
              <Card key={i} {...card} color={card.color as "blue" | "yellow" | "purple" | "green"} />
            ))}
          </div>

          {/* Commitment box */}
          <Suspense fallback={<CommitmentBoxDefault />}>
            <CommitmentBox />
          </Suspense>

          <p style={{
            textAlign: "center", fontFamily: "'DM Sans', sans-serif",
            fontSize: "14px", color: "#94a3b8", marginTop: "32px",
          }}>
            No card details needed to browse.{" "}
            <span style={{ color: "#3b82f6", fontWeight: 500 }}>Free to get started.</span>
          </p>
        </div>
      </div>
    </>
  );
}
