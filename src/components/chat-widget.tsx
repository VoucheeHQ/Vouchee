'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Conversation {
  id: string
  cleaner_id: string
  customer_id: string
  clean_request_id: string
  status: string
}

interface EnrichedConversation extends Conversation {
  displayName: string
  zone: string
  lastMessage: string
  lastMessageTime: string | null
  unread: boolean
  conversationIndex?: number
}

interface Message {
  id: string
  conversation_id: string
  sender_id: string
  sender_role: 'customer' | 'cleaner'
  content: string
  created_at: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ZONE_LABELS: Record<string, string> = {
  central_south_east: 'Central / South East',
  north_west: 'North West',
  north_east_roffey: 'North East / Roffey',
  south_west: 'South West',
  warnham_north: 'Warnham / North',
  broadbridge_heath: 'Broadbridge Heath',
  mannings_heath: 'Mannings Heath',
  faygate_kilnwood_vale: 'Faygate / Kilnwood Vale',
  christs_hospital: "Christ's Hospital",
}

const WATCHLIST = ['07', '+44', 'whatsapp', 'email', '@', 'bank', 'address', 'go direct', 'go private', 'direct payment', 'cash']

const SUGGESTED_QUESTIONS = [
  "When are you next available?",
  "Do you bring your own supplies?",
  "Have you cleaned a similar-sized property before?",
  "Are you flexible on timing?",
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatFirstLastInitial(name: string): string {
  const parts = (name ?? '').trim().split(' ')
  if (parts.length > 1) return `${parts[0]} ${parts[parts.length - 1][0]}.`
  return parts[0] || 'Chat'
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  if (d.toDateString() === today.toDateString()) return 'Today'
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

// ─── Chat Window (expanded) ───────────────────────────────────────────────────

function ChatWindow({ conversation, currentUserId, currentRole, onMinimize, onClose }: {
  conversation: EnrichedConversation
  currentUserId: string
  currentRole: 'customer' | 'cleaner'
  onMinimize: () => void
  onClose: () => void
}) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [warningShown, setWarningShown] = useState(false)
  const [showWarning, setShowWarning] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  const checkWatchlist = (text: string) => {
    if (warningShown) return false
    const lower = text.toLowerCase()
    return WATCHLIST.some(w => lower.includes(w))
  }

  useEffect(() => {
    const load = async () => {
      const { data } = await (supabase as any)
        .from('messages')
        .select('*')
        .eq('conversation_id', conversation.id)
        .order('created_at', { ascending: true })
      setMessages(data ?? [])
      setLoading(false)
    }
    load()

    const channel = supabase
      .channel(`chat-widget-${conversation.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversation.id}`,
      }, payload => {
        setMessages(prev => [...prev, payload.new as Message])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [conversation.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || sending) return
    if (checkWatchlist(input)) {
      setShowWarning(true)
      setWarningShown(true)
      return
    }
    setSending(true)
    const content = input.trim()
    setInput('')
    await (supabase as any).from('messages').insert({
      conversation_id: conversation.id,
      sender_id: currentUserId,
      sender_role: currentRole,
      content,
    })
    setSending(false)
  }

  const getSenderLabel = (msg: Message) => {
    if ((currentRole === 'customer' && msg.sender_role === 'customer') ||
        (currentRole === 'cleaner' && msg.sender_role === 'cleaner')) {
      return 'You'
    }
    return conversation.displayName
  }

  // Group messages by date
  const groupedMessages: { date: string; msgs: Message[] }[] = []
  messages.forEach(msg => {
    const dateKey = formatDate(msg.created_at)
    const last = groupedMessages[groupedMessages.length - 1]
    if (last && last.date === dateKey) {
      last.msgs.push(msg)
    } else {
      groupedMessages.push({ date: dateKey, msgs: [msg] })
    }
  })

  return (
    <div style={{
      width: '328px', height: '455px', background: 'white',
      borderRadius: '8px 8px 0 0', boxShadow: '0 -2px 16px rgba(0,0,0,0.15)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      fontFamily: "var(--font-dm-sans, 'DM Sans', sans-serif)",
    }}>
      {/* Header */}
      <div
        onClick={onMinimize}
        style={{
          padding: '10px 12px', background: '#1e293b', color: 'white',
          display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        <div style={{
          width: '32px', height: '32px', borderRadius: '50%', background: '#3b82f6',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '13px', fontWeight: 800, flexShrink: 0,
        }}>
          {conversation.displayName[0]?.toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '13px', fontWeight: 700, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {conversation.displayName}
          </div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.2 }}>
            {conversation.zone}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
          <button onClick={e => { e.stopPropagation(); onMinimize() }} style={{
            background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)',
            cursor: 'pointer', fontSize: '18px', padding: '0 4px', lineHeight: 1,
          }}>−</button>
          <button onClick={e => { e.stopPropagation(); onClose() }} style={{
            background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)',
            cursor: 'pointer', fontSize: '16px', padding: '0 4px', lineHeight: 1,
          }}>✕</button>
        </div>
      </div>

      {/* Warning banner */}
      {showWarning && (
        <div style={{
          padding: '8px 12px', background: '#fffbeb', borderBottom: '1px solid #fde68a',
          display: 'flex', gap: '8px', alignItems: 'flex-start', flexShrink: 0,
        }}>
          <span style={{ fontSize: '14px', flexShrink: 0 }}>⚠️</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#92400e' }}>Keep conversations on Vouchee</div>
            <div style={{ fontSize: '11px', color: '#b45309', lineHeight: 1.4 }}>Please keep all communication within Vouchee to protect both parties.</div>
          </div>
          <button onClick={() => setShowWarning(false)} style={{
            background: 'none', border: 'none', cursor: 'pointer', color: '#92400e', fontSize: '14px', flexShrink: 0,
          }}>✕</button>
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '12px', paddingTop: '24px' }}>Loading…</div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '12px', paddingTop: '24px' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>💬</div>
            <div style={{ fontWeight: 600, color: '#475569', marginBottom: '2px', fontSize: '13px' }}>Start the conversation</div>
            <div>Send a message to get started</div>
          </div>
        ) : (
          groupedMessages.map((group, gi) => (
            <div key={gi}>
              <div style={{
                textAlign: 'center', fontSize: '10px', fontWeight: 600, color: '#94a3b8',
                margin: '12px 0 8px', textTransform: 'uppercase', letterSpacing: '0.05em',
              }}>
                {group.date}
              </div>
              {group.msgs.map(msg => {
                const isMe = (currentRole === 'customer' && msg.sender_role === 'customer') ||
                             (currentRole === 'cleaner' && msg.sender_role === 'cleaner')
                const label = getSenderLabel(msg)
                const time = formatTime(msg.created_at)
                return (
                  <div key={msg.id} style={{ marginBottom: '8px' }}>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '2px', fontWeight: 600 }}>
                      {label} <span style={{ fontWeight: 400 }}>({time})</span>
                    </div>
                    <div style={{
                      maxWidth: '85%', padding: '8px 12px',
                      borderRadius: isMe ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                      background: isMe ? '#2563eb' : '#f1f5f9',
                      color: isMe ? 'white' : '#0f172a',
                      fontSize: '13px', lineHeight: 1.5,
                      marginLeft: isMe ? 'auto' : '0',
                      width: 'fit-content',
                    }}>
                      {msg.content}
                    </div>
                  </div>
                )
              })}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggested questions */}
      {messages.length === 0 && !loading && currentRole === 'customer' && (
        <div style={{ padding: '0 12px 8px', flexShrink: 0 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {SUGGESTED_QUESTIONS.map((q, i) => (
              <button key={i} onClick={() => setInput(q)} style={{
                padding: '4px 10px', borderRadius: '100px', border: '1px solid #e2e8f0',
                background: 'white', fontSize: '11px', fontWeight: 600, color: '#475569',
                cursor: 'pointer', fontFamily: "var(--font-dm-sans, 'DM Sans', sans-serif)",
              }}>{q}</button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div style={{
        padding: '8px 12px', borderTop: '1px solid #f1f5f9',
        display: 'flex', gap: '6px', flexShrink: 0,
      }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
          placeholder="Write a message…"
          style={{
            flex: 1, padding: '8px 12px', borderRadius: '8px',
            border: '1px solid #e2e8f0', fontSize: '13px',
            fontFamily: "var(--font-dm-sans, 'DM Sans', sans-serif)",
            outline: 'none', color: '#0f172a',
          }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || sending}
          style={{
            padding: '8px 14px', borderRadius: '8px', border: 'none',
            background: input.trim() ? '#2563eb' : '#e2e8f0',
            color: input.trim() ? 'white' : '#94a3b8',
            fontWeight: 700, fontSize: '13px',
            cursor: input.trim() ? 'pointer' : 'not-allowed',
            fontFamily: "var(--font-dm-sans, 'DM Sans', sans-serif)",
          }}
        >Send</button>
      </div>
    </div>
  )
}

// ─── Collapsed Tab ────────────────────────────────────────────────────────────

function ChatTab({ conversation, onClick }: {
  conversation: EnrichedConversation
  onClick: () => void
}) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: '8px',
      padding: '8px 14px 8px 8px', background: '#1e293b', color: 'white',
      border: 'none', borderRadius: '8px 8px 0 0', cursor: 'pointer',
      fontFamily: "var(--font-dm-sans, 'DM Sans', sans-serif)",
      boxShadow: '0 -2px 8px rgba(0,0,0,0.12)',
      maxWidth: '200px',
    }}>
      <div style={{
        width: '28px', height: '28px', borderRadius: '50%', background: '#3b82f6',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '12px', fontWeight: 800, flexShrink: 0,
      }}>
        {conversation.displayName[0]?.toUpperCase()}
      </div>
      <span style={{
        fontSize: '13px', fontWeight: 700, overflow: 'hidden',
        textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {conversation.displayName}
      </span>
      {conversation.unread && (
        <span style={{
          width: '8px', height: '8px', borderRadius: '50%',
          background: '#22c55e', flexShrink: 0,
        }} />
      )}
    </button>
  )
}

// ─── Enrich helper (shared between init and refresh) ──────────────────────────

async function enrichConversations(
  supabase: any,
  convos: Conversation[],
  role: 'customer' | 'cleaner',
  existingConversations?: EnrichedConversation[]
): Promise<EnrichedConversation[]> {
  const enriched: EnrichedConversation[] = await Promise.all(
    convos.map(async (conv) => {
      // Reuse existing enrichment if available
      if (existingConversations) {
        const existing = existingConversations.find(c => c.id === conv.id)
        if (existing) return existing
      }

      let displayName = 'Chat'
      let zone = 'Horsham'

      if (role === 'customer') {
        const { data: cleaner } = await (supabase as any)
          .from('cleaners')
          .select('profile_id, profiles(full_name), zones')
          .eq('id', conv.cleaner_id)
          .single()
        if (cleaner?.profiles?.full_name) {
          displayName = formatFirstLastInitial(cleaner.profiles.full_name)
        }
        zone = cleaner?.zones?.[0] ? (ZONE_LABELS[cleaner.zones[0]] ?? cleaner.zones[0]) : 'Horsham'
      } else {
        const { data: req } = await (supabase as any)
          .from('clean_requests')
          .select('zone')
          .eq('id', conv.clean_request_id)
          .single()
        const zoneKey = req?.zone ?? 'central_south_east'
        zone = ZONE_LABELS[zoneKey] ?? zoneKey
        displayName = zone
      }

      const { data: lastMsg } = await (supabase as any)
        .from('messages')
        .select('content, created_at')
        .eq('conversation_id', conv.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      return {
        ...conv,
        displayName,
        zone,
        lastMessage: lastMsg?.content ?? '',
        lastMessageTime: lastMsg?.created_at ?? null,
        unread: false,
      }
    })
  )

  // For cleaners: if multiple chats in same zone, add index
  if (role === 'cleaner') {
    const zoneCounts: Record<string, number> = {}
    enriched.forEach(c => { zoneCounts[c.zone] = (zoneCounts[c.zone] ?? 0) + 1 })
    const zoneIndexes: Record<string, number> = {}
    enriched.forEach(c => {
      if (zoneCounts[c.zone] > 1) {
        zoneIndexes[c.zone] = (zoneIndexes[c.zone] ?? 0) + 1
        c.conversationIndex = zoneIndexes[c.zone]
        c.displayName = `${c.zone} ${c.conversationIndex}`
      }
    })
  }

  return enriched
}

async function fetchUserConversations(supabase: any, userId: string, role: 'customer' | 'cleaner'): Promise<Conversation[]> {
  if (role === 'customer') {
    const { data: cust } = await (supabase as any)
      .from('customers').select('id').eq('profile_id', userId).single()
    if (cust) {
      const { data } = await (supabase as any)
        .from('conversations').select('*').eq('customer_id', cust.id)
      return data ?? []
    }
  } else {
    const { data: cl } = await (supabase as any)
      .from('cleaners').select('id').eq('profile_id', userId).single()
    if (cl) {
      const { data } = await (supabase as any)
        .from('conversations').select('*').eq('cleaner_id', cl.id)
      return data ?? []
    }
  }
  return []
}

// ─── Main Widget ──────────────────────────────────────────────────────────────

export function ChatWidget() {
  const [conversations, setConversations] = useState<EnrichedConversation[]>([])
  const [openIds, setOpenIds] = useState<Set<string>>(new Set())
  const [minimizedIds, setMinimizedIds] = useState<Set<string>>(new Set())
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentRole, setCurrentRole] = useState<'customer' | 'cleaner' | null>(null)
  const [initialized, setInitialized] = useState(false)
  const conversationsRef = useRef<EnrichedConversation[]>([])
  const supabase = createClient()

  // Keep ref in sync
  useEffect(() => {
    conversationsRef.current = conversations
  }, [conversations])

  // Load user & conversations on mount
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setInitialized(true); return }

      setCurrentUserId(user.id)

      const { data: profile } = await (supabase as any)
        .from('profiles').select('role').eq('id', user.id).single()
      if (!profile) { setInitialized(true); return }

      const role = profile.role as 'customer' | 'cleaner'
      setCurrentRole(role)

      const convos = await fetchUserConversations(supabase, user.id, role)
      const enriched = await enrichConversations(supabase, convos, role)

      setConversations(enriched)
      setInitialized(true)
    }
    init()
  }, [])

  // Listen for auth changes — only handle sign out
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setConversations([])
        setOpenIds(new Set())
        setMinimizedIds(new Set())
        setCurrentUserId(null)
        setCurrentRole(null)
        setInitialized(false)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  // Listen for custom event — ALWAYS registered, regardless of ready state
  useEffect(() => {
    const handler = async (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (!detail?.conversationId) return

      const convId = detail.conversationId

      // If we already have this conversation loaded, just open it
      const existing = conversationsRef.current.find(c => c.id === convId)
      if (existing) {
        setOpenIds(prev => new Set(prev).add(convId))
        setMinimizedIds(prev => {
          const next = new Set(prev)
          next.delete(convId)
          return next
        })
        return
      }

      // Otherwise, re-fetch all conversations to pick up the new one
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await (supabase as any)
        .from('profiles').select('role').eq('id', user.id).single()
      if (!profile) return

      const role = profile.role as 'customer' | 'cleaner'
      setCurrentUserId(user.id)
      setCurrentRole(role)

      const convos = await fetchUserConversations(supabase, user.id, role)
      const enriched = await enrichConversations(supabase, convos, role, conversationsRef.current)

      setConversations(enriched)
      setInitialized(true)

      // Open the requested conversation
      setOpenIds(prev => new Set(prev).add(convId))
      setMinimizedIds(prev => {
        const next = new Set(prev)
        next.delete(convId)
        return next
      })
    }

    window.addEventListener('vouchee:open-chat', handler)
    return () => window.removeEventListener('vouchee:open-chat', handler)
  }, [])

  // Listen for URL param (?chat=conversationId)
  useEffect(() => {
    if (!initialized) return
    const params = new URLSearchParams(window.location.search)
    const chatId = params.get('chat')
    if (chatId) {
      // Clean URL
      const url = new URL(window.location.href)
      url.searchParams.delete('chat')
      window.history.replaceState({}, '', url.toString())

      // Dispatch as event so the handler above deals with it
      window.dispatchEvent(new CustomEvent('vouchee:open-chat', {
        detail: { conversationId: chatId },
      }))
    }
  }, [initialized])

  const openConversation = useCallback((id: string) => {
    setOpenIds(prev => new Set(prev).add(id))
    setMinimizedIds(prev => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }, [])

  const minimizeConversation = useCallback((id: string) => {
    setMinimizedIds(prev => new Set(prev).add(id))
  }, [])

  const closeConversation = useCallback((id: string) => {
    setOpenIds(prev => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
    setMinimizedIds(prev => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }, [])

  // Don't render if not initialized or not logged in
  if (!initialized || !currentUserId || !currentRole) return null
  // Don't render if no conversations AND none are open (allows rendering when event opens one)
  if (conversations.length === 0 && openIds.size === 0) return null

  const openExpanded = conversations.filter(c => openIds.has(c.id) && !minimizedIds.has(c.id))
  const collapsed = conversations.filter(c => !openIds.has(c.id) || minimizedIds.has(c.id))

  return (
    <div style={{
      position: 'fixed', bottom: 0, right: '16px', zIndex: 400,
      display: 'flex', alignItems: 'flex-end', gap: '8px',
      pointerEvents: 'none',
    }}>
      {/* Collapsed tabs */}
      {collapsed.length > 0 && (
        <div style={{ display: 'flex', gap: '4px', pointerEvents: 'auto' }}>
          {collapsed.map(conv => (
            <ChatTab key={conv.id} conversation={conv} onClick={() => openConversation(conv.id)} />
          ))}
        </div>
      )}

      {/* Expanded windows */}
      {openExpanded.map(conv => (
        <div key={conv.id} style={{ pointerEvents: 'auto' }}>
          <ChatWindow
            conversation={conv}
            currentUserId={currentUserId}
            currentRole={currentRole}
            onMinimize={() => minimizeConversation(conv.id)}
            onClose={() => closeConversation(conv.id)}
          />
        </div>
      ))}
    </div>
  )
}
