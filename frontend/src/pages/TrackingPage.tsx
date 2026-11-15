import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Navigation,
  MapPin,
  Phone,
  Video,
  MessageSquare,
  ShieldCheck,
  Compass,
  Radio,
  Search,
  CheckCircle,
  Clock,
  Sparkles,
  ChevronLeft,
  ArrowRight,
  Layers,
  HandCoins,
  Lock,
  Wrench
} from 'lucide-react'
import LiveDispatchTracker from '@/components/location/LiveDispatchTracker'
import { useAppStore } from '@/stores/useAppStore'
import { useChatStore } from '@/stores/useChatStore'
import { bookingsApi, servicesApi } from '@/lib/api'
import { MOCK_WORKERS, formatCurrency, normalizeWorker } from '@/lib/utils'
import toast from 'react-hot-toast'

export default function TrackingPage() {
  const { bookingCode: routeBookingCode } = useParams<{ bookingCode?: string }>()
  const navigate = useNavigate()
  const { user, userLocation, locationName, requestGPSLocation } = useAppStore()

  // Active tracking state
  const [activeCode, setActiveCode] = useState<string>(routeBookingCode || 'LX-789012')
  const [searchInput, setSearchInput] = useState<string>('')
  const [bookingData, setBookingData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [isWorkerMode, setIsWorkerMode] = useState<boolean>(false)

  // Default demonstration worker if not loaded from real backend
  const demoWorker = MOCK_WORKERS[0]
  const [worker, setWorker] = useState<any>(demoWorker)

  // Load real booking from backend if routeBookingCode or activeCode is present
  useEffect(() => {
    let isMounted = true

    async function loadBooking() {
      if (!activeCode || activeCode === 'LX-789012') {
        // Fallback demo state
        return
      }

      setIsLoading(true)
      try {
        const res = await bookingsApi.getBookingDetail(activeCode)
        if (res && isMounted) {
          setBookingData(res)
          if (res.worker_details) {
            setWorker(normalizeWorker(res.worker_details))
          }
        }
      } catch {
        // Use demo fallback gracefully
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    loadBooking()
    return () => {
      isMounted = false
    }
  }, [activeCode])

  const handleSearchBooking = (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchInput.trim()) return
    const cleaned = searchInput.trim().toUpperCase()
    setActiveCode(cleaned)
    navigate(`/tracking/${cleaned}`)
  }

  // Calculate coordinates: Destination is customer device GPS, Artisan is nearby
  const customerLat = userLocation?.lat || bookingData?.destination_latitude || 6.5887
  const customerLng = userLocation?.lng || bookingData?.destination_longitude || 3.3645
  const customerAddress = bookingData?.location_address || locationName || 'Ikeja District, Lagos'

  // Artisan starting coordinates: slightly offset to demonstrate real driving path
  const artisanLat = bookingData?.worker_current_latitude || (customerLat + 0.018)
  const artisanLng = bookingData?.worker_current_longitude || (customerLng - 0.015)

  return (
    <div className="min-h-screen bg-dark-bg text-white pb-24 pt-6">
      <div className="max-w-5xl mx-auto px-4">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between gap-3 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm font-semibold">Back</span>
          </button>

          {/* Perspective toggle: Employer Tracking vs Worker GPS Broadcast */}
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 p-1 rounded-2xl">
            <button
              onClick={() => setIsWorkerMode(false)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                !isWorkerMode ? 'bg-primary-700 text-white shadow-glow-sm' : 'text-gray-400 hover:text-white'
              }`}
            >
              👁️ Employer View
            </button>
            <button
              onClick={() => {
                setIsWorkerMode(true)
                toast.success('Worker Mode: You can broadcast your live device GPS to the employer!')
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isWorkerMode ? 'bg-emerald-600 text-white shadow-glow-sm' : 'text-gray-400 hover:text-white'
              }`}
            >
              📱 Worker Mode (GPS)
            </button>
          </div>
        </div>

        {/* Hero Dispatch Header Banner */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel rounded-3xl p-6 sm:p-7 mb-6 border border-primary-500/30"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="lf-badge-purple text-[10px] uppercase tracking-wider font-extrabold flex items-center gap-1">
                  <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
                  Live GPS Dispatch Radar
                </span>
                <span className="text-xs font-mono font-bold text-gray-400">
                  #{activeCode}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white">
                Live Worker Movement & Turn-by-Turn Tracker
              </h1>
              <p className="text-xs text-gray-400 mt-1">
                Real-time road tracking like Uber & InDrive with live street navigation, night radar, and high-resolution satellite imagery.
              </p>
            </div>

            {/* Quick Booking Code Switcher / Search */}
            <form onSubmit={handleSearchBooking} className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-56">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Booking Code (e.g. LX-789012)"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-black/40 border border-white/15 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-primary-500"
                />
              </div>
              <button
                type="submit"
                className="px-3.5 py-2 rounded-xl bg-primary-700 hover:bg-primary-600 text-white text-xs font-bold transition-all cursor-pointer"
              >
                Track
              </button>
            </form>
          </div>

          {/* Quick Telemetry Summary Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 text-xs">
            <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
              <span className="text-[10px] uppercase text-gray-400 font-bold block">Assigned Technician</span>
              <span className="font-bold text-white line-clamp-1">{worker.displayName}</span>
              <span className="text-[10px] text-primary-300 block">{worker.profession}</span>
            </div>
            <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
              <span className="text-[10px] uppercase text-gray-400 font-bold block">Customer Doorstep</span>
              <span className="font-bold text-white line-clamp-1">{customerAddress}</span>
              <span className="text-[10px] text-emerald-400 font-mono block">GPS Pin Locked</span>
            </div>
            <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
              <span className="text-[10px] uppercase text-gray-400 font-bold block">Map Engine</span>
              <span className="font-bold text-white block">Real Street / Night Radar</span>
              <span className="text-[10px] text-gray-400 block">OSRM Road Geometry</span>
            </div>
            <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
              <span className="text-[10px] uppercase text-gray-400 font-bold block">Escrow & Guarantee</span>
              <span className="font-bold text-emerald-400 block">100% Protected</span>
              <span className="text-[10px] text-gray-400 block">Funds released upon inspection</span>
            </div>
          </div>
        </motion.div>

        {/* ── THE UBER-STYLE LIVE SATELLITE & STREET DISPATCH TRACKER ── */}
        <LiveDispatchTracker
          bookingCode={activeCode}
          artisanName={worker.displayName}
          artisanProfession={worker.profession}
          artisanAvatar={worker.avatar}
          artisanPhone={worker.phone || '+234 803 491 8820'}
          artisanWhatsapp={worker.whatsapp || '2348034918820'}
          customerAddress={customerAddress}
          customerLat={customerLat}
          customerLng={customerLng}
          initialArtisanLat={artisanLat}
          initialArtisanLng={artisanLng}
          isWorkerMode={isWorkerMode}
        />

        {/* ── Feature Highlights & Real-Life Capabilities Grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="glass-panel rounded-2xl p-4 border border-white/10 space-y-2">
            <div className="w-9 h-9 rounded-xl bg-primary-700/30 text-primary-300 flex items-center justify-center">
              <Navigation className="w-5 h-5 text-primary-400" />
            </div>
            <h4 className="font-bold text-white text-sm">Real Road Geometry</h4>
            <p className="text-xs text-gray-400 leading-relaxed">
              No straight imaginary flight lines. The technician's vehicle navigates actual streets, highways, and turns using real-life OSRM routing.
            </p>
          </div>

          <div className="glass-panel rounded-2xl p-4 border border-white/10 space-y-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-700/30 text-emerald-300 flex items-center justify-center">
              <Layers className="w-5 h-5 text-emerald-400" />
            </div>
            <h4 className="font-bold text-white text-sm">3 Real-Life Map Modes</h4>
            <p className="text-xs text-gray-400 leading-relaxed">
              Toggle anytime between <strong>🗺️ Real Streets</strong> with street names, <strong>🌙 Cyber Night Radar</strong>, or <strong>🛰️ High-Resolution Satellite Photography</strong>.
            </p>
          </div>

          <div className="glass-panel rounded-2xl p-4 border border-white/10 space-y-2">
            <div className="w-9 h-9 rounded-xl bg-purple-700/30 text-purple-300 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-purple-400" />
            </div>
            <h4 className="font-bold text-white text-sm">Escrow & Direct Settlement</h4>
            <p className="text-xs text-gray-400 leading-relaxed">
              Support for platform vault escrow or direct on-site physical cash / transfer payments, with dynamic price adjustments for unexpected spare parts.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
