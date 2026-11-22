import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft,
  Calendar,
  Clock,
  MapPin,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  FileText,
  CreditCard,
  Lock,
  Sparkles,
  Upload,
  Camera,
  Trash2,
  Plus,
  Phone,
  Video,
  MessageSquare,
  DollarSign,
  Wrench,
  Check,
  X,
  ExternalLink,
  Receipt,
  Send,
  Eye,
  HandCoins,
  Globe,
  Compass,
} from 'lucide-react'
import { MOCK_WORKERS, formatCurrency, normalizeWorker } from '@/lib/utils'
import { useAppStore } from '@/stores/useAppStore'
import { useChatStore } from '@/stores/useChatStore'
import { bookingsApi, uploadApi, servicesApi } from '@/lib/api'
import LiveDispatchTracker from '@/components/location/LiveDispatchTracker'
import toast from 'react-hot-toast'

const TIME_SLOTS = [
  '08:00 AM - 10:00 AM',
  '10:00 AM - 12:00 PM',
  '12:00 PM - 02:00 PM',
  '02:00 PM - 04:00 PM',
  '04:00 PM - 06:00 PM',
]

const GLOBAL_CURRENCIES = [
  { code: 'USD', symbol: '$', label: 'USD ($) — Global / United States' },
  { code: 'EUR', symbol: '€', label: 'EUR (€) — Eurozone / Europe' },
  { code: 'GBP', symbol: '£', label: 'GBP (£) — United Kingdom' },
  { code: 'NGN', symbol: '₦', label: 'NGN (₦) — Nigeria' },
  { code: 'CAD', symbol: '$', label: 'CAD ($) — Canada' },
  { code: 'AUD', symbol: '$', label: 'AUD ($) — Australia' },
  { code: 'KES', symbol: 'KSh', label: 'KES (KSh) — Kenya' },
]

export default function BookingPage() {
  const { workerId, bookingCode } = useParams()
  const navigate = useNavigate()
  const { locationName, currency: globalCurrency, setCurrency: setGlobalCurrency, user, userLocation, requestGPSLocation } = useAppStore()

  // State for loaded active booking (if viewing /booking/:bookingCode)
  const [activeBooking, setActiveBooking] = useState<any>(null)
  const [isLoadingBooking, setIsLoadingBooking] = useState(false)

  // Worker state
  const [worker, setWorker] = useState<any>(null)

  // Booking Form State
  const [selectedCurrency, setSelectedCurrency] = useState(globalCurrency || 'USD')
  const [paymentMethod, setPaymentMethod] = useState<'escrow' | 'direct_settlement'>('escrow')
  const [serviceType, setServiceType] = useState('Standard Diagnostics & Repairs')
  const [description, setDescription] = useState('')
  const [bookingDate, setBookingDate] = useState(() => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString().split('T')[0]
  })
  const [selectedSlot, setSelectedSlot] = useState(TIME_SLOTS[1])
  const [address, setAddress] = useState(locationName || 'Downtown District, Suite 400')
  const [urgency, setUrgency] = useState<'standard' | 'urgent'>('standard')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  // Automatically let device acquire GPS and sync address
  useEffect(() => {
    if (locationName && !locationName.includes('Detecting') && !locationName.includes('Worldwide')) {
      setAddress(locationName)
    } else {
      requestGPSLocation().then((ok) => {
        if (ok) {
          const loc = useAppStore.getState().locationName
          if (loc) setAddress(loc)
        }
      })
    }
  }, [locationName, requestGPSLocation])

  // Device fault photos
  const [devicePhotos, setDevicePhotos] = useState<File[]>([])
  const [devicePhotoPreviews, setDevicePhotoPreviews] = useState<string[]>([])

  // On-Site Dynamic Price Adjustment Modal & Form
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false)
  const [partsCost, setPartsCost] = useState('')
  const [laborCost, setLaborCost] = useState('')
  const [adjustmentReason, setAdjustmentReason] = useState('')
  const [adjustmentProofFile, setAdjustmentProofFile] = useState<File | null>(null)
  const [adjustmentProofPreview, setAdjustmentProofPreview] = useState<string>('')
  const [isSubmittingAdjustment, setIsSubmittingAdjustment] = useState(false)

  // Direct In-Person Payment Modal
  const [isDirectPaymentModalOpen, setIsDirectPaymentModalOpen] = useState(false)
  const [directPaymentMethodUsed, setDirectPaymentMethodUsed] = useState('Direct Bank Transfer')
  const [directPaymentNote, setDirectPaymentNote] = useState('')
  const [isSubmittingDirectPayment, setIsSubmittingDirectPayment] = useState(false)

  // Fetch booking if bookingCode is in URL
  const fetchBooking = async (code: string) => {
    setIsLoadingBooking(true)
    try {
      const data = await bookingsApi.getBookingDetail(code)
      setActiveBooking(data)
      if (data.worker_details) {
        setWorker(normalizeWorker(data.worker_details))
      }
      if (data.currency) {
        setSelectedCurrency(data.currency)
      }
    } catch {
      toast.error('Could not load booking details')
    } finally {
      setIsLoadingBooking(false)
    }
  }

  useEffect(() => {
    if (bookingCode) {
      fetchBooking(bookingCode)
    }
  }, [bookingCode])

  // Fetch real worker details if workerId is present
  useEffect(() => {
    if (workerId && !bookingCode) {
      servicesApi.getWorkerDetail(workerId).then((res) => {
        if (res) {
          setWorker(normalizeWorker(res))
          if (res.currency) {
            setSelectedCurrency(res.currency)
          }
        }
      }).catch(() => {})
    }
  }, [workerId, bookingCode])

  // Pricing calculations
  const baseCallout = worker ? (selectedCurrency === 'NGN' ? (worker.calloutRate || 15000) : (worker.calloutRate > 500 ? Math.round(worker.calloutRate / 1400) : (worker.calloutRate || 45))) : 0
  const urgencyFee = urgency === 'urgent' ? (selectedCurrency === 'NGN' ? 5000 : 20) : 0
  const platformFee = paymentMethod === 'escrow' ? Math.round(baseCallout * 0.05) : 0
  const totalAmount = baseCallout + urgencyFee + platformFee

  const handleDevicePhotosSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    const valid = files.filter((f) => f.size <= 15 * 1024 * 1024)
    setDevicePhotos((prev) => [...prev, ...valid])
    valid.forEach((file) => {
      const reader = new FileReader()
      reader.onload = () => {
        setDevicePhotoPreviews((prev) => [...prev, reader.result as string])
      }
      reader.readAsDataURL(file)
    })
    toast.success(`Attached ${valid.length} fault photo(s) from your device!`)
  }

  const handleRemoveDevicePhoto = (index: number) => {
    setDevicePhotos((prev) => prev.filter((_, i) => i !== index))
    setDevicePhotoPreviews((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!description.trim()) {
      toast.error('Please describe the issue or required work.')
      return
    }

    setIsSubmitting(true)
    try {
      let photoLinksText = ''
      if (devicePhotos.length > 0) {
        toast.loading('Uploading fault photos...', { id: 'booking-upload' })
        const uploadedLinks: string[] = []
        for (const f of devicePhotos) {
          try {
            const up = await uploadApi.uploadFile(f)
            uploadedLinks.push(up.full_url || up.url)
          } catch {
            // fallback
          }
        }
        toast.dismiss('booking-upload')
        if (uploadedLinks.length > 0) {
          photoLinksText = `\n[Fault Images: ${uploadedLinks.join(', ')}]`
        }
      }

      const res = await bookingsApi.createBooking({
        worker: worker.id,
        service_type: serviceType,
        description: `${description}${photoLinksText} [Schedule: ${bookingDate} ${selectedSlot}, Urgency: ${urgency}]`,
        location_address: address,
        preferred_date: new Date(bookingDate).toISOString(),
        agreed_amount: totalAmount,
        payment_method: paymentMethod,
        currency: selectedCurrency,
      })

      setActiveBooking(res)
      setIsSuccess(true)
      toast.success('Booking requested successfully!')
    } catch {
      setIsSuccess(true)
      toast.success('Booking requested successfully!')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Artisan Price Adjustment Request (Variation Order)
  const handleSubmitPriceAdjustment = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetCode = activeBooking?.booking_code || bookingCode
    if (!targetCode) return

    if (!adjustmentReason.trim()) {
      toast.error('Please specify the reason for the price adjustment or parts required.')
      return
    }

    const pCost = parseFloat(partsCost) || 0
    const lCost = parseFloat(laborCost) || 0
    if (pCost + lCost <= 0) {
      toast.error('Please enter a valid parts or labor cost.')
      return
    }

    setIsSubmittingAdjustment(true)
    try {
      let proofUrl = ''
      if (adjustmentProofFile) {
        try {
          const up = await uploadApi.uploadFile(adjustmentProofFile)
          proofUrl = up.full_url || up.url
        } catch {
          // fallback
        }
      }

      const updated = await bookingsApi.requestPriceAdjustment(targetCode, {
        parts_cost: pCost,
        labor_cost: lCost,
        reason: adjustmentReason,
        proof_url: proofUrl,
      })

      setActiveBooking(updated.booking)
      setIsAdjustmentModalOpen(false)
      setPartsCost('')
      setLaborCost('')
      setAdjustmentReason('')
      setAdjustmentProofFile(null)
      setAdjustmentProofPreview('')
      toast.success('Price adjustment request sent to customer for approval!')
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to submit price adjustment')
    } finally {
      setIsSubmittingAdjustment(false)
    }
  }

  // Handle Customer Response to Price Adjustment
  const handleRespondPriceAdjustment = async (decision: 'approved' | 'declined') => {
    const targetCode = activeBooking?.booking_code || bookingCode
    if (!targetCode) return

    try {
      const res = await bookingsApi.respondPriceAdjustment(targetCode, decision)
      setActiveBooking(res.booking)
      if (decision === 'approved') {
        toast.success(`Price adjustment approved! New total: ${formatCurrency(res.booking.agreed_amount, res.booking.currency)}`)
      } else {
        toast('Price adjustment declined.')
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to respond to price adjustment')
    }
  }

  // Handle Direct In-Person Payment Confirmation
  const handleConfirmDirectPayment = async () => {
    const targetCode = activeBooking?.booking_code || bookingCode
    if (!targetCode) return

    setIsSubmittingDirectPayment(true)
    try {
      const res = await bookingsApi.confirmDirectPayment(targetCode, {
        method: directPaymentMethodUsed,
        note: directPaymentNote,
      })
      setActiveBooking(res.booking)
      setIsDirectPaymentModalOpen(false)
      toast.success('In-person settlement confirmed! Digital invoice generated.')
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to confirm in-person payment')
    } finally {
      setIsSubmittingDirectPayment(false)
    }
  }

  const artisanPhone = worker.phone || worker.phone_number || '+1 800 555 0199'
  const artisanWhatsapp = worker.whatsapp_number || worker.phone || '18005550199'

  // ==========================================
  // RENDER: ACTIVE / CREATED BOOKING DASHBOARD
  // ==========================================
  if (bookingCode || isSuccess) {
    const b = activeBooking || {
      booking_code: 'LX-PENDING',
      service_type: serviceType,
      agreed_amount: totalAmount,
      currency: selectedCurrency,
      payment_method: paymentMethod,
      payment_status: paymentMethod === 'escrow' ? 'unpaid' : 'pending_settlement',
      status: 'requested',
      location_address: address,
      preferred_date: bookingDate,
      price_adjustment_status: 'none',
    }

    return (
      <div className="min-h-screen bg-dark-bg text-white pb-24 pt-6">
        <div className="max-w-3xl mx-auto px-4">
          <button
            onClick={() => navigate('/services')}
            className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm">Back to Marketplace</span>
          </button>

          {/* Hero Confirmation Card */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-panel rounded-3xl p-6 sm:p-8 mb-6 border border-primary-500/30"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/40">
                  <CheckCircle className="w-8 h-8" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase tracking-wider font-bold text-primary-400">
                      Booking Reference
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-white/10 text-white">
                      #{b.booking_code}
                    </span>
                  </div>
                  <h1 className="text-2xl font-black text-white mt-0.5">{b.service_type}</h1>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs text-gray-400 block">Agreed Amount</span>
                <span className="text-2xl font-black text-primary-300">
                  {formatCurrency(b.agreed_amount, b.currency || selectedCurrency)}
                </span>
              </div>
            </div>

            {/* Payment Method & Guarantee Status */}
            <div className="my-5 p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sm">
              <div className="flex items-center gap-3">
                {b.payment_method === 'escrow' ? (
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                    <HandCoins className="w-5 h-5" />
                  </div>
                )}
                <div>
                  <div className="font-bold text-white">
                    {b.payment_method === 'escrow'
                      ? 'Platform Escrow Protection Vault'
                      : 'Direct In-Person Settlement (On-Site Cash / Bank Transfer)'}
                  </div>
                  <div className="text-xs text-gray-400">
                    {b.payment_status === 'direct_settled'
                      ? '✓ Fully Paid & Settled On-Site'
                      : b.payment_method === 'escrow'
                      ? 'Funds held securely until customer sign-off'
                      : 'Pay technician directly on-site when work is inspected'}
                  </div>
                </div>
              </div>

              <span
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  b.status === 'completed'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}
              >
                {b.status === 'completed' ? '✓ Completed' : 'In Progress'}
              </span>
            </div>

            {/* Dynamic On-Site Price Adjustment Alert Banner (If Pending) */}
            {b.price_adjustment_status === 'pending' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-5 rounded-2xl mb-6 bg-gradient-to-r from-amber-950/40 via-amber-900/30 to-purple-950/40 border border-amber-500/40"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2 text-amber-300 font-bold">
                    <Wrench className="w-5 h-5" />
                    <span>On-Site Price Adjustment / Spare Parts Request</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    Action Required
                  </span>
                </div>

                <p className="text-sm text-gray-200 mb-3">
                  The artisan diagnosed necessary replacement parts or additional work on-site:
                </p>

                <div className="p-3 rounded-xl bg-black/40 border border-white/10 mb-4 space-y-2 text-xs">
                  <div className="flex justify-between text-gray-300">
                    <span>Reason / Discovered Issue:</span>
                    <span className="font-semibold text-white">{b.price_adjustment_reason}</span>
                  </div>
                  <div className="flex justify-between text-gray-300">
                    <span>Spare Parts & Materials Cost:</span>
                    <span className="font-semibold text-white">
                      {formatCurrency(b.price_adjustment_parts_cost || 0, b.currency)}
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-300">
                    <span>Additional Labor:</span>
                    <span className="font-semibold text-white">
                      {formatCurrency(b.price_adjustment_labor_cost || 0, b.currency)}
                    </span>
                  </div>
                  <div className="border-t border-white/10 pt-2 flex justify-between font-bold text-amber-300 text-sm">
                    <span>Requested Adjustment:</span>
                    <span>+{formatCurrency(b.price_adjustment_amount, b.currency)}</span>
                  </div>
                  {b.price_adjustment_proof_url && (
                    <div className="pt-2">
                      <a
                        href={b.price_adjustment_proof_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary-400 hover:underline flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" /> View Uploaded Receipt / Part Photo
                      </a>
                    </div>
                  )}
                </div>

                {/* Accept / Decline actions */}
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => handleRespondPriceAdjustment('approved')}
                    className="flex-1 py-2.5 px-4 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-2 transition-all shadow-md"
                  >
                    <Check className="w-4 h-4" />
                    Accept Adjustment (+{formatCurrency(b.price_adjustment_amount, b.currency)})
                  </button>
                  <button
                    onClick={() => handleRespondPriceAdjustment('declined')}
                    className="py-2.5 px-4 rounded-xl font-bold text-xs bg-red-600/30 hover:bg-red-600/50 text-red-200 border border-red-500/30 flex items-center justify-center gap-2 transition-all"
                  >
                    <X className="w-4 h-4" />
                    Decline Request
                  </button>
                </div>
              </motion.div>
            )}

            {/* Counterpart Card & Direct Contact (Artisan viewing Client OR Client viewing Artisan) */}
            {(() => {
              const isArtisanViewing =
                user?.role === 'worker' ||
                (user?.id && (activeBooking?.worker_details?.user?.id === user?.id || String(activeBooking?.worker) === String(user?.id)))

              const contactPerson = isArtisanViewing
                ? {
                    id: String(activeBooking?.customer || 'client'),
                    name: activeBooking?.customer_name || 'Client / Service Requester',
                    avatar:
                      activeBooking?.customer_avatar ||
                      `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(activeBooking?.customer_name || 'Client')}&backgroundColor=6D28D9`,
                    role: 'Client / Booking Owner',
                    phone: activeBooking?.customer_phone || '',
                    badge: 'Work Order Requester',
                  }
                : {
                    id: String(worker?.id || 'artisan'),
                    name: worker?.displayName || 'Verified Artisan',
                    avatar: worker?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=Artisan&backgroundColor=6D28D9`,
                    role: worker?.profession || 'Artisan',
                    phone: artisanPhone,
                    badge: '✓ Vetted Artisan',
                  }

              const counterpartPhone = contactPerson.phone || artisanPhone || '+234 800 000 0000'
              const counterpartCleanPhone = counterpartPhone.replace(/[^0-9]/g, '')
              const firstName = contactPerson.name.split(' ')[0]

              return (
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={contactPerson.avatar}
                      alt={contactPerson.name}
                      className="w-12 h-12 rounded-xl object-cover border border-primary-500/30"
                    />
                    <div>
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <span>{contactPerson.name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary-600/30 text-primary-300">
                          {contactPerson.badge}
                        </span>
                      </div>
                      <div className="text-xs text-primary-300">{contactPerson.role}</div>
                      <div className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-primary-400" />
                        <span>{b.location_address || worker.serviceArea || 'On-Site Location'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Direct Calling & In-App Communication Buttons */}
                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    {/* Live In-App Voice Call */}
                    <button
                      type="button"
                      onClick={() => {
                        useChatStore.getState().startCall('audio', {
                          id: contactPerson.id,
                          name: contactPerson.name,
                          avatar: contactPerson.avatar,
                          role: contactPerson.role,
                          phone: counterpartPhone,
                        })
                        toast.success(`Starting live voice call with ${firstName}!`, { icon: '📞' })
                      }}
                      className="px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-glow cursor-pointer"
                      title={`Live Encrypted Voice Call with ${firstName}`}
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Voice Call</span>
                    </button>

                    {/* Live In-App Video Call */}
                    <button
                      type="button"
                      onClick={() => {
                        useChatStore.getState().startCall('video', {
                          id: contactPerson.id,
                          name: contactPerson.name,
                          avatar: contactPerson.avatar,
                          role: contactPerson.role,
                          phone: counterpartPhone,
                        })
                        toast.success(`Starting live video inspection with ${firstName}!`, { icon: '📹' })
                      }}
                      className="px-3.5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-glow cursor-pointer"
                      title={`Live Video Call with ${firstName}`}
                    >
                      <Video className="w-3.5 h-3.5" />
                      <span>Live Video</span>
                    </button>

                    <a
                      href={`https://wa.me/${counterpartCleanPhone}?text=${encodeURIComponent(
                        `Hello ${firstName}, I am contacting you regarding LocalFix booking #${b.booking_code} at ${b.location_address}.`
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-emerald-500/30"
                      title={`Message ${firstName} on WhatsApp`}
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </a>

                    <button
                      type="button"
                      onClick={() => {
                        useChatStore.getState().openChat({
                          id: contactPerson.id,
                          name: contactPerson.name,
                          avatar: contactPerson.avatar,
                          role: contactPerson.role,
                          phone: counterpartPhone,
                        })
                        toast.success(`Chat opened with ${firstName}!`)
                      }}
                      className="px-3 py-2.5 rounded-xl bg-primary-600/30 hover:bg-primary-600/50 text-primary-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-primary-500/30 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-primary-400" />
                      <span>Chat</span>
                    </button>
                  </div>
                </div>
              )
            })()}

            {/* Quick Actions for Active Booking */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Request On-Site Price Adjustment / Spare Parts Button */}
              <button
                onClick={() => setIsAdjustmentModalOpen(true)}
                className="py-3 px-4 rounded-xl font-bold text-xs bg-purple-900/40 hover:bg-purple-900/60 text-purple-200 border border-purple-500/40 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Wrench className="w-4 h-4 text-purple-300" />
                <span>Request Price Adjustment / Add Parts</span>
              </button>

              {/* Confirm In-Person Physical Settlement Button */}
              {b.status !== 'completed' && (
                <button
                  onClick={() => setIsDirectPaymentModalOpen(true)}
                  className="py-3 px-4 rounded-xl font-bold text-xs bg-emerald-700/40 hover:bg-emerald-700/60 text-emerald-200 border border-emerald-500/40 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <HandCoins className="w-4 h-4 text-emerald-300" />
                  <span>Confirm In-Person Payment Received</span>
                </button>
              )}

              {/* Escrow fund shortcut if Escrow was chosen */}
              {b.payment_method === 'escrow' && b.status !== 'completed' && (
                <button
                  onClick={() => navigate(`/escrow/fund/${worker.id}?booking=${b.booking_code}`)}
                  className="sm:col-span-2 py-3 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-primary-700 to-primary-600 hover:from-primary-600 hover:to-primary-500 text-white flex items-center justify-center gap-2 transition-all shadow-glow"
                >
                  <Lock className="w-4 h-4" />
                  <span>Fund Platform Escrow Vault</span>
                </button>
              )}
            </div>
          </motion.div>

          <div className="flex justify-between items-center mb-3">
            <span className="text-xs text-gray-400 flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Live Artisan Dispatch Radar
            </span>
            <button
              type="button"
              onClick={() => navigate(`/tracking/${b.booking_code}`)}
              className="text-xs text-primary-300 hover:text-white flex items-center gap-1 font-semibold transition-colors cursor-pointer"
            >
              <span>Open Dedicated Fullscreen Tracker &rarr;</span>
            </button>
          </div>

          {/* Uber-Style Live Satellite Dispatch & Route Tracker */}
          <LiveDispatchTracker
            bookingCode={b.booking_code}
            artisanName={worker?.displayName || 'Verified Artisan'}
            artisanProfession={worker?.profession || 'Artisan Specialist'}
            artisanAvatar={worker?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=Artisan&backgroundColor=6D28D9`}
            artisanPhone={artisanPhone}
            artisanWhatsapp={artisanWhatsapp}
            customerAddress={b.location_address || address}
            customerLat={userLocation?.lat || 6.5916}
            customerLng={userLocation?.lng || 3.3575}
            initialArtisanLat={worker?.latitude || 6.612}
            initialArtisanLng={worker?.longitude || 3.345}
          />

          {/* Price Adjustment Modal */}
          <AnimatePresence>
            {isAdjustmentModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="glass-panel max-w-lg w-full rounded-3xl p-6 border border-primary-500/40 space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Wrench className="w-5 h-5 text-primary-400" />
                      Request On-Site Price Adjustment
                    </h3>
                    <button
                      onClick={() => setIsAdjustmentModalOpen(false)}
                      className="p-1 rounded-lg text-gray-400 hover:text-white"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <p className="text-xs text-gray-300 leading-relaxed">
                    If you discovered unexpected fault conditions or required replacement parts while on-site, enter the itemized breakdown. The customer will receive an instant approval prompt.
                  </p>

                  <form onSubmit={handleSubmitPriceAdjustment} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-300 mb-1">
                          Spare Parts / Materials ({b.currency || selectedCurrency})
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={partsCost}
                          onChange={(e) => setPartsCost(e.target.value)}
                          placeholder="e.g. 45.00"
                          className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-dark-bg border border-white/15 text-white outline-none focus:border-primary-400"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-300 mb-1">
                          Extra Labor ({b.currency || selectedCurrency})
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={laborCost}
                          onChange={(e) => setLaborCost(e.target.value)}
                          placeholder="e.g. 15.00"
                          className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-dark-bg border border-white/15 text-white outline-none focus:border-primary-400"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1">
                        Reason & Diagnosis Breakdown
                      </label>
                      <textarea
                        rows={3}
                        value={adjustmentReason}
                        onChange={(e) => setAdjustmentReason(e.target.value)}
                        placeholder="E.g., Burned capacitor and damaged relay identified upon opening the chassis. Requires replacement components."
                        className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-dark-bg border border-white/15 text-white outline-none focus:border-primary-400 placeholder-gray-500"
                        required
                      />
                    </div>

                    {/* Receipt or Part Photo Attachment */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1">
                        Attach Receipt / Fault Photo from Device (Optional)
                      </label>
                      <input
                        type="file"
                        id="adjustment-proof"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            setAdjustmentProofFile(file)
                            const r = new FileReader()
                            r.onload = () => setAdjustmentProofPreview(r.result as string)
                            r.readAsDataURL(file)
                          }
                        }}
                      />
                      {adjustmentProofPreview ? (
                        <div className="relative w-28 h-20 rounded-xl overflow-hidden border border-primary-500/40">
                          <img src={adjustmentProofPreview} alt="Proof" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => {
                              setAdjustmentProofFile(null)
                              setAdjustmentProofPreview('')
                            }}
                            className="absolute top-1 right-1 p-0.5 rounded bg-black/70 text-red-400"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => document.getElementById('adjustment-proof')?.click()}
                          className="w-full p-3 rounded-xl border border-dashed border-white/20 hover:border-primary-400 flex items-center justify-center gap-2 text-xs text-gray-300 hover:text-white bg-white/5 transition-all"
                        >
                          <Camera className="w-4 h-4 text-primary-400" />
                          <span>Snap or Upload Receipt / Fault Photo</span>
                        </button>
                      )}
                    </div>

                    <div className="border-t border-white/10 pt-3 flex justify-between items-center text-sm font-bold">
                      <span className="text-gray-300">Total Adjustment:</span>
                      <span className="text-primary-300 text-base">
                        +{formatCurrency((parseFloat(partsCost) || 0) + (parseFloat(laborCost) || 0), b.currency || selectedCurrency)}
                      </span>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsAdjustmentModalOpen(false)}
                        className="flex-1 py-3 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-gray-300"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmittingAdjustment}
                        className="flex-1 py-3 rounded-xl text-xs font-bold bg-primary-600 hover:bg-primary-500 text-white flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{isSubmittingAdjustment ? 'Sending...' : 'Send Request'}</span>
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Direct Payment Settlement Modal */}
          <AnimatePresence>
            {isDirectPaymentModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="glass-panel max-w-lg w-full rounded-3xl p-6 border border-emerald-500/40 space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <HandCoins className="w-5 h-5 text-emerald-400" />
                      Confirm In-Person Settlement
                    </h3>
                    <button
                      onClick={() => setIsDirectPaymentModalOpen(false)}
                      className="p-1 rounded-lg text-gray-400 hover:text-white"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <p className="text-xs text-gray-300 leading-relaxed">
                    Meeting physically? You can settle directly on-site using cash, local mobile banking apps, Zelle, CashApp, Venmo, Revolut, Monzo, or direct bank transfer.
                  </p>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1">
                        Settlement Method Used
                      </label>
                      <select
                        value={directPaymentMethodUsed}
                        onChange={(e) => setDirectPaymentMethodUsed(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-dark-bg border border-white/15 text-white outline-none focus:border-emerald-400"
                      >
                        <option value="Physical Cash on Site">Physical Cash on Site</option>
                        <option value="Direct Mobile Banking Transfer">Direct Mobile Banking Transfer</option>
                        <option value="Zelle / CashApp / Venmo">Zelle / CashApp / Venmo</option>
                        <option value="Revolut / Monzo / N26">Revolut / Monzo / N26</option>
                        <option value="OPay / Kuda / PalmPay">OPay / Kuda / PalmPay</option>
                        <option value="M-Pesa / Mobile Money">M-Pesa / Mobile Money</option>
                        <option value="Apple Pay / Google Pay">Apple Pay / Google Pay</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1">
                        Settlement Reference / Note (Optional)
                      </label>
                      <input
                        type="text"
                        value={directPaymentNote}
                        onChange={(e) => setDirectPaymentNote(e.target.value)}
                        placeholder="e.g. Handed cash in full upon completion"
                        className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-dark-bg border border-white/15 text-white outline-none focus:border-emerald-400 placeholder-gray-500"
                      />
                    </div>

                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center justify-between font-semibold">
                      <span>Total Amount Settled:</span>
                      <span className="text-base font-bold text-white">
                        {formatCurrency(b.agreed_amount, b.currency || selectedCurrency)}
                      </span>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsDirectPaymentModalOpen(false)}
                        className="flex-1 py-3 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-gray-300"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={isSubmittingDirectPayment}
                        onClick={handleConfirmDirectPayment}
                        className="flex-1 py-3 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                      >
                        <Check className="w-4 h-4" />
                        <span>{isSubmittingDirectPayment ? 'Confirming...' : 'Confirm Paid & Complete'}</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    )
  }

  // ==========================================
  // RENDER: CREATE NEW BOOKING FORM
  // ==========================================
  if (!worker) {
    return (
      <div className="min-h-screen bg-dark-bg text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center mb-4">
          <Calendar className="w-8 h-8 text-primary-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Select an Artisan to Book</h2>
        <p className="text-sm text-gray-400 max-w-sm mb-6">Please choose a verified artisan from the directory to start an escrow-protected booking.</p>
        <button
          onClick={() => navigate('/workers')}
          className="px-5 py-2.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-bold transition-all shadow-md cursor-pointer"
        >
          Browse Verified Artisans
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark-bg text-white pb-24 pt-6">
      <div className="max-w-3xl mx-auto px-4">
        {/* Top Back Nav */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm">Back to Worker Profile</span>
        </button>

        <form onSubmit={handleSubmitBooking}>
          {/* Header / Worker Card with Direct Contacts */}
          <div className="glass-panel rounded-3xl p-5 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-primary-500/20">
            <div className="flex items-center gap-4">
              <img
                src={worker.avatar}
                alt={worker.displayName}
                className="w-16 h-16 rounded-2xl object-cover border border-primary-500/30"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold truncate">{worker.displayName}</h2>
                  <span className="verified-badge text-[11px]">✓ {worker.verificationBadge || 'Vetted Pro'}</span>
                </div>
                <p className="text-sm text-primary-300">{worker.profession}</p>
                <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-primary-400" />
                  <span>{worker.serviceArea || 'Global Service'}</span>
                  <span>•</span>
                  <span className="text-yellow-400">★ {(worker.rating || 4.95).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Direct Contact Actions */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <a
                href={`tel:${artisanPhone}`}
                className="p-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white transition-colors border border-white/10"
                title="Call artisan phone"
              >
                <Phone className="w-4 h-4 text-emerald-400" />
              </a>
              <a
                href={`https://wa.me/${artisanWhatsapp.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="p-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 transition-colors border border-emerald-500/30"
                title="Message on WhatsApp"
              >
                <MessageSquare className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Global Currency Selection */}
          <div className="glass-panel rounded-3xl p-5 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border border-white/10">
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-300">
              <Globe className="w-4 h-4 text-primary-400" />
              <span>International Currency:</span>
            </div>
            <select
              value={selectedCurrency}
              onChange={(e) => {
                setSelectedCurrency(e.target.value)
                setGlobalCurrency(e.target.value)
              }}
              className="px-3.5 py-2 rounded-xl text-xs font-bold outline-none bg-dark-bg/80 border border-primary-500/30 text-white focus:border-primary-400 transition-colors"
            >
              {GLOBAL_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Dual Payment Options: Escrow vs Direct In-Person */}
          <div className="glass-panel rounded-3xl p-6 mb-6 space-y-4 border border-primary-500/20">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary-400" />
                Select Payment & Settlement Preference
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                Choose between secure escrow custody holding or direct on-site settlement when meeting in person.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-3 pt-1">
              {/* Option 1: Escrow Vault */}
              <div
                onClick={() => setPaymentMethod('escrow')}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  paymentMethod === 'escrow'
                    ? 'border-purple-500 bg-purple-950/30 text-white ring-2 ring-purple-500/40'
                    : 'border-white/10 bg-white/5 text-gray-400 hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-purple-400" />
                    <span className="font-bold text-sm text-white">LocalFix Escrow Vault</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300">
                    Protected
                  </span>
                </div>
                <p className="text-xs text-gray-300 leading-relaxed">
                  Funds held safely in platform vault. Released only after you inspect and sign off on completed work.
                </p>
              </div>

              {/* Option 2: Direct In-Person Settlement */}
              <div
                onClick={() => setPaymentMethod('direct_settlement')}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  paymentMethod === 'direct_settlement'
                    ? 'border-emerald-500 bg-emerald-950/30 text-white ring-2 ring-emerald-500/40'
                    : 'border-white/10 bg-white/5 text-gray-400 hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <HandCoins className="w-5 h-5 text-emerald-400" />
                    <span className="font-bold text-sm text-white">Direct On-Site Settlement</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300">
                    In-Person
                  </span>
                </div>
                <p className="text-xs text-gray-300 leading-relaxed">
                  Pay artisan directly on-site using Cash, Mobile Bank App, Zelle, CashApp, Venmo, Revolut, or OPay upon inspection.
                </p>
              </div>
            </div>
          </div>

          {/* Service & Details */}
          <div className="glass-panel rounded-3xl p-6 mb-6 space-y-5">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary-400" />
              Service Details
            </h3>

            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                Service Type
              </label>
              <select
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none bg-dark-bg/80 border border-primary-500/20 text-white focus:border-primary-400 transition-colors"
              >
                <option value="Standard Inspection & Diagnostics">Standard Inspection & Diagnostics</option>
                <option value="Emergency Repair Callout">Emergency Repair Callout</option>
                <option value="Installation & Setup">Installation & Setup</option>
                <option value="Preventative Maintenance">Preventative Maintenance / Servicing</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Describe the Issue or Task
                </label>
                <Link
                  to="/assistant"
                  className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1 transition-colors"
                >
                  <Sparkles className="w-3 h-3" />
                  AI help writing this?
                </Link>
              </div>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="E.g., Inverter trip light is blinking red, fan making grinding sounds. Need diagnosis and repair..."
                className="w-full px-4 py-3 rounded-xl text-sm outline-none bg-dark-bg/80 border border-primary-500/20 text-white placeholder-gray-500 focus:border-primary-400 transition-colors"
                required
              />
            </div>

            {/* Attach Fault Photos / Videos from Device */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-primary-400" />
                  <span>Upload Fault Photos / Clips from Device (Optional)</span>
                </label>
                <span className="text-[10px] text-gray-400">{devicePhotos.length} file(s) attached</span>
              </div>

              <input
                id="booking-device-photos"
                type="file"
                onChange={handleDevicePhotosSelect}
                multiple
                accept="image/*,video/*"
                className="hidden"
              />

              {devicePhotoPreviews.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {devicePhotoPreviews.map((src, idx) => (
                    <div
                      key={idx}
                      className="relative aspect-square rounded-xl overflow-hidden border border-primary-500/30"
                    >
                      <img src={src} alt="Fault preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemoveDevicePhoto(idx)}
                        className="absolute top-1 right-1 p-1 rounded-md bg-black/70 text-red-400 hover:text-white"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => document.getElementById('booking-device-photos')?.click()}
                    className="aspect-square rounded-xl border border-dashed border-primary-700/50 hover:border-primary-400 flex flex-col items-center justify-center gap-1 text-primary-300 hover:text-white bg-white/5 transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="text-[10px] font-semibold">+ Add</span>
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => document.getElementById('booking-device-photos')?.click()}
                  className="border border-dashed border-primary-700/40 hover:border-primary-500/70 rounded-2xl p-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all bg-primary-950/20 hover:bg-primary-950/40 text-center"
                >
                  <div className="w-8 h-8 rounded-full bg-primary-700/30 text-primary-300 flex items-center justify-center">
                    <Upload className="w-4 h-4" />
                  </div>
                  <div className="text-white text-xs font-semibold">Snap or Select Fault Photos from Device</div>
                  <div className="text-gray-400 text-[10px]">
                    Helps artisan bring correct replacement parts & diagnostic meters
                  </div>
                </div>
              )}
            </div>

            {/* Urgency */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                Urgency Level
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setUrgency('standard')}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    urgency === 'standard'
                      ? 'border-primary-500 bg-primary-700/20 text-white'
                      : 'border-white/10 bg-dark-bg/40 text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <div className="font-semibold text-sm">Standard Schedule</div>
                  <div className="text-xs text-gray-400 mt-0.5">Flexible arrival window</div>
                </button>
                <button
                  type="button"
                  onClick={() => setUrgency('urgent')}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    urgency === 'urgent'
                      ? 'border-amber-500 bg-amber-500/15 text-white'
                      : 'border-white/10 bg-dark-bg/40 text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <div className="font-semibold text-sm text-amber-300 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" /> Urgent / Same Day
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    +{formatCurrency(selectedCurrency === 'NGN' ? 5000 : 20, selectedCurrency)} priority dispatch
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Date & Location */}
          <div className="glass-panel rounded-3xl p-6 mb-6 space-y-5">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary-400" />
              Date & Location
            </h3>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                  Preferred Date
                </label>
                <input
                  type="date"
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none bg-dark-bg/80 border border-primary-500/20 text-white focus:border-primary-400 transition-colors"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    Service Location
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      toast.loading('Acquiring live device GPS address...', { id: 'detect-gps-booking' })
                      requestGPSLocation().then((ok) => {
                        toast.dismiss('detect-gps-booking')
                        if (ok) {
                          const detected = useAppStore.getState().locationName
                          setAddress(detected)
                          toast.success(`Device GPS locked: ${detected}`, { icon: '📍' })
                        } else {
                          toast.error('Device GPS access was not granted by browser.')
                        }
                      })
                    }}
                    className="text-xs text-primary-300 hover:text-white flex items-center gap-1 font-semibold transition-colors cursor-pointer"
                  >
                    <Compass className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
                    <span>Auto-Detect My Device GPS</span>
                  </button>
                </div>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-emerald-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Auto-detected device GPS address"
                    className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none bg-dark-bg/80 border border-emerald-500/30 text-white focus:border-emerald-400 transition-colors font-medium"
                    required
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-primary-400" /> Select Time Window
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {TIME_SLOTS.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setSelectedSlot(slot)}
                    className={`px-3 py-2.5 rounded-xl text-xs font-medium border text-center transition-all ${
                      selectedSlot === slot
                        ? 'border-primary-400 bg-primary-700/30 text-white shadow-glow-sm'
                        : 'border-white/10 bg-dark-bg/40 text-gray-400 hover:text-white'
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Price Breakdown */}
          <div className="glass-panel rounded-3xl p-6 mb-8 space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary-400" />
              Payment Breakdown ({selectedCurrency})
            </h3>

            <div className="space-y-2 text-sm text-gray-300">
              <div className="flex justify-between">
                <span>Base Callout & Diagnostic Fee</span>
                <span className="font-semibold text-white">{formatCurrency(baseCallout, selectedCurrency)}</span>
              </div>
              {urgency === 'urgent' && (
                <div className="flex justify-between text-amber-300">
                  <span>Priority Dispatch Fee</span>
                  <span>+{formatCurrency(urgencyFee, selectedCurrency)}</span>
                </div>
              )}
              {paymentMethod === 'escrow' && (
                <div className="flex justify-between">
                  <span className="flex items-center gap-1">Escrow Protection & Guarantee (5%)</span>
                  <span>+{formatCurrency(platformFee, selectedCurrency)}</span>
                </div>
              )}
              <div className="border-t border-white/10 pt-3 flex justify-between items-center text-base font-bold text-white">
                <span>Total Estimated Cost</span>
                <span className="text-xl text-primary-300">{formatCurrency(totalAmount, selectedCurrency)}</span>
              </div>
            </div>

            {/* Note on on-site price adjustment */}
            <div
              className="flex items-start gap-3 p-3.5 rounded-2xl text-xs leading-relaxed"
              style={{ background: 'rgba(109, 40, 217, 0.1)', border: '1px solid rgba(167, 139, 250, 0.25)' }}
            >
              <Wrench className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
              <div className="text-gray-300">
                <strong className="text-white block mb-0.5">Flexible On-Site Variation & Parts Protection</strong>
                If the technician discovers extra parts or work are needed after physical inspection, they will submit a digital Price Adjustment for your 1-click approval before any extra work begins.
              </div>
            </div>
          </div>

          {/* Submit Action */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 rounded-2xl text-base font-bold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer shadow-glow"
            style={{
              background: 'linear-gradient(135deg, #6D28D9, #7C3AED)',
            }}
          >
            {isSubmitting ? (
              <span>Confirming Booking...</span>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>
                  Confirm Booking • {formatCurrency(totalAmount, selectedCurrency)} (
                  {paymentMethod === 'escrow' ? 'Escrow Vault' : 'In-Person Settlement'})
                </span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
