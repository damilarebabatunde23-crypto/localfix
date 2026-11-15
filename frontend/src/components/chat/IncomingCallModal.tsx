import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Phone, PhoneOff, Video, ShieldCheck } from 'lucide-react'
import { useChatStore } from '@/stores/useChatStore'
import { useAppStore } from '@/stores/useAppStore'

export default function IncomingCallModal() {
  const { incomingCall, activeCall, checkIncomingCall, acceptIncomingCall, declineIncomingCall } = useChatStore()
  const { isAuthenticated } = useAppStore()

  // Poll for incoming calls when authenticated and not already in an active call
  useEffect(() => {
    if (!isAuthenticated || activeCall) return

    checkIncomingCall()
    const interval = setInterval(() => {
      checkIncomingCall()
    }, 2500)

    return () => clearInterval(interval)
  }, [isAuthenticated, activeCall, checkIncomingCall])

  if (!incomingCall) return null

  const isVideo = incomingCall.type === 'video'
  const contactName = incomingCall.contact.name || 'LocalFix User'
  const avatarUrl =
    incomingCall.contact.avatar ||
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(contactName)}&backgroundColor=6D28D9`

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md select-none">
        <motion.div
          initial={{ scale: 0.85, opacity: 0, y: 40 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.85, opacity: 0, y: 40 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="w-full max-w-sm sm:max-w-md rounded-3xl p-6 sm:p-7 flex flex-col items-center text-center shadow-2xl relative overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, #1f1838 0%, #110d20 100%)',
            border: '1.5px solid rgba(167, 139, 250, 0.4)',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.9), 0 0 35px rgba(109, 40, 217, 0.4)',
          }}
        >
          {/* Pulsing ring indicator */}
          <div className="relative mb-5">
            <div className="absolute -inset-3 rounded-full bg-primary-500/20 animate-ping opacity-75" />
            <div className="absolute -inset-1 rounded-full bg-emerald-500/20 animate-pulse" />
            <img
              src={avatarUrl}
              alt={contactName}
              className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border-3 border-primary-400 shadow-xl"
            />
            <span className="absolute bottom-1 right-1 p-2 rounded-full bg-emerald-500 text-white shadow-lg border-2 border-[#1f1838]">
              {isVideo ? <Video className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
            </span>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-950/70 border border-primary-500/30 text-[11px] font-semibold text-primary-300 mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-primary-400" />
            <span>Incoming {isVideo ? 'Live Video Call' : 'Encrypted Voice Call'}</span>
          </div>

          <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight mb-1 truncate max-w-full">
            {contactName}
          </h3>
          <p className="text-xs text-gray-400 mb-6">
            Connecting real-time peer-to-peer over secure WebRTC
          </p>

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-4 w-full">
            <button
              onClick={() => declineIncomingCall()}
              className="w-full py-3.5 rounded-2xl bg-red-600/90 hover:bg-red-600 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-red-900/30 active:scale-95 transition-all text-sm"
            >
              <PhoneOff className="w-4 h-4" />
              <span>Decline</span>
            </button>

            <button
              onClick={() => acceptIncomingCall()}
              className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/40 active:scale-95 transition-all text-sm"
            >
              {isVideo ? <Video className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
              <span>Answer</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
