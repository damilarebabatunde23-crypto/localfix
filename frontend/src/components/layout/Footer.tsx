import { Link } from 'react-router-dom'
import {
  Shield,
  ShieldCheck,
  Radio,
  Lock,
  MapPin,
  Globe,
  Phone,
  Video,
  Sparkles,
  Navigation,
  CheckCircle,
  ArrowUpRight,
  Headphones
} from 'lucide-react'
import { useAppStore } from '@/stores/useAppStore'
import { WORLD_HUBS } from '@/lib/utils'
import toast from 'react-hot-toast'

export default function Footer() {
  const { theme, currency, setCurrency, locationName, requestGPSLocation } = useAppStore()
  const isDark = theme === 'dark'

  const handleQuickGps = async () => {
    toast.loading('Acquiring live satellite GPS fix...', { id: 'footer-gps' })
    const ok = await requestGPSLocation()
    toast.dismiss('footer-gps')
    if (ok) {
      toast.success(`Device GPS locked: ${useAppStore.getState().locationName}!`, { icon: '📍' })
    } else {
      toast.error('Device GPS access was not granted by browser.')
    }
  }

  const FOOTER_SECTIONS = [
    {
      title: 'Services & Trades',
      links: [
        { label: '⚡ Electrical, Solar & EV', path: '/services' },
        { label: '🔧 Plumbing & Boreholes', path: '/services' },
        { label: '❄️ HVAC & Air Conditioning', path: '/services' },
        { label: '🪵 Carpentry & Joinery', path: '/services' },
        { label: '⚙️ Generators & Inverters', path: '/services' },
        { label: '🗺️ Global Artisan Directory', path: '/map' },
      ],
    },
    {
      title: 'Platform & Dispatch',
      links: [
        { label: '🛰️ Live Worker Dispatch Tracker', path: '/tracking', highlight: true },
        { label: '📱 Mobile & Desktop App', path: '/app' },
        { label: '🛠️ P2P Equipment Rentals', path: '/marketplace' },
        { label: '💬 Encrypted Voice & Video Call', path: '/messages' },
        { label: '📍 Interactive Neighborhood Map', path: '/map' },
        { label: '📞 24/7 Global Support Desk', path: '/contact' },
      ],
    },
    {
      title: 'Trust, Escrow & Mediation',
      links: [
        { label: '🔒 Platform Escrow Vault', path: '/escrow/fund', highlight: true },
        { label: '⚖️ Neutral Mediation Room', path: '/mediation' },
        { label: '📑 Independent Audit Chamber', path: '/mediation/audit' },
        { label: '🛡️ Vetted Artisan Credentials', path: '/profile' },
        { label: '💵 In-Person Direct Settlement', path: '/services' },
        { label: '🤝 100% Inspection Guarantee', path: '/contact' },
      ],
    },
  ]

  return (
    <footer
      className="mt-20 border-t transition-colors duration-300 pb-24 md:pb-12"
      style={{
        background: isDark
          ? 'linear-gradient(180deg, rgba(23,19,38,0.95) 0%, rgba(13,10,22,1) 100%)'
          : 'linear-gradient(180deg, #F8F7FF 0%, #EDE9FE 100%)',
        borderColor: isDark ? 'rgba(167,139,250,0.18)' : 'rgba(109,40,217,0.15)',
        boxShadow: isDark
          ? '0 -10px 40px rgba(0,0,0,0.35)'
          : '0 -10px 30px rgba(109,40,217,0.06)',
      }}
    >
      {/* ── Top Guarantee & Trust Assurance Strip ── */}
      <div
        className="border-b px-4 py-4"
        style={{
          borderColor: isDark ? 'rgba(167,139,250,0.12)' : 'rgba(109,40,217,0.12)',
          background: isDark ? 'rgba(37,28,64,0.4)' : 'rgba(255,255,255,0.6)',
        }}
      >
        <div className="max-w-[1400px] mx-auto flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
              <span className={isDark ? 'text-gray-200 font-semibold' : 'text-gray-800 font-bold'}>
                100% Escrow Protection Vault
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
                <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              </div>
              <span className={isDark ? 'text-gray-200 font-semibold' : 'text-gray-800 font-bold'}>
                Uber-Style Live GPS & Street Tracking
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-primary-500/20 text-primary-400 flex items-center justify-center border border-primary-500/30">
                <Lock className="w-3.5 h-3.5" />
              </div>
              <span className={isDark ? 'text-gray-200 font-semibold' : 'text-gray-800 font-bold'}>
                Dual Payment: Escrow or Direct In-Person
              </span>
            </div>
          </div>

          {/* Quick Location & Currency Pill */}
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={handleQuickGps}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                isDark
                  ? 'bg-black/40 border-white/15 text-gray-200 hover:text-white hover:border-primary-400'
                  : 'bg-white border-purple-200 text-gray-700 hover:text-primary-700 shadow-sm'
              }`}
              title="Click to re-acquire device GPS fix"
            >
              <MapPin className="w-3.5 h-3.5 text-primary-500" />
              <span className="max-w-[140px] truncate">{locationName || 'Detecting GPS...'}</span>
            </button>

            <select
              value={currency}
              onChange={(e) => {
                setCurrency(e.target.value)
                toast.success(`Platform currency set to ${e.target.value}`)
              }}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer focus:outline-none ${
                isDark
                  ? 'bg-black/40 border-white/15 text-white'
                  : 'bg-white border-purple-200 text-gray-800 shadow-sm'
              }`}
            >
              {['USD', 'EUR', 'GBP', 'NGN', 'CAD', 'AUD', 'KES'].map((c) => (
                <option key={c} value={c} className="bg-gray-900 text-white">
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Main Footer Grid ── */}
      <div className="max-w-[1400px] mx-auto px-6 pt-12 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Brand & Mission Column */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div
                className="w-11 h-11 rounded-2xl overflow-hidden border flex items-center justify-center shadow-lg"
                style={{
                  borderColor: isDark ? 'rgba(167,139,250,0.3)' : 'rgba(109,40,217,0.25)',
                  background: isDark ? '#1F1835' : '#ffffff',
                }}
              >
                <img src="/logo.jpg" alt="LocalFix" className="w-full h-full object-cover" />
              </div>
              <div>
                <span
                  className="font-black text-xl tracking-tight block leading-none"
                  style={{ color: isDark ? '#ffffff' : '#111827' }}
                >
                  LocalFix
                </span>
                <span className="text-[10px] text-primary-400 font-extrabold uppercase tracking-widest">
                  Global Artisan & Trade Dispatch
                </span>
              </div>
            </div>

            <p
              className="text-xs leading-relaxed max-w-md font-normal"
              style={{ color: isDark ? '#d1d5db' : '#4b5563' }}
            >
              The world’s neighborhood service standard. Connecting certified artisans, technicians, and tradesmen directly with residential and commercial clients across the globe. Powered by live device GPS, Uber-style turn-by-turn road dispatch, platform escrow protection, and neutral dispute arbitration.
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold border"
                style={{
                  background: isDark ? 'rgba(109,40,217,0.2)' : 'rgba(109,40,217,0.08)',
                  borderColor: isDark ? 'rgba(167,139,250,0.3)' : 'rgba(109,40,217,0.2)',
                  color: isDark ? '#e9d5ff' : '#6d28d9',
                }}
              >
                <Sparkles className="w-3.5 h-3.5 text-primary-400" />
                Verified Trade Guilds & Union Registry
              </span>

              <span
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold border"
                style={{
                  background: isDark ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.08)',
                  borderColor: isDark ? 'rgba(16,185,129,0.3)' : 'rgba(16,185,129,0.25)',
                  color: isDark ? '#6ee7b7' : '#047857',
                }}
              >
                <CheckCircle className="w-3.5 h-3.5" />
                256-Bit Encrypted Payments
              </span>
            </div>
          </div>

          {/* Navigation Link Columns */}
          {FOOTER_SECTIONS.map((section) => (
            <div key={section.title} className="space-y-3">
              <h4
                className="text-xs font-black uppercase tracking-wider"
                style={{ color: isDark ? '#ffffff' : '#111827' }}
              >
                {section.title}
              </h4>
              <ul className="space-y-2.5">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.path}
                      className={`text-xs font-medium inline-flex items-center gap-1 transition-all duration-150 ${
                        link.highlight
                          ? isDark
                            ? 'text-primary-300 hover:text-white font-bold'
                            : 'text-primary-700 hover:text-primary-900 font-bold'
                          : isDark
                          ? 'text-gray-300 hover:text-white hover:translate-x-0.5'
                          : 'text-gray-600 hover:text-primary-700 hover:translate-x-0.5'
                      }`}
                    >
                      <span>{link.label}</span>
                      {link.highlight && <ArrowUpRight className="w-3 h-3 text-primary-400" />}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* ── Worldwide Hubs Strip ── */}
        <div
          className="mt-12 pt-6 pb-4 border-t flex flex-col md:flex-row items-center justify-between gap-4 text-xs"
          style={{ borderColor: isDark ? 'rgba(167,139,250,0.12)' : 'rgba(109,40,217,0.12)' }}
        >
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-primary-400" />
            <span className={isDark ? 'text-gray-400 font-medium' : 'text-gray-600 font-semibold'}>
              Global Coverage:
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {WORLD_HUBS.filter((h) => h.country !== 'Global').map((hub) => (
                <span
                  key={hub.name}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-medium border ${
                    isDark
                      ? 'bg-black/40 border-white/10 text-gray-300'
                      : 'bg-white border-purple-100 text-gray-700 shadow-xs'
                  }`}
                >
                  {hub.name}
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-semibold text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>All Global Telemetry Nodes Operational (100% Uptime)</span>
          </div>
        </div>

        {/* ── Bottom Legal & Copyright Bar ── */}
        <div
          className="pt-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-xs"
          style={{ borderColor: isDark ? 'rgba(167,139,250,0.08)' : 'rgba(109,40,217,0.08)' }}
        >
          <p style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
            © 2026 LocalFix Platform Technologies Inc. All rights reserved. Worldwide Multi-Currency & P2P Trade Network.
          </p>

          <div className="flex items-center gap-4" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
            <Link to="/contact" className="hover:underline transition-colors">
              Privacy Policy
            </Link>
            <span>•</span>
            <Link to="/contact" className="hover:underline transition-colors">
              Terms of Service
            </Link>
            <span>•</span>
            <Link to="/mediation" className="hover:underline transition-colors">
              Arbitration Protocol
            </Link>
            <span>•</span>
            <Link to="/contact" className="hover:underline transition-colors">
              Security Compliance
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
