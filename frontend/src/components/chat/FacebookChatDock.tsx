import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  X,
  Minus,
  Maximize2,
  Phone,
  Video,
  Send,
  ThumbsUp,
  Smile,
  Image,
  Paperclip,
  CheckCheck,
  Check,
  ShieldCheck,
  ChevronDown,
  Sparkles,
  ExternalLink,
  MessageCircle,
} from 'lucide-react'
import { useChatStore } from '@/stores/useChatStore'
import { uploadApi } from '@/lib/api'
import toast from 'react-hot-toast'

const QUICK_EMOJIS = ['😀', '😂', '❤️', '😍', '🔥', '👏', '🙏', '💯', '⚡', '🛠️', '₦', '👍']
const REACTION_CHOICES = ['👍', '❤️', '😂', '😮', '😢', '😡', '🔥']

export default function FacebookChatDock() {
  const navigate = useNavigate()
  const {
    isOpen,
    isMinimized,
    activeContact,
    messages,
    isTyping,
    closeChat,
    toggleMinimize,
    sendMessage,
    sendThumbsUp,
    addReaction,
    unreadTotal,
    startCall,
  } = useChatStore()

  const [input, setInput] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null)
  const [activeCallModal, setActiveCallModal] = useState<'audio' | 'video' | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom on new message
  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isTyping, isOpen, isMinimized])

  // Periodic polling for real messages from backend when chat is open
  useEffect(() => {
    if (!isOpen || isMinimized) return
    const pollInterval = setInterval(() => {
      const currentConvId = useChatStore.getState().activeConversationId
      if (currentConvId) {
        useChatStore.getState().loadMessagesForConversation(currentConvId)
      }
    }, 3500)

    return () => clearInterval(pollInterval)
  }, [isOpen, isMinimized])

  if (!isOpen) return null

  const handleSend = async () => {
    if (!input.trim()) return
    const text = input
    setInput('')
    setShowEmojiPicker(false)
    await sendMessage(text)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const previewUrl = URL.createObjectURL(file)
    const isImage = file.type.startsWith('image/')
    toast.loading(`Uploading "${file.name}"...`, { id: 'chat-upload' })

    try {
      const res = await uploadApi.uploadFile(file)
      const uploadedUrl = res.full_url || res.url || previewUrl
      toast.success('Sent attachment!', { id: 'chat-upload' })
      await sendMessage(file.name, uploadedUrl, isImage ? 'image' : 'document')
    } catch {
      toast.dismiss('chat-upload')
      // Fallback local preview
      await sendMessage(file.name, previewUrl, isImage ? 'image' : 'document')
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleOpenFullPage = () => {
    navigate(`/messages?conversation=${activeContact?.conversationId || ''}&worker=${activeContact?.id || ''}`)
    closeChat()
  }

  if (!isOpen || !activeContact) {
    return null
  }

  return (
    <div className="fixed bottom-20 sm:bottom-0 right-3 sm:right-6 z-50 select-none">
      <AnimatePresence mode="wait">
        {/* ======================================================== */}
        {/* MINIMIZED STATE: Facebook Messenger Chat Head Bubble    */}
        {/* ======================================================== */}
        {isMinimized ? (
          <motion.div
            key="minimized-bubble"
            initial={{ scale: 0.6, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.6, opacity: 0, y: 20 }}
            onClick={toggleMinimize}
            className="mb-1 sm:mb-4 flex items-center gap-2 sm:gap-3 px-3 py-2 rounded-full cursor-pointer transition-all hover:scale-105 active:scale-95 shadow-2xl"
            style={{
              background: '#1A1230',
              border: '1.5px solid rgba(167, 139, 250, 0.4)',
              boxShadow: '0 10px 28px rgba(109, 40, 217, 0.45)',
            }}
          >
            <div className="relative">
              <img
                src={
                  activeContact?.avatar ||
                  '/logo.jpg'
                }
                alt={activeContact?.name || 'LocalFix Concierge'}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-primary-400 bg-[#1e1538]"
              />
              <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#1c1630]" />
              {unreadTotal > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-[#1c1630] animate-pulse">
                  {unreadTotal}
                </span>
              )}
            </div>
            <div className="hidden sm:block text-left pr-2">
              <div className="text-white text-xs font-bold leading-tight truncate max-w-[130px]">
                {activeContact?.name || 'LocalFix Support'}
              </div>
              <div className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Active now · Help
              </div>
            </div>
            <ChevronDown className="w-4 h-4 text-primary-300" />
          </motion.div>
        ) : (
          /* ======================================================== */
          /* EXPANDED STATE: Facebook Messenger Floating Chat Box     */
          /* ======================================================== */
          <motion.div
            key="chat-box"
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-[calc(100vw-1.5rem)] sm:w-[380px] h-[480px] max-h-[75vh] sm:max-h-[85vh] rounded-2xl sm:rounded-t-2xl sm:rounded-b-none flex flex-col overflow-hidden shadow-2xl"
            style={{
              background: '#160F29',
              border: '1.5px solid rgba(167, 139, 250, 0.25)',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 24px rgba(109, 40, 217, 0.25)',
            }}
          >
            {/* ── Top Header ── */}
            <div
              className="px-3.5 py-2.5 flex items-center justify-between flex-shrink-0 cursor-default"
              style={{
                background: '#1E1538',
                borderBottom: '1px solid rgba(167, 139, 250, 0.18)',
              }}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative flex-shrink-0">
                  <img
                    src={
                      activeContact?.avatar ||
                      '/logo.jpg'
                    }
                    alt={activeContact?.name || 'LocalFix Concierge'}
                    className="w-9 h-9 rounded-full object-cover border border-primary-400/40 bg-[#1e1538]"
                  />
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#1c1630]" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-white text-xs font-bold truncate max-w-[150px]">
                      {activeContact?.name || 'LocalFix Concierge'}
                    </span>
                    <ShieldCheck className="w-3.5 h-3.5 text-primary-400 flex-shrink-0" />
                  </div>
                  <div className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Official Platform Support · Escrow Safe
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1 text-gray-300">
                <button
                  onClick={() => {
                    const safeContact = {
                      id: String(activeContact?.id || 'contact'),
                      name: activeContact?.name || 'LocalFix Artisan',
                      avatar: activeContact?.avatar,
                      role: activeContact?.role || 'Verified Artisan',
                      phone: activeContact?.phone || '',
                    }
                    startCall('audio', safeContact)
                  }}
                  className="p-1.5 rounded-lg hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                  title="Start Audio Call"
                >
                  <Phone className="w-3.5 h-3.5 text-primary-300" />
                </button>
                <button
                  onClick={() => {
                    const safeContact = {
                      id: String(activeContact?.id || 'contact'),
                      name: activeContact?.name || 'LocalFix Artisan',
                      avatar: activeContact?.avatar,
                      role: activeContact?.role || 'Verified Artisan',
                      phone: activeContact?.phone || '',
                    }
                    startCall('video', safeContact)
                  }}
                  className="p-1.5 rounded-lg hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                  title="Start Video Call"
                >
                  <Video className="w-3.5 h-3.5 text-primary-300" />
                </button>
                <button
                  onClick={handleOpenFullPage}
                  className="p-1.5 rounded-lg hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                  title="Expand to Full Messenger"
                >
                  <Maximize2 className="w-3.5 h-3.5 text-gray-400" />
                </button>
                <button
                  onClick={toggleMinimize}
                  className="p-1.5 rounded-lg hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                  title="Minimize"
                >
                  <Minus className="w-3.5 h-3.5 text-gray-400" />
                </button>
                <button
                  onClick={toggleMinimize}
                  className="p-1.5 rounded-lg hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                  title="Minimize to Floating Bubble"
                >
                  <X className="w-3.5 h-3.5 text-gray-400" />
                </button>
              </div>
            </div>

            {/* ── Trust & Escrow Reassurance Banner ── */}
            <div className="px-3 py-1.5 bg-primary-950/40 border-b border-primary-500/10 flex items-center justify-between text-[10px] text-gray-300">
              <span className="flex items-center gap-1">
                🛡️ <span>Smart Escrow Protected Thread</span>
              </span>
              <button
                onClick={handleOpenFullPage}
                className="text-primary-400 hover:text-primary-300 font-semibold flex items-center gap-0.5"
              >
                <span>Full View</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </button>
            </div>

            {/* ── Messages Stream ── */}
            <div className="flex-1 p-3 overflow-y-auto no-scrollbar space-y-2.5">
              {/* Date separator */}
              <div className="text-center my-1">
                <span className="text-[10px] text-gray-500 bg-white/5 px-2.5 py-0.5 rounded-full">
                  Today · Facebook-Style Realtime Chat
                </span>
              </div>

              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center text-gray-400">
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-2 shadow-sm">
                    <MessageCircle className="w-5 h-5 text-primary-400" />
                  </div>
                  <span className="text-xs text-white font-semibold mb-0.5">Start chat with {activeContact?.name || 'Artisan'}</span>
                  <span className="text-[10px] text-gray-400 max-w-[200px]">Type below to send a direct message in real time.</span>
                </div>
              ) : (
                messages.map((msg, index) => {
                  const isMe = msg.senderId === 'me'
                  const isLastFromMe = isMe && (index === messages.length - 1 || messages[index + 1]?.senderId !== 'me')
                  const isThumbsUp = msg.mediaType === 'thumbs_up' || msg.text === '👍'

                  return (
                  <div
                    key={msg.id}
                    onMouseEnter={() => setHoveredMessageId(msg.id)}
                    onMouseLeave={() => setHoveredMessageId(null)}
                    className={`relative flex flex-col ${isMe ? 'items-end' : 'items-start'} group`}
                  >
                    <div className={`flex items-end gap-1.5 max-w-[85%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                      {/* Counterpart mini avatar on incoming */}
                      {!isMe && (
                        <img
                          src={
                            activeContact?.avatar ||
                            '/logo.jpg'
                          }
                          alt=""
                          className="w-6 h-6 rounded-full object-cover flex-shrink-0 mb-0.5 bg-[#1e1538]"
                        />
                      )}

                      {/* Message Bubble */}
                      <div className="relative">
                        {isThumbsUp ? (
                          /* Large animated Facebook Thumbs Up sticker */
                          <motion.div
                            initial={{ scale: 0.2 }}
                            animate={{ scale: [1.2, 1] }}
                            transition={{ duration: 0.25 }}
                            className="p-1 cursor-pointer select-none"
                            title="Liked"
                          >
                            <span className="text-4xl filter drop-shadow-[0_4px_10px_rgba(124,58,237,0.6)]">👍</span>
                          </motion.div>
                        ) : (
                          <div
                            className={`px-3.5 py-2 rounded-2xl text-xs leading-relaxed transition-all ${
                              isMe
                                ? 'rounded-br-sm text-white shadow-md'
                                : 'rounded-bl-sm text-gray-100'
                            }`}
                            style={{
                              background: isMe
                                ? '#7C3AED'
                                : 'rgba(255, 255, 255, 0.08)',
                              border: isMe ? 'none' : '1px solid rgba(255, 255, 255, 0.06)',
                            }}
                          >
                            {/* Media Attachment */}
                            {msg.mediaUrl && (
                              <div className="mb-1.5 rounded-lg overflow-hidden max-h-40 bg-black/40">
                                {msg.mediaType === 'image' || msg.mediaUrl.match(/\.(jpeg|jpg|png|webp|gif)/i) ? (
                                  <img
                                    src={msg.mediaUrl}
                                    alt="attachment"
                                    className="w-full h-auto max-h-36 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                    onClick={() => window.open(msg.mediaUrl, '_blank')}
                                  />
                                ) : (
                                  <a
                                    href={msg.mediaUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-2 rounded bg-white/10 flex items-center gap-1.5 text-[11px] text-white underline"
                                  >
                                    <Paperclip className="w-3.5 h-3.5 text-primary-300" />
                                    <span className="truncate">{msg.text || 'Document'}</span>
                                  </a>
                                )}
                              </div>
                            )}

                            <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                          </div>
                        )}

                        {/* Reaction badges on message */}
                        {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                          <div
                            className={`absolute -bottom-2 flex items-center gap-0.5 bg-[#1f1a35] px-1.5 py-0.5 rounded-full border border-primary-500/30 text-[10px] shadow-md z-10 ${
                              isMe ? 'right-1' : 'left-1'
                            }`}
                          >
                            {Object.entries(msg.reactions).map(([emoji, count]: [string, any]) => (
                              <span key={emoji} className="flex items-center">
                                <span>{emoji}</span>
                                {Number(count) > 1 && <span className="text-[9px] text-gray-300 ml-0.5 font-bold">{count}</span>}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Hover Quick Facebook Reactions Bar */}
                        {hoveredMessageId === msg.id && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.8, y: 5 }}
                            animate={{ opacity: 1, scale: 1, y: -4 }}
                            className={`absolute -top-7 flex items-center gap-1 bg-[#1a142c] px-2 py-1 rounded-full border border-primary-400/30 shadow-xl z-20 ${
                              isMe ? 'right-0' : 'left-0'
                            }`}
                          >
                            {REACTION_CHOICES.map((emoji) => (
                              <button
                                key={emoji}
                                onClick={() => addReaction(msg.id, emoji)}
                                className="hover:scale-125 transition-transform text-xs cursor-pointer p-0.5"
                                title={`React ${emoji}`}
                              >
                                {emoji}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </div>
                    </div>

                    {/* Delivery / Read Receipt and Timestamp */}
                    <div className={`flex items-center gap-1 px-1 mt-0.5 text-[9px] text-gray-500 ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <span>{msg.time}</span>
                      {isMe && (
                        <span>
                          {msg.read ? (
                            <CheckCheck className="w-3 h-3 text-blue-400 inline" />
                          ) : (
                            <Check className="w-3 h-3 text-gray-400 inline" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                )
              }))}

              {/* Typing indicator */}
              {isTyping && (
                <div className="flex items-end gap-1.5">
                  <img
                    src={
                      activeContact?.avatar ||
                      `https://api.dicebear.com/7.x/avataaars/svg?seed=${activeContact?.name || 'Artisan'}&backgroundColor=6D28D9`
                    }
                    alt=""
                    className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                  />
                  <div className="px-3 py-2 rounded-2xl rounded-bl-sm bg-white/10 border border-white/5 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-primary-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-primary-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* ── Quick Emoji Picker Drawer ── */}
            <AnimatePresence>
              {showEmojiPicker && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="px-3 py-2 bg-[#1b1531] border-t border-primary-500/20 flex flex-wrap gap-2 justify-center"
                >
                  {QUICK_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => {
                        setInput((prev) => prev + emoji)
                        setShowEmojiPicker(false)
                      }}
                      className="text-base hover:scale-125 transition-transform p-1 cursor-pointer"
                    >
                      {emoji}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Quick LocalFix Assistance Prompts ── */}
            {activeContact?.id === 'localfix-concierge' && (
              <div className="px-2.5 py-1.5 bg-[#171129] border-t border-primary-500/15 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {[
                  '🛠️ How do I book an artisan?',
                  '🛡️ How does Escrow protection work?',
                  '⚡ Find urgent repairs near me',
                  '❓ What is the LocalFix guarantee?',
                ].map((chip) => (
                  <button
                    key={chip}
                    onClick={() => sendMessage(chip)}
                    className="flex-shrink-0 px-2.5 py-1 rounded-full bg-primary-950/80 hover:bg-primary-900 border border-primary-500/30 text-primary-200 text-[10px] font-medium transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            )}

            {/* ── Bottom Input Bar (Facebook Messenger Style) ── */}
            <div
              className="p-2.5 flex items-center gap-1.5 flex-shrink-0"
              style={{
                background: 'rgba(23, 18, 38, 0.98)',
                borderTop: '1px solid rgba(167, 139, 250, 0.15)',
              }}
            >
              {/* Hidden file input */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*,video/*,application/pdf"
                className="hidden"
              />

              {/* Attach image/file */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-1.5 rounded-full text-gray-400 hover:text-primary-300 hover:bg-white/5 transition-colors"
                title="Send photo or document"
              >
                <Image className="w-4 h-4" />
              </button>

              {/* Emoji toggle */}
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className={`p-1.5 rounded-full transition-colors ${
                  showEmojiPicker ? 'text-primary-300 bg-white/10' : 'text-gray-400 hover:text-primary-300 hover:bg-white/5'
                }`}
                title="Choose an emoji"
              >
                <Smile className="w-4 h-4" />
              </button>

              {/* Text Input Pill */}
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleSend()
                    }
                  }}
                  placeholder="Aa"
                  className="w-full px-3.5 py-2 rounded-full text-xs text-white placeholder-gray-500 outline-none transition-all"
                  style={{
                    background: 'rgba(255, 255, 255, 0.07)',
                    border: '1px solid rgba(167, 139, 250, 0.15)',
                  }}
                />
              </div>

              {/* ── Signature Thumbs-Up vs Send Toggle ── */}
              {input.trim().length === 0 ? (
                <button
                  onClick={sendThumbsUp}
                  className="p-1.5 rounded-full text-[#7C3AED] hover:text-[#A78BFA] hover:bg-primary-500/10 hover:scale-110 active:scale-90 transition-all cursor-pointer"
                  title="Send Thumbs Up 👍"
                >
                  <ThumbsUp className="w-5 h-5 fill-[#7C3AED]" />
                </button>
              ) : (
                <button
                  onClick={handleSend}
                  className="p-1.5 rounded-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white hover:scale-105 active:scale-95 transition-all shadow-md cursor-pointer"
                  title="Send message"
                >
                  <Send className="w-4 h-4 text-white" />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
