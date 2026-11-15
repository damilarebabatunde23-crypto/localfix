import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Theme, User } from '@/types'

interface AppState {
  // Theme
  theme: Theme
  setTheme: (theme: Theme) => void

  // Auth
  user: User | null
  accessToken: string | null
  setUser: (user: User | null) => void
  setAccessToken: (token: string | null) => void
  logout: () => void
  isAuthenticated: boolean

  // Location & Global Currency
  currency: string
  setCurrency: (c: string) => void
  userLocation: { lat: number; lng: number } | null
  locationName: string
  hasLocationSet: boolean
  isDeviceGps: boolean
  gpsAccuracy?: number
  gpsUpdatedAt?: string
  isLocationPromptOpen: boolean
  setLocationPromptOpen: (open: boolean) => void
  setUserLocation: (loc: { lat: number; lng: number } | null, name: string) => void
  requestGPSLocation: () => Promise<boolean>

  // UI
  isMobileNavOpen: boolean
  setMobileNavOpen: (open: boolean) => void
  unreadMessages: number
  unreadNotifications: number
  setUnreadCounts: (messages: number, notifications: number) => void

  // Search
  searchQuery: string
  setSearchQuery: (q: string) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Theme
      theme: 'dark',
      setTheme: (theme) => {
        set({ theme })
        const root = document.documentElement
        if (theme === 'dark') {
          root.classList.add('dark')
        } else if (theme === 'light') {
          root.classList.remove('dark')
        } else {
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
          root.classList.toggle('dark', prefersDark)
        }
      },

      // Auth
      user: null,
      accessToken: null,
      isAuthenticated: false,
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setAccessToken: (token) => set({ accessToken: token }),
      logout: () => {
        set({ user: null, accessToken: null, isAuthenticated: false })
        localStorage.removeItem('localfix-refresh')
      },

      // Location & Global Currency
      currency: 'USD',
      setCurrency: (currency) => set({ currency }),
      userLocation: { lat: 6.5887, lng: 3.3645 },
      locationName: 'Ikeja, Lagos, Nigeria',
      hasLocationSet: true,
      isDeviceGps: false,
      gpsAccuracy: undefined,
      gpsUpdatedAt: undefined,
      isLocationPromptOpen: false, // Don't show manual prompt - device automatically chooses
      setLocationPromptOpen: (open) => set({ isLocationPromptOpen: open }),
      setUserLocation: (loc, name) => {
        set({ userLocation: loc, locationName: name, hasLocationSet: true, isLocationPromptOpen: false })
      },
      requestGPSLocation: async () => {
        // Helper to do IP-based geolocation fallback if device GPS is denied or times out
        const fallbackToIpLocation = async (resolve: (val: boolean) => void) => {
          try {
            const res = await fetch('https://ipapi.co/json/')
            if (res.ok) {
              const data = await res.json()
              const lat = parseFloat(data.latitude) || 6.5887
              const lng = parseFloat(data.longitude) || 3.3645
              const city = data.city || ''
              const region = data.region || ''
              const country = data.country_name || ''
              const detectedName = [city, region, country].filter(Boolean).join(', ')

              set({
                userLocation: { lat, lng },
                locationName: detectedName || 'Lagos, Nigeria',
                hasLocationSet: true,
                isDeviceGps: false,
                gpsAccuracy: 1000,
                gpsUpdatedAt: new Date().toISOString(),
                isLocationPromptOpen: false,
              })

              if (get().isAuthenticated && get().user) {
                try {
                  const { authApi } = await import('@/lib/api')
                  authApi.updateProfile({
                    latitude: lat,
                    longitude: lng,
                    location_name: detectedName,
                  }).catch(() => {})
                } catch {
                  // Ignore
                }
              }

              resolve(true)
              return
            }
          } catch {
            // Secondary fallback
          }

          // If both fail, ensure a sensible default so UI never hangs
          set({
            userLocation: { lat: 6.5887, lng: 3.3645 },
            locationName: 'Ikeja, Lagos, Nigeria',
            hasLocationSet: true,
            isLocationPromptOpen: false,
          })
          resolve(false)
        }

        return new Promise<boolean>((resolve) => {
          if (!navigator.geolocation) {
            fallbackToIpLocation(resolve)
            return
          }

          let didRespond = false

          // Set a safety timeout: if browser GPS prompt takes > 4s, fallback to IP location
          const timeoutId = setTimeout(() => {
            if (!didRespond) {
              didRespond = true
              fallbackToIpLocation(resolve)
            }
          }, 4000)

          navigator.geolocation.getCurrentPosition(
            async (position) => {
              if (didRespond) return
              didRespond = true
              clearTimeout(timeoutId)

              const lat = position.coords.latitude
              const lng = position.coords.longitude
              const accuracy = Math.round(position.coords.accuracy || 10)
              let name = `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`

              try {
                // Free OpenStreetMap reverse geocoding to exact street
                const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`, {
                  headers: { 'Accept-Language': 'en' },
                })
                if (res.ok) {
                  const data = await res.json()
                  const road = data.address?.road || data.address?.pedestrian || data.address?.street || ''
                  const houseNumber = data.address?.house_number || ''
                  const suburb = data.address?.suburb || data.address?.neighbourhood || data.address?.quarter || ''
                  const city = data.address?.city || data.address?.town || data.address?.county || data.address?.municipality || ''
                  const state = data.address?.state || ''
                  const country = data.address?.country || ''

                  const streetPart = road ? (houseNumber ? `${houseNumber} ${road}` : road) : ''
                  const areaPart = suburb || city || state || ''

                  if (streetPart && areaPart) {
                    name = `${streetPart}, ${areaPart}${country ? ` (${country})` : ''}`
                  } else if (suburb && city) {
                    name = `${suburb}, ${city}${country ? ` (${country})` : ''}`
                  } else if (city && country) {
                    name = `${city}, ${country}`
                  } else if (data.display_name) {
                    name = data.display_name.split(',').slice(0, 3).join(', ')
                  }
                }
              } catch {
                // Fallback coordinates
              }

              const nowIso = new Date().toISOString()
              set({
                userLocation: { lat, lng },
                locationName: name,
                hasLocationSet: true,
                isDeviceGps: true,
                gpsAccuracy: accuracy,
                gpsUpdatedAt: nowIso,
                isLocationPromptOpen: false,
              })

              // Sync with user profile on backend if logged in
              if (get().isAuthenticated && get().user) {
                try {
                  const { authApi } = await import('@/lib/api')
                  authApi.updateProfile({
                    latitude: lat,
                    longitude: lng,
                    location_name: name,
                  }).catch(() => {})
                } catch {
                  // Ignore
                }
              }

              resolve(true)
            },
            () => {
              if (didRespond) return
              didRespond = true
              clearTimeout(timeoutId)
              fallbackToIpLocation(resolve)
            },
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 10000 }
          )
        })
      },

      // UI
      isMobileNavOpen: false,
      setMobileNavOpen: (open) => set({ isMobileNavOpen: open }),
      unreadMessages: 3,
      unreadNotifications: 7,
      setUnreadCounts: (messages, notifications) =>
        set({ unreadMessages: messages, unreadNotifications: notifications }),

      // Search
      searchQuery: '',
      setSearchQuery: (q) => set({ searchQuery: q }),
    }),
    {
      name: 'localfix-app',
      partialize: (state) => ({
        theme: state.theme,
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
        currency: state.currency,
        userLocation: state.userLocation,
        locationName: state.locationName,
        hasLocationSet: state.hasLocationSet,
        isDeviceGps: state.isDeviceGps,
        gpsAccuracy: state.gpsAccuracy,
        gpsUpdatedAt: state.gpsUpdatedAt,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Clean up any corrupt or legacy dummy tokens
          if (state.accessToken && (!state.accessToken.includes('.') || state.accessToken === 'demo-jwt-token-verified')) {
            state.accessToken = null
            state.isAuthenticated = false
            state.user = null
            localStorage.removeItem('localfix-refresh')
          }
          // Automatically let device acquire GPS on rehydration
          setTimeout(() => {
            state.requestGPSLocation().catch(() => {})
          }, 300)
          // Apply theme on rehydration
          const root = document.documentElement
          if (state.theme === 'dark') root.classList.add('dark')
          else if (state.theme === 'light') root.classList.remove('dark')
        }
      },
    }
  )
)
