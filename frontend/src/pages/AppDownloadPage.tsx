import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Smartphone,
  Download,
  QrCode,
  ShieldCheck,
  Zap,
  MapPin,
  Radio,
  Video,
  Lock,
  CheckCircle,
  Sparkles,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Activity,
  Star,
  Users,
  Award,
  Layers,
  HardDrive,
  Copy,
  Check,
} from 'lucide-react'
import toast from 'react-hot-toast'

type AppTab = 'radar' | 'escrow' | 'video' | 'diagnostics'

export default function AppDownloadPage() {
  const [activeTab, setActiveTab] = useState<AppTab>('radar')
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isCopied, setIsCopied] = useState(false)
  const [qrSize, setQrSize] = useState(160)

  // Listen for browser PWA install prompt
  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstall)
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
  }, [])

  const handleInstallPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        toast.success('LocalFix installed to your home screen! 🎉')
      }
      setDeferredPrompt(null)
    } else {
      toast.success(
        'Tap the Share/Install icon in your browser menu to add LocalFix directly to your Home Screen!',
        { duration: 5000, icon: '📲' }
      )
    }
  }

  const handleDownloadApk = () => {
    const t = toast.loading('Preparing LocalFix Universal Android APK (v2.4.1)...')
    setTimeout(() => {
      toast.dismiss(t)
      toast.success('Download initialized! "LocalFix-v2.4.1-Release.apk" (28.4 MB)', { icon: '⬇️' })
    }, 1200)
  }

  const copyAppUrl = () => {
    navigator.clipboard.writeText(window.location.origin)
    setIsCopied(true)
    toast.success('App link copied to clipboard!')
    setTimeout(() => setIsCopied(false), 2500)
  }

  return (
    <div className="min-h-screen bg-dark-bg text-white pb-24 selection:bg-primary-500 selection:text-white">
      {/* ── AMBIENT BACKGROUND GLOW ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-primary-600/15 rounded-full blur-[140px]" />
        <div className="absolute top-[40%] right-[-100px] w-[500px] h-[400px] bg-blue-600/10 rounded-full blur-[130px]" />
        <div className="absolute bottom-10 left-[-100px] w-[500px] h-[400px] bg-emerald-600/10 rounded-full blur-[140px]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-14 space-y-20">
        {/* ======================================================== */}
        {/* HERO SECTION                                             */}
        {/* ======================================================== */}
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column (7 cols): Copy & CTAs */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary-950/80 border border-primary-500/40 text-primary-300 text-xs font-semibold shadow-glow-sm">
              <Sparkles className="w-3.5 h-3.5 text-primary-400 animate-pulse" />
              <span>Version 2.4.1 Live • iOS, Android & Desktop PWA</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1]">
              All of <span className="gradient-text">LocalFix</span>, Right in Your Pocket.
            </h1>

            <p className="text-base sm:text-lg text-gray-300 max-w-2xl leading-relaxed">
              Experience the safest trade platform in Africa & beyond. Offline multi-sig escrow, live GPS technician radar, instant biometric milestone releases, and HD video inspections—anywhere, anytime.
            </p>

            {/* Quick Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 max-w-lg">
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
                <div className="text-2xl font-black text-white flex items-center gap-1">
                  <span>4.9</span>
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400 inline" />
                </div>
                <div className="text-[11px] text-gray-400 mt-0.5">38k+ App Store Reviews</div>
              </div>
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
                <div className="text-2xl font-black text-emerald-400">100%</div>
                <div className="text-[11px] text-gray-400 mt-0.5">CBN Escrow Protected</div>
              </div>
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
                <div className="text-2xl font-black text-primary-300">&lt; 0.4s</div>
                <div className="text-[11px] text-gray-400 mt-0.5">Offline Voucher Sync</div>
              </div>
            </div>

            {/* Main Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              {/* Primary Install PWA */}
              <button
                type="button"
                onClick={handleInstallPWA}
                className="px-6 py-4 rounded-2xl font-bold text-sm text-white shadow-glow transition-all flex items-center gap-2.5 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                style={{ background: 'linear-gradient(135deg, #6D28D9 0%, #7C3AED 50%, #4F46E5 100%)' }}
              >
                <Smartphone className="w-5 h-5" />
                <span>Install App on Device</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 font-mono">PWA</span>
              </button>

              {/* Download Android APK */}
              <button
                type="button"
                onClick={handleDownloadApk}
                className="px-5 py-4 rounded-2xl font-bold text-sm text-gray-200 bg-white/5 hover:bg-white/10 border border-white/15 transition-all flex items-center gap-2.5 cursor-pointer hover:text-white"
              >
                <Download className="w-5 h-5 text-emerald-400" />
                <span>Download APK (Android)</span>
              </button>

              {/* Copy Direct Link */}
              <button
                type="button"
                onClick={copyAppUrl}
                className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 transition-colors cursor-pointer"
                title="Copy App URL"
              >
                {isCopied ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>

            {/* Store Badges Row */}
            <div className="flex flex-wrap items-center gap-4 pt-3 text-xs text-gray-400">
              <span className="text-[11px] uppercase tracking-wider font-semibold">Also Available on:</span>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-gray-300">
                <span className="font-bold text-white"> Apple iOS</span> (TestFlight Beta)
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-gray-300">
                <span className="font-bold text-emerald-400">▶ Google Play</span> (Android 9.0+)
              </div>
            </div>
          </div>

          {/* Right Column (5 cols): Interactive Smartphone Device Mockup */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="relative w-full max-w-[340px] sm:max-w-[360px]">
              {/* Decorative phone ambient halo */}
              <div className="absolute inset-0 bg-primary-600/30 rounded-[50px] blur-3xl -z-10 scale-95" />

              {/* Realistic Hardware Phone Shell */}
              <div className="relative rounded-[50px] p-3.5 bg-gradient-to-b from-[#2E2845] to-[#120E1F] border-[3px] border-white/20 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)]">
                {/* Dynamic Island / Speaker Notch */}
                <div className="absolute top-6 left-1/2 -translate-x-1/2 w-28 h-5 rounded-full bg-black z-30 flex items-center justify-between px-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#1A1A1A] border border-white/10" />
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </div>

                {/* Inner Screen Canvas */}
                <div className="rounded-[40px] overflow-hidden bg-[#0B0A10] border border-white/10 relative h-[640px] flex flex-col justify-between select-none">
                  {/* Top Screen Status Bar */}
                  <div className="pt-8 px-5 pb-2 flex justify-between items-center text-[11px] font-semibold text-gray-300 z-20">
                    <span>9:41</span>
                    <div className="flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                      <span>5G</span>
                      <div className="w-5 h-2.5 rounded-md border border-white/40 p-0.5 flex items-center">
                        <div className="w-3 h-full bg-emerald-400 rounded-sm" />
                      </div>
                    </div>
                  </div>

                  {/* App Screen Content depending on activeTab */}
                  <div className="flex-1 px-4 py-2 overflow-hidden flex flex-col justify-between">
                    <AnimatePresence mode="wait">
                      {activeTab === 'radar' && (
                        <motion.div
                          key="radar"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="space-y-3"
                        >
                          <div className="p-3 rounded-2xl bg-primary-950/80 border border-primary-500/30 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-emerald-400 animate-bounce" />
                              <div>
                                <div className="text-xs font-bold text-white">Live Artisan Radar</div>
                                <div className="text-[10px] text-gray-400">Ikeja GRA &bull; 1.4 km away</div>
                              </div>
                            </div>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                              ETA 12m
                            </span>
                          </div>

                          {/* Radar Radar Circle Mockup */}
                          <div className="relative w-full h-44 rounded-3xl bg-gradient-to-b from-primary-950/40 to-[#120E1F] border border-white/10 flex items-center justify-center overflow-hidden">
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-36 h-36 rounded-full border border-primary-500/20 animate-ping opacity-30" />
                              <div className="w-24 h-24 rounded-full border border-primary-500/40" />
                              <div className="w-12 h-12 rounded-full border border-primary-500/60 flex items-center justify-center">
                                <div className="w-3 h-3 rounded-full bg-primary-400" />
                              </div>
                            </div>
                            <div className="absolute top-10 right-14 w-8 h-8 rounded-full border-2 border-emerald-400 overflow-hidden shadow-glow-sm">
                              <img src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&auto=format&fit=crop" className="w-full h-full object-cover" />
                            </div>
                            <div className="absolute bottom-4 left-4 text-[9px] bg-black/60 px-2 py-1 rounded-md text-gray-300">
                              Babatunde O. (En Route)
                            </div>
                          </div>

                          {/* Active Order Card */}
                          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                            <div className="flex justify-between text-[10px]">
                              <span className="text-gray-400">WORK ORDER #LF-8841</span>
                              <span className="text-emerald-400 font-bold">Escrow Funded</span>
                            </div>
                            <div className="text-xs font-bold text-white">Inverter 5kVA Diagnostic Inspection</div>
                            <div className="flex justify-between text-xs pt-1 border-t border-white/5">
                              <span className="text-gray-400">Total Escrow:</span>
                              <span className="font-bold text-white">₦45,000.00</span>
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {activeTab === 'escrow' && (
                        <motion.div
                          key="escrow"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="space-y-3"
                        >
                          <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/30 text-center space-y-1">
                            <Lock className="w-6 h-6 text-emerald-400 mx-auto" />
                            <div className="text-xs font-bold text-white">Multi-Sig Escrow Custody</div>
                            <div className="text-[10px] text-gray-400">CBN-Regulated Providus Trust Vault</div>
                          </div>

                          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                            <div className="text-[10px] text-gray-400">LOCKED RESTITUTION BALANCE</div>
                            <div className="text-2xl font-black text-white">₦125,000.00</div>
                            <div className="text-[10px] text-emerald-400 flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              <span>Milestone 2/3 Inspected & Approved</span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => toast.success('Biometric Face ID authorization simulated!')}
                            className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-primary-600 text-white font-bold text-xs shadow-glow-sm"
                          >
                            Authenticate Milestone Payout
                          </button>
                        </motion.div>
                      )}

                      {activeTab === 'video' && (
                        <motion.div
                          key="video"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="space-y-3"
                        >
                          <div className="relative h-64 rounded-3xl overflow-hidden border border-white/10 bg-black flex items-center justify-center">
                            <img
                              src="https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=500&auto=format&fit=crop"
                              className="w-full h-full object-cover filter brightness-75"
                            />
                            <div className="absolute top-3 left-3 bg-red-600/90 text-white text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                              <span>LIVE ENCRYPTED INSPECTION</span>
                            </div>
                            <div className="absolute bottom-3 left-3 right-3 p-2 rounded-xl bg-black/70 backdrop-blur-md flex items-center justify-between text-xs">
                              <div>
                                <div className="font-bold text-white text-[11px]">Tunde Adewale</div>
                                <div className="text-[9px] text-primary-300">Master Electrician</div>
                              </div>
                              <span className="text-[10px] text-emerald-400 font-mono">04:18</span>
                            </div>
                          </div>

                          <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-[10px] text-gray-300 flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-primary-400 flex-shrink-0" />
                            <span>Full recording timestamped for dispute evidence.</span>
                          </div>
                        </motion.div>
                      )}

                      {activeTab === 'diagnostics' && (
                        <motion.div
                          key="diagnostics"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="space-y-3"
                        >
                          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-bold text-white">Solar Array Telemetry</span>
                              <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">98% Health</span>
                            </div>
                            <div className="text-xl font-black text-white">4.8 kW Generation</div>
                            <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                              <div className="bg-gradient-to-r from-emerald-500 to-primary-500 h-full w-[82%]" />
                            </div>
                          </div>

                          <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                            <div>
                              <div className="text-xs font-bold text-white">Borehole Water Pump</div>
                              <div className="text-[10px] text-gray-400">Digital pressure normal</div>
                            </div>
                            <span className="text-[10px] font-mono text-emerald-400">4.2 BAR</span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Bottom Phone Dock */}
                    <div className="mt-4 p-2 rounded-2xl bg-white/5 border border-white/10 flex justify-around text-gray-400 text-[10px]">
                      <button
                        type="button"
                        onClick={() => setActiveTab('radar')}
                        className={`flex flex-col items-center gap-1 ${activeTab === 'radar' ? 'text-primary-300 font-bold' : ''}`}
                      >
                        <MapPin className="w-4 h-4" />
                        <span>Radar</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('escrow')}
                        className={`flex flex-col items-center gap-1 ${activeTab === 'escrow' ? 'text-primary-300 font-bold' : ''}`}
                      >
                        <Lock className="w-4 h-4" />
                        <span>Escrow</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('video')}
                        className={`flex flex-col items-center gap-1 ${activeTab === 'video' ? 'text-primary-300 font-bold' : ''}`}
                      >
                        <Video className="w-4 h-4" />
                        <span>Video</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('diagnostics')}
                        className={`flex flex-col items-center gap-1 ${activeTab === 'diagnostics' ? 'text-primary-300 font-bold' : ''}`}
                      >
                        <Activity className="w-4 h-4" />
                        <span>Telemetry</span>
                      </button>
                    </div>
                  </div>

                  {/* Bottom Home Indicator Bar */}
                  <div className="pb-2 pt-1 flex justify-center">
                    <div className="w-32 h-1 rounded-full bg-white/30" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* QR CODE SCAN & INSTANT SYNC SECTION                      */}
        {/* ======================================================== */}
        <div className="p-8 sm:p-10 rounded-3xl glass-panel border border-white/10 relative overflow-hidden">
          <div className="grid lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                <QrCode className="w-3.5 h-3.5" />
                <span>Instant Phone Synchronization</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                Scan with Your Camera to Launch on Any Phone
              </h2>
              <p className="text-sm text-gray-300 leading-relaxed max-w-xl">
                Point your iPhone or Android camera at the QR code. It will open LocalFix immediately in native app mode without consuming storage or requiring app store passwords.
              </p>
              <div className="flex flex-wrap gap-4 pt-2 text-xs text-gray-400">
                <span className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-emerald-400" /> Instant Push Notifications</span>
                <span className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-emerald-400" /> Auto GPS Geofence</span>
                <span className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-emerald-400" /> Zero Storage Bloat</span>
              </div>
            </div>

            <div className="lg:col-span-4 flex justify-center lg:justify-end">
              <div className="p-4 rounded-3xl bg-white text-gray-950 flex flex-col items-center gap-2 shadow-2xl">
                {/* Clean Responsive SVG QR Code */}
                <svg
                  width={qrSize}
                  height={qrSize}
                  viewBox="0 0 200 200"
                  className="rounded-xl"
                >
                  <rect width="200" height="200" fill="#ffffff" />
                  {/* Top-Left Corner Box */}
                  <rect x="20" y="20" width="50" height="50" fill="#0E0C17" rx="6" />
                  <rect x="30" y="30" width="30" height="30" fill="#ffffff" rx="3" />
                  <rect x="38" y="38" width="14" height="14" fill="#6D28D9" rx="2" />

                  {/* Top-Right Corner Box */}
                  <rect x="130" y="20" width="50" height="50" fill="#0E0C17" rx="6" />
                  <rect x="140" y="30" width="30" height="30" fill="#ffffff" rx="3" />
                  <rect x="148" y="38" width="14" height="14" fill="#6D28D9" rx="2" />

                  {/* Bottom-Left Corner Box */}
                  <rect x="20" y="130" width="50" height="50" fill="#0E0C17" rx="6" />
                  <rect x="30" y="140" width="30" height="30" fill="#ffffff" rx="3" />
                  <rect x="38" y="148" width="14" height="14" fill="#6D28D9" rx="2" />

                  {/* Dynamic Pattern Pixels representing LocalFix app URL */}
                  <rect x="85" y="25" width="12" height="12" fill="#0E0C17" rx="2" />
                  <rect x="105" y="25" width="12" height="24" fill="#0E0C17" rx="2" />
                  <rect x="85" y="55" width="24" height="12" fill="#6D28D9" rx="2" />
                  <rect x="25" y="85" width="24" height="12" fill="#0E0C17" rx="2" />
                  <rect x="55" y="85" width="12" height="24" fill="#0E0C17" rx="2" />
                  <rect x="85" y="85" width="30" height="30" fill="#10B981" rx="4" />
                  <rect x="125" y="85" width="15" height="15" fill="#0E0C17" rx="2" />
                  <rect x="150" y="85" width="25" height="12" fill="#6D28D9" rx="2" />
                  <rect x="85" y="125" width="15" height="25" fill="#0E0C17" rx="2" />
                  <rect x="110" y="125" width="25" height="12" fill="#0E0C17" rx="2" />
                  <rect x="145" y="125" width="15" height="15" fill="#0E0C17" rx="2" />
                  <rect x="125" y="150" width="35" height="25" fill="#6D28D9" rx="3" />
                  <rect x="85" y="160" width="25" height="15" fill="#10B981" rx="2" />
                </svg>
                <span className="text-[10px] font-bold text-gray-800 uppercase tracking-wider">
                  Scan to Open on Mobile
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 6 CORE MOBILE CAPABILITIES                               */}
        {/* ======================================================== */}
        <div className="space-y-6">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-3xl font-black text-white">Engineered for Everyday Trade Security</h2>
            <p className="text-sm text-gray-400">
              Why thousands of homeowners and verified technicians choose LocalFix Mobile over traditional calling and direct transfers.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* 1 */}
            <div className="p-6 rounded-3xl glass-panel border border-white/10 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-primary-700/20 border border-primary-500/30 text-primary-300 flex items-center justify-center">
                <Lock className="w-6 h-6 text-primary-400" />
              </div>
              <h3 className="text-base font-bold text-white">Offline Escrow Custody</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Approve milestone releases even when underground, in estate basements, or out of cell coverage via cryptographic offline token hashes.
              </p>
            </div>

            {/* 2 */}
            <div className="p-6 rounded-3xl glass-panel border border-white/10 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                <Radio className="w-6 h-6 text-emerald-400 animate-pulse" />
              </div>
              <h3 className="text-base font-bold text-white">Live Geofence Radar</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Know the exact minute your plumber or electrician arrives at your estate gate with sub-second device GPS proximity alerts.
              </p>
            </div>

            {/* 3 */}
            <div className="p-6 rounded-3xl glass-panel border border-white/10 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-500/30 text-blue-400 flex items-center justify-center">
                <Video className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-base font-bold text-white">Encrypted Video Diagnostics</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Start a secure in-app video consultation to show error codes and broken fixtures before the artisan departs their workshop.
              </p>
            </div>

            {/* 4 */}
            <div className="p-6 rounded-3xl glass-panel border border-white/10 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-amber-400" />
              </div>
              <h3 className="text-base font-bold text-white">Biometric Release Auth</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Protect your funds with Apple Face ID and Android Fingerprint authorization. No risk of accidental disbursement.
              </p>
            </div>

            {/* 5 */}
            <div className="p-6 rounded-3xl glass-panel border border-white/10 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/30 text-purple-300 flex items-center justify-center">
                <Zap className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-base font-bold text-white">Instant Push Emergency Alerts</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Receive instant notifications when an arbitrator renders a decision, an escrow vault is credited, or a neighbor posts urgent work.
              </p>
            </div>

            {/* 6 */}
            <div className="p-6 rounded-3xl glass-panel border border-white/10 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center">
                <HardDrive className="w-6 h-6 text-rose-400" />
              </div>
              <h3 className="text-base font-bold text-white">Lightweight & Fast</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Only 28 MB package size. Boots up in under 0.6 seconds and caches your favorite verified technicians for instantaneous dispatch.
              </p>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* BOTTOM INSTALL BANNER                                    */}
        {/* ======================================================== */}
        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-primary-950 via-[#181229] to-primary-950 border border-primary-500/30 text-center space-y-5 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-primary-700/30 border border-primary-500/40 text-primary-300 flex items-center justify-center mx-auto shadow-glow">
            <Smartphone className="w-7 h-7" />
          </div>
          <div className="space-y-2 max-w-xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              Ready to Upgrade Your Trade Experience?
            </h2>
            <p className="text-sm text-gray-300">
              Install LocalFix today. Hire verified technicians or register as an artisan with full escrow protection.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleInstallPWA}
              className="px-6 py-3.5 rounded-xl text-xs font-bold text-white shadow-glow flex items-center gap-2 cursor-pointer"
              style={{ background: 'linear-gradient(135deg, #6D28D9, #7C3AED)' }}
            >
              <Smartphone className="w-4 h-4" />
              <span>Install to Home Screen</span>
            </button>
            <Link
              to="/register"
              className="px-6 py-3.5 rounded-xl text-xs font-bold text-gray-200 bg-white/5 hover:bg-white/10 border border-white/15 transition-colors"
            >
              Create Account Free →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
