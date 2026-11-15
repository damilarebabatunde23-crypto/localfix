import { useState, useEffect, useRef } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShieldCheck,
  ShieldAlert,
  Lock,
  Building,
  CheckCircle,
  Clock,
  FileText,
  UserCheck,
  Download,
  Copy,
  Check,
  QrCode,
  ChevronRight,
  ExternalLink,
  MessageSquare,
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  Sparkles,
  Sliders,
  Bookmark,
  Briefcase,
  AlertTriangle,
  Send,
  Zap,
  Activity,
  Award,
  Camera,
  Edit3,
  X,
  Upload,
  Wrench,
  Save,
  User,
  Bell,
  Globe,
  Plus,
  Trash2,
  CheckCheck,
  Radio,
  Navigation
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { useAppStore } from '@/stores/useAppStore'
import { escrowApi, bookingsApi, disputesApi, authApi, uploadApi } from '@/lib/api'
import toast from 'react-hot-toast'

type ProfileTab = 'disputes' | 'services' | 'wallet' | 'diagnostics' | 'saved' | 'notifications'

const POPULAR_LANGUAGES = [
  'English',
  'Yoruba',
  'Hausa',
  'Igbo',
  'Nigerian Pidgin',
  'French',
  'Arabic',
  'Spanish',
  'German',
  'Swahili'
]

export default function ProfilePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user, setUser, userLocation, locationName, requestGPSLocation } = useAppStore()

  const tabParam = searchParams.get('tab') as ProfileTab | null
  const [activeTab, setActiveTab] = useState<ProfileTab>(
    tabParam === 'wallet' ? 'wallet' : tabParam === 'notifications' ? 'notifications' : 'disputes'
  )

  // Profile Edit State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [customLanguageInput, setCustomLanguageInput] = useState('')
  const [profileData, setProfileData] = useState({
    firstName: user?.firstName || 'Babatunde',
    lastName: user?.lastName || 'Ogundimu',
    email: user?.email || 'babatunde.o@gmail.com',
    phone: user?.phone || '+234 803 491 8820',
    locationName: user?.locationName || 'Ikeja GRA, Lagos',
    avatar: user?.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=160&h=160&fit=crop&crop=face',
    tier: user?.tier || (user?.role === 'worker' ? 'Vetted Pro Artisan' : 'Tier 3 Gold Resident'),
    languages: user?.languages && user.languages.length > 0 ? user.languages : ['English', 'Nigerian Pidgin'],
  })

  // Notifications State
  const [notifications, setNotifications] = useState<any[]>([])
  const [notificationFilter, setNotificationFilter] = useState<'all' | 'escrow' | 'job' | 'system'>('all')

  // Sync if store user changes
  useEffect(() => {
    if (user) {
      setProfileData((prev) => ({
        ...prev,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone || prev.phone,
        locationName: user.locationName || prev.locationName,
        avatar: user.avatar || prev.avatar,
        tier: user.tier || prev.tier,
        languages: user.languages && user.languages.length > 0 ? user.languages : prev.languages,
      }))
    }
  }, [user])

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 15 * 1024 * 1024) {
        toast.error('Image size must be under 15MB')
        return
      }
      toast.loading('Uploading profile picture from device...', { id: 'avatar' })
      try {
        const res = await uploadApi.uploadFile(file)
        const uploadedUrl = res.full_url || res.url
        setProfileData((prev) => ({ ...prev, avatar: uploadedUrl }))
        toast.success('Photo uploaded from device! Click Save to apply.', { id: 'avatar' })
      } catch {
        const reader = new FileReader()
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            setProfileData((prev) => ({ ...prev, avatar: reader.result as string }))
            toast.success('Photo preview updated! Click Save to apply.', { id: 'avatar' })
          }
        }
        reader.readAsDataURL(file)
      }
    }
  }

  const handleToggleLanguage = (lang: string) => {
    setProfileData((prev) => {
      const exists = prev.languages.includes(lang)
      const nextLangs = exists
        ? prev.languages.filter((l) => l !== lang)
        : [...prev.languages, lang]
      return { ...prev, languages: nextLangs }
    })
  }

  const handleAddCustomLanguage = (e: React.FormEvent) => {
    e.preventDefault()
    const clean = customLanguageInput.trim()
    if (!clean) return
    if (!profileData.languages.includes(clean)) {
      setProfileData((prev) => ({ ...prev, languages: [...prev.languages, clean] }))
      toast.success(`Language "${clean}" added!`)
    }
    setCustomLanguageInput('')
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await authApi.updateProfile({
        first_name: profileData.firstName,
        last_name: profileData.lastName,
        phone: profileData.phone,
        location_name: profileData.locationName,
        avatar_url: profileData.avatar,
        languages: profileData.languages,
      })
    } catch (err) {
      console.warn('Profile saved in store', err)
    }
    setUser({
      id: user?.id || 'usr-babatunde-01',
      email: profileData.email,
      firstName: profileData.firstName,
      lastName: profileData.lastName,
      phone: profileData.phone,
      locationName: profileData.locationName,
      avatar: profileData.avatar,
      role: user?.role || 'customer',
      tier: profileData.tier,
      languages: profileData.languages,
      isVerified: true,
      isEmailVerified: true,
      createdAt: user?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    setIsEditModalOpen(false)
    toast.success('Profile and spoken languages updated successfully! 🎉')
  }

  // Live Backend State
  const [walletData, setWalletData] = useState<any>(null)
  const [userBookings, setUserBookings] = useState<any[]>([])
  const [userDisputes, setUserDisputes] = useState<any[]>([])

  useEffect(() => {
    async function loadData() {
      try {
        const w = await escrowApi.getWallet()
        if (w) setWalletData(w)
      } catch (err) {
        console.warn('Wallet fallback', err)
      }
      try {
        const b = await bookingsApi.getBookings()
        if (b && b.length > 0) setUserBookings(b)
      } catch (err) {
        console.warn('Bookings fallback', err)
      }
      try {
        const d = await disputesApi.getDisputes()
        if (d && d.length > 0) setUserDisputes(d)
      } catch (err) {
        console.warn('Disputes fallback', err)
      }
      try {
        const notifs = await authApi.getNotifications()
        if (Array.isArray(notifs) && notifs.length > 0) {
          setNotifications(notifs)
        } else {
          // Default initial notifications for the user
          setNotifications([
            {
              id: 'notif-1',
              title: '🎉 Welcome to LocalFix Escrow Protocol',
              body: `Welcome, ${user?.firstName || 'Neighbor'}! Your account is verified and ready for secure trade engagements.`,
              notification_type: 'system',
              is_read: false,
              created_at: new Date().toISOString(),
            },
            {
              id: 'notif-2',
              title: '🛡️ Multi-Sig Escrow Custody Active',
              body: 'Funds for all jobs remain safely locked until on-site inspection and milestone signoff.',
              notification_type: 'escrow',
              is_read: false,
              created_at: new Date(Date.now() - 3600000).toISOString(),
            },
            {
              id: 'notif-3',
              title: '🗣️ Spoken Languages Configured',
              body: `Your profile displays your spoken languages: ${(user?.languages || ['English', 'Nigerian Pidgin']).join(', ')}.`,
              notification_type: 'system',
              is_read: true,
              created_at: new Date(Date.now() - 7200000).toISOString(),
            },
            {
              id: 'notif-4',
              title: user?.role === 'worker' ? '🔨 Artisan Profile Live' : '📍 Local Discovery Ready',
              body: user?.role === 'worker'
                ? 'Your artisan profile is published. Real job histories and client reviews will appear once you receive and complete your first booking.'
                : 'Browse verified electricians, plumbers, HVAC technicians, and mechanics in your neighborhood.',
              notification_type: 'job',
              is_read: true,
              created_at: new Date(Date.now() - 86400000).toISOString(),
            },
          ])
        }
      } catch (err) {
        console.warn('Notifications fallback', err)
      }
    }
    loadData()
  }, [user])

  const handleMarkNotificationRead = async (notifId: string) => {
    try {
      await authApi.markNotificationRead(notifId)
    } catch {
      // Local fallback
    }
    setNotifications((prev) =>
      prev.map((n) => (n.id === notifId ? { ...n, is_read: true, isRead: true } : n))
    )
    toast.success('Notification marked as read')
  }

  const handleNotificationClick = (notif: any) => {
    if (!notif.is_read && !notif.isRead) {
      handleMarkNotificationRead(notif.id)
    }
    const targetUrl = notif.action_url || notif.actionUrl
    if (targetUrl) {
      navigate(targetUrl)
    } else if (notif.title?.toLowerCase().includes('message')) {
      navigate('/messages')
    } else if (notif.notification_type === 'job' || notif.type === 'job') {
      navigate('/profile?tab=services')
    } else if (notif.notification_type === 'escrow' || notif.type === 'escrow') {
      navigate('/profile?tab=wallet')
    }
  }

  const handleMarkAllNotificationsRead = async () => {
    try {
      await authApi.markAllNotificationsRead()
    } catch {
      // Local fallback
    }
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, is_read: true, isRead: true }))
    )
    toast.success('All notifications marked as read')
  }

  const unreadNotificationsCount = notifications.filter(
    (n) => !n.is_read && !n.isRead
  ).length

  useEffect(() => {
    if (tabParam && ['disputes', 'services', 'wallet', 'diagnostics', 'saved', 'notifications'].includes(tabParam)) {
      setActiveTab(tabParam)
    }
  }, [tabParam])

  const setTab = (tab: ProfileTab) => {
    setActiveTab(tab)
    setSearchParams({ tab })
  }

  // A newly registered user (or any real user without jobs) should NOT have dummy jobs/disputes on their profile!
  const isDemoBabatunde = user?.email === 'babatunde.o@gmail.com' || user?.id === 'demo-customer-1'
  const isNewlyRegistered = !isDemoBabatunde && userBookings.length === 0

  const statsDisplay = (() => {
    if (isDemoBabatunde && userBookings.length === 0) {
      return {
        jobsCount: 18,
        escrowVolume: '₦1,240,500',
        disputesText: '1 (100% Won)',
        patronBadge: '★ 5.0 Patron (14 Rated Pros)',
      }
    }
    if (userBookings.length === 0) {
      return {
        jobsCount: 0,
        escrowVolume: '₦0.00',
        disputesText: '0 (Clean Record)',
        patronBadge: user?.role === 'worker' ? '★ New Artisan (0 Jobs Executed)' : '★ New Member (0 Jobs Hired)',
      }
    }
    const totalVolume = userBookings.reduce((sum, b) => sum + (Number(b.agreed_amount) || 0), 0)
    return {
      jobsCount: userBookings.length,
      escrowVolume: totalVolume > 0 ? formatCurrency(totalVolume) : '₦0.00',
      disputesText: `${userDisputes.length} (${userDisputes.length === 0 ? 'Clean Record' : 'Active'})`,
      patronBadge: `★ Verified ${user?.role === 'worker' ? 'Artisan' : 'Patron'} (${userBookings.length} Jobs)`,
    }
  })()

  // Wallet State
  const [copiedNuban, setCopiedNuban] = useState(false)
  const [transferAmount, setTransferAmount] = useState('32090.00')
  const [isTransferring, setIsTransferring] = useState(false)
  const [ledgerFilter, setLedgerFilter] = useState<'all' | 'restitution' | 'payouts' | 'deposits'>('all')

  const copyNuban = (num: string) => {
    navigator.clipboard.writeText(num)
    setCopiedNuban(true)
    toast.success('NUBAN copied to clipboard')
    setTimeout(() => setCopiedNuban(false), 2000)
  }

  const handleInstantTransfer = async () => {
    setIsTransferring(true)
    await new Promise((r) => setTimeout(r, 1400))
    setIsTransferring(false)
    toast.success('Transfer of ₦32,090.00 initiated to GTBank! Settlement in < 45 seconds.')
  }

  return (
    <div className="min-h-screen bg-dark-bg text-white pt-4 pb-20">
      <div className="max-w-[1380px] mx-auto px-4">
        {/* User Hero Profile Card (Matches Image 1 & 3) */}
        <div className="glass-panel rounded-3xl p-6 sm:p-7 mb-6">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 pb-6 border-b border-white/10">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              {/* Profile Avatar with Hover Edit Trigger */}
              <div
                className="relative group cursor-pointer"
                onClick={() => setIsEditModalOpen(true)}
                title="Click to edit profile & picture"
              >
                <img
                  src={profileData.avatar}
                  alt={`${profileData.firstName} ${profileData.lastName}`}
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-primary-500/40 shadow-glow-sm transition-transform group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/50 rounded-2xl opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity text-white text-[10px] font-bold gap-0.5">
                  <Camera className="w-4 h-4 text-primary-300" />
                  <span>Change</span>
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-primary-600 text-white flex items-center justify-center text-[10px] font-bold border-2 border-dark-bg">
                  ✓
                </div>
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <h1 className="text-2xl font-black text-white">{profileData.firstName} {profileData.lastName}</h1>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary-700/40 text-primary-300 border border-primary-500/30">
                    {profileData.tier}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    • Escrow Guaranteed
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-300 mb-2">
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/5 border border-primary-500/20 text-white font-semibold">
                    <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                    <span>Device GPS: {profileData.locationName || locationName}</span>
                    {userLocation && (
                      <span className="text-[10px] font-mono text-primary-300 ml-1">
                        ({userLocation.lat.toFixed(4)}°, {userLocation.lng.toFixed(4)}°)
                      </span>
                    )}
                  </span>
                  <button
                    onClick={async () => {
                      toast.loading('Acquiring live device GPS fix...', { id: 're-gps' })
                      const success = await requestGPSLocation()
                      toast.dismiss('re-gps')
                      if (success) {
                        toast.success('Device GPS updated & synced!', { icon: '📍' })
                      } else {
                        toast.error('Could not acquire device GPS.')
                      }
                    }}
                    className="px-2 py-1 rounded-lg bg-primary-700/30 hover:bg-primary-700/50 border border-primary-500/30 text-[10px] font-bold text-primary-300 transition-colors cursor-pointer"
                    title="Grab fresh device GPS fix"
                  >
                    🔄 Re-sync GPS
                  </button>
                  <span className="text-gray-500">•</span>
                  <span>📱 {profileData.phone}</span>
                  <span className="text-gray-500">•</span>
                  <span className="font-mono text-gray-400">
                    ID: #{user?.id ? user.id.slice(0, 8).toUpperCase() : 'LF-NG-88402'}
                  </span>
                  <span className="text-gray-500">•</span>
                  <span className="text-gray-400">
                    Joined {user?.createdAt ? new Date(user.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : 'Feb 2024'}
                  </span>
                  {activeTab === 'wallet' && (
                    <>
                      <span className="text-gray-500">•</span>
                      <span className="text-primary-300 font-medium">CBN Sandbox Safe-Custody Protocol</span>
                    </>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 text-[11px] mb-2">
                  <span className="px-2.5 py-0.5 rounded-lg bg-white/5 border border-white/10 text-gray-300 flex items-center gap-1">
                    ✓ NIN & Proof of Address Verified
                  </span>
                  <span className="px-2.5 py-0.5 rounded-lg bg-white/5 border border-white/10 text-gray-300 flex items-center gap-1">
                    🛡️ Escrow Guarantee Enrolled
                  </span>
                  <span className="px-2.5 py-0.5 rounded-lg bg-white/5 border border-white/10 text-yellow-300 font-semibold">
                    {statsDisplay.patronBadge}
                  </span>
                </div>

                {/* Spoken Languages Row on Everyone's Profile */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] font-bold text-gray-400 flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5 text-primary-400" /> Languages Spoken:
                  </span>
                  {profileData.languages && profileData.languages.length > 0 ? (
                    profileData.languages.map((lang) => (
                      <span
                        key={lang}
                        className="px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-[11px] text-gray-200 font-medium"
                      >
                        {lang}
                      </span>
                    ))
                  ) : (
                    <span className="text-[11px] text-gray-500 italic">English (Default)</span>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(true)}
                    className="text-[10px] text-primary-400 hover:text-primary-300 font-semibold underline ml-1"
                  >
                    + Edit Languages
                  </button>
                </div>
              </div>
            </div>

            {/* Top Right Action Buttons */}
            <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
              {/* Notification Button with live count */}
              <button
                type="button"
                onClick={() => setTab('notifications')}
                className={`px-3.5 py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                  activeTab === 'notifications'
                    ? 'bg-primary-700 text-white border-primary-500 shadow-glow-sm'
                    : 'bg-white/5 border-white/10 text-gray-300 hover:text-white hover:bg-white/10'
                }`}
                title="View Notifications"
              >
                <Bell className="w-3.5 h-3.5 text-primary-400" />
                <span>Notifications</span>
                {unreadNotificationsCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-primary-500 text-white text-[10px] font-bold">
                    {unreadNotificationsCount}
                  </span>
                )}
              </button>

              {/* Universal Edit Profile Button */}
              <button
                type="button"
                onClick={() => setIsEditModalOpen(true)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 transition-all shadow-glow"
                style={{ background: 'linear-gradient(135deg, #6D28D9, #7C3AED)' }}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Profile</span>
              </button>

              {activeTab === 'diagnostics' ? (
                <>
                  <button
                    onClick={() => toast.success('Running full IoT diagnostic scan across 3 nodes...')}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 flex items-center gap-1.5 transition-colors text-gray-200"
                  >
                    <Activity className="w-3.5 h-3.5 text-primary-400" />
                    Scan Nodes
                  </button>
                  <button
                    onClick={() => toast('Pairing new IoT appliance node...')}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 flex items-center gap-1.5 transition-colors text-gray-200"
                  >
                    <span>+ Add Appliance</span>
                  </button>
                </>
              ) : activeTab === 'wallet' ? (
                <>
                  <button
                    onClick={() => toast.success('Exporting full cryptographic ledger...')}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 flex items-center gap-1.5 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-primary-400" />
                    Export Ledger
                  </button>
                  <button
                    onClick={() => toast('Bank linking dialog active')}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 flex items-center gap-1.5 transition-colors"
                  >
                    <Building className="w-3.5 h-3.5 text-primary-400" />
                    Link Bank
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setTab('wallet')}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 flex items-center gap-1.5 transition-colors text-gray-200"
                  >
                    <Lock className="w-3.5 h-3.5 text-primary-400" />
                    Escrow Wallet
                  </button>
                  <button
                    onClick={() => toast('Verification Dossier loaded')}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 flex items-center gap-1.5 transition-colors text-gray-300"
                  >
                    <FileText className="w-3.5 h-3.5 text-primary-400" />
                    Dossier
                  </button>
                </>
              )}
            </div>
          </div>

          {/* 4 Dynamic Stat Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-5">
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary-700/30 text-primary-300 flex items-center justify-center flex-shrink-0">
                <Briefcase className="w-4 h-4" />
              </div>
              <div>
                <div className="text-lg font-black text-white">{statsDisplay.jobsCount}</div>
                <div className="text-[11px] text-gray-400">
                  {user?.role === 'worker' ? 'Jobs Executed' : 'Hired Craft Projects'}
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <div className="text-lg font-black text-white">{statsDisplay.escrowVolume}</div>
                <div className="text-[11px] text-gray-400">
                  {user?.role === 'worker' ? 'Earned in Escrow' : 'Protected in Escrow'}
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <div className="text-lg font-black text-white">{statsDisplay.disputesText}</div>
                <div className="text-[11px] text-gray-400">Dispute Conciliated</div>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary-700/30 text-primary-300 flex items-center justify-center flex-shrink-0">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <div className="text-lg font-black text-white">&lt; 15 mins</div>
                <div className="text-[11px] text-gray-400">Avg Response Pace</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 p-1.5 rounded-2xl glass-panel mb-6 overflow-x-auto">
          <button
            onClick={() => setTab('disputes')}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 whitespace-nowrap transition-all ${
              activeTab === 'disputes'
                ? 'bg-primary-700 text-white shadow-glow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <span>Dispute & Mediation History</span>
            <span className="w-4 h-4 rounded-full bg-primary-500 text-white text-[10px] flex items-center justify-center font-bold">
              {isNewlyRegistered ? 0 : (userDisputes.length || 1)}
            </span>
          </button>

          <button
            onClick={() => setTab('services')}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 whitespace-nowrap transition-all ${
              activeTab === 'services'
                ? 'bg-primary-700 text-white shadow-glow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <span>Past Completed Services ({isNewlyRegistered ? 0 : (userBookings.length || (isDemoBabatunde ? 17 : 0))})</span>
          </button>

          <button
            onClick={() => setTab('wallet')}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 whitespace-nowrap transition-all ${
              activeTab === 'wallet'
                ? 'bg-primary-700 text-white shadow-glow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Escrow Ledger & Wallet</span>
          </button>

          <button
            onClick={() => setTab('notifications')}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 whitespace-nowrap transition-all ${
              activeTab === 'notifications'
                ? 'bg-primary-700 text-white shadow-glow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Notifications</span>
            {unreadNotificationsCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-primary-500 text-white text-[10px] flex items-center justify-center font-bold">
                {unreadNotificationsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setTab('diagnostics')}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 whitespace-nowrap transition-all ${
              activeTab === 'diagnostics'
                ? 'bg-primary-700 text-white shadow-glow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Appliance Diagnostics</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-primary-900/60 text-primary-300 font-bold border border-primary-500/30">
              3 Connected • 1 Warning Resolved
            </span>
          </button>

          <button
            onClick={() => setTab('saved')}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 whitespace-nowrap transition-all ${
              activeTab === 'saved'
                ? 'bg-primary-700 text-white shadow-glow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Saved Technicians (8)</span>
          </button>
        </div>

        {/* ======================================================== */}
        {/* TAB 1: DISPUTE & MEDIATION HISTORY                       */}
        {/* ======================================================== */}
        {activeTab === 'disputes' && (
          isNewlyRegistered && userDisputes.length === 0 ? (
            <div className="glass-panel rounded-3xl p-10 text-center border border-white/10 space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto text-2xl shadow-glow-sm">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white">0 Disputes on Record &bull; 100% Clean Standing</h3>
                <p className="text-xs text-gray-400 max-w-md mx-auto mt-1 leading-relaxed">
                  You have 0 active or past disputes. Every booking and transaction through LocalFix is secured by multi-signature escrow custody and impartial conciliation.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-gray-300">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Escrow Guarantee Enrolled &bull; Zero Incident Flags</span>
              </div>
            </div>
          ) : (
          <div className="space-y-6">
            <div className="grid lg:grid-cols-12 gap-6">
              {/* Left Column (8 cols) */}
              <div className="lg:col-span-8 space-y-6">
                {/* Main Case Card */}
                <div className="glass-panel rounded-3xl p-6 sm:p-7 space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <span className="text-xs font-mono text-gray-400">
                      CASE ID #LX-7829-INV &bull; Vault #LF-ESC-9921
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      100% RESTITUTED &bull; Oct 18, 2026
                    </span>
                  </div>

                  <h2 className="text-xl sm:text-2xl font-black text-white leading-snug">
                    5kVA Felicity Pure Sine Wave Inverter Tripping Under Borehole Pump Load
                  </h2>

                  {/* Restitution Confirmed Box */}
                  <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-white text-sm">Arbitral Award & Full Restitution Confirmed</div>
                        <div className="text-xs text-gray-300 mt-0.5">
                          ₦32,090.00 returned to Providus Escrow Vault &bull; 0% Customer Deductible
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-black text-emerald-400">+₦32,090.00</div>
                      <div className="text-[10px] text-gray-400">Credited to Escrow Vault</div>
                    </div>
                  </div>

                  {/* 3 Involved Parties */}
                  <div className="grid sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
                      <span className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1">
                        Contractor Involved
                      </span>
                      <div className="font-bold text-white">Tunde Adewale</div>
                      <div className="text-primary-300 text-[11px]">COREN Master Tech</div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
                      <span className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1">
                        Lead Mediator
                      </span>
                      <div className="font-bold text-white">Amina Bello</div>
                      <div className="text-primary-300 text-[11px]">Ikeja Hub #04 Lead</div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
                      <span className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1">
                        Neutral Physical Inspector
                      </span>
                      <div className="font-bold text-white">Engr. Kehinde Balogun</div>
                      <div className="text-primary-300 text-[11px]">FNSE Electrical Assessor</div>
                    </div>
                  </div>

                  {/* Verdict & Enforcement split */}
                  <div className="grid sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <Search className="w-3.5 h-3.5 text-primary-400" />
                        Physical Bench Testing Verdict
                      </div>
                      <p className="text-gray-300 text-[11px] leading-relaxed">
                        Neutral tester inspected the Schneider AC contactor relay on-site in Ikeja GRA. High contact resistance (48.2mΩ vs allowable 2.5mΩ) and thermal runaway under 1.5HP borehole induction confirmed unauthorized counterfeit relay insertion.
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <ShieldAlert className="w-3.5 h-3.5 text-primary-400" />
                        Enforcement & Guild Sanction
                      </div>
                      <p className="text-gray-300 text-[11px] leading-relaxed">
                        100% of final repair escrow reversed directly to Babatunde. Artisan Tunde Adewale suspended from dispatch pending completion of mandatory OEM Parts Authentication Guild Training Module.
                      </p>
                    </div>
                  </div>

                  {/* 3 Action Buttons */}
                  <div className="flex flex-wrap gap-2.5 pt-2">
                    <button
                      onClick={() => toast.success('Downloading Inspection Dossier PDF (4.8MB)...')}
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 flex items-center gap-1.5 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5 text-primary-400" />
                      Inspection Dossier (PDF 4.8MB)
                    </button>
                    <Link
                      to="/disputes/LX-7829-INV"
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 flex items-center gap-1.5 transition-colors text-gray-200"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-primary-400" />
                      Mediation Room Transcript
                    </Link>
                    <button
                      onClick={() => toast.success('Settlement Certificate verified')}
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-primary-700/30 hover:bg-primary-700/50 text-primary-200 border border-primary-500/30 flex items-center gap-1.5 transition-colors"
                    >
                      <Award className="w-3.5 h-3.5 text-primary-400" />
                      Settlement Certificate
                    </button>
                  </div>
                </div>

                {/* Verified Incident Stepper & Chain of Custody */}
                <div className="glass-panel rounded-3xl p-6 sm:p-7 space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <div>
                      <h3 className="text-sm font-bold text-white">Verified Incident Stepper & Chain of Custody</h3>
                      <p className="text-xs text-gray-400">Cryptographically signed logs stored on LocalFix Escrow Fabric</p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      5 of 5 Complete
                    </span>
                  </div>

                  <div className="space-y-4 text-xs">
                    {[
                      {
                        title: 'Issue Flagged & Escrow Auto-Frozen',
                        time: 'Oct 17, 2026 • 10:14 AM',
                        desc: 'Babatunde reported Error F04 tripping inverter whenever the 1.5HP borehole activated. Level 1 Smart Escrow locked ₦32,090 payout pending resolution.',
                      },
                      {
                        title: 'Cure Window & 3-Way Digital Mediation',
                        time: 'Oct 17, 2026 • 02:30 PM',
                        desc: 'Live session hosted by Amina Bello with artisan Tunde Adewale. Technician claimed water pump surge caused trip; homeowner requested third-party hardware bench test.',
                      },
                      {
                        title: 'Physical Bench Inspection in Ikeja GRA',
                        time: 'Oct 18, 2026 • 09:45 AM',
                        desc: 'Engr. Balogun ran FLIR infrared thermography showing an 84.6°C hotspot on the contactor coil. Component confirmed counterfeit with non-copper alloy contacts.',
                        evidence: 'Evidence File: IR-THERM-84C-RELAY.JPG (Uploaded to Case Vault)',
                      },
                      {
                        title: 'Binding LocalFix Arbitral Settlement Ruling',
                        time: 'Oct 18, 2026 • 01:10 PM',
                        desc: 'Mediation board approved total recovery for homeowner. Neutral assessment fee (₦15,000) fully underwritten by LocalFix Platform Quality Fund.',
                      },
                      {
                        title: 'Instant Refund Deposited & Case Archived',
                        time: 'Oct 18, 2026 • 05:12 PM',
                        desc: '₦32,090.00 credited immediately into Babatunde\'s Providus Escrow Balance. Dispute closed with zero liability mark on homeowner record.',
                      },
                    ].map((step, idx) => (
                      <div key={idx} className="flex items-start gap-3.5">
                        <div className="w-6 h-6 rounded-full bg-primary-700/40 text-primary-300 border border-primary-500/40 flex items-center justify-center font-bold text-[11px] flex-shrink-0 mt-0.5">
                          {idx + 1}
                        </div>
                        <div className="flex-1 pb-3 border-b border-white/5">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                            <strong className="text-white text-xs">{step.title}</strong>
                            <span className="text-[11px] text-gray-500 font-mono">{step.time}</span>
                          </div>
                          <p className="text-gray-400 text-[11px] leading-relaxed">{step.desc}</p>
                          {step.evidence && (
                            <div className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary-700/20 text-primary-300 text-[10px] font-mono border border-primary-500/20">
                              <span>&rarr; {step.evidence}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column (4 cols) */}
              <div className="lg:col-span-4 space-y-6">
                {/* LocalFix Virtual Escrow */}
                <div className="glass-panel rounded-3xl p-6 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <div>
                      <span className="text-[10px] text-gray-400 uppercase tracking-wider block">LOCALFIX VIRTUAL ESCROW</span>
                      <span className="text-xs font-bold text-white">Available Restitution Balance</span>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30">
                      • ProvidusBank NUBAN
                    </span>
                  </div>

                  <div>
                    <div className="text-3xl font-black text-white">₦32,090<span className="text-lg text-gray-400">.00</span></div>
                    <div className="text-xs text-emerald-400 mt-0.5 flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" /> Liquid & Ready for Withdrawal
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 text-xs space-y-1.5 font-mono">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Virtual Escrow Acct:</span>
                      <span className="text-white font-bold">9940182309</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Account Name:</span>
                      <span className="text-white">Babatunde O. / LocalFix</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Partner Provision:</span>
                      <span className="text-primary-300">ProvidusBank Escrow API</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <button
                      onClick={() => setTab('wallet')}
                      className="w-full py-3 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-2 transition-all shadow-glow"
                      style={{ background: 'linear-gradient(135deg, #6D28D9, #7C3AED)' }}
                    >
                      Withdraw to Commercial Bank (GTB)
                    </button>
                    <button
                      onClick={() => navigate('/services')}
                      className="w-full py-3 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 flex items-center justify-center transition-colors"
                    >
                      Re-Apply to Next Electrical Repair
                    </button>
                  </div>

                  {/* Blockchain stamp */}
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-[10px] text-gray-400">
                    <div>
                      <div className="font-bold text-gray-300 uppercase tracking-wider">NDPR BLOCKCHAIN STAMP</div>
                      <div className="font-mono text-[9px] text-primary-300 truncate max-w-[160px]">
                        0x7EBA.../A17C4C0
                      </div>
                    </div>
                    <QrCode className="w-6 h-6 text-primary-400" />
                  </div>
                </div>

                {/* Registered Equipment */}
                <div className="glass-panel rounded-3xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white">Registered Equipment</h3>
                    <button className="text-xs text-primary-400 hover:text-primary-300">Edit List</button>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    {userBookings.length > 0 ? (
                      userBookings.slice(0, 3).map((b, idx) => (
                        <div key={b.id || idx} className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                          <div>
                            <div className="font-bold text-white">{b.service_type || 'Service Order'}</div>
                            <div className="text-[11px] text-gray-400">Order #{b.booking_code} &bull; {b.location_address || 'Lagos'}</div>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary-700/30 text-primary-300 border border-primary-500/30 capitalize">
                            {b.status?.replace('_', ' ') || 'Active'}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center space-y-2">
                        <Activity className="w-5 h-5 text-gray-400 mx-auto" />
                        <div className="text-gray-300 font-semibold text-xs">No Equipment Logged</div>
                        <div className="text-[10px] text-gray-500">Book maintenance or link an appliance to track diagnostic warranty status.</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Patron Standing Metric */}
                <div className="glass-panel rounded-3xl p-6 space-y-3">
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider block">LOCALFIX COMMUNITY TRUST</span>
                  <h3 className="text-sm font-bold text-white">Platform Standing Metric</h3>

                  <div className="flex items-center justify-between py-2">
                    <div>
                      <div className="text-3xl font-black text-white">
                        {userBookings.length > 0 ? '100%' : '100%'}
                      </div>
                      <div className="text-xs text-gray-400">
                        {userBookings.length > 0 ? 'Smooth 1st-Stage Release Rate' : 'Verified Escrow Enrolled'}
                      </div>
                    </div>
                    <div className="w-12 h-12 rounded-full border-2 border-primary-400 flex items-center justify-center font-bold text-xs text-primary-300">
                      {userBookings.length > 0 ? `${userBookings.length}/${userBookings.length}` : '0/0'}
                    </div>
                  </div>

                  <p className="text-[11px] text-gray-400 leading-relaxed pt-2 border-t border-white/10">
                    {userBookings.length > 0
                      ? `${profileData.firstName} has successfully cleared all escrow releases with zero dispute default incidents.`
                      : `${profileData.firstName} is in verified standing with 0 complaints or dispute defaults on record.`}
                  </p>
                </div>
              </div>
            </div>

            {/* Completed Service History Excerpts */}
            <div className="glass-panel rounded-3xl p-6 sm:p-7 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">Completed Service History (Recent Excerpts)</h3>
                  <p className="text-xs text-gray-400">
                    {userBookings.length > 0
                      ? `Showing ${Math.min(userBookings.length, 3)} of ${userBookings.length} work orders on record`
                      : '0 work orders on record for this account'}
                  </p>
                </div>
                {userBookings.length > 0 && (
                  <button
                    onClick={() => setTab('services')}
                    className="text-xs text-primary-400 hover:text-primary-300 font-semibold"
                  >
                    View All {userBookings.length} Work Orders &rarr;
                  </button>
                )}
              </div>

              {userBookings.length > 0 ? (
                <div className="grid sm:grid-cols-3 gap-4">
                  {userBookings.slice(0, 3).map((b, idx) => (
                    <div key={b.id || idx} className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-gray-400 font-mono">#{b.booking_code} &bull; {b.created_at ? new Date(b.created_at).toLocaleDateString() : 'Recent'}</span>
                        <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded capitalize">
                          ✓ {b.status?.replace('_', ' ') || 'Recorded'}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-sm">{b.service_type}</h4>
                        <p className="text-[11px] text-gray-400 mt-1 line-clamp-2">
                          {b.description || `Service engagement scheduled for ${b.preferred_date || 'immediate arrival'}.`}
                        </p>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-white/10 text-xs">
                        <span className="text-gray-300">{b.worker_name || 'Verified Artisan'}</span>
                        <span className="font-bold text-white">₦{Number(b.agreed_amount || 0).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 rounded-2xl bg-white/5 border border-white/10 text-center space-y-3">
                  <Briefcase className="w-8 h-8 text-primary-400 mx-auto" />
                  <h4 className="text-white font-bold text-sm">No Jobs Received or Completed Yet</h4>
                  <p className="text-xs text-gray-400 max-w-md mx-auto">
                    You have not received or requested any jobs yet. When you complete a booking or hire a technician, your verified work receipts and escrow certificates will be listed here.
                  </p>
                  <div className="pt-2">
                    <button
                      onClick={() => navigate('/services')}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-white shadow-glow-sm"
                      style={{ background: 'linear-gradient(135deg, #6D28D9, #7C3AED)' }}
                    >
                      Find Artisans Nearby →
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          )
        )}

        {/* ======================================================== */}
        {/* TAB 2: ESCROW LEDGER & WALLET (Image 3)                   */}
        {/* ======================================================== */}
        {activeTab === 'wallet' && (
          <div className="space-y-6">
            <div className="grid lg:grid-cols-12 gap-6">
              {/* Left Column (8 cols) */}
              <div className="lg:col-span-8 space-y-6">
                {/* Liquid Balance & Lifetime Volume */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="glass-panel rounded-3xl p-6 space-y-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400 uppercase tracking-wider font-semibold">
                        LIQUID RESTITUTION & PAYOUT BALANCE
                      </span>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                        Cleared for Payout
                      </span>
                    </div>

                    <div>
                      <div className="text-3xl sm:text-4xl font-black text-white">
                        ₦{Number(walletData?.available_balance ?? (isDemoBabatunde ? 32090 : 0)).toLocaleString()}<span className="text-lg text-gray-400">.00</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
                        {walletData?.available_balance || isDemoBabatunde
                          ? 'Available for immediate transfer to your commercial bank NUBAN or re-applying to your next repair booking.'
                          : 'No pending restitution or escrow payouts. Funds deposited for active work orders will appear here under Providus protection.'}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2">
                      <button
                        onClick={handleInstantTransfer}
                        className="px-4 py-2.5 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 transition-all shadow-glow cursor-pointer"
                        style={{ background: 'linear-gradient(135deg, #6D28D9, #7C3AED)' }}
                      >
                        <ArrowUpRight className="w-3.5 h-3.5" />
                        Withdraw to Bank
                      </button>
                      <button
                        onClick={() => navigate('/services')}
                        className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-gray-200 cursor-pointer"
                      >
                        Book & Fund Escrow
                      </button>
                    </div>
                  </div>

                  <div className="glass-panel rounded-3xl p-6 space-y-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400 uppercase tracking-wider font-semibold">
                        LIFETIME ESCROW VOLUME
                      </span>
                      <ShieldCheck className="w-4 h-4 text-primary-400" />
                    </div>

                    <div>
                      <div className="text-3xl sm:text-4xl font-black text-white">
                        ₦{Number(walletData?.total_volume ?? (userBookings.reduce((sum, b) => sum + (Number(b.agreed_amount) || 0), 0) || (isDemoBabatunde ? 1240500 : 0))).toLocaleString()}<span className="text-lg text-gray-400">.00</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
                        {userBookings.length > 0 || isDemoBabatunde
                          ? `100% covered across ${userBookings.length || 14} trade jobs under multi-sig milestone holds.`
                          : '0 work orders executed. 100% guarantee applies to every future booking.'}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-white/10 flex justify-between items-center text-xs">
                      <span className="text-gray-400">Active Transit Hold:</span>
                      <span className="text-emerald-400 font-bold font-mono">
                        ₦{Number(walletData?.held_in_escrow ?? 0).toLocaleString()}.00 ({walletData?.held_in_escrow ? 'In Escrow' : 'All Settled'})
                      </span>
                    </div>
                  </div>
                </div>

                {/* Dedicated Providus Bank Escrow NUBAN */}
                <div className="glass-panel rounded-3xl p-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4 text-primary-400" />
                      <h3 className="font-bold text-white text-sm">ProvidusBank Escrow Safe-Deposit NUBAN</h3>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-primary-700/30 text-primary-300 border border-primary-500/30 font-semibold">
                        CBN / NDIC
                      </span>
                    </div>
                    <button
                      onClick={() => copyNuban('9940182309')}
                      className="text-xs font-semibold text-primary-400 hover:text-primary-300 flex items-center gap-1"
                    >
                      {copiedNuban ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>Copy NUBAN Details</span>
                    </button>
                  </div>

                  <p className="text-xs text-gray-400">
                    Direct inbound wire transfers to this NUBAN automatically fund your project escrow custody vaults instantly with zero intermediary delays.
                  </p>

                  <div className="grid sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-white/5 border border-white/10 font-mono text-xs">
                    <div>
                      <span className="text-[10px] text-gray-400 block font-sans">DEDICATED NUBAN</span>
                      <span className="text-base font-black text-white tracking-wider">9940 1823 09</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 block font-sans">BENEFICIARY NAME</span>
                      <span className="text-xs text-white">Babatunde O. / LocalFix Escrow</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 block font-sans">SETTLEMENT ROUTER</span>
                      <span className="text-xs text-primary-300">Providus NIP Gateway</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 block font-sans">AUTO-SWEEP RULE</span>
                      <span className="text-xs text-gray-300">Daily 18:00 WAT</span>
                    </div>
                  </div>
                </div>

                {/* Cryptographic Escrow Ledger */}
                <div className="glass-panel rounded-3xl p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold text-white">Cryptographic Escrow Ledger</h3>
                      <p className="text-xs text-gray-400">Immutable, two-way audit trail of deposits, milestone holds, disbursements, and arbitrated refunds.</p>
                    </div>
                    <span className="text-xs text-gray-500 font-mono">14 Transactions Recorded</span>
                  </div>

                  {/* Filter chips & Search bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                    <div className="flex flex-wrap gap-2 text-xs">
                      {[
                        { id: 'all', label: 'All Entries' },
                        { id: 'restitution', label: 'Restitution Awards' },
                        { id: 'payouts', label: 'Milestone Payouts' },
                        { id: 'deposits', label: 'Vault Deposits' },
                      ].map((chip) => (
                        <button
                          key={chip.id}
                          onClick={() => setLedgerFilter(chip.id as any)}
                          className={`px-3 py-1.5 rounded-xl font-semibold border transition-all ${
                            ledgerFilter === chip.id
                              ? 'bg-primary-700 text-white border-primary-500 shadow-glow-sm'
                              : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'
                          }`}
                        >
                          {chip.label}
                        </button>
                      ))}
                    </div>

                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        placeholder="Search WO #, artisan, ref..."
                        className="pl-9 pr-3 py-2 rounded-xl text-xs bg-white/5 border border-white/10 text-white placeholder-gray-500 outline-none focus:border-primary-400 w-full sm:w-48"
                      />
                    </div>
                  </div>

                  {/* Ledger entries list */}
                  <div className="space-y-3 pt-2">
                    {/* Entry 1 */}
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
                            <ArrowDownLeft className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-bold text-white text-xs sm:text-sm flex items-center gap-2">
                              Arbitration Restitution Award
                              <span className="text-[10px] px-2 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-bold">
                                Settled in Wallet
                              </span>
                            </div>
                            <div className="text-[11px] text-gray-400">
                              Work Order #LX-7829-INV: 5kVA Felicity Inverter & Contactor Relay Repair
                            </div>
                          </div>
                        </div>

                        <div className="flex sm:flex-col sm:items-end justify-between">
                          <div className="text-base sm:text-lg font-black text-emerald-400">+₦32,090.00</div>
                          <div className="flex gap-2">
                            <button className="text-[10px] text-primary-300 hover:underline">Settlement Deed</button>
                            <button className="text-[10px] text-gray-400 hover:underline">Receipt</button>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-gray-500 font-mono pt-2 border-t border-white/5">
                        <span>Ref: #TX-ESC-9921-REST • Oct 18, 2026 • 05:12 PM WAT</span>
                        <span>Arbitrators: Amina Bello (#Hub04) & Engr. Balogun</span>
                        <span className="text-primary-300">Proof SHA-256: 7fd3b185...9921c (Verified Block)</span>
                      </div>
                    </div>

                    {/* Entry 2 */}
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0">
                            <Lock className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-bold text-white text-xs sm:text-sm flex items-center gap-2">
                              Escrow Milestone 2 Dispute Freeze
                              <span className="text-[10px] px-2 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold">
                                Restituted Post-Inspection
                              </span>
                            </div>
                            <div className="text-[11px] text-gray-400">
                              Work Order #LX-7829-INV: Relay replacement failed burn-in audit
                            </div>
                          </div>
                        </div>

                        <div className="flex sm:flex-col sm:items-end justify-between">
                          <div className="text-base sm:text-lg font-black text-amber-300">₦32,090.00</div>
                          <span className="text-[10px] text-gray-500 font-mono">Unfrozen &rarr; Wallet</span>
                        </div>
                      </div>

                      <div className="text-[10px] text-gray-500 font-mono pt-1">
                        Ref: #TX-ESC-9921-FRZ • Oct 17, 2026 • 10:14 AM WAT
                      </div>
                    </div>

                    {/* Entry 3 */}
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-primary-700/30 text-primary-300 flex items-center justify-center flex-shrink-0">
                            <ArrowUpRight className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-bold text-white text-xs sm:text-sm flex items-center gap-2">
                              Milestone 1: Mobilization Deposit (40%)
                              <span className="text-[10px] px-2 py-0.2 rounded bg-primary-700/30 text-primary-300 font-bold">
                                OTP Authorized
                              </span>
                            </div>
                            <div className="text-[11px] text-gray-400">
                              Disbursed to Tunde Adewale (COREN Master Tech) for initial diagnostic & contactor components.
                            </div>
                          </div>
                        </div>

                        <div className="flex sm:flex-col sm:items-end justify-between">
                          <div className="text-base sm:text-lg font-black text-white">-₦21,393.00</div>
                          <span className="text-[10px] text-primary-400 hover:underline cursor-pointer">View OTP Log</span>
                        </div>
                      </div>

                      <div className="text-[10px] text-gray-500 font-mono pt-1">
                        Ref: #TX-ESC-9921-MOB • Oct 14, 2026 • 09:30 AM WAT
                      </div>
                    </div>

                    {/* Entry 4 */}
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-primary-700/30 text-primary-300 flex items-center justify-center flex-shrink-0">
                            <Building className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-bold text-white text-xs sm:text-sm flex items-center gap-2">
                              Escrow Inbound Job Funding
                              <span className="text-[10px] px-2 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-bold">
                                Paystack MasterPass Cleared
                              </span>
                            </div>
                            <div className="text-[11px] text-gray-400">
                              Full contract commitment funded into LocalFix Escrow Vault for Work Order #LX-7829-INV.
                            </div>
                          </div>
                        </div>

                        <div className="flex sm:flex-col sm:items-end justify-between">
                          <div className="text-base sm:text-lg font-black text-emerald-400">+₦53,483.00</div>
                          <span className="text-[10px] text-gray-500 font-mono">Vault Locked</span>
                        </div>
                      </div>

                      <div className="text-[10px] text-gray-500 font-mono pt-1">
                        Ref: #TX-ESC-9921-DEP • Oct 14, 2026 • 08:45 AM WAT
                      </div>
                    </div>

                    {/* Entry 5 */}
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-white/10 text-gray-300 flex items-center justify-center flex-shrink-0">
                            ✓
                          </div>
                          <div>
                            <div className="font-bold text-white text-xs sm:text-sm flex items-center gap-2">
                              100% Settlement & Artisan Tip (N2,000)
                              <span className="text-[10px] px-2 py-0.2 rounded bg-yellow-500/20 text-yellow-300 font-bold">
                                5.0★ Rating Awarded
                              </span>
                            </div>
                            <div className="text-[11px] text-gray-400">
                              Work Order #WO-9821: Solar Array Deep Cleaning & Balancing with Chukwudi O.
                            </div>
                          </div>
                        </div>

                        <div className="flex sm:flex-col sm:items-end justify-between">
                          <div className="text-base sm:text-lg font-black text-white">-₦47,000.00</div>
                          <span className="text-[10px] text-gray-500 font-mono">Final Cleared</span>
                        </div>
                      </div>

                      <div className="text-[10px] text-gray-500 font-mono pt-1">
                        Ref: #TX-ESC-8714-FIN • Sep 14, 2026 • 04:15 PM WAT
                      </div>
                    </div>

                    {/* Entry 6 */}
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-white/10 text-gray-300 flex items-center justify-center flex-shrink-0">
                            ✓
                          </div>
                          <div>
                            <div className="font-bold text-white text-xs sm:text-sm flex items-center gap-2">
                              100% Clean Close Settlement
                              <span className="text-[10px] px-2 py-0.2 rounded bg-yellow-500/20 text-yellow-300 font-bold">
                                5.0★ Rating Awarded
                              </span>
                            </div>
                            <div className="text-[11px] text-gray-400">
                              Work Order #WO-8714: Smart Water Pump Pressure Automation with Sunday A.
                            </div>
                          </div>
                        </div>

                        <div className="flex sm:flex-col sm:items-end justify-between">
                          <div className="text-base sm:text-lg font-black text-white">-₦68,500.00</div>
                          <span className="text-[10px] text-gray-500 font-mono">Final Cleared</span>
                        </div>
                      </div>

                      <div className="text-[10px] text-gray-500 font-mono pt-1">
                        Ref: #TX-ESC-8410-FIN • Aug 02, 2026 • 02:00 PM WAT
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column (4 cols) — Instant Payout to Bank */}
              <div className="lg:col-span-4 space-y-6">
                <div className="glass-panel rounded-3xl p-6 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4 text-primary-400" />
                      <h3 className="font-bold text-white text-sm">Instant Payout to Bank</h3>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded">
                      Zero Fee
                    </span>
                  </div>

                  <p className="text-xs text-gray-400 leading-relaxed">
                    Transfer liquid arbitration restitution directly to your verified commercial bank account via NIP instant rail.
                  </p>

                  {/* Bank card */}
                  <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-orange-600 text-white flex items-center justify-center font-black text-xs">
                        GTB
                      </div>
                      <div>
                        <div className="font-bold text-white text-xs">Guaranty Trust Bank</div>
                        <div className="font-mono text-[11px] text-gray-400">024 •••• 892</div>
                      </div>
                    </div>
                    <span className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold">
                      ✓
                    </span>
                  </div>

                  <div className="text-[11px] text-gray-400">
                    Account Name: <strong className="text-white">Babatunde Ogundimu</strong> (Tier-3 Matched)
                  </div>

                  {/* Transfer input */}
                  <div>
                    <div className="flex justify-between text-xs text-gray-400 mb-1.5 font-medium">
                      <span>Amount to Transfer:</span>
                      <button
                        onClick={() => setTransferAmount('32090.00')}
                        className="text-primary-400 hover:text-primary-300 font-semibold"
                      >
                        Use Max (₦32,090)
                      </button>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3.5 top-3 text-sm font-bold text-gray-400">₦</span>
                      <input
                        type="text"
                        value={transferAmount}
                        onChange={(e) => setTransferAmount(e.target.value)}
                        className="w-full pl-8 pr-4 py-2.5 rounded-xl text-base font-bold bg-white/5 border border-white/10 text-white outline-none focus:border-primary-400 font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-gray-400 pt-2 border-t border-white/10">
                    <div className="flex justify-between">
                      <span>NIP Gateway Processing</span>
                      <span className="text-emerald-400 font-semibold">FREE (LocalFix Tier-3)</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Estimated Settlement</span>
                      <span className="text-white font-medium">Under 45 Seconds</span>
                    </div>
                  </div>

                  <button
                    onClick={handleInstantTransfer}
                    disabled={isTransferring}
                    className="w-full py-3.5 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-2 transition-all shadow-glow"
                    style={{ background: 'linear-gradient(135deg, #6D28D9, #7C3AED)' }}
                  >
                    {isTransferring ? 'Processing 2FA Transfer...' : 'Initiate Instant Transfer (2FA)'}
                  </button>
                </div>

                {/* Legal Vault & Escrow Treaty */}
                <div className="glass-panel rounded-3xl p-6 space-y-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-primary-400" />
                    Legal Vault & Escrow Treaty
                  </h3>

                  <div className="space-y-3 text-xs text-gray-300">
                    <div className="flex items-start gap-2.5">
                      <Building className="w-3.5 h-3.5 text-primary-400 mt-0.5 flex-shrink-0" />
                      <p className="text-[11px] leading-relaxed">
                        <strong className="text-white block">NDIC Deposit Insurance:</strong>
                        Escrow deposits in transit are insured up to ₦5,000,000.00 via Providus Trust Safe-Custody.
                      </p>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <Lock className="w-3.5 h-3.5 text-primary-400 mt-0.5 flex-shrink-0" />
                      <p className="text-[11px] leading-relaxed">
                        <strong className="text-white block">Autonomous Neutral Mediation:</strong>
                        In the event of dispute deadlock, our Ikeja Mediation Room releases funds only on joint inspection sign-off.
                      </p>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                      <p className="text-[11px] leading-relaxed">
                        <strong className="text-white block">Zero Arbitration Surcharges:</strong>
                        Conciliation is free for LocalFix Verified Residents.
                      </p>
                    </div>
                  </div>

                  {/* Mediator prompt */}
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-primary-700 text-white font-bold text-xs flex items-center justify-center">
                        AB
                      </div>
                      <div>
                        <div className="font-bold text-white text-[11px]">Amina Bello</div>
                        <div className="text-[10px] text-gray-400">Senior Escrow Conciliator &bull; Hub #04</div>
                      </div>
                    </div>
                    <Link
                      to="/messages"
                      className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-primary-700/30 text-primary-300 hover:bg-primary-700/50 transition-colors"
                    >
                      Live Chat
                    </Link>
                  </div>
                </div>

                {/* Trust Resolution Ratio chart */}
                <div className="glass-panel rounded-3xl p-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">
                      TRUST RESOLUTION RATIO
                    </span>
                    <span className="text-xs font-bold text-emerald-400">100% Cleared</span>
                  </div>

                  {/* Mini curve graphic */}
                  <div className="h-16 flex items-end justify-between px-2 pt-4">
                    <div className="flex flex-col items-center">
                      <div className="w-2 h-6 rounded-full bg-primary-500/40" />
                      <span className="text-[9px] text-gray-500 mt-1">Aug 2026</span>
                      <span className="text-[9px] text-gray-400 font-mono">(₦58.5K)</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-2 h-8 rounded-full bg-primary-500/60" />
                      <span className="text-[9px] text-gray-500 mt-1">Sep 2026</span>
                      <span className="text-[9px] text-gray-400 font-mono">(₦47K)</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-2 h-12 rounded-full bg-emerald-400 shadow-glow-sm" />
                      <span className="text-[9px] text-gray-500 mt-1">Oct 2026</span>
                      <span className="text-[9px] text-emerald-400 font-mono">(+₦32.1K)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: PAST COMPLETED SERVICES & ACTIVE BOOKINGS */}
        {activeTab === 'services' && (
          <div className="glass-panel rounded-3xl p-6 sm:p-7 space-y-6">
            {userBookings.length > 0 && (
              <div className="space-y-3 pb-6 border-b border-white/10">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary-400" />
                    <span>Your Active Work Orders ({userBookings.length})</span>
                  </h3>
                  <span className="text-xs text-primary-300 font-mono">Live Database Sync</span>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                  {userBookings.map((b) => (
                    <div key={b.id} className="p-4 rounded-2xl bg-primary-950/40 border border-primary-500/30 space-y-2.5">
                      <div className="flex justify-between items-center text-gray-400 font-mono text-[10px]">
                        <span>#{b.booking_code || b.id.slice(0, 8)} &bull; {new Date(b.created_at).toLocaleDateString()}</span>
                        <span className={`px-2 py-0.5 rounded font-bold uppercase ${
                          b.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                          b.status === 'disputed' ? 'bg-red-500/20 text-red-400' :
                          b.status === 'in_progress' ? 'bg-primary-500/20 text-primary-300' :
                          'bg-amber-500/20 text-amber-300'
                        }`}>
                          {b.status.replace('_', ' ')}
                        </span>
                      </div>
                      <h4 className="font-bold text-white text-sm line-clamp-1">{b.service_type || b.description}</h4>
                      <p className="text-[11px] text-gray-400 line-clamp-2">{b.description}</p>
                      <div className="flex justify-between items-center text-xs text-gray-300 pt-2 border-t border-white/10">
                        <span className="text-primary-300 font-medium">Artisan ID: {b.worker ? String(b.worker).slice(0, 6) : 'Assigned'}</span>
                        <span className="font-bold text-white">{formatCurrency(b.agreed_amount || 0)}</span>
                      </div>
                      <div className="pt-2 flex flex-col gap-1.5">
                        <Link
                          to={`/tracking/${b.booking_code || b.id}`}
                          className="w-full py-2 rounded-xl text-center text-xs font-bold bg-emerald-600/30 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 flex items-center justify-center gap-1.5 transition-all shadow-md"
                        >
                          <Radio className="w-3.5 h-3.5 animate-pulse" />
                          <span>Live Track Worker Movement &rarr;</span>
                        </Link>
                        <Link
                          to={`/escrow/settlement/${b.booking_code || b.id}`}
                          className="w-full py-1.5 rounded-lg text-center text-xs font-semibold bg-primary-700/40 hover:bg-primary-700 text-white transition-colors"
                        >
                          Manage Escrow Vault &rarr;
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isNewlyRegistered && userBookings.length === 0 ? (
              <div className="text-center py-10 px-4 space-y-4">
                <div className="w-16 h-16 rounded-3xl bg-primary-700/20 border border-primary-500/30 text-primary-300 flex items-center justify-center mx-auto text-2xl shadow-glow-sm">
                  <Briefcase className="w-8 h-8 text-primary-400" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white">No Completed Services Yet</h3>
                  <p className="text-xs text-gray-400 max-w-md mx-auto mt-1 leading-relaxed">
                    {user?.role === 'worker'
                      ? 'You have not completed any jobs yet. Once a client hires you and approves work completion, your verified work orders, digital milestone signoffs, and payout receipts will be recorded here.'
                      : 'You have not hired any artisan yet. When you request a job through LocalFix, your work order, inspection signoff, and milestone escrow receipts will appear here.'}
                  </p>
                </div>
                <div className="pt-2">
                  {user?.role === 'worker' ? (
                    <button
                      onClick={() => {
                        if (user?.worker_profile_id) {
                          navigate(`/worker/${user.worker_profile_id}`)
                        } else {
                          toast.success('Your artisan profile is active and discoverable by clients!')
                        }
                      }}
                      className="px-5 py-3 rounded-xl text-xs font-bold text-white shadow-glow inline-flex items-center gap-2"
                      style={{ background: 'linear-gradient(135deg, #6D28D9, #7C3AED)' }}
                    >
                      <User className="w-4 h-4" />
                      <span>View Public Artisan Profile</span>
                    </button>
                  ) : (
                    <Link
                      to="/services"
                      className="px-5 py-3 rounded-xl text-xs font-bold text-white shadow-glow inline-flex items-center gap-2"
                      style={{ background: 'linear-gradient(135deg, #6D28D9, #7C3AED)' }}
                    >
                      <Briefcase className="w-4 h-4" />
                      <span>Explore Verified Artisans & Post a Job</span>
                    </Link>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <h3 className="text-lg font-bold text-white mb-3">All Verified Work Orders ({userBookings.length})</h3>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                  {userBookings.map((b, idx) => (
                    <div key={b.id || idx} className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                      <div className="flex justify-between text-gray-400 font-mono text-[10px]">
                        <span>#{b.booking_code} &bull; {b.created_at ? new Date(b.created_at).toLocaleDateString() : 'Recent'}</span>
                        <span className="text-emerald-400 font-bold capitalize">✓ {b.status?.replace('_', ' ') || 'Cleared'}</span>
                      </div>
                      <h4 className="font-bold text-white text-sm">{b.service_type}</h4>
                      <p className="text-[11px] text-gray-400 line-clamp-2">{b.description || 'Verified on-site LocalFix work order.'}</p>
                      <div className="flex justify-between items-center text-xs text-gray-300 pt-2 border-t border-white/5">
                        <span>{b.worker_name || 'Verified Artisan'}</span>
                        <span className="font-bold text-white">₦{Number(b.agreed_amount || 0).toLocaleString()} Paid</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: APPLIANCE DIAGNOSTICS (Image 1) */}
        {activeTab === 'diagnostics' && (
          isNewlyRegistered && userBookings.length === 0 ? (
            <div className="glass-panel rounded-3xl p-10 text-center border border-white/10 space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-primary-700/20 border border-primary-500/30 text-primary-300 flex items-center justify-center mx-auto text-2xl shadow-glow-sm">
                <Activity className="w-8 h-8 text-primary-400" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white">0 Connected Appliance Nodes</h3>
                <p className="text-xs text-gray-400 max-w-md mx-auto mt-1 leading-relaxed">
                  You have not registered any equipment yet. When a technician services your solar inverter, borehole pump, or air conditioning unit, digital diagnostic health records and warranties will be anchored here.
                </p>
              </div>
              <div className="pt-2">
                <button
                  onClick={() => navigate('/services')}
                  className="px-5 py-3 rounded-xl text-xs font-bold text-white shadow-glow inline-flex items-center gap-2 cursor-pointer"
                  style={{ background: 'linear-gradient(135deg, #6D28D9, #7C3AED)' }}
                >
                  <Wrench className="w-4 h-4" />
                  <span>Book Equipment Inspection</span>
                </button>
              </div>
            </div>
          ) : (
          <div className="space-y-6">
            {/* Top Grid: Health Index + Automated Surge Protection */}
            <div className="grid lg:grid-cols-12 gap-6">
              {/* Health Index (7 cols) */}
              <div className="lg:col-span-7 glass-panel rounded-3xl p-6 space-y-4 border border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    REAL-TIME SMART GRID TELEMETRY
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-white">
                      Home Infrastructure Health Index
                    </h2>
                    <p className="text-xs text-gray-400 mt-1 max-w-md leading-relaxed">
                      All core circuits stabilized following Oct 18 contactor replacement.
                    </p>
                  </div>

                  <div className="relative flex items-center justify-center flex-shrink-0">
                    <div className="w-20 h-20 rounded-full border-4 border-emerald-500/30 border-t-emerald-400 flex flex-col items-center justify-center text-center shadow-glow-sm">
                      <span className="text-lg font-black text-white">92%</span>
                      <span className="text-[9px] font-bold text-emerald-400 uppercase">OPTIMAL</span>
                    </div>
                  </div>
                </div>

                {/* 4 Health sub-stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-white/10 text-xs">
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                    <span className="text-[10px] text-gray-400 block">Active Monitored</span>
                    <strong className="text-white block text-sm">3 Units</strong>
                    <span className="text-[10px] text-emerald-400 font-semibold">✓ 100% Online</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                    <span className="text-[10px] text-gray-400 block">Critical Faults</span>
                    <strong className="text-white block text-sm">0 Active</strong>
                    <span className="text-[10px] text-gray-400">1 Arbitrated</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                    <span className="text-[10px] text-gray-400 block">IoT Gateway</span>
                    <strong className="text-white block text-sm">Fluke Bridge</strong>
                    <span className="text-[10px] text-primary-300 font-mono">v2.4 (Zigbee)</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                    <span className="text-[10px] text-gray-400 block">Next Guild Service</span>
                    <strong className="text-white block text-sm">In 18 Days</strong>
                    <span className="text-[10px] text-yellow-300">Daikin AC</span>
                  </div>
                </div>
              </div>

              {/* Automated Surge Protection & Escrow Protocol (5 cols) */}
              <div className="lg:col-span-5 glass-panel rounded-3xl p-6 space-y-3.5 border border-primary-500/30 bg-primary-900/10">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[10px] text-primary-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-primary-400" />
                    CBN Escrow Safe-Guard Enabled
                  </span>
                  <span className="font-mono text-[10px] text-gray-400">Node ID: LAG-IKE-77</span>
                </div>

                <h3 className="text-base font-bold text-white">
                  Automated Surge Protection & Escrow Protocol
                </h3>

                <p className="text-[11px] text-gray-300 leading-relaxed">
                  Inductive motor peaks are tracked via dual Hall-effect sensors. Any voltage sag or spike exceeding 40A automatically pauses release of maintenance escrow until verified by an accredited COREN guild inspector.
                </p>

                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between text-xs pt-2">
                  <div>
                    <span className="text-[10px] text-gray-400 block">Warranty Bond Status</span>
                    <span className="font-bold text-emerald-400 font-mono">₦250,000 Safe in CBN Escrow Vault</span>
                  </div>
                  <button
                    onClick={() => toast('Inspecting automated escrow trip rules')}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary-700/30 hover:bg-primary-700/50 text-primary-200 border border-primary-500/30 transition-colors"
                  >
                    Inspect Rules
                  </button>
                </div>
              </div>
            </div>

            {/* Main Diagnostics 2-Column Split */}
            <div className="grid lg:grid-cols-12 gap-6">
              {/* Left Column (8 cols): Registered Equipment & IoT Nodes */}
              <div className="lg:col-span-8 space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white">Registered Equipment & IoT Nodes</h3>
                    <p className="text-xs text-gray-400">3 Total &bull; Updated 2 mins ago</p>
                  </div>
                  <button
                    onClick={() => toast.success('Telemetry refreshed')}
                    className="text-xs text-primary-400 hover:text-primary-300 font-semibold"
                  >
                    Refresh Telemetry &rarr;
                  </button>
                </div>

                {/* Node 1: Felicity Hybrid Inverter */}
                <div className="glass-panel rounded-3xl p-6 space-y-4 border border-emerald-500/30 bg-emerald-500/5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/10">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-primary-700/40 text-primary-300 flex items-center justify-center font-bold text-sm">
                        ⚡
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-white text-base">5kVA Felicity Hybrid Pure Sine Inverter</h4>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                            • RESTORED & STABLE
                          </span>
                        </div>
                        <div className="text-xs text-gray-400">Main Utility Inverter Rack &bull; Ikeja GRA</div>
                      </div>
                    </div>
                  </div>

                  {/* Telemetry Strip */}
                  <div className="flex items-center justify-between text-xs text-primary-300 font-mono bg-white/5 p-2 rounded-xl border border-white/5">
                    <span>Live Modbus RS485 Inrush Telemetry</span>
                    <span className="text-emerald-400 font-bold">THD: 1.8% [Pure Sine Wave]</span>
                  </div>

                  {/* 4 Metrics */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                      <span className="text-[10px] text-gray-400 block">Output Voltage</span>
                      <strong className="text-white text-base font-mono">228.4 V</strong>
                      <span className="text-[10px] text-emerald-400 block">Nominal AC</span>
                    </div>
                    <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                      <span className="text-[10px] text-gray-400 block">Active Load</span>
                      <strong className="text-white text-base font-mono">1.42 kW</strong>
                      <span className="text-[10px] text-gray-400 block">28.4% Capacity</span>
                    </div>
                    <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                      <span className="text-[10px] text-gray-400 block">Lithium Bank</span>
                      <strong className="text-white text-base font-mono">94%</strong>
                      <span className="text-[10px] text-gray-400 block">52.8V Float</span>
                    </div>
                    <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                      <span className="text-[10px] text-gray-400 block">Contactor Temp</span>
                      <strong className="text-white text-base font-mono">34.2°C</strong>
                      <span className="text-[10px] text-emerald-400 block">Healthy [&lt; 45°C]</span>
                    </div>
                  </div>

                  {/* Contactor Bar */}
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <span className="text-gray-300">
                      100A OEM Schneider Contactor <span className="text-gray-500">(Fitted Oct 18 via SafeGuard):</span>
                    </span>
                    <div className="flex items-center gap-3 font-mono">
                      <span>Contact Resistance: <strong className="text-emerald-400">4.8 mΩ</strong> [Limit 5.0 mΩ]</span>
                      <span className="text-emerald-400 font-bold">0.00% Sag</span>
                    </div>
                  </div>

                  {/* Resolved banner */}
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-start gap-2.5 text-xs text-gray-300">
                    <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-white">Dispute Arbitration Resolved & Verified:</strong> Error F04 (Submersible Surge Overcurrent) resolved via LocalFix Arbitration #LX-7829-INV. OEM Schneider replacement installed and signed off by Guild Engr. Kehinde Balogun.
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2.5 pt-1">
                    <Link
                      to="/mediation/audit"
                      className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-primary-300 transition-colors"
                    >
                      View Full Inrush Curve
                    </Link>
                    <button
                      onClick={() => toast.success('Telemetry logs exported')}
                      className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 transition-colors"
                    >
                      Telemetry Logs (.csv)
                    </button>
                    <Link
                      to="/services"
                      className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-primary-700 hover:bg-primary-600 transition-colors ml-auto shadow-glow-sm"
                    >
                      Book Routine Service
                    </Link>
                  </div>
                </div>

                {/* Node 2: Franklin Submersible Pump */}
                <div className="glass-panel rounded-3xl p-6 space-y-4 border border-white/10">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/10">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-primary-700/40 text-primary-300 flex items-center justify-center font-bold text-sm">
                        💧
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-white text-base">1.5HP Franklin Submersible Deep Well Pump</h4>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary-700/30 text-primary-300">
                            • NORMAL &bull; SURGE MONITORED
                          </span>
                        </div>
                        <div className="text-xs text-gray-400">Underground Borehole Sump &bull; Northwest Perimeter</div>
                      </div>
                    </div>
                  </div>

                  {/* 4 Metrics */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                      <span className="text-[10px] text-gray-400 block">Inrush Peak</span>
                      <strong className="text-white text-base font-mono">28.6 A</strong>
                      <span className="text-[10px] text-emerald-400 block">Within Soft-Start Limit</span>
                    </div>
                    <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                      <span className="text-[10px] text-gray-400 block">Run Current</span>
                      <strong className="text-white text-base font-mono">6.2 A</strong>
                      <span className="text-[10px] text-gray-400 block">@ 230V Balanced</span>
                    </div>
                    <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                      <span className="text-[10px] text-gray-400 block">Insulation (Megger)</span>
                      <strong className="text-white text-base font-mono">120 MΩ</strong>
                      <span className="text-[10px] text-emerald-400 block">Windings Intact</span>
                    </div>
                    <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                      <span className="text-[10px] text-gray-400 block">Delivery Head</span>
                      <strong className="text-white text-base font-mono">4.2 Bar</strong>
                      <span className="text-[10px] text-gray-400 block">Overhead Tank Feed</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-xs text-gray-400 pt-1">
                    <span>Protected under LocalFix Guild Guarantee &bull; Serviced by Sunday A. (COREN Pump Tech)</span>
                    <span className="text-emerald-400 font-semibold">Safe-Guard Bonded</span>
                  </div>

                  <div className="flex flex-wrap gap-2.5 pt-1">
                    <button
                      onClick={() => toast.success('10s motor diagnostic test initiated')}
                      className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-primary-300 transition-colors"
                    >
                      Trigger 10s Diagnostic Test Run
                    </button>
                    <button
                      onClick={() => toast('Pressure history chart loaded')}
                      className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 transition-colors"
                    >
                      View Pressure History
                    </button>
                  </div>
                </div>

                {/* Node 3: Daikin Inverter Split AC */}
                <div className="glass-panel rounded-3xl p-6 space-y-4 border border-white/10">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/10">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-primary-700/40 text-primary-300 flex items-center justify-center font-bold text-sm">
                        ❄️
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-white text-base">Daikin 2.0HP Inverter Split AC</h4>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            • GOOD &bull; MAINTENANCE DUE IN 18 DAYS
                          </span>
                        </div>
                        <div className="text-xs text-gray-400">Master Suite &bull; Eco Series FTKM</div>
                      </div>
                    </div>
                  </div>

                  {/* 3 Metrics */}
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                      <span className="text-[10px] text-gray-400 block">R410A Pressure</span>
                      <strong className="text-white text-base font-mono">122 PSI</strong>
                      <span className="text-[10px] text-gray-400 block">Standard Nominal</span>
                    </div>
                    <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                      <span className="text-[10px] text-gray-400 block">Evaporator Coil</span>
                      <strong className="text-white text-base font-mono">7.4°C</strong>
                      <span className="text-[10px] text-emerald-400 block">Chilling Efficiently</span>
                    </div>
                    <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                      <span className="text-[10px] text-gray-400 block">Current Draw</span>
                      <strong className="text-white text-base font-mono">4.8 A</strong>
                      <span className="text-[10px] text-gray-400 block">Eco Variable Speed</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-xs text-gray-400 pt-1">
                    <span>Last deep chemical clean by Victor E. (June 18, 2026)</span>
                  </div>

                  <div className="flex flex-wrap gap-2.5 pt-1">
                    <button
                      onClick={() => toast('Filter wash alert scheduled')}
                      className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 transition-colors"
                    >
                      Filter Wash Alert
                    </button>
                    <button
                      onClick={() => toast.success('Pre-booking guild tune-up for Daikin AC...')}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-primary-700 hover:bg-primary-600 transition-colors shadow-glow-sm"
                    >
                      Pre-book ₦15,000 Guild Tune-up
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column (4 cols): IoT Hub Bridge, Oscilloscope & Guild */}
              <div className="lg:col-span-4 space-y-6">
                {/* IoT Telemetry Bridge */}
                <div className="glass-panel rounded-3xl p-6 space-y-3.5 border border-white/10">
                  <div className="flex items-center justify-between pb-2 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4 text-primary-400" />
                      <h4 className="font-bold text-white text-sm">IoT Telemetry Bridge</h4>
                    </div>
                    <span className="text-[10px] text-emerald-400 font-mono font-bold">● 99.98% Up</span>
                  </div>

                  <div className="text-[11px] text-gray-400">LocalFix Smart Hub v3</div>

                  <div className="space-y-1.5 text-xs font-mono text-gray-300">
                    <div className="flex justify-between">
                      <span className="text-gray-400 font-sans">Protocols Active:</span>
                      <span>Zigbee 3.0 &bull; RS485 &bull; WiFi 6</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400 font-sans">Engine Cloud Latency:</span>
                      <span className="text-emerald-400 font-bold">12 ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400 font-sans">Sync Interval:</span>
                      <span>Every 3 Seconds</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-primary-700/10 border border-primary-500/20 text-[11px] text-primary-200 leading-relaxed">
                    <strong className="text-white block mb-0.5">Smart Trip Protocol:</strong>
                    Any inductive surge over 40A freezes release of contractor warranty funds automatically.
                  </div>
                </div>

                {/* Oscilloscope & Voltage Log */}
                <div className="glass-panel rounded-3xl p-6 space-y-3.5 border border-white/10">
                  <div className="flex items-center justify-between pb-2 border-b border-white/10">
                    <span className="font-bold text-white text-xs">Oscilloscope & Voltage Log</span>
                    <span className="text-[10px] font-mono font-bold text-emerald-400">230V NOMINAL</span>
                  </div>

                  {/* Waveform graphic */}
                  <div className="h-20 bg-black/60 rounded-xl p-2 font-mono text-[9px] flex flex-col justify-between border border-white/5">
                    <div className="flex justify-between text-gray-400">
                      <span>230 VOLTAGE &bull; SMOOTH SINEWAVE</span>
                      <span className="text-emerald-400">RESTORATION POINT: OCT 18</span>
                    </div>
                    <div className="h-8 flex items-center justify-center text-primary-300 font-bold">
                      ∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿
                    </div>
                    <div className="flex justify-between text-gray-500 text-[8px]">
                      <span>Oct 17 (Fault F04 Trip)</span>
                      <span className="text-emerald-400 font-bold">Oct 18 Contactor Burn-in (Clear)</span>
                      <span className="text-primary-300">Live Now</span>
                    </div>
                  </div>

                  {/* Telemetry events list */}
                  <div className="space-y-2.5 text-[11px] pt-1">
                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 space-y-0.5">
                      <div className="flex justify-between font-semibold text-white">
                        <span>Today, 06:15 AM: Borehole Auto-Cycle</span>
                      </div>
                      <p className="text-gray-400 text-[10px]">
                        14-minute run completed. Peak Inrush 28.6A safely stabilized.
                      </p>
                    </div>

                    <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-0.5">
                      <div className="flex justify-between font-semibold text-emerald-300">
                        <span>Oct 18, 01:12 PM: Burn-in Passed</span>
                      </div>
                      <p className="text-gray-400 text-[10px]">
                        New OEM Schneider 100A relay installed. 0.00% voltage sag under 3kW test.
                      </p>
                    </div>

                    <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 space-y-0.5">
                      <div className="flex justify-between font-semibold text-red-300">
                        <span>Oct 17, 11:52 AM: Fault F04 Trip</span>
                      </div>
                      <p className="text-gray-400 text-[10px]">
                        Surge overcurrent recorded. Safe-Custody arbitration opened and reserved.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Authorized Equipment Guild */}
                <div className="glass-panel rounded-3xl p-6 space-y-3.5 border border-white/10">
                  <div className="flex items-center justify-between pb-2 border-b border-white/10">
                    <span className="font-bold text-white text-xs">Authorized Equipment Guild</span>
                    <span className="text-[10px] text-primary-300 font-mono">3 Assigned</span>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    {/* Auditor */}
                    <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-white text-xs">Engr. Kehinde Balogun</div>
                        <div className="text-[10px] text-primary-300">Solar & Inverter Auditor</div>
                      </div>
                      <a
                        href="tel:+2348030000000"
                        className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-primary-700 hover:bg-primary-600 text-white transition-colors"
                      >
                        1-Click Call
                      </a>
                    </div>

                    {/* Pump specialist */}
                    <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-white text-xs">Sunday A.</div>
                        <div className="text-[10px] text-gray-400">Borehole & Pump Specialist</div>
                      </div>
                      <Link
                        to="/messages"
                        className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 transition-colors"
                      >
                        Message
                      </Link>
                    </div>

                    {/* HVAC Tech */}
                    <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-white text-xs">Victor E.</div>
                        <div className="text-[10px] text-gray-400">HVAC & Heat Pump Tech</div>
                      </div>
                      <Link
                        to="/book/2"
                        className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 transition-colors"
                      >
                        Book With
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          )
        )}

        {/* TAB 5: SAVED TECHNICIANS */}
        {activeTab === 'saved' && (
          <div className="glass-panel rounded-3xl p-6 sm:p-7 space-y-4">
            <h3 className="text-lg font-bold text-white">Saved Vetted Artisans</h3>
            {isNewlyRegistered ? (
              <div className="text-center py-10 px-4 space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 text-gray-400 flex items-center justify-center mx-auto text-xl">
                  <Bookmark className="w-6 h-6 text-primary-400" />
                </div>
                <h4 className="font-bold text-white text-sm">No Saved Artisans Yet</h4>
                <p className="text-xs text-gray-400 max-w-sm mx-auto">
                  Bookmark top-rated electricians, plumbers, and mechanics from the marketplace to access them instantly for emergency repairs.
                </p>
                <div className="pt-2">
                  <Link
                    to="/services"
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-primary-700 hover:bg-primary-600 text-white transition-colors inline-block shadow-glow-sm"
                  >
                    Explore Marketplace
                  </Link>
                </div>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                {[
                  { name: 'Tunde Adewale', trade: 'Master Solar & Inverter Specialist', rating: 4.96, jobs: 148, area: 'GRA & Lekki Phase 1' },
                  { name: 'Ngozi Chukwu', trade: 'Dual Inverter AC Specialist', rating: 4.92, jobs: 219, area: 'Ikeja & Surulere' },
                  { name: 'Ibrahim Musa', trade: 'Hydrojetting & Borehole Pumps', rating: 4.88, jobs: 94, area: 'Lagos Mainland' },
                  { name: 'Emeka Okafor', trade: 'Custom Cabinetry & Locksmith', rating: 4.89, jobs: 61, area: 'Lekki & VI' },
                ].map((pro, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-3">
                    <div>
                      <h4 className="font-bold text-white text-sm">{pro.name}</h4>
                      <p className="text-[11px] text-primary-300">{pro.trade}</p>
                      <div className="text-[10px] text-gray-400 mt-1">★ {pro.rating} &bull; {pro.jobs} jobs &bull; {pro.area}</div>
                    </div>
                    <Link
                      to="/messages"
                      className="px-3 py-1.5 rounded-xl bg-primary-700/30 hover:bg-primary-700/50 text-primary-200 border border-primary-500/30 font-semibold"
                    >
                      Chat
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 6: NOTIFICATION CENTER                              */}
        {/* ======================================================== */}
        {activeTab === 'notifications' && (
          <div className="space-y-6">
            <div className="glass-panel rounded-3xl p-6 sm:p-7 space-y-5 border border-primary-500/20 shadow-glow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-primary-700/30 text-primary-300 flex items-center justify-center flex-shrink-0">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white flex items-center gap-2">
                      <span>Notification Center</span>
                      {unreadNotificationsCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-primary-600 text-white">
                          {unreadNotificationsCount} New
                        </span>
                      )}
                    </h2>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Cryptographically signed alerts, escrow holds, job dispatches & security notices
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {unreadNotificationsCount > 0 && (
                    <button
                      type="button"
                      onClick={handleMarkAllNotificationsRead}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-primary-300 flex items-center gap-1.5 transition-colors"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      <span>Mark all read</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setNotifications((prev) => prev.filter((n) => !n.is_read && !n.isRead))
                      toast.success('Read notifications cleared')
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear read</span>
                  </button>
                </div>
              </div>

              {/* Notification Filter Chips */}
              <div className="flex flex-wrap gap-2 text-xs">
                {[
                  { id: 'all', label: `All Alerts (${notifications.length})` },
                  { id: 'escrow', label: '🛡️ Escrow & Wallet' },
                  { id: 'job', label: '🔨 Jobs & Bookings' },
                  { id: 'system', label: '⚙️ System & Security' },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setNotificationFilter(f.id as any)}
                    className={`px-3 py-1.5 rounded-xl font-semibold border transition-all ${
                      notificationFilter === f.id
                        ? 'bg-primary-700 text-white border-primary-500 shadow-glow-sm'
                        : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Notification Cards List */}
              <div className="space-y-3 pt-1">
                {notifications
                  .filter((n) => {
                    if (notificationFilter === 'all') return true
                    const type = n.notification_type || n.type || 'system'
                    if (notificationFilter === 'escrow') return type === 'escrow'
                    if (notificationFilter === 'job') return type === 'job'
                    if (notificationFilter === 'system') return type === 'system' || type === 'security'
                    return true
                  })
                  .map((notif) => {
                    const isUnread = !notif.is_read && !notif.isRead
                    const type = notif.notification_type || notif.type || 'system'
                    return (
                      <div
                        key={notif.id}
                        onClick={() => handleNotificationClick(notif)}
                        className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-4 cursor-pointer hover:border-primary-400/60 hover:bg-white/10 active:scale-[0.99] group ${
                          isUnread
                            ? 'bg-primary-950/50 border-primary-500/40 shadow-glow-sm'
                            : 'bg-white/5 border-white/5 opacity-85 hover:opacity-100'
                        }`}
                        title="Click to view client and open details"
                      >
                        <div className="flex items-start gap-3.5 flex-1">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-base ${
                            type === 'escrow' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                            type === 'job' ? 'bg-primary-500/20 text-primary-300 border border-primary-500/30' :
                            'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          }`}>
                            {type === 'escrow' ? '🛡️' : type === 'job' ? '🔨' : '🔔'}
                          </div>

                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-white text-xs sm:text-sm group-hover:text-primary-300 transition-colors">{notif.title}</h4>
                              {isUnread && (
                                <span className="w-2 h-2 rounded-full bg-primary-400 animate-pulse shadow-[0_0_8px_#a855f7]" />
                              )}
                            </div>
                            <p className="text-gray-300 text-xs leading-relaxed">{notif.body}</p>
                            <div className="flex items-center gap-3 pt-1 text-[10px] text-gray-500 font-mono">
                              <span>
                                {notif.created_at
                                  ? new Date(notif.created_at).toLocaleString()
                                  : 'Recent'}
                              </span>
                              <span>&bull;</span>
                              <span className="capitalize">{type} notice</span>
                              <span>&bull;</span>
                              <span className="text-primary-400 font-semibold group-hover:underline">Click to view →</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {isUnread && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleMarkNotificationRead(notif.id)
                              }}
                              className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-white/5 hover:bg-white/10 text-primary-300 border border-white/10 transition-colors whitespace-nowrap"
                            >
                              Mark read
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit Profile & Picture Modal */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="glass-panel max-w-lg w-full rounded-3xl p-6 sm:p-7 border border-primary-500/30 text-white space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-primary-700/40 text-primary-300 flex items-center justify-center">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Edit Profile & Credentials</h3>
                    <p className="text-[10px] text-gray-400">Updates sync across Escrow and Neighborhood Grid</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4">
                {/* Profile Picture Upload Section */}
                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-2">Profile Picture</label>
                  <div className="flex items-center gap-4 p-3 rounded-2xl bg-white/5 border border-white/10">
                    <div className="relative group flex-shrink-0">
                      <img
                        src={profileData.avatar}
                        alt="Preview"
                        className="w-16 h-16 rounded-2xl object-cover border-2 border-primary-500/50"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute inset-0 bg-black/50 rounded-2xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                      >
                        <Camera className="w-4 h-4 text-white" />
                      </button>
                    </div>

                    <div className="flex-1 space-y-2">
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-primary-700/30 hover:bg-primary-700/50 text-primary-200 border border-primary-500/30 flex items-center gap-1.5 transition-colors"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload New Photo</span>
                      </button>
                      <p className="text-[10px] text-gray-400">JPG, PNG, WebP up to 5MB. Clear face photo recommended.</p>
                    </div>
                  </div>

                  {/* Preset Avatars */}
                  <div className="flex items-center gap-2 mt-2 pt-1">
                    <span className="text-[10px] text-gray-400">Or pick preset:</span>
                    {[
                      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=160&h=160&fit=crop&crop=face',
                      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=160&h=160&fit=crop&crop=face',
                      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160&h=160&fit=crop&crop=face',
                      'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=160&h=160&fit=crop&crop=face',
                    ].map((avatarUrl, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setProfileData((prev) => ({ ...prev, avatar: avatarUrl }))}
                        className={`w-7 h-7 rounded-xl overflow-hidden border transition-all ${profileData.avatar === avatarUrl ? 'border-primary-400 scale-110 shadow-glow-sm' : 'border-white/10 opacity-70 hover:opacity-100'}`}
                      >
                        <img src={avatarUrl} alt="preset" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Name fields */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-300 mb-1">First Name</label>
                    <input
                      type="text"
                      value={profileData.firstName}
                      onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs outline-none focus:border-primary-400 transition-colors"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-300 mb-1">Last Name</label>
                    <input
                      type="text"
                      value={profileData.lastName}
                      onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs outline-none focus:border-primary-400 transition-colors"
                      required
                    />
                  </div>
                </div>

                {/* Email & Phone */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-300 mb-1">Email Address</label>
                    <input
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs outline-none focus:border-primary-400 transition-colors"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-300 mb-1">Phone Number</label>
                    <input
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs outline-none focus:border-primary-400 transition-colors"
                      required
                    />
                  </div>
                </div>

                {/* Location / Neighborhood */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-300 mb-1">Default Neighborhood Area</label>
                  <input
                    type="text"
                    value={profileData.locationName}
                    onChange={(e) => setProfileData({ ...profileData, locationName: e.target.value })}
                    placeholder="E.g. Ikeja GRA, Lagos"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs outline-none focus:border-primary-400 transition-colors"
                    required
                  />
                </div>

                {/* Resident Tier */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-300 mb-1">Resident Status / Tier</label>
                  <select
                    value={profileData.tier}
                    onChange={(e) => setProfileData({ ...profileData, tier: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-dark-bg border border-white/10 text-white text-xs outline-none focus:border-primary-400 transition-colors"
                  >
                    <option value="Tier 3 Gold Resident">Tier 3 Gold Resident (Fully Verified)</option>
                    <option value="Tier 2 Verified Resident">Tier 2 Verified Resident (NIN Verified)</option>
                    <option value="Tier 1 New Member">Tier 1 New Member</option>
                    <option value="Estate Facility Manager">Estate Facility Manager</option>
                    <option value="Vetted Pro Artisan">Vetted Pro Artisan (Trade Certified)</option>
                  </select>
                </div>

                {/* Spoken Languages Section */}
                <div className="pt-1">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-bold text-gray-300 flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-primary-400" />
                      <span>Languages You Speak</span>
                    </label>
                    <span className="text-[10px] text-gray-400 font-medium">
                      {profileData.languages.length} selected
                    </span>
                  </div>

                  {/* Active selected tags */}
                  <div className="flex flex-wrap gap-1.5 mb-2.5 p-2 rounded-xl bg-white/5 border border-white/10 min-h-[38px] items-center">
                    {profileData.languages.length === 0 ? (
                      <span className="text-[10px] text-gray-500 italic">No languages selected yet</span>
                    ) : (
                      profileData.languages.map((lang) => (
                        <span
                          key={lang}
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-primary-700/40 text-primary-200 border border-primary-500/30 text-xs font-medium"
                        >
                          <span>{lang}</span>
                          <button
                            type="button"
                            onClick={() => handleToggleLanguage(lang)}
                            className="hover:text-red-300"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))
                    )}
                  </div>

                  {/* Quick toggle chips from popular languages */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-gray-400 font-semibold block">Quick add:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {POPULAR_LANGUAGES.map((lang) => {
                        const isSelected = profileData.languages.includes(lang)
                        return (
                          <button
                            key={lang}
                            type="button"
                            onClick={() => handleToggleLanguage(lang)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all ${
                              isSelected
                                ? 'bg-primary-600 text-white border-primary-400 shadow-glow-sm'
                                : 'bg-white/5 text-gray-300 border-white/10 hover:border-white/20'
                            }`}
                          >
                            {isSelected ? '✓ ' : '+ '}{lang}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Custom Language input */}
                  <div className="flex items-center gap-2 mt-2.5">
                    <input
                      type="text"
                      value={customLanguageInput}
                      onChange={(e) => setCustomLanguageInput(e.target.value)}
                      placeholder="Add another language (e.g. Italian, Edo)..."
                      className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs outline-none focus:border-primary-400 transition-colors placeholder-gray-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomLanguage}
                      className="px-3 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-white border border-white/10 flex items-center gap-1 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add</span>
                    </button>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="flex-1 py-3 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 rounded-xl text-xs font-bold text-white shadow-glow flex items-center justify-center gap-1.5 transition-all"
                    style={{ background: 'linear-gradient(135deg, #6D28D9, #7C3AED)' }}
                  >
                    <Save className="w-4 h-4" />
                    <span>Save Changes</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
