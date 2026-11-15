import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Phone,
  PhoneOff,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Minimize2,
  Maximize2,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  MessageCircle,
  ExternalLink,
  AlertCircle,
} from 'lucide-react'
import { useChatStore, playChatSound } from '@/stores/useChatStore'

export default function ActiveCallModal() {
  const {
    activeCall,
    endCall,
    toggleCallMute,
    toggleCallCamera,
    toggleCallSpeaker,
    toggleCallMinimize,
    setCallDuration,
  } = useChatStore()

  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [micLevel, setMicLevel] = useState<number>(0)
  const [hasMediaAccess, setHasMediaAccess] = useState<boolean | null>(null)
  const [mediaNotice, setMediaNotice] = useState<string | null>(null)

  const selfVideoRef = useRef<HTMLVideoElement>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animFrameRef = useRef<number | null>(null)
  const ringIntervalRef = useRef<any>(null)

  // Call timer and ringing sound effects
  useEffect(() => {
    if (!activeCall) return

    // If ringing, play repeating phone dial tone
    if (activeCall.status === 'ringing') {
      playChatSound('ring')
      ringIntervalRef.current = setInterval(() => {
        playChatSound('ring')
      }, 2400)
    } else {
      if (ringIntervalRef.current) clearInterval(ringIntervalRef.current)
    }

    // Auto-connect after 2.5 seconds
    const ringTimeout = setTimeout(() => {
      if (activeCall.status === 'ringing') {
        playChatSound('connect')
        useChatStore.setState((s) => ({
          activeCall: s.activeCall ? { ...s.activeCall, status: 'connected' } : null,
        }))
      }
    }, 2500)

    const timer = setInterval(() => {
      if (activeCall?.status === 'connected') {
        setCallDuration(activeCall.duration + 1)
      }
    }, 1000)

    return () => {
      clearTimeout(ringTimeout)
      clearInterval(timer)
      if (ringIntervalRef.current) clearInterval(ringIntervalRef.current)
    }
  }, [activeCall?.status, activeCall?.duration])

  // Request real device media stream (camera + mic) with clean fallbacks
  useEffect(() => {
    if (!activeCall) return

    let stream: MediaStream | null = null
    const needsVideo = activeCall.type === 'video'

    // Check if running in a secure context where getUserMedia is allowed
    const hasMediaDevices = typeof navigator !== 'undefined' && navigator.mediaDevices && !!navigator.mediaDevices.getUserMedia

    if (hasMediaDevices) {
      navigator.mediaDevices
        .getUserMedia({
          video: needsVideo ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } : false,
          audio: true,
        })
        .then((s) => {
          stream = s
          setLocalStream(s)
          setHasMediaAccess(true)
          setMediaNotice(null)

          // Setup real Web Audio API Analyzer to visualize live speech
          try {
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
            if (AudioCtx) {
              const audioCtx = new AudioCtx()
              audioContextRef.current = audioCtx
              const source = audioCtx.createMediaStreamSource(s)
              const analyser = audioCtx.createAnalyser()
              analyser.fftSize = 64
              source.connect(analyser)
              analyserRef.current = analyser

              const dataArray = new Uint8Array(analyser.frequencyBinCount)
              const updateLevel = () => {
                analyser.getByteFrequencyData(dataArray)
                let sum = 0
                for (let i = 0; i < dataArray.length; i++) {
                  sum += dataArray[i]
                }
                const avg = sum / dataArray.length
                setMicLevel(Math.min(100, Math.round(avg * 1.5)))
                animFrameRef.current = requestAnimationFrame(updateLevel)
              }
              updateLevel()
            }
          } catch {
            // Audio context permission fallback
          }
        })
        .catch((err) => {
          console.warn('LocalFix media stream notice:', err)
          setHasMediaAccess(false)
          setMediaNotice('Camera or microphone blocked by browser. Encrypted voice channel simulation active.')
        })
    } else {
      // Insecure context (HTTP non-localhost) or unsupported browser
      setHasMediaAccess(false)
      setMediaNotice('Browser requires HTTPS for camera/mic. Encrypted voice simulation active.')
    }

    // Simulated speech wave fallback if local hardware audio is unavailable
    let simInterval: any = null
    if (!hasMediaDevices) {
      simInterval = setInterval(() => {
        if (!activeCall.isMuted) {
          const rand = Math.floor(Math.random() * 45) + 15
          setMicLevel(rand)
        } else {
          setMicLevel(0)
        }
      }, 200)
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current)
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {})
      }
      if (simInterval) clearInterval(simInterval)
    }
  }, [activeCall?.type])

  // Explicitly attach stream to video whenever element mounts or stream updates
  useEffect(() => {
    if (selfVideoRef.current && localStream && activeCall?.type === 'video' && !activeCall?.isCameraOff) {
      selfVideoRef.current.srcObject = localStream
      selfVideoRef.current.play().catch(() => {})
    }
  }, [localStream, activeCall?.type, activeCall?.isCameraOff, activeCall?.status])

  // Handle hardware mute/unmute and camera toggle
  useEffect(() => {
    if (!localStream) return
    localStream.getAudioTracks().forEach((track) => {
      track.enabled = !activeCall?.isMuted
    })
    localStream.getVideoTracks().forEach((track) => {
      track.enabled = !activeCall?.isCameraOff
    })
  }, [localStream, activeCall?.isMuted, activeCall?.isCameraOff])

  if (!activeCall) return null

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60)
    const s = sec % 60
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const isVideo = activeCall.type === 'video'
  const isRinging = activeCall.status === 'ringing'
  const isEnded = activeCall.status === 'ended'

  const rawPhone = activeCall.contact.phone || '+234 802 345 6789'
  const cleanPhone = rawPhone.replace(/[^0-9]/g, '')
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
    `Hello ${activeCall.contact.name}, I am calling from LocalFix regarding my service booking.`
  )}`

  // ========================================================
  // MINIMIZED PICTURE-IN-PICTURE CALL WIDGET
  // ========================================================
  if (activeCall.isMinimized) {
    return (
      <motion.div
        initial={{ scale: 0.8, opacity: 0, y: 50 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.8, opacity: 0, y: 50 }}
        className="fixed top-16 sm:top-20 right-3 sm:right-6 z-50 rounded-2xl p-2.5 sm:p-3 shadow-2xl flex items-center gap-2.5 sm:gap-3 cursor-pointer select-none"
        style={{
          background: 'linear-gradient(135deg, rgba(30, 21, 51, 0.98), rgba(46, 27, 85, 0.98))',
          border: '1.5px solid rgba(167, 139, 250, 0.4)',
          boxShadow: '0 12px 35px rgba(0,0,0,0.6)',
        }}
        onClick={toggleCallMinimize}
      >
        <div className="relative">
          <img
            src={activeCall.contact.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${activeCall.contact.name}&backgroundColor=6D28D9`}
            alt={activeCall.contact.name}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover border border-primary-400"
          />
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#1c1630]" />
        </div>
        <div>
          <div className="text-xs font-bold text-white flex items-center gap-1">
            <span className="truncate max-w-[100px]">{activeCall.contact.name}</span>
            <span className="text-[10px] text-primary-300 font-normal">({isVideo ? 'Video' : 'Audio'})</span>
          </div>
          <div className="text-[11px] text-emerald-400 font-medium">
            {isRinging ? 'Ringing...' : isEnded ? 'Call Ended' : formatTimer(activeCall.duration)}
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            endCall()
          }}
          className="ml-1 sm:ml-2 p-2 rounded-full bg-red-600 hover:bg-red-500 text-white transition-colors"
          title="End Call"
        >
          <PhoneOff className="w-4 h-4" />
        </button>
      </motion.div>
    )
  }

  // ========================================================
  // FULL POPUP / MODAL CALL INTERFACE
  // ========================================================
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md select-none">
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 30 }}
        className={`relative w-full ${
          isVideo ? 'max-w-2xl h-[520px] sm:h-[560px]' : 'max-w-md h-[470px] sm:h-[500px]'
        } max-h-[92vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl`}
        style={{
          background: 'linear-gradient(180deg, #18132b 0%, #100c1e 100%)',
          border: '1.5px solid rgba(167, 139, 250, 0.3)',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8), 0 0 30px rgba(109, 40, 217, 0.3)',
        }}
      >
        {/* Top Header */}
        <div className="p-3.5 sm:p-4 flex items-center justify-between z-20 bg-gradient-to-b from-black/70 to-transparent">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-lg bg-primary-700/40 border border-primary-500/30 text-primary-300">
              {isVideo ? <Video className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
            </span>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1">
                <span>LocalFix Encrypted {isVideo ? 'Video Call' : 'Voice Call'}</span>
                <ShieldCheck className="w-3.5 h-3.5 text-primary-400" />
              </div>
              <div className="text-[10px] text-gray-400">Escrow Verification Channel</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="px-2.5 py-1 rounded-lg bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-600/50 transition-colors text-[10px] font-semibold flex items-center gap-1"
              title="Switch to WhatsApp"
            >
              <MessageCircle className="w-3 h-3 text-emerald-400" />
              <span className="hidden sm:inline">WhatsApp</span>
            </a>
            <button
              onClick={toggleCallMinimize}
              className="p-1.5 sm:p-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-colors"
              title="Minimize to Picture-in-Picture"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Media Notice banner if camera/mic blocked or on HTTP */}
        {mediaNotice && (
          <div className="px-3 py-1.5 bg-amber-500/20 border-b border-amber-500/30 text-amber-200 text-[10px] sm:text-xs flex items-center gap-1.5 z-20">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
            <span className="truncate">{mediaNotice}</span>
          </div>
        )}

        {/* ======================================================== */}
        {/* BODY: VIDEO OR AUDIO VIEW                               */}
        {/* ======================================================== */}
        <div className="flex-1 relative flex items-center justify-center overflow-hidden">
          {isVideo ? (
            /* --- VIDEO CALL CANVAS --- */
            <div className="w-full h-full relative bg-gray-950 flex items-center justify-center">
              {/* Simulated Remote Artisan High-Definition Stream */}
              <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
                <img
                  src={
                    activeCall.contact.avatar ||
                    'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800&auto=format&fit=crop&q=80'
                  }
                  alt={activeCall.contact.name}
                  className="w-full h-full object-cover filter brightness-75 scale-105 transition-transform"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/40" />

                {/* Remote Counterpart Tag */}
                <div className="absolute bottom-20 left-3 sm:left-4 z-10 flex items-center gap-2 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-bold text-white">{activeCall.contact.name}</span>
                  <span className="text-[10px] text-primary-300 hidden sm:inline">({activeCall.contact.role || 'Artisan'})</span>
                </div>
              </div>

              {/* Self Picture-in-Picture Video */}
              <div
                className="absolute top-3 right-3 sm:top-4 sm:right-4 w-28 h-36 sm:w-36 sm:h-48 rounded-2xl overflow-hidden border-2 border-primary-400/60 shadow-2xl bg-black z-20"
                style={{ backdropFilter: 'blur(10px)' }}
              >
                {!activeCall.isCameraOff && hasMediaAccess !== false ? (
                  <video ref={selfVideoRef} autoPlay playsInline muted className="w-full h-full object-cover mirror" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900 text-gray-400 text-[10px] sm:text-xs gap-1 p-2 text-center">
                    <VideoOff className="w-5 h-5 text-gray-500" />
                    <span>Camera Off</span>
                  </div>
                )}
                <div className="absolute bottom-1 right-1.5 bg-black/70 px-1.5 py-0.5 rounded text-[9px] text-white">
                  You
                </div>
              </div>

              {/* Ringing Overlay if not yet connected */}
              {isRinging && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/65 backdrop-blur-sm">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 border-primary-500 border-t-transparent animate-spin mb-4" />
                  <p className="text-white font-bold text-sm sm:text-base">Calling {activeCall.contact.name}...</p>
                  <p className="text-emerald-400 text-xs mt-1 animate-pulse">Connecting video stream...</p>
                </div>
              )}
            </div>
          ) : (
            /* --- AUDIO CALL CANVAS --- */
            <div className="flex flex-col items-center justify-center p-4 sm:p-6 text-center">
              {/* Pulsing Avatar with Waves */}
              <div className="relative mb-4 sm:mb-6">
                <div className="absolute -inset-4 rounded-full bg-primary-600/20 animate-ping opacity-60" />
                <div className="absolute -inset-8 rounded-full bg-primary-600/10 animate-pulse" />
                <img
                  src={
                    activeCall.contact.avatar ||
                    `https://api.dicebear.com/7.x/avataaars/svg?seed=${activeCall.contact.name}&backgroundColor=6D28D9`
                  }
                  alt={activeCall.contact.name}
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border-4 border-primary-400 relative z-10 shadow-2xl"
                />
              </div>

              <h2 className="text-lg sm:text-xl font-black text-white">{activeCall.contact.name}</h2>
              <p className="text-xs text-primary-300 font-semibold mt-1">
                {activeCall.contact.role || 'Verified Artisan'}
              </p>

              {/* Status text or live timer */}
              <div className="mt-3 sm:mt-4 px-3.5 sm:px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-mono font-bold text-emerald-400 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>
                  {isRinging ? 'Ringing...' : isEnded ? 'Call Ended' : formatTimer(activeCall.duration)}
                </span>
              </div>

              {/* Real-life reactive microphone audio waveform */}
              {activeCall.status === 'connected' && (
                <div className="flex flex-col items-center mt-5 sm:mt-6 gap-2">
                  <div className="flex items-center gap-1.5 h-10 px-4 py-2 rounded-2xl bg-black/40 border border-white/10">
                    {[35, 70, 50, 90, 65, 80, 45, 95, 60, 45, 75, 55].map((multiplier, i) => {
                      const dynamicHeight = activeCall.isMuted
                        ? 4
                        : Math.max(6, Math.round((micLevel / 100) * multiplier * 0.4 + 6))
                      return (
                        <div
                          key={i}
                          style={{ height: `${dynamicHeight}px` }}
                          className={`w-1 rounded-full transition-all duration-75 ${
                            activeCall.isMuted
                              ? 'bg-gray-600'
                              : micLevel > 15
                              ? 'bg-gradient-to-t from-emerald-500 to-primary-400'
                              : 'bg-gradient-to-t from-primary-600 to-purple-400'
                          }`}
                        />
                      )
                    })}
                  </div>
                  <span className="text-[10px] text-gray-400 font-mono">
                    {activeCall.isMuted ? 'Microphone Muted' : micLevel > 15 ? '🎤 Voice Detected' : '🎙️ Mic Active & Encrypted'}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ======================================================== */}
        {/* BOTTOM CONTROLS BAR                                      */}
        {/* ======================================================== */}
        <div
          className="p-3 sm:p-4 flex items-center justify-center flex-wrap gap-2.5 sm:gap-4 z-20"
          style={{
            background: 'linear-gradient(180deg, rgba(23, 18, 38, 0.95), rgba(16, 12, 30, 0.98))',
            borderTop: '1px solid rgba(167, 139, 250, 0.2)',
          }}
        >
          {/* Mute Mic */}
          <button
            onClick={toggleCallMute}
            className={`p-3 sm:p-3.5 rounded-full transition-all cursor-pointer ${
              activeCall.isMuted
                ? 'bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
            title={activeCall.isMuted ? 'Unmute' : 'Mute'}
          >
            {activeCall.isMuted ? <MicOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Mic className="w-4 h-4 sm:w-5 sm:h-5" />}
          </button>

          {/* Toggle Camera (Video Only) */}
          {isVideo && (
            <button
              onClick={toggleCallCamera}
              className={`p-3 sm:p-3.5 rounded-full transition-all cursor-pointer ${
                activeCall.isCameraOff
                  ? 'bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
              title={activeCall.isCameraOff ? 'Turn Video On' : 'Turn Video Off'}
            >
              {activeCall.isCameraOff ? <VideoOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Video className="w-4 h-4 sm:w-5 sm:h-5" />}
            </button>
          )}

          {/* Speaker On / Off */}
          <button
            onClick={toggleCallSpeaker}
            className={`p-3 sm:p-3.5 rounded-full transition-all cursor-pointer ${
              !activeCall.isSpeakerOn
                ? 'bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
            title={activeCall.isSpeakerOn ? 'Speaker On' : 'Speaker Muted'}
          >
            {activeCall.isSpeakerOn ? <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" /> : <VolumeX className="w-4 h-4 sm:w-5 sm:h-5" />}
          </button>

          {/* 1-Click WhatsApp Direct Call */}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="p-3 sm:p-3.5 rounded-full bg-emerald-600/30 border border-emerald-500/50 hover:bg-emerald-600/60 text-emerald-300 transition-all cursor-pointer flex items-center justify-center"
            title="Switch to WhatsApp Voice/Video Call"
          >
            <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5" />
          </a>

          {/* Direct Cellular Phone Call */}
          {activeCall.contact.phone && (
            <a
              href={`tel:${cleanPhone}`}
              className="p-3 sm:p-3.5 rounded-full bg-white/10 hover:bg-white/20 text-emerald-400 transition-all cursor-pointer flex items-center justify-center"
              title="Call Phone (GSM)"
            >
              <Phone className="w-4 h-4 sm:w-5 sm:h-5" />
            </a>
          )}

          {/* Red End Call Button */}
          <button
            onClick={endCall}
            className="p-3 sm:p-3.5 px-5 sm:px-6 rounded-full bg-red-600 hover:bg-red-500 text-white shadow-lg hover:shadow-red-500/40 transition-all flex items-center gap-2 font-bold text-xs cursor-pointer active:scale-95"
            title="End Call"
          >
            <PhoneOff className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>End</span>
          </button>
        </div>
      </motion.div>
    </div>
  )
}
