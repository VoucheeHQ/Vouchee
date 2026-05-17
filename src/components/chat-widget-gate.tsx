'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'

// ─────────────────────────────────────────────────────────────────────────────
// ChatWidgetGate — auth-gated, code-split entry point for the chat widget.
//
// The full ChatWidget is ~1150 lines of TSX plus a Supabase Realtime client.
// Before this gate, every page on the site downloaded and parsed it, including
// marketing pages visited by logged-out users who can't even use the chat.
//
// This wrapper:
//   1. Mounts as a tiny client component on every page (cheap)
//   2. Does one fast session check via supabase.auth.getSession() — reads from
//      localStorage, no network round-trip in the common case
//   3. If no session, returns null. The dynamic import below is never
//      triggered, so the ChatWidget bundle is never downloaded for that visit
//   4. If a session exists, the dynamic import kicks in and the widget mounts
//      after first paint (ssr: false defers it past hydration)
//
// Also subscribes to auth state changes so logging in/out from another tab
// (or via the auth flow on this tab) flips the gate without a page refresh.
// ─────────────────────────────────────────────────────────────────────────────

const ChatWidget = dynamic(
  () => import('@/components/chat-widget').then(m => ({ default: m.ChatWidget })),
  { ssr: false, loading: () => null }
)

export function ChatWidgetGate() {
  const [hasSession, setHasSession] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    let cancelled = false

    // Fast path: getSession() reads from local storage, no network needed
    // in the common case (token still valid). Sub-millisecond.
    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) setHasSession(!!data.session)
    })

    // Stay in sync if the user logs in or out (other tab, or this page's
    // auth flow). Triggers the dynamic import the moment a session exists.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!cancelled) setHasSession(!!session)
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  if (!hasSession) return null
  return <ChatWidget />
}
