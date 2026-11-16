import { useState, useRef, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Send,
  Phone,
  Video,
  ArrowLeft,
  Image,
  Paperclip,
  Check,
  CheckCheck,
  Search,
  ThumbsUp,
  Smile,
  Info,
  ShieldCheck,
  Lock,
  ExternalLink,
  ChevronRight,
  FileText,
  MessageCircle,
  MessageSquare,
} from 'lucide-react'
import { MOCK_WORKERS, normalizeWorker } from '@/lib/utils'
import { chatApi, uploadApi, servicesApi } from '@/lib/api'
import { useAppStore } from '@/stores/useAppStore'
import { useChatStore } from '@/stores/useChatStore'
import toast from 'react-hot-toast'

const QUICK_EMOJIS = ['😀', '😂', '❤️', '😍', '🔥', '👏', '🙏', '💯', '⚡', '🛠️', '₦', '👍']
const REACTION_CHOICES = ['👍', '❤️', '😂', '😮', '😢', '😡', '🔥']

export default function ChatPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user, isAuthenticated } = useAppStore()
  const messages = useChatStore((s) => s.messages)
  const isTyping = useChatStore((s) => s.isTyping)
  const sendMessage = useChatStore((s) => s.sendMessage)
  const sendThumbsUp = useChatStore((s) => s.sendThumbsUp)
  const addReaction = useChatStore((s) => s.addReaction)

  const [threads, setThreads] = useState<any[]>([])
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null)
  const [activeNow, setActiveNow] = useState<any[]>([])
  const [input, setInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showRightPanel, setShowRightPanel] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null)
  const [mobileView, setMobileView] = useState<'threads' | 'chat'>(() => {
    return (searchParams.get('worker') || searchParams.get('conversation'))
      ? 'chat'
      : (typeof window !== 'undefined' && window.innerWidth < 768 ? 'threads' : 'chat')
  })

  const bottomRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const activeThread = threads.find((t) => t.id === selectedThreadId) || (threads.length > 0 ? threads[0] : null)
  const currentCounterpart = activeThread?.user || null

  // Fetch real active artisans for stories carousel
  useEffect(() => {
    servicesApi.getWorkers().then((res: any) => {
      const list = res.results || res || []
      if (Array.isArray(list)) {
        const online = list.filter((w: any) => w.is_online).map((w: any) => ({
          id: String(w.id),
          name: `${w.user?.first_name || ''} ${w.user?.last_name || ''}`.trim() || w.profession,
          avatar: w.user?.avatar_url || w.user?.avatar,
          role: w.profession,
        }))
        setActiveNow(online)
      }
    }).catch(() => {})
  }, [])

  // Check query params to preselect worker or thread
  useEffect(() => {
    const workerParam = searchParams.get('worker')
    const convParam = searchParams.get('conversation')

    if (workerParam) {
      servicesApi.getWorkerDetail(workerParam).then((res: any) => {
        if (res) {
          const nw = normalizeWorker(res)
          const customThread = {
            id: `worker-${nw.id}`,
            user: {
              id: nw.id,
              name: nw.displayName,
              avatar: nw.avatar,
              role: nw.profession,
              online: true,
              phone: nw.phone,
            },
            lastMessage: 'Ready to discuss requirements.',
            time: 'Just now',
            unread: 0,
          }
          setThreads((prev) => [customThread, ...prev.filter((t) => t.id !== customThread.id)])
          setSelectedThreadId(customThread.id)
          setMobileView('chat')
          useChatStore.getState().openChat(customThread.user, undefined)
        }
      }).catch(() => {})
    } else if (convParam) {
      setSelectedThreadId(convParam)
      setMobileView('chat')
    }
  }, [searchParams])

  // Fetch real conversation threads from backend
  useEffect(() => {
    if (!isAuthenticated) return
    const fetchBackendThreads = async () => {
      try {
        const convs = await chatApi.getConversations()
        if (Array.isArray(convs) && convs.length > 0) {
          const convParam = searchParams.get('conversation')
          const mapped = convs.map((c: any) => ({
            id: c.id,
            user: {
              id: c.other_participant?.id,
              name: `${c.other_participant?.first_name || ''} ${c.other_participant?.last_name || ''}`.trim() || 'LocalFix User',
              avatar: c.other_participant?.avatar,
              role: c.other_participant?.role || 'Member',
              online: true,
              phone: c.other_participant?.phone,
            },
            lastMessage: c.last_message?.content || 'Conversation started',
            time: c.last_message?.created_at
              ? new Date(c.last_message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : 'Recently',
            unread: c.unread_count || 0,
          }))
          setThreads(mapped)

          if (convParam) {
            const match = mapped.find((m: any) => m.id === convParam)
            if (match) {
              setSelectedThreadId(match.id)
              setMobileView('chat')
              useChatStore.getState().openChat(match.user, match.id)
            } else {
              setSelectedThreadId(convParam)
              setMobileView('chat')
            }
          } else if (!selectedThreadId || selectedThreadId === 'thread-1') {
            setSelectedThreadId(mapped[0].id)
          }
        }
      } catch {
        // Use demo threads
      }
    }
    fetchBackendThreads()
  }, [isAuthenticated, searchParams])

  // Scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  // Keep selected thread synced with Zustand store
  useEffect(() => {
    const thread = threads.find((t) => t.id === selectedThreadId) || threads[0]
    if (thread && thread.user) {
      useChatStore.getState().openChat(thread.user, thread.id.startsWith('thread-') ? undefined : thread.id)
    }
  }, [selectedThreadId, threads])

  // Real-time synchronization: poll messages every 2.5s for real human conversation
  useEffect(() => {
    if (!isAuthenticated) return

    const interval = setInterval(async () => {
      const activeConvId = useChatStore.getState().activeConversationId
      if (activeConvId && !activeConvId.startsWith('thread-')) {
        await useChatStore.getState().loadMessagesForConversation(activeConvId)
      }
    }, 2500)

    return () => clearInterval(interval)
  }, [isAuthenticated])

  const handleSendMessage = async (textToSend?: string, mediaUrl?: string, mediaType = 'text') => {
    const content = textToSend ?? input
    if (!content.trim() && !mediaUrl) return

    setInput('')
    setShowEmojiPicker(false)
    await sendMessage(content, mediaUrl, mediaType as any)
  }

  const handleSendThumbsUp = async () => {
    await sendThumbsUp()
  }

  const handleAddReaction = (msgId: string, emoji: string) => {
    addReaction(msgId, emoji)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const previewUrl = URL.createObjectURL(file)
    const isImage = file.type.startsWith('image/')
    toast.loading(`Uploading "${file.name}"...`, { id: 'chat-upload-page' })

    try {
      const res = await uploadApi.uploadFile(file)
      const uploadedUrl = res.full_url || res.url || previewUrl
      toast.success('File uploaded and sent!', { id: 'chat-upload-page' })
      handleSendMessage(file.name, uploadedUrl, isImage ? 'image' : 'document')
    } catch {
      toast.dismiss('chat-upload-page')
      handleSendMessage(file.name, previewUrl, isImage ? 'image' : 'document')
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const filteredThreads = threads.filter(
    (t) =>
      t.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="flex bg-[#0f0b1a] text-white overflow-hidden h-[calc(100dvh-64px)] w-full">
      {/* ======================================================== */}
      {/* 1. LEFT SIDEBAR: Facebook Messenger Conversations List   */}
      {/* ======================================================== */}
      <div
        className={`${
          mobileView === 'threads' ? 'flex' : 'hidden md:flex'
        } w-full md:w-80 lg:w-96 flex-col border-r border-primary-500/15 flex-shrink-0 bg-[#151025]`}
      >
        {/* Top Header */}
        <div className="p-3.5 sm:p-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/')}
              className="md:hidden p-1.5 -ml-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
              title="Return to Home"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg sm:text-xl font-black text-white tracking-tight">Chats</h1>
            <span className="lf-badge-purple text-[10px] font-semibold">Messenger</span>
          </div>
          <button
            onClick={() => toast('Direct encrypted messaging enabled across all verified artisans.')}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
            title="Chat info"
          >
            <ShieldCheck className="w-4 h-4 text-primary-400" />
          </button>
        </div>

        {/* Search Messenger */}
        <div className="px-4 py-2">
          <div className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-white/5 border border-primary-500/15 focus-within:border-primary-400 transition-colors">
            <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Messenger"
              className="w-full bg-transparent text-xs text-white placeholder-gray-500 outline-none"
            />
          </div>
        </div>

        {/* Active Now Online Carousel (Real Online Artisans Only) */}
        {activeNow.length > 0 && (
          <div className="px-4 py-2 border-b border-white/5">
            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
              Active Now · Available Artisans
            </div>
            <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-1">
              {activeNow.map((c) => (
                <div
                  key={c.id}
                  onClick={() => {
                    const targetThread = {
                      id: `active-${c.id}`,
                      user: {
                        id: c.id,
                        name: c.name,
                        avatar: c.avatar,
                        role: c.role,
                        online: true,
                      },
                      lastMessage: 'Ready to connect!',
                      time: 'Active now',
                      unread: 0,
                    }
                    setThreads((prev) => [targetThread, ...prev.filter((t) => t.id !== targetThread.id)])
                    setSelectedThreadId(targetThread.id)
                    setMobileView('chat')
                    useChatStore.getState().openChat(targetThread.user, undefined)
                  }}
                  className="flex flex-col items-center gap-1 cursor-pointer group flex-shrink-0"
                >
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full p-0.5 bg-gradient-to-tr from-primary-600 via-primary-500 to-purple-400 group-hover:scale-105 transition-transform">
                      <img src={c.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${c.name}&backgroundColor=6D28D9`} alt={c.name} className="w-full h-full rounded-full object-cover border-2 border-[#151025]" />
                    </div>
                    <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#151025]" />
                  </div>
                  <span className="text-[11px] text-gray-300 group-hover:text-white font-medium truncate max-w-[60px] text-center">
                    {c.name.split(' ')[0]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Thread List */}
        <div className="flex-1 overflow-y-auto no-scrollbar divide-y divide-white/5">
          {filteredThreads.length === 0 ? (
            <div className="p-8 text-center text-gray-400 flex flex-col items-center justify-center">
              <MessageSquare className="w-8 h-8 text-primary-400/60 mb-2" />
              <p className="text-xs font-semibold text-white">No active conversations</p>
              <p className="text-[11px] text-gray-400 mt-1 max-w-[200px]">When you connect with verified artisans or clients, your messages will appear here.</p>
            </div>
          ) : (
            filteredThreads.map((thread) => {
              const isSelected = thread.id === selectedThreadId
              return (
                <div
                  key={thread.id}
                  onClick={() => {
                    setSelectedThreadId(thread.id)
                    setMobileView('chat')
                    useChatStore.getState().openChat(thread.user, thread.id.startsWith('thread-') ? undefined : thread.id)
                  }}
                  className={`p-3.5 flex items-center gap-3 cursor-pointer transition-colors ${
                    isSelected ? 'bg-primary-600/20 border-l-4 border-primary-500' : 'hover:bg-white/5'
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    <img
                      src={thread.user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${thread.user.name}&backgroundColor=6D28D9`}
                      alt={thread.user.name}
                      className="w-12 h-12 rounded-full object-cover border border-white/10"
                    />
                    {thread.user.online && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#151025]" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-bold text-white truncate max-w-[140px]">{thread.user.name}</span>
                      <span className="text-[10px] text-gray-500">{thread.time}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-400 truncate max-w-[180px]">{thread.lastMessage}</p>
                      {thread.unread > 0 && (
                        <span className="w-5 h-5 rounded-full bg-primary-600 text-white text-[10px] font-bold flex items-center justify-center">
                          {thread.unread}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. CENTER PANE: Active Facebook Messenger Conversation   */}
      {/* ======================================================== */}
      <div
        className={`${
          mobileView === 'chat' ? 'flex' : 'hidden md:flex'
        } flex-1 flex-col h-full bg-[#110d1f] relative overflow-hidden`}
      >
        {!activeThread || !currentCounterpart ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-400 bg-[#0E0A1A]">
            <div className="w-16 h-16 rounded-2xl bg-primary-500/10 flex items-center justify-center mb-4 border border-primary-500/20">
              <MessageSquare className="w-8 h-8 text-primary-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Your Inbox is Ready</h3>
            <p className="text-xs text-gray-400 max-w-sm mb-6">Explore verified artisans in your area and click "Message" or "Direct Call" to connect in real-time.</p>
            <button
              onClick={() => navigate('/workers')}
              className="px-5 py-2.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-bold transition-all shadow-lg cursor-pointer"
            >
              Browse Verified Artisans
            </button>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div
              className="px-4 py-3 flex items-center justify-between flex-shrink-0"
              style={{
                background: '#160F29',
                borderBottom: '1px solid rgba(167, 139, 250, 0.15)',
              }}
            >
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile Back to Threads */}
            <button
              onClick={() => setMobileView('threads')}
              className="md:hidden p-1.5 rounded-lg text-gray-400 hover:text-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="relative flex-shrink-0">
              <img
                src={
                  currentCounterpart.avatar ||
                  `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentCounterpart.name}&backgroundColor=6D28D9`
                }
                alt={currentCounterpart.name}
                className="w-10 h-10 rounded-full object-cover border border-primary-400/40"
              />
              <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#110d1f]" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-white truncate">{currentCounterpart.name}</span>
                <ShieldCheck className="w-4 h-4 text-primary-400 flex-shrink-0" />
              </div>
              <div className="text-[11px] text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Active now · Verified Professional
              </div>
            </div>
          </div>

          {/* Action icons */}
          <div className="flex items-center gap-1 text-gray-300">
            <button
              onClick={() => {
                const safeName = currentCounterpart.name || 'Member'
                useChatStore.getState().startCall('audio', {
                  id: String(currentCounterpart.id),
                  name: safeName,
                  avatar: currentCounterpart.avatar,
                  role: currentCounterpart.role || 'Verified Member',
                  phone: currentCounterpart.phone || '',
                })
              }}
              className="p-2 rounded-xl hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
              title="Voice Call"
            >
              <Phone className="w-4 h-4 text-primary-300" />
            </button>
            <button
              onClick={() => {
                const safeName = currentCounterpart.name || 'Member'
                useChatStore.getState().startCall('video', {
                  id: String(currentCounterpart.id),
                  name: safeName,
                  avatar: currentCounterpart.avatar,
                  role: currentCounterpart.role || 'Verified Member',
                  phone: currentCounterpart.phone || '',
                })
              }}
              className="p-2 rounded-xl hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
              title="Video Call"
            >
              <Video className="w-4 h-4 text-primary-300" />
            </button>
            <button
              onClick={() => setShowRightPanel(!showRightPanel)}
              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                showRightPanel ? 'bg-primary-700/40 text-primary-300' : 'hover:bg-white/10 text-gray-400 hover:text-white'
              }`}
              title="Conversation Details"
            >
              <Info className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Escrow Milestone & Security Banner */}
        <div className="px-4 py-2 bg-primary-950/40 border-b border-primary-500/10 flex items-center justify-between text-xs text-gray-300">
          <div className="flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-primary-400" />
            <span>Escrow Protected: Milestone release logged in audit registry</span>
          </div>
          <button
            onClick={() => navigate('/escrow/settlement')}
            className="text-primary-400 hover:text-primary-300 font-semibold text-xs flex items-center gap-1"
          >
            <span>View Vault</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-3">
          {/* Facebook Day separator */}
          <div className="flex items-center justify-center my-2">
            <span className="text-[11px] text-gray-500 bg-white/5 px-3 py-1 rounded-full border border-white/5">
              Today · End-to-End Encrypted Communication
            </span>
          </div>

          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-gray-400">
              <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-3 shadow-lg">
                <MessageCircle className="w-7 h-7 text-primary-400" />
              </div>
              <h4 className="text-white font-bold text-sm mb-1">Direct Chat with {currentCounterpart.name}</h4>
              <p className="text-xs text-gray-400 max-w-xs leading-relaxed">
                Send a message, repair photo, or document. Messages are exchanged directly between you and the artisan in real time.
              </p>
            </div>
          ) : (
            messages.map((msg) => {
            const isMe = msg.senderId === 'me'
            const isThumbsUp = msg.mediaType === 'thumbs_up' || msg.text === '👍'

            return (
              <div
                key={msg.id}
                onMouseEnter={() => setHoveredMessageId(msg.id)}
                onMouseLeave={() => setHoveredMessageId(null)}
                className={`relative flex flex-col ${isMe ? 'items-end' : 'items-start'} group`}
              >
                <div className={`flex items-end gap-2 max-w-[80%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                  {!isMe && (
                    <img
                      src={
                        currentCounterpart.avatar ||
                        `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentCounterpart.name}&backgroundColor=6D28D9`
                      }
                      alt=""
                      className="w-7 h-7 rounded-full object-cover flex-shrink-0 mb-1"
                    />
                  )}

                  <div className="relative">
                    {isThumbsUp ? (
                      /* Big Animated Facebook Thumbs Up Sticker */
                      <motion.div
                        initial={{ scale: 0.3 }}
                        animate={{ scale: [1.3, 1] }}
                        transition={{ duration: 0.25 }}
                        className="p-1 select-none cursor-pointer"
                        title="Liked"
                      >
                        <span className="text-5xl filter drop-shadow-[0_4px_14px_rgba(124,58,237,0.7)]">👍</span>
                      </motion.div>
                    ) : (
                      <div
                        className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                          isMe
                            ? 'rounded-br-sm text-white shadow-md'
                            : 'rounded-bl-sm text-gray-100'
                        }`}
                        style={{
                          background: isMe
                            ? '#7C3AED'
                            : 'rgba(255, 255, 255, 0.08)',
                          border: isMe ? 'none' : '1px solid rgba(255, 255, 255, 0.07)',
                        }}
                      >
                        {/* Media Attachment */}
                        {msg.mediaUrl && (
                          <div className="mb-2 rounded-xl overflow-hidden max-h-60 bg-black/40">
                            {msg.mediaType === 'image' || msg.mediaUrl.match(/\.(jpeg|jpg|png|webp|gif)/i) ? (
                              <img
                                src={msg.mediaUrl}
                                alt="attachment"
                                className="w-full h-auto max-h-56 object-cover rounded-xl cursor-pointer hover:scale-[1.02] transition-transform"
                                onClick={() => window.open(msg.mediaUrl, '_blank')}
                              />
                            ) : (
                              <a
                                href={msg.mediaUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="p-2.5 rounded-lg bg-white/10 hover:bg-white/15 flex items-center gap-2 text-xs text-white"
                              >
                                <Paperclip className="w-4 h-4 text-primary-300" />
                                <span className="truncate">{msg.text || 'Document'}</span>
                              </a>
                            )}
                          </div>
                        )}
                        <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                      </div>
                    )}

                    {/* Reaction Badges on Message */}
                    {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                      <div
                        className={`absolute -bottom-2.5 flex items-center gap-1 bg-[#1c1630] px-2 py-0.5 rounded-full border border-primary-500/30 text-xs shadow-md z-10 ${
                          isMe ? 'right-2' : 'left-2'
                        }`}
                      >
                        {Object.entries(msg.reactions).map(([emoji, count]: [string, any]) => (
                          <span key={emoji} className="flex items-center">
                            <span>{emoji}</span>
                            {Number(count) > 1 && <span className="text-[10px] text-gray-300 ml-0.5 font-bold">{count}</span>}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Hover Reaction Popup Bar (Facebook Style) */}
                    {hoveredMessageId === msg.id && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8, y: 5 }}
                        animate={{ opacity: 1, scale: 1, y: -4 }}
                        className={`absolute -top-9 flex items-center gap-1.5 bg-[#1b142e] px-2.5 py-1 rounded-full border border-primary-400/40 shadow-2xl z-20 ${
                          isMe ? 'right-0' : 'left-0'
                        }`}
                      >
                        {REACTION_CHOICES.map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => handleAddReaction(msg.id, emoji)}
                            className="hover:scale-130 transition-transform text-sm cursor-pointer p-0.5"
                            title={`React ${emoji}`}
                          >
                            {emoji}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </div>
                </div>

                {/* Status & Timestamp */}
                <div className={`flex items-center gap-1 px-1 mt-1 text-[10px] text-gray-500 ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <span>{msg.time}</span>
                  {isMe && (
                    <span>
                      {msg.read ? (
                        <CheckCheck className="w-3.5 h-3.5 text-primary-400 inline" />
                      ) : (
                        <Check className="w-3.5 h-3.5 text-gray-400 inline" />
                      )}
                    </span>
                  )}
                </div>
              </div>
            )
          }))}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex items-end gap-2">
              <img
                src={
                  currentCounterpart.avatar ||
                  `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentCounterpart.name}&backgroundColor=6D28D9`
                }
                alt=""
                className="w-7 h-7 rounded-full object-cover flex-shrink-0"
              />
              <div className="px-4 py-2.5 rounded-2xl rounded-bl-sm bg-white/10 border border-white/5 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-primary-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-primary-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-primary-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Quick Emoji Picker Drawer */}
        <AnimatePresence>
          {showEmojiPicker && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="px-4 py-2 bg-[#1b1531] border-t border-primary-500/20 flex flex-wrap gap-2.5 justify-center"
            >
              {QUICK_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    setInput((prev) => prev + emoji)
                    setShowEmojiPicker(false)
                  }}
                  className="text-lg hover:scale-125 transition-transform p-1 cursor-pointer"
                >
                  {emoji}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Facebook-style Bottom Input Bar */}
        <div
          className="p-2 sm:p-3 pb-3 sm:pb-3 flex items-center gap-1.5 sm:gap-2 flex-shrink-0 safe-area-inset-bottom"
          style={{
            background: 'rgba(23, 18, 38, 0.98)',
            borderTop: '1px solid rgba(167, 139, 250, 0.15)',
          }}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*,video/*,application/pdf"
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 rounded-full text-gray-400 hover:text-primary-300 hover:bg-white/5 transition-colors"
            title="Upload photo from device"
          >
            <Image className="w-5 h-5" />
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 rounded-full text-gray-400 hover:text-primary-300 hover:bg-white/5 transition-colors"
            title="Attach file"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className={`p-2 rounded-full transition-colors ${
              showEmojiPicker ? 'text-primary-300 bg-white/10' : 'text-gray-400 hover:text-primary-300 hover:bg-white/5'
            }`}
            title="Add emoji"
          >
            <Smile className="w-5 h-5" />
          </button>

          {/* Pill text input */}
          <div className="flex-1 relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleSendMessage()
                }
              }}
              placeholder="Aa"
              className="w-full px-4 py-2.5 rounded-full text-sm text-white placeholder-gray-500 outline-none transition-all"
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(167, 139, 250, 0.2)',
              }}
            />
          </div>

          {/* Facebook Signature: Thumbs-Up vs Send */}
          {input.trim().length === 0 ? (
            <button
              onClick={handleSendThumbsUp}
              className="p-2 rounded-full text-primary-400 hover:text-primary-300 hover:bg-white/5 hover:scale-115 active:scale-95 transition-all cursor-pointer"
              title="Send Thumbs Up 👍"
            >
              <ThumbsUp className="w-6 h-6 fill-primary-400" />
            </button>
          ) : (
            <button
              onClick={() => handleSendMessage()}
              className="p-2.5 rounded-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white hover:scale-105 active:scale-95 transition-all shadow-md cursor-pointer"
              title="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </div>
        </>
        )}
      </div>

      {/* ======================================================== */}
      {/* 3. RIGHT DETAILS PANEL: Facebook Messenger Profile Drawer */}
      {/* ======================================================== */}
      <AnimatePresence>
        {showRightPanel && currentCounterpart && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="hidden lg:flex flex-col border-l border-primary-500/15 bg-[#151025] overflow-y-auto no-scrollbar p-5"
          >
            {/* Profile Avatar & Info */}
            <div className="flex flex-col items-center text-center pb-5 border-b border-white/5">
              <div className="relative mb-3">
                <img
                  src={
                    currentCounterpart.avatar ||
                    `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentCounterpart.name}&backgroundColor=6D28D9`
                  }
                  alt={currentCounterpart.name}
                  className="w-20 h-20 rounded-full object-cover border-2 border-primary-400"
                />
                <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-400 border-2 border-[#151025]" />
              </div>
              <h2 className="text-base font-bold text-white">{currentCounterpart.name}</h2>
              <p className="text-xs text-primary-300 font-medium mt-0.5">{currentCounterpart.role || 'Verified Artisan'}</p>
              <span className="mt-2 text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                ● Active on LocalFix
              </span>
            </div>

            {/* Quick Actions */}
            <div className="py-4 border-b border-white/5 space-y-2">
              <button
                onClick={() => navigate(`/workers/${currentCounterpart.id}`)}
                className="w-full py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-white flex items-center justify-between transition-colors"
              >
                <span>View Full Profile</span>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>
              <button
                onClick={() => navigate(`/book/${currentCounterpart.id}`)}
                className="w-full py-2 px-3 rounded-xl bg-primary-700/30 hover:bg-primary-700/40 border border-primary-500/30 text-xs font-semibold text-primary-300 flex items-center justify-between transition-colors"
              >
                <span>Book Service with Escrow</span>
                <ChevronRight className="w-4 h-4 text-primary-400" />
              </button>
            </div>

            {/* Shared Media / Documents */}
            <div className="py-4 border-b border-white/5">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Shared Files & Media</div>
              <div className="space-y-2">
                <div className="flex items-center gap-2.5 p-2 rounded-lg bg-white/5 text-xs text-gray-300">
                  <FileText className="w-4 h-4 text-primary-400" />
                  <span className="truncate">Escrow_Agreement_LX7829.pdf</span>
                </div>
              </div>
            </div>

            {/* Privacy & Safety */}
            <div className="pt-4 text-xs text-gray-500 leading-relaxed">
              🔒 All conversations are encrypted and timestamped for dispute evidence. Keep communication on LocalFix to preserve full escrow protection.
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
