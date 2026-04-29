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
  displayName: string         // header line 1: "Alison C." (customer) or "Faygate / Kilnwood Vale" (cleaner)
  avatarLabel: string         // big letter/number in the avatar bubble — "A" for customer, "1" / "2" for cleaner
  subtitle: string            // header line 2: zone name (cleaner) or zone (customer)
  zone: string
  lastMessage: string
  lastMessageTime: string | null
  unread: number
  conversationIndex?: number
  avatarColor: string
  applicationId?: string
  requestStatus?: string
  requestFrequency?: string
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
  "What slot works best for you?",
  "How are you with pets?",
]

const SUPPLIES_FOLLOWUP = "If not, what products should I get?"

const AVATAR_COLORS = [
  '#e67e22', '#e74c3c', '#9b59b6', '#16a085', '#d35400',
  '#c0392b', '#8e44ad', '#2980b9', '#27ae60', '#f39c12',
]

function getAvatarColor(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

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

function formatLastMessageTime(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const today = new Date()
  if (d.toDateString() === today.toDateString()) {
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function isSystemMessage(content: string): boolean {
  return content.includes('__system__')
}

function getSystemMessageText(content: string): string {
  return content.replace(/🗓️\s*__system__\s*/g, '').replace(/__system__\s*/g, '').trim()
}

// ─── Notification sound ───────────────────────────────────────────────────────

function playNotificationSound() {
  try {
    const audio = new Audio('/notification_clean.mp3')
    audio.volume = 0.7
    audio.play().catch(() => {})
  } catch (e) {}
}

// ─── Email notification ───────────────────────────────────────────────────────

async function triggerMessageEmail(conversationId: string, content: string) {
  try {
    await fetch('/api/send-message-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId, content }),
    })
  } catch (e) {}
}

// ─── Violation logger ─────────────────────────────────────────────────────────

async function logViolation(conversationId: string, messageContent: string, triggeredKeywords: string[], senderId: string, senderRole: string) {
  try {
    await fetch('/api/log-violation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId, messageContent, triggeredKeywords, senderId, senderRole }),
    })
  } catch (e) {}
}

// ─── Typing dots ──────────────────────────────────────────────────────────────

function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: '3px', alignItems: 'center', padding: '4px 0' }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: '6px', height: '6px', borderRadius: '50%', background: '#94a3b8',
          display: 'inline-block',
          animation: 'typingBounce 1.2s ease-in-out infinite',
          animationDelay: `${i * 0.2}s`,
        }} />
      ))}
      <style>{`
        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ label, color, size = 36 }: { label: string; color: string; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: color, flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.42, fontWeight: 800, color: 'white',
    }}>
      {label}
    </div>
  )
}

// ─── Chat Window ──────────────────────────────────────────────────────────────

function ChatWindow({ conversation, currentUserId, currentRole, onClose }: {
  conversation: EnrichedConversation
  currentUserId: string
  currentRole: 'customer' | 'cleaner'
  onClose: () => void
}) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [warningShown, setWarningShown] = useState(false)
  const [showWarning, setShowWarning] = useState(false)
  const [showSuppliesFollowup, setShowSuppliesFollowup] = useState(false)
  const [customerHasSent, setCustomerHasSent] = useState(false)
  const [otherIsTyping, setOtherIsTyping] = useState(false)
  const [applicationId, setApplicationId] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const channelRef = useRef<any>(null)
  const supabase = createClient()

  const getTriggeredKeywords = (text: string): string[] =>
    WATCHLIST.filter(w => text.toLowerCase().includes(w))

  useEffect(() => {
    const load = async () => {
      const { data, error } = await (supabase as any)
        .from('messages')
        .select('*')
        .eq('conversation_id', conversation.id)
        .order('created_at', { ascending: true })

      if (!error) {
        const msgs = data ?? []
        setMessages(msgs)
        if (currentRole === 'customer') {
          setCustomerHasSent(msgs.some((m: Message) => m.sender_role === 'customer' && !isSystemMessage(m.content)))
        }
      }

      if (currentRole === 'customer') {
        const { data: appData } = await (supabase as any)
          .from('applications')
          .select('id')
          .eq('request_id', conversation.clean_request_id)
          .eq('cleaner_id', conversation.cleaner_id)
          .in('status', ['accepted', 'pending'])
          .single()
        if (appData?.id) setApplicationId(appData.id)
      }

      setLoading(false)
    }
    load()

    const channel = supabase.channel(`conversation:${conversation.id}`, {
      config: { broadcast: { self: false }, presence: { key: currentUserId } },
    })

    channel
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
        const msg = payload.new as Message
        if (msg.conversation_id !== conversation.id) return
        setMessages(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, msg])
        if (msg.sender_id !== currentUserId) {
          setOtherIsTyping(false)
          if (!isSystemMessage(msg.content)) playNotificationSound()
        }
      })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const anyOtherTyping = Object.entries(state)
          .filter(([key]) => key !== currentUserId)
          .some(([, presences]) => (presences as any[]).some(p => p.typing === true))
        setOtherIsTyping(anyOtherTyping)
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }: { key: string; newPresences: any[] }) => {
        if (key === currentUserId) return
        if (newPresences.some(p => p.typing === true)) setOtherIsTyping(true)
      })
      .on('presence', { event: 'leave' }, ({ key }: { key: string }) => {
        if (key !== currentUserId) setOtherIsTyping(false)
      })
      .subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED') await channel.track({ typing: false })
      })

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    }
  }, [conversation.id, currentUserId])

  // Handle abandoned GoCardless flow
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const abandoned = params.get('gc_abandoned')
    const abandonedConvId = params.get('conversationId')

    if (abandoned === '1' && abandonedConvId === conversation.id && currentRole === 'customer') {
      const url = new URL(window.location.href)
      url.searchParams.delete('gc_abandoned')
      url.searchParams.delete('conversationId')
      window.history.replaceState({}, '', url.toString())

      const postAbandoned = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        await (supabase as any).from('messages').insert({
          conversation_id: conversation.id,
          sender_id: user.id,
          sender_role: 'customer',
          content: '__system__ Vouchee: Customer did not complete set-up.',
        })
      }
      postAbandoned()
    }
  }, [conversation.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, otherIsTyping])

  const broadcastTyping = (isTyping: boolean) => {
    channelRef.current?.track({ typing: isTyping })
  }

  const handleInputChange = (val: string) => {
    setInput(val)
    broadcastTyping(val.length > 0)
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    if (val.length > 0) {
      typingTimeoutRef.current = setTimeout(() => broadcastTyping(false), 3000)
    }
  }

  const handleSend = async (overrideContent?: string) => {
    const content = (overrideContent ?? input).trim()
    if (!content || sending) return

    const triggered = getTriggeredKeywords(content)
    if (triggered.length > 0 && !warningShown) {
      setShowWarning(true)
      setWarningShown(true)
      logViolation(conversation.id, content, triggered, currentUserId, currentRole)
      return
    }

    setSending(true)
    setInput('')
    setShowSuppliesFollowup(false)
    broadcastTyping(false)
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)

    const { data: inserted, error } = await (supabase as any)
      .from('messages')
      .insert({ conversation_id: conversation.id, sender_id: currentUserId, sender_role: currentRole, content })
      .select().single()

    if (error) {
      console.error('Message insert failed:', error)
    } else if (inserted) {
      setMessages(prev => prev.find(m => m.id === inserted.id) ? prev : [...prev, inserted])
      if (currentRole === 'customer') setCustomerHasSent(true)
      triggerMessageEmail(conversation.id, content)
    }
    setSending(false)
  }

  const handleApprove = () => {
    if (!applicationId) return
    window.dispatchEvent(new CustomEvent('vouchee:approve-cleaner', {
      detail: {
        applicationId,
        requestId: conversation.clean_request_id,
        conversationId: conversation.id,
        cleanerName: conversation.displayName,
        frequency: conversation.requestFrequency ?? 'monthly',
      },
    }))
  }

  const handleSuggestedQuestion = (q: string) => {
    if (q === "Do you bring your own supplies?") {
      setShowSuppliesFollowup(true)
      setInput(q)
    } else {
      handleSend(q)
    }
  }

  const getSenderLabel = (msg: Message) => {
    const isMe =
      (currentRole === 'customer' && msg.sender_role === 'customer') ||
      (currentRole === 'cleaner' && msg.sender_role === 'cleaner')
    return isMe ? 'You' : conversation.displayName
  }

  const groupedMessages: { date: string; msgs: Message[] }[] = []
  messages.forEach(msg => {
    const dateKey = formatDate(msg.created_at)
    const last = groupedMessages[groupedMessages.length - 1]
    if (last && last.date === dateKey) last.msgs.push(msg)
    else groupedMessages.push({ date: dateKey, msgs: [msg] })
  })

  const showSuggestions = currentRole === 'customer' && !customerHasSent && !loading
  const isFulfilled = conversation.requestStatus === 'fulfilled'
  const showApproveButton = currentRole === 'customer' && !isFulfilled && applicationId

  return (
    <div style={{
      width: '328px', height: showApproveButton ? '480px' : '440px',
      background: 'white', borderRadius: '8px 8px 0 0',
      boxShadow: '0 -2px 16px rgba(0,0,0,0.18)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      fontFamily: "var(--font-dm-sans, 'DM Sans', sans-serif)",
      transition: 'height 0.2s ease',
    }}>
      {/* Header */}
      <div style={{ padding: '10px 12px', background: '#1e293b', color: 'white', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
        <Avatar label={conversation.avatarLabel} color={conversation.avatarColor} size={32} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '13px', fontWeight: 700, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {conversation.displayName}
          </div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.2 }}>
            {otherIsTyping ? `${conversation.displayName.split(' ')[0]} is typing…` : conversation.subtitle}
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: '16px', padding: '0 4px', lineHeight: 1 }}>✕</button>
      </div>

      {/* Approve button bar */}
      {showApproveButton && (
        <div style={{ padding: '8px 12px', background: '#f0fdf4', borderBottom: '1px solid #bbf7d0', flexShrink: 0 }}>
          <button
            onClick={handleApprove}
            style={{
              width: '100%', background: '#16a34a', color: 'white', border: 'none',
              borderRadius: '8px', padding: '9px 0', fontSize: '13px', fontWeight: 700,
              cursor: 'pointer', fontFamily: "var(--font-dm-sans, 'DM Sans', sans-serif)",
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            }}
          >
            ✓ Select {conversation.displayName} for this job
          </button>
        </div>
      )}

      {showWarning && (
        <div style={{ padding: '10px 12px', background: '#fffbeb', borderBottom: '1px solid #fde68a', display: 'flex', gap: '8px', alignItems: 'flex-start', flexShrink: 0 }}>
          <span style={{ fontSize: '14px', flexShrink: 0 }}>⚠️</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#92400e' }}>Keep conversations on Vouchee</div>
            <div style={{ fontSize: '11px', color: '#b45309', lineHeight: 1.5 }}>
              Taking conversations off-platform removes your protection as a {currentRole}. All payments, scheduling and communication must stay within Vouchee.
            </div>
          </div>
          <button onClick={() => setShowWarning(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#92400e', fontSize: '14px', flexShrink: 0 }}>✕</button>
        </div>
      )}

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
              <div style={{ textAlign: 'center', fontSize: '10px', fontWeight: 600, color: '#94a3b8', margin: '12px 0 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {group.date}
              </div>
              {group.msgs.map(msg => {
                if (isSystemMessage(msg.content)) {
                  return (
                    <div key={msg.id} style={{ textAlign: 'center', margin: '10px 0' }}>
                      <span style={{ display: 'inline-block', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '100px', padding: '4px 12px', fontSize: '11px', fontWeight: 600, color: '#64748b', lineHeight: 1.5 }}>
                        {getSystemMessageText(msg.content)}
                      </span>
                    </div>
                  )
                }
                const isMe =
                  (currentRole === 'customer' && msg.sender_role === 'customer') ||
                  (currentRole === 'cleaner' && msg.sender_role === 'cleaner')
                return (
                  <div key={msg.id} style={{ marginBottom: '8px' }}>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '2px', fontWeight: 600 }}>
                      {getSenderLabel(msg)} <span style={{ fontWeight: 400 }}>({formatTime(msg.created_at)})</span>
                    </div>
                    <div style={{
                      maxWidth: '85%', padding: '8px 12px',
                      borderRadius: isMe ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                      background: isMe ? '#2563eb' : '#f1f5f9',
                      color: isMe ? 'white' : '#0f172a',
                      fontSize: '13px', lineHeight: 1.5,
                      marginLeft: isMe ? 'auto' : '0', width: 'fit-content',
                    }}>
                      {msg.content}
                    </div>
                  </div>
                )
              })}
            </div>
          ))
        )}
        {otherIsTyping && (
          <div style={{ marginBottom: '8px' }}>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '2px', fontWeight: 600 }}>
              {conversation.displayName.split(' ')[0]}
            </div>
            <div style={{ display: 'inline-block', padding: '8px 12px', borderRadius: '12px 12px 12px 4px', background: '#f1f5f9' }}>
              <TypingDots />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {showSuggestions && (
        <div style={{ padding: '0 12px 8px', flexShrink: 0 }}>
          {showSuppliesFollowup ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              <button onClick={() => handleSend(input)} style={{ padding: '4px 10px', borderRadius: '100px', border: '1px solid #bfdbfe', background: '#eff6ff', fontSize: '11px', fontWeight: 600, color: '#1d4ed8', cursor: 'pointer', fontFamily: "var(--font-dm-sans, 'DM Sans', sans-serif)" }}>
                Send: "Do you bring your own supplies?"
              </button>
              <button onClick={() => handleSend(SUPPLIES_FOLLOWUP)} style={{ padding: '4px 10px', borderRadius: '100px', border: '1px solid #bbf7d0', background: '#f0fdf4', fontSize: '11px', fontWeight: 600, color: '#15803d', cursor: 'pointer', fontFamily: "var(--font-dm-sans, 'DM Sans', sans-serif)" }}>
                Also ask: "{SUPPLIES_FOLLOWUP}"
              </button>
              <button onClick={() => { setShowSuppliesFollowup(false); setInput('') }} style={{ padding: '4px 10px', borderRadius: '100px', border: '1px solid #e2e8f0', background: 'white', fontSize: '11px', fontWeight: 600, color: '#94a3b8', cursor: 'pointer', fontFamily: "var(--font-dm-sans, 'DM Sans', sans-serif)" }}>
                Cancel
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {SUGGESTED_QUESTIONS.map((q, i) => (
                <button key={i} onClick={() => handleSuggestedQuestion(q)} style={{ padding: '4px 10px', borderRadius: '100px', border: '1px solid #e2e8f0', background: 'white', fontSize: '11px', fontWeight: 600, color: '#475569', cursor: 'pointer', fontFamily: "var(--font-dm-sans, 'DM Sans', sans-serif)" }}>
                  {q}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {isFulfilled && (
        <div style={{ padding: '8px 12px', background: '#f0fdf4', borderTop: '1px solid #bbf7d0', flexShrink: 0, textAlign: 'center' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#15803d' }}>✓ Job confirmed — chat stays open</span>
        </div>
      )}

      <div style={{ padding: '8px 12px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '6px', flexShrink: 0 }}>
        <input
          value={input}
          onChange={e => handleInputChange(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
          placeholder="Write a message…"
          style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px', fontFamily: "var(--font-dm-sans, 'DM Sans', sans-serif)", outline: 'none', color: '#0f172a' }}
        />
        <button onClick={() => handleSend()} disabled={!input.trim() || sending} style={{
          padding: '8px 14px', borderRadius: '8px', border: 'none',
          background: input.trim() ? '#2563eb' : '#e2e8f0',
          color: input.trim() ? 'white' : '#94a3b8',
          fontWeight: 700, fontSize: '13px',
          cursor: input.trim() ? 'pointer' : 'not-allowed',
          fontFamily: "var(--font-dm-sans, 'DM Sans', sans-serif)",
        }}>Send</button>
      </div>
    </div>
  )
}

// ─── Messaging Tray ───────────────────────────────────────────────────────────

function MessagingTray({ conversations, openIds, onOpen, onClose, totalUnread }: {
  conversations: EnrichedConversation[]
  openIds: Set<string>
  onOpen: (id: string) => void
  onClose: (id: string) => void
  totalUnread: number
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div style={{ position: 'relative', fontFamily: "var(--font-dm-sans, 'DM Sans', sans-serif)" }}>
      {expanded && (
        <div style={{ position: 'absolute', bottom: '100%', right: 0, marginBottom: '4px', width: '300px', background: 'white', borderRadius: '8px', boxShadow: '0 4px 24px rgba(0,0,0,0.18)', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>Messages</span>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>{conversations.length} conversation{conversations.length !== 1 ? 's' : ''}</span>
          </div>
          <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
            {conversations.length === 0 ? (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>No conversations yet</div>
            ) : (
              conversations.map(conv => (
                <div key={conv.id}
                  style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', cursor: 'pointer', background: openIds.has(conv.id) ? '#f8fafc' : 'white', borderBottom: '1px solid #f8fafc' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#f1f5f9')}
                  onMouseLeave={e => (e.currentTarget.style.background = openIds.has(conv.id) ? '#f8fafc' : 'white')}
                  onClick={() => { onOpen(conv.id); setExpanded(false) }}
                >
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <Avatar label={conv.avatarLabel} color={conv.avatarColor} size={40} />
                    {conv.unread > 0 && (
                      <span style={{ position: 'absolute', top: -2, right: -2, width: '16px', height: '16px', borderRadius: '50%', background: '#ef4444', color: 'white', fontSize: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white' }}>{conv.unread}</span>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span style={{ fontSize: '13px', fontWeight: conv.unread > 0 ? 700 : 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>
                        {conv.displayName}
                      </span>
                      <span style={{ fontSize: '11px', color: '#94a3b8', flexShrink: 0, marginLeft: '8px' }}>
                        {formatLastMessageTime(conv.lastMessageTime)}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: conv.unread > 0 ? '#0f172a' : '#94a3b8', fontWeight: conv.unread > 0 ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '1px' }}>
                      {conv.lastMessage || 'No messages yet'}
                    </div>
                  </div>
                  <button onClick={e => { e.stopPropagation(); onClose(conv.id) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e1', fontSize: '14px', padding: '2px 4px', flexShrink: 0, lineHeight: 1 }}>✕</button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <button
        onClick={() => setExpanded(e => !e)}
        style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 16px', background: '#1e293b', color: 'white', border: 'none', borderRadius: '8px 8px 0 0', cursor: 'pointer', fontFamily: "var(--font-dm-sans, 'DM Sans', sans-serif)", boxShadow: '0 -2px 8px rgba(0,0,0,0.15)', minWidth: '180px' }}
      >
        <div style={{ display: 'flex' }}>
          {conversations.slice(0, 3).map((conv, i) => (
            <div key={conv.id} style={{ marginLeft: i > 0 ? '-8px' : 0, zIndex: 3 - i }}>
              <Avatar label={conv.avatarLabel} color={conv.avatarColor} size={26} />
            </div>
          ))}
          {/* Show a placeholder icon when no conversations yet */}
          {conversations.length === 0 && (
            <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>💬</div>
          )}
        </div>
        <span style={{ fontSize: '13px', fontWeight: 700, flex: 1 }}>Messages</span>
        {totalUnread > 0 && (
          <span style={{ background: '#ef4444', color: 'white', borderRadius: '100px', padding: '1px 6px', fontSize: '11px', fontWeight: 700, minWidth: '18px', textAlign: 'center' }}>{totalUnread}</span>
        )}
        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginLeft: '4px' }}>{expanded ? '▼' : '▲'}</span>
      </button>
    </div>
  )
}

// ─── Enrich helpers ───────────────────────────────────────────────────────────

async function enrichOne(supabase: any, conv: Conversation, role: 'customer' | 'cleaner'): Promise<EnrichedConversation> {
  let displayName = 'Chat'
  let avatarLabel = '?'
  let subtitle = ''
  let zone = 'Horsham'

  if (role === 'customer') {
    // Customer side: header shows cleaner's "Alison C." + zone underneath.
    // Avatar shows cleaner's first initial (A).
    // Use the canonical /api/cleaners/[id]/card endpoint so RLS can't strip
    // the join (this was a known problem with the previous client-side join).
    try {
      const res = await fetch(`/api/cleaners/${conv.cleaner_id}/card`)
      if (res.ok) {
        const { cleaner } = await res.json()
        displayName = cleaner.name_short || 'Cleaner'
        avatarLabel = cleaner.initial || 'C'
        zone = cleaner.zones?.[0] ? (ZONE_LABELS[cleaner.zones[0]] ?? cleaner.zones[0]) : 'Horsham'
        subtitle = zone
      }
    } catch (e) { console.warn('Card fetch failed, falling back:', e) }

    // Belt-and-braces fallback if the API errored — keeps the widget usable
    if (avatarLabel === '?') {
      const { data: cleaner } = await (supabase as any)
        .from('cleaners').select('profile_id, profiles(full_name), zones').eq('id', conv.cleaner_id).single()
      if (cleaner?.profiles?.full_name) {
        displayName = formatFirstLastInitial(cleaner.profiles.full_name)
        avatarLabel = (cleaner.profiles.full_name.trim()[0] ?? 'C').toUpperCase()
      }
      zone = cleaner?.zones?.[0] ? (ZONE_LABELS[cleaner.zones[0]] ?? cleaner.zones[0]) : 'Horsham'
      subtitle = zone
    }
  } else {
    // Cleaner side: header shows zone, avatar shows the chat number (set later
    // in enrichConversations when we know the index across all chats).
    const { data: req } = await (supabase as any)
      .from('clean_requests').select('zone').eq('id', conv.clean_request_id).single()
    const zoneKey = req?.zone ?? 'central_south_east'
    zone = ZONE_LABELS[zoneKey] ?? zoneKey
    displayName = zone
    subtitle = zone
    avatarLabel = '?' // placeholder — replaced below in enrichConversations
  }

  const { data: reqData } = await (supabase as any)
    .from('clean_requests').select('status, frequency').eq('id', conv.clean_request_id).single()

  const { data: lastMsg } = await (supabase as any)
    .from('messages').select('content, created_at').eq('conversation_id', conv.id)
    .order('created_at', { ascending: false }).limit(1).single()

  return {
    ...conv,
    displayName,
    avatarLabel,
    subtitle,
    zone,
    lastMessage: lastMsg?.content ?? '',
    lastMessageTime: lastMsg?.created_at ?? null,
    unread: 0,
    avatarColor: getAvatarColor(conv.cleaner_id),
    requestStatus: reqData?.status ?? undefined,
    requestFrequency: reqData?.frequency ?? 'monthly',
  }
}

async function enrichConversations(supabase: any, convos: Conversation[], role: 'customer' | 'cleaner', existing?: EnrichedConversation[]): Promise<EnrichedConversation[]> {
  const enriched = await Promise.all(
    convos.map(conv => {
      const found = existing?.find(c => c.id === conv.id)
      return found ? Promise.resolve(found) : enrichOne(supabase, conv, role)
    })
  )
  if (role === 'cleaner') {
    // Cleaner-side numbering: each conversation gets a sequential number 1..N
    // shown in the avatar bubble. Numbering is global (not per zone) — the
    // cleaner sees "Chat 1, Chat 2, Chat 3" regardless of where each is.
    // Sort by the conversation's id (uuid) for stability across loads —
    // ideally we'd sort by created_at but that's not on the conversation row.
    const sorted = [...enriched].sort((a, b) => a.id.localeCompare(b.id))
    sorted.forEach((c, i) => {
      c.avatarLabel = String(i + 1)
      c.conversationIndex = i + 1
    })
  }
  return enriched
}

async function fetchUserConversations(supabase: any, userId: string, role: 'customer' | 'cleaner'): Promise<Conversation[]> {
  if (role === 'customer') {
    const { data } = await (supabase as any).from('conversations').select('*').eq('customer_id', userId)
    return data ?? []
  } else {
    const { data: cl } = await (supabase as any).from('cleaners').select('id').eq('profile_id', userId).single()
    if (cl) {
      const { data } = await (supabase as any).from('conversations').select('*').eq('cleaner_id', cl.id)
      return data ?? []
    }
  }
  return []
}

// ─── Main Widget ──────────────────────────────────────────────────────────────

export function ChatWidget() {
  const [conversations, setConversations] = useState<EnrichedConversation[]>([])
  const [openIds, setOpenIds] = useState<Set<string>>(new Set())
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentRole, setCurrentRole] = useState<'customer' | 'cleaner' | null>(null)
  const [initialized, setInitialized] = useState(false)
  const conversationsRef = useRef<EnrichedConversation[]>([])
  const openIdsRef = useRef<Set<string>>(new Set())
  const cleanerIdRef = useRef<string | null>(null)
  const currentUserIdRef = useRef<string | null>(null)
  const supabase = createClient()

  useEffect(() => { conversationsRef.current = conversations }, [conversations])
  useEffect(() => { openIdsRef.current = openIds }, [openIds])
  useEffect(() => { currentUserIdRef.current = currentUserId }, [currentUserId])

  const openConversation = useCallback((id: string) => {
    setOpenIds(prev => new Set(prev).add(id))
    setConversations(prev => prev.map(c => c.id === id ? { ...c, unread: 0 } : c))
  }, [])

  const closeWindow = useCallback((id: string) => {
    setOpenIds(prev => { const next = new Set(prev); next.delete(id); return next })
  }, [])

  const removeFromTray = useCallback((id: string) => {
    setOpenIds(prev => { const next = new Set(prev); next.delete(id); return next })
    setConversations(prev => prev.filter(c => c.id !== id))
  }, [])

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setInitialized(true); return }
      setCurrentUserId(user.id)
      currentUserIdRef.current = user.id

      const { data: profile } = await (supabase as any).from('profiles').select('role').eq('id', user.id).single()
      if (!profile || profile.role === 'admin') { setInitialized(true); return }

      const role = profile.role as 'customer' | 'cleaner'
      setCurrentRole(role)

      if (role === 'cleaner') {
        const { data: cl } = await (supabase as any).from('cleaners').select('id').eq('profile_id', user.id).single()
        cleanerIdRef.current = cl?.id ?? null
      }

      const convos = await fetchUserConversations(supabase, user.id, role)
      const enriched = await enrichConversations(supabase, convos, role)
      setConversations(enriched)
      setInitialized(true)
    }
    init()
  }, [])

  useEffect(() => {
    if (!initialized) return

    const channel = supabase
      .channel('global-messages-tray')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
        const msg = payload.new as Message
        const convId = msg.conversation_id
        if (!conversationsRef.current.find(c => c.id === convId)) return

        const isOpen = openIdsRef.current.has(convId)
        const isFromMe = msg.sender_id === currentUserIdRef.current
        const isSys = isSystemMessage(msg.content)

        setConversations(prev => prev.map(c => {
          if (c.id !== convId) return c
          return {
            ...c,
            lastMessage: isSys ? getSystemMessageText(msg.content) : msg.content,
            lastMessageTime: msg.created_at,
            unread: (!isFromMe && !isOpen && !isSys) ? c.unread + 1 : c.unread,
          }
        }))
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [initialized])

  useEffect(() => {
    if (currentRole !== 'cleaner' || !cleanerIdRef.current) return
    const cleanerId = cleanerIdRef.current

    const channel = supabase
      .channel('new-conversations-cleaner')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'conversations' }, async payload => {
        const conv = payload.new as Conversation
        if (conv.cleaner_id !== cleanerId) return
        const enriched = await enrichOne(supabase, conv, 'cleaner')
        setConversations(prev => prev.find(c => c.id === conv.id) ? prev : [...prev, enriched])
        playNotificationSound()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [currentRole])

  // Customer-side equivalent — fires when a customer accepts an application
  // and a conversation is newly created against their profile_id.
  useEffect(() => {
    if (currentRole !== 'customer' || !currentUserIdRef.current) return
    const customerProfileId = currentUserIdRef.current

    const channel = supabase
      .channel('new-conversations-customer')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'conversations' }, async payload => {
        const conv = payload.new as Conversation
        if (conv.customer_id !== customerProfileId) return
        const enriched = await enrichOne(supabase, conv, 'customer')
        setConversations(prev => prev.find(c => c.id === conv.id) ? prev : [...prev, enriched])
        playNotificationSound()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [currentRole])

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setConversations([])
        setOpenIds(new Set())
        setCurrentUserId(null)
        setCurrentRole(null)
        setInitialized(false)
        cleanerIdRef.current = null
        currentUserIdRef.current = null
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const handler = async (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (!detail?.conversationId) return
      const convId = detail.conversationId

      if (!conversationsRef.current.find(c => c.id === convId)) {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data: profile } = await (supabase as any).from('profiles').select('role').eq('id', user.id).single()
        if (!profile) return
        const role = profile.role as 'customer' | 'cleaner'
        setCurrentUserId(user.id)
        currentUserIdRef.current = user.id
        setCurrentRole(role)
        const { data: conv } = await (supabase as any).from('conversations').select('*').eq('id', convId).single()
        if (conv) {
          const enriched = await enrichOne(supabase, conv, role)
          setConversations(prev => prev.find(c => c.id === convId) ? prev : [...prev, enriched])
          setInitialized(true)
        }
      }

      setOpenIds(prev => new Set(prev).add(convId))
      setConversations(prev => prev.map(c => c.id === convId ? { ...c, unread: 0 } : c))
    }

    window.addEventListener('vouchee:open-chat', handler)
    return () => window.removeEventListener('vouchee:open-chat', handler)
  }, [])

  useEffect(() => {
    if (!initialized) return
    const params = new URLSearchParams(window.location.search)
    const chatId = params.get('chat')
    if (chatId) {
      const url = new URL(window.location.href)
      url.searchParams.delete('chat')
      window.history.replaceState({}, '', url.toString())
      window.dispatchEvent(new CustomEvent('vouchee:open-chat', { detail: { conversationId: chatId } }))
    }
  }, [initialized])

  // Don't render until we know who the user is
  if (!initialized || !currentUserId || !currentRole) return null

  // ↑ Removed the `if (conversations.length === 0) return null` that was here.
  // The tray now always renders once the user is identified, showing an empty
  // state ("No conversations yet") until a chat is opened or received.

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unread ?? 0), 0)
  const openExpanded = conversations.filter(c => openIds.has(c.id))

  return (
    <div style={{ position: 'fixed', bottom: 0, right: '16px', zIndex: 400, display: 'flex', alignItems: 'flex-end', gap: '12px', fontFamily: "var(--font-dm-sans, 'DM Sans', sans-serif)" }}>
      {openExpanded.map(conv => (
        <ChatWindow
          key={conv.id}
          conversation={conv}
          currentUserId={currentUserId}
          currentRole={currentRole}
          onClose={() => closeWindow(conv.id)}
        />
      ))}
      <MessagingTray
        conversations={conversations}
        openIds={openIds}
        onOpen={openConversation}
        onClose={removeFromTray}
        totalUnread={totalUnread}
      />
    </div>
  )
}
