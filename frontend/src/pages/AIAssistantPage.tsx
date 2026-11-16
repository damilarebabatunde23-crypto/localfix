import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  Send,
  Bot,
  User,
  Wrench,
  Shield,
  CheckCircle,
  ArrowRight,
  Camera,
  X,
  Navigation,
  Lock,
  MapPin,
  Radio,
  ImageIcon,
  ArrowUpRight
} from 'lucide-react'
import { assistantApi, uploadApi } from '@/lib/api'
import { useAppStore } from '@/stores/useAppStore'
import toast from 'react-hot-toast'

const DEFAULT_GLOBAL_PROMPTS = [
  '5kVA Inverter tripping on borehole pump inrush load',
  'AC is rattling and blowing lukewarm air — what is wrong?',
  'How does the Uber-style live worker tracking work?',
  'Can I pay the technician in cash or bank transfer on-site?',
  'Borehole pressure switch buzzing but water is not pumping',
  'What if the price changes on-site for unexpected spare parts?',
  'What questions should I ask an electrician before hiring?',
  'Help me diagnose a generator stator burning smell'
]

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  photoUrl?: string
  timestamp: Date
  metadata?: {
    category?: string
    recommended_workers?: Array<{
      id: string
      name: string
      avatar: string
      profession: string
      rating: number
      callout_rate: string
    }>
    diagnostic_checks?: string[]
    estimated_cost_range?: string
    suggested_questions?: string[]
    action_links?: Array<{
      label: string
      url: string
    }>
  }
}

export default function AIAssistantPage() {
  const navigate = useNavigate()
  const { currency, locationName, userLocation } = useAppStore()

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'm0',
      role: 'assistant',
      content: `Hello! I am your **LocalFix AI Trade Copilot** 🛠️\n\nI provide instant technical diagnosis and connect you with vetted craftsmen worldwide:\n\n• **Mechanical & Electrical Triage:** AC/HVAC, solar inverters, boreholes, plumbing, generators, carpentry, and home appliances.\n• **Transparent Pricing in ${currency}:** Real-time calibrated cost estimates and callout rates.\n• **Uber-Style Live Dispatch Tracking:** Follow your technician on real streets with turn-by-turn road navigation, night radar, and satellite views.\n• **Dual Payment Choices:** Choose between our **Protected Escrow Vault** (funds released only after your personal inspection) or **Direct In-Person Settlement** (Cash, Bank Transfer, or P2P Apps).\n\nWhat repair issue or question can I assist with in **${locationName || 'your area'}** today?`,
      timestamp: new Date(),
    },
  ])

  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | undefined>()
  const [quickPrompts, setQuickPrompts] = useState<string[]>(DEFAULT_GLOBAL_PROMPTS)
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string>('')
  const [isUploadingPhoto, setIsUploadingPhoto] = useState<boolean>(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 15 * 1024 * 1024) {
      toast.error('Photo size must be under 15MB')
      return
    }

    setSelectedPhoto(file)
    const reader = new FileReader()
    reader.onload = () => setPhotoPreview(reader.result as string)
    reader.readAsDataURL(file)
    toast.success('Fault photo attached! Add your description and press Send.', { icon: '📷' })
  }

  const handleRemovePhoto = () => {
    setSelectedPhoto(null)
    setPhotoPreview('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const sendMessage = async (text = input) => {
    if (!text.trim() && !selectedPhoto) return

    let uploadedPhotoUrl = ''
    if (selectedPhoto) {
      setIsUploadingPhoto(true)
      toast.loading('Uploading fault photo for AI visual inspection...', { id: 'ai-upload' })
      try {
        const uploadRes = await uploadApi.uploadFile(selectedPhoto)
        uploadedPhotoUrl = uploadRes.full_url || uploadRes.url
      } catch {
        uploadedPhotoUrl = photoPreview
      } finally {
        setIsUploadingPhoto(false)
        toast.dismiss('ai-upload')
      }
    }

    const currentPhotoUrl = uploadedPhotoUrl || (selectedPhoto ? photoPreview : undefined)
    const promptText = text.trim() || 'Please inspect this attached photo of my equipment and diagnose the problem.'

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: promptText,
      photoUrl: currentPhotoUrl,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMsg])
    setInput('')
    handleRemovePhoto()
    setLoading(true)

    try {
      const data = await assistantApi.sendChat(
        promptText,
        sessionId,
        currency,
        locationName,
        currentPhotoUrl
      )

      if (data?.session_id) setSessionId(data.session_id)

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.reply,
        timestamp: new Date(),
        metadata: {
          category: data.category,
          recommended_workers: data.recommended_workers,
          diagnostic_checks: data.diagnostic_checks,
          estimated_cost_range: data.estimated_cost_range,
          suggested_questions: data.suggested_questions,
          action_links: data.action_links,
        },
      }
      setMessages((prev) => [...prev, assistantMsg])
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'I could not reach the diagnostic server at this moment. You can browse verified artisans directly on the map or live tracker.',
          timestamp: new Date(),
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-dark-bg flex flex-col" style={{ height: 'calc(100vh - 64px)' }}>
      {/* Top Header Bar */}
      <div
        className="px-4 py-3.5 flex items-center justify-between gap-3 border-b border-white/10"
        style={{ background: 'rgba(23,19,38,0.85)', backdropFilter: 'blur(16px)' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-glow-sm"
            style={{ background: 'linear-gradient(135deg,#6D28D9,#7C3AED)' }}
          >
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold text-base flex items-center gap-2">
              <span>LocalFix AI Trade Copilot</span>
              <span className="lf-badge-purple text-[10px]">Worldwide</span>
            </h1>
            <p className="text-gray-400 text-xs">
              Instant Technical Triage, Fault Analysis & Dynamic Pricing in {currency}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/tracking"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold hover:bg-emerald-600/30 transition-colors"
          >
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span>Live Tracker</span>
          </Link>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/5 border border-white/10 text-xs text-gray-300">
            <MapPin className="w-3.5 h-3.5 text-primary-400" />
            <span className="max-w-[130px] truncate">{locationName || 'Worldwide'}</span>
          </div>
        </div>
      </div>

      {/* Messages Canvas */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-6 space-y-4 max-w-3xl mx-auto w-full">
        {/* Quick prompt cards on first load */}
        {messages.length === 1 && (
          <div className="space-y-2 mb-4">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              Popular Troubleshooting Inquiries:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {quickPrompts.map((p) => (
                <button
                  key={p}
                  onClick={() => sendMessage(p)}
                  className="p-3.5 rounded-xl text-xs text-left text-primary-200 hover:text-white hover:bg-primary-700/30 transition-all flex items-center justify-between group cursor-pointer border border-primary-500/25 bg-primary-950/30"
                >
                  <span className="line-clamp-2">{p}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-primary-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message bubbles */}
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            {/* Avatar */}
            <div
              className={`w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-md ${
                msg.role === 'assistant'
                  ? 'bg-[#6D28D9]'
                  : 'bg-[#7C3AED]'
              }`}
            >
              {msg.role === 'assistant' ? (
                <Sparkles className="w-4 h-4 text-white" />
              ) : (
                <User className="w-4 h-4 text-white" />
              )}
            </div>

            {/* Bubble Container */}
            <div
              className={`max-w-[85%] rounded-3xl px-5 py-4 text-sm leading-relaxed shadow-lg ${
                msg.role === 'user'
                  ? 'text-white rounded-tr-none bg-[#7C3AED]'
                  : 'text-white rounded-tl-none bg-[#160F29] border border-primary-500/25'
              }`}
            >
              {msg.role === 'assistant' && (
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10 text-[10px] text-primary-300 font-semibold uppercase tracking-wider">
                  <div className="flex items-center gap-1.5">
                    <Bot className="w-3.5 h-3.5 text-primary-400" />
                    <span>LocalFix Trade Copilot</span>
                  </div>
                  {msg.metadata?.estimated_cost_range && (
                    <span className="text-emerald-400 font-bold normal-case">
                      Est: {msg.metadata.estimated_cost_range}
                    </span>
                  )}
                </div>
              )}

              {/* Photo attached by user */}
              {msg.photoUrl && (
                <div className="mb-3 rounded-2xl overflow-hidden border border-white/20 max-w-sm">
                  <img
                    src={msg.photoUrl}
                    alt="Uploaded repair issue"
                    className="w-full max-h-60 object-cover"
                  />
                  <div className="p-1.5 bg-black/60 text-[10px] text-gray-300 text-center">
                    📸 Attached Fault Photo Analyzed
                  </div>
                </div>
              )}

              <div className="whitespace-pre-wrap">{msg.content}</div>

              {/* Action Links Buttons */}
              {msg.metadata?.action_links && msg.metadata.action_links.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-white/10">
                  {msg.metadata.action_links.map((link, idx) => (
                    <button
                      key={idx}
                      onClick={() => navigate(link.url)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-primary-600/30 hover:bg-primary-600 text-primary-200 hover:text-white border border-primary-500/40 flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <span>{link.label}</span>
                      <ArrowUpRight className="w-3 h-3 text-primary-400" />
                    </button>
                  ))}
                </div>
              )}

              {/* Recommended Artisan Cards */}
              {msg.metadata?.recommended_workers && msg.metadata.recommended_workers.length > 0 && (
                <div className="mt-4 pt-3 border-t border-white/10 space-y-2">
                  <div className="text-[11px] font-bold text-primary-300 uppercase tracking-wide">
                    Matched Verified Artisans Nearby:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {msg.metadata.recommended_workers.map((w) => (
                      <div
                        key={w.id}
                        className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={w.avatar}
                            alt={w.name}
                            className="w-10 h-10 rounded-xl object-cover border border-primary-500/30 flex-shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-white truncate">{w.name}</div>
                            <div className="text-[10px] text-gray-400 truncate">{w.profession}</div>
                            <div className="text-[10px] text-emerald-400 font-semibold">{w.callout_rate}</div>
                          </div>
                        </div>
                        <button
                          onClick={() => navigate(`/book/${w.id}`)}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-primary-700 hover:bg-primary-600 text-white flex-shrink-0 transition-colors shadow-sm cursor-pointer"
                        >
                          Book
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Diagnostic Checklist */}
              {msg.metadata?.diagnostic_checks && msg.metadata.diagnostic_checks.length > 0 && (
                <div className="mt-3 pt-3 border-t border-white/10">
                  <div className="text-[11px] font-bold text-gray-400 mb-1.5 flex items-center gap-1.5">
                    <Shield className="w-3 h-3 text-primary-400" /> Homeowner Diagnostic Checks:
                  </div>
                  <ul className="space-y-1 text-xs text-gray-300">
                    {msg.metadata.diagnostic_checks.map((chk, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                        <span>{chk}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="text-[10px] text-gray-500 mt-2 text-right">
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </motion.div>
        ))}

        {/* Loading bounce indicator */}
        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-2xl bg-[#6D28D9] flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div
              className="rounded-3xl rounded-tl-none px-5 py-4 bg-[#160F29] border border-primary-500/25"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">Analyzing diagnosis & finding matching artisans...</span>
                <div className="flex items-center gap-1">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-2 h-2 rounded-full bg-primary-400 animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input & Photo Attachment Dock */}
      <div
        className="px-4 py-4 max-w-3xl mx-auto w-full border-t border-white/10"
        style={{ background: 'rgba(23,19,38,0.95)' }}
      >
        {/* Photo preview pill if attached */}
        {photoPreview && (
          <div className="mb-3 p-2 rounded-2xl bg-black/50 border border-primary-500/40 flex items-center justify-between gap-3 max-w-sm">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <img src={photoPreview} alt="Preview" className="w-10 h-10 rounded-xl object-cover" />
              <div className="text-xs text-white truncate">
                <span className="font-bold block">Photo Attached</span>
                <span className="text-[10px] text-gray-400">Ready for visual diagnosis</span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleRemovePhoto}
              className="p-1 rounded-lg text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="flex items-end gap-2">
          {/* Hidden File Input for Fault Photo */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handlePhotoSelect}
            accept="image/*"
            className="hidden"
          />

          {/* Photo upload trigger */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Attach a photo of the broken part, error code, or leak"
            className="w-12 h-12 rounded-2xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white flex items-center justify-center transition-all border border-white/10 flex-shrink-0 cursor-pointer"
          >
            <Camera className="w-5 h-5" />
          </button>

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                sendMessage()
              }
            }}
            placeholder={`Describe your issue (e.g. AC rattling, 5kVA inverter tripping, pipe leak) in ${currency}...`}
            rows={2}
            className="flex-1 px-4 py-3 rounded-2xl text-sm outline-none resize-none bg-black/40 border border-white/15 text-white placeholder-gray-500 focus:border-primary-500 transition-colors"
          />

          <button
            onClick={() => sendMessage()}
            disabled={(!input.trim() && !selectedPhoto) || loading || isUploadingPhoto}
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white transition-all disabled:opacity-40 cursor-pointer flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg,#6D28D9,#7C3AED)',
              boxShadow: '0 4px 16px rgba(109,40,217,0.4)',
            }}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>

        <p className="text-gray-500 text-[10px] mt-2 text-center">
          LocalFix AI Trade Copilot delivers technical recommendations, calibrated {currency} cost estimates, and real-time artisan dispatches.
        </p>
      </div>
    </div>
  )
}
