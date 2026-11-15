import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mail,
  Phone,
  MapPin,
  MessageSquare,
  ShieldCheck,
  Clock,
  Send,
  Building,
  CheckCircle,
  HelpCircle,
  ChevronDown,
  Paperclip,
  ExternalLink,
  Sparkles,
  ArrowRight,
  Headphones,
  FileText,
  AlertTriangle,
  X,
} from 'lucide-react'
import { authApi, uploadApi } from '@/lib/api'
import { useChatStore } from '@/stores/useChatStore'
import toast from 'react-hot-toast'

interface FaqItem {
  q: string
  a: string
}

const FAQS: FaqItem[] = [
  {
    q: 'How does LocalFix multi-sig escrow protect my funds?',
    a: 'When you fund a work order, your deposit is held in a secure CBN-regulated Providus trust vault. Funds are never disbursed to the artisan until you physically inspect the completed work and provide your 4-digit milestone signoff OTP.',
  },
  {
    q: 'What should I do if an artisan is late or does not show up?',
    a: 'You can ping the technician directly via in-app chat or view their live GPS radar location. If the artisan is unreachable after 30 minutes, you can 1-click cancel the work order from your Escrow Wallet and receive an immediate 100% refund of your vault deposit.',
  },
  {
    q: 'How does dispute arbitration and restitution work?',
    a: 'If work quality does not meet technical specifications, click "Open Dispute" on your booking or wallet. An independent certified technical arbitrator joins within 15 minutes to inspect evidence, diagnostic logs, and video recordings, ordering restitution or remedial repairs.',
  },
  {
    q: 'How are artisans vetted on LocalFix?',
    a: 'Every artisan on LocalFix undergoes National Identification Number (NIN) biometrics verification, on-site trade competency assessment, workshop address verification, and background checks before they can accept escrow-backed bookings.',
  },
  {
    q: 'Can I contact support during night emergencies?',
    a: 'Yes! Our emergency dispatch desk operates 24/7/365 across Lagos, Abuja, Port Harcourt, and major hubs for burst pipes, power failures, security gates, and urgent equipment breakdowns.',
  },
]

export default function ContactPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [department, setDepartment] = useState('general')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null)
  const [attachmentName, setAttachmentName] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submittedTicket, setSubmittedTicket] = useState<{ number: string; created_at: string } | null>(null)
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    const t = toast.loading(`Uploading "${file.name}"...`)
    try {
      const res = await uploadApi.uploadFile(file)
      const url = res.full_url || res.url
      setAttachmentUrl(url)
      setAttachmentName(file.name)
      toast.dismiss(t)
      toast.success('Document attached to inquiry!', { icon: '📎' })
    } catch {
      toast.dismiss(t)
      toast.error('File upload failed. Please try a smaller file.')
    } finally {
      setIsUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !email.trim() || !message.trim()) {
      toast.error('Please fill in your name, email, and message.')
      return
    }

    setIsSubmitting(true)
    const t = toast.loading('Dispatching your support inquiry...')

    try {
      const res = await authApi.submitContactInquiry({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        department,
        subject: subject.trim() || 'General Support Inquiry',
        message: message.trim(),
        attachment_url: attachmentUrl || undefined,
      })

      toast.dismiss(t)
      toast.success('Ticket submitted successfully! Support notified.', { duration: 4000, icon: '🎫' })
      setSubmittedTicket({
        number: res.ticket_number || `LF-TICK-${Math.floor(100000 + Math.random() * 900000)}`,
        created_at: new Date().toISOString(),
      })
    } catch (err: any) {
      toast.dismiss(t)
      const errMsg = err.response?.data?.error || err.message || 'Submission failed. Please try again.'
      toast.error(errMsg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenLiveChat = () => {
    const chatStore = useChatStore.getState()
    chatStore.openChat(
      {
        id: 'support-agent-1',
        name: 'LocalFix Support & Escrow Desk',
        role: 'Senior Conciliation Specialist',
        online: true,
      },
      undefined
    )
    toast('Live support chat opened in dock!', { icon: '💬' })
  }

  return (
    <div className="min-h-screen bg-dark-bg text-white pb-24 selection:bg-primary-500 selection:text-white">
      {/* ── AMBIENT BACKGROUND GLOW ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="absolute -top-40 left-1/3 w-[600px] h-[500px] bg-primary-600/12 rounded-full blur-[140px]" />
        <div className="absolute top-[45%] right-[-100px] w-[500px] h-[400px] bg-emerald-600/10 rounded-full blur-[140px]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-14 space-y-16">
        {/* ======================================================== */}
        {/* HERO SECTION                                             */}
        {/* ======================================================== */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary-950/80 border border-primary-500/40 text-primary-300 text-xs font-semibold shadow-glow-sm">
            <Headphones className="w-3.5 h-3.5 text-primary-400" />
            <span>24/7 Customer Care & Rapid Conciliation Desk</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight">
            How Can We Assist You Today?
          </h1>

          <p className="text-base sm:text-lg text-gray-300 leading-relaxed">
            Have questions about escrow custody, need emergency trade dispatch, or want to escalate an artisan milestone? Our neutral arbitration and technical support teams are ready 24/7.
          </p>
        </div>

        {/* ======================================================== */}
        {/* 4 FAST CONTACT CHANNELS (INTERACTIVE CARDS)              */}
        {/* ======================================================== */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Live Chat */}
          <div
            onClick={handleOpenLiveChat}
            className="p-6 rounded-3xl glass-panel border border-white/10 space-y-3 cursor-pointer hover:border-primary-500/50 hover:bg-white/10 transition-all group"
          >
            <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-bold text-blue-300 uppercase tracking-wider">Fastest Channel</div>
              <h3 className="text-base font-bold text-white mt-0.5">Live Messenger Chat</h3>
              <p className="text-xs text-gray-400 mt-1">
                Chat with an active support agent in our dock. Average wait: <span className="text-emerald-400 font-bold">&lt; 2 mins</span>.
              </p>
            </div>
            <div className="text-xs font-bold text-primary-400 group-hover:text-primary-300 flex items-center gap-1 pt-1">
              <span>Open Chat Dock</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Card 2: WhatsApp Hotline */}
          <a
            href="https://wa.me/2348023456789?text=Hello%20LocalFix%20Support,%20I%20need%20assistance%20with%20my%20account/booking."
            target="_blank"
            rel="noopener noreferrer"
            className="p-6 rounded-3xl glass-panel border border-white/10 space-y-3 hover:border-emerald-500/50 hover:bg-white/10 transition-all group block"
          >
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Phone className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-bold text-emerald-300 uppercase tracking-wider">WhatsApp Direct</div>
              <h3 className="text-base font-bold text-white mt-0.5">WhatsApp Hotline</h3>
              <p className="text-xs text-gray-400 mt-1">
                Send voice notes, photos of error codes, or invoice attachments directly to dispatch.
              </p>
            </div>
            <div className="text-xs font-bold text-emerald-400 group-hover:text-emerald-300 flex items-center gap-1 pt-1">
              <span>Chat on WhatsApp</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </div>
          </a>

          {/* Card 3: 24/7 Phone Lines */}
          <div className="p-6 rounded-3xl glass-panel border border-white/10 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-300 flex items-center justify-center">
              <Clock className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <div className="text-xs font-bold text-purple-300 uppercase tracking-wider">Voice Calls</div>
              <h3 className="text-base font-bold text-white mt-0.5">Telephone Dispatch</h3>
              <p className="text-xs text-gray-400 mt-1">
                Lagos: <a href="tel:+23418885622" className="text-white hover:underline">+234 1 888 5622</a><br />
                Toll-Free: <a href="tel:08005622534" className="text-white hover:underline">0800-LOCALFIX</a>
              </p>
            </div>
            <div className="text-[11px] text-gray-400 pt-1">
              Mon–Sun &bull; 24 Hours Emergency
            </div>
          </div>

          {/* Card 4: Email Department */}
          <div className="p-6 rounded-3xl glass-panel border border-white/10 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-bold text-amber-300 uppercase tracking-wider">Direct Email</div>
              <h3 className="text-base font-bold text-white mt-0.5">Official Mailboxes</h3>
              <p className="text-xs text-gray-400 mt-1">
                Support: <span className="text-white">support@localfix.ng</span><br />
                Escrow: <span className="text-white">escrow@localfix.ng</span>
              </p>
            </div>
            <div className="text-[11px] text-gray-400 pt-1">
              Response within 15 minutes
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* MAIN FORM + OFFICE LOCATION SECTION                      */}
        {/* ======================================================== */}
        <div className="grid lg:grid-cols-12 gap-8 items-start">
          {/* Left Form (7 cols) */}
          <div className="lg:col-span-7 rounded-3xl glass-panel border border-white/10 p-6 sm:p-8 space-y-6">
            <div>
              <h2 className="text-2xl font-black text-white">Send Us a Direct Message</h2>
              <p className="text-xs text-gray-400 mt-1">
                Fill in the details below. A dedicated support specialist will review your request and reply via email or phone.
              </p>
            </div>

            {submittedTicket ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-6 rounded-2xl bg-emerald-950/60 border border-emerald-500/30 text-center space-y-4"
              >
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-glow">
                  <CheckCircle className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">Inquiry Received & Ticket Logged!</h3>
                  <p className="text-xs text-gray-300 mt-1 max-w-md mx-auto">
                    Your request has been prioritized and routed to our technical support team.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 inline-block font-mono text-sm text-emerald-300 font-bold">
                  Reference Ticket: {submittedTicket.number}
                </div>

                <p className="text-[11px] text-gray-400">
                  A confirmation email has been dispatched to <strong className="text-white">{email}</strong>. Average response turnaround is under 15 minutes.
                </p>

                <div className="flex justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSubmittedTicket(null)
                      setMessage('')
                      setSubject('')
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-white"
                  >
                    Submit Another Inquiry
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenLiveChat}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white shadow-glow"
                    style={{ background: 'linear-gradient(135deg, #6D28D9, #7C3AED)' }}
                  >
                    Open Live Chat Now →
                  </button>
                </div>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-300 mb-1">Your Full Name *</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Babatunde Oladipo"
                      required
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 outline-none focus:border-primary-400 text-xs transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-300 mb-1">Email Address *</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      required
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 outline-none focus:border-primary-400 text-xs transition-colors"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-300 mb-1">Phone Number (with WhatsApp)</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+234 802 345 6789"
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 outline-none focus:border-primary-400 text-xs transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-300 mb-1">Inquiry Department *</label>
                    <select
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-[#171226] border border-white/10 text-white outline-none focus:border-primary-400 text-xs transition-colors"
                    >
                      <option value="general">General Support & Guidance</option>
                      <option value="escrow">Escrow Custody & Fund Release</option>
                      <option value="dispute">Dispute Escalation & Forensic Arbitration</option>
                      <option value="artisan">Artisan NIN Onboarding & Vetting</option>
                      <option value="partnership">Estate & Corporate Partnerships</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">Subject / Work Order Ref</label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Work Order #LF-8841 Inverter Signoff Inquiry"
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 outline-none focus:border-primary-400 text-xs transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">Message Details *</label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4}
                    placeholder="Describe your issue or inquiry with specific details..."
                    required
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 outline-none focus:border-primary-400 text-xs transition-colors resize-none"
                  />
                </div>

                {/* Optional Document Attachment */}
                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">Attach Invoice, Photo or Document (Optional)</label>
                  {attachmentUrl ? (
                    <div className="p-3 rounded-xl bg-white/5 border border-white/15 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 truncate">
                        <FileText className="w-4 h-4 text-primary-400 flex-shrink-0" />
                        <span className="text-gray-200 truncate">{attachmentName || 'Attachment file'}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setAttachmentUrl(null)
                          setAttachmentName(null)
                        }}
                        className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-white/20 hover:border-primary-400/50 bg-white/5 hover:bg-white/10 transition-colors cursor-pointer text-xs text-gray-300">
                      <Paperclip className="w-4 h-4 text-primary-400" />
                      <span>{isUploading ? 'Uploading file...' : 'Click to attach photo or PDF document'}</span>
                      <input
                        type="file"
                        onChange={handleFileUpload}
                        className="hidden"
                        accept="image/*,.pdf,.doc,.docx"
                        disabled={isUploading}
                      />
                    </label>
                  )}
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 rounded-xl text-xs font-bold text-white shadow-glow flex items-center justify-center gap-2 transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
                    style={{ background: 'linear-gradient(135deg, #6D28D9 0%, #7C3AED 100%)' }}
                  >
                    {isSubmitting ? (
                      <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Submit Support Ticket</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Right Column (5 cols): Physical Office Locations & Emergency Desk */}
          <div className="lg:col-span-5 space-y-6">
            {/* Physical Campuses */}
            <div className="rounded-3xl glass-panel border border-white/10 p-6 sm:p-7 space-y-5">
              <div className="flex items-center gap-2">
                <Building className="w-5 h-5 text-primary-400" />
                <h3 className="text-base font-bold text-white">Corporate & Regional Hubs</h3>
              </div>

              {/* Lagos Office */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white">Lagos Headquarters</h4>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-primary-700/30 text-primary-300 font-semibold">Main Campus</span>
                </div>
                <p className="text-xs text-gray-300 flex items-start gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-primary-400 flex-shrink-0 mt-0.5" />
                  <span>14 Isaac John Street, GRA Ikeja, Lagos State, Nigeria</span>
                </p>
                <div className="text-[11px] text-gray-400 pt-1">
                  Walk-In Hours: Mon–Sat 8:00 AM – 6:00 PM
                </div>
              </div>

              {/* Abuja Office */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white">Abuja Federal Liaison</h4>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold">Arbitration</span>
                </div>
                <p className="text-xs text-gray-300 flex items-start gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span>8 Aguiyi Ironsi Street, Maitama, Abuja (FCT), Nigeria</span>
                </p>
                <div className="text-[11px] text-gray-400 pt-1">
                  Conciliation & Legal Arbitration Chamber
                </div>
              </div>

              {/* Global Reach */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-xs text-gray-300 space-y-1">
                <div className="font-bold text-white">International Support Desks</div>
                <div className="text-gray-400 text-[11px]">
                  London (UK), New York (US), Dubai (UAE), Toronto (Canada) for diaspora property owners managing projects in Nigeria.
                </div>
              </div>
            </div>

            {/* Escrow Guarantee Highlight */}
            <div className="rounded-3xl p-6 bg-gradient-to-r from-emerald-950/60 to-primary-950/60 border border-emerald-500/30 space-y-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h4 className="text-sm font-bold text-white">Providus Trust Vault Guarantee</h4>
              </div>
              <p className="text-xs text-gray-300 leading-relaxed">
                All platform payments are protected under Central Bank of Nigeria (CBN) regulatory framework. Funds can only be released upon mutual biometric or OTP authorization.
              </p>
              <div className="pt-1">
                <Link
                  to="/app"
                  className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                >
                  <span>Download LocalFix Mobile App →</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* INTERACTIVE FREQUENTLY ASKED QUESTIONS                   */}
        {/* ======================================================== */}
        <div className="space-y-6 pt-4">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-white">Frequently Asked Questions</h2>
            <p className="text-xs sm:text-sm text-gray-400">
              Quick answers about payment protection, dispute timelines, and technician dispatch.
            </p>
          </div>

          <div className="max-w-3xl mx-auto space-y-3">
            {FAQS.map((faq, index) => {
              const isOpen = expandedFaq === index
              return (
                <div
                  key={index}
                  className="rounded-2xl glass-panel border border-white/10 overflow-hidden transition-all"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedFaq(isOpen ? null : index)}
                    className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-white/5 transition-colors"
                  >
                    <span className="text-sm font-bold text-white flex items-center gap-2">
                      <HelpCircle className="w-4 h-4 text-primary-400 flex-shrink-0" />
                      <span>{faq.q}</span>
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180 text-primary-400' : ''}`}
                    />
                  </button>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-5 pt-1 text-xs text-gray-300 leading-relaxed border-t border-white/5">
                          {faq.a}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
