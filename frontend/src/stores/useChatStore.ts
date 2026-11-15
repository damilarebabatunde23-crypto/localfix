import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { chatApi } from '@/lib/api'
import { MOCK_WORKERS } from '@/lib/utils'

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
}

interface ChatStoreState {
  isOpen: boolean
  isMinimized: boolean
  activeContact: ChatContact
  activeConversationId: string | null
  messages: ChatMessageItem[]
  isTyping: boolean
  conversations: any[]
  unreadTotal: number
  activeCall: ActiveCallState | null

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
  startCall: (type: 'audio' | 'video', contact?: ChatContact) => void
  endCall: () => void
  toggleCallMute: () => void
  toggleCallCamera: () => void
  toggleCallSpeaker: () => void
  toggleCallMinimize: () => void
  setCallDuration: (sec: number) => void
}

const DEFAULT_CONTACT: ChatContact = {
  id: MOCK_WORKERS[1].id,
  name: MOCK_WORKERS[1].displayName || 'Babatunde Oladipo',
  avatar: MOCK_WORKERS[1].avatar,
  role: 'Solar & Inverter Specialist',
  online: true,
  phone: '+234 802 345 6789',
}

const DEFAULT_MESSAGES: ChatMessageItem[] = [
  {
    id: 'msg-1',
    senderId: 'other',
    text: 'Hello! I noticed your request for solar and inverter inspection in Ikeja. I am available today.',
    time: '10:14 AM',
    read: true,
    reactions: { '👍': 1 },
  },
  {
    id: 'msg-2',
    senderId: 'me',
    text: 'Hi Babatunde! My 5kVA inverter started showing an overload error even on minimal load.',
    time: '10:16 AM',
    read: true,
  },
  {
    id: 'msg-3',
    senderId: 'other',
    text: 'Understood. That is usually a MOSFET bridge failure or battery bank calibration issue. I can bring diagnostic instruments.',
    time: '10:18 AM',
    read: true,
  },
  {
    id: 'msg-4',
    senderId: 'me',
    text: 'Can you arrive around 2:30 PM? Escrow vault is funded.',
    time: '10:20 AM',
    read: true,
    userReaction: '❤️',
    reactions: { '❤️': 1 },
  },
  {
    id: 'msg-5',
    senderId: 'other',
    text: 'Confirmed! 2:30 PM works. I will ping you 15 minutes before arrival. 👍',
    time: '10:22 AM',
    read: true,
    reactions: { '👍': 1 },
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
      isOpen: true, // Permanent by default!
      isMinimized: false,
      activeContact: DEFAULT_CONTACT,
      activeConversationId: null,
      messages: DEFAULT_MESSAGES,
      isTyping: false,
      conversations: [],
      unreadTotal: 0,
      activeCall: null,

      playMessageSound: () => {
        playChatSound('pop')
      },

      openChat: async (contact, conversationId) => {
        const current = get().activeContact || DEFAULT_CONTACT
        const targetContact: ChatContact = {
          id: contact?.id || current.id,
          name: contact?.name || current.name,
          avatar: contact?.avatar || current.avatar,
          role: contact?.role || current.role,
          online: contact?.online ?? true,
          conversationId: conversationId || contact?.conversationId || current.conversationId,
          phone: contact?.phone || current.phone,
        }

        set({
          isOpen: true,
          isMinimized: false,
          activeContact: targetContact,
          activeConversationId: conversationId || targetContact.conversationId || null,
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
            if (parsed.length > 0) {
              set({ messages: parsed })
            }
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

        let convId = get().activeConversationId
        const activeContact = get().activeContact

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

        // Post message to backend DB so it permanently saves in PostgreSQL/SQLite!
        if (convId) {
          try {
            const savedMsg = await chatApi.sendMessage(convId, trimmed, mediaUrl, mediaType)
            if (savedMsg && savedMsg.id) {
              // Update with official database ID
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

        // If chatting with a mock contact or demo user, provide intelligent response
        const isLiveBackendConv = !!convId
        if (!isLiveBackendConv) {
          set({ isTyping: true })
          setTimeout(() => {
            set({ isTyping: false })
            const replies = [
              `Thanks for reaching out! I am active and ready for your repair request. 👍`,
              `Message received! My diagnostic gear is prepped. Send me your address and preferred timing. 🛠️`,
              `Got it! Escrow protection ensures your payment is safe. Looking forward to assisting you!`,
            ]
            const randomReply = replies[Math.floor(Math.random() * replies.length)]

            const replyMsg: ChatMessageItem = {
              id: `msg-${Date.now() + 1}`,
              senderId: 'other',
              text: randomReply,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              read: true,
              reactions: { '👍': 1 },
            }

            set((state) => ({
              messages: [...state.messages, replyMsg],
            }))
            playChatSound('pop')
          }, 1200)
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

        set({ isTyping: true })
        setTimeout(() => {
          set({ isTyping: false })
          const thumbsReply: ChatMessageItem = {
            id: `msg-${Date.now() + 1}`,
            senderId: 'other',
            text: '👍',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            read: true,
            mediaType: 'thumbs_up',
          }
          set((state) => ({
            messages: [...state.messages, thumbsReply],
          }))
          playChatSound('pop')
        }, 1200)
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
      startCall: (type, contact) => {
        const target = contact || get().activeContact || DEFAULT_CONTACT
        playChatSound('connect')
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
          },
        })
      },

      endCall: () => {
        playChatSound('end')
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
        }, 1200)
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
      name: 'localfix-chat-v2',
      partialize: (state) => ({
        isOpen: state.isOpen,
        isMinimized: state.isMinimized,
        activeContact: state.activeContact,
        activeConversationId: state.activeConversationId,
        messages: state.messages,
      }),
    }
  )
)
