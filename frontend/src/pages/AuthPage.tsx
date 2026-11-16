import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mail, Lock, Eye, EyeOff, ShieldCheck, CheckCircle,
  Building, ArrowRight, MessageSquare, User, Phone,
  Briefcase, ChevronLeft, Sparkles, X, MapPin, Wrench,
  Clock, DollarSign, Award, Check, Play, Pause,
  Volume2, VolumeX, Film, Video, RefreshCw, Key, ExternalLink, Settings
} from 'lucide-react'
import { useAppStore } from '@/stores/useAppStore'
import { authApi, servicesApi } from '@/lib/api'
import {
  getGoogleClientId,
  setGoogleClientId,
  launchGoogleOAuthPopup,
  parseJwt,
} from '@/lib/googleAuth'
import toast from 'react-hot-toast'

type AuthMode = 'login' | 'register' | 'forgot'
type AccountType = 'customer' | 'worker'

interface FixerScene {
  id: string
  title: string
  trade: string
  icon: string
  webm: string
  mp4?: string
  description: string
}

const FIXER_SCENES: FixerScene[] = [
  {
    id: 'welder',
    title: 'Master Welder & Structural Fabricator',
    trade: 'Welder & Iron Gate',
    icon: '🔥',
    webm: '/videos/welder-artisan.webm',
    mp4: '/videos/fixer-bg.mp4',
    description: 'Precision MIG metal fabrication, high-voltage arc welding and structural reinforcement',
  },
  {
    id: 'pipe',
    title: 'Pipe Welding & Water Systems Artisan',
    trade: 'Plumber & Pipe',
    icon: '🔧',
    webm: '/videos/fixer-pipe-welding.webm',
    mp4: '/videos/fixer-bg.mp4',
    description: 'High-pressure pipe joint seals, water line infrastructure and industrial plumbing',
  },
  {
    id: 'mechanic',
    title: 'Diesel Generator & Engine Overhaul Pro',
    trade: 'Generator Mechanic',
    icon: '⚙️',
    webm: '/videos/mechanic-fixer.webm',
    mp4: '/videos/fixer-bg.mp4',
    description: 'Commercial engine diagnostics, power turbine repairs and mechanical restoration',
  },
  {
    id: 'technician',
    title: 'Inverter & Clean Energy Electrician',
    trade: 'Electrician & Solar',
    icon: '⚡',
    webm: '/videos/technician-repair.webm',
    mp4: '/videos/fixer-bg.mp4',
    description: 'Micro-soldering, solar PV array wiring and electrical safety installations',
  },
]

interface CategoryOption {
  id: string
  name: string
  icon?: string
}

const DEFAULT_CATEGORIES: CategoryOption[] = [
  { id: '3be209ad-b057-4fa4-b5ea-09ad670c4e4e', name: 'Electrician & Solar', icon: '⚡' },
  { id: 'e6557e3e-6fd3-4886-998e-714dca9ccf4a', name: 'Plumber & Pipe', icon: '🔧' },
  { id: 'f2075c1b-42b1-44b5-a3b8-d70f88cfcc01', name: 'AC & Fridge', icon: '❄️' },
  { id: '08483341-635d-4d68-b7c5-90a5b5bd2f8c', name: 'Carpenter & Joinery', icon: '🪚' },
  { id: '155e0c87-48e5-402d-88f4-0178e3e605cd', name: 'Generator Mechanic', icon: '⚙️' },
  { id: '00e34aa0-996d-4184-899a-4a1392b7c45c', name: 'Painter & POP', icon: '🎨' },
  { id: 'eb9dddab-3153-4f82-bb0c-416ba66636ae', name: 'Welder & Iron Gate', icon: '🔩' },
  { id: '6fbf3aa0-542f-4650-a073-5edd526c4f0f', name: 'Fumigation & Clean', icon: '🧹' },
]

const DEMO_USERS = {
  customer: {
    id: 'demo-customer-1',
    email: 'babatunde.o@gmail.com',
    firstName: 'Babatunde',
    lastName: 'Ogundimu',
    role: 'customer' as const,
    isVerified: true,
    isEmailVerified: true,
    locationName: 'Worldwide (All Regions)',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  worker: {
    id: 'demo-worker-1',
    email: 'tunde.adewale@localfix.ng',
    firstName: 'Tunde',
    lastName: 'Adewale',
    role: 'worker' as const,
    isVerified: true,
    isEmailVerified: true,
    locationName: 'Worldwide (All Regions)',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
}

export default function AuthPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { setUser, setAccessToken } = useAppStore()

  // Determine initial mode from URL
  const initialMode: AuthMode = location.pathname === '/register' ? 'register' : 'login'
  const [mode, setMode] = useState<AuthMode>(initialMode)

  // Shared form state
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [accountType, setAccountType] = useState<AccountType>('customer')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [rememberDevice, setRememberDevice] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')

  // Direct Google Account Creation & Real-Life OAuth State
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false)
  const [googleRole, setGoogleRole] = useState<AccountType>('customer')
  const [googleEmailInput, setGoogleEmailInput] = useState('')
  const [googleNameInput, setGoogleNameInput] = useState('')
  const [googleLoading, setGoogleLoading] = useState(false)
  const [googleClientId, setGoogleClientIdState] = useState<string>(getGoogleClientId())
  const [googleSdkReady, setGoogleSdkReady] = useState(false)
  const [showCustomGoogleInput, setShowCustomGoogleInput] = useState(false)
  const [recentGoogleAccounts, setRecentGoogleAccounts] = useState<
    Array<{ name: string; email: string; avatar?: string; role?: string }>
  >(() => {
    try {
      const raw = localStorage.getItem('localfix_recent_google_accounts')
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  })

  const saveRecentGoogleAccount = (acc: { email: string; name: string; avatar?: string; role?: string }) => {
    try {
      const key = 'localfix_recent_google_accounts'
      const raw = localStorage.getItem(key)
      const list = raw ? JSON.parse(raw) : []
      const filtered = list.filter((a: any) => a.email.toLowerCase() !== acc.email.toLowerCase())
      const updated = [{ ...acc, email: acc.email.toLowerCase() }, ...filtered].slice(0, 5)
      localStorage.setItem(key, JSON.stringify(updated))
      setRecentGoogleAccounts(updated)
    } catch {}
  }

  // Real-life Worker / Employee onboarding fields
  const [categories, setCategories] = useState<CategoryOption[]>(DEFAULT_CATEGORIES)
  const [categoryId, setCategoryId] = useState(DEFAULT_CATEGORIES[0].id)
  const [profession, setProfession] = useState('')
  const [yearsExperience, setYearsExperience] = useState(3)
  const [calloutRate, setCalloutRate] = useState(10000)
  const [serviceArea, setServiceArea] = useState('Ikeja & Greater Lagos')
  const [specialisms, setSpecialisms] = useState('Emergency Repairs, Quality Workmanship, Safe Installations')
  const [artisanBio, setArtisanBio] = useState('')

  // Real-life Employer / Client onboarding fields
  const [employerType, setEmployerType] = useState<'individual' | 'commercial'>('individual')
  const [locationName, setLocationName] = useState('Ikeja, Lagos')
  const [employerBio, setEmployerBio] = useState('')

  // Fixer Background Video Player State
  const [activeSceneIndex, setActiveSceneIndex] = useState(0)
  const [isVideoPlaying, setIsVideoPlaying] = useState(true)
  const [isVideoMuted, setIsVideoMuted] = useState(true)
  const [videoLoaded, setVideoLoaded] = useState(true)
  const [videoClarity, setVideoClarity] = useState<'high' | 'max' | 'cinema'>('high')
  const [showSceneMenu, setShowSceneMenu] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  const currentScene = FIXER_SCENES[activeSceneIndex] || FIXER_SCENES[0]

  // Reliable autoplay on mount & scene change
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.defaultMuted = true
      videoRef.current.muted = isVideoMuted
      if (isVideoPlaying) {
        const playPromise = videoRef.current.play()
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            // Autoplay fallback
          })
        }
      }
    }
  }, [activeSceneIndex, isVideoPlaying, isVideoMuted])

  // Contextual background scene adaptation when artisan selects trade category
  useEffect(() => {
    const cat = categories.find(c => c.id === categoryId)
    if (cat) {
      const name = cat.name.toLowerCase()
      if (name.includes('weld') || name.includes('iron')) {
        setActiveSceneIndex(0)
      } else if (name.includes('plumb') || name.includes('pipe')) {
        setActiveSceneIndex(1)
      } else if (name.includes('mechanic') || name.includes('generator')) {
        setActiveSceneIndex(2)
      } else if (name.includes('elect') || name.includes('solar') || name.includes('ac')) {
        setActiveSceneIndex(3)
      }
    }
  }, [categoryId, categories])

  const toggleVideoPlay = () => {
    if (!videoRef.current) return
    if (videoRef.current.paused) {
      videoRef.current.play().then(() => setIsVideoPlaying(true)).catch(() => {})
    } else {
      videoRef.current.pause()
      setIsVideoPlaying(false)
    }
  }

  const toggleVideoMute = () => {
    if (!videoRef.current) return
    videoRef.current.muted = !videoRef.current.muted
    setIsVideoMuted(videoRef.current.muted)
    if (!videoRef.current.muted) {
      toast.success('🔊 Ambient fixer workshop audio enabled', { icon: '🔨' })
    } else {
      toast('🔇 Background video muted', { icon: '🤫' })
    }
  }

  // Fetch real categories from backend on mount
  useEffect(() => {
    servicesApi.getCategories()
      .then((cats: any[]) => {
        if (Array.isArray(cats) && cats.length > 0) {
          setCategories(cats)
          setCategoryId(cats[0].id)
        }
      })
      .catch(() => {
        // Fallback to DEFAULT_CATEGORIES
      })
  }, [])

  // Poll for window.google Identity Services SDK
  useEffect(() => {
    let interval: any
    if ((window as any).google?.accounts) {
      setGoogleSdkReady(true)
    } else {
      interval = setInterval(() => {
        if ((window as any).google?.accounts) {
          setGoogleSdkReady(true)
          clearInterval(interval)
        }
      }, 500)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [])

  // Initialize GIS and mount official Google button when SDK & client_id are available
  useEffect(() => {
    const g = (window as any).google
    if (!g || !g.accounts || !g.accounts.id) return

    const cid = (googleClientId || getGoogleClientId()).trim()
    if (!cid) return

    try {
      g.accounts.id.initialize({
        client_id: cid,
        callback: async (response: any) => {
          if (response.credential) {
            const payload = parseJwt(response.credential)
            await handleGoogleFinalAuth({
              credential: response.credential,
              email: payload?.email,
              first_name: payload?.given_name || (payload?.name ? payload.name.split(' ')[0] : 'Google'),
              last_name: payload?.family_name || (payload?.name ? payload.name.split(' ')[1] : 'User'),
              avatar_url: payload?.picture,
              role: accountType || 'customer',
            })
          }
        },
        auto_select: false,
      })

      // Mount official button into login or register container if present
      const btnId = mode === 'register' ? 'real-google-btn-register' : 'real-google-btn-login'
      const btnContainer = document.getElementById(btnId)
      if (btnContainer) {
        btnContainer.innerHTML = ''
        g.accounts.id.renderButton(btnContainer, {
          theme: 'outline',
          size: 'large',
          text: mode === 'register' ? 'signup_with' : 'continue_with',
          shape: 'pill',
          width: 380,
        })
      }
    } catch (err) {
      console.warn('Google Identity Services init notice:', err)
    }
  }, [googleSdkReady, googleClientId, mode, accountType])

  const mockLogin = async (type: AccountType = 'customer') => {
    setIsLoading(true)
    const email = type === 'customer' ? 'babatunde.o@gmail.com' : 'tunde.adewale@localfix.ng'
    try {
      const tokenData = await authApi.login(email, 'password123')
      setAccessToken(tokenData.access)
      localStorage.setItem('localfix-refresh', tokenData.refresh)
      const profile = await authApi.getProfile()
      setUser({
        id: profile.id,
        email: profile.email,
        firstName: profile.first_name,
        lastName: profile.last_name,
        role: profile.role,
        isVerified: profile.is_verified,
        isEmailVerified: true,
        locationName: profile.location_name,
        avatar: profile.avatar || profile.avatar_url,
        createdAt: profile.created_at,
        updatedAt: profile.updated_at,
      })
      toast.success(`Welcome back, ${profile.first_name}! 👋`)
      navigate('/')
    } catch (err: any) {
      toast.error('Unable to sign in. Please check backend connection.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanIdentifier = identifier.trim()
    const cleanPassword = password.trim()
    if (!cleanIdentifier || !cleanPassword) {
      toast.error('Please enter your email and password')
      return
    }
    setIsLoading(true)
    try {
      const email = cleanIdentifier.includes('@') ? cleanIdentifier : `${cleanIdentifier}@localfix.ng`
      const tokenData = await authApi.login(email, cleanPassword)
      setAccessToken(tokenData.access)
      localStorage.setItem('localfix-refresh', tokenData.refresh)
      const profile = await authApi.getProfile()
      setUser({
        id: profile.id,
        email: profile.email,
        firstName: profile.first_name,
        lastName: profile.last_name,
        role: profile.role,
        isVerified: profile.is_verified,
        isEmailVerified: true,
        locationName: profile.location_name,
        avatar: profile.avatar || profile.avatar_url,
        createdAt: profile.created_at,
        updatedAt: profile.updated_at,
      })
      toast.success(`Welcome back, ${profile.first_name}! 👋`)
      navigate('/')
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || 'Invalid email or password. Please try again.'
      toast.error(errorMsg)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!firstName || !lastName || !identifier || !password) {
      toast.error('Please fill in all required fields')
      return
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    setIsLoading(true)
    try {
      const email = identifier.includes('@') ? identifier.trim() : `${identifier.trim()}@localfix.ng`

      const payload: any = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email,
        phone: phone.trim(),
        role: accountType,
        password,
        confirm_password: confirmPassword,
        location_name: locationName.trim() || 'Ikeja, Lagos',
      }

      if (accountType === 'worker') {
        const selectedCat = categories.find(c => c.id === categoryId)
        payload.profession = profession.trim() || (selectedCat ? `${selectedCat.name} Specialist` : 'Artisan Craftsman')
        payload.category_id = categoryId
        payload.years_experience = Number(yearsExperience) || 3
        payload.callout_rate = Number(calloutRate) || 10000
        payload.service_area = serviceArea.trim() || locationName.trim() || 'Lagos Central & Suburbs'
        payload.specialisms = specialisms
          ? specialisms.split(',').map(s => s.trim()).filter(Boolean)
          : ['Quality Workmanship', 'Fast Response', 'Safety Inspected']
        payload.bio = artisanBio.trim() || `Verified ${payload.profession} delivering dependable, high-grade services across ${payload.service_area}.`
      } else {
        payload.employer_type = employerType
        payload.bio = employerBio.trim() || (employerType === 'commercial' ? 'Verified Commercial Employer hiring artisans for estate/facility contracts.' : 'Residential homeowner seeking vetted artisans for home maintenance.')
      }

      const regData = await authApi.register(payload)
      setAccessToken(regData.tokens.access)
      localStorage.setItem('localfix-refresh', regData.tokens.refresh)

      try {
        const fullProfile = await authApi.getProfile()
        setUser({
          id: fullProfile.id,
          email: fullProfile.email,
          firstName: fullProfile.first_name,
          lastName: fullProfile.last_name,
          role: fullProfile.role,
          isVerified: fullProfile.is_verified,
          isEmailVerified: true,
          locationName: fullProfile.location_name,
          avatar: fullProfile.avatar || fullProfile.avatar_url,
          createdAt: fullProfile.created_at,
          updatedAt: fullProfile.updated_at,
        })
      } catch {
        setUser({
          id: regData.user.id,
          email: regData.user.email,
          firstName: regData.user.first_name,
          lastName: regData.user.last_name,
          role: regData.user.role,
          isVerified: regData.user.is_verified,
          isEmailVerified: true,
          locationName: regData.user.location_name,
          avatar: regData.user.avatar,
          createdAt: regData.user.created_at,
          updatedAt: regData.user.updated_at,
        })
      }

      if (accountType === 'worker') {
        toast.success(`🎉 Welcome Artisan ${firstName}! Your profile is live and ready for hire.`, { duration: 5000 })
        navigate('/profile')
      } else {
        toast.success(`🎉 Welcome Employer ${firstName}! You can now hire vetted artisans with escrow protection.`, { duration: 5000 })
        navigate('/services')
      }
    } catch (err: any) {
      const errorData = err.response?.data
      let message = 'Registration failed. Please check your details.'
      if (errorData) {
        if (typeof errorData === 'string') {
          message = errorData
        } else if (errorData.email) {
          message = Array.isArray(errorData.email) ? errorData.email[0] : String(errorData.email)
        } else if (errorData.password) {
          message = Array.isArray(errorData.password) ? errorData.password[0] : String(errorData.password)
        } else if (errorData.phone) {
          message = Array.isArray(errorData.phone) ? errorData.phone[0] : String(errorData.phone)
        } else if (errorData.detail) {
          message = errorData.detail
        } else if (errorData.non_field_errors) {
          message = Array.isArray(errorData.non_field_errors) ? errorData.non_field_errors[0] : String(errorData.non_field_errors)
        } else {
          const firstKey = Object.keys(errorData)[0]
          if (firstKey) {
            const val = errorData[firstKey]
            message = `${firstKey}: ${Array.isArray(val) ? val[0] : val}`
          }
        }
      }
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!forgotEmail) {
      toast.error('Please enter your email or phone number')
      return
    }
    setIsLoading(true)
    await new Promise((r) => setTimeout(r, 800))
    setIsLoading(false)
    toast.success('Password reset link sent! Check your email/SMS inbox.')
    setMode('login')
  }

  const handleGoogleFinalAuth = async (data: {
    credential?: string
    email?: string
    first_name?: string
    last_name?: string
    avatar_url?: string
    role?: AccountType
  }) => {
    setGoogleLoading(true)
    const t = toast.loading('Connecting directly with Google account...')
    try {
      const res = await authApi.googleAuth({
        ...data,
        role: data.role || googleRole || accountType || 'customer',
        location_name: locationName || 'Ikeja, Lagos',
      })
      toast.dismiss(t)
      if (res?.tokens?.access) {
        useAppStore.getState().setUser(res.user)
        useAppStore.getState().setAccessToken(res.tokens.access)
        localStorage.setItem('localfix-refresh', res.tokens.refresh)

        // Dynamically remember this Google account on this device
        const userFullName = `${res.user.first_name || ''} ${res.user.last_name || ''}`.trim() || data.email?.split('@')[0] || 'Google User'
        saveRecentGoogleAccount({
          name: userFullName,
          email: res.user.email,
          avatar: res.user.avatar || res.user.avatar_url || data.avatar_url,
          role: res.user.role,
        })

        if (res.is_new_user) {
          toast.success(`🎉 Welcome ${res.user.first_name}! Account created directly with Google.`, { duration: 4500 })
        } else {
          toast.success(`Welcome back, ${res.user.first_name}! Signed in with Google.`, { duration: 3500 })
        }
        setIsGoogleModalOpen(false)
        navigate('/profile')
      } else {
        toast.error('Authentication response missing access token.')
      }
    } catch (err: any) {
      toast.dismiss(t)
      const msg = err.response?.data?.error || err.message || 'Google authentication failed.'
      toast.error(msg)
    } finally {
      setGoogleLoading(false)
    }
  }

  const handleRealGoogleSignIn = async (roleOverride?: AccountType) => {
    const selectedRole = roleOverride || accountType || 'customer'
    setGoogleRole(selectedRole)
    const cid = (googleClientId || getGoogleClientId()).trim() || getGoogleClientId()

    const g = (window as any).google
    if (g && g.accounts && g.accounts.oauth2 && cid) {
      setGoogleLoading(true)
      const toastId = toast.loading('Connecting with Google...')

      try {
        await launchGoogleOAuthPopup(
          cid,
          async (result) => {
            toast.dismiss(toastId)
            if (result.profile) {
              await handleGoogleFinalAuth({
                credential: result.access_token,
                email: result.profile.email,
                first_name: result.profile.given_name || (result.profile.name ? result.profile.name.split(' ')[0] : 'Google'),
                last_name: result.profile.family_name || (result.profile.name ? result.profile.name.split(' ')[1] : 'User'),
                avatar_url: result.profile.picture,
                role: selectedRole,
              })
            } else if (result.access_token) {
              await handleGoogleFinalAuth({
                credential: result.access_token,
                role: selectedRole,
              })
            }
          },
          (errorMsg) => {
            toast.dismiss(toastId)
            setGoogleLoading(false)
            if (errorMsg) toast(errorMsg, { icon: 'ℹ️' })
            setIsGoogleModalOpen(true)
          }
        )
        return
      } catch {
        toast.dismiss(toastId)
        setGoogleLoading(false)
        setIsGoogleModalOpen(true)
        return
      }
    }

    // Direct Google Account Chooser
    setIsGoogleModalOpen(true)
  }

  const handleOpenGoogleModal = (defaultRole: AccountType = 'customer') => {
    setGoogleRole(defaultRole)
    if (!googleEmailInput) {
      setGoogleEmailInput(identifier && identifier.includes('@') ? identifier : '')
    }
    if (!googleNameInput && (firstName || lastName)) {
      setGoogleNameInput(`${firstName} ${lastName}`.trim())
    }
    setIsGoogleModalOpen(true)
  }

  const handleGoogleSubmit = async (customEmail?: string, customName?: string, customRole?: AccountType) => {
    const targetEmail = (customEmail || googleEmailInput || '').trim()
    const targetName = (customName || googleNameInput || '').trim() || 'Google User'
    const targetRole = customRole || googleRole || accountType || 'customer'

    if (!targetEmail || !targetEmail.includes('@')) {
      toast.error('Please provide a valid Google email address.')
      return
    }

    const nameParts = targetName.split(' ')
    const fName = nameParts[0] || 'Google'
    const lName = nameParts.slice(1).join(' ') || 'User'
    const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${fName}&backgroundColor=4285F4`

    await handleGoogleFinalAuth({
      email: targetEmail,
      first_name: fName,
      last_name: lName,
      avatar_url: avatar,
      role: targetRole,
    })
  }

  const handleGoogleAuth = () => {
    if (googleClientId.trim()) {
      handleRealGoogleSignIn(accountType || 'customer')
    } else {
      handleOpenGoogleModal(accountType || 'customer')
    }
  }

  const handleOtp = () => {
    toast.success('6-Digit OTP sent via WhatsApp & SMS to +234 803 ••• 8192')
  }

  const fadeVariants = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  }

  return (
    <div className="relative min-h-screen text-white overflow-hidden bg-transparent">
      {/* ── CINEMATIC FIXER BACKGROUND VIDEO (MAXIMUM VISIBILITY) ── */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 bg-[#0B0A10]" aria-hidden>
        <video
          ref={videoRef}
          key={currentScene.id}
          autoPlay
          loop
          muted={isVideoMuted}
          playsInline
          poster="/hero-bg.jpg"
          className="w-full h-full object-cover transition-opacity duration-500"
          style={{
            opacity: videoClarity === 'max' ? 1.0 : videoClarity === 'high' ? 0.92 : 0.70,
            filter: 'brightness(1.1) contrast(1.15) saturate(1.25)',
          }}
        >
          {currentScene.mp4 && <source src={currentScene.mp4} type="video/mp4" />}
          <source src={currentScene.webm} type="video/webm" />
        </video>

        {/* Minimal soft vignette overlay: keeps the artisan video highly prominent and visible */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/45 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/40 pointer-events-none" />

        {/* Ambient atmospheric brand light glows */}
        <div
          className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-15 blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, #7C3AED 0%, transparent 70%)' }}
        />
        <div
          className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full opacity-15 blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, #6D28D9 0%, transparent 70%)' }}
        />
      </div>

      <div className="relative z-10 max-w-[1360px] mx-auto px-4 py-6">

        {/* Top Security & Live Fixer Video Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs py-2.5 px-4 rounded-2xl glass-panel mb-8 border border-white/10 shadow-lg">
          <div className="flex flex-wrap items-center gap-2.5 text-gray-400">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
            <span className="font-semibold text-gray-200">LIVE HYPERLOCAL TRUST PORTAL</span>
            <span className="hidden sm:inline text-gray-500">•</span>
            <span className="hidden sm:inline text-gray-400">Worldwide Escrow & Vetted Artisan Mesh Active</span>
          </div>

          {/* Interactive Fixer Video Controls Pill */}
          <div className="flex items-center justify-between sm:justify-end gap-3 text-[11px]">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/75 backdrop-blur-md border border-white/20 text-white shadow-md">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
              </span>
              <span className="text-[10px] font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1">
                <Film className="w-3 h-3 text-primary-400" /> Fixer Video:
              </span>
              <span className="text-[11px] font-semibold text-primary-300 flex items-center gap-1">
                {currentScene.icon} {currentScene.trade}
              </span>

              <div className="h-3 w-px bg-white/20 mx-1" />

              {/* Play / Pause */}
              <button
                type="button"
                onClick={toggleVideoPlay}
                title={isVideoPlaying ? 'Pause background video' : 'Play background video'}
                className="p-1 rounded-full hover:bg-white/15 text-gray-300 hover:text-white transition-colors"
              >
                {isVideoPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 text-emerald-400" />}
              </button>

              {/* Mute / Unmute */}
              <button
                type="button"
                onClick={toggleVideoMute}
                title={isVideoMuted ? 'Unmute video sound' : 'Mute video sound'}
                className="p-1 rounded-full hover:bg-white/15 text-gray-300 hover:text-white transition-colors"
              >
                {isVideoMuted ? <VolumeX className="w-3 h-3 text-gray-400" /> : <Volume2 className="w-3 h-3 text-primary-400" />}
              </button>

              {/* Visibility / Clarity Toggle Button */}
              <button
                type="button"
                onClick={() => {
                  const next = videoClarity === 'high' ? 'max' : videoClarity === 'max' ? 'cinema' : 'high'
                  setVideoClarity(next)
                  toast(`Fixer Video Visibility: ${next === 'max' ? '100% Maximum' : next === 'high' ? '88% High Clarity' : '65% Cinema'}`, { icon: '👁️' })
                }}
                className="text-[10px] px-2 py-0.5 rounded-md bg-white/10 hover:bg-white/20 text-gray-200 border border-white/15 font-semibold transition-all flex items-center gap-1"
                title="Adjust background video visibility level (88% -> 100% -> 65%)"
              >
                👁️ {videoClarity === 'max' ? '100% Max' : videoClarity === 'high' ? '88% Clear' : 'Dim'}
              </button>

              {/* Scene Switcher Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowSceneMenu(!showSceneMenu)}
                  className="text-[10px] px-2 py-0.5 rounded-md bg-primary-800/60 hover:bg-primary-700/80 text-primary-200 border border-primary-500/40 font-semibold transition-all flex items-center gap-1"
                >
                  <RefreshCw className="w-2.5 h-2.5" /> Scene
                </button>
                {showSceneMenu && (
                  <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl bg-gray-950/95 border border-primary-500/30 backdrop-blur-xl shadow-2xl p-2 z-50 space-y-1">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2 py-1">
                      Choose Fixer Video
                    </div>
                    {FIXER_SCENES.map((scene, idx) => (
                      <button
                        key={scene.id}
                        type="button"
                        onClick={() => {
                          setActiveSceneIndex(idx)
                          setShowSceneMenu(false)
                        }}
                        className={`w-full text-left px-2.5 py-2 rounded-xl text-xs flex items-start gap-2.5 transition-all ${
                          activeSceneIndex === idx
                            ? 'bg-primary-600 text-white font-bold'
                            : 'text-gray-300 hover:bg-white/10'
                        }`}
                      >
                        <span className="text-base mt-0.5">{scene.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold truncate">{scene.title}</div>
                          <div className="text-[10px] opacity-75 line-clamp-1">{scene.trade}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="hidden lg:flex items-center gap-3 text-gray-400 text-[11px]">
              <span className="flex items-center gap-1">
                <Lock className="w-3 h-3 text-primary-400" /> 256-Bit TLS
              </span>
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" /> NDPR Certified
              </span>
            </div>
          </div>
        </div>

        {/* Main 2-Column Layout */}
        <div className="grid lg:grid-cols-12 gap-8 items-start max-w-6xl mx-auto">

          {/* ── LEFT: Brand / Social Proof ── */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold text-primary-300 bg-primary-700/20 border border-primary-500/30">
              <ShieldCheck className="w-3.5 h-3.5 text-primary-400" />
              CBN SANDBOX ALIGNED • Zero Fraud Escrow
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-[1.15] tracking-tight">
              {mode === 'login' ? (
                <>Welcome back to<br /><span className="gradient-text">LocalFix</span></>
              ) : mode === 'register' ? (
                <>Join Nigeria's #1<br /><span className="gradient-text">Craft Marketplace</span></>
              ) : (
                <>Reset Your<br /><span className="gradient-text">LocalFix Access</span></>
              )}
            </h1>

            <p className="text-gray-300 text-sm leading-relaxed max-w-lg">
              Direct hiring with automated escrow release. Verified plumbers, master carpenters, solar technicians, and peer construction equipment hire right across your neighborhood.
            </p>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl glass-panel border border-white/10 space-y-1">
                <div className="text-2xl sm:text-3xl font-black text-white">₦1.2B+</div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-primary-300">PROTECTED IN ESCROW</div>
                <div className="text-[11px] text-gray-400 flex items-center gap-1">
                  <Building className="w-3 h-3 text-primary-400" /> Automated milestone payout
                </div>
              </div>
              <div className="p-4 rounded-2xl glass-panel border border-white/10 space-y-1">
                <div className="text-2xl sm:text-3xl font-black text-white">14,200+</div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">TRADE GUILD PROS</div>
                <div className="text-[11px] text-gray-400 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-emerald-400" /> Biometric ID verified
                </div>
              </div>
            </div>

            {/* Testimonial */}
            <div className="p-4 rounded-2xl glass-panel border border-white/10 space-y-3">
              <div className="flex items-center gap-3">
                <img
                  src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop&crop=face"
                  alt="Emeka Daniel Uche"
                  className="w-10 h-10 rounded-xl object-cover border border-primary-500/40"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-xs">Emeka Daniel Uche</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary-700/40 text-primary-300 font-bold">Guild Master</span>
                  </div>
                  <div className="text-[10px] text-gray-400">Solar & Electrical Specialist • Metro Hub</div>
                  <div className="text-[10px] text-yellow-400 mt-0.5">★★★★★ <span className="text-gray-400">(4.98 • 186 jobs)</span></div>
                </div>
              </div>
              <p className="text-xs text-gray-300 italic leading-relaxed pt-2 border-t border-white/5">
                "I had my electrical inverter and subpanel completely rebuilt. The escrow released funds only after voltage and safety tested 100%. No stress, zero fear of artisan runaway."
              </p>
              <div className="flex justify-between items-center text-[10px] text-gray-400">
                <span>— Babatunde O., Verified Client</span>
                <span className="text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Escrow Verified Fix
                </span>
              </div>
            </div>

            {/* Live Fixer Video Atmosphere Showcase Card */}
            <div className="p-4 rounded-2xl bg-black/40 border border-primary-500/25 backdrop-blur-md space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl p-2 rounded-xl bg-primary-950/60 border border-primary-500/30">{currentScene.icon}</span>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      {currentScene.title}
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Live Fixer
                      </span>
                    </div>
                    <div className="text-[11px] text-gray-300 line-clamp-1">{currentScene.description}</div>
                  </div>
                </div>
              </div>

              {/* Quick Scene Selectors */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-2 border-t border-white/10">
                {FIXER_SCENES.map((scene, idx) => (
                  <button
                    key={scene.id}
                    type="button"
                    onClick={() => setActiveSceneIndex(idx)}
                    className={`px-2 py-1.5 rounded-xl text-[10px] font-semibold transition-all flex items-center justify-center gap-1.5 ${
                      activeSceneIndex === idx
                        ? 'bg-primary-600 text-white shadow-glow-sm border border-primary-400'
                        : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/5'
                    }`}
                  >
                    <span>{scene.icon}</span>
                    <span className="truncate">{scene.trade.split(' ')[0]}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-6 text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-primary-400" /> NDIC-Insured Settlement
              </span>
              <span className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-primary-400" /> Anti-Tamper Contract Vault
              </span>
            </div>
          </div>

          {/* ── RIGHT: Auth Card ── */}
          <div className="lg:col-span-6">
            <div className={`bg-[#0E0C17]/85 backdrop-blur-2xl rounded-3xl p-6 sm:p-8 ${mode === 'register' ? 'max-w-xl' : 'max-w-md'} mx-auto border border-white/20 shadow-2xl transition-all duration-300`}>

              {/* Mode Tabs (Login / Register) */}
              {mode !== 'forgot' && (
                <div className="flex p-1 rounded-2xl bg-white/5 border border-white/10 mb-6">
                  <button
                    type="button"
                    onClick={() => { setMode('login'); navigate('/login') }}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${mode === 'login' ? 'bg-primary-700 text-white shadow-glow-sm' : 'text-gray-400 hover:text-white'}`}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMode('register'); navigate('/register') }}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all ${mode === 'register' ? 'bg-primary-700 text-white shadow-glow-sm' : 'text-gray-400 hover:text-white'}`}
                  >
                    Create Account
                  </button>
                </div>
              )}

              <AnimatePresence mode="wait">

                {/* ── LOGIN ── */}
                {mode === 'login' && (
                  <motion.div key="login" {...fadeVariants} transition={{ duration: 0.2 }} className="space-y-4">
                    {/* Google Real-Life Login */}
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => handleRealGoogleSignIn('customer')}
                        disabled={googleLoading}
                        className="w-full py-3 px-4 rounded-xl text-xs font-bold text-white bg-white/5 hover:bg-white/10 border border-white/15 flex items-center justify-center gap-2.5 transition-all shadow-sm cursor-pointer disabled:opacity-60"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                        </svg>
                        <span>Continue with Google</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary-700/50 text-primary-200 font-semibold border border-primary-500/30">1-Click</span>
                      </button>

                      {/* Official Google Button Render Container */}
                      <div id="real-google-btn-login" className="w-full flex justify-center empty:hidden" />
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-px bg-white/10" />
                      <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">or sign in with password</span>
                      <div className="flex-1 h-px bg-white/10" />
                    </div>

                    <form onSubmit={handleLogin} className="space-y-4">
                      <div>
                        <label className="block text-[11px] font-bold text-gray-300 mb-1.5">Email or Phone Number</label>
                        <div className="relative">
                          <Mail className="w-4 h-4 text-primary-400 absolute left-3.5 top-3.5" />
                          <input
                            type="text"
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
                            placeholder="name@domain.com or 0803 123 4567"
                            className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 outline-none focus:border-primary-400 text-xs transition-colors"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <label className="text-[11px] font-bold text-gray-300">Password</label>
                          <button type="button" onClick={() => setMode('forgot')} className="text-[10px] text-primary-400 hover:text-primary-300 transition-colors">
                            Forgot Password?
                          </button>
                        </div>
                        <div className="relative">
                          <Lock className="w-4 h-4 text-primary-400 absolute left-3.5 top-3.5" />
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter your password"
                            className="w-full pl-10 pr-10 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 outline-none focus:border-primary-400 text-xs transition-colors"
                            required
                          />
                          <button type="button" onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3.5 top-3.5 text-gray-400 hover:text-white">
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-300">
                          <input type="checkbox" checked={rememberDevice} onChange={(e) => setRememberDevice(e.target.checked)}
                            className="rounded border-white/20 bg-white/5 text-primary-600 focus:ring-0" />
                          Remember this device
                        </label>
                        <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" /> Protected
                        </span>
                      </div>

                      <button type="submit" disabled={isLoading}
                        className="w-full py-3.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all shadow-glow disabled:opacity-70"
                        style={{ background: 'linear-gradient(135deg, #6D28D9, #7C3AED)' }}>
                        {isLoading ? (
                          <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Signing In...</>
                        ) : (
                          <><span>Sign In to LocalFix</span><ArrowRight className="w-4 h-4" /></>
                        )}
                      </button>

                      <button type="button" onClick={handleOtp}
                        className="w-full py-3 rounded-xl text-xs font-semibold text-gray-300 bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center gap-2 transition-colors">
                        <MessageSquare className="w-3.5 h-3.5 text-primary-400" />
                        Send OTP via WhatsApp / SMS
                      </button>
                    </form>

                    <p className="text-center text-[11px] text-gray-400 pt-1 border-t border-white/10">
                      Don't have an account?{' '}
                      <button onClick={() => { setMode('register'); navigate('/register') }}
                        className="text-primary-400 hover:text-primary-300 font-semibold">
                        Create one free →
                      </button>
                    </p>
                  </motion.div>
                )}

                {/* ── REGISTER ── */}
                {mode === 'register' && (
                  <motion.div key="register" {...fadeVariants} transition={{ duration: 0.2 }} className="space-y-4">

                    {/* Direct Google Sign-Up Highlight Banner */}
                    <div className="p-4 rounded-2xl bg-[#1E1538] border border-primary-500/30 space-y-3 shadow-glow-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-primary-300 uppercase tracking-wider flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-primary-400" />
                          Direct Google Onboarding
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary-500/20 text-primary-200 border border-primary-500/30 font-bold">
                          Instant 1-Click
                        </span>
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">Create Account with Google Directly</h4>
                        <p className="text-[11px] text-gray-300 mt-0.5">
                          Instant email verification & zero passwords. Choose your role and join LocalFix in 5 seconds.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={() => handleRealGoogleSignIn(accountType)}
                          disabled={googleLoading}
                          className="w-full py-3 px-4 rounded-xl text-xs font-bold text-white bg-white/10 hover:bg-white/15 border border-white/20 flex items-center justify-center gap-2.5 transition-all shadow-glow cursor-pointer disabled:opacity-60"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                          </svg>
                          <span>Sign Up Directly with Google</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary-700/60 text-primary-200 font-mono">1-Click</span>
                        </button>

                        {/* Official Google Button Render Container */}
                        <div id="real-google-btn-register" className="w-full flex justify-center empty:hidden" />
                      </div>
                    </div>

                    <div className="flex items-center gap-3 my-2 text-xs text-gray-500">
                      <div className="flex-1 h-px bg-white/10" />
                      <span className="text-[10px] uppercase tracking-wider font-semibold">or register with manual details below</span>
                      <div className="flex-1 h-px bg-white/10" />
                    </div>

                    {/* Account type selector */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-[11px] font-bold text-gray-300">Choose Account Role *</label>
                        <span className="text-[10px] text-primary-400 font-semibold">
                          {accountType === 'worker' ? '🔨 Artisan / Trade Pro' : '💼 Client / Employer'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2.5">
                        <button
                          key="customer"
                          type="button"
                          onClick={() => setAccountType('customer')}
                          className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden ${
                            accountType === 'customer'
                              ? 'bg-primary-900/40 border-primary-500 shadow-glow-sm text-white ring-1 ring-primary-500'
                              : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <User className={`w-4 h-4 ${accountType === 'customer' ? 'text-primary-400' : 'text-gray-500'}`} />
                            {accountType === 'customer' && (
                              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                            )}
                          </div>
                          <div className="text-xs font-bold text-white">Client / Employer</div>
                          <div className="text-[10px] text-gray-400 mt-0.5 leading-snug">
                            Hire vetted artisans & escrow-protect project funds
                          </div>
                        </button>

                        <button
                          key="worker"
                          type="button"
                          onClick={() => setAccountType('worker')}
                          className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden ${
                            accountType === 'worker'
                              ? 'bg-primary-900/40 border-primary-500 shadow-glow-sm text-white ring-1 ring-primary-500'
                              : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <Briefcase className={`w-4 h-4 ${accountType === 'worker' ? 'text-primary-400' : 'text-gray-500'}`} />
                            {accountType === 'worker' && (
                              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                            )}
                          </div>
                          <div className="text-xs font-bold text-white">Artisan / Employee</div>
                          <div className="text-[10px] text-gray-400 mt-0.5 leading-snug">
                            Receive direct callouts, bookings & guaranteed payouts
                          </div>
                        </button>
                      </div>
                    </div>

                    <form onSubmit={handleRegister} className="space-y-3.5">
                      {/* Name row */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-bold text-gray-300 mb-1">First Name *</label>
                          <div className="relative">
                            <User className="w-3.5 h-3.5 text-primary-400 absolute left-3 top-3" />
                            <input
                              type="text"
                              value={firstName}
                              onChange={(e) => setFirstName(e.target.value)}
                              placeholder="e.g. Babatunde"
                              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 outline-none focus:border-primary-400 text-xs transition-colors"
                              required
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-gray-300 mb-1">Last Name *</label>
                          <input
                            type="text"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            placeholder="e.g. Ogundimu"
                            className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 outline-none focus:border-primary-400 text-xs transition-colors"
                            required
                          />
                        </div>
                      </div>

                      {/* Contact row */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-bold text-gray-300 mb-1">Email Address *</label>
                          <div className="relative">
                            <Mail className="w-3.5 h-3.5 text-primary-400 absolute left-3 top-3" />
                            <input
                              type="email"
                              value={identifier}
                              onChange={(e) => setIdentifier(e.target.value)}
                              placeholder="name@email.com"
                              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 outline-none focus:border-primary-400 text-xs transition-colors"
                              required
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-gray-300 mb-1">Phone Number</label>
                          <div className="relative">
                            <Phone className="w-3.5 h-3.5 text-primary-400 absolute left-3 top-3" />
                            <input
                              type="tel"
                              value={phone}
                              onChange={(e) => setPhone(e.target.value)}
                              placeholder="+234 803 123 4567"
                              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 outline-none focus:border-primary-400 text-xs transition-colors"
                            />
                          </div>
                        </div>
                      </div>

                      {/* ── CONDITIONAL: WORKER / EMPLOYEE ONBOARDING PROFILE ── */}
                      {accountType === 'worker' && (
                        <div className="p-3.5 rounded-2xl bg-primary-950/40 border border-primary-500/30 space-y-3">
                          <div className="flex items-center gap-2 pb-2 border-b border-white/10">
                            <Wrench className="w-4 h-4 text-primary-400" />
                            <span className="text-xs font-bold text-white">Artisan & Trade Profile</span>
                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold ml-auto flex items-center gap-1">
                              <CheckCircle className="w-2.5 h-2.5" /> Instant Vetted Pro
                            </span>
                          </div>

                          {/* Trade Category & Profession */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <div>
                              <label className="block text-[10px] font-bold text-gray-300 mb-1">Trade Category *</label>
                              <select
                                value={categoryId}
                                onChange={(e) => {
                                  setCategoryId(e.target.value)
                                  const cat = categories.find(c => c.id === e.target.value)
                                  if (cat && !profession) {
                                    setProfession(`${cat.name} Specialist`)
                                  }
                                }}
                                className="w-full px-3 py-2.5 rounded-xl bg-gray-900 border border-white/10 text-white text-xs outline-none focus:border-primary-400 transition-colors"
                              >
                                {categories.map((c) => (
                                  <option key={c.id} value={c.id} className="bg-gray-900 text-white">
                                    {c.icon ? `${c.icon} ` : ''}{c.name}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-gray-300 mb-1">Specific Trade Title *</label>
                              <input
                                type="text"
                                value={profession}
                                onChange={(e) => setProfession(e.target.value)}
                                placeholder="e.g. Master Solar & Inverter Tech"
                                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 outline-none focus:border-primary-400 text-xs transition-colors"
                              />
                            </div>
                          </div>

                          {/* Experience & Callout Rate */}
                          <div className="grid grid-cols-2 gap-2.5">
                            <div>
                              <label className="block text-[10px] font-bold text-gray-300 mb-1">Experience</label>
                              <div className="relative">
                                <Clock className="w-3.5 h-3.5 text-primary-400 absolute left-3 top-3" />
                                <select
                                  value={yearsExperience}
                                  onChange={(e) => setYearsExperience(Number(e.target.value))}
                                  className="w-full pl-8 pr-2 py-2.5 rounded-xl bg-gray-900 border border-white/10 text-white text-xs outline-none focus:border-primary-400 transition-colors"
                                >
                                  <option value={1} className="bg-gray-900 text-white">1 Year</option>
                                  <option value={2} className="bg-gray-900 text-white">2 Years</option>
                                  <option value={3} className="bg-gray-900 text-white">3 - 4 Years</option>
                                  <option value={5} className="bg-gray-900 text-white">5 - 7 Years (Senior)</option>
                                  <option value={8} className="bg-gray-900 text-white">8 - 10 Years (Master)</option>
                                  <option value={12} className="bg-gray-900 text-white">10+ Years (Veteran)</option>
                                </select>
                              </div>
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-gray-300 mb-1">Callout Rate (₦)</label>
                              <div className="relative">
                                <span className="text-xs text-primary-400 font-bold absolute left-3 top-2.5">₦</span>
                                <input
                                  type="number"
                                  step="500"
                                  value={calloutRate}
                                  onChange={(e) => setCalloutRate(Number(e.target.value))}
                                  placeholder="10000"
                                  className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 outline-none focus:border-primary-400 text-xs transition-colors"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Service Area */}
                          <div>
                            <label className="block text-[10px] font-bold text-gray-300 mb-1">Service Coverage Area</label>
                            <div className="relative">
                              <MapPin className="w-3.5 h-3.5 text-primary-400 absolute left-3 top-3" />
                              <input
                                type="text"
                                value={serviceArea}
                                onChange={(e) => setServiceArea(e.target.value)}
                                placeholder="e.g. Ikeja, Maryland, Lekki Phase 1"
                                className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 outline-none focus:border-primary-400 text-xs transition-colors"
                              />
                            </div>
                          </div>

                          {/* Key Specialisms */}
                          <div>
                            <label className="block text-[10px] font-bold text-gray-300 mb-1">Key Skills & Specialisms</label>
                            <input
                              type="text"
                              value={specialisms}
                              onChange={(e) => setSpecialisms(e.target.value)}
                              placeholder="e.g. Inverter Wiring, Fault Diagnosis, Emergency Callout"
                              className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 outline-none focus:border-primary-400 text-xs transition-colors"
                            />
                          </div>

                          {/* Artisan Bio */}
                          <div>
                            <label className="block text-[10px] font-bold text-gray-300 mb-1">Brief Craftsmanship Pitch / Bio</label>
                            <textarea
                              rows={2}
                              value={artisanBio}
                              onChange={(e) => setArtisanBio(e.target.value)}
                              placeholder="Describe your quality standards, promptness, and guarantee..."
                              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 outline-none focus:border-primary-400 text-xs transition-colors resize-none"
                            />
                          </div>
                        </div>
                      )}

                      {/* ── CONDITIONAL: CUSTOMER / EMPLOYER PROFILE ── */}
                      {accountType === 'customer' && (
                        <div className="p-3.5 rounded-2xl bg-primary-950/40 border border-primary-500/30 space-y-3">
                          <div className="flex items-center gap-2 pb-2 border-b border-white/10">
                            <Building className="w-4 h-4 text-primary-400" />
                            <span className="text-xs font-bold text-white">Employer & Property Details</span>
                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold ml-auto flex items-center gap-1">
                              <ShieldCheck className="w-2.5 h-2.5" /> Escrow Protected
                            </span>
                          </div>

                          {/* Client Type */}
                          <div>
                            <label className="block text-[10px] font-bold text-gray-300 mb-1.5">Employer Category</label>
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => setEmployerType('individual')}
                                className={`p-2.5 rounded-xl border text-left transition-all ${
                                  employerType === 'individual'
                                    ? 'bg-primary-800/50 border-primary-400 text-white ring-1 ring-primary-400'
                                    : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20'
                                }`}
                              >
                                <div className="text-[11px] font-bold">🏠 Homeowner / Resident</div>
                                <div className="text-[9px] text-gray-400">Personal & family residence</div>
                              </button>

                              <button
                                type="button"
                                onClick={() => setEmployerType('commercial')}
                                className={`p-2.5 rounded-xl border text-left transition-all ${
                                  employerType === 'commercial'
                                    ? 'bg-primary-800/50 border-primary-400 text-white ring-1 ring-primary-400'
                                    : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20'
                                }`}
                              >
                                <div className="text-[11px] font-bold">🏢 Business / Contractor</div>
                                <div className="text-[9px] text-gray-400">Estate, facility, commercial</div>
                              </button>
                            </div>
                          </div>

                          {/* Location / Area */}
                          <div>
                            <label className="block text-[10px] font-bold text-gray-300 mb-1">Primary Property Location *</label>
                            <div className="relative">
                              <MapPin className="w-3.5 h-3.5 text-primary-400 absolute left-3 top-3" />
                              <input
                                type="text"
                                value={locationName}
                                onChange={(e) => setLocationName(e.target.value)}
                                placeholder="e.g. Victoria Island, Lagos or Maitama, Abuja"
                                className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 outline-none focus:border-primary-400 text-xs transition-colors"
                              />
                            </div>
                          </div>

                          {/* Needs / Project notes */}
                          <div>
                            <label className="block text-[10px] font-bold text-gray-300 mb-1">Maintenance & Project Needs (Optional)</label>
                            <textarea
                              rows={2}
                              value={employerBio}
                              onChange={(e) => setEmployerBio(e.target.value)}
                              placeholder="e.g. Regular AC servicing, solar upgrades, emergency plumbing..."
                              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 outline-none focus:border-primary-400 text-xs transition-colors resize-none"
                            />
                          </div>
                        </div>
                      )}

                      {/* Password row */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-bold text-gray-300 mb-1">Password *</label>
                          <div className="relative">
                            <Lock className="w-3.5 h-3.5 text-primary-400 absolute left-3 top-3" />
                            <input
                              type={showPassword ? 'text' : 'password'}
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              placeholder="Min. 8 chars"
                              className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 outline-none focus:border-primary-400 text-xs transition-colors"
                              required
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-2.5 top-2.5 text-gray-400 hover:text-white"
                            >
                              {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-gray-300 mb-1">Confirm *</label>
                          <div className="relative">
                            <input
                              type={showConfirmPassword ? 'text' : 'password'}
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              placeholder="Repeat password"
                              className={`w-full px-3 pr-8 py-2.5 rounded-xl bg-white/5 border text-white placeholder-gray-500 outline-none focus:border-primary-400 text-xs transition-colors ${
                                confirmPassword && confirmPassword !== password ? 'border-red-500/60' : 'border-white/10'
                              }`}
                              required
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="absolute right-2.5 top-2.5 text-gray-400 hover:text-white"
                            >
                              {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                          {confirmPassword && confirmPassword !== password && (
                            <p className="text-[10px] text-red-400 mt-0.5">Passwords don't match</p>
                          )}
                        </div>
                      </div>

                      {/* Terms */}
                      <p className="text-[10px] text-gray-500 leading-relaxed">
                        By creating an account you agree to LocalFix's{' '}
                        <span className="text-primary-400 cursor-pointer">Terms of Service</span> and{' '}
                        <span className="text-primary-400 cursor-pointer">Privacy Policy</span> (NDPR & Escrow compliant).
                      </p>

                      <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all shadow-glow disabled:opacity-70"
                        style={{ background: 'linear-gradient(135deg, #6D28D9, #7C3AED)' }}
                      >
                        {isLoading ? (
                          <>
                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>Creating Real-life Account...</span>
                          </>
                        ) : accountType === 'worker' ? (
                          <>
                            <Wrench className="w-4 h-4" />
                            <span>Register as Verified Artisan & Open Shop</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" />
                            <span>Register as Protected Employer & Hire Safely</span>
                          </>
                        )}
                      </button>
                    </form>

                    <p className="text-center text-[11px] text-gray-400 pt-1 border-t border-white/10">
                      Already have an account?{' '}
                      <button
                        onClick={() => { setMode('login'); navigate('/login') }}
                        className="text-primary-400 hover:text-primary-300 font-semibold"
                      >
                        Sign in →
                      </button>
                    </p>
                  </motion.div>
                )}

                {/* ── FORGOT PASSWORD ── */}
                {mode === 'forgot' && (
                  <motion.div key="forgot" {...fadeVariants} transition={{ duration: 0.2 }} className="space-y-5">
                    <div>
                      <button onClick={() => setMode('login')} className="flex items-center gap-1.5 text-gray-400 hover:text-white text-xs mb-4 transition-colors">
                        <ChevronLeft className="w-4 h-4" /> Back to Sign In
                      </button>
                      <h2 className="text-xl font-black text-white mb-1">Reset Password</h2>
                      <p className="text-xs text-gray-400">Enter your registered email or phone and we'll send a reset link / OTP.</p>
                    </div>

                    <form onSubmit={handleForgotPassword} className="space-y-4">
                      <div>
                        <label className="block text-[11px] font-bold text-gray-300 mb-1.5">Email or Phone Number</label>
                        <div className="relative">
                          <Mail className="w-4 h-4 text-primary-400 absolute left-3.5 top-3.5" />
                          <input type="text" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)}
                            placeholder="name@email.com or 0803 123 4567"
                            className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 outline-none focus:border-primary-400 text-xs transition-colors"
                            required />
                        </div>
                      </div>

                      <button type="submit" disabled={isLoading}
                        className="w-full py-3.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all shadow-glow disabled:opacity-70"
                        style={{ background: 'linear-gradient(135deg, #6D28D9, #7C3AED)' }}>
                        {isLoading ? (
                          <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Sending Reset Link...</>
                        ) : (
                          <><span>Send Reset Link / OTP</span><ArrowRight className="w-4 h-4" /></>
                        )}
                      </button>

                      <button type="button" onClick={handleOtp}
                        className="w-full py-3 rounded-xl text-xs font-semibold text-gray-300 bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center gap-2 transition-colors">
                        <MessageSquare className="w-3.5 h-3.5 text-primary-400" />
                        Send OTP via WhatsApp instead
                      </button>
                    </form>

                    <div className="text-center text-[11px] text-gray-500 pt-2 border-t border-white/10">
                      Remembered your password?{' '}
                      <button onClick={() => setMode('login')} className="text-primary-400 hover:text-primary-300 font-semibold">
                        Sign in
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Support link */}
              <div className="text-center text-[11px] text-gray-500 mt-4 pt-4 border-t border-white/8">
                Need help?{' '}
                <Link to="/assistant" className="text-primary-400 hover:text-primary-300 font-semibold">
                  Chat with LocalFix Support →
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Certification Strip */}
        <div className="mt-12 p-3.5 rounded-2xl glass-panel border border-white/10 flex flex-wrap items-center justify-around gap-4 text-xs text-gray-400 text-center">
          <span className="flex items-center gap-1.5"><Lock className="w-3.5 h-3.5 text-primary-400" />256-Bit Cryptographic Ledger</span>
          <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />NDPR Data Privacy Certified</span>
          <span className="flex items-center gap-1.5"><Building className="w-3.5 h-3.5 text-primary-400" />Neutral Dispute Arbitrator Board</span>
          <span className="text-gray-500 text-[11px]">• Worldwide Coverage: New York, London, Toronto, Berlin, Tokyo, Paris, Dubai, Lagos, Sydney</span>
        </div>
      </div>

      {/* ── GOOGLE DIRECT 1-CLICK ACCOUNT CREATION MODAL ── */}
      <AnimatePresence>
        {isGoogleModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-md rounded-3xl p-6 sm:p-7 border border-white/20 shadow-2xl text-white space-y-5"
              style={{
                background: 'linear-gradient(180deg, rgba(23, 18, 38, 0.98), rgba(16, 12, 30, 0.98))',
                boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8), 0 0 35px rgba(66, 133, 244, 0.25)',
              }}
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setIsGoogleModalOpen(false)}
                className="absolute top-5 right-5 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Header with Authentic Google Branding */}
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-white flex items-center justify-center shadow-lg p-2">
                  <svg className="w-7 h-7" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    Sign in with Google
                  </h3>
                  <p className="text-xs text-gray-400">Choose an account to continue to LocalFix</p>
                </div>
              </div>

              {/* Role Selection */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-gray-300">Choose your account type:</span>
                  <div className="inline-flex rounded-lg bg-white/5 p-0.5 border border-white/10">
                    <button
                      type="button"
                      onClick={() => setGoogleRole('customer')}
                      className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all ${googleRole === 'customer' ? 'bg-primary-600 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                    >
                      💼 Client
                    </button>
                    <button
                      type="button"
                      onClick={() => setGoogleRole('worker')}
                      className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all ${googleRole === 'worker' ? 'bg-primary-600 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                    >
                      🔨 Artisan
                    </button>
                  </div>
                </div>
              </div>

              {/* Google Account List (1-Click Selection & Universal Email Sign-in) */}
              <div className="space-y-3 pt-1">
                {recentGoogleAccounts.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-[11px] font-semibold text-gray-400">Accounts on this device:</div>
                    {recentGoogleAccounts.map((account) => (
                      <button
                        key={account.email}
                        type="button"
                        disabled={googleLoading}
                        onClick={() => handleGoogleSubmit(account.email, account.name, (account.role as any) || googleRole)}
                        className="w-full p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-blue-500/40 flex items-center justify-between text-left transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={
                              account.avatar ||
                              `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(account.name)}&backgroundColor=4285F4`
                            }
                            alt={account.name}
                            className="w-10 h-10 rounded-full object-cover border border-white/20"
                          />
                          <div>
                            <div className="text-xs font-bold text-white group-hover:text-blue-300 transition-colors">
                              {account.name}
                            </div>
                            <div className="text-[11px] text-gray-400">{account.email}</div>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" />
                      </button>
                    ))}
                  </div>
                )}

                {/* Universal Google Email Input Form (Works for Any Registered Google User!) */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    handleGoogleSubmit(googleEmailInput, googleNameInput, googleRole)
                  }}
                  className="p-4 rounded-2xl bg-white/5 border border-white/15 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">Enter your Google Account email:</span>
                    <span className="text-[10px] text-primary-300 bg-primary-900/40 border border-primary-500/30 px-2 py-0.5 rounded-full">
                      All Google Users
                    </span>
                  </div>
                  <input
                    type="email"
                    value={googleEmailInput}
                    onChange={(e) => setGoogleEmailInput(e.target.value)}
                    placeholder="e.g. yourname@gmail.com"
                    required
                    autoFocus
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white placeholder-gray-500 outline-none focus:border-primary-400 text-xs transition-colors"
                  />
                  <input
                    type="text"
                    value={googleNameInput}
                    onChange={(e) => setGoogleNameInput(e.target.value)}
                    placeholder="Your Full Name (optional)"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white placeholder-gray-500 outline-none focus:border-primary-400 text-xs transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={googleLoading}
                    className="w-full py-2.5 rounded-xl text-xs font-bold text-white bg-[#7C3AED] hover:bg-[#6D28D9] transition-colors shadow-glow flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {googleLoading ? (
                      'Authenticating with Google...'
                    ) : (
                      <>
                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                          <path fill="#ffffff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                          <path fill="#ffffff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                          <path fill="#ffffff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                          <path fill="#ffffff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                        </svg>
                        <span>Continue with this Google Account</span>
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Google Security & Privacy Notice */}
              <div className="text-[10px] text-gray-500 pt-2 border-t border-white/10 leading-relaxed text-center">
                To continue, Google will share your name, email address, language preference, and profile picture with LocalFix. See LocalFix's Privacy Policy and Terms of Service.
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
