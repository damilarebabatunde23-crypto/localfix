import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { chatApi } from '@/lib/api'

// Purge any stale legacy chat storage immediately
try {
  localStorage.removeItem('localfix-chat-v2')
  localStorage.removeItem('localfix-chat')
} catch {}

export interface ChatContact {
  id: string
  name: string
  avatar?: string
  role?: string
  online?: boolean
  conversationId?: string
  phone?: string
}

export interface ChatMessageItem {
  id: string
  senderId: 'me' | 'other'
  text: string
  time: string
  read: boolean
  mediaUrl?: string
  mediaType?: 'text' | 'image' | 'video' | 'document' | 'thumbs_up'
  reactions?: Record<string, number>
  userReaction?: string
}

export interface ActiveCallState {
  type: 'audio' | 'video'
  contact: ChatContact
  status: 'ringing' | 'connected' | 'ended'
  duration: number
  isMuted: boolean
  isCameraOff: boolean
  isSpeakerOn: boolean
  isMinimized: boolean
  callId?: string
  isIncoming?: boolean
  offer?: any
  answer?: any
}

interface ChatStoreState {
  isOpen: boolean
  isMinimized: boolean
  activeContact: ChatContact | null
  activeConversationId: string | null
  messages: ChatMessageItem[]
  isTyping: boolean
  conversations: any[]
  unreadTotal: number
  activeCall: ActiveCallState | null
  incomingCall: ActiveCallState | null

  // Actions
  openChat: (contact?: Partial<ChatContact>, conversationId?: string) => void
  closeChat: () => void
  toggleMinimize: () => void
  setIsMinimized: (val: boolean) => void
  sendMessage: (text: string, mediaUrl?: string, mediaType?: 'text' | 'image' | 'video' | 'document' | 'thumbs_up') => Promise<void>
  sendThumbsUp: () => Promise<void>
  addReaction: (messageId: string, emoji: string) => void
  loadConversations: () => Promise<void>
  loadMessagesForConversation: (convId: string) => Promise<void>
  playMessageSound: () => void
  
  // Calls
  startCall: (type: 'audio' | 'video', contact?: ChatContact, callId?: string) => void
  endCall: (callId?: string) => Promise<void>
  toggleCallMute: () => void
  toggleCallCamera: () => void
  toggleCallSpeaker: () => void
  toggleCallMinimize: () => void
  setCallDuration: (sec: number) => void
  checkIncomingCall: () => Promise<void>
  acceptIncomingCall: () => void
  declineIncomingCall: () => Promise<void>
}

export const LOCALFIX_CONCIERGE_CONTACT: ChatContact = {
  id: 'localfix-concierge',
  name: 'LocalFix Concierge',
  avatar: '/logo.jpg',
  role: 'Official Platform Concierge',
  online: true,
  phone: '+234 800 LOCALFIX',
  conversationId: 'conv-localfix-concierge',
}

export const LOCALFIX_WELCOME_MESSAGES: ChatMessageItem[] = [
  {
    id: 'lf-welcome-1',
    senderId: 'other',
    text: 'Hello! Welcome to LocalFix 👋 I am your automated LocalFix Concierge. How can I help you today? Ask me about finding verified artisans, on-demand repairs, booking guarantees, or how our Escrow protection keeps your money 100% safe!',
    time: 'Just now',
    read: true,
  },
]

// Play sound using Web Audio API
export const playChatSound = (type: 'pop' | 'ring' | 'end' | 'connect') => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContextClass) return
    const ctx = new AudioContextClass()

    if (type === 'pop') {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(587.33, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08)
      gain.gain.setValueAtTime(0.12, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.12)
    } else if (type === 'ring') {
      // Realistic dual-tone dial ring (440Hz + 480Hz)
      const osc1 = ctx.createOscillator()
      const osc2 = ctx.createOscillator()
      const gain = ctx.createGain()
      osc1.type = 'sine'
      osc2.type = 'sine'
      osc1.frequency.setValueAtTime(440, ctx.currentTime)
      osc2.frequency.setValueAtTime(480, ctx.currentTime)
      gain.gain.setValueAtTime(0.08, ctx.currentTime)
      gain.gain.setValueAtTime(0.08, ctx.currentTime + 1.1)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.25)
      osc1.connect(gain)
      osc2.connect(gain)
      gain.connect(ctx.destination)
      osc1.start()
      osc2.start()
      osc1.stop(ctx.currentTime + 1.25)
      osc2.stop(ctx.currentTime + 1.25)
    } else if (type === 'connect') {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(440, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(659.25, ctx.currentTime + 0.18)
      gain.gain.setValueAtTime(0.15, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.25)
    } else if (type === 'end') {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(400, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.2)
      gain.gain.setValueAtTime(0.15, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.25)
    }
  } catch {
    // Autoplay restrictions
  }
}

export const useChatStore = create<ChatStoreState>()(
  persist(
    (set, get) => ({
      isOpen: true,
      isMinimized: true,
      activeContact: LOCALFIX_CONCIERGE_CONTACT,
      activeConversationId: 'conv-localfix-concierge',
      messages: LOCALFIX_WELCOME_MESSAGES,
      isTyping: false,
      conversations: [],
      unreadTotal: 0,
      activeCall: null,
      incomingCall: null,

      playMessageSound: () => {
        playChatSound('pop')
      },

      openChat: async (contact, conversationId) => {
        const current = get().activeContact || LOCALFIX_CONCIERGE_CONTACT
        const targetId = contact?.id || current.id
        const isTargetConcierge = targetId === 'localfix-concierge' || targetId === 'localfix-support'

        const targetContact: ChatContact = {
          id: targetId,
          name: contact?.name || (isTargetConcierge ? 'LocalFix Concierge' : current.name),
          avatar: contact?.avatar || (isTargetConcierge ? '/logo.jpg' : current.avatar),
          role: contact?.role || (isTargetConcierge ? 'Official Platform Concierge' : current.role),
          online: contact?.online ?? true,
          conversationId: conversationId || contact?.conversationId || (isTargetConcierge ? 'conv-localfix-concierge' : undefined),
          phone: contact?.phone || current.phone,
        }

        // Real human-to-human chats MUST start with an empty or clean array, never the concierge welcome greeting
        const initialMsgs = isTargetConcierge ? LOCALFIX_WELCOME_MESSAGES : []

        set({
          isOpen: true,
          isMinimized: false,
          activeContact: targetContact,
          activeConversationId: conversationId || targetContact.conversationId || null,
          messages: initialMsgs,
          unreadTotal: 0,
        })

        let resolvedConvId = conversationId || targetContact.conversationId || null

        // If authenticated and no conversation ID yet, create or retrieve the real conversation from Django backend
        if (!resolvedConvId && targetContact.id) {
          try {
            const { useAppStore } = await import('@/stores/useAppStore')
            if (useAppStore.getState().isAuthenticated) {
              const res = await chatApi.startConversation({
                worker_id: targetContact.id,
                recipient_id: targetContact.id,
              })
              if (res && res.id) {
                resolvedConvId = res.id
                set({ activeConversationId: res.id })
                targetContact.conversationId = res.id
              }
            }
          } catch {
            // Local fallback persists
          }
        }

        if (resolvedConvId) {
          get().loadMessagesForConversation(resolvedConvId)
        }
      },

      // When closed, permanently remain visible as the minimized floating chat bubble!
      closeChat: () => {
        set({ isMinimized: true, isOpen: true })
      },

      toggleMinimize: () => {
        set((state) => ({ isMinimized: !state.isMinimized, isOpen: true }))
      },

      setIsMinimized: (val) => {
        set({ isMinimized: val, isOpen: true })
      },

      loadConversations: async () => {
        try {
          const list = await chatApi.getConversations()
          if (Array.isArray(list) && list.length > 0) {
            set({ conversations: list })
          }
        } catch {
          // Backend offline or unauthenticated
        }
      },

      loadMessagesForConversation: async (convId: string) => {
        try {
          const { useAppStore } = await import('@/stores/useAppStore')
          const currentUser = useAppStore.getState().user
          const myId = currentUser?.id

          const liveMsgs = await chatApi.getMessages(convId)
          if (Array.isArray(liveMsgs)) {
            const parsed: ChatMessageItem[] = liveMsgs.map((m: any) => {
              const isSenderMe =
                (myId && (m.sender === myId || String(m.sender) === String(myId))) ||
                (currentUser?.email && m.sender_name && currentUser.email.toLowerCase().includes(m.sender_name.toLowerCase())) ||
                m.sender_name?.toLowerCase().includes('me')

              return {
                id: m.id,
                senderId: isSenderMe ? 'me' : 'other',
                text: m.content,
                time: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                read: m.is_read,
                mediaUrl: m.media_url,
                mediaType: m.message_type === 'image' ? 'image' : m.media_url ? 'image' : 'text',
              }
            })

            const prev = get().messages
            if (prev.length > 0 && parsed.length > prev.length) {
              const last = parsed[parsed.length - 1]
              if (last && last.senderId === 'other') {
                playChatSound('pop')
              }
            }
            const activeContact = get().activeContact
            const isConcierge = activeContact?.id === 'localfix-concierge' || activeContact?.id === 'localfix-support'
            const sanitized = isConcierge
              ? parsed
              : parsed.filter(
                  (m) => m.id !== 'lf-welcome-1' && !m.text.includes('automated LocalFix Concierge')
                )
            set({ messages: sanitized })
          }
        } catch {
          // Keep persistent messages
        }
      },

      sendMessage: async (text: string, mediaUrl?: string, mediaType = 'text') => {
        const trimmed = text.trim()
        if (!trimmed && !mediaUrl) return

        const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        const tempId = `msg-${Date.now()}`
        const newMsg: ChatMessageItem = {
          id: tempId,
          senderId: 'me',
          text: trimmed,
          time: now,
          read: false,
          mediaUrl,
          mediaType,
        }

        // Add to permanent chat log immediately
        set((state) => ({
          messages: [...state.messages, newMsg],
          isOpen: true,
        }))
        playChatSound('pop')

        const activeContact = get().activeContact

        // Specialized LocalFix Concierge Assistant handler
        if (activeContact?.id === 'localfix-concierge' || activeContact?.id === 'localfix-support') {
          set({ isTyping: true })
          try {
            const { assistantApi } = await import('@/lib/api')
            const { useAppStore } = await import('@/stores/useAppStore')
            const currency = useAppStore.getState().currency
            const location = useAppStore.getState().locationName

            const reply = await assistantApi.sendChat(trimmed, 'concierge-session', currency, location)
            const replyText = reply?.message || reply?.text || "Welcome to LocalFix! We connect you with verified local artisans, protect payments with Escrow, and guarantee service delivery. How can I assist you with your repair today?"
            
            const aiMsg: ChatMessageItem = {
              id: `msg-lf-${Date.now()}`,
              senderId: 'other',
              text: replyText,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              read: true,
            }
            set((state) => ({
              messages: [...state.messages, aiMsg],
              isTyping: false,
            }))
            playChatSound('pop')
          } catch {
            setTimeout(() => {
              const aiMsg: ChatMessageItem = {
                id: `msg-lf-${Date.now()}`,
                senderId: 'other',
                text: "Thanks for messaging LocalFix Concierge! 🛠️ All our artisans are verified, and your payments remain safe in Escrow until you sign off on the completed work. What service or repair are you looking for today?",
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                read: true,
              }
              set((state) => ({
                messages: [...state.messages, aiMsg],
                isTyping: false,
              }))
              playChatSound('pop')
            }, 600)
          }
          return
        }

        let convId = get().activeConversationId

        // If no convId yet, create real conversation in backend
        if (!convId && activeContact?.id) {
          try {
            const { useAppStore } = await import('@/stores/useAppStore')
            if (useAppStore.getState().isAuthenticated) {
              const convRes = await chatApi.startConversation({
                worker_id: activeContact.id,
                recipient_id: activeContact.id,
              })
              if (convRes?.id) {
                convId = convRes.id
                set({ activeConversationId: convRes.id })
                activeContact.conversationId = convRes.id
              }
            }
          } catch {
            // Local fallback
          }
        }

        // Post message to backend DB so it permanently saves in PostgreSQL/SQLite for the real recipient!
        if (convId) {
          try {
            const savedMsg = await chatApi.sendMessage(convId, trimmed, mediaUrl, mediaType)
            if (savedMsg && savedMsg.id) {
              set((state) => ({
                messages: state.messages.map((m) =>
                  m.id === tempId ? { ...m, id: savedMsg.id, read: savedMsg.is_read } : m
                ),
              }))
            }
          } catch {
            // Local message remains safely persisted in Zustand storage
          }
        }
      },

      sendThumbsUp: async () => {
        const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        const thumbsMsg: ChatMessageItem = {
          id: `msg-${Date.now()}`,
          senderId: 'me',
          text: '👍',
          time: now,
          read: false,
          mediaType: 'thumbs_up',
        }

        set((state) => ({
          messages: [...state.messages, thumbsMsg],
          isOpen: true,
        }))
        playChatSound('pop')

        const convId = get().activeConversationId
        if (convId) {
          try {
            await chatApi.sendMessage(convId, '👍', undefined, 'text')
          } catch {
            // Local fallback persists
          }
        }
      },

      addReaction: (messageId: string, emoji: string) => {
        set((state) => ({
          messages: state.messages.map((m) => {
            if (m.id !== messageId) return m
            const currentReactions = { ...(m.reactions || {}) }
            const prevReaction = m.userReaction

            if (prevReaction === emoji) {
              currentReactions[emoji] = Math.max(0, (currentReactions[emoji] || 1) - 1)
              if (currentReactions[emoji] === 0) delete currentReactions[emoji]
              return { ...m, userReaction: undefined, reactions: currentReactions }
            } else {
              if (prevReaction && currentReactions[prevReaction]) {
                currentReactions[prevReaction] = Math.max(0, currentReactions[prevReaction] - 1)
                if (currentReactions[prevReaction] === 0) delete currentReactions[prevReaction]
              }
              currentReactions[emoji] = (currentReactions[emoji] || 0) + 1
              return { ...m, userReaction: emoji, reactions: currentReactions }
            }
          }),
        }))
      },

      // Call actions
      startCall: (type, contact, callId) => {
        const target = contact || get().activeContact
        if (!target) return
        playChatSound('ring')
        set({
          activeCall: {
            type,
            contact: target,
            status: 'ringing',
            duration: 0,
            isMuted: false,
            isCameraOff: false,
            isSpeakerOn: true,
            isMinimized: false,
            callId,
            isIncoming: false,
          },
        })
      },

      endCall: async (callId) => {
        playChatSound('end')
        const currentCallId = callId || get().activeCall?.callId
        if (currentCallId) {
          try {
            await chatApi.endCallSession(currentCallId, 'ended')
          } catch {}
        }
        set((state) => {
          if (!state.activeCall) return { activeCall: null }
          return {
            activeCall: {
              ...state.activeCall,
              status: 'ended',
            },
          }
        })
        setTimeout(() => {
          set({ activeCall: null })
        }, 800)
      },

      checkIncomingCall: async () => {
        try {
          const { useAppStore } = await import('@/stores/useAppStore')
          if (!useAppStore.getState().isAuthenticated) return
          if (get().activeCall) return // already in a call

          const res = await chatApi.getActiveIncomingCall()
          if (res?.active_call && res.active_call.id) {
            const call = res.active_call
            if (get().incomingCall?.callId !== call.id) {
              set({
                incomingCall: {
                  type: call.call_type,
                  contact: {
                    id: call.caller,
                    name: call.caller_name || 'LocalFix Client',
                    avatar: call.caller_avatar,
                    phone: call.caller_phone,
                  },
                  status: 'ringing',
                  duration: 0,
                  isMuted: false,
                  isCameraOff: false,
                  isSpeakerOn: true,
                  isMinimized: false,
                  callId: call.id,
                  isIncoming: true,
                  offer: call.offer,
                },
              })
              playChatSound('ring')
            }
          } else {
            if (get().incomingCall) {
              set({ incomingCall: null })
            }
          }
        } catch {
          // offline
        }
      },

      acceptIncomingCall: () => {
        const inc = get().incomingCall
        if (!inc) return
        set({
          activeCall: {
            ...inc,
            status: 'connected',
          },
          incomingCall: null,
        })
        playChatSound('connect')
      },

      declineIncomingCall: async () => {
        const inc = get().incomingCall
        if (!inc) return
        set({ incomingCall: null })
        playChatSound('end')
        if (inc.callId) {
          try {
            await chatApi.endCallSession(inc.callId, 'rejected')
          } catch {}
        }
      },

      toggleCallMute: () => {
        set((state) => {
          if (!state.activeCall) return state
          return {
            activeCall: {
              ...state.activeCall,
              isMuted: !state.activeCall.isMuted,
            },
          }
        })
      },

      toggleCallCamera: () => {
        set((state) => {
          if (!state.activeCall) return state
          return {
            activeCall: {
              ...state.activeCall,
              isCameraOff: !state.activeCall.isCameraOff,
            },
          }
        })
      },

      toggleCallSpeaker: () => {
        set((state) => {
          if (!state.activeCall) return state
          return {
            activeCall: {
              ...state.activeCall,
              isSpeakerOn: !state.activeCall.isSpeakerOn,
            },
          }
        })
      },

      toggleCallMinimize: () => {
        set((state) => {
          if (!state.activeCall) return state
          return {
            activeCall: {
              ...state.activeCall,
              isMinimized: !state.activeCall.isMinimized,
            },
          }
        })
      },

      setCallDuration: (sec: number) => {
        set((state) => {
          if (!state.activeCall) return state
          return {
            activeCall: {
              ...state.activeCall,
              duration: sec,
            },
          }
        })
      },
    }),
    {
      name: 'localfix-chat-v4',
      partialize: (state) => ({
        isOpen: state.isOpen,
        isMinimized: state.isMinimized,
        activeContact: state.activeContact,
        activeConversationId: state.activeConversationId,
        messages: state.messages,
      }),
      onRehydrateStorage: () => (state) => {
        try {
          localStorage.removeItem('localfix-chat-v2')
          localStorage.removeItem('localfix-chat-v3')
          localStorage.removeItem('localfix-chat')
        } catch {}

        if (state) {
          const contact = state.activeContact
          if (
            !contact ||
            contact.name?.toLowerCase().includes('marcus') ||
            contact.name?.toLowerCase().includes('sterling') ||
            contact.name?.toLowerCase().includes('tunde') ||
            contact.id === '1' ||
            contact.id === '2'
          ) {
            state.activeContact = LOCALFIX_CONCIERGE_CONTACT
            state.activeConversationId = 'conv-localfix-concierge'
            state.messages = LOCALFIX_WELCOME_MESSAGES
            state.isOpen = true
            state.isMinimized = true
          } else if (contact.id !== 'localfix-concierge' && contact.id !== 'localfix-support') {
            state.messages = (state.messages || []).filter(
              (m) => m.id !== 'lf-welcome-1' && !m.text.includes('automated LocalFix Concierge')
            )
          }
        }
      },
    }
  )
)
