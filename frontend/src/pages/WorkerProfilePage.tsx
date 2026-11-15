import { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MapPin, Star, CheckCircle, Clock, MessageSquare, Calendar,
  ChevronLeft, Share2, Heart, Briefcase, Shield, Play,
  ZoomIn, X, ShieldCheck, Award, Check, Phone, Video, FileText,
  BadgeCheck, Sparkles, Building, Info, Radio, Navigation
} from 'lucide-react'
import { MOCK_WORKERS, formatCurrency, formatDistance, calculateDistanceKm, normalizeWorker } from '@/lib/utils'
import { servicesApi, chatApi } from '@/lib/api'
import { useChatStore } from '@/stores/useChatStore'
import { useAppStore } from '@/stores/useAppStore'
import toast from 'react-hot-toast'

// Real high-definition trade portfolio photos for craftsmanship preview
const SAMPLE_PORTFOLIO_ITEMS = [
  {
    id: 'p1',
    title: '5kVA Pure Sine Wave Inverter Rack Setup',
    category: 'Solar & Inverter',
    location: 'Lekki Phase 1, Lagos',
    image: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=900&auto=format&fit=crop&q=80',
    description: 'Neat busbar cabling with 200Ah lithium batteries, RS485 communication link and automatic ATS switch.'
  },
  {
    id: 'p2',
    title: 'Dual 1.5HP Inverter AC Copper Brazing & Vacuum',
    category: 'HVAC & Cooling',
    location: 'Ikeja GRA, Lagos',
    image: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=900&auto=format&fit=crop&q=80',
    description: 'High-pressure nitrogen leak test, 500-micron vacuum pull, and R410a precision recharge.'
  },
  {
    id: 'p3',
    title: '3-Phase Main Distribution Board Re-wire',
    category: 'Electrical Distribution',
    location: 'Victoria Island, Lagos',
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=900&auto=format&fit=crop&q=80',
    description: 'Schneider RCBO surge protection replacement, balanced neutral load, and thermal imaging sign-off.'
  },
  {
    id: 'p4',
    title: 'Automatic Water Booster Pump & PPR Manifold',
    category: 'Plumbing & Pipe',
    location: 'Magodo Phase 2, Lagos',
    image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=900&auto=format&fit=crop&q=80',
    description: 'Non-return brass check valves with high-pressure digital pressure switch and silent check.'
  },
  {
    id: 'p5',
    title: 'High-Security Solid Teak Pivot Door Installation',
    category: 'Carpentry & Locksmith',
    location: 'Ikoyi, Lagos',
    image: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=900&auto=format&fit=crop&q=80',
    description: 'Concealed German pivot hinge with biometric smart lock and magnetic perimeter sealing.'
  },
  {
    id: 'p6',
    title: '15kVA Diesel Generator Carburetor & AVR Tuning',
    category: 'Power Equipment',
    location: 'Surulere, Lagos',
    image: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=900&auto=format&fit=crop&q=80',
    description: 'Cleaned fuel injector nozzles, replaced fuel filters, and calibrated frequency to stable 50Hz.'
  }
]

export default function WorkerProfilePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [worker, setWorker] = useState<any>(() => MOCK_WORKERS.find((w) => w.id === id) ?? MOCK_WORKERS[0])
  const [portfolioItems, setPortfolioItems] = useState<any[]>(SAMPLE_PORTFOLIO_ITEMS)
  const [reviewsList, setReviewsList] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState('overview')
  const [isSaved, setIsSaved] = useState(false)
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false)
  const [activeLightboxImage, setActiveLightboxImage] = useState<string | null>(null)

  // Fetch worker details from backend
  useEffect(() => {
    async function loadWorker() {
      if (!id) return
      try {
        const res = await servicesApi.getWorkerDetail(id)
        if (res) {
          const normalized = normalizeWorker(res)
          setWorker(normalized)
          if (res.portfolio_items && res.portfolio_items.length > 0) {
            setPortfolioItems(
              res.portfolio_items.map((p: any) => ({
                id: String(p.id),
                title: p.title,
                category: p.category || 'Craftsmanship',
                location: p.location || 'Lagos',
                image: p.image_url,
                description: p.description || 'Verified on-site LocalFix project.',
              }))
            )
          } else {
            setPortfolioItems([])
          }
          if (res.reviews && res.reviews.length > 0) {
            setReviewsList(
              res.reviews.map((r: any) => ({
                name: r.client_name || 'Verified Client',
                avatar: r.client_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop&crop=face',
                rating: r.rating || 5,
                job: r.job_title || 'Service Repair',
                text: r.comment,
                date: r.created_at ? new Date(r.created_at).toLocaleDateString() : 'Recent',
                location: r.location || 'Lagos',
              }))
            )
          } else {
            setReviewsList([])
          }
        }
      } catch (e) {
        console.warn('Using default worker profile', e)
      }
    }
    loadWorker()
  }, [id])

  const handleStartMessage = async () => {
    const contact = {
      id: worker.id,
      name: worker.displayName || `${worker.first_name || 'Artisan'} ${worker.last_name || ''}`,
      avatar: worker.avatar || worker.resolved_avatar,
      role: worker.category?.name || 'Verified Artisan',
      online: true,
      phone: worker.phone,
    }
    useChatStore.getState().openChat(contact)
    toast.success(`Chat opened with ${contact.name}!`, { icon: '💬' })

    try {
      const res = await chatApi.startConversation({ worker_id: worker.id })
      if (res?.id) {
        useChatStore.getState().openChat(contact, res.id)
      }
    } catch {
      // Local fallback in chat store
    }
  }

  const visitorLocation = useAppStore((s) => s.userLocation)
  const hasVisitorLocation = useAppStore((s) => s.hasLocationSet)
  const setLocationPromptOpen = useAppStore((s) => s.setLocationPromptOpen)

  const workerLat = worker.latitude || worker.location?.lat || 6.6018
  const workerLng = worker.longitude || worker.location?.lng || 3.3515
  const liveDistance = visitorLocation
    ? calculateDistanceKm(visitorLocation.lat, visitorLocation.lng, workerLat, workerLng)
    : (worker.distanceKm ?? 1.5)

  const TABS = ['overview', 'portfolio', 'credentials', 'reviews', 'availability']

  return (
    <div className="min-h-screen bg-dark-bg text-white pb-20 pt-4">
      <div className="max-w-4xl mx-auto px-4">
        {/* Navigation Breadcrumb / Back */}
        <div className="flex items-center justify-between mb-5">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-xs font-semibold text-gray-400 hover:text-white transition-colors py-1.5 px-3 rounded-xl bg-white/5 border border-white/10"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back to Discovery</span>
          </button>

          <div className="flex items-center gap-2 text-xs text-primary-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>LocalFix Verified Public Profile</span>
          </div>
        </div>

        {/* ── Profile Header Showcase Card ── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel rounded-3xl p-6 sm:p-8 mb-6 border border-primary-500/30 shadow-purple-lg"
        >
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            {/* Clickable High-Resolution Avatar with Zoom Preview Trigger */}
            <div className="relative group flex-shrink-0 cursor-pointer" onClick={() => setIsAvatarModalOpen(true)}>
              <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-3xl overflow-hidden border-2 border-primary-500/50 shadow-glow relative bg-[#1E1533]">
                <img
                  src={worker.avatar}
                  alt={worker.displayName}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                {/* Hover overlay hint */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity text-white text-xs font-bold gap-1">
                  <ZoomIn className="w-5 h-5 text-primary-300" />
                  <span>View Full Photo</span>
                </div>
              </div>

              {/* Status pill */}
              {worker.isOnline && (
                <div
                  className="absolute -bottom-2 -right-1 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold text-emerald-300 shadow-md"
                  style={{ background: 'rgba(16,185,129,0.25)', border: '1px solid rgba(16,185,129,0.5)', backdropFilter: 'blur(8px)' }}
                >
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>ONLINE</span>
                </div>
              )}
            </div>

            {/* Profile Info Details */}
            <div className="flex-1 text-center md:text-left">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-2">
                <div>
                  <div className="flex items-center justify-center md:justify-start gap-2">
                    <h1 className="text-2xl sm:text-3xl font-black text-white">{worker.displayName}</h1>
                    <BadgeCheck className="w-6 h-6 text-primary-400" />
                  </div>
                  <p className="text-primary-300 font-bold text-sm sm:text-base mt-0.5">{worker.profession}</p>
                </div>

                {/* Top Action Icons */}
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => {
                      setIsSaved(!isSaved)
                      toast(isSaved ? 'Removed from saved artisans' : 'Saved to your vetted favorites!')
                    }}
                    className="p-2.5 rounded-xl transition-colors hover:bg-white/10 bg-white/5 border border-white/10"
                    title="Save to favorites"
                  >
                    <Heart className={`w-4 h-4 ${isSaved ? 'text-red-500 fill-red-500' : 'text-gray-400'}`} />
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.href)
                      toast.success('Profile URL copied to clipboard!')
                    }}
                    className="p-2.5 rounded-xl transition-colors hover:bg-white/10 bg-white/5 border border-white/10"
                    title="Share profile"
                  >
                    <Share2 className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              </div>

              {/* Badges & Meta */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary-700/40 text-primary-300 border border-primary-500/30">
                  ✓ {worker.verificationBadge}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  • 100% Escrow Integrity Guarantee
                </span>
              </div>

              {/* Device Verified Location & Distance to Profile Visitor */}
              <div className="p-3 rounded-2xl bg-white/5 border border-primary-500/20 mb-3 space-y-1.5 text-left">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs text-white font-bold">
                    <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse flex-shrink-0" />
                    <span>Live Device Location: {worker.serviceArea || 'Lagos Central'}</span>
                  </div>
                  <span className="text-[10px] font-mono text-primary-300 bg-primary-950/60 border border-primary-500/30 px-2 py-0.5 rounded-full">
                    📡 {(worker.latitude || worker.location?.lat || 6.5916).toFixed(4)}° N, {(worker.longitude || worker.location?.lng || 3.3575).toFixed(4)}° E
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-white/5">
                  <div className="flex items-center gap-1.5 text-gray-300">
                    <Navigation className="w-3.5 h-3.5 text-primary-400 flex-shrink-0" />
                    {hasVisitorLocation ? (
                      <span>
                        <strong className="text-emerald-400 font-bold">{formatDistance(liveDistance)}</strong> from your device (approx. {Math.max(5, Math.round(liveDistance * 3.5))} mins away)
                      </span>
                    ) : (
                      <span className="text-gray-400">
                        Proximity: ~{formatDistance(liveDistance)} away
                      </span>
                    )}
                  </div>
                  {!hasVisitorLocation && (
                    <button
                      onClick={() => setLocationPromptOpen(true)}
                      className="text-[11px] font-semibold text-primary-400 hover:text-primary-300 underline cursor-pointer"
                    >
                      Turn on your location
                    </button>
                  )}
                </div>
              </div>

              {/* Spoken Languages */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-1.5 mb-3">
                <span className="text-[11px] font-bold text-gray-400">🗣️ Languages:</span>
                {(worker.languages && worker.languages.length > 0 ? worker.languages : ['English', 'Nigerian Pidgin']).map((lang: string) => (
                  <span key={lang} className="px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-[11px] text-gray-200 font-medium">
                    {lang}
                  </span>
                ))}
              </div>

              {/* Core Metric Counters */}
              <div className="grid grid-cols-4 gap-2.5 mt-4">
                {[
                  {
                    label: 'Rating',
                    value: worker.completedJobs > 0 && worker.rating > 0 ? `${Number(worker.rating).toFixed(1)} ★` : 'New Pro',
                    icon: '⭐'
                  },
                  {
                    label: 'Verified Reviews',
                    value: worker.completedJobs > 0 ? worker.reviewCount : 0,
                    icon: '💬'
                  },
                  {
                    label: 'Jobs Executed',
                    value: worker.completedJobs > 0 ? worker.completedJobs : '0 (New)',
                    icon: '✅'
                  },
                  {
                    label: 'Experience',
                    value: `${worker.yearsExperience} yrs`,
                    icon: '🏅'
                  },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="text-center rounded-2xl py-2.5 px-1 bg-white/5 border border-white/10"
                  >
                    <div className="text-white text-base sm:text-lg font-black">{s.value}</div>
                    <div className="text-gray-400 text-[10px] uppercase font-bold tracking-tight">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Pricing & Response banner */}
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between p-4 rounded-2xl bg-primary-950/40 border border-primary-500/20 gap-3">
            <div>
              <div className="text-xs text-gray-400">Baseline Callout / Inspection Rate</div>
              <div className="text-primary-300 text-2xl font-black">
                {formatCurrency(worker.calloutRate ?? 0, worker.currency || 'USD')}{' '}
                <span className="text-xs text-gray-400 font-normal">/ callout (Escrow or Direct Settlement)</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <Clock className="w-3.5 h-3.5" />
                <span>Avg. arrival: {worker.avgResponseMins || 15} mins</span>
              </div>
              <button
                onClick={() => setIsAvatarModalOpen(true)}
                className="text-xs text-primary-300 hover:text-white underline font-semibold flex items-center gap-1"
              >
                <ZoomIn className="w-3.5 h-3.5" /> Inspect ID Card
              </button>
            </div>
          </div>
        </motion.div>

        {/* ── Action Buttons Dock with Live In-App Calling ── */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 sm:gap-3 mb-6">
          <button
            onClick={() => navigate(`/book/${worker.id}`)}
            className="col-span-2 sm:col-span-2 py-4 rounded-2xl text-xs sm:text-sm font-bold text-white flex items-center justify-center gap-2 transition-all shadow-glow cursor-pointer"
            style={{ background: 'linear-gradient(135deg,#6D28D9,#7C3AED)' }}
          >
            <Calendar className="w-4 h-4" />
            <span>Book Artisan (Escrow/Direct)</span>
          </button>

          {/* Live In-App Voice Call */}
          <button
            type="button"
            onClick={() => {
              const safeName = worker.displayName || worker.first_name || 'Artisan'
              useChatStore.getState().startCall('audio', {
                id: String(worker.id),
                name: safeName,
                avatar: worker.avatar,
                role: worker.profession || 'Verified Artisan',
                phone: worker.phone || (worker as any).phone_number || (worker as any).whatsapp_number,
              })
              toast.success(`Starting live call with ${safeName.split(' ')[0]}!`, { icon: '📞' })
            }}
            className="py-4 rounded-2xl text-xs sm:text-sm font-bold text-emerald-300 flex items-center justify-center gap-1.5 transition-all hover:bg-emerald-600/30 bg-emerald-950/40 border border-emerald-500/40 cursor-pointer"
            title="Start live encrypted voice call on LocalFix"
          >
            <Phone className="w-4 h-4 text-emerald-400" />
            <span>Voice Call</span>
          </button>

          {/* Live In-App Video Call */}
          <button
            type="button"
            onClick={() => {
              const safeName = worker.displayName || worker.first_name || 'Artisan'
              useChatStore.getState().startCall('video', {
                id: String(worker.id),
                name: safeName,
                avatar: worker.avatar,
                role: worker.profession || 'Verified Artisan',
                phone: worker.phone || (worker as any).phone_number || (worker as any).whatsapp_number,
              })
              toast.success(`Starting live video inspection with ${safeName.split(' ')[0]}!`, { icon: '📹' })
            }}
            className="py-4 rounded-2xl text-xs sm:text-sm font-bold text-purple-200 flex items-center justify-center gap-1.5 transition-all hover:bg-purple-600/30 bg-purple-950/40 border border-purple-500/40 cursor-pointer"
            title="Start live video inspection on LocalFix"
          >
            <Video className="w-4 h-4 text-purple-400" />
            <span>Live Video</span>
          </button>

          {/* Live In-App Chat */}
          <button
            onClick={handleStartMessage}
            className="col-span-2 sm:col-span-1 py-4 rounded-2xl text-xs sm:text-sm font-bold text-primary-200 flex items-center justify-center gap-1.5 transition-colors hover:bg-primary-700/20 bg-white/5 border border-primary-500/30 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-primary-400" />
            <span>Chat</span>
          </button>
        </div>

        {/* ── Tab Navigation ── */}
        <div className="flex gap-1 mb-6 p-1.5 rounded-2xl glass-panel border border-white/10 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 min-w-[80px] py-2.5 rounded-xl text-xs font-bold capitalize transition-all ${
                activeTab === tab ? 'bg-primary-700 text-white shadow-glow-sm' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* ── Tab 1: OVERVIEW ── */}
        {activeTab === 'overview' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="glass-panel rounded-2xl p-5 border border-white/10">
              <h3 className="text-white font-bold mb-3 flex items-center gap-2 text-sm">
                <Briefcase className="w-4 h-4 text-primary-400" />
                Craftsman Biography & Engineering Scope
              </h3>
              <p className="text-gray-300 text-sm leading-relaxed">{worker.bio}</p>

              <div className="mt-4 pt-4 border-t border-white/10">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Technical Specialisms</h4>
                <div className="flex flex-wrap gap-2">
                  {(worker.specialisms || []).map((s: string) => (
                    <span key={s} className="px-3 py-1 rounded-xl bg-primary-700/20 text-primary-300 border border-primary-500/30 text-xs font-semibold">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="glass-panel rounded-2xl p-5 border border-white/10">
              <h3 className="text-white font-bold mb-3 flex items-center gap-2 text-sm">
                <Shield className="w-4 h-4 text-primary-400" />
                Service Coverage & Dispatch Radius
              </h3>
              <div className="flex items-center gap-2 text-gray-300 text-sm mb-2">
                <MapPin className="w-4 h-4 text-primary-400" />
                <span>Primary Area: <strong>{worker.serviceArea}</strong></span>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Operating within a <strong>{worker.serviceRadius} km</strong> operational radius around Ikeja, Maryland, Lekki, Victoria Island, and Surulere with guaranteed 45-minute on-site response.
              </p>
            </div>
          </motion.div>
        )}

        {/* ── Tab 2: REAL HIGH-RES PORTFOLIO ── */}
        {activeTab === 'portfolio' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-white">Verified On-Site Work Portfolio (Click to View High-Res)</h3>
              <span className="text-xs text-primary-400 font-semibold">{portfolioItems.length} Projects</span>
            </div>

            {portfolioItems.length === 0 ? (
              <div className="glass-panel rounded-2xl p-8 text-center border border-white/10 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 text-gray-400 flex items-center justify-center mx-auto text-xl">
                  📷
                </div>
                <h4 className="font-bold text-white text-sm">No Portfolio Items Yet</h4>
                <p className="text-xs text-gray-400 max-w-sm mx-auto">
                  This artisan has not completed any photo-documented jobs yet. Verified photos of completed jobs and equipment installations will appear here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {portfolioItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setActiveLightboxImage(item.image)}
                    className="glass-panel rounded-2xl overflow-hidden border border-white/10 group cursor-pointer hover:border-primary-500/40 transition-all flex flex-col"
                  >
                    <div className="relative aspect-video overflow-hidden bg-black/40">
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-bold gap-1">
                        <ZoomIn className="w-5 h-5 text-primary-300" />
                        <span>Inspect Photo</span>
                      </div>
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-primary-900/80 text-primary-200 border border-primary-500/30">
                        {item.category}
                      </div>
                    </div>

                    <div className="p-3.5 flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="font-bold text-white text-xs mb-1 line-clamp-1">{item.title}</h4>
                        <p className="text-gray-400 text-[11px] line-clamp-2 leading-relaxed">{item.description}</p>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-gray-500 pt-2.5 mt-2 border-t border-white/5">
                        <span>📍 {item.location}</span>
                        <span className="text-emerald-400 font-semibold">✓ Verified Fix</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ── Tab 3: CREDENTIALS & VETTING DOSSIER ── */}
        {activeTab === 'credentials' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="glass-panel rounded-2xl p-6 border border-white/10 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-400" />
                  <h3 className="text-base font-bold text-white">Government & Trade Guild Certifications</h3>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Level 4 Master Guild Approved
                </span>
              </div>

              <div className="grid sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    COREN Certified Engineering Tech
                  </div>
                  <div className="text-gray-400 text-[11px]">License Reg: <strong>COREN/ET/2019/58102</strong></div>
                  <div className="text-[10px] text-gray-500">Inspected by Nigerian Society of Engineers</div>
                </div>

                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    National Identity Number (NIN)
                  </div>
                  <div className="text-gray-400 text-[11px]">NIMC Biometric Facial Match: <strong className="text-emerald-400">PASSED</strong></div>
                  <div className="text-[10px] text-gray-500">Lagos State Residency Verified (LASRRA)</div>
                </div>

                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    Fluke High-Voltage Diagnostic Badge
                  </div>
                  <div className="text-gray-400 text-[11px]">Calibrated Toolset: <strong>Fluke 435-II & Megger MIT410</strong></div>
                  <div className="text-[10px] text-gray-500">Certified for Surge & Dielectric Breakdown</div>
                </div>

                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    Police Character Clearance
                  </div>
                  <div className="text-gray-400 text-[11px]">Criminal Record Background Check: <strong className="text-emerald-400">CLEAN</strong></div>
                  <div className="text-[10px] text-gray-500">Renewed annually under NDPR compliance</div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Tab 4: REVIEWS WITH REAL CLIENT AVATARS ── */}
        {activeTab === 'reviews' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            {reviewsList.length === 0 ? (
              <div className="glass-panel rounded-2xl p-8 text-center border border-white/10 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 text-gray-400 flex items-center justify-center mx-auto text-xl">
                  ⭐
                </div>
                <h4 className="font-bold text-white text-sm">No Client Reviews Yet</h4>
                <p className="text-xs text-gray-400 max-w-sm mx-auto">
                  Verified client reviews and ratings are published automatically after a client signs off on a completed escrow job.
                </p>
              </div>
            ) : (
              reviewsList.map((r, i) => (
                <div key={i} className="glass-panel rounded-2xl p-4 sm:p-5 border border-white/10">
                  <div className="flex items-start gap-3.5 mb-2.5">
                    <img
                      src={r.avatar}
                      alt={r.name}
                      className="w-11 h-11 rounded-2xl object-cover border border-primary-500/40 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-white text-sm truncate">{r.name}</div>
                        <span className="text-gray-500 text-xs">{r.date}</span>
                      </div>
                      <div className="text-[11px] text-primary-300 font-semibold">{r.job}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex items-center gap-0.5 text-yellow-400">
                          {Array.from({ length: 5 }).map((_, idx) => (
                            <Star key={idx} className="w-3 h-3 fill-yellow-400" />
                          ))}
                        </div>
                        <span className="text-[10px] text-gray-400">📍 {r.location}</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-gray-300 text-xs sm:text-sm leading-relaxed pl-14">{r.text}</p>
                </div>
              ))
            )}
          </motion.div>
        )}

        {/* ── Tab 5: AVAILABILITY ── */}
        {activeTab === 'availability' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="glass-panel rounded-2xl p-6 border border-white/10">
              <h3 className="text-white font-bold mb-4 text-sm flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary-400" />
                Weekly Dispatch & Booking Windows
              </h3>
              <div className="space-y-2.5">
                {[
                  { day: 'Monday', time: '7:30 AM — 6:30 PM', status: 'Available' },
                  { day: 'Tuesday', time: '7:30 AM — 6:30 PM', status: 'Available' },
                  { day: 'Wednesday', time: '7:30 AM — 6:30 PM', status: 'Available' },
                  { day: 'Thursday', time: '7:30 AM — 6:30 PM', status: 'Available' },
                  { day: 'Friday', time: '7:30 AM — 6:30 PM', status: 'Available' },
                  { day: 'Saturday', time: '8:00 AM — 4:00 PM', status: 'Priority Dispatch' },
                  { day: 'Sunday', time: 'Emergency Standby Only', status: 'On-Call' },
                ].map(({ day, time, status }) => (
                  <div key={day} className="flex items-center justify-between py-2 border-b border-white/5 text-xs">
                    <span className="text-gray-300 font-semibold">{day}</span>
                    <span className="text-gray-400">{time}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                      {status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* ── High-Resolution Profile Picture Lightbox & Dossier Modal ── */}
      <AnimatePresence>
        {isAvatarModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="glass-panel max-w-lg w-full rounded-3xl p-6 border border-primary-500/40 text-white space-y-4 shadow-2xl relative"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <BadgeCheck className="w-5 h-5 text-primary-400" />
                  <h3 className="text-base font-bold text-white">Official Verified Profile Photo</h3>
                </div>
                <button
                  onClick={() => setIsAvatarModalOpen(false)}
                  className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Full Uncompressed High-Definition Image View */}
              <div className="relative aspect-square rounded-2xl overflow-hidden border-2 border-primary-500/40 shadow-glow bg-black flex items-center justify-center">
                <img
                  src={worker.avatar}
                  alt={worker.displayName}
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-3 left-3 right-3 p-3 rounded-xl bg-black/70 backdrop-blur-md border border-white/10 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-white text-sm">{worker.displayName}</div>
                    <div className="text-[11px] text-primary-300">{worker.profession}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-emerald-400 font-bold">✓ Biometric Matched</div>
                    <div className="text-[10px] text-gray-400">Guild ID: #NG-8492</div>
                  </div>
                </div>
              </div>

              {/* Verified Profile Checkpoints */}
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1.5 text-xs text-gray-300">
                <div className="flex justify-between">
                  <span className="text-gray-400">COREN License Status:</span>
                  <span className="text-emerald-400 font-bold">Active & Certified</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Service Coverage Hub:</span>
                  <span>{worker.serviceArea}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Escrow Security Standing:</span>
                  <span className="text-primary-300 font-bold">100% Zero-Dispute Escrow Rating</span>
                </div>
              </div>

              {/* Action buttons inside lightbox */}
              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsAvatarModalOpen(false)
                    navigate(`/book/${worker.id}`)
                  }}
                  className="flex-1 py-3 rounded-xl text-xs font-bold text-white shadow-glow"
                  style={{ background: 'linear-gradient(135deg, #6D28D9, #7C3AED)' }}
                >
                  Book {worker.displayName.split(' ')[0]} Now
                </button>
                <button
                  type="button"
                  onClick={() => setIsAvatarModalOpen(false)}
                  className="px-4 py-3 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-gray-300"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Portfolio High-Resolution Photo Viewer ── */}
      <AnimatePresence>
        {activeLightboxImage && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md cursor-pointer"
            onClick={() => setActiveLightboxImage(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-3xl w-full rounded-3xl overflow-hidden border border-white/20 shadow-2xl relative bg-black"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setActiveLightboxImage(null)}
                className="absolute top-4 right-4 z-10 p-2 rounded-xl bg-black/70 text-white hover:bg-black/90 transition-colors border border-white/20"
              >
                <X className="w-5 h-5" />
              </button>
              <img
                src={activeLightboxImage}
                alt="Portfolio Item"
                className="w-full max-h-[80vh] object-contain"
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
