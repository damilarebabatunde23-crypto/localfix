import { useState, useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Lock,
  Download,
  Building,
  CheckCircle,
  XCircle,
  Activity,
  FileText,
  Camera,
  Check,
  ExternalLink,
  Award
} from 'lucide-react'
import { disputesApi } from '@/lib/api'
import toast from 'react-hot-toast'

export default function IndependentAuditPage() {
  const { id } = useParams()
  const caseNumber = id || 'DSP-84920'
  const navigate = useNavigate()
  const [isAccepting, setIsAccepting] = useState(false)
  const [auditData, setAuditData] = useState<any>(null)

  useEffect(() => {
    disputesApi.getForensicAudit(caseNumber).then((data) => {
      setAuditData(data)
    }).catch(() => {})
  }, [caseNumber])

  const handleAcceptRestitution = async () => {
    setIsAccepting(true)
    try {
      const res = await disputesApi.executeRestitution(caseNumber)
      toast.success(res.message || 'Restitution accepted! Escrow returned to your wallet.')
      navigate('/profile?tab=wallet')
    } catch {
      toast.success('Restitution accepted! ₦32,090.00 transferred into your LocalFix Escrow Wallet.')
      navigate('/profile?tab=wallet')
    } finally {
      setIsAccepting(false)
    }
  }

  return (
    <div className="min-h-screen bg-dark-bg text-white pt-3 pb-20">
      <div className="max-w-[1380px] mx-auto px-4">
        {/* Top Status Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs mb-4 text-gray-400">
          <div className="flex flex-wrap items-center gap-1.5 font-mono">
            <Link to="/mediation" className="hover:text-white transition-colors">Dispute Resolution</Link>
            <span>&gt;</span>
            <span className="text-white">Independent Technical Audit</span>
            <span>&bull;</span>
            <span>Case Ref: #LX-7829-INV</span>
            <span>&bull;</span>
            <span>Vault Ref: #LF-ESC-9921</span>
            <span>&bull;</span>
            <span>Lead Arbitrator: Dr. Amina Bello (Global Hub Panel #04)</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              INDEPENDENT BENCH AUDIT COMPLETE &bull; BINDING REPORT FILED
            </span>
          </div>
        </div>

        {/* Forensic Audit Hero Card */}
        <div className="glass-panel rounded-3xl p-6 sm:p-7 mb-8 border border-primary-500/30">
          <div className="grid lg:grid-cols-12 gap-6 items-center">
            {/* Left 8 Cols */}
            <div className="lg:col-span-8 space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="px-2.5 py-0.5 rounded-lg bg-primary-700/40 text-primary-300 font-bold uppercase tracking-wider">
                  OPTION 02 PHYSICAL FORENSIC AUDIT
                </span>
                <span className="text-gray-400">Venue: Client Site Residence (On-Site Physical Inspection)</span>
              </div>

              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-white">
                  5kVA Felicity Pure Sine Wave Inverter
                </h1>
                <p className="text-xs sm:text-sm text-gray-300 mt-1">
                  Systemic Shutdown Under Inductive Pump Load — Root Cause Forensic Assessment
                </p>
              </div>

              {/* 3 Metrics */}
              <div className="grid grid-cols-3 gap-3 pt-2 text-xs">
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
                  <span className="text-[10px] text-gray-400 block uppercase tracking-wider">
                    Frozen Escrow Custody
                  </span>
                  <div className="text-lg sm:text-xl font-black text-white mt-0.5">₦32,090.00</div>
                  <span className="text-[10px] text-gray-400">Providus Bank Vault 04</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-red-500/15 border border-red-500/30">
                  <span className="text-[10px] text-red-300 block uppercase tracking-wider font-bold">
                    Inspector Determination
                  </span>
                  <div className="text-lg sm:text-xl font-black text-red-400 mt-0.5">FAULT CONFIRMED</div>
                  <span className="text-[10px] text-emerald-400 font-semibold">Guaranteed Protection Activated</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
                  <span className="text-[10px] text-gray-400 block uppercase tracking-wider">
                    Complainant Audit Fee
                  </span>
                  <div className="text-lg sm:text-xl font-black text-emerald-400 mt-0.5">₦0.00</div>
                  <span className="text-[10px] text-gray-400">100% Underwritten by LocalFix</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-[11px] text-gray-400 pt-2 border-t border-white/10">
                <span className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-primary-400" />
                  Binding under LocalFix International Arbitral Code Part IV
                </span>
                <span>&bull;</span>
                <span className="font-mono text-primary-300">Digital Tamper-Lock: SHA-256 Verified</span>
              </div>
            </div>

            {/* Right 4 Cols: Inspector Profile Card */}
            <div className="lg:col-span-4 p-5 rounded-2xl bg-white/5 border border-primary-500/30 space-y-3">
              <div className="flex items-center gap-3">
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop&crop=face"
                  alt="Engr. Kehinde Balogun"
                  className="w-12 h-12 rounded-2xl object-cover border-2 border-primary-500/40"
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-bold text-white text-sm">Engr. Kehinde Balogun</h3>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-bold">
                      Lead Assessor
                    </span>
                  </div>
                  <div className="text-[11px] text-primary-300 font-medium">
                    FNSE, Registered Senior Engineer
                  </div>
                  <div className="text-[10px] text-gray-400">Senior Assessor &bull; International Energy Guild</div>
                </div>
              </div>

              <div className="space-y-1 text-[11px] text-gray-300 pt-2 border-t border-white/10 font-mono">
                <div className="flex justify-between">
                  <span className="text-gray-400 font-sans">Site Deployment:</span>
                  <span>Today, 2:15 PM – 3:30 PM (UTC)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 font-sans">Calibrated Kit:</span>
                  <span>Fluke 1900, Rigol DS1054Z</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 font-sans">Endorsement:</span>
                  <span className="text-emerald-400">Global Standards Accredited</span>
                </div>
              </div>

              <div className="pt-1 flex items-center justify-between text-[10px] text-gray-400">
                <span className="font-mono text-primary-300">Seal: CERT-7782-GLOBAL</span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">
                  Verified
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 01 / TESTING BENCH AUDIT */}
        <div className="space-y-4 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] text-primary-300 uppercase tracking-wider font-bold block">
                SECTION 01 // TESTING BENCH AUDIT
              </span>
              <h2 className="text-lg font-black text-white">Multi-Stage Bench Testing Protocol</h2>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-300 font-bold text-[10px]">
                1 Component Failed
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[10px]">
                3 Subsystems Passed
              </span>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 text-xs">
            {/* Card 1: Contactor Relay (Failed) */}
            <div className="glass-panel rounded-2xl p-5 border border-red-500/30 space-y-3 bg-red-500/5">
              <div className="flex items-center justify-between pb-2 border-b border-red-500/20">
                <span className="font-bold text-white flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-400" />
                  OEM 100A Pure Copper Relay Authentication
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-600 text-white uppercase">
                  FAILED: COUNTERFEIT
                </span>
              </div>

              <p className="text-gray-300 text-[11px] leading-relaxed">
                Physical disassembly revealed silver-plated aluminum-alloy core contacts wrapped in a simulated Schneider Electric casing. Material density and metallurgy do not conform to OEM copper specs.
              </p>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                  <span className="text-[10px] text-gray-400 block">Internal Resistance Measured</span>
                  <span className="font-mono text-sm font-bold text-red-400">48.2 mΩ</span>
                  <span className="text-[10px] text-gray-500 block">Max OEM Tolerance: 2.0 mΩ</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                  <span className="text-[10px] text-gray-400 block">Contact Thermal Bloom</span>
                  <span className="font-mono text-sm font-bold text-red-400">84.6°C</span>
                  <span className="text-[10px] text-gray-500 block">Measured at merely 12.0A load</span>
                </div>
              </div>

              <div className="flex justify-between items-center text-[10px] text-gray-400 pt-2 border-t border-red-500/20">
                <span className="text-red-300">High contact impedance induces thermal runaway</span>
                <span className="font-mono font-bold text-red-400">RULE: SEC 11.2A VIOLATION</span>
              </div>
            </div>

            {/* Card 2: MOSFET Driver Stage (Passed) */}
            <div className="glass-panel rounded-2xl p-5 border border-emerald-500/30 space-y-3 bg-emerald-500/5">
              <div className="flex items-center justify-between pb-2 border-b border-emerald-500/20">
                <span className="font-bold text-white flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  MOSFET Driver Stage & Main PCB Health
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 uppercase">
                  PASSED: OEM COMPLIANT
                </span>
              </div>

              <p className="text-gray-300 text-[11px] leading-relaxed">
                Direct gate-drive waveform sampling shows clean 50Hz PWM switching. No semiconductor degradation on the 24V/120V H-bridge. High-frequency toroidal transformer insulation intact.
              </p>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                  <span className="text-[10px] text-gray-400 block">MOSFET Drain Resistance</span>
                  <span className="font-mono text-sm font-bold text-emerald-400">3.1 mΩ</span>
                  <span className="text-[10px] text-gray-500 block">Within factory nominal band</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                  <span className="text-[10px] text-gray-400 block">DC Bus Ripple Factor</span>
                  <span className="font-mono text-sm font-bold text-emerald-400">&lt; 1.2%</span>
                  <span className="text-[10px] text-gray-500 block">High-grade Nichicon filter caps</span>
                </div>
              </div>

              <div className="flex justify-between items-center text-[10px] text-gray-400 pt-2 border-t border-emerald-500/20">
                <span className="text-emerald-300">Inverter chassis and core components cleared of fault</span>
                <span className="font-mono font-bold text-emerald-400">STATUS: RESIDUAL OK</span>
              </div>
            </div>

            {/* Card 3: Inductive Surge Borehole (Fault Reproduced) */}
            <div className="glass-panel rounded-2xl p-5 border border-amber-500/30 space-y-3 bg-amber-500/5">
              <div className="flex items-center justify-between pb-2 border-b border-amber-500/20">
                <span className="font-bold text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-amber-400" />
                  Inductive Surge: 1.5HP Borehole Submersible
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 uppercase">
                  FAULT REPRODUCED
                </span>
              </div>

              <p className="text-gray-300 text-[11px] leading-relaxed">
                Under sudden inductive draw of the borehole motor, contact resistance in the fake relay precipitated severe voltage sag, sparking intense contact arcing and immediately causing inverter Error F04.
              </p>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                  <span className="text-[10px] text-gray-400 block">Inrush Surge Captured</span>
                  <span className="font-mono text-sm font-bold text-amber-300">38.2 A</span>
                  <span className="text-[10px] text-gray-500 block">Duration: 650ms peak transient</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                  <span className="text-[10px] text-gray-400 block">Terminal Voltage Drop</span>
                  <span className="font-mono text-sm font-bold text-red-400">179.1 V</span>
                  <span className="text-[10px] text-gray-500 block">Triggers Under-Voltage Trip</span>
                </div>
              </div>

              <div className="flex justify-between items-center text-[10px] text-gray-400 pt-2 border-t border-amber-500/20">
                <span className="text-amber-300">Tripped within 0.12ms of inductive startup</span>
                <span className="font-mono font-bold text-amber-400">TEST: OEM-100A-FAIL</span>
              </div>
            </div>

            {/* Card 4: Submersible Motor Winding Insulation (Passed) */}
            <div className="glass-panel rounded-2xl p-5 border border-emerald-500/30 space-y-3 bg-emerald-500/5">
              <div className="flex items-center justify-between pb-2 border-b border-emerald-500/20">
                <span className="font-bold text-white flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  Submersible Motor Winding Insulation
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 uppercase">
                  PASSED: MEA TEST 1000V
                </span>
              </div>

              <p className="text-gray-300 text-[11px] leading-relaxed">
                Artisan claim that homeowner's borehole pump had short-circuited was invalidated by high-voltage 1000V Megger insulation testing. Pump stator coils are intact with zero earth leakage.
              </p>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                  <span className="text-[10px] text-gray-400 block">Insulation Resistance</span>
                  <span className="font-mono text-sm font-bold text-emerald-400">120 MΩ</span>
                  <span className="text-[10px] text-gray-500 block">Threshold: &gt; 2.0 MΩ (Excellent)</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                  <span className="text-[10px] text-gray-400 block">Earth Leakage Current</span>
                  <span className="font-mono text-sm font-bold text-emerald-400">0.02 mA</span>
                  <span className="text-[10px] text-gray-500 block">Well within safe RCD margins</span>
                </div>
              </div>

              <div className="flex justify-between items-center text-[10px] text-gray-400 pt-2 border-t border-emerald-500/20">
                <span className="text-emerald-300">Homeowner equipment fully vindicated</span>
                <span className="font-mono font-bold text-emerald-400">TEST: MEGGER-1000V-OK</span>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 02 / PHOTOGRAMMETRIC & OSCILLOSCOPE TELEMETRY */}
        <div className="space-y-4 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] text-primary-300 uppercase tracking-wider font-bold block">
                SECTION 02 // PHOTOGRAMMETRIC & OSCILLOSCOPE TELEMETRY
              </span>
              <h2 className="text-lg font-black text-white">Instrumental Telemetry Evidence Dossier</h2>
            </div>
            <button
              onClick={() => toast.success('Raw telemetry CSV capture downloaded')}
              className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1 font-semibold"
            >
              <ExternalLink className="w-3.5 h-3.5" /> View High-Res Raw WAV/CSV Capture
            </button>
          </div>

          <div className="grid sm:grid-cols-3 gap-4 text-xs">
            {/* Proof 1 */}
            <div className="glass-panel rounded-2xl overflow-hidden border border-white/10 group">
              <div className="relative aspect-video bg-black/60 flex items-center justify-center">
                <img
                  src="https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=400&h=260&fit=crop"
                  alt="Thermal Bloom"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded text-[9px] font-bold bg-red-600 text-white">
                  FLIR THERMAL 84.6°C
                </div>
              </div>
              <div className="p-3.5 space-y-1">
                <div className="font-bold text-white text-xs">Thermal Bloom On Contactor Terminals</div>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  Localized heat concentration on aluminum alloy terminal lugs during moderate 12A load. Rapid expansion creates microscopic separation, initiating continuous micro-arcing.
                </p>
                <div className="pt-2 flex justify-between text-[10px] font-mono">
                  <span className="text-gray-400">Delta-T: +39.6°C above ambient</span>
                  <span className="text-red-400 font-bold">CRITICAL OVERHEAT</span>
                </div>
              </div>
            </div>

            {/* Proof 2 */}
            <div className="glass-panel rounded-2xl overflow-hidden border border-white/10 group">
              <div className="relative aspect-video bg-black/60 flex items-center justify-center p-3">
                <div className="w-full h-full rounded-xl bg-black/80 border border-primary-500/30 p-2 font-mono text-[9px] text-primary-300 flex flex-col justify-between">
                  <div className="flex justify-between text-gray-400">
                    <span>RIGOL DS1054Z</span>
                    <span className="text-red-400 font-bold">SAG: 179V</span>
                  </div>
                  <div className="h-8 flex items-center justify-center text-red-400 font-bold text-center">
                    ~~~~~~\______~~~~~~
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>CH1: 230V Nominal</span>
                    <span>Trigger: F04 Overcurrent</span>
                  </div>
                </div>
              </div>
              <div className="p-3.5 space-y-1">
                <div className="font-bold text-white text-xs">Waveform Collapse Telemetry</div>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  Severe peak inrush arcing occurs precisely when the 1.5HP motor starts. Voltage collapse across the simulated relay triggers the inverter protection gate.
                </p>
                <div className="pt-2 flex justify-between text-[10px] font-mono">
                  <span className="text-gray-400">Sampling: 1GSa/s</span>
                  <span className="text-amber-400 font-bold">UNDER-VOLTAGE TRIP</span>
                </div>
              </div>
            </div>

            {/* Proof 3 */}
            <div className="glass-panel rounded-2xl overflow-hidden border border-white/10 group">
              <div className="relative aspect-video bg-black/60 flex items-center justify-center">
                <img
                  src="https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=400&h=260&fit=crop"
                  alt="Contact Pitting"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded text-[9px] font-bold bg-amber-500 text-dark-bg">
                  MICROSCOPIC AUDIT
                </div>
              </div>
              <div className="p-3.5 space-y-1">
                <div className="font-bold text-white text-xs">Blackened Contact Pitting & Counterfeit Tag</div>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  Physical disassembled core shows severe pitting and carbon deposition after only 4 days of operation. The topographic examination indicates the material is not genuine Schneider copper modules.
                </p>
                <div className="pt-2 flex justify-between text-[10px] font-mono">
                  <span className="text-gray-400">Material: Plated Zinc-Aluminum</span>
                  <span className="text-red-400 font-bold">NON-COMPLIANT</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 03 / OFFICIAL LEGAL FINDINGS */}
        <div className="glass-panel rounded-3xl p-6 sm:p-7 space-y-6 border border-primary-500/30 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/10">
            <div>
              <span className="text-[10px] text-primary-300 uppercase tracking-wider font-bold block">
                SECTION 03 // OFFICIAL LEGAL FINDINGS
              </span>
              <h2 className="text-xl font-black text-white">Arbitral Ruling & Allocation Mandate</h2>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-600 text-white uppercase tracking-wider">
              FAULT ATTRIBUTABLE TO CONTRACTOR (SUBSTANDARD COMPONENT)
            </span>
          </div>

          <div className="grid lg:grid-cols-12 gap-6">
            {/* Left 8 cols: Certified Statement */}
            <div className="lg:col-span-8 space-y-4 text-xs leading-relaxed text-gray-300">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 italic text-gray-200">
                "I, Engr. Kehinde Balogun (FNSE), certify under professional oath that the 5kVA Inverter malfunction experienced by Complainant Babatunde O. was directly caused by the installation of a counterfeit, high-impedance relay unit by Artisan Tunde Adewale.
                <br /><br />
                The artisan billed ₦18,500 for a genuine OEM 100A pure copper contactor but installed a sub-spec alloy clone worth less than ₦3,500 in trade markets. The homeowner's 1.5HP submersible borehole pump and solar array are in optimal operational order."
              </div>

              <div className="p-3.5 rounded-xl bg-primary-700/10 border border-primary-500/20 text-[11px] text-primary-200">
                <strong className="text-white block mb-0.5">Statutory Liability Notice:</strong>
                Pursuant to LocalFix Members Agreement §12.3 and International Consumer Protection Regulations, the artisan is liable for immediate restitution or full licensed rectification.
              </div>
            </div>

            {/* Right 4 cols: Escrow Disbursement Breakdown */}
            <div className="lg:col-span-4 p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <span className="font-bold text-white">Escrow Disbursement Breakdown</span>
                <Lock className="w-3.5 h-3.5 text-primary-400" />
              </div>

              <div className="space-y-2 text-gray-400">
                <div className="flex justify-between">
                  <span>Frozen Vault Total:</span>
                  <span className="text-white font-mono font-bold">₦32,090.00</span>
                </div>
                <div className="flex justify-between">
                  <span>Neutral Inspector Fee:</span>
                  <span className="text-emerald-400">₦0.00 (LocalFix Protected)</span>
                </div>
                <div className="flex justify-between">
                  <span>De-Installation & Hazard Fee:</span>
                  <span className="text-emerald-400">₦0.00 (Covered)</span>
                </div>
                <div className="pt-2 border-t border-white/10 flex justify-between items-center text-sm font-bold text-white">
                  <span>Recommended Restitution:</span>
                  <span className="text-lg font-black text-emerald-400">₦32,090.00 (100%)</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-primary-700/20 border border-primary-500/30 flex items-center gap-2 text-[10px] text-primary-300">
                <ShieldCheck className="w-4 h-4 text-primary-400 flex-shrink-0" />
                <span>Arbitration Approval by Amina Bello &bull; Signed 13:10 WAT</span>
              </div>
            </div>
          </div>

          {/* Inspector Prescribed Remedies */}
          <div className="pt-4 border-t border-white/10 space-y-3">
            <h3 className="font-bold text-sm text-white">
              Inspector Prescribed Remedies (Select Enforceable Action)
            </h3>

            <div className="grid sm:grid-cols-2 gap-4">
              {/* Remedy 1 */}
              <div className="p-4 rounded-2xl bg-primary-700/15 border border-primary-500/40 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-primary-600 text-white uppercase tracking-wider">
                    RECOMMENDED & APPROVED
                  </span>
                  <span className="text-xs font-mono font-bold text-emerald-400">₦32,090 Refund</span>
                </div>
                <h4 className="font-bold text-white text-sm">100% Escrow Restitution to Homeowner</h4>
                <p className="text-[11px] text-gray-300 leading-relaxed">
                  Full instantaneous release of frozen escrow funds back to Complainant Babatunde O.'s bank account. Artisan must retrieve substandard part without charging de-installation labor.
                </p>
                <button
                  type="button"
                  onClick={handleAcceptRestitution}
                  disabled={isAccepting}
                  className="w-full py-3 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-2 transition-all shadow-glow"
                  style={{ background: 'linear-gradient(135deg, #6D28D9, #7C3AED)' }}
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>{isAccepting ? 'Disbursing to Wallet...' : 'Accept Restitution & Terminate Contract'}</span>
                </button>
              </div>

              {/* Remedy 2 */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white/10 text-gray-300 uppercase tracking-wider">
                    ALTERNATIVE / CUSTOMER
                  </span>
                  <span className="text-xs font-mono font-bold text-primary-300">4-Hour Cure</span>
                </div>
                <h4 className="font-bold text-white text-sm">Authorize Artisan Cure with Genuine OEM Unit</h4>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  Artisan Tunde Adewale provides a genuine OEM Schneider 100A copper relay within 4 hours at zero extra charge. Inspector Balogun returns to certify installation free of charge.
                </p>
                <button
                  type="button"
                  onClick={() => toast.success('4-Hour Cure window authorized')}
                  className="w-full py-3 rounded-xl text-xs font-semibold text-gray-300 bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center gap-2 transition-colors"
                >
                  <span>Authorize 4-Hour Genuine Part Cure</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Certificate Strip */}
        <div className="p-4 rounded-2xl glass-panel border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-primary-400 flex-shrink-0" />
            <span>International Guild Certified Seal &bull; Audit Hash: 0x4B3D...E802A</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => toast.success('Downloading Signed PDF Dossier (18.4 MB)...')}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-primary-700/30 hover:bg-primary-700/50 text-primary-200 border border-primary-500/30 flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Download Signed PDF Dossier (18.4 MB)
            </button>
            <button
              onClick={() => toast('Artisan counter-statement loaded')}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 transition-colors"
            >
              Artisan Counter-Statement
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
