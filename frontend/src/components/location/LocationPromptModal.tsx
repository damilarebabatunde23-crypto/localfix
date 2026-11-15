import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MapPin,
  Navigation,
  CheckCircle,
  X,
  Search,
  ShieldCheck,
  Compass,
  AlertCircle,
  Sparkles,
  Radio,
  Users,
} from 'lucide-react'
import { useAppStore } from '@/stores/useAppStore'
import { authApi } from '@/lib/api'
import toast from 'react-hot-toast'

interface PresetLocation {
  name: string
  lat: number
  lng: number
  region: string
}

const PRESET_LOCATIONS: PresetLocation[] = [
  { name: 'Ikeja GRA, Lagos', lat: 6.5916, lng: 3.3575, region: 'Lagos Mainland' },
  { name: 'Lekki Phase 1, Lagos', lat: 6.4474, lng: 3.4839, region: 'Lagos Island' },
  { name: 'Victoria Island, Lagos', lat: 6.4281, lng: 3.4219, region: 'Lagos Island' },
  { name: 'Surulere / Yaba, Lagos', lat: 6.4969, lng: 3.3619, region: 'Lagos Central' },
  { name: 'Garki, Abuja (FCT)', lat: 9.0765, lng: 7.3986, region: 'Federal Capital' },
  { name: 'Wuse 2, Abuja (FCT)', lat: 9.0833, lng: 7.4667, region: 'Federal Capital' },
  { name: 'Port Harcourt, Rivers', lat: 4.8156, lng: 7.0498, region: 'Rivers State' },
  { name: 'Ibadan, Oyo State', lat: 7.3775, lng: 3.9470, region: 'South West' },
  { name: 'Enugu Urban, Enugu', lat: 6.4584, lng: 7.5464, region: 'South East' },
  { name: 'Kano Central, Kano', lat: 12.0022, lng: 8.5920, region: 'Northern Hub' },
  { name: 'London, United Kingdom', lat: 51.5074, lng: -0.1278, region: 'International' },
  { name: 'New York, USA', lat: 40.7128, lng: -74.0060, region: 'International' },
]

export default function LocationPromptModal() {
  const {
    isLocationPromptOpen,
    setLocationPromptOpen,
    userLocation,
    locationName,
    hasLocationSet,
    isDeviceGps,
    gpsAccuracy,
    setUserLocation,
    requestGPSLocation,
    isAuthenticated,
  } = useAppStore()

  const [loadingGPS, setLoadingGPS] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [autoAttempted, setAutoAttempted] = useState(false)

  // Auto-request device location on initial prompt!
  useEffect(() => {
    if (isLocationPromptOpen && !hasLocationSet && !autoAttempted) {
      setAutoAttempted(true)
      handleTurnOnGPS()
    }
  }, [isLocationPromptOpen, hasLocationSet])

  if (!isLocationPromptOpen) return null

  const handleTurnOnGPS = async () => {
    setLoadingGPS(true)
    setErrorMessage(null)

    try {
      const success = await requestGPSLocation()
      if (success) {
        toast.success('Device GPS acquired and saved to profile!', { icon: '📍' })
        const currentLoc = useAppStore.getState().userLocation
        const currentName = useAppStore.getState().locationName
        if (isAuthenticated && currentLoc) {
          authApi
            .updateProfile({
              latitude: currentLoc.lat,
              longitude: currentLoc.lng,
              location_name: currentName,
            })
            .catch(() => {})
        }
      } else {
        setErrorMessage('Device GPS access was not granted by browser. Please tap below or select your city manually.')
      }
    } catch {
      setErrorMessage('Location services unavailable. Please select your area below.')
    } finally {
      setLoadingGPS(false)
    }
  }

  const handleSelectPreset = (preset: PresetLocation) => {
    setUserLocation({ lat: preset.lat, lng: preset.lng }, preset.name)
    toast.success(`Location set to ${preset.name}!`, { icon: '📍' })

    if (isAuthenticated) {
      authApi
        .updateProfile({
          latitude: preset.lat,
          longitude: preset.lng,
          location_name: preset.name,
        })
        .catch(() => {})
    }
  }

  const filteredPresets = PRESET_LOCATIONS.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.region.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none">
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 25 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 25 }}
        className="w-full max-w-lg rounded-3xl overflow-hidden flex flex-col shadow-2xl relative"
        style={{
          background: 'linear-gradient(180deg, #1b1531 0%, #120e22 100%)',
          border: '1.5px solid rgba(167, 139, 250, 0.3)',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8), 0 0 35px rgba(109, 40, 217, 0.25)',
        }}
      >
        {/* Close button if user already has a location previously set */}
        {hasLocationSet && (
          <button
            onClick={() => setLocationPromptOpen(false)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-colors z-20 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Header Hero */}
        <div className="p-6 text-center relative overflow-hidden bg-gradient-to-b from-primary-900/40 to-transparent">
          {/* Pulsing Radar Ring Visual */}
          <div className="relative mx-auto w-20 h-20 mb-4 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-primary-600/20 animate-ping" />
            <div className="absolute -inset-3 rounded-full bg-primary-500/10 animate-pulse" />
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center shadow-lg relative z-10"
              style={{ background: 'linear-gradient(135deg, #6D28D9 0%, #2563EB 100%)' }}
            >
              <Navigation className="w-8 h-8 text-white animate-bounce" />
            </div>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">Turn On Device Location</h2>
          <p className="text-xs text-gray-300 mt-2 max-w-sm mx-auto leading-relaxed">
            Your real device location is required so nearby clients and employers can find you, and to show you verified artisans closest to your device.
          </p>

          {/* Current location pill if set */}
          {hasLocationSet ? (
            <div className="inline-flex flex-col items-center gap-1 mt-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                <Radio className="w-3.5 h-3.5 animate-pulse" />
                <span>Device GPS: {locationName}</span>
              </div>
              <span className="text-[10px] text-gray-400">
                Visible to profile visitors & anyone searching nearby
              </span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-500/20 text-primary-300 text-[11px] font-semibold mt-3 animate-pulse">
              <Compass className="w-3.5 h-3.5" />
              <span>Auto-detecting device GPS position...</span>
            </div>
          )}
        </div>

        {/* Content & Action Area */}
        <div className="px-6 pb-6 space-y-4">
          {/* Main Action: Turn on GPS Button */}
          <button
            onClick={handleTurnOnGPS}
            disabled={loadingGPS}
            className="w-full py-4 px-5 rounded-2xl text-white font-bold text-sm flex items-center justify-center gap-2.5 transition-all shadow-xl hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            style={{
              background: 'linear-gradient(135deg, #2563EB 0%, #6D28D9 100%)',
              boxShadow: '0 8px 24px rgba(37, 99, 235, 0.35)',
            }}
          >
            <Compass className={`w-5 h-5 ${loadingGPS ? 'animate-spin' : ''}`} />
            <span>{loadingGPS ? 'Locking Device GPS Satellite...' : '📍 Auto-Detect My Real Device Location'}</span>
          </button>

          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2.5 leading-relaxed">
              <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="block text-white mb-0.5">Device Location Permission Required</strong>
                {errorMessage}
              </div>
            </div>
          )}

          {/* Device GPS Guarantee Info */}
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1.5 text-xs text-gray-300">
            <div className="flex items-center gap-2 text-white font-semibold">
              <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span>Automatic Real-Life Satellite Geolocation</span>
            </div>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              Your device will automatically identify your real street address, city, and nearest vetted technicians — no manual typing or guesswork needed.
            </p>
          </div>

          {/* Trust reassurance footer */}
          <div className="pt-2 text-center text-[11px] text-gray-500 flex items-center justify-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Encrypted location verification · Never sold or shared with 3rd parties</span>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
