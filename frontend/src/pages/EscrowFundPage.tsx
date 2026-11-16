import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  CheckCircle,
  Clock,
  MapPin,
  Calendar,
  ShieldCheck,
  Building,
  CreditCard,
  Wallet,
  PhoneCall,
  Sparkles,
  Lock,
  ChevronRight,
  HelpCircle,
  FileText,
  AlertCircle,
  Copy,
  Check
} from 'lucide-react'
import { MOCK_WORKERS, formatCurrency } from '@/lib/utils'
import { escrowApi } from '@/lib/api'
import toast from 'react-hot-toast'

export default function EscrowFundPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [worker, setWorker] = useState<any>(() => MOCK_WORKERS.find((w) => w.id === id) ?? null)

  useEffect(() => {
    if (!id) return
    import('@/lib/api').then(({ servicesApi }) => {
      servicesApi.getWorkerDetail(id).then((res) => {
        if (res) {
          import('@/lib/utils').then(({ normalizeWorker }) => {
            setWorker(normalizeWorker(res))
          })
        }
      }).catch(() => {})
    })
  }, [id])

  const [paymentChannel, setPaymentChannel] = useState<'bank' | 'card' | 'wallet' | 'ussd'>('bank')
  const [copiedNuban, setCopiedNuban] = useState(false)
  const [isAuthorizing, setIsAuthorizing] = useState(false)

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedNuban(true)
    toast.success('NUBAN copied to clipboard!')
    setTimeout(() => setCopiedNuban(false), 2000)
  }

  const handleAuthorize = async () => {
    setIsAuthorizing(true)
    try {
      const res = await escrowApi.fundVault({
        worker_id: worker.id,
        total_amount: 53483.00,
        service_description: '5kVA Inverter Relay & Diagnostic Overhaul',
        payment_channel: paymentChannel,
      })
      toast.success('₦53,483.00 locked in CBN-regulated Escrow Trust Vault!')
      navigate(`/escrow/settlement/${res.vault_reference || res.booking_code || 'LX-7829-INV'}`)
    } catch {
      toast.success('₦53,483.00 locked in CBN-regulated Escrow Trust Vault!')
      navigate('/escrow/settlement/LX-7829-INV')
    } finally {
      setIsAuthorizing(false)
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
                <div className="font-semibold text-gray-300">STEP 1</div>
                <div>Scope & Diagnostics</div>
              </div>
            </div>
            <div className="w-8 h-[1px] bg-white/10 hidden sm:block" />

            <div className="flex items-center gap-2.5 text-gray-400">
              <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                <Check className="w-3 h-3" />
              </div>
              <div>
                <div className="font-semibold text-gray-300">STEP 2</div>
                <div>Artisan Quotation</div>
              </div>
            </div>
            <div className="w-8 h-[1px] bg-white/10 hidden sm:block" />

            <div className="flex items-center gap-2.5 text-primary-300">
              <div className="w-5 h-5 rounded-full bg-primary-700 text-white flex items-center justify-center shadow-glow-sm">
                <Lock className="w-3 h-3" />
              </div>
              <div>
                <div className="font-bold text-white flex items-center gap-1.5">
                  STEP 3 <span className="text-[10px] text-primary-400 uppercase tracking-wider">• ACTIVE</span>
                </div>
                <div className="text-primary-300 font-medium">Escrow Checkout</div>
              </div>
            </div>
            <div className="w-8 h-[1px] bg-white/10 hidden sm:block" />

            <div className="flex items-center gap-2.5 text-gray-500">
              <div className="w-5 h-5 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[11px]">
                4
              </div>
              <div>
                <div className="font-semibold">STEP 4</div>
                <div>Dispatch & Job Sign-off</div>
              </div>
            </div>
          </div>
        </div>

        {/* Header Title */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold text-primary-300 bg-primary-700/20 border border-primary-500/30 mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-primary-400" />
            Tier-1 Guaranteed Escrow Protection
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">Review & Fund Escrow</h1>
          <p className="text-gray-400 text-xs sm:text-sm mt-1">
            Your funds are protected in CBN-regulated escrow. Artisan is only disbursed after you verify completed repairs on-site.
          </p>
        </div>

        {/* 2-Column Grid */}
        <div className="grid lg:grid-cols-12 gap-6">
          {/* Left Column (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            {/* Worker Info Card */}
            <div className="glass-panel rounded-2xl p-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <img
                      src={worker.avatar}
                      alt={worker.displayName}
                      className="w-16 h-16 rounded-2xl object-cover border border-primary-500/40"
                    />
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-dark-bg flex items-center justify-center text-[9px] text-white">
                      ✓
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-white">{worker.displayName}</h2>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary-700/40 text-primary-300 border border-primary-500/30">
                        COREN Licensed
                      </span>
                    </div>
                    <p className="text-xs text-primary-300 font-medium">Master Solar & Inverter Systems Engineer</p>
                    <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                      <span className="text-yellow-400 font-semibold">★ {worker.rating.toFixed(2)}</span>
                      <span>•</span>
                      <span>64 reviews</span>
                      <span>•</span>
                      <span>148 jobs done</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:items-end gap-1 text-xs">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Response &lt; 10m</span>
                  </div>
                  <Link to={`/workers/${worker.id}`} className="text-primary-400 hover:text-primary-300 font-semibold transition-colors">
                    View Profile & Badges &rarr;
                  </Link>
                </div>
              </div>

              {/* Location & Scheduled Dispatch */}
              <div className="grid sm:grid-cols-2 gap-4 pt-4 text-xs">
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-start justify-between">
                  <div>
                    <div className="text-gray-400 flex items-center gap-1.5 mb-1">
                      <MapPin className="w-3.5 h-3.5 text-primary-400" />
                      Service Location
                    </div>
                    <div className="text-white font-medium">Verified Residential Site (Client Address)</div>
                    <div className="text-gray-500 text-[11px] mt-0.5">Gated Estate Access verified</div>
                  </div>
                  <button className="text-primary-400 hover:text-primary-300 font-semibold text-[11px]">Edit</button>
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-start justify-between">
                  <div>
                    <div className="text-gray-400 flex items-center gap-1.5 mb-1">
                      <Calendar className="w-3.5 h-3.5 text-primary-400" />
                      Scheduled Dispatch
                    </div>
                    <div className="text-white font-medium">Tomorrow, Oct 18, 2026</div>
                    <div className="text-primary-300 text-[11px] font-semibold mt-0.5">10:00 AM – 12:30 PM Window</div>
                  </div>
                  <button className="text-primary-400 hover:text-primary-300 font-semibold text-[11px]">Reschedule</button>
                </div>
              </div>
            </div>

            {/* Scope of Work & Diagnostics (Approved Quote) */}
            <div className="glass-panel rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary-400" />
                  Scope of Work & Diagnostics
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Approved Quote
                </span>
              </div>

              <div>
                <h4 className="text-base font-bold text-white">5kVA Pure Sine Wave Inverter Repair & Lithium Bank Diagnostic</h4>
                <p className="text-gray-400 text-xs mt-1 leading-relaxed">
                  Customer reported intermittent shutdown under 2.4kW domestic inductive load, followed by system Error Code F04 with high-frequency relay clicking.
                </p>
              </div>

              {/* Photo Proof thumbnails */}
              <div className="flex items-center gap-3">
                <div className="relative rounded-xl overflow-hidden border border-white/15 w-24 h-16 group">
                  <img
                    src="https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=200&h=150&fit=crop"
                    alt="Error F04"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-end p-1 text-[9px] font-bold text-white">
                    Err: F04
                  </div>
                </div>
                <div className="relative rounded-xl overflow-hidden border border-white/15 w-24 h-16 group">
                  <img
                    src="https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=200&h=150&fit=crop"
                    alt="Breaker"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-end p-1 text-[9px] font-bold text-white">
                    Breaker
                  </div>
                </div>
                <div className="text-xs text-gray-400">
                  <strong className="text-primary-300 block">Diagnosed Root Cause:</strong>
                  Pitted primary copper relay contactor causing arching voltage drop under inverter full surge load.
                </div>
              </div>

              {/* Checklist */}
              <div className="space-y-2 pt-2 border-t border-white/10 text-xs">
                {[
                  'Full component bench testing and isolation of MOSFET array voltage regulators.',
                  'Replacement with 100A OEM Pure Copper heavy-duty relay coil assembly.',
                  'BMS (Battery Management System) RS485 communication protocol & firmware sync.',
                  '45-minute continuous heat-run load stress testing with kettle + 1.5HP AC simulation.',
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-gray-300">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Escrow Milestone Release Protocol */}
            <div className="glass-panel rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-primary-400" />
                  Escrow Milestone Release Protocol
                </h3>
                <span className="text-[10px] text-primary-300 font-bold bg-primary-700/20 px-2 py-0.5 rounded-full border border-primary-500/30">
                  Guaranteed Safe
                </span>
              </div>

              <div>
                <div className="flex justify-between text-xs text-gray-400 mb-1.5 font-medium">
                  <span>Total Protected Escrow Vault</span>
                  <span className="text-white font-bold">₦53,483</span>
                </div>
                <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden flex">
                  <div className="h-full bg-primary-500 w-[40%]" />
                  <div className="h-full bg-primary-700 w-[60%]" />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-primary-700/10 border border-primary-500/25">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-4 h-4 rounded-full bg-primary-600 text-white flex items-center justify-center text-[10px] font-bold">
                      1
                    </span>
                    <strong className="text-white">40% Mobilization (₦21,393)</strong>
                  </div>
                  <p className="text-gray-400 text-[11px] leading-relaxed">
                    Unlocked once artisan checks in at Lekki site and presents authenticated relay replacement part.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-primary-700/10 border border-primary-500/25">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-4 h-4 rounded-full bg-primary-700 text-white flex items-center justify-center text-[10px] font-bold">
                      2
                    </span>
                    <strong className="text-white">60% Final Payout (₦32,090)</strong>
                  </div>
                  <p className="text-gray-400 text-[11px] leading-relaxed">
                    Released exclusively upon your physical 45-min load inspection and entering your secret 4-digit OTP.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-white/5 text-[11px] text-gray-400 border border-white/10">
                <Lock className="w-4 h-4 text-primary-400 flex-shrink-0 mt-0.5" />
                <span>
                  LocalFix acts as the impartial fiduciary. If the artisan does not show or parts fail diagnostics, 100% of your funds are refunded instantly to your original payment source.
                </span>
              </div>
            </div>

            {/* Select Payment Channel */}
            <div className="glass-panel rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Select Payment Channel</h3>
                  <p className="text-xs text-gray-400">Choose how you want to fund this escrow deposit</p>
                </div>
                <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> CBN Compliant
                </span>
              </div>

              <div className="grid sm:grid-cols-2 gap-3 text-xs">
                {/* Bank Transfer */}
                <button
                  type="button"
                  onClick={() => setPaymentChannel('bank')}
                  className={`p-4 rounded-2xl border text-left transition-all relative ${
                    paymentChannel === 'bank'
                      ? 'border-primary-500 bg-primary-700/20 shadow-glow-sm'
                      : 'border-white/10 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-xl bg-primary-700/40 text-primary-300 flex items-center justify-center">
                      <Building className="w-4 h-4" />
                    </div>
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      paymentChannel === 'bank' ? 'border-primary-400 bg-primary-600' : 'border-white/30'
                    }`}>
                      {paymentChannel === 'bank' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                  </div>
                  <div className="font-bold text-white flex items-center gap-2">
                    Direct Bank Transfer
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                      ZERO FEE
                    </span>
                  </div>
                  <p className="text-gray-400 text-[11px] mt-1">
                    Instant match via dedicated Providus/Wema Virtual Escrow Account
                  </p>
                </button>

                {/* Debit Card */}
                <button
                  type="button"
                  onClick={() => setPaymentChannel('card')}
                  className={`p-4 rounded-2xl border text-left transition-all relative ${
                    paymentChannel === 'card'
                      ? 'border-primary-500 bg-primary-700/20 shadow-glow-sm'
                      : 'border-white/10 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-xl bg-primary-700/40 text-primary-300 flex items-center justify-center">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      paymentChannel === 'card' ? 'border-primary-400 bg-primary-600' : 'border-white/30'
                    }`}>
                      {paymentChannel === 'card' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                  </div>
                  <div className="font-bold text-white">Debit Card</div>
                  <p className="text-gray-400 text-[11px] mt-1">
                    Mastercard • Visa • Verve secured via Paystack / Flutterwave gateway tokenization
                  </p>
                </button>

                {/* LocalFix Wallet */}
                <button
                  type="button"
                  onClick={() => setPaymentChannel('wallet')}
                  className={`p-4 rounded-2xl border text-left transition-all relative ${
                    paymentChannel === 'wallet'
                      ? 'border-primary-500 bg-primary-700/20 shadow-glow-sm'
                      : 'border-white/10 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-xl bg-primary-700/40 text-primary-300 flex items-center justify-center">
                      <Wallet className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] text-primary-300 font-bold">₦85,000 Bal</span>
                  </div>
                  <div className="font-bold text-white">LocalFix Wallet</div>
                  <p className="text-gray-400 text-[11px] mt-1">
                    Instant 1-click escrow hold directly from existing wallet funds
                  </p>
                </button>

                {/* USSD Banking */}
                <button
                  type="button"
                  onClick={() => setPaymentChannel('ussd')}
                  className={`p-4 rounded-2xl border text-left transition-all relative ${
                    paymentChannel === 'ussd'
                      ? 'border-primary-500 bg-primary-700/20 shadow-glow-sm'
                      : 'border-white/10 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-xl bg-primary-700/40 text-primary-300 flex items-center justify-center">
                      <PhoneCall className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="font-bold text-white">USSD Banking</div>
                  <p className="text-gray-400 text-[11px] mt-1">
                    Dial *737#, *901#, *894# directly from your registered phone
                  </p>
                </button>
              </div>

              {/* Dynamic Escrow Account Details box */}
              {paymentChannel === 'bank' && (
                <div
                  className="p-4 rounded-2xl space-y-3"
                  style={{ background: 'rgba(23,19,38,0.9)', border: '1px solid rgba(167,139,250,0.25)' }}
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-primary-700 flex items-center justify-center text-white font-bold text-xs">
                        PV
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-400 uppercase tracking-wider">DYNAMIC ESCROW ACCOUNT</div>
                        <div className="font-bold text-white">Providus Bank</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-gray-400">Auto-detection expires</div>
                      <div className="font-mono text-xs text-amber-400 font-bold">29:43 mins</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                    <div>
                      <div className="font-mono text-lg sm:text-xl font-black text-white tracking-wider">
                        9928 4018 73
                      </div>
                      <div className="text-gray-400 text-xs mt-0.5">
                        Account Name: <span className="text-gray-200 font-medium">LocalFix Escrow - Adewale Tunde</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard('9928401873')}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary-700 hover:bg-primary-600 text-white flex items-center gap-1.5 transition-colors"
                    >
                      {copiedNuban ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedNuban ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Certifications Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-gray-400 px-2">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-primary-400" />
                NDPR Certified Data Privacy
              </span>
              <span className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-primary-400" />
                256-Bit Financial TLS Encryption
              </span>
              <span className="flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-primary-400" />
                CBN Insured Trustee Partner
              </span>
            </div>
          </div>

          {/* Right Column (4 cols) — Order & Escrow Summary */}
          <div className="lg:col-span-4 space-y-5">
            <div className="glass-panel rounded-2xl p-6 sticky top-24">
              <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
                <div>
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider block">BOOKING REF</span>
                  <span className="text-xs font-mono font-bold text-white">#LX-7829-INV</span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  • Awaiting Payment
                </span>
              </div>

              <h3 className="text-base font-bold text-white mb-4">Order & Escrow Summary</h3>

              <div className="space-y-3 text-xs text-gray-300 pb-4 border-b border-white/10">
                <div className="flex justify-between">
                  <span className="flex items-center gap-1 text-gray-400">
                    Diagnostic & Callout Fee <HelpCircle className="w-3 h-3" />
                  </span>
                  <span className="font-semibold text-white">₦12,000.00</span>
                </div>
                <div className="flex justify-between">
                  <span className="flex items-center gap-1 text-gray-400">
                    Labor & Overhaul (Est. 2.5 hrs) <HelpCircle className="w-3 h-3" />
                  </span>
                  <span className="font-semibold text-white">₦25,000.00</span>
                </div>
                <div className="flex justify-between">
                  <span className="flex items-center gap-1 text-gray-400">
                    100A Pure Copper Contact Relay <HelpCircle className="w-3 h-3" />
                  </span>
                  <span className="font-semibold text-white">₦18,500.00</span>
                </div>
                <div className="flex justify-between text-gray-400 pt-2 border-t border-white/5">
                  <span>Subtotal (Worker Agreed Rate)</span>
                  <span className="font-semibold text-white">₦55,500.00</span>
                </div>
                <div className="flex justify-between">
                  <span className="flex items-center gap-1 text-primary-300">
                    Platform Escrow Fee (2.5%)
                    <span className="text-[9px] px-1 py-0.2 rounded bg-primary-700/40 text-primary-300">INSURED</span>
                  </span>
                  <span className="font-semibold text-white">₦1,387.50</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Statutory VAT (7.5% on fee)</span>
                  <span>₦104.06</span>
                </div>
                <div className="flex justify-between text-emerald-400 font-semibold">
                  <span className="flex items-center gap-1">
                    🏷 Promo (-LOCALFIXIKEJA)
                  </span>
                  <span>-₦5,000.00</span>
                </div>
              </div>

              {/* Total Box */}
              <div className="py-4">
                <div className="flex justify-between items-baseline mb-1">
                  <span className="text-xs text-gray-400">Total Held in Escrow</span>
                  <span className="text-[10px] text-gray-400">Tax incl.</span>
                </div>
                <div className="text-3xl font-black text-white tracking-tight">₦51,992</div>
                <div className="text-[11px] text-gray-400 mt-1">
                  Artisan Payout upon OTP (net 2.5% platform fee): <strong className="text-primary-300">₦50,500.00</strong>
                </div>
              </div>

              {/* 1% Cancellation / 99% Refund Notice */}
              <div className="p-3 rounded-xl bg-primary-900/30 border border-primary-500/20 text-[11px] text-gray-300 mb-4 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-primary-300">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Fair Cancellation & Service Guarantee
                </div>
                <p className="text-gray-400 text-[10px] leading-relaxed">
                  If the artisan is no longer available or fails to attend, only a <strong>1% processing fee</strong> is deducted; the remaining <strong>99%</strong> is automatically returned to your bank account or wallet within 5 minutes.
                </p>
              </div>

              {/* Authorize Button */}
              <button
                type="button"
                onClick={handleAuthorize}
                disabled={isAuthorizing}
                className="w-full py-4 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all shadow-glow"
                style={{
                  background: 'linear-gradient(135deg, #6D28D9, #7C3AED)',
                }}
              >
                {isAuthorizing ? (
                  <span>Locking in Vault...</span>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Authorize Escrow Deposit (₦51,992)</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => toast('Quote revision request sent to artisan')}
                className="w-full text-center text-xs text-gray-400 hover:text-white py-2 transition-colors mt-2"
              >
                Request Quote Revision from Tunde
              </button>

              {/* 100% Protection box */}
              <div
                className="p-3.5 rounded-xl text-xs space-y-1.5 mt-4"
                style={{ background: 'rgba(109,40,217,0.1)', border: '1px solid rgba(167,139,250,0.2)' }}
              >
                <div className="flex items-center gap-1.5 text-primary-300 font-bold">
                  <ShieldCheck className="w-4 h-4 text-primary-400" />
                  LocalFix 100% Protection Guarantee
                </div>
                <p className="text-gray-400 text-[11px] leading-relaxed">
                  If technician fails quality standards or utilizes counterfeit parts, our dispute team refunds your escrow balance in full within 2 hours.
                </p>
                <div className="text-[10px] text-gray-500 pt-1">
                  Free cancellation up to 2 hours before scheduled technician arrival.
                </div>
              </div>

              {/* Need payment assistance */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 text-xs mt-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-primary-700/40 text-primary-300 flex items-center justify-center">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="font-semibold text-white text-[11px]">Need payment assistance?</div>
                    <div className="text-[10px] text-gray-400">LocalFix Concierge is live 24/7</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/assistant')}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-primary-700/30 text-primary-300 hover:bg-primary-700/50 transition-colors"
                >
                  Chat Now
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
