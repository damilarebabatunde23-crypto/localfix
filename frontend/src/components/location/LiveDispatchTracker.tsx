import { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Navigation,
  Phone,
  Video,
  MessageSquare,
  ShieldCheck,
  Clock,
  Compass,
  CheckCircle,
  MapPin,
  Car,
  Bike,
  Sparkles,
  Layers,
  Locate,
  Radio,
  Eye,
  Maximize2,
  Volume2,
  VolumeX,
  ChevronRight
} from 'lucide-react'
import { useChatStore } from '@/stores/useChatStore'
import { formatDistance, calculateDistanceKm } from '@/lib/utils'
import { bookingsApi } from '@/lib/api'
import toast from 'react-hot-toast'

interface LiveDispatchTrackerProps {
  bookingCode: string
  artisanName: string
  artisanProfession: string
  artisanAvatar: string
  artisanPhone?: string
  artisanWhatsapp?: string
  customerAddress: string
  customerLat?: number
  customerLng?: number
  initialArtisanLat?: number
  initialArtisanLng?: number
  isWorkerMode?: boolean
}

type MapLayerType = 'satellite' | 'streets' | 'dark'

// Helper component to auto-pan map to moving vehicle if auto-follow is enabled
function AutoFollowController({
  position,
  isFollowing,
}: {
  position: [number, number]
  isFollowing: boolean
}) {
  const map = useMap()
  useEffect(() => {
    if (isFollowing) {
      map.panTo(position, { animate: true, duration: 1.2 })
    }
  }, [position, isFollowing, map])
  return null
}

// Helper component to fit route on initial load
function FitRouteBounds({ coords }: { coords: [number, number][] }) {
  const map = useMap()
  const hasFitRef = useRef(false)
  useEffect(() => {
    if (coords.length >= 2 && !hasFitRef.current) {
      const bounds = L.latLngBounds(coords)
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 })
      hasFitRef.current = true
    }
  }, [coords, map])
  return null
}

// Invalidate Leaflet map size on layer change or fullscreen toggle
function MapResizer({ mapLayer, isFullscreen }: { mapLayer: string; isFullscreen: boolean }) {
  const map = useMap()
  useEffect(() => {
    map.invalidateSize()
    const t1 = setTimeout(() => map.invalidateSize(), 80)
    const t2 = setTimeout(() => map.invalidateSize(), 300)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [mapLayer, isFullscreen, map])

  useEffect(() => {
    const handleResize = () => map.invalidateSize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [map])

  return null
}

export default function LiveDispatchTracker({
  bookingCode,
  artisanName,
  artisanProfession,
  artisanAvatar,
  artisanPhone = '+1 800 555 0199',
  artisanWhatsapp = '18005550199',
  customerAddress,
  customerLat = 6.5916,
  customerLng = 3.3575,
  initialArtisanLat = 6.612,
  initialArtisanLng = 3.345,
  isWorkerMode = false,
}: LiveDispatchTrackerProps) {
  // Map Layer selection: satellite (real photo) vs streets vs dark radar
  const [mapLayer, setMapLayer] = useState<MapLayerType>('satellite')
  const [isFollowingVehicle, setIsFollowingVehicle] = useState(true)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Real road route geometry from OSRM driving engine
  const [roadCoordinates, setRoadCoordinates] = useState<[number, number][]>([])
  const [routeSteps, setRouteSteps] = useState<string[]>([])
  const [currentStepText, setCurrentStepText] = useState('Navigating along route')
  const [totalRoadDistanceKm, setTotalRoadDistanceKm] = useState(3.5)

  // Real-time telemetry
  const [currentWaypointIndex, setCurrentWaypointIndex] = useState(0)
  const [currentLat, setCurrentLat] = useState(initialArtisanLat)
  const [currentLng, setCurrentLng] = useState(initialArtisanLng)
  const [headingDeg, setHeadingDeg] = useState(0)
  const [speedKmh, setSpeedKmh] = useState(38)
  const [etaMins, setEtaMins] = useState(12)
  const [transitStatus, setTransitStatus] = useState<'dispatched' | 'en_route' | 'arriving' | 'arrived'>('en_route')

  // Real device phone GPS streaming state
  const [isLivePhoneGpsActive, setIsLivePhoneGpsActive] = useState(false)
  const watchIdRef = useRef<number | null>(null)

  // 1. Fetch real road geometry from OpenStreetMap / OSRM Driving Engine
  useEffect(() => {
    let isMounted = true

    async function fetchRealRoadRoute() {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${initialArtisanLng},${initialArtisanLat};${customerLng},${customerLat}?overview=full&geometries=geojson&steps=true`
        const res = await fetch(url)
        if (res.ok) {
          const data = await res.json()
          if (data.routes && data.routes.length > 0 && isMounted) {
            const route = data.routes[0]
            const coords: [number, number][] = route.geometry.coordinates.map(
              (c: [number, number]) => [c[1], c[0]] // convert [lng, lat] to [lat, lng]
            )

            setRoadCoordinates(coords)
            const distance = (route.distance / 1000).toFixed(1)
            setTotalRoadDistanceKm(parseFloat(distance))
            setEtaMins(Math.max(1, Math.round(route.duration / 60)))

            // Extract real street step names
            if (route.legs && route.legs[0]?.steps) {
              const steps = route.legs[0].steps
                .map((s: any) => s.name || s.maneuver?.type)
                .filter(Boolean)
              if (steps.length > 0) {
                setRouteSteps(steps)
                setCurrentStepText(`Driving on ${steps[0] || 'designated highway'}`)
              }
            }
            return
          }
        }
      } catch {
        // fallback to smooth interpolation if offline
      }

      // Fallback: Generate high-density interpolated road path
      if (isMounted) {
        const fallback: [number, number][] = []
        const steps = 30
        for (let i = 0; i <= steps; i++) {
          const r = i / steps
          const lat = initialArtisanLat + (customerLat - initialArtisanLat) * r
          const lng = initialArtisanLng + (customerLng - initialArtisanLng) * r
          fallback.push([lat, lng])
        }
        setRoadCoordinates(fallback)
      }
    }

    fetchRealRoadRoute()
    return () => {
      isMounted = false
    }
  }, [initialArtisanLat, initialArtisanLng, customerLat, customerLng])

  // 2. Real-time Uber-Style movement along the real road network
  useEffect(() => {
    if (roadCoordinates.length === 0 || isLivePhoneGpsActive) return

    const interval = setInterval(() => {
      setCurrentWaypointIndex((prevIndex) => {
        if (prevIndex >= roadCoordinates.length - 1) {
          setTransitStatus('arrived')
          setEtaMins(0)
          setSpeedKmh(0)
          setCurrentStepText('Arrived at customer doorstep!')
          return prevIndex
        }

        const nextIndex = prevIndex + 1
        const pt = roadCoordinates[nextIndex]
        const prevPt = roadCoordinates[prevIndex]

        // Calculate vehicle bearing / heading angle
        const dLng = pt[1] - prevPt[1]
        const dLat = pt[0] - prevPt[0]
        const angle = (Math.atan2(dLng, dLat) * 180) / Math.PI
        setHeadingDeg(Math.round(angle >= 0 ? angle : 360 + angle))

        setCurrentLat(pt[0])
        setCurrentLng(pt[1])

        const remainingSteps = roadCoordinates.length - nextIndex
        const progressRatio = nextIndex / roadCoordinates.length

        if (progressRatio >= 0.88) {
          setTransitStatus('arriving')
          setCurrentStepText('Approaching destination entrance')
        } else if (progressRatio >= 0.05) {
          setTransitStatus('en_route')
          if (routeSteps.length > 0) {
            const stepIdx = Math.min(
              routeSteps.length - 1,
              Math.floor(progressRatio * routeSteps.length)
            )
            setCurrentStepText(`Turn via ${routeSteps[stepIdx] || 'Main Route'}`)
          }
        }

        setEtaMins(Math.max(1, Math.round((1.0 - progressRatio) * 14)))
        setSpeedKmh(Math.floor(28 + Math.random() * 15))

        // Periodically broadcast telemetry to backend
        if (nextIndex % 4 === 0 && bookingCode && bookingCode !== 'LX-PENDING') {
          bookingsApi.updateLiveLocation(bookingCode, {
            latitude: pt[0],
            longitude: pt[1],
            speed: 35,
            heading: angle,
            transit_status: progressRatio >= 0.88 ? 'arrived' : 'en_route',
          }).catch(() => {})
        }

        return nextIndex
      })
    }, 2800)

    return () => clearInterval(interval)
  }, [roadCoordinates, isLivePhoneGpsActive, routeSteps, bookingCode])

  // 3. Worker real device phone GPS streaming (watchPosition)
  const toggleLivePhoneGps = () => {
    if (isLivePhoneGpsActive) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
      setIsLivePhoneGpsActive(false)
      toast('Live phone GPS streaming paused')
    } else {
      if (!navigator.geolocation) {
        toast.error('Geolocation is not supported by your browser')
        return
      }

      toast.loading('Connecting to device satellite GPS...', { id: 'gps-connect' })
      const id = navigator.geolocation.watchPosition(
        (pos) => {
          toast.dismiss('gps-connect')
          const lat = pos.coords.latitude
          const lng = pos.coords.longitude
          const spd = pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : 32
          const hdg = pos.coords.heading || 0

          setCurrentLat(lat)
          setCurrentLng(lng)
          setSpeedKmh(spd)
          setHeadingDeg(hdg)
          setIsLivePhoneGpsActive(true)

          if (bookingCode && bookingCode !== 'LX-PENDING') {
            bookingsApi.updateLiveLocation(bookingCode, {
              latitude: lat,
              longitude: lng,
              speed: spd,
              heading: hdg,
              transit_status: 'en_route',
            }).catch(() => {})
          }
        },
        (err) => {
          toast.dismiss('gps-connect')
          toast.error(`GPS error: ${err.message}`)
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 3000 }
      )
      watchIdRef.current = id
      toast.success('Streaming real device GPS live to employer!')
    }
  }

  // Cleanup GPS watcher on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
    }
  }, [])

  // Custom Markers
  const customerDestinationIcon = L.divIcon({
    className: '',
    html: `
      <div style="position:relative; width:52px; height:52px; display:flex; align-items:center; justify-content:center;">
        <div style="position:absolute; inset:0; border-radius:50%; background:rgba(109,40,217,0.35); animation:ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="width:40px; height:40px; border-radius:50%; background:#6D28D9; border:3px solid white; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 20px rgba(109,40,217,0.8); color:white; font-size:18px;">
          🏠
        </div>
      </div>
    `,
    iconSize: [52, 52],
    iconAnchor: [26, 26],
  })

  // Dynamic rotating vehicle marker showing heading on real streets!
  const artisanVehicleIcon = L.divIcon({
    className: '',
    html: `
      <div style="position:relative; width:58px; height:58px; display:flex; align-items:center; justify-content:center;">
        <!-- Pulsing radar glow -->
        <div style="position:absolute; inset:0; border-radius:50%; background:rgba(16,185,129,0.4); animation:pulse 1.8s ease-in-out infinite;"></div>
        
        <!-- Artisan Photo Circle -->
        <div style="width:46px; height:46px; border-radius:50%; overflow:hidden; border:3px solid #10B981; box-shadow:0 6px 25px rgba(0,0,0,0.8); background:#1F1635; z-index:2;">
          <img src="${artisanAvatar}" style="width:100%; height:100%; object-fit:cover;" />
        </div>

        <!-- Directional Vehicle Arrow indicator rotating with street heading -->
        <div style="position:absolute; bottom:-6px; right:-6px; width:24px; height:24px; border-radius:50%; background:#10B981; border:2.5px solid white; display:flex; align-items:center; justify-content:center; color:white; font-size:11px; z-index:3; transform:rotate(${headingDeg}deg); transition:transform 0.5s ease-out; box-shadow:0 2px 8px rgba(0,0,0,0.5);">
          🚗
        </div>
      </div>
    `,
    iconSize: [58, 58],
    iconAnchor: [29, 29],
  })

  const distanceRemainingKm = calculateDistanceKm(currentLat, currentLng, customerLat, customerLng)

  return (
    <div
      className={`glass-panel rounded-3xl overflow-hidden border border-primary-500/30 mb-6 shadow-2xl transition-all ${
        isFullscreen ? 'fixed inset-4 z-50 rounded-3xl' : 'relative'
      }`}
    >
      {/* ── Top Uber/InDrive Telemetry HUD ── */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-purple-950/90 via-[#130d24] to-primary-950/90 border-b border-white/10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
          {/* Worker Info */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <img
                src={artisanAvatar}
                alt={artisanName}
                className="w-13 h-13 rounded-2xl object-cover border-2 border-emerald-400 shadow-md"
              />
              <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-dark-bg flex items-center justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-base">{artisanName}</h3>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                    transitStatus === 'arrived'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 animate-pulse'
                      : 'bg-primary-500/20 text-primary-300 border-primary-500/40'
                  }`}
                >
                  {transitStatus === 'arrived'
                    ? '✓ Arrived on Site'
                    : isLivePhoneGpsActive
                    ? '● Live Phone GPS'
                    : 'En Route (Live Telemetry)'}
                </span>
              </div>
              <p className="text-xs text-primary-300">{artisanProfession}</p>
            </div>
          </div>

          {/* Real-time ETA & Speed Dial */}
          <div className="flex items-center gap-3 bg-black/50 px-4 py-2.5 rounded-2xl border border-white/15 backdrop-blur-md">
            <div className="text-right">
              <div className="text-[10px] uppercase font-bold text-gray-400">Estimated Arrival</div>
              <div className="text-base font-black text-white">
                {transitStatus === 'arrived' ? (
                  <span className="text-emerald-400">At Doorstep!</span>
                ) : (
                  <span>~{etaMins} mins ({distanceRemainingKm.toFixed(1)} km)</span>
                )}
              </div>
            </div>
            <div className="w-px h-8 bg-white/15" />
            <div className="text-center min-w-[50px]">
              <div className="text-[10px] uppercase font-bold text-gray-400">Speed</div>
              <div className="text-sm font-black text-emerald-400">{speedKmh} km/h</div>
            </div>
          </div>
        </div>

        {/* Turn-by-Turn Street Status Banner */}
        <div className="p-2.5 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-gray-200 truncate">
            <Compass className="w-4 h-4 text-emerald-400 flex-shrink-0 animate-spin" />
            <span className="font-medium text-white truncate">{currentStepText}</span>
          </div>
          <div className="text-[11px] text-primary-300 flex-shrink-0 font-semibold">
            Heading: {headingDeg}°
          </div>
        </div>
      </div>

      {/* ── Interactive Map Canvas ── */}
      <div className={`w-full relative ${isFullscreen ? 'h-[calc(100%-140px)]' : 'h-[360px] sm:h-[420px]'}`}>
        <MapContainer
          center={[currentLat, currentLng]}
          zoom={15}
          scrollWheelZoom={true}
          className="h-full w-full"
        >
          <MapResizer mapLayer={mapLayer} isFullscreen={isFullscreen} />

          {/* Layer 1: REAL-LIFE SATELLITE PHOTOGRAPHY (Esri World Imagery) */}
          {mapLayer === 'satellite' && (
            <>
              <TileLayer
                key="satellite"
                attribution='Tiles &copy; Esri &mdash; High-Resolution Satellite'
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                maxZoom={19}
              />
              {/* Overlay roads & city street names onto satellite imagery */}
              <TileLayer
                key="satellite-roads"
                attribution='&copy; Esri Boundaries & Places'
                url="https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
                maxZoom={19}
                opacity={0.85}
              />
            </>
          )}

          {/* Layer 2: DETAILED REAL STREETS VIEW (Carto Voyager) */}
          {mapLayer === 'streets' && (
            <TileLayer
              key="streets"
              attribution='&copy; CARTO &copy; OpenStreetMap'
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png"
              subdomains={['a', 'b', 'c', 'd']}
              maxZoom={20}
            />
          )}

          {/* Layer 3: CYBER DARK RADAR / NIGHT MAP VIEW (Carto Dark Matter) */}
          {mapLayer === 'dark' && (
            <TileLayer
              key="dark"
              attribution='&copy; CARTO &copy; OpenStreetMap'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
              subdomains={['a', 'b', 'c', 'd']}
              maxZoom={20}
            />
          )}

          <FitRouteBounds coords={roadCoordinates} />
          <AutoFollowController position={[currentLat, currentLng]} isFollowing={isFollowingVehicle} />

          {/* Real road path polyline */}
          {roadCoordinates.length > 0 && (
            <Polyline
              positions={roadCoordinates}
              color="#10B981"
              weight={5}
              opacity={0.9}
              dashArray="6, 8"
            />
          )}

          {/* Moving Artisan Vehicle Marker */}
          <Marker position={[currentLat, currentLng]} icon={artisanVehicleIcon} />

          {/* Customer Destination Marker */}
          <Marker position={[customerLat, customerLng]} icon={customerDestinationIcon} />
        </MapContainer>

        {/* ── Top Map Controls Overlay (Satellite / Streets / Dark Toggle) ── */}
        <div className="absolute top-3 left-3 z-[1000] flex flex-wrap items-center gap-1.5 bg-black/80 backdrop-blur-md p-1.5 rounded-2xl border border-white/20 shadow-xl">
          <button
            type="button"
            onClick={() => setMapLayer('satellite')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              mapLayer === 'satellite'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-gray-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <span>🛰️ Real Satellite</span>
          </button>
          <button
            type="button"
            onClick={() => setMapLayer('streets')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              mapLayer === 'streets'
                ? 'bg-primary-600 text-white shadow-md'
                : 'text-gray-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <span>🗺️ Streets</span>
          </button>
          <button
            type="button"
            onClick={() => setMapLayer('dark')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              mapLayer === 'dark'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-gray-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <span>🌙 Dark Radar</span>
          </button>
        </div>

        {/* ── Map Tool Buttons (Auto-Follow & Fullscreen) ── */}
        <div className="absolute top-3 right-3 z-[1000] flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsFollowingVehicle(!isFollowingVehicle)}
            title={isFollowingVehicle ? 'Auto-following vehicle' : 'Click to lock camera on vehicle'}
            className={`p-2 rounded-xl backdrop-blur-md border transition-all cursor-pointer ${
              isFollowingVehicle
                ? 'bg-emerald-600 border-emerald-400 text-white shadow-lg'
                : 'bg-black/75 border-white/20 text-gray-300 hover:text-white'
            }`}
          >
            <Locate className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 rounded-xl bg-black/75 backdrop-blur-md border border-white/20 text-gray-300 hover:text-white transition-all cursor-pointer"
            title="Toggle Fullscreen Map"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Bottom Controls & Dispatch Communication Dock ── */}
      <div className="p-4 bg-dark-bg/95 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
        {/* Real Phone GPS streaming button */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleLivePhoneGps}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border cursor-pointer ${
              isLivePhoneGpsActive
                ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500 animate-pulse'
                : 'bg-white/5 hover:bg-white/10 text-gray-300 border-white/15'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>{isLivePhoneGpsActive ? 'Streaming Real Phone GPS' : 'Broadcast Live Phone GPS'}</span>
          </button>
        </div>

        {/* Live Calling Actions */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Live In-App Voice Call */}
          <button
            type="button"
            onClick={() => {
              useChatStore.getState().startCall('audio', {
                id: bookingCode,
                name: artisanName,
                avatar: artisanAvatar,
                role: artisanProfession,
                phone: artisanPhone,
              })
              toast.success(`Starting live voice call with ${artisanName.split(' ')[0]}!`, { icon: '📞' })
            }}
            className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-glow cursor-pointer"
            title="Live Voice Call"
          >
            <Phone className="w-3.5 h-3.5" />
            <span>Voice Call</span>
          </button>

          {/* Live In-App Video Call */}
          <button
            type="button"
            onClick={() => {
              useChatStore.getState().startCall('video', {
                id: bookingCode,
                name: artisanName,
                avatar: artisanAvatar,
                role: artisanProfession,
                phone: artisanPhone,
              })
              toast.success(`Starting live video inspection with ${artisanName.split(' ')[0]}!`, { icon: '📹' })
            }}
            className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-glow cursor-pointer"
            title="Live Video Inspection"
          >
            <Video className="w-3.5 h-3.5" />
            <span>Live Video</span>
          </button>

          {/* Live Chat */}
          <button
            type="button"
            onClick={() => {
              useChatStore.getState().openChat({
                id: bookingCode,
                name: artisanName,
                avatar: artisanAvatar,
                role: artisanProfession,
                phone: artisanPhone,
              })
              toast.success(`Chat opened with ${artisanName.split(' ')[0]}!`)
            }}
            className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors border border-white/10 cursor-pointer"
            title="Chat in app"
          >
            <MessageSquare className="w-3.5 h-3.5 text-primary-400" />
            <span>Chat</span>
          </button>
        </div>
      </div>
    </div>
  )
}
