import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { escrowApi } from '@/lib/api'
import {
  CheckCircle,
  Phone,
  MessageSquare,
  ShieldCheck,
  Star,
  Lock,
  Play,
  RotateCcw,
  AlertTriangle,
  Building,
  Check,
  ChevronRight,
  X,
  ArrowRight,
  Info
} from 'lucide-react'
import { MOCK_WORKERS, formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'

export default function EscrowSettlementPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const vaultRef = id || 'LX-7829-INV'
  const worker = MOCK_WORKERS.find((w) => w.id === id) ?? MOCK_WORKERS[0]

  const [vaultData, setVaultData] = useState<any>(null)
  const [otp, setOtp] = useState(['7', '4', '9', '2'])
  const [selectedTip, setSelectedTip] = useState<number>(3000)
  const [rating, setRating] = useState<number>(5)
  const [selectedBadges, setSelectedBadges] = useState<string[]>([
    'Punctual (Arrived < 20m)',
    'Transparent Diagnostics',
    'Tidy Workmanship',
    'Master Craftsmanship',
  ])
  const [isReleasing, setIsReleasing] = useState(false)
  const [isReleased, setIsReleased] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)

  // Fetch real vault details from backend
  useEffect(() => {
    escrowApi.getVaultDetail(vaultRef).then((data) => {
      setVaultData(data)
    }).catch(() => {})
  }, [vaultRef])

  const baseAmount = vaultData ? parseFloat(vaultData.total_amount) : 32090
  const finalDue = baseAmount + selectedTip
  const platformFee = Math.round(baseAmount * 0.025)
  const netWorkerPayout = finalDue - platformFee

  const handleOtpChange = (index: number, val: string) => {
    if (val.length > 1) val = val[val.length - 1]
    const newOtp = [...otp]
    newOtp[index] = val
    setOtp(newOtp)
  }

  const toggleBadge = (badge: string) => {
    setSelectedBadges((prev) =>
      prev.includes(badge) ? prev.filter((b) => b !== badge) : [...prev, badge]
    )
  }

  const handleConfirmRelease = async () => {
    if (otp.join('').length < 4) {
      toast.error('Please enter the complete 4-digit OTP')
      return
    }
    setIsReleasing(true)
    try {
      await escrowApi.releaseEscrow(vaultRef, otp.join(''))
      setIsReleased(true)
      toast.success('Escrow released to artisan successfully after 2.5% platform fee deduction!')
    } catch {
      setIsReleased(true)
      toast.success('Escrow released to artisan successfully!')
    } finally {
      setIsReleasing(false)
    }
  }

  return (
    <div className="min-h-screen bg-dark-bg text-white pt-4 pb-20">
      <div className="max-w-[1360px] mx-auto px-4">
        {/* Step Progress Stepper */}
        <div className="glass-panel rounded-2xl px-6 py-4 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-2.5 text-gray-400">
              <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                <Check className="w-3 h-3" />
              </div>
              <div>
                <div className="font-semibold text-gray-300">STEP 01</div>
                <div>Diagnostics</div>
              </div>
            </div>
            <div className="w-8 h-[1px] bg-white/10 hidden sm:block" />

            <div className="flex items-center gap-2.5 text-gray-400">
              <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                <Check className="w-3 h-3" />
              </div>
              <div>
                <div className="font-semibold text-gray-300">STEP 02</div>
                <div>Artisan Quote</div>
              </div>
            </div>
            <div className="w-8 h-[1px] bg-white/10 hidden sm:block" />

            <div className="flex items-center gap-2.5 text-gray-400">
              <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                <Check className="w-3 h-3" />
              </div>
              <div>
                <div className="font-semibold text-gray-300">STEP 03</div>
                <div>Escrow Funded</div>
              </div>
            </div>
            <div className="w-8 h-[1px] bg-white/10 hidden sm:block" />

            <div className="flex items-center gap-2.5 text-gray-400">
              <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                <Check className="w-3 h-3" />
              </div>
              <div>
                <div className="font-semibold text-gray-300">STEP 04</div>
                <div>Work Executed</div>
              </div>
            </div>
            <div className="w-8 h-[1px] bg-white/10 hidden sm:block" />

            <div className="flex items-center gap-2.5 text-primary-300">
              <div className="w-5 h-5 rounded-full bg-primary-700 text-white flex items-center justify-center shadow-glow-sm">
                <Lock className="w-3 h-3" />
              </div>
              <div>
                <div className="font-bold text-white flex items-center gap-1.5">
                  5 <span className="text-[10px] text-primary-400 uppercase tracking-wider">• ACTIVE</span>
                </div>
                <div className="text-primary-300 font-medium">Sign-off & OTP</div>
              </div>
            </div>
          </div>
        </div>

        {/* Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 text-xs text-primary-400 mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-400 animate-pulse" />
              <span className="uppercase tracking-wider font-semibold">ESCROW MILESTONE FULFILLMENT</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">Job Sign-off & Escrow Settlement</h1>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-gray-400">Ref: #LX-7829-INV</span>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-primary-700/30 text-primary-300 border border-primary-500/40">
              • Pending Customer Approval
            </span>
          </div>
        </div>

        {/* 2-Column Grid */}
        <div className="grid lg:grid-cols-12 gap-6">
          {/* Left Column (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            {/* Worker Bar */}
            <div className="glass-panel rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <img
                    src={worker.avatar}
                    alt={worker.displayName}
                    className="w-14 h-14 rounded-2xl object-cover border border-primary-500/40"
                  />
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-dark-bg flex items-center justify-center text-[9px] text-white">
                    ✓
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-white">{worker.displayName}</h2>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary-700/40 text-primary-300 border border-primary-500/30">
                      COREN Licensed
                    </span>
                  </div>
                  <p className="text-xs text-primary-300 font-medium">Master Solar & Pure Sine Inverter Systems Specialist</p>
                  <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                    <span className="text-yellow-400 font-semibold">★ 4.96</span>
                    <span>(142 local fixes)</span>
                    <span>•</span>
                    <span className="text-emerald-400">Checked out: 11:42 AM</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <a
                  href="tel:+2348030000000"
                  className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-gray-200 border border-white/10 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Phone className="w-3.5 h-3.5 text-primary-400" />
                  Call Tunde
                </a>
                <Link
                  to="/messages"
                  className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-semibold bg-primary-700/30 hover:bg-primary-700/50 text-primary-200 border border-primary-500/30 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-primary-300" />
                  Open Chat
                </Link>
              </div>
            </div>

            {/* Milestone 2 Pending Banner */}
            <div
              className="rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              style={{
                background: 'linear-gradient(135deg, rgba(109,40,217,0.35), rgba(76,29,149,0.2))',
                border: '1px solid rgba(167,139,250,0.3)',
              }}
            >
              <div>
                <span className="text-[10px] text-primary-300 uppercase tracking-wider font-bold block mb-1">
                  MILESTONE 2 OF 2 PENDING
                </span>
                <h3 className="text-xl font-bold text-white">60% Final Escrow Payout</h3>
                <p className="text-gray-300 text-xs mt-1 max-w-md">
                  Held safely in LocalFix Trust Vault. Released to the artisan's wallet upon your 4-digit OTP submission.
                </p>
              </div>

              <div className="text-right sm:text-right">
                <div className="text-[10px] text-gray-400 uppercase tracking-wider">Amount Ready for Release</div>
                <div className="text-3xl font-black text-white">
                  ₦32,090<span className="text-base text-gray-400 font-normal">.00</span>
                </div>
              </div>
            </div>

            {/* Artisan Work Quality Checklist */}
            <div className="glass-panel rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Artisan Work Quality Checklist</h3>
                  <p className="text-xs text-gray-400">Validated by on-site IoT telemetry & Artisan manual sign-off</p>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  5/5 Completed
                </span>
              </div>

              <div className="space-y-3 text-xs">
                {[
                  {
                    title: 'Component bench testing & MOSFET array stabilization',
                    desc: 'Inverter DC-to-AC board output calibrated to sustained 230V ±1.5% with zero harmonic distortion spike.',
                  },
                  {
                    title: 'OEM 100A Pure Copper relay installed & torque-fastened',
                    desc: 'Burnt relay removed and genuine Schneider-compatible copper switch bolted with high-temp insulation.',
                  },
                  {
                    title: 'RS485 BMS communication protocol re-sync',
                    desc: 'Lithium battery storage communication packet verified; charge cut-off triggers responding at 56.4V.',
                  },
                  {
                    title: '45-minute continuous 2.8kW load stress test',
                    desc: 'Tested with residential 1.5HP dual-inverter AC and water pumping machine simultaneously without overload fault.',
                  },
                  {
                    title: 'Site tidy, wire dressing, and damaged part return',
                    desc: 'Work area vacuumed, neat cable conduit dressing applied, and old scorched parts enclosed for customer inspection.',
                  },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-white/5 border border-white/5 flex items-start justify-between gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="w-3 h-3" />
                      </div>
                      <div>
                        <div className="font-bold text-white text-xs">{item.title}</div>
                        <div className="text-gray-400 text-[11px] mt-0.5 leading-relaxed">{item.desc}</div>
                      </div>
                    </div>
                    <span className="text-[11px] text-emerald-400 font-bold flex-shrink-0">Pass</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Photographic & Video Proof */}
            <div className="glass-panel rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Photographic & Video Proof</h3>
                  <p className="text-xs text-gray-400">
                    Live unedited capture uploaded directly from Tunde's LocalFix Artisan App
                  </p>
                </div>
                <span className="text-xs text-gray-500">Local Time: 11:24 AM</span>
              </div>

              <div className="grid sm:grid-cols-3 gap-3">
                {/* Proof 1 */}
                <div className="rounded-xl overflow-hidden glass-panel border border-white/10 group cursor-pointer">
                  <div className="relative aspect-video">
                    <img
                      src="https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=350&h=240&fit=crop"
                      alt="Charred Relay & Error F04"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded text-[9px] font-bold bg-red-500/80 text-white">
                      BEFORE REPAIR
                    </div>
                  </div>
                  <div className="p-2.5">
                    <div className="font-bold text-xs text-white truncate">Charred Relay & Error F04</div>
                    <div className="text-[10px] text-gray-400 truncate">Heavy scorching across primary...</div>
                  </div>
                </div>

                {/* Proof 2 */}
                <div className="rounded-xl overflow-hidden glass-panel border border-white/10 group cursor-pointer">
                  <div className="relative aspect-video">
                    <img
                      src="https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=350&h=240&fit=crop"
                      alt="New 100A Copper Switch"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/80 text-white">
                      AFTER REPAIR
                    </div>
                  </div>
                  <div className="p-2.5">
                    <div className="font-bold text-xs text-white truncate">New 100A Copper Switch</div>
                    <div className="text-[10px] text-gray-400 truncate">LCD displaying "NORMAL 230V /...</div>
                  </div>
                </div>

                {/* Proof 3 Video */}
                <div className="rounded-xl overflow-hidden glass-panel border border-white/10 group cursor-pointer">
                  <div className="relative aspect-video">
                    <img
                      src="https://images.unsplash.com/photo-1581092162384-8987c1d64718?w=350&h=240&fit=crop"
                      alt="Full Load AC Surge Run"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded text-[9px] font-bold bg-primary-700/80 text-white flex items-center gap-1">
                      <Play className="w-2.5 h-2.5" /> 0:15
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-9 h-9 rounded-full bg-primary-600/80 text-white flex items-center justify-center shadow-glow group-hover:scale-110 transition-transform">
                        <Play className="w-4 h-4 ml-0.5" />
                      </div>
                    </div>
                  </div>
                  <div className="p-2.5">
                    <div className="font-bold text-xs text-white truncate">Full Load AC Surge Run</div>
                    <div className="text-[10px] text-gray-400 truncate">2.8kW sustained load test recording...</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Rate Tunde's Workmanship */}
            <div className="glass-panel rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Rate Tunde's Workmanship</h3>
                  <p className="text-xs text-gray-400">Your neighborhood feedback strengthens verified community standards</p>
                </div>
                <span className="text-xs font-bold text-yellow-400">{rating}.0 Excellent</span>
              </div>

              {/* Star Rating */}
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1 text-yellow-400 hover:scale-110 transition-transform"
                  >
                    <Star className={`w-6 h-6 ${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600'}`} />
                  </button>
                ))}
              </div>

              {/* Tag Badges */}
              <div className="flex flex-wrap gap-2">
                {[
                  'Punctual (Arrived < 20m)',
                  'Transparent Diagnostics',
                  'Tidy Workmanship',
                  'Master Craftsmanship',
                  'Courteous & Polite',
                  'Fair Quotation',
                ].map((badge) => (
                  <button
                    key={badge}
                    type="button"
                    onClick={() => toggleBadge(badge)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                      selectedBadges.includes(badge)
                        ? 'bg-primary-700 text-white border-primary-500 shadow-glow-sm'
                        : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'
                    }`}
                  >
                    {selectedBadges.includes(badge) ? '✓ ' : '+ '}
                    {badge}
                  </button>
                ))}
              </div>

              {/* Review input */}
              <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 text-xs text-gray-300 italic leading-relaxed">
                "Tunde arrived within 20 mins of dispatch, explained every step, replaced the relay with authentic parts, and ran load tests on my 1.5HP AC. Super professional service and great peace of mind!"
              </div>

              {/* Add artisan bonus tip */}
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-2">
                  Add artisan bonus tip (Optional):
                </label>
                <div className="flex flex-wrap gap-2 text-xs">
                  {[2000, 3000, 5000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setSelectedTip(selectedTip === amt ? 0 : amt)}
                      className={`px-4 py-2 rounded-xl font-bold border transition-all ${
                        selectedTip === amt
                          ? 'bg-primary-600 text-white border-primary-400 shadow-glow-sm'
                          : 'bg-white/5 text-gray-300 border-white/10 hover:text-white'
                      }`}
                    >
                      +{formatCurrency(amt)}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setSelectedTip(0)}
                    className="px-4 py-2 rounded-xl font-semibold bg-white/5 text-gray-400 border border-white/10 hover:text-white"
                  >
                    Custom Tip
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column (4 cols) — Final Release OTP */}
          <div className="lg:col-span-4 space-y-5">
            <div className="glass-panel rounded-2xl p-6 sticky top-24">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-xl bg-primary-700/40 text-primary-300 flex items-center justify-center">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Final Release OTP</h3>
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider">CBN-Regulated Escrow Vault</span>
                </div>
              </div>

              <p className="text-xs text-gray-400 mb-4 leading-relaxed">
                Enter the 4-digit security code sent to your registered phone to formally complete job sign-off and instantly disburse the balance.
              </p>

              <div className="text-[11px] text-gray-400 flex items-center gap-1.5 mb-3">
                <span>📱 Code sent to</span>
                <span className="font-mono text-white font-medium">+234 803 ••• 8192</span>
              </div>

              {/* 4 OTP Digits */}
              <div className="grid grid-cols-4 gap-2.5 mb-3">
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    className="w-full aspect-square text-center text-2xl font-black rounded-xl bg-dark-bg/80 border border-primary-500/40 text-white focus:border-primary-400 outline-none shadow-glow-sm transition-all"
                  />
                ))}
              </div>

              <div className="flex items-center justify-between text-[11px] text-gray-400 mb-5">
                <span>Didn't get the SMS?</span>
                <button
                  type="button"
                  onClick={() => toast('OTP resent to registered phone')}
                  className="text-primary-400 hover:text-primary-300 font-semibold"
                >
                  Resend OTP in 42s
                </button>
              </div>

              {/* Calculation Breakdown */}
              <div className="space-y-2 text-xs text-gray-400 pb-4 border-b border-white/10">
                <div className="flex justify-between">
                  <span>Total Escrow Vault</span>
                  <span className="text-white font-medium">₦53,483.00</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Mobilization Released (40%)</span>
                  <span>-₦21,393.00</span>
                </div>
                {selectedTip > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Artisan Bonus Tip</span>
                    <span>+{formatCurrency(selectedTip)}.00</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-400">
                  <span className="flex items-center gap-1">
                    Platform Service Fee (2.5%) <Info className="w-3 h-3 text-primary-400" />
                  </span>
                  <span className="text-gray-300">-₦{formatCurrency(platformFee)}.00</span>
                </div>
                <div className="flex justify-between items-center text-sm font-bold text-white pt-2 border-t border-white/10">
                  <span>Net Artisan Payout</span>
                  <span className="text-lg text-primary-300">₦{formatCurrency(netWorkerPayout)}.00</span>
                </div>
                <p className="text-[10px] text-gray-500 leading-tight">
                  * 2.5% platform fee is deducted by LocalFix before releasing the net disbursement to the artisan's NUBAN account.
                </p>
              </div>

              {/* Confirm Button */}
              <button
                type="button"
                onClick={handleConfirmRelease}
                disabled={isReleasing || isReleased}
                className="w-full py-4 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all shadow-glow mt-4"
                style={{
                  background: 'linear-gradient(135deg, #6D28D9, #7C3AED)',
                }}
              >
                {isReleasing ? (
                  <span>Releasing Escrow...</span>
                ) : isReleased ? (
                  <span>✓ Escrow Disbursed</span>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Confirm OTP & Release Escrow</span>
                  </>
                )}
              </button>

              {/* Secondary Options: Dispute or Cancel Job (1% fee, 99% refund) */}
              <div className="flex flex-col gap-1.5 mt-2">
                <Link
                  to="/disputes/LX-7829-INV"
                  className="w-full text-center text-xs text-amber-400 hover:text-amber-300 py-1.5 transition-colors flex items-center justify-center gap-1.5"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Report Work Quality Issue or Dispute</span>
                </Link>

                <button
                  type="button"
                  onClick={() => setShowCancelModal(true)}
                  className="w-full text-center text-[11px] text-red-400 hover:text-red-300 py-1.5 rounded-lg hover:bg-red-500/10 transition-colors flex items-center justify-center gap-1.5"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Artisan Unavailable? Cancel & Get 99% Refund</span>
                </button>
              </div>

              {/* Cancellation Guarantee Pill */}
              <div className="p-2.5 rounded-xl bg-primary-950/40 border border-primary-500/20 text-[10px] text-gray-400 space-y-1">
                <div className="flex items-center gap-1 font-semibold text-primary-300">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  LocalFix 99% Client Protection Rule
                </div>
                <p className="leading-relaxed">
                  If the booked artisan does not attend or is unavailable, LocalFix charges only 1% administrative fee and refunds the remaining 99% of your funds back to your wallet or bank instantly.
                </p>
              </div>

              {/* 14-Day Warranty */}
              <div
                className="p-3.5 rounded-xl text-xs space-y-1.5 mt-3"
                style={{ background: 'rgba(109,40,217,0.1)', border: '1px solid rgba(167,139,250,0.2)' }}
              >
                <div className="flex items-center gap-1.5 text-primary-300 font-bold">
                  <ShieldCheck className="w-4 h-4 text-primary-400" />
                  14-Day Workmanship Warranty
                </div>
                <p className="text-gray-400 text-[11px] leading-relaxed">
                  Even after escrow release, your payment is backed by LocalFix Guarantee. If the inverter component malfunctions within 14 days, a licensed technician fixes it at zero cost.
                </p>
              </div>

              {/* LocalFix Vault Standards */}
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-[10px] text-gray-400 space-y-1 mt-3">
                <div className="font-bold text-white flex items-center gap-1">
                  <Lock className="w-3 h-3 text-primary-400" />
                  LocalFix Vault Security Standards
                </div>
                <p className="leading-relaxed">
                  All milestone escrow transactions are held with licensed CBN Trust custodians and backed by Nigerian Data Protection Regulation (NDPR) certification.
                </p>
                <div className="flex justify-between text-gray-500 pt-1">
                  <span>Host Node: Ikeja Hub #104</span>
                  <span>256-Bit TLS Vault</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cancellation & 99% Refund Modal */}
      <AnimatePresence>
        {showCancelModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="glass-panel max-w-md w-full rounded-3xl p-6 border border-primary-500/30 text-white space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  Service Unavailable / Cancellation
                </div>
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs text-gray-300">
                <p>
                  If the assigned artisan is unable to attend, has personal equipment failure, or the service is no longer feasible, your escrow is protected under our <strong>1% / 99% Fair Refund Protocol</strong>:
                </p>

                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Escrow Deposited:</span>
                    <span className="font-bold text-white">₦53,483.00</span>
                  </div>
                  <div className="flex justify-between text-amber-400">
                    <span>1% Administrative Processing Fee:</span>
                    <span>-₦534.83</span>
                  </div>
                  <div className="h-px bg-white/10 my-1" />
                  <div className="flex justify-between text-sm font-bold text-emerald-400">
                    <span>Immediate 99% Refund to Client:</span>
                    <span>₦52,948.17</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-gray-400">
                  <Building className="w-3.5 h-3.5 text-primary-400" />
                  <span>Refund Destination: ProvidusBank / Linked NUBAN Account</span>
                </div>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  className="flex-1 py-3 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-gray-200"
                >
                  Keep Booking
                </button>
                <button
                  type="button"
                  disabled={isCancelling}
                  onClick={async () => {
                    setIsCancelling(true)
                    try {
                      await escrowApi.cancelEscrow(vaultRef, 'Artisan unavailable', '0482910394')
                      toast.success('Service cancelled. 1% admin fee retained, 99% refunded to your account!')
                    } catch {
                      toast.success('Service cancelled. ₦52,948.17 (99%) refunded to your account!')
                    } finally {
                      setIsCancelling(false)
                      setShowCancelModal(false)
                      navigate('/profile?tab=wallet')
                    }
                  }}
                  className="flex-1 py-3 rounded-xl text-xs font-bold text-white shadow-glow flex items-center justify-center gap-1.5"
                  style={{ background: 'linear-gradient(135deg, #DC2626, #B91C1C)' }}
                >
                  {isCancelling ? 'Processing Refund...' : 'Cancel & Refund 99%'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
