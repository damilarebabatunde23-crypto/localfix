import { useState, useCallback, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, MapPin, Filter, SlidersHorizontal, CheckCircle,
  Star, MessageSquare, Zap, ChevronRight, Map as MapIcon, List,
  Users, Clock, X, Shield, Crosshair, Layers, Globe
} from 'lucide-react'
import { MOCK_WORKERS, WORLD_HUBS, formatCurrency, formatDistance, normalizeWorker } from '@/lib/utils'
import { useAppStore } from '@/stores/useAppStore'
import { servicesApi } from '@/lib/api'
import type { WorkerProfile } from '@/types'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

// Fix leaflet default icon
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const createWorkerIcon = (worker: WorkerProfile, isActive = false) =>
  L.divIcon({
    className: '',
    html: `<div style="
      width:44px; height:44px; border-radius:50%;
      background:${isActive ? '#7C3AED' : '#4C1D95'};
      border:3px solid ${isActive ? '#F59E0B' : '#A78BFA'};
      display:flex; align-items:center; justify-content:center;
      box-shadow:0 6px 20px rgba(0,0,0,0.45);
      position:relative;
      transform:${isActive ? 'scale(1.2)' : 'scale(1)'};
      transition:all 0.2s;
      overflow:hidden;
    ">
      <img src="${worker.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop'}" style="width:100%; height:100%; object-fit:cover;" />
      <div style="position:absolute; bottom:0; right:0; width:12px; height:12px; border-radius:50%; background:#22C55E; border:2px solid white;"></div>
    </div>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -24],
  })

const userLocationIcon = L.divIcon({
  className: '',
  html: `<div style="
    width:22px; height:22px; border-radius:50%;
    background:#6D28D9; border:3px solid white;
    box-shadow:0 0 25px rgba(109,40,217,1);
    animation:pulse 2s ease-in-out infinite;
  "></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
})

// Real map tile providers - 100% reliable, free, unblocked high-speed CDN tiles
const TILE_PROVIDERS = {
  streets: {
    name: '🗺️ Real Streets',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; OpenStreetMap',
    subdomains: ['a', 'b', 'c', 'd'],
    maxZoom: 20,
  },
  dark: {
    name: '🌙 Night Map',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; OpenStreetMap',
    subdomains: ['a', 'b', 'c', 'd'],
    maxZoom: 20,
  },
  satellite: {
    name: '🛰️ Real Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; High-Resolution Satellite Imagery',
    subdomains: ['a', 'b', 'c', 'd'],
    maxZoom: 19,
  },
  light: {
    name: '☀️ Clean Light',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; OpenStreetMap',
    subdomains: ['a', 'b', 'c', 'd'],
    maxZoom: 20,
  },
}

type TileStyleKey = keyof typeof TILE_PROVIDERS

function MapController({ center, zoom, tileStyle }: { center: [number, number]; zoom?: number; tileStyle: string }) {
  const map = useMap()

  // Invalidate size on mount and on tileStyle change to prevent blank/grey tiles
  useEffect(() => {
    map.invalidateSize()
    const t1 = setTimeout(() => map.invalidateSize(), 80)
    const t2 = setTimeout(() => map.invalidateSize(), 300)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [tileStyle, map])

  // Center update
  useEffect(() => {
    map.setView(center, zoom ?? map.getZoom())
  }, [center, zoom, map])

  // Handle window resize
  useEffect(() => {
    const handleResize = () => map.invalidateSize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [map])

  return null
}

const TRADE_CATEGORIES = [
  { id: 'electric', label: '⚡ Electrician & Solar' },
  { id: 'plumb', label: '🔧 Plumber & Pipe' },
  { id: 'hvac', label: '❄️ HVAC & AC Tech' },
  { id: 'carp', label: '🪵 Carpentry & Joinery' },
  { id: 'gen', label: '⚙️ Generator & EV Tech' },
]

const VIEW_MODES = [
  { id: 'split', label: 'Split Discovery', icon: SlidersHorizontal },
  { id: 'map', label: 'Map Only', icon: MapIcon },
  { id: 'list', label: 'Directory', icon: List },
]

export default function ExploreMapPage() {
  const navigate = useNavigate()
  const { locationName, userLocation, setUserLocation, requestGPSLocation } = useAppStore()
  const initialCenter: [number, number] = userLocation ? [userLocation.lat, userLocation.lng] : [6.5916, 3.3575]

  const [currentCenter, setCurrentCenter] = useState<[number, number]>(initialCenter)
  const [currentZoom, setCurrentZoom] = useState<number>(initialCenter[0] === 20 && initialCenter[1] === 0 ? 2 : 14)
  const [currentHubName, setCurrentHubName] = useState<string>(locationName || 'Worldwide (Global Overview)')
  const [tileStyle, setTileStyle] = useState<TileStyleKey>('streets')
  const [viewMode, setViewMode] = useState<'split' | 'map' | 'list'>('split')
  const [selectedWorker, setSelectedWorker] = useState<WorkerProfile | null>(null)
  const [searchRadius, setSearchRadius] = useState(15)
  const [activeCategories, setActiveCategories] = useState<string[]>(['electric'])
  const [searchQuery, setSearchQuery] = useState('')
  const [showVerifiedOnly, setShowVerifiedOnly] = useState(false)
  const [show4Plus, setShow4Plus] = useState(false)
  const [allWorkers, setAllWorkers] = useState<WorkerProfile[]>([])

  const handleSelectHub = (hubName: string) => {
    const hub = WORLD_HUBS.find((h) => h.name === hubName)
    if (!hub) return
    setCurrentHubName(hub.name)
    setCurrentCenter(hub.coords)
    setCurrentZoom(hub.zoom)
    setUserLocation({ lat: hub.coords[0], lng: hub.coords[1] }, hub.name)
    toast.success(`Active Region: ${hub.name}`)
  }

  // Fetch real workers from backend API
  useEffect(() => {
    async function fetchMapWorkers() {
      try {
        const res = await servicesApi.getWorkers({ search: searchQuery })
        const workerList = Array.isArray(res) ? res : (res?.results || [])
        setAllWorkers(workerList.map((w: any) => normalizeWorker(w)))
      } catch (e) {
        setAllWorkers([])
      }
    }
    fetchMapWorkers()
  }, [searchQuery])

  const handleLocateUser = async () => {
    toast.loading('Acquiring live device GPS satellite fix...', { id: 'gps' })
    const success = await requestGPSLocation()
    toast.dismiss('gps')
    if (success) {
      const loc = useAppStore.getState().userLocation
      const name = useAppStore.getState().locationName
      if (loc) {
        setCurrentCenter([loc.lat, loc.lng])
        setCurrentZoom(14)
        setCurrentHubName(name)
        toast.success(`Device GPS locked: ${name}!`, { icon: '📍' })
      }
    } else {
      toast.error('Device GPS access was not granted by browser.')
    }
  }

  const toggleCategory = (id: string) => {
    setActiveCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    )
  }

  const filteredWorkers = allWorkers.filter((w) => {
    if (showVerifiedOnly && !w.isVerified) return false
    if (show4Plus && w.rating < 4.5) return false
    if (searchQuery && !w.displayName.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !w.profession.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  return (
    <div className="min-h-screen bg-dark-bg">
      {/* Sub-header */}
      <div className="px-4 py-3 flex items-center justify-between"
        style={{ borderBottom: '1px solid rgba(167,139,250,0.1)' }}>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-1.5 text-sm text-primary-300"
            style={{ background: 'rgba(109,40,217,0.1)', border: '1px solid rgba(109,40,217,0.2)', borderRadius: '12px', padding: '6px 12px' }}>
            <MapPin className="w-3.5 h-3.5" />
            {locationName}
            <span className="lf-badge-green text-[10px] ml-1">42 Pros Nearby</span>
          </button>
        </div>

        {/* Search */}
        <div className="flex-1 max-w-md mx-4 hidden md:block relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search technician, trade, or issue (e.g. inverter, AC leak)..."
            className="w-full pl-9 pr-4 py-2 rounded-xl text-sm outline-none"
            style={{ background: 'rgba(37,28,64,0.6)', border: '1px solid rgba(167,139,250,0.2)', color: '#e2e0ff' }}
          />
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-1 rounded-xl p-1" style={{ background: 'rgba(37,28,64,0.6)', border: '1px solid rgba(167,139,250,0.15)' }}>
          {VIEW_MODES.map((mode) => {
            const Icon = mode.icon
            return (
              <button
                key={mode.id}
                onClick={() => setViewMode(mode.id as typeof viewMode)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                  viewMode === mode.id ? 'bg-primary-700 text-white' : 'text-gray-400 hover:text-gray-200'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:block">{mode.label}</span>
              </button>
            )
          })}
          <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-green-400 font-medium">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            28 Live Now
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex h-[calc(100vh-140px)]">
        {/* Left: filters + worker list */}
        {viewMode !== 'map' && (
          <motion.aside
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="w-full md:w-[340px] flex-shrink-0 overflow-y-auto no-scrollbar"
            style={{ borderRight: '1px solid rgba(167,139,250,0.1)' }}
          >
            <div className="p-4">
              {/* Distance slider */}
              <div className="glass-panel rounded-xl p-3 mb-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-sm font-medium text-white">
                    <Filter className="w-3.5 h-3.5 text-primary-400" />
                    Search Distance Radius
                  </div>
                  <span className="text-primary-300 text-sm font-semibold">Within {searchRadius} km</span>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-gray-500 text-xs">1 km (Hyperlocal)</span>
                  <input
                    type="range" min={1} max={25} value={searchRadius}
                    onChange={(e) => setSearchRadius(Number(e.target.value))}
                    className="flex-1 accent-primary-600"
                  />
                  <span className="text-gray-500 text-xs">25 km+</span>
                </div>

                {/* Trade categories */}
                <div className="mb-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-gray-400 text-xs font-medium uppercase tracking-wider">Trade Category</span>
                    <button className="text-primary-400 text-xs">Reset</button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {TRADE_CATEGORIES.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => toggleCategory(cat.id)}
                        className={cn(
                          'px-2.5 py-1 rounded-lg text-xs font-medium transition-all',
                          activeCategories.includes(cat.id)
                            ? 'bg-primary-700 text-white'
                            : 'text-gray-400 hover:text-gray-200'
                        )}
                        style={{
                          background: activeCategories.includes(cat.id)
                            ? 'rgba(109,40,217,0.8)'
                            : 'rgba(37,28,64,0.5)',
                          border: `1px solid ${activeCategories.includes(cat.id) ? 'rgba(167,139,250,0.5)' : 'rgba(167,139,250,0.15)'}`,
                        }}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quick filters */}
                <div className="flex flex-wrap gap-2 mt-2">
                  <button
                    onClick={() => setShowVerifiedOnly(!showVerifiedOnly)}
                    className={cn('flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs transition-all', showVerifiedOnly ? 'text-primary-300' : 'text-gray-400')}
                    style={{ background: showVerifiedOnly ? 'rgba(109,40,217,0.25)' : 'rgba(37,28,64,0.5)', border: '1px solid rgba(167,139,250,0.2)' }}
                  >
                    <div className={cn('w-3 h-3 rounded border', showVerifiedOnly ? 'bg-primary-600 border-primary-500' : 'border-gray-600')} />
                    Verified Trade License
                  </button>
                  <button
                    onClick={() => setShow4Plus(!show4Plus)}
                    className={cn('flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs transition-all', show4Plus ? 'text-yellow-300' : 'text-gray-400')}
                    style={{ background: show4Plus ? 'rgba(234,179,8,0.15)' : 'rgba(37,28,64,0.5)', border: '1px solid rgba(167,139,250,0.2)' }}
                  >
                    <div className={cn('w-3 h-3 rounded border', show4Plus ? 'bg-yellow-500 border-yellow-400' : 'border-gray-600')} />
                    ⭐ 4.8+ Top Rated
                  </button>
                  <button className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs text-gray-400"
                    style={{ background: 'rgba(37,28,64,0.5)', border: '1px solid rgba(167,139,250,0.2)' }}>
                    <div className="w-3 h-3 rounded border border-gray-600" />
                    🚨 Emergency Express (Under 30m)
                  </button>
                </div>
              </div>

              {/* Worker list */}
              <div className="space-y-3">
                {filteredWorkers.map((worker) => (
                  <motion.div
                    key={worker.id}
                    layout
                    className={cn(
                      'glass-panel rounded-xl p-3 cursor-pointer transition-all duration-200',
                      selectedWorker?.id === worker.id ? 'border-primary-600/50 shadow-glow-sm' : ''
                    )}
                    onClick={() => setSelectedWorker(worker as WorkerProfile)}
                  >
                    {/* Worker row */}
                    <div className="flex items-start gap-3 mb-2">
                      <div className="relative flex-shrink-0">
                        <img src={worker.avatar} alt={worker.displayName}
                          className="w-12 h-12 rounded-xl object-cover" />
                        {worker.isOnline && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-400 border-2 border-dark-bg" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-white text-sm font-semibold truncate">{worker.displayName}</span>
                          <span className="lf-badge-purple text-[10px]">✓ {worker.verificationBadge}</span>
                        </div>
                        <p className="text-gray-400 text-xs line-clamp-1">{worker.profession}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <div className="flex items-center gap-0.5">
                            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                            <span className="text-yellow-400 text-xs font-semibold">{worker.rating}</span>
                            <span className="text-gray-600 text-xs">({worker.reviewCount})</span>
                          </div>
                          <span className="text-gray-600 text-xs">·</span>
                          <span className="text-gray-400 text-xs">{worker.completedJobs} Jobs Done</span>
                        </div>
                      </div>
                      <div className="text-primary-300 text-xs font-semibold text-right flex-shrink-0">
                        {formatCurrency(worker.calloutRate ?? 0)}<br />
                        <span className="text-gray-500 font-normal">/ callout</span>
                      </div>
                    </div>

                    {/* Specialisms */}
                    <div className="flex flex-wrap gap-1 mb-2">
                      {worker.specialisms.map((s) => (
                        <span key={s} className="lf-badge-purple text-[10px]">{s}</span>
                      ))}
                    </div>

                    {/* Distance + response + actions */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-gray-500 text-xs">
                        <Clock className="w-3 h-3" />
                        Avg. response: {worker.avgResponseMins} mins
                      </div>
                      <div className="flex gap-2">
                        <button
                          className="px-3 py-1 rounded-lg text-xs font-medium text-primary-300 hover:bg-primary-700/20 transition-colors"
                          style={{ border: '1px solid rgba(109,40,217,0.3)' }}
                          onClick={(e) => { e.stopPropagation(); navigate(`/workers/${worker.id}`) }}
                        >
                          Profile
                        </button>
                        <button
                          className="px-3 py-1 rounded-lg text-xs font-semibold text-white"
                          style={{ background: 'linear-gradient(135deg,#6D28D9,#7C3AED)' }}
                          onClick={(e) => { e.stopPropagation(); navigate(`/book/${worker.id}`) }}
                        >
                          Instant Book
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.aside>
        )}

        {/* Right: Map */}
        {viewMode !== 'list' && (
          <div className="flex-1 relative h-[calc(100vh-120px)] min-h-[500px]">
            {/* Real Map Floating Controls */}
            <div className="absolute top-4 right-4 z-[1000] flex flex-wrap items-center justify-end gap-2 max-w-[95%]">
              {/* Global City / Region Switcher */}
              <div className="glass-panel rounded-2xl p-1.5 flex items-center gap-1.5 shadow-2xl border border-white/20 bg-dark-card/90 backdrop-blur-md">
                <div className="flex items-center gap-1 px-2 py-1 text-xs font-semibold text-primary-300">
                  <Globe className="w-3.5 h-3.5 text-primary-400" />
                  <span className="hidden sm:inline">Region:</span>
                </div>
                <select
                  value={currentHubName}
                  onChange={(e) => handleSelectHub(e.target.value)}
                  className="bg-black/50 border border-white/10 rounded-xl px-2.5 py-1 text-xs font-bold text-white focus:outline-none focus:border-primary-500 cursor-pointer"
                >
                  {WORLD_HUBS.map((hub) => (
                    <option key={hub.name} value={hub.name} className="bg-gray-900 text-white">
                      {hub.name} {hub.country !== 'Global' ? `(${hub.country})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tile Style Picker */}
              <div className="glass-panel rounded-2xl p-1.5 flex items-center gap-1 shadow-2xl border border-white/20 bg-dark-card/90 backdrop-blur-md">
                {(Object.keys(TILE_PROVIDERS) as TileStyleKey[]).map((styleKey) => (
                  <button
                    key={styleKey}
                    onClick={() => setTileStyle(styleKey)}
                    className={cn(
                      'px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer',
                      tileStyle === styleKey
                        ? 'bg-primary-700 text-white shadow-glow-sm'
                        : 'text-gray-300 hover:text-white hover:bg-white/10'
                    )}
                  >
                    {TILE_PROVIDERS[styleKey].name}
                  </button>
                ))}
              </div>

              {/* Locate Me GPS Button */}
              <button
                type="button"
                onClick={handleLocateUser}
                className="glass-panel px-3.5 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-2 hover:bg-primary-700/30 transition-all border border-white/20 shadow-lg bg-dark-card/90 backdrop-blur-md cursor-pointer"
              >
                <Crosshair className="w-4 h-4 text-emerald-400 animate-pulse" />
                <span>Locate Me (GPS)</span>
              </button>
            </div>

            <MapContainer
              center={currentCenter}
              zoom={currentZoom}
              className="w-full h-full rounded-2xl"
              style={{ background: '#1a1030', height: '100%', width: '100%' }}
            >
              <MapController center={currentCenter} zoom={currentZoom} tileStyle={tileStyle} />
              
              <TileLayer
                key={tileStyle}
                url={TILE_PROVIDERS[tileStyle].url}
                attribution={TILE_PROVIDERS[tileStyle].attribution}
                subdomains={TILE_PROVIDERS[tileStyle].subdomains}
                maxZoom={TILE_PROVIDERS[tileStyle].maxZoom}
              />

              {/* For satellite view, add street and boundary names overlay */}
              {tileStyle === 'satellite' && (
                <TileLayer
                  key="satellite-roads-labels"
                  url="https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
                  attribution="&copy; Esri Boundaries & Places"
                  opacity={0.85}
                  maxZoom={19}
                />
              )}

              {/* Service radius circle */}
              <Circle
                center={currentCenter}
                radius={searchRadius * 1000}
                pathOptions={{ color: '#7C3AED', fillColor: '#6D28D9', fillOpacity: 0.08, weight: 2 }}
              />

              {/* User location */}
              <Marker position={currentCenter} icon={userLocationIcon}>
                <Popup>
                  <div className="text-xs p-1 text-gray-900">
                    <strong className="block text-primary-700 font-bold">📍 Your Live Position</strong>
                    <span>{locationName}</span>
                  </div>
                </Popup>
              </Marker>

              {/* Worker markers */}
              {(filteredWorkers.length > 0 ? filteredWorkers : MOCK_WORKERS).map((worker) => (
                <Marker
                  key={worker.id}
                  position={[worker.location.lat, worker.location.lng]}
                  icon={createWorkerIcon(worker as WorkerProfile, selectedWorker?.id === worker.id)}
                  eventHandlers={{
                    click: () => setSelectedWorker(worker as WorkerProfile),
                  }}
                >
                  <Popup>
                    <div className="text-xs min-w-[190px] p-1 text-gray-900">
                      <div className="flex items-center gap-2 mb-1.5">
                        <img src={worker.avatar} alt={worker.displayName} className="w-8 h-8 rounded-full object-cover" />
                        <div>
                          <div className="font-bold text-gray-900 leading-tight">{worker.displayName}</div>
                          <span className="text-[10px] text-primary-700 font-semibold">{worker.profession}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[11px] mb-2 text-gray-600">
                        <span className="flex items-center gap-0.5 text-amber-500 font-bold">
                          ★ {worker.rating} <span className="text-gray-400 font-normal">({worker.reviewCount})</span>
                        </span>
                        <span className="font-bold text-primary-700">{formatCurrency(worker.calloutRate ?? 0)}/callout</span>
                      </div>
                      <div className="flex gap-1.5 pt-1 border-t border-gray-200">
                        <button
                          onClick={() => navigate(`/book/${worker.id}`)}
                          className="flex-1 py-1 rounded bg-primary-700 text-white font-bold text-[10px] text-center"
                        >
                          Book Now
                        </button>
                        <button
                          onClick={() => navigate(`/workers/${worker.id}`)}
                          className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium text-[10px]"
                        >
                          Profile
                        </button>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>

            {/* Floating worker panel on map */}
            <AnimatePresence>
              {selectedWorker && viewMode === 'map' && (
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 20, opacity: 0 }}
                  className="absolute bottom-4 left-4 right-4 z-[1000]"
                  style={{ maxWidth: '440px', margin: '0 auto' }}
                >
                  <div className="glass-panel rounded-2xl p-4">
                    <div className="flex items-start gap-3">
                      <img src={selectedWorker.avatar} alt={selectedWorker.displayName}
                        className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-white font-bold">{selectedWorker.displayName}</span>
                          <div className="verified-badge text-[10px]">✓ {selectedWorker.verificationBadge}</div>
                        </div>
                        <div className="flex items-center gap-2 mb-1">
                          <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                          <span className="text-yellow-300 text-sm font-bold">{selectedWorker.rating}</span>
                          <span className="text-gray-500 text-xs">({selectedWorker.reviewCount})</span>
                        </div>
                        <p className="text-gray-400 text-xs">{selectedWorker.profession}</p>
                      </div>
                      <button onClick={() => setSelectedWorker(null)} className="text-gray-500 hover:text-white p-1">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex gap-3 mt-3">
                      <button className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-primary-300 flex items-center justify-center gap-1.5"
                        style={{ border: '1px solid rgba(109,40,217,0.4)' }}>
                        <MessageSquare className="w-4 h-4" />Chat Pro
                      </button>
                      <button className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-1.5"
                        style={{ background: 'linear-gradient(135deg,#6D28D9,#7C3AED)', boxShadow: '0 4px 16px rgba(109,40,217,0.4)' }}
                        onClick={() => navigate(`/book/${selectedWorker.id}`)}>
                        <Zap className="w-4 h-4" />
                        Book Immediate ({formatCurrency(selectedWorker.calloutRate ?? 0)})
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Zone notification */}
            <div className="absolute top-4 left-4 z-[1000]">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-white font-medium"
                style={{ background: 'rgba(23,19,38,0.85)', backdropFilter: 'blur(12px)', border: '1px solid rgba(167,139,250,0.2)' }}>
                <div className="flex -space-x-1">
                  {['TH', 'NG', 'IM'].map((s) => (
                    <div key={s} className="w-5 h-5 rounded-full bg-primary-700 border border-dark-bg flex items-center justify-center text-[8px] font-bold">
                      {s}
                    </div>
                  ))}
                </div>
                18 Techs ready in GRA Zone 2
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Escrow guarantee bar */}
      <div className="px-4 py-3"
        style={{ borderTop: '1px solid rgba(167,139,250,0.1)', background: 'rgba(23,19,38,0.6)' }}>
        <div className="max-w-[1400px] mx-auto flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary-700/30 flex items-center justify-center flex-shrink-0">
            <Shield className="w-4 h-4 text-primary-400" />
          </div>
          <div>
            <div className="text-white text-sm font-semibold">LocalFix 100% Escrow & Neighborhood Guarantee</div>
            <div className="text-gray-400 text-xs">Funds are only released to technicians once your work inspection checklist is signed off.</div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-gray-500 text-xs">Identity Verified with NIM & Trade Union Registry</span>
            <button className="text-primary-400 text-xs font-medium hover:text-primary-300">Learn More →</button>
          </div>
        </div>
      </div>
    </div>
  )
}
