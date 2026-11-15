import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Search, MapPin, AlertTriangle, ChevronRight, Star,
  Users, Play, ShoppingBag, Sparkles, Zap, Map,
  CheckCircle, Clock, TrendingUp, Wrench, X, RefreshCw,
  Navigation, Radio
} from 'lucide-react'
import {
  SERVICE_CATEGORIES, MOCK_WORKERS, formatCurrency, formatDistance, calculateDistanceKm, normalizeWorker
} from '@/lib/utils'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/stores/useAppStore'
import { servicesApi, feedApi, marketplaceApi } from '@/lib/api'
import toast from 'react-hot-toast'

const TRENDING_SEARCHES = ['Fix AC', 'Water Pump Machine', 'Inverter Tripping', 'Distribution Board', 'Generator Mechanic', 'Roof Leaking']

export default function HomePage() {
  const navigate = useNavigate()
  const { locationName, user, userLocation, hasLocationSet, isDeviceGps, setLocationPromptOpen } = useAppStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [sortByNearby, setSortByNearby] = useState(true)

  // Dynamic Backend State
  const [categories, setCategories] = useState<any[]>(SERVICE_CATEGORIES)
  const [workers, setWorkers] = useState<any[]>([])
  const [neighborhoodVideos, setNeighborhoodVideos] = useState<any[]>([])
  const [toolRentals, setToolRentals] = useState<any[]>([])
  const [isLoadingWorkers, setIsLoadingWorkers] = useState(false)

  // Fetch Categories, Videos, and Tools once
  useEffect(() => {
    async function loadInitialData() {
      try {
        const catRes = await servicesApi.getCategories()
        if (catRes && catRes.length > 0) {
          setCategories(catRes)
        }
      } catch (err) {
        console.warn('Using default categories', err)
      }

      try {
        const feedRes = await feedApi.getVideos()
        if (feedRes && feedRes.length > 0) {
          setNeighborhoodVideos(
            feedRes.slice(0, 4).map((v: any) => ({
              id: String(v.id),
              title: v.title,
              thumbnail: v.thumbnail_url || 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300&h=200&fit=crop',
              views: `${(v.views_count ? v.views_count / 1000 : 4.2).toFixed(1)}k`,
              creator: v.creator_handle || `@${(v.creator_name || 'Artisan').replace(/\s+/g, '')}`,
              duration: `${Math.floor((v.duration_seconds || 60) / 60)}:${String((v.duration_seconds || 60) % 60).padStart(2, '0')}`,
            }))
          )
        }
      } catch (err) {
        console.warn('Using fallback feed', err)
      }

      try {
        const marketRes = await marketplaceApi.getItems()
        if (marketRes && marketRes.length > 0) {
          setToolRentals(
            marketRes.slice(0, 5).map((m: any) => ({
              id: String(m.id),
              name: m.title,
              price: Number(m.price),
              per: 'item',
              condition: m.condition === 'brand_new' ? 'Brand New' : 'Available',
              icon: m.category?.toLowerCase().includes('drill') ? '🔨' : '⚙️',
            }))
          )
        }
      } catch (err) {
        console.warn('Using fallback tools', err)
      }
    }

    loadInitialData()
  }, [])

  // Fetch / Filter Workers based on search & category
  useEffect(() => {
    let isCancelled = false
    async function fetchWorkers() {
      setIsLoadingWorkers(true)
      try {
        const params: any = {}
        if (searchQuery.trim()) params.search = searchQuery.trim()
        if (selectedCategory) params.category = selectedCategory

        const res = await servicesApi.getWorkers(params)
        const workerList = Array.isArray(res) ? res : (res?.results || [])
        if (!isCancelled) {
          const normalized = workerList.map((w: any) => normalizeWorker(w))
          setWorkers(normalized)
        }
      } catch (err) {
        if (!isCancelled) {
          setWorkers([])
        }
      } finally {
        if (!isCancelled) setIsLoadingWorkers(false)
      }
    }

    const timer = setTimeout(() => {
      fetchWorkers()
    }, 250)

    return () => {
      isCancelled = true
      clearTimeout(timer)
    }
  }, [searchQuery, selectedCategory])

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  })()

  const userName = user ? `, ${user.firstName}` : ' 👋'

  const activeWorkerCount = workers.filter((w) => w.isOnline).length || workers.length

  const displayWorkers = workers
    .map((w) => {
      const lat = w.latitude || w.location?.lat || 6.6018
      const lng = w.longitude || w.location?.lng || 3.3515
      const distanceKm = userLocation
        ? calculateDistanceKm(userLocation.lat, userLocation.lng, lat, lng)
        : (w.distanceKm ?? 1.5)
      return {
        ...w,
        calculatedDistance: distanceKm,
      }
    })
    .sort((a, b) => {
      if (sortByNearby) return a.calculatedDistance - b.calculatedDistance
      return Number(b.rating || 0) - Number(a.rating || 0)
    })

  return (
    <div className="min-h-screen bg-dark-bg dark:bg-dark-bg" style={{ backgroundColor: 'var(--page-bg, #171326)' }}>
      {/* Emergency banner */}
      <div
        className="w-full py-2 px-4 flex items-center justify-between text-xs"
        style={{ background: 'rgba(239,68,68,0.15)', borderBottom: '1px solid rgba(239,68,68,0.2)' }}
      >
        <div className="flex items-center gap-2 max-w-[1400px] mx-auto w-full">
          <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
          <span className="text-red-300">
            <strong>Emergency Repairs Available 24/7</strong> — Electricians, Gas & Plumbers on standby in {locationName.split(',')[0]}
          </span>
          <div className="ml-auto flex items-center gap-3">
            <button
              onClick={() => navigate('/map')}
              className="text-primary-300 cursor-pointer hover:text-primary-200 font-semibold"
            >
              Instant Locate
            </button>
            <span className="text-green-400 font-semibold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block" />
              {activeWorkerCount} LIVE NOW
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6">
        {/* ── Hero Section with Background Image ── */}
        <section className="relative rounded-3xl overflow-hidden mb-4 mt-4 mx-0 shadow-purple-lg border border-primary-500/30">
          {/* Background image */}
          <div
            className="absolute inset-0 z-0"
            style={{
              backgroundImage: 'url(/hero-bg.jpg)',
              backgroundSize: 'cover',
              backgroundPosition: 'center 35%',
              filter: 'contrast(1.08) brightness(0.92)',
            }}
          />
          {/* Rich cinematic vignette overlay */}
          <div
            className="absolute inset-0 z-0"
            style={{
              background: 'linear-gradient(135deg, rgba(13,9,28,0.82) 0%, rgba(20,14,38,0.68) 45%, rgba(109,40,217,0.32) 100%)',
            }}
          />
          {/* Ambient bottom rim lighting */}
          <div
            className="absolute inset-0 z-0"
            style={{
              background: 'linear-gradient(to top, rgba(13,9,28,0.75) 0%, transparent 65%)',
            }}
          />

          {/* Content */}
          <div className="relative z-10 px-6 sm:px-8 pt-10 pb-8 text-white">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-primary-600/60 text-primary-200 border border-primary-400/30 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  Global Hyperlocal Artisan Mesh · Active Worldwide
                </span>
                <span className="text-xs text-gray-300">
                  {greeting}{userName}
                </span>
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white mb-3 max-w-2xl leading-tight">
                Vetted Repairs, <br />
                <span className="bg-gradient-to-r from-primary-300 via-primary-200 to-emerald-300 bg-clip-text text-transparent">
                  Secured by Escrow.
                </span>
              </h1>

              <p className="text-gray-300 text-sm sm:text-base mb-6 max-w-xl">
                Connect with verified local electricians, plumbers, and technicians within 3km. Funds held safely until you sign off.
              </p>

              {/* Search Bar */}
              <div className="max-w-2xl bg-dark-bg/80 backdrop-blur-md p-2 rounded-2xl border border-primary-500/40 shadow-purple-lg flex items-center gap-2">
                <div className="flex items-center gap-2 px-3 flex-1">
                  <Search className="w-5 h-5 text-primary-400 flex-shrink-0" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by trade (e.g. AC Gas, Inverter, Pipe Leak)..."
                    className="w-full bg-transparent text-sm text-white placeholder-gray-400 outline-none"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-white">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="h-6 w-[1px] bg-white/20 hidden sm:block" />

                <button
                  onClick={() => navigate('/map')}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-300 hover:text-white"
                >
                  <MapPin className="w-3.5 h-3.5 text-primary-400" />
                  <span>{locationName.split(',')[0]}</span>
                </button>

                <button
                  onClick={() => {
                    if (searchQuery.trim()) {
                      toast.success(`Found artisans for "${searchQuery}"`)
                    }
                  }}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:brightness-110 active:scale-95"
                  style={{ background: 'linear-gradient(135deg,#6D28D9,#7C3AED)', boxShadow: '0 4px 16px rgba(109,40,217,0.4)' }}
                >
                  Find Pro
                </button>
              </div>

              {/* Trending searches */}
              <div className="flex items-center gap-2 mt-4 flex-wrap">
                <span className="text-xs text-gray-400">Popular:</span>
                {TRENDING_SEARCHES.map((t) => (
                  <button
                    key={t}
                    onClick={() => setSearchQuery(t)}
                    className="px-2.5 py-1 rounded-lg text-xs text-white hover:bg-white/25 transition-colors font-medium cursor-pointer"
                    style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', backdropFilter: 'blur(8px)' }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* Featured service card */}
        <section className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* AC Installation feature */}
            <div
              onClick={() => {
                const target = workers.find((w) => w.profession.toLowerCase().includes('ac') || w.profession.toLowerCase().includes('hvac')) || workers[0]
                if (target) navigate(`/workers/${target.id}`)
              }}
              className="md:col-span-1 glass-panel rounded-2xl p-4 flex items-center gap-3 cursor-pointer hover:border-primary-600/40 transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center text-2xl flex-shrink-0">❄️</div>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-white text-sm font-semibold">Dual Inverter AC Overhaul</span>
                  <span className="lf-badge-purple text-[10px]">VERIFIED</span>
                </div>
                <div className="text-gray-400 text-xs">
                  <strong className="text-primary-300">Ngozi</strong> from Master HVAC · 7 yrs exp | Rate: ₦9,500/Callout
                </div>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-green-400 text-xs font-semibold">● Available Now</span>
                  <button className="text-primary-400 text-xs font-medium">Distance: 1.8km →</button>
                </div>
              </div>
            </div>

            {/* Availability stats */}
            <div className="glass-panel rounded-2xl p-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-white text-sm font-semibold">Active Neighborhood Standby</span>
                </div>
                <div className="text-gray-400 text-xs">{activeWorkerCount} technicians within 5km</div>
                <div className="text-primary-300 text-xs mt-1">Average response time: 8-15 mins</div>
              </div>
              <button
                onClick={() => navigate('/map')}
                className="px-3 py-1.5 rounded-xl text-xs text-white font-medium hover:bg-green-500/30 transition-colors"
                style={{ background: 'rgba(34,197,94,0.2)', border: '1px solid rgba(34,197,94,0.3)' }}
              >
                Radar Map →
              </button>
            </div>

            {/* LocalFix Protection */}
            <div className="glass-panel rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-700/30 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-5 h-5 text-primary-400" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-white text-sm font-semibold">LocalFix Escrow Shield</span>
                  <span className="lf-badge-green text-[10px]">Secure</span>
                </div>
                <p className="text-gray-400 text-xs">Payments released to worker only after your cryptographic sign-off OTP.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Service Categories Grid */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white text-xl font-bold">Explore On-Demand Services</h2>
            {selectedCategory && (
              <button
                onClick={() => setSelectedCategory(null)}
                className="text-xs text-primary-300 hover:text-white flex items-center gap-1"
              >
                Clear filter <X className="w-3 h-3" />
              </button>
            )}
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-10 gap-3">
            {categories.map((cat, i) => (
              <motion.button
                key={cat.id || cat.slug}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => setSelectedCategory(selectedCategory === cat.slug || selectedCategory === cat.id ? null : (cat.slug || cat.id))}
                className={cn(
                  'glass-panel rounded-2xl p-3 flex flex-col items-center gap-2 cursor-pointer transition-all duration-300 hover:scale-105',
                  selectedCategory === cat.slug || selectedCategory === cat.id ? 'border-primary-500 shadow-glow-sm bg-primary-900/30' : ''
                )}
              >
                <div className="text-2xl">{cat.icon || '🔧'}</div>
                <span className="text-white text-xs font-semibold text-center leading-tight">{cat.name}</span>
                <span className="text-gray-500 text-[10px]">{cat.worker_count ?? cat.workerCount ?? 15} active</span>
              </motion.button>
            ))}
          </div>
        </section>

        {/* Verified Craftsmen */}
        <section className="mb-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <div className="text-gray-400 text-xs uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span>{hasLocationSet ? `MATCHING PEOPLE NEAR YOUR DEVICE IN ${locationName.toUpperCase()}` : 'TOP RANKED ARTISANS'}</span>
              </div>
              <h2 className="text-white text-xl font-bold">
                {hasLocationSet ? `Verified Artisans Near Your Device (${locationName.split(',')[0]})` : `Verified Craftsmen in ${locationName.split(',')[0]}`}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSortByNearby(!sortByNearby)}
                className={`text-xs px-3 py-1.5 rounded-xl border flex items-center gap-1.5 transition-all cursor-pointer ${
                  sortByNearby
                    ? 'bg-primary-700/40 text-primary-300 border-primary-500/50 shadow-glow-sm font-bold'
                    : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'
                }`}
                title="Sort by proximity to your current device location"
              >
                <Navigation className="w-3.5 h-3.5 text-emerald-400" />
                <span>{sortByNearby ? '📍 Closest to Device' : 'Sort: Top Rated'}</span>
              </button>
              <button
                onClick={() => navigate('/map')}
                className="clay-btn-ghost text-xs px-3 py-1.5 flex items-center gap-1.5"
              >
                <Map className="w-3.5 h-3.5" /> Open Radar Map
              </button>
            </div>
          </div>

          {isLoadingWorkers ? (
            <div className="py-12 flex flex-col items-center justify-center text-gray-400 gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-primary-400" />
              <p className="text-xs">Locating nearest craftsmen...</p>
            </div>
          ) : workers.length === 0 ? (
            <div className="glass-panel rounded-2xl p-8 text-center">
              <p className="text-gray-400 text-sm mb-3">No craftsmen currently match your query "{searchQuery}".</p>
              <button
                onClick={() => {
                  setSearchQuery('')
                  setSelectedCategory(null)
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-primary-700 hover:bg-primary-600 transition-colors"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {displayWorkers.map((worker, i) => (
                <motion.div
                  key={worker.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="lf-card group"
                >
                  {/* Worker header */}
                  <div
                    className="flex items-start gap-3 mb-3 cursor-pointer group/header"
                    onClick={() => navigate(`/workers/${worker.id}`)}
                    title="Click to view full verified profile"
                  >
                    <div className="relative flex-shrink-0">
                      <img
                        src={worker.avatar}
                        alt={worker.displayName}
                        className="w-14 h-14 rounded-2xl object-cover border border-primary-500/30 group-hover/header:border-primary-400 group-hover/header:scale-105 transition-all"
                      />
                      {worker.isOnline && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-green-400 border-2 border-dark-bg" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-white font-semibold text-sm truncate group-hover/header:text-primary-300 transition-colors">
                          {worker.displayName}
                        </span>
                        <CheckCircle className="w-3.5 h-3.5 text-primary-400 flex-shrink-0" />
                      </div>
                      <div className="lf-badge-purple text-[10px] mb-1 w-fit">{worker.verificationBadge}</div>
                      <p className="text-gray-400 text-xs line-clamp-1">{worker.profession}</p>
                    </div>
                  </div>

                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {[
                      { label: 'Rating', value: Number(worker.rating || 4.9).toFixed(1) },
                      { label: 'Reviews', value: worker.reviewCount || 12 },
                      { label: 'Done', value: worker.completedJobs || 30 },
                    ].map((s) => (
                      <div
                        key={s.label}
                        className="text-center rounded-xl py-2"
                        style={{ background: 'rgba(109,40,217,0.12)' }}
                      >
                        <div className="text-white text-sm font-bold">{s.value}</div>
                        <div className="text-gray-500 text-[10px]">{s.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Price + live device distance */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-primary-300 text-sm font-semibold">{worker.price}</div>
                    <div className="flex items-center gap-1 text-xs">
                      <Radio className="w-3 h-3 text-emerald-400 animate-pulse flex-shrink-0" />
                      <span className="text-emerald-400 font-bold">{formatDistance(worker.calculatedDistance)}</span>
                      <span className="text-[10px] text-gray-500">near you</span>
                    </div>
                  </div>

                  {/* Specialisms */}
                  <div className="flex flex-wrap gap-1 mb-4">
                    {(worker.specialisms || []).slice(0, 2).map((s: string) => (
                      <span key={s} className="lf-badge-purple text-[10px]">{s}</span>
                    ))}
                  </div>

                  {/* Action buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => navigate(`/workers/${worker.id}`)}
                      className="py-2 rounded-xl text-xs font-semibold text-primary-300 transition-all hover:bg-primary-700/20"
                      style={{ border: '1px solid rgba(109,40,217,0.3)' }}
                    >
                      View Profile
                    </button>
                    <button
                      onClick={() => navigate(`/book/${worker.id}`)}
                      className="py-2 rounded-xl text-xs font-semibold text-white transition-all hover:brightness-110 active:scale-95"
                      style={{ background: 'linear-gradient(135deg,#6D28D9,#7C3AED)', boxShadow: '0 4px 12px rgba(109,40,217,0.3)' }}
                    >
                      Book Now
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </section>

        {/* Bottom 3-column section */}
        <section className="mb-10 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Neighborhood Fix Feeds */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white text-lg font-bold">📹 Neighborhood Fix Feeds</h2>
              <button onClick={() => navigate('/feed')} className="flex items-center gap-1 text-primary-400 text-sm hover:underline">
                Watch All Feeds <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(neighborhoodVideos.length > 0 ? neighborhoodVideos : [
                {
                  id: 'v1',
                  title: 'How to diagnose generator carburetor blockage',
                  thumbnail: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300&h=200&fit=crop',
                  views: '37.8k',
                  creator: '@adeolasolartech',
                  duration: '4:23',
                },
                {
                  id: 'v2',
                  title: 'Brazing copper lines for dual VRF outdoor AC',
                  thumbnail: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=300&h=200&fit=crop',
                  views: '7.4k',
                  creator: '@ngozi_hvac',
                  duration: '2:41',
                },
              ]).map((v) => (
                <div key={v.id} className="lf-card cursor-pointer group" onClick={() => navigate('/feed')}>
                  <div className="relative rounded-xl overflow-hidden mb-3">
                    <img
                      src={v.thumbnail}
                      alt={v.title}
                      className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                        <Play className="w-5 h-5 text-white fill-white" />
                      </div>
                    </div>
                    <div
                      className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-md text-[10px] text-white font-medium"
                      style={{ background: 'rgba(0,0,0,0.7)' }}
                    >
                      {v.duration}
                    </div>
                  </div>
                  <p className="text-white text-xs font-medium line-clamp-2 mb-1">{v.title}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-primary-400 text-[10px]">{v.creator}</span>
                    <span className="text-gray-500 text-[10px]">{v.views} views</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Copilot + Live Radar */}
          <div className="flex flex-col gap-4">
            {/* AI Copilot */}
            <div className="glass-panel rounded-2xl p-5 border border-primary-500/20">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-primary-400" />
                <span className="text-white font-semibold text-sm">LocalFix AI Copilot</span>
              </div>
              <p className="text-gray-400 text-xs mb-4">
                Describe strange noises, leaks, or tripping breakers. Our AI assistant identifies the repair diagnosis and quotes immediate market rates.
              </p>
              <div className="space-y-2 mb-4">
                {['"Why is my prepaid meter tripping when AC turns on?"', '"Inverter alarm beeping 4 times consecutively"'].map((q) => (
                  <button
                    key={q}
                    onClick={() => navigate('/assistant')}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs text-primary-300 hover:bg-primary-700/20 transition-colors"
                    style={{ background: 'rgba(109,40,217,0.1)', border: '1px solid rgba(109,40,217,0.2)' }}
                  >
                    {q}
                  </button>
                ))}
              </div>
              <button
                onClick={() => navigate('/assistant')}
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-white text-center transition-all hover:brightness-110 active:scale-95"
                style={{ background: 'linear-gradient(135deg,#6D28D9,#A78BFA)', boxShadow: '0 4px 16px rgba(109,40,217,0.35)' }}
              >
                Diagnose with AI →
              </button>
            </div>

            {/* Live Radar Map preview */}
            <div className="glass-panel rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-white font-semibold text-sm">{locationName.split(',')[0]} Live Radar</span>
                </div>
                <span className="text-green-400 text-xs font-semibold">● ACTIVE</span>
              </div>
              {/* Mini map preview */}
              <div
                className="h-36 rounded-xl mb-3 relative overflow-hidden border border-primary-500/30 group cursor-pointer shadow-lg"
                onClick={() => navigate('/map')}
              >
                <iframe
                  src="https://maps.google.com/maps?q=world&z=2&output=embed"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  loading="lazy"
                  referrerPolicy="strict-origin-when-cross-origin"
                  className="w-full h-full pointer-events-none"
                  title="Global Map Preview"
                />
                <div className="absolute inset-0 bg-black/25 group-hover:bg-transparent transition-colors flex items-center justify-center">
                  <div className="text-white text-xs font-bold bg-primary-700/95 backdrop-blur-md px-3.5 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 border border-white/20">
                    <Map className="w-3.5 h-3.5 text-primary-200" /> Tap to Explore Global Artisan Map
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                {[
                  { label: 'Verified Artisans', value: `${workers.length}` },
                  { label: 'Avg. Response', value: '11 min' },
                  { label: 'Escrow Success', value: '99.4%' },
                ].map((s) => (
                  <div key={s.label}>
                    <div className="text-white font-semibold text-sm">{s.value}</div>
                    <div className="text-gray-500 text-[10px]">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* P2P Tool Rentals */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white text-lg font-bold">🔧 P2P Tool Rentals & Surplus Hardware</h2>
            <button onClick={() => navigate('/marketplace')} className="flex items-center gap-1 text-primary-400 text-sm hover:underline">
              Explore Marketplace <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <p className="text-gray-400 text-xs mb-4">Rent heavy diagnostic tools or buy unused renovation materials from vetted neighbors.</p>
          <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
            {(toolRentals.length > 0 ? toolRentals : [
              { id: 't1', name: 'Bosch 800W Hammer Drill Set', price: 4500, per: 'day', condition: 'Available', icon: '🔨' },
              { id: 't2', name: '2.8m Telescopic Ladder', price: 2200, per: 'day', condition: 'Rent', icon: '🪜' },
              { id: 't3', name: 'Kärcher HD High-Pressure Washer', price: 6800, per: 'day', condition: 'Rent Tool', icon: '💦' },
            ]).map((tool) => (
              <div
                key={tool.id}
                onClick={() => navigate('/marketplace')}
                className="lf-card flex-shrink-0 w-56 cursor-pointer hover:scale-[1.02] transition-transform"
              >
                <div className="text-3xl mb-2">{tool.icon}</div>
                <p className="text-white text-xs font-semibold mb-1 line-clamp-2">{tool.name}</p>
                <div className="flex items-center justify-between mt-2">
                  <div>
                    <div className="text-primary-300 font-bold text-sm">{formatCurrency(tool.price)}</div>
                    <div className="text-gray-500 text-[10px]">per {tool.per}</div>
                  </div>
                  <button
                    className="px-3 py-1.5 rounded-xl text-[11px] font-semibold text-white"
                    style={{ background: 'rgba(109,40,217,0.4)', border: '1px solid rgba(167,139,250,0.3)' }}
                  >
                    {tool.condition}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Trust Standard Banner */}
        <section className="mb-8">
          <div className="glass-panel rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-6 border border-primary-500/20">
            <div className="w-12 h-12 rounded-2xl bg-primary-700/30 flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-6 h-6 text-primary-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-white font-bold">LocalFix Trade Trust Standard</span>
                <span className="lf-badge-purple text-[10px]">PRO</span>
              </div>
              <p className="text-gray-400 text-xs">
                Every craftsman undergoes biometric ID verification, peer trade screening, and escrow vault audit before serving residents.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => navigate('/auth')} className="clay-btn-secondary text-xs px-4 py-2">
                Verify Credentials
              </button>
              <button onClick={() => navigate('/auth')} className="clay-btn-primary text-xs px-4 py-2">
                Join as Vetted Artisan
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
