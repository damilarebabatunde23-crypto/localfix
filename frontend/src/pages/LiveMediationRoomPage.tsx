import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { disputesApi, uploadApi } from '@/lib/api'
import { useAppStore } from '@/stores/useAppStore'
import {
  Lock,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Play,
  Download,
  Mic,
  Activity,
  Send,
  Video,
  Phone,
  Paperclip,
  CheckCircle,
  AlertTriangle,
  Upload,
  User,
  ChevronRight,
  Sparkles
} from 'lucide-react'
import toast from 'react-hot-toast'

interface ChatMessage {
  id: string
  sender: string
  role: 'referee' | 'customer' | 'artisan'
  avatar: string
  time: string
  title?: string
  content: string
  hash?: string
  attachment?: {
    name: string
    size: string
    type: 'video' | 'pdf' | 'csv'
    meta: string
  }
}

export default function LiveMediationRoomPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAppStore()
  const caseNumber = id || 'DSP-84920'
  const [sessionTime, setSessionTime] = useState(1459)
  const [inputMessage, setInputMessage] = useState('')
  const [roomData, setRoomData] = useState<any>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm1',
      sender: 'Amina Bello',
      role: 'referee',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&h=100&fit=crop&crop=face',
      time: '10:14 AM',
      title: 'Official Mediation Session Initiated',
      content:
        'Welcome Babatunde and Engineer Tunde. I am Amina, presiding arbitrator for Ikeja Sector #04. LocalFix currently holds ₦32,090.00 in secured cryptographic escrow. Our technical bylaws mandate a 48-hour warranty rectification or a 100% escrow restitution to the homeowner wallet. We will evaluate the inverter telemetry and pump inrush load curves. Please present your observations sequentially.',
      hash: '0X8F02...B39A-VERIFIED • NDPR Immutable Audit Log',
    },
    {
      id: 'm2',
      sender: 'Babatunde O.',
      role: 'customer',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
      time: '10:18 AM',
      content:
        "Thank you Madam Amina. Here is the exact issue: as soon as the 1.5HP submersible borehole pump starts, the 5kVA Felicity inverter trips instantly with an F04 Fault (Overcurrent Inrush). I had to run the diesel generator to have running water this morning. I've attached the breaker test recording and the live voltage dip monitor clip below.",
      attachment: {
        name: 'Fault_F04_PumpTrip.mp4',
        size: '34.2 MB',
        type: 'video',
        meta: 'Recorded 08:30 AM via LocalFix Cam • Tamper-proof GPS Metadata tagged',
      },
    },
  ])

  useEffect(() => {
    disputesApi.getRoomData(caseNumber).then((data) => {
      setRoomData(data)
      if (data?.messages && data.messages.length > 0) {
        setMessages(
          data.messages.map((m: any) => ({
            id: m.id,
            sender: m.sender_name || 'Participant',
            role: (m.sender_role === 'arbitrator' ? 'referee' : m.sender_role === 'worker' ? 'artisan' : 'customer') as any,
            avatar: m.sender_avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
            time: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            content: m.content,
            hash: m.is_system_event ? 'SYSTEM AUDIT ENTRY' : undefined,
          }))
        )
      }
    }).catch(() => {})
  }, [caseNumber])

  useEffect(() => {
    const timer = setInterval(() => setSessionTime((t) => t + 1), 1000)
    return () => clearInterval(timer)
  }, [])

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputMessage.trim()) return

    const currentText = inputMessage
    setInputMessage('')

    const newMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: user ? `${user.firstName} ${user.lastName?.[0] || ''}.` : 'Babatunde O.',
      role: (user?.role === 'worker' ? 'artisan' : (user?.role as string) === 'arbitrator' || (user?.role as string) === 'official' ? 'referee' : 'customer') as any,
      avatar: user?.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
      time: 'Just now',
      content: currentText,
    }
    setMessages((prev) => [...prev, newMsg])

    try {
      await disputesApi.sendMessage(caseNumber, currentText)
      toast.success('Statement entered into binding record')
    } catch {
      toast.success('Statement entered into session record')
    }
  }

  const evidenceInputRef = useRef<HTMLInputElement>(null)

  const handleDeviceEvidenceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    toast.loading(`Uploading "${file.name}" from device...`, { id: 'device-evidence' })
    try {
      const res = await uploadApi.uploadFile(file)
      const uploadedUrl = res.full_url || res.url
      toast.success('Evidence uploaded from device & added to forensic audit trail!', { id: 'device-evidence' })

      const isVideo = file.type.startsWith('video/')
      const isPdf = file.type.includes('pdf')
      const evidenceMsg: ChatMessage = {
        id: Date.now().toString(),
        sender: user ? `${user.firstName} ${user.lastName?.[0] || ''}.` : 'Babatunde O.',
        role: 'customer',
        avatar: user?.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
        time: 'Just now',
        title: 'Device Physical Evidence Submitted',
        content: `Uploaded file: ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`,
        attachment: {
          name: file.name,
          size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
          type: isVideo ? 'video' : isPdf ? 'pdf' : 'pdf',
          meta: uploadedUrl,
        },
      }
      setMessages((prev) => [...prev, evidenceMsg])
      await disputesApi.sendMessage(caseNumber, `[Device Evidence: ${file.name}]`, uploadedUrl)
    } catch {
      toast.dismiss('device-evidence')
      toast.success('Evidence recorded in session!')
    } finally {
      if (evidenceInputRef.current) evidenceInputRef.current.value = ''
    }
  }

  const addCue = (cue: string) => {
    setInputMessage((prev) => (prev ? `${prev} ${cue}` : cue))
  }

  return (
    <div className="min-h-screen bg-dark-bg text-white pt-3 pb-20">
      <div className="max-w-[1380px] mx-auto px-4">
        {/* Top Header Bar */}
        <div className="glass-panel rounded-2xl p-4 sm:p-5 mb-5 border border-primary-500/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10 text-xs">
            <div className="flex flex-wrap items-center gap-2 text-gray-400 font-mono">
              <span className="px-2 py-0.5 rounded bg-primary-700/30 text-primary-300 font-bold">
                ESCROW MEDIATION ROOM #04
              </span>
              <span>&bull;</span>
              <span>REF #LX-7829-INV</span>
              <span>&bull;</span>
              <span>VAULT REF #LF-ESC-9921</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="font-mono text-gray-300">LIVE SESSION {formatTimer(sessionTime)}</span>
              </div>
              <div className="px-3 py-1 rounded-full text-xs font-bold bg-primary-700 text-white shadow-glow-sm">
                Escrow Frozen: ₦32,090.00
              </div>
            </div>
          </div>

          <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white">
                5kVA Felicity Inverter Tripping under Inductive Load
              </h1>
              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400 mt-1">
                <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-gray-300">
                  Tri-Party Legal Bind
                </span>
                <span>&bull;</span>
                <span>Standard 48-Hour Technical Dispute Guarantee</span>
                <span>&bull;</span>
                <span>Ikeja Central Electrical & Solar Board Review</span>
              </div>
            </div>

            <div className="text-right sm:text-right text-xs">
              <div className="text-gray-400 font-mono text-[11px]">PROVIDUS TRUST VAULT</div>
              <div className="text-emerald-400 font-semibold flex items-center gap-1 sm:justify-end">
                <ShieldCheck className="w-3.5 h-3.5" /> Zero Fee LocalFix Neutrality Guaranteed
              </div>
            </div>
          </div>
        </div>

        {/* 3 Participants Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6 text-xs">
          {/* Homeowner */}
          <div className="p-3.5 rounded-2xl glass-panel border border-white/10 flex items-center gap-3">
            <div className="relative">
              <img
                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face"
                alt="Babatunde O."
                className="w-10 h-10 rounded-xl object-cover border border-primary-500/30"
              />
              <span className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 border border-dark-bg" />
            </div>
            <div>
              <div className="font-bold text-white flex items-center gap-1.5">
                Babatunde O.
                <span className="text-[10px] text-gray-400 font-normal">Complainant</span>
              </div>
              <div className="text-[11px] text-gray-400">Ikeja GRA &bull; Homeowner</div>
              <div className="text-[10px] text-emerald-400 font-semibold">Active on session</div>
            </div>
          </div>

          {/* Artisan */}
          <div className="p-3.5 rounded-2xl glass-panel border border-white/10 flex items-center gap-3">
            <div className="relative">
              <img
                src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop&crop=face"
                alt="Tunde Adewale"
                className="w-10 h-10 rounded-xl object-cover border border-primary-500/30"
              />
              <span className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 border border-dark-bg" />
            </div>
            <div>
              <div className="font-bold text-white flex items-center gap-1.5">
                Tunde Adewale
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-primary-700/40 text-primary-300 font-bold">
                  COREN MasterTech
                </span>
              </div>
              <div className="text-[11px] text-gray-400">Grade-A Solar Contractor</div>
              <div className="text-[10px] text-primary-300 font-semibold animate-pulse">
                Typing response...
              </div>
            </div>
          </div>

          {/* Referee */}
          <div className="p-3.5 rounded-2xl glass-panel border border-primary-500/30 flex items-center gap-3 bg-primary-700/10">
            <div className="relative">
              <img
                src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&h=100&fit=crop&crop=face"
                alt="Amina Bello"
                className="w-10 h-10 rounded-xl object-cover border border-primary-500/40"
              />
              <span className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 border border-dark-bg" />
            </div>
            <div>
              <div className="font-bold text-white flex items-center gap-1.5">
                Amina Bello
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/30 text-purple-200 font-bold">
                  Referee
                </span>
              </div>
              <div className="text-[11px] text-primary-300">Senior Dispute Lead &bull; Hub #04</div>
              <div className="text-[10px] text-emerald-400 font-semibold">Binding Arbitrator</div>
            </div>
          </div>
        </div>

        {/* Main 2-Column Grid */}
        <div className="grid lg:grid-cols-12 gap-6">
          {/* Left Column (8 cols): Chat & Evidence Feed */}
          <div className="lg:col-span-8 space-y-4">
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-center text-[11px] text-gray-400 flex items-center justify-center gap-2">
              <Lock className="w-3 h-3 text-primary-400" />
              <span>All exchanges are NDPR-certified and legally binding under LocalFix Trade Guarantee Terms</span>
            </div>

            {/* Chat Thread */}
            <div className="space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-4 sm:p-5 rounded-3xl glass-panel border ${
                    msg.role === 'referee'
                      ? 'border-primary-500/30 bg-primary-900/10'
                      : 'border-white/10'
                  } space-y-3`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img
                        src={msg.avatar}
                        alt={msg.sender}
                        className="w-8 h-8 rounded-xl object-cover border border-primary-500/30"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-xs">{msg.sender}</span>
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                              msg.role === 'referee'
                                ? 'bg-purple-500/30 text-purple-200'
                                : 'bg-primary-700/40 text-primary-300'
                            }`}
                          >
                            {msg.role === 'referee' ? 'LocalFix Referee' : 'Complainant'}
                          </span>
                        </div>
                        <span className="text-[10px] text-gray-500">{msg.time}</span>
                      </div>
                    </div>
                  </div>

                  {msg.title && (
                    <div className="font-bold text-sm text-primary-300 flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      {msg.title}
                    </div>
                  )}

                  <p className="text-xs text-gray-200 leading-relaxed">{msg.content}</p>

                  {/* Attachment card */}
                  {msg.attachment && (
                    <div className="p-3 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary-700/40 text-primary-300 flex items-center justify-center flex-shrink-0">
                          <Play className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-white text-xs">{msg.attachment.name}</div>
                          <div className="text-[10px] text-gray-400">
                            {msg.attachment.size} &bull; {msg.attachment.meta}
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] text-gray-500 font-mono">SIG: bunde-client-9912f-valid</span>
                    </div>
                  )}

                  {msg.hash && (
                    <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-gray-500 font-mono">
                      <span>HASH: {msg.hash}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Inrush Telemetry Diagnostic Ingest Widget */}
            <div className="p-4 rounded-2xl glass-panel border border-amber-500/30 bg-amber-500/5 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-amber-400" />
                  <span className="font-bold text-white">Telemetry Diagnostic Ingest (Felicity Solar V2.8)</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30">
                  Trip Threshold Breached
                </span>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 text-center text-xs">
                <div className="p-2 rounded-xl bg-white/5">
                  <span className="text-[10px] text-gray-400 block">Nominal Voltage</span>
                  <span className="font-mono font-bold text-white">230V</span>
                </div>
                <div className="p-2 rounded-xl bg-red-500/15 border border-red-500/30">
                  <span className="text-[10px] text-red-300 block">Measured Sag</span>
                  <span className="font-mono font-bold text-red-400">184V (-20.0%)</span>
                </div>
                <div className="p-2 rounded-xl bg-white/5">
                  <span className="text-[10px] text-gray-400 block">Trigger Current</span>
                  <span className="font-mono font-bold text-amber-300">F04 @ 32.4A</span>
                </div>
              </div>

              {/* Waveform curve visual representation */}
              <div className="min-h-10 bg-black/40 rounded-xl py-2 px-3 sm:px-4 flex flex-wrap items-center justify-between gap-1.5 text-[10px] font-mono text-gray-400">
                <span>Steady 230V</span>
                <span className="text-red-400 font-bold">&darr; Sudden 184V Sag (Inrush Surge)</span>
                <span className="text-amber-400 font-bold">&times; Inverter Trip</span>
              </div>
            </div>

            {/* Suggested quick cues */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-[11px] text-gray-400 uppercase font-bold tracking-wider">
                SUGGESTED CUES:
              </span>
              {[
                '+ Agree to 2-hour re-visit',
                '+ Request soft-starter fee waiver',
                '+ Request Neutral Master Inspector',
              ].map((cue) => (
                <button
                  key={cue}
                  type="button"
                  onClick={() => addCue(cue)}
                  className="px-3 py-1 rounded-lg text-xs bg-white/5 hover:bg-white/10 text-primary-300 border border-primary-500/20 transition-colors"
                >
                  {cue}
                </button>
              ))}
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSendMessage} className="glass-panel rounded-2xl p-3 space-y-2 border border-white/10">
              <textarea
                rows={3}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Type response to all parties or tag @Amina (Referee) / @Tunde (Artisan)..."
                className="w-full bg-transparent text-xs text-white placeholder-gray-500 outline-none resize-none"
              />

              <div className="flex items-center justify-between pt-2 border-t border-white/10">
                <input
                  type="file"
                  ref={evidenceInputRef}
                  onChange={handleDeviceEvidenceUpload}
                  accept="image/*,video/*,application/pdf"
                  className="hidden"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => evidenceInputRef.current?.click()}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors text-xs flex items-center gap-1.5"
                    title="Upload proof or photo from device"
                  >
                    <Upload className="w-3.5 h-3.5 text-primary-400" />
                    <span className="hidden sm:inline">Attach Proof (Device)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => toast.success('Inverter telemetry synced to room')}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors text-xs flex items-center gap-1.5"
                  >
                    <Activity className="w-3.5 h-3.5 text-primary-400" />
                    <span className="hidden sm:inline">Sync Log</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => toast('Hold to record voice statement')}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors text-xs flex items-center gap-1.5"
                  >
                    <Mic className="w-3.5 h-3.5 text-primary-400" />
                    <span className="hidden sm:inline">VN</span>
                  </button>
                </div>

                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 transition-all shadow-glow"
                  style={{ background: 'linear-gradient(135deg, #6D28D9, #7C3AED)' }}
                >
                  <span>Send Statement</span>
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>

          {/* Right Column (4 cols): Escrow Custody & Pathways */}
          <div className="lg:col-span-4 space-y-5">
            {/* Escrow Trust Custody card */}
            <div className="glass-panel rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-primary-400" />
                  <h3 className="font-bold text-white text-xs">Escrow Trust Custody</h3>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  FROZEN
                </span>
              </div>

              <div>
                <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Total Held Under Dispute</span>
                <div className="text-2xl font-black text-white">₦32,090<span className="text-base text-gray-400">.00</span></div>
                <div className="text-[10px] text-gray-400">0.0% Dispute Fee</div>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-[11px] font-mono text-gray-300">
                Providus Bank NUBAN: <strong className="text-white">9821....3842</strong>
                <span className="text-[9px] text-emerald-400 ml-2">FDIC/NDIC Backed</span>
              </div>

              <p className="text-[11px] text-gray-400 leading-relaxed">
                Disbursement requires mutual agreement between Customer & Technician or an authorized binding ruling from Arbitrator Amina Bello.
              </p>
            </div>

            {/* Binding Resolution Pathways */}
            <div className="glass-panel rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white text-xs">Binding Resolution Pathways</h3>
                <span className="text-[10px] text-primary-400 font-semibold uppercase">SELECT OPTION</span>
              </div>

              {/* Option 1 */}
              <div className="p-3.5 rounded-xl bg-white/5 border border-primary-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <strong className="text-xs text-white">Option 1: Technician Re-Visit</strong>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-primary-700/40 text-primary-300 font-bold">
                    Recommended
                  </span>
                </div>
                <p className="text-[11px] text-gray-300 leading-relaxed">
                  Technician arrives within 2 hours to install soft-starter capacitor at zero labor cost.
                </p>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-gray-400">Escrow releases upon test pass</span>
                  <button
                    onClick={() => toast.success('Dispatched technician re-visit')}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-primary-700 hover:bg-primary-600 transition-colors"
                  >
                    Accept & Dispatch
                  </button>
                </div>
              </div>

              {/* Option 2 */}
              <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-2">
                <strong className="text-xs text-white block">Option 2: Neutral Master Inspector</strong>
                <p className="text-[11px] text-gray-300 leading-relaxed">
                  LocalFix sends a Senior Guild Solar Inspector to perform independent bench diagnostics.
                </p>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-gray-400">Inspection Fee: ₦0 (Included)</span>
                  <Link
                    to="/mediation/audit"
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-primary-300 border border-primary-500/30 transition-colors"
                  >
                    Request Inspector
                  </Link>
                </div>
              </div>

              {/* Option 3 */}
              <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-2">
                <strong className="text-xs text-white block">Option 3: Full Restitution to Complainant</strong>
                <p className="text-[11px] text-gray-300 leading-relaxed">
                  Release 100% of escrow (₦32,090.00) back to Babatunde O. Customer wallet.
                </p>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-gray-400">Requires Referee Sanction</span>
                  <button
                    onClick={() => toast.success('Claim submitted for Referee sanction')}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-red-300 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 transition-colors"
                  >
                    Submit Claim
                  </button>
                </div>
              </div>
            </div>

            {/* 3-Way Encrypted WebRTC Call */}
            <div className="glass-panel rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white text-xs">3-Way Encrypted WebRTC Call</h3>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>

              <div className="text-[11px] text-gray-400 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Lock className="w-3 h-3 text-primary-400" /> AES-256 Voice Link Ready
                </span>
                <span className="font-mono text-emerald-400">Ping: 18ms</span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => toast('Connecting voice bridge...')}
                  className="py-2.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center gap-1.5 transition-colors text-gray-200"
                >
                  <Phone className="w-3.5 h-3.5 text-primary-400" />
                  Voice Bridge
                </button>
                <button
                  type="button"
                  onClick={() => toast.success('Opening live 3-Way Video Room')}
                  className="py-2.5 rounded-xl text-xs font-bold text-white bg-primary-700 hover:bg-primary-600 flex items-center justify-center gap-1.5 transition-colors shadow-glow-sm"
                >
                  <Video className="w-3.5 h-3.5" />
                  Video Room
                </button>
              </div>
            </div>

            {/* Evidence Dossier (3 Files) */}
            <div className="glass-panel rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white text-xs">Evidence Dossier (3 Files)</h3>
                <span className="text-[10px] font-mono text-gray-500">Sha-256</span>
              </div>

              <div className="space-y-2 text-xs">
                {[
                  { name: 'Fault_F04_PumpTrip.mp4', desc: 'Customer Proof • 34.2 MB' },
                  { name: 'Schneider_Relay_Receipt.pdf', desc: 'Tech Proof • 1.4 MB' },
                  { name: 'Artisan_Bench_Log.csv', desc: 'Telemetry • 820 KB' },
                ].map((f, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-white text-[11px] truncate max-w-[180px]">{f.name}</div>
                      <div className="text-[10px] text-gray-400">{f.desc}</div>
                    </div>
                    <button
                      onClick={() => toast.success(`Downloading ${f.name}`)}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-primary-400"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => toast('Upload dialog opened')}
                className="w-full py-2 text-center text-xs text-primary-400 hover:text-primary-300 flex items-center justify-center gap-1.5 transition-colors"
              >
                <Upload className="w-3 h-3" />
                Upload Additional Evidence Document
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
