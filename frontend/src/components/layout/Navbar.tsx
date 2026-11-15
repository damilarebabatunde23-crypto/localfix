import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Bell, MessageSquare, MapPin, Sparkles, Menu, X, Moon, Sun, ChevronDown, LogOut, User, Settings, ShieldCheck } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '@/stores/useAppStore'
import { useChatStore } from '@/stores/useChatStore'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

// Primary nav items always visible on desktop
const PRIMARY_NAV = [
  { label: 'Services', path: '/services' },
  { label: 'Map', path: '/map' },
  { label: '🛰️ Live Tracker', path: '/tracking' },
  { label: 'Feed', path: '/feed' },
  { label: 'Marketplace', path: '/marketplace' },
]

// Secondary nav items shown in "More" dropdown
const MORE_NAV = [
  { label: '✨ AI Trade Copilot', path: '/assistant' },
  { label: '📱 Get the App', path: '/app' },
  { label: '📞 Contact Support', path: '/contact' },
  { label: 'Post a Job', path: '/post-job' },
  { label: 'Mediation Room', path: '/mediation' },
  { label: 'Dispute History', path: '/profile?tab=disputes' },
]

const ALL_NAV = [...PRIMARY_NAV, ...MORE_NAV]

export default function Navbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const {
    locationName,
    hasLocationSet,
    setLocationPromptOpen,
    theme,
    setTheme,
    unreadMessages,
    unreadNotifications,
    isAuthenticated,
    user,
    logout,
    currency,
    setCurrency,
    requestGPSLocation,
  } = useAppStore()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const moreRef = useRef<HTMLDivElement>(null)
  const profileRef = useRef<HTMLDivElement>(null)

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark')
  const isDark = theme === 'dark'
  const currentPath = location.pathname

  // Close "More" dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false)
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const navbarBg = isDark
    ? 'rgba(23,19,38,0.92)'
    : 'rgba(255,255,255,0.92)'
  const navbarBorder = isDark
    ? '1px solid rgba(167,139,250,0.12)'
    : '1px solid rgba(109,40,217,0.12)'
  const navbarShadow = isDark
    ? '0 2px 20px rgba(109,40,217,0.15)'
    : '0 2px 20px rgba(109,40,217,0.08)'

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50">
        <div
          className="px-4"
          style={{
            background: navbarBg,
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            borderBottom: navbarBorder,
            boxShadow: navbarShadow,
          }}
        >
          <div className="max-w-[1400px] mx-auto h-[60px] flex items-center gap-2">

            {/* ── Logo ── */}
            <Link to="/" className="flex items-center gap-2 flex-shrink-0 group mr-2">
              <div className={cn(
                'w-9 h-9 rounded-xl overflow-hidden border flex-shrink-0',
                isDark ? 'border-primary-500/30 bg-[#221f28]' : 'border-primary-400/40 bg-white'
              )}>
                <img src="/logo.jpg" alt="LocalFix" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
              </div>
              <div className="hidden sm:block leading-none">
                <span className={cn('font-black text-base tracking-tight block', isDark ? 'text-white' : 'text-gray-900')}>LocalFix</span>
                <span className="text-[9px] text-primary-400 font-semibold uppercase tracking-widest">Services</span>
              </div>
            </Link>

            {/* ── Desktop Primary Nav ── */}
            <nav className="hidden lg:flex items-center gap-0.5">
              {PRIMARY_NAV.map((link) => {
                const isActive = currentPath === link.path || currentPath.startsWith(link.path + '/')
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150',
                      isActive
                        ? 'bg-primary-700 text-white'
                        : isDark
                          ? 'text-gray-300 hover:text-white hover:bg-white/8'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    )}
                  >
                    {link.label}
                  </Link>
                )
              })}

              {/* More dropdown */}
              <div className="relative" ref={moreRef}>
                <button
                  onClick={() => setMoreOpen(!moreOpen)}
                  className={cn(
                    'flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150',
                    isDark ? 'text-gray-300 hover:text-white hover:bg-white/8' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  )}
                >
                  More <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', moreOpen && 'rotate-180')} />
                </button>
                <AnimatePresence>
                  {moreOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -6, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.97 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-full left-0 mt-1.5 w-48 rounded-xl overflow-hidden z-50"
                      style={{
                        background: isDark ? 'rgba(30,21,51,0.98)' : 'rgba(255,255,255,0.98)',
                        border: isDark ? '1px solid rgba(167,139,250,0.18)' : '1px solid rgba(109,40,217,0.15)',
                        boxShadow: isDark ? '0 16px 40px rgba(0,0,0,0.4)' : '0 16px 40px rgba(109,40,217,0.12)',
                      }}
                    >
                      {MORE_NAV.map((link) => (
                        <Link
                          key={link.path}
                          to={link.path}
                          onClick={() => setMoreOpen(false)}
                          className={cn(
                            'block px-4 py-2.5 text-sm font-medium transition-colors',
                            currentPath === link.path
                              ? 'bg-primary-700/20 text-primary-300'
                              : isDark
                                ? 'text-gray-300 hover:bg-white/6 hover:text-white'
                                : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                          )}
                        >
                          {link.label}
                        </Link>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </nav>

            {/* ── Spacer ── */}
            <div className="flex-1" />

            {/* ── Global Currency Switcher ── */}
            <div className="relative hidden lg:block">
              <select
                value={currency || 'USD'}
                onChange={(e) => {
                  setCurrency(e.target.value)
                  toast.success(`Currency switched to ${e.target.value}`)
                }}
                className={cn(
                  'px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all outline-none cursor-pointer',
                  isDark
                    ? 'text-gray-300 hover:text-white bg-primary-700/15 border border-primary-500/20'
                    : 'text-gray-600 hover:text-gray-900 bg-primary-50 border border-primary-200'
                )}
                title="Change Global Currency"
              >
                <option value="USD" className="bg-[#1e1533] text-white">$ USD</option>
                <option value="EUR" className="bg-[#1e1533] text-white">€ EUR</option>
                <option value="GBP" className="bg-[#1e1533] text-white">£ GBP</option>
                <option value="NGN" className="bg-[#1e1533] text-white">₦ NGN</option>
                <option value="CAD" className="bg-[#1e1533] text-white">$ CAD</option>
                <option value="AUD" className="bg-[#1e1533] text-white">$ AUD</option>
                <option value="KES" className="bg-[#1e1533] text-white">KSh KES</option>
              </select>
            </div>

            {/* ── Location pill (md+) ── */}
            <button
              onClick={() => {
                toast.loading('Locking device GPS satellite position...', { id: 'nav-gps-sync' })
                requestGPSLocation().then((ok) => {
                  toast.dismiss('nav-gps-sync')
                  if (ok) {
                    toast.success(`Device location locked: ${useAppStore.getState().locationName}`, { icon: '📍' })
                  } else {
                    toast.error('Device GPS access was not granted. Please allow location permissions in browser settings.')
                  }
                })
              }}
              title={hasLocationSet ? `Location detected by device: ${locationName}. Click to refresh GPS.` : 'Click to detect device GPS'}
              className={cn(
                'hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all hover:scale-105 cursor-pointer',
                !hasLocationSet
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                  : isDark
                  ? 'text-gray-300 hover:text-white bg-primary-700/15 border border-primary-500/20'
                  : 'text-gray-600 hover:text-gray-900 bg-primary-50 border border-primary-200'
              )}
            >
              <MapPin className={cn('w-3.5 h-3.5 flex-shrink-0', !hasLocationSet ? 'text-amber-400 animate-bounce' : 'text-primary-400 animate-pulse')} />
              <span className="max-w-[130px] truncate">{!hasLocationSet ? '📍 Detecting GPS...' : locationName.split(',')[0]}</span>
            </button>

            {/* ── AI Copilot Button ── */}
            <Link
              to="/assistant"
              className={cn(
                'hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-glow-sm cursor-pointer',
                isDark
                  ? 'bg-primary-700/25 hover:bg-primary-700 text-primary-300 hover:text-white border border-primary-500/30'
                  : 'bg-primary-50 hover:bg-primary-600 text-primary-700 hover:text-white border border-primary-200'
              )}
              title="Open AI Technical Diagnostic Copilot"
            >
              <Sparkles className="w-3.5 h-3.5 text-primary-400 animate-spin" style={{ animationDuration: '6s' }} />
              <span>AI Copilot</span>
            </Link>

            {/* ── Compact icon group ── */}
            <div className={cn(
              'flex items-center rounded-xl divide-x overflow-hidden',
              isDark ? 'divide-white/8 bg-white/5 border border-white/8' : 'divide-gray-200 bg-gray-50 border border-gray-200'
            )}>
              {/* Theme toggle */}
              <button
                onClick={toggleTheme}
                className={cn('p-2 transition-colors', isDark ? 'text-gray-400 hover:text-white hover:bg-white/8' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100')}
                title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>

              {/* Notifications */}
              <button
                onClick={() => navigate('/profile?tab=notifications')}
                title="View Notifications"
                className={cn('relative p-2 transition-colors cursor-pointer', isDark ? 'text-gray-400 hover:text-white hover:bg-white/8' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100')}
              >
                <Bell className="w-4 h-4" />
                {unreadNotifications > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                )}
              </button>

              {/* Messages - Facebook Style Quick Dock Toggle */}
              <button
                onClick={() => {
                  if (location.pathname.startsWith('/messages') || location.pathname.startsWith('/chat')) {
                    navigate('/messages')
                    return
                  }
                  const chatStore = useChatStore.getState()
                  if (!chatStore.isOpen) {
                    chatStore.openChat()
                  } else {
                    chatStore.toggleMinimize()
                  }
                }}
                title="Open Messenger Chat Box"
                className={cn('relative p-2 transition-colors cursor-pointer', isDark ? 'text-gray-400 hover:text-white hover:bg-white/8' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100')}
              >
                <MessageSquare className="w-4 h-4" />
                {unreadMessages > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center animate-pulse">
                    {unreadMessages}
                  </span>
                )}
              </button>
            </div>

            {/* ── AI Assistant CTA ── */}
            <button
              onClick={() => navigate('/assistant')}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200"
              style={{
                background: 'linear-gradient(135deg,#6D28D9,#7C3AED)',
                color: 'white',
              }}
            >
              <Sparkles className="w-3.5 h-3.5" />
              AI
            </button>

            {/* ── Profile / Auth area ── */}
            {isAuthenticated && user ? (
              /* Logged-in: avatar + dropdown */
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className={cn(
                    'flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-xl transition-all duration-200 border',
                    isDark
                      ? 'border-primary-500/40 hover:border-primary-400'
                      : 'border-primary-300 hover:border-primary-500 bg-primary-50'
                  )}
                  style={isDark ? { background: 'linear-gradient(135deg,rgba(109,40,217,0.6),rgba(124,58,237,0.4))' } : {}}
                >
                  <img
                    src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.firstName}&backgroundColor=6D28D9`}
                    alt={user.firstName}
                    className="w-7 h-7 rounded-full object-cover border border-white/20"
                  />
                  <span className={cn('text-xs font-bold hidden sm:block', isDark ? 'text-white' : 'text-primary-700')}>
                    {user.firstName}
                  </span>
                  <ChevronDown className={cn('w-3 h-3 transition-transform', isDark ? 'text-white/70' : 'text-primary-600', profileOpen && 'rotate-180')} />
                </button>

                <AnimatePresence>
                  {profileOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -6, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.97 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-full right-0 mt-1.5 w-56 rounded-2xl overflow-hidden z-50"
                      style={{
                        background: isDark ? 'rgba(30,21,51,0.98)' : 'rgba(255,255,255,0.98)',
                        border: isDark ? '1px solid rgba(167,139,250,0.18)' : '1px solid rgba(109,40,217,0.15)',
                        boxShadow: isDark ? '0 16px 40px rgba(0,0,0,0.5)' : '0 16px 40px rgba(109,40,217,0.12)',
                      }}
                    >
                      {/* User info header */}
                      <div className={cn('px-4 py-3 border-b', isDark ? 'border-white/8' : 'border-gray-100')}>
                        <div className={cn('text-xs font-bold', isDark ? 'text-white' : 'text-gray-900')}>
                          {user.firstName} {user.lastName}
                        </div>
                        <div className={cn('text-[10px] mt-0.5', isDark ? 'text-gray-400' : 'text-gray-500')}>{user.email}</div>
                        {user.isVerified && (
                          <div className="flex items-center gap-1 mt-1 text-[10px] text-emerald-400">
                            <ShieldCheck className="w-3 h-3" /> Verified Account
                          </div>
                        )}
                      </div>

                      {/* Menu items */}
                      {[
                        { icon: User, label: 'My Profile', path: '/profile' },
                        { icon: Settings, label: 'Settings', path: '/profile?tab=settings' },
                      ].map(({ icon: Icon, label, path }) => (
                        <Link
                          key={path}
                          to={path}
                          onClick={() => setProfileOpen(false)}
                          className={cn(
                            'flex items-center gap-3 px-4 py-2.5 text-sm transition-colors',
                            isDark ? 'text-gray-300 hover:bg-white/6 hover:text-white' : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                          )}
                        >
                          <Icon className="w-4 h-4" />
                          {label}
                        </Link>
                      ))}

                      <div className={cn('h-px mx-4', isDark ? 'bg-white/8' : 'bg-gray-100')} />

                      {/* Logout */}
                      <button
                        onClick={() => {
                          logout()
                          setProfileOpen(false)
                          toast.success('You have been logged out')
                          navigate('/login')
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/8 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Log Out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              /* Logged-out: Sign In + Register buttons */
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                    isDark ? 'text-gray-300 hover:text-white hover:bg-white/8' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                  )}
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all"
                  style={{ background: 'linear-gradient(135deg,#6D28D9,#7C3AED)' }}
                >
                  Get Started
                </Link>
              </div>
            )}

            {/* ── Mobile hamburger ── */}
            <button
              className={cn('lg:hidden p-2 rounded-xl transition-colors', isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900')}
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* ── Mobile menu ── */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden overflow-hidden"
              style={{
                background: isDark ? 'rgba(23,19,38,0.98)' : 'rgba(255,255,255,0.98)',
                backdropFilter: 'blur(20px)',
                borderBottom: isDark ? '1px solid rgba(167,139,250,0.12)' : '1px solid rgba(109,40,217,0.1)',
              }}
            >
              <nav className="max-w-[1400px] mx-auto px-4 py-3 flex flex-col gap-1">
                {ALL_NAV.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      'px-4 py-3 rounded-xl text-sm font-medium transition-colors',
                      currentPath === link.path
                        ? 'bg-primary-700 text-white'
                        : isDark
                          ? 'text-gray-300 hover:bg-white/8 hover:text-white'
                          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    )}
                  >
                    {link.label}
                  </Link>
                ))}
                <div className={cn('h-px my-1', isDark ? 'bg-white/8' : 'bg-gray-100')} />
                <button
                  onClick={() => {
                    setMobileOpen(false)
                    setLocationPromptOpen(true)
                  }}
                  className={cn(
                    'w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer',
                    !hasLocationSet
                      ? 'text-amber-300 bg-amber-500/20 border border-amber-500/40 animate-pulse'
                      : isDark
                      ? 'text-primary-300 bg-primary-700/15 border border-primary-500/20'
                      : 'text-primary-700 bg-primary-50 border border-primary-200'
                  )}
                >
                  <div className="flex items-center gap-2 truncate">
                    <MapPin className={cn("w-4 h-4 flex-shrink-0", !hasLocationSet ? "text-amber-400 animate-bounce" : "text-primary-400")} />
                    <span className="truncate">{!hasLocationSet ? '📍 Turn On Location' : locationName}</span>
                  </div>
                  <span className="text-xs text-primary-400 font-normal">Change</span>
                </button>
                {/* Auth links in mobile menu */}
                <div className={cn('h-px my-1', isDark ? 'bg-white/8' : 'bg-gray-100')} />
                {isAuthenticated && user ? (
                  <button
                    onClick={() => {
                      logout()
                      setMobileOpen(false)
                      toast.success('You have been logged out')
                      navigate('/login')
                    }}
                    className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Log Out
                  </button>
                ) : (
                  <div className="flex flex-col gap-2 pt-1">
                    <Link to="/login" onClick={() => setMobileOpen(false)}
                      className={cn('px-4 py-3 rounded-xl text-sm font-medium text-center transition-colors',
                        isDark ? 'text-gray-300 bg-white/5 hover:bg-white/10' : 'text-gray-700 bg-gray-100 hover:bg-gray-200')}>
                      Sign In
                    </Link>
                    <Link to="/register" onClick={() => setMobileOpen(false)}
                      className="px-4 py-3 rounded-xl text-sm font-bold text-white text-center"
                      style={{ background: 'linear-gradient(135deg,#6D28D9,#7C3AED)' }}>
                      Create Free Account
                    </Link>
                  </div>
                )}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Spacer for fixed header */}
      <div className="h-[60px]" />
    </>
  )
}
