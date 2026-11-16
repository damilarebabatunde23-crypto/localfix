import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  Lock,
  ShieldCheck,
  Clock,
  Phone,
  MessageSquare,
  FileText,
  UserCheck,
  CheckCircle,
  XCircle,
  Camera,
  Play,
  Upload,
  ChevronRight,
  ExternalLink,
  ShieldAlert
} from 'lucide-react'
import { MOCK_WORKERS, formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'

export default function DisputeMediationPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [worker, setWorker] = useState<any>(() => MOCK_WORKERS.find((w) => w.id === id) ?? null)

  const [activeAction, setActiveAction] = useState<string | null>(null)

  const handleAction = (name: string) => {
    setActiveAction(name)
    toast.success(`Action initiated: ${name}`)
  }

  return (
    <div className="min-h-screen bg-dark-bg text-white pt-4 pb-20">
      <div className="max-w-[1360px] mx-auto px-4">
        {/* Top Breadcrumb & Status */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs mb-4 text-gray-400">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Link to="/" className="hover:text-white transition-colors">Job Center</Link>
            <span>&gt;</span>
            <span>Global Service Mesh • Metro Hub</span>
            <span>&gt;</span>
            <span className="text-white font-mono font-bold">Ref #LX-7829-INV</span>
            <span className="text-gray-500">• Flagged 11:58 AM (16m post-checkout)</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-500/15 text-red-300 border border-red-500/30">
              Escrow Frozen in Trust Vault • Mediation Stage
            </span>
          </div>
        </div>

        {/* Step Progress Stepper */}
        <div className="glass-panel rounded-2xl px-6 py-4 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-2.5 text-gray-400">
              <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                ✓
              </div>
              <div>
                <div className="font-semibold text-gray-300">STEP 01</div>
                <div>Diagnostics (Passed • Verified)</div>
              </div>
            </div>
            <div className="w-8 h-[1px] bg-white/10 hidden sm:block" />

            <div className="flex items-center gap-2.5 text-gray-400">
              <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                ✓
              </div>
              <div>
                <div className="font-semibold text-gray-300">STEP 02</div>
                <div>Artisan Quote (Passed • ₦53,483)</div>
              </div>
            </div>
            <div className="w-8 h-[1px] bg-white/10 hidden sm:block" />

            <div className="flex items-center gap-2.5 text-gray-400">
              <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                ✓
              </div>
              <div>
                <div className="font-semibold text-gray-300">STEP 03</div>
                <div>Escrow Funded (Passed • Trust Lock)</div>
              </div>
            </div>
            <div className="w-8 h-[1px] bg-white/10 hidden sm:block" />

            <div className="flex items-center gap-2.5 text-amber-400">
              <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                !
              </div>
              <div>
                <div className="font-bold">STEP 04</div>
                <div className="text-amber-300">Work Executed (Issue Flagged)</div>
              </div>
            </div>
            <div className="w-8 h-[1px] bg-white/10 hidden sm:block" />

            <div className="flex items-center gap-2.5 text-primary-300">
              <div className="w-5 h-5 rounded-full bg-primary-700 text-white flex items-center justify-center shadow-glow-sm">
                <Lock className="w-3 h-3" />
              </div>
              <div>
                <div className="font-bold text-white flex items-center gap-1.5">
                  STEP 05 <span className="text-[10px] text-primary-400 uppercase tracking-wider">• ACTIVE</span>
                </div>
                <div className="text-primary-300 font-medium">Mediation Review (Vault Custody)</div>
              </div>
            </div>
          </div>
        </div>

        {/* Title & Actions Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold text-primary-300 bg-primary-700/20 border border-primary-500/30 mb-2">
              <ShieldCheck className="w-3.5 h-3.5 text-primary-400" />
              LocalFix Guaranteed Resolution Protection
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">Dispute Resolution & Escrow Mediation</h1>
            <p className="text-gray-400 text-xs sm:text-sm mt-1">
              Solar Inverter Tripping under Load • 5kVA Felicity Off-Grid System • Technician Tunde Adewale (COREN Certified)
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => toast('Original invoice retrieved')}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-gray-200 border border-white/10 flex items-center gap-1.5 transition-colors"
            >
              <FileText className="w-3.5 h-3.5 text-primary-400" />
              View Original Invoice
            </button>
            <button
              onClick={() => toast.success('Exporting legal dossier PDF...')}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-primary-700/30 hover:bg-primary-700/50 text-primary-200 border border-primary-500/30 flex items-center gap-1.5 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5 text-primary-300" />
              Export Dossier
            </button>
          </div>
        </div>

        {/* 2-Column Grid */}
        <div className="grid lg:grid-cols-12 gap-6">
          {/* Left Column (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            {/* Escrow Protection Hold Active banner */}
            <div
              className="rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              style={{
                background: 'linear-gradient(135deg, rgba(109,40,217,0.35), rgba(76,29,149,0.2))',
                border: '1px solid rgba(167,139,250,0.3)',
              }}
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary-700 text-white flex items-center justify-center flex-shrink-0 shadow-glow">
                  <Lock className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-bold text-white">Escrow Protection Hold Active</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-white/10 text-gray-300 font-mono">
                      Vault Ref #LF-ESC-9921
                    </span>
                  </div>
                  <p className="text-gray-300 text-xs max-w-lg leading-relaxed">
                    The final 60% completion payout of <strong className="text-white">₦32,090.00</strong> is legally locked inside the LocalFix Trust Vault. Neither party can disburse without mutual authorization or an Inspector Ruling. Your funds remain 100% protected.
                  </p>
                </div>
              </div>

              <div className="text-right sm:text-right flex-shrink-0">
                <div className="text-[10px] text-gray-400 uppercase tracking-wider">PROTECTED IN TRUST</div>
                <div className="text-2xl sm:text-3xl font-black text-white">₦32,090.00</div>
                <div className="text-[10px] text-emerald-400 font-semibold mt-0.5">0 Zero Risk Guarantee</div>
              </div>
            </div>

            {/* Customer Stated Dispute Reason */}
            <div className="glass-panel rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  Customer Stated Dispute Reason
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  • Substandard Parts / Repeat Inverter Tripping under Load
                </span>
              </div>

              <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-xs space-y-2">
                <div className="flex items-center justify-between text-gray-400 text-[11px]">
                  <span>Complainant Statement • Babatunde O. (Homeowner, Ikeja GRA)</span>
                  <span>Logged 16m after artisan departure</span>
                </div>
                <p className="text-gray-200 leading-relaxed italic">
                  "Technician installed a replacement relay, but 10 minutes after he left, the 5kVA inverter shut down with Error Code F04 again as soon as our 1.5HP borehole water pump kicked in. Burn smell detected near the main distribution breaker box. Requesting on-site warranty fix or an immediate second certified technician inspection."
                </p>
              </div>

              {/* Work Completion Audit: Disputed Checkpoints */}
              <div>
                <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-primary-400" />
                  Work Completion Audit: Disputed Checkpoints
                </h4>

                <div className="grid sm:grid-cols-2 gap-3 text-xs">
                  {/* Checkpoint 1 */}
                  <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 space-y-1.5">
                    <div className="flex items-start gap-2">
                      <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold text-white text-xs">45-minute continuous 2.8kW load stress test</div>
                        <div className="text-[11px] text-gray-400 mt-0.5">
                          <strong className="text-red-300">Disputed:</strong> Inverter tripped immediately under 1.6kW water pump surge.
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-[10px] pt-1 border-t border-red-500/15">
                      <span className="text-gray-400">Artisan Claim: Passed at 11:34 AM</span>
                      <span className="text-red-400 font-bold">Failed at 11:48 AM</span>
                    </div>
                  </div>

                  {/* Checkpoint 2 */}
                  <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-1.5">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold text-white text-xs">OEM 100A Pure Copper Relay Installed</div>
                        <div className="text-[11px] text-gray-400 mt-0.5">
                          <strong className="text-amber-300">Questioned:</strong> Suspect contact points are counterfeit or under-rated alloy.
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-[10px] pt-1 border-t border-amber-500/15">
                      <span className="text-gray-400">Invoiced: Schneider Heavy Duty</span>
                      <span className="text-amber-400 font-bold">Receipt Pending Check</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Comparative Photographic & Diagnostic Evidence */}
            <div className="glass-panel rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Camera className="w-4 h-4 text-primary-400" />
                    Comparative Photographic & Diagnostic Evidence
                  </h3>
                  <p className="text-xs text-gray-400">Verified tamper-proof metadata with GPS & timestamp recorded on LocalFix Ledger</p>
                </div>

                <button
                  onClick={() => toast.success('Upload dialog opened')}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary-700/30 hover:bg-primary-700/50 text-primary-300 border border-primary-500/30 flex items-center gap-1.5 transition-colors"
                >
                  <Upload className="w-3 h-3" />
                  Attach Diagnostic Log
                </button>
              </div>

              <div className="grid sm:grid-cols-3 gap-3">
                {/* Evidence 1 */}
                <div className="rounded-xl overflow-hidden glass-panel border border-white/10 group cursor-pointer">
                  <div className="relative aspect-video">
                    <img
                      src="https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=350&h=240&fit=crop"
                      alt="Artisan Log"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded text-[9px] font-bold bg-primary-700 text-white">
                      ARTISAN LOG
                    </div>
                    <div className="absolute top-2 right-2 text-[9px] text-gray-300 bg-black/50 px-1.5 py-0.5 rounded">
                      11:34 AM
                    </div>
                  </div>
                  <div className="p-2.5">
                    <div className="flex items-center gap-1 text-emerald-400 text-xs font-bold mb-0.5">
                      <CheckCircle className="w-3 h-3" /> Claimed Resolved Status
                    </div>
                    <div className="text-[10px] text-gray-400">Steady 230V @ No-Load Idle Bench Test</div>
                  </div>
                </div>

                {/* Evidence 2 */}
                <div className="rounded-xl overflow-hidden glass-panel border border-white/10 group cursor-pointer">
                  <div className="relative aspect-video">
                    <img
                      src="https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=350&h=240&fit=crop"
                      alt="Customer Proof"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded text-[9px] font-bold bg-red-600 text-white">
                      CUSTOMER PROOF
                    </div>
                    <div className="absolute top-2 right-2 text-[9px] text-gray-300 bg-black/50 px-1.5 py-0.5 rounded">
                      11:52 AM
                    </div>
                  </div>
                  <div className="p-2.5">
                    <div className="flex items-center gap-1 text-red-400 text-xs font-bold mb-0.5">
                      <XCircle className="w-3 h-3" /> Flashing Alarm Code F04
                    </div>
                    <div className="text-[10px] text-gray-400">Tripped instantly when 1.5HP pump started</div>
                  </div>
                </div>

                {/* Evidence 3 */}
                <div className="rounded-xl overflow-hidden glass-panel border border-white/10 group cursor-pointer">
                  <div className="relative aspect-video">
                    <img
                      src="https://images.unsplash.com/photo-1581092162384-8987c1d64718?w=350&h=240&fit=crop"
                      alt="Audio / Video Log"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded text-[9px] font-bold bg-purple-700 text-white">
                      AUDIO / VIDEO
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-9 h-9 rounded-full bg-primary-600/80 text-white flex items-center justify-center shadow-glow group-hover:scale-110 transition-transform">
                        <Play className="w-4 h-4 ml-0.5" />
                      </div>
                    </div>
                  </div>
                  <div className="p-2.5">
                    <div className="flex items-center gap-1 text-primary-300 text-xs font-bold mb-0.5">
                      <Play className="w-3 h-3" /> Smoke Alarm & Beep Log
                    </div>
                    <div className="text-[10px] text-gray-400">Recorded audible beep sequence and heat trace</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Artisan Cure & Rectification Window */}
            <div className="glass-panel rounded-2xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-white">Artisan Cure & Rectification Window</h3>
                  <p className="text-xs text-gray-400">Artisan has a legally binding 24-hour right-to-cure before escrow forfeit or replacement dispatch</p>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold">
                  <Clock className="w-3.5 h-3.5" />
                  <span>18h 42m remaining to respond</span>
                </div>
              </div>

              {/* Artisan Profile Box */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <img
                    src={worker.avatar}
                    alt={worker.displayName}
                    className="w-12 h-12 rounded-xl object-cover border border-primary-500/40"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-white text-sm">{worker.displayName}</h4>
                      <span className="text-[10px] text-gray-400">COREN Reg #38481</span>
                    </div>
                    <p className="text-xs text-primary-300">Master Solar Tech • 4.9★ (312 jobs completed) • Ikeja Hub</p>
                    <div className="text-[11px] text-emerald-400 flex items-center gap-1 mt-0.5">
                      <span>📱 SMS & In-App Notice delivered to artisan device at 11:59 AM</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <a
                    href="tel:+2348030000000"
                    className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-gray-200 border border-white/10 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5 text-primary-400" />
                    Call Artisan
                  </a>
                  <Link
                    to="/messages"
                    className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl text-xs font-semibold bg-primary-700/30 hover:bg-primary-700/50 text-primary-200 border border-primary-500/30 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-primary-300" />
                    Direct Chat
                  </Link>
                </div>
              </div>

              {/* Pending Artisan Response Options */}
              <div>
                <div className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold mb-2">
                  PENDING ARTISAN RESPONSE OPTIONS:
                </div>
                <div className="grid sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <strong className="text-white block mb-1">Option A: Free Re-visit</strong>
                    <p className="text-gray-400 text-[11px] leading-relaxed">
                      Technician accepts on-site return within 2 hours to replace relay with heavy duty 150A module at no extra fee.
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <strong className="text-white block mb-1">Option B: Senior Escalation</strong>
                    <p className="text-gray-400 text-[11px] leading-relaxed">
                      Artisan requests second opinion from LocalFix Lead Technical Fellow (Neutral diagnostic test).
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <strong className="text-white block mb-1">Option C: Bench Counter-Log</strong>
                    <p className="text-gray-400 text-[11px] leading-relaxed">
                      Submit bench test readings if external factor caused trip (e.g. submersible pump short circuit).
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column (4 cols) — Trust Vault & Mediation Controls */}
          <div className="lg:col-span-4 space-y-5">
            {/* Escrow Trust Vault Card */}
            <div className="glass-panel rounded-2xl p-6">
              <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-primary-400" />
                  <h3 className="font-bold text-white text-sm">Escrow Trust Vault</h3>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-primary-700/30 text-primary-300 border border-primary-500/30 font-mono">
                  NUBAN Vault
                </span>
              </div>

              <div className="space-y-2.5 text-xs text-gray-300 pb-4 border-b border-white/10">
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Agreed Contract</span>
                  <span className="text-white font-medium">₦53,483.00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Part 1: Mobilization Paid</span>
                  <span className="text-white font-medium">₦21,393.00</span>
                </div>
                <div className="flex justify-between text-amber-300 font-bold pt-1">
                  <span>Locked in Dispute (60%)</span>
                  <span>₦32,090.00</span>
                </div>
                <div className="flex justify-between text-emerald-400 font-bold">
                  <span>Customer Mediation Fee</span>
                  <span>₦0.00 (FREE COVERAGE)</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-primary-700/10 border border-primary-500/20 text-[11px] text-gray-300 leading-relaxed mt-4">
                <strong className="text-white block mb-0.5">Consumer Protection Rule:</strong>
                In the event of incomplete or substandard delivery, unreleased funds will be refunded to your LocalFix wallet or original bank account within 24 hours of inspection.
              </div>
            </div>

            {/* Mediation Action Controls */}
            <div className="glass-panel rounded-2xl p-6 space-y-3">
              <h3 className="text-sm font-bold text-white">Mediation Action Controls</h3>
              <p className="text-xs text-gray-400">Select your preferred immediate resolution protocol below:</p>

              <button
                type="button"
                onClick={() => handleAction('Request Free Emergency Re-visit')}
                className="w-full py-3.5 px-4 rounded-xl text-xs font-bold text-white flex items-center justify-between transition-all shadow-glow"
                style={{
                  background: 'linear-gradient(135deg, #6D28D9, #7C3AED)',
                }}
              >
                <div className="flex items-center gap-2.5 text-left">
                  <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center">
                    ✓
                  </div>
                  <div>
                    <div>Request Free Emergency Re-visit</div>
                    <div className="text-[10px] text-primary-200 font-normal">Dispatches Tunde within 2 hours under 14-Day Free Workmanship Warranty</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 flex-shrink-0" />
              </button>

              <Link
                to="/mediation/audit"
                className="w-full py-3 px-4 rounded-xl text-xs font-semibold text-primary-300 bg-white/5 hover:bg-white/10 border border-primary-500/30 flex items-center justify-between transition-colors text-left"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-primary-700/30 flex items-center justify-center text-primary-300">
                    🔍
                  </div>
                  <div>
                    <div>Assign Independent Senior Inspector</div>
                    <div className="text-[10px] text-gray-400 font-normal">Neutral LocalFix Master Inspector arrives with thermal camera and bench analyzer</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 flex-shrink-0" />
              </Link>

              <Link
                to="/mediation/room"
                className="w-full py-3 px-4 rounded-xl text-xs font-semibold text-primary-300 bg-white/5 hover:bg-white/10 border border-primary-500/30 flex items-center justify-between transition-colors text-left"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-primary-700/30 flex items-center justify-center text-primary-300">
                    💬
                  </div>
                  <div>
                    <div>3-Way Mediation Room</div>
                    <div className="text-[10px] text-gray-400 font-normal">Enter live group session with customer, artisan, and platform referee</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 flex-shrink-0" />
              </Link>

              <div className="text-[10px] text-gray-500 text-center pt-1">
                Escalate to Neutral Consumer Arbitration Board &rarr;
              </div>
            </div>

            {/* Mediation Protocol Steps */}
            <div className="glass-panel rounded-2xl p-6 space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary-400" />
                Mediation Protocol Steps
              </h3>

              <div className="space-y-3 text-xs">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <strong className="text-white block">1. Customer Flags Work</strong>
                    <span className="text-gray-400 text-[11px]">Completed • Today 11:58 AM</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-amber-500 text-dark-bg flex items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <strong className="text-amber-300 block">2. Artisan 24-Hour Cure Window</strong>
                    <span className="text-gray-400 text-[11px]">In Progress • Free rectification visit option</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-white/10 text-gray-400 flex items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <strong className="text-gray-300 block">3. Master Inspector Dispatch</strong>
                    <span className="text-gray-500 text-[11px]">Automatic if artisan fails to rectify in 24h</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-white/10 text-gray-400 flex items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5">
                    4
                  </div>
                  <div>
                    <strong className="text-gray-300 block">4. Final Escrow Settlement</strong>
                    <span className="text-gray-500 text-[11px]">Binding ruling: 100% refund or certified completion</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Assigned Mediator Card */}
            <div className="glass-panel rounded-2xl p-6 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-700 to-primary-400 flex items-center justify-center text-white font-bold text-sm shadow-glow-sm">
                  AB
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h4 className="font-bold text-white text-xs">Amina Bello</h4>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  </div>
                  <p className="text-[10px] text-gray-400">Senior Trade Dispute Specialist • Ikeja Hub #04</p>
                  <span className="text-[10px] text-emerald-400 font-semibold">Active Online • Assigned to #LX-7829</span>
                </div>
              </div>

              <p className="text-[11px] text-gray-300 italic p-3 rounded-xl bg-white/5 border border-white/10 leading-relaxed">
                "Hello Babatunde, I am reviewing your inverter fault logs right now. Your funds are secured and will not be released until this issue is thoroughly resolved."
              </p>

              <button
                type="button"
                onClick={() => navigate('/mediation/room')}
                className="w-full py-3 rounded-xl text-xs font-bold text-white bg-primary-700 hover:bg-primary-600 transition-colors flex items-center justify-center gap-2"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Open Live Mediator Chat (Priority)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Legal Notice */}
        <div className="mt-8 p-4 rounded-2xl glass-panel text-xs text-gray-400 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-center sm:text-left">
            <ShieldCheck className="w-4 h-4 text-primary-400 flex-shrink-0" />
            <span>
              Mediation decisions comply with Nigeria Federal Competition and Consumer Protection Commission (FCCPC) Standards and LocalFix Artisan Guild Charters.
            </span>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-gray-500 flex-shrink-0">
            <span>NDPR Data Encrypted</span>
            <span>•</span>
            <span>Licensed Trade Escrow</span>
          </div>
        </div>
      </div>
    </div>
  )
}
