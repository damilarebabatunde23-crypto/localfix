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
} from 'lucide-react'
import { useChatStore } from '@/stores/useChatStore'

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
  const selfVideoRef = useRef<HTMLVideoElement>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animFrameRef = useRef<number | null>(null)

  // Call timer effect
  useEffect(() => {
    if (!activeCall) return

    // Transition from 'ringing' to 'connected' after 2.0 seconds
    const ringTimeout = setTimeout(() => {
      if (activeCall.status === 'ringing') {
        useChatStore.setState((s) => ({
          activeCall: s.activeCall ? { ...s.activeCall, status: 'connected' } : null,
        }))
      }
    }, 2000)

    const timer = setInterval(() => {
      if (activeCall?.status === 'connected') {
        setCallDuration(activeCall.duration + 1)
      }
    }, 1000)

    return () => {
      clearTimeout(ringTimeout)
      clearInterval(timer)
    }
  }, [activeCall?.status, activeCall?.duration])

  // Request real device media stream (camera + mic)
  useEffect(() => {
    if (!activeCall) return

    let stream: MediaStream | null = null
    const needsVideo = activeCall.type === 'video'

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({
          video: needsVideo ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } : false,
          audio: true,
        })
        .then((s) => {
          stream = s
          setLocalStream(s)
          if (selfVideoRef.current && needsVideo) {
            selfVideoRef.current.srcObject = s
          }

          // Setup real Web Audio API Analyzer to visualize live mic speech!
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
            // Audio context permission or fallback
          }
        })
        .catch(() => {
          // Camera/mic blocked or unavailable; fallback cleanly
        })
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
    }
  }, [activeCall?.type])

  // Handle hardware mute/unmute and camera toggle
  useEffect(() => {
    if (!localStream) return
    // Mute/unmute audio tracks
    localStream.getAudioTracks().forEach((track) => {
      track.enabled = !activeCall?.isMuted
    })
    // Enable/disable video tracks
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

  // ========================================================
  // MINIMIZED PICTURE-IN-PICTURE CALL WIDGET
  // ========================================================
  if (activeCall.isMinimized) {
    return (
      <motion.div
        initial={{ scale: 0.8, opacity: 0, y: 50 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.8, opacity: 0, y: 50 }}
        className="fixed top-20 right-6 z-50 rounded-2xl p-3 shadow-2xl flex items-center gap-3 cursor-pointer select-none"
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
            className="w-10 h-10 rounded-full object-cover border border-primary-400"
          />
          <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#1c1630]" />
        </div>
        <div>
          <div className="text-xs font-bold text-white flex items-center gap-1">
            <span>{activeCall.contact.name}</span>
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
          className="ml-2 p-2 rounded-full bg-red-600 hover:bg-red-500 text-white transition-colors"
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none">
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 30 }}
        className={`relative w-full ${
          isVideo ? 'max-w-2xl h-[560px]' : 'max-w-md h-[490px]'
        } rounded-3xl overflow-hidden flex flex-col shadow-2xl`}
        style={{
          background: 'linear-gradient(180deg, #18132b 0%, #100c1e 100%)',
          border: '1.5px solid rgba(167, 139, 250, 0.3)',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8), 0 0 30px rgba(109, 40, 217, 0.3)',
        }}
      >
        {/* Top Header */}
        <div className="p-4 flex items-center justify-between z-20 bg-gradient-to-b from-black/60 to-transparent">
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

          <button
            onClick={toggleCallMinimize}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-colors"
            title="Minimize to Picture-in-Picture"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
        </div>

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
                <div className="absolute bottom-20 left-4 z-10 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-bold text-white">{activeCall.contact.name}</span>
                  <span className="text-[10px] text-primary-300">({activeCall.contact.role || 'Artisan'})</span>
                </div>
              </div>

              {/* Self Picture-in-Picture Video */}
              <div
                className="absolute top-4 right-4 w-36 h-48 rounded-2xl overflow-hidden border-2 border-primary-400/60 shadow-2xl bg-black z-20"
                style={{ backdropFilter: 'blur(10px)' }}
              >
                {!activeCall.isCameraOff ? (
                  <video ref={selfVideoRef} autoPlay playsInline muted className="w-full h-full object-cover mirror" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900 text-gray-400 text-xs gap-1">
                    <VideoOff className="w-6 h-6 text-gray-500" />
                    <span>Camera Off</span>
                  </div>
                )}
                <div className="absolute bottom-1 right-1.5 bg-black/70 px-1.5 py-0.5 rounded text-[9px] text-white">
                  You
                </div>
              </div>

              {/* Ringing Overlay if not yet connected */}
              {isRinging && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
                  <div className="w-20 h-20 rounded-full border-4 border-primary-500 border-t-transparent animate-spin mb-4" />
                  <p className="text-white font-bold text-base">Calling {activeCall.contact.name}...</p>
                  <p className="text-gray-400 text-xs mt-1">Connecting video feed...</p>
                </div>
              )}
            </div>
          ) : (
            /* --- AUDIO CALL CANVAS --- */
            <div className="flex flex-col items-center justify-center p-6 text-center">
              {/* Pulsing Avatar with Waves */}
              <div className="relative mb-6">
                <div className="absolute -inset-4 rounded-full bg-primary-600/20 animate-ping opacity-60" />
                <div className="absolute -inset-8 rounded-full bg-primary-600/10 animate-pulse" />
                <img
                  src={
                    activeCall.contact.avatar ||
                    `https://api.dicebear.com/7.x/avataaars/svg?seed=${activeCall.contact.name}&backgroundColor=6D28D9`
                  }
                  alt={activeCall.contact.name}
                  className="w-28 h-28 rounded-full object-cover border-4 border-primary-400 relative z-10 shadow-2xl"
                />
              </div>

              <h2 className="text-xl font-black text-white">{activeCall.contact.name}</h2>
              <p className="text-xs text-primary-300 font-semibold mt-1">
                {activeCall.contact.role || 'Verified Artisan'}
              </p>

              {/* Status text or live timer */}
              <div className="mt-4 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-mono font-bold text-emerald-400 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>
                  {isRinging ? 'Ringing...' : isEnded ? 'Call Ended' : formatTimer(activeCall.duration)}
                </span>
              </div>

              {/* Real-life reactive microphone audio waveform */}
              {activeCall.status === 'connected' && (
                <div className="flex flex-col items-center mt-6 gap-2">
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
          className="p-4 flex items-center justify-center gap-4 z-20"
          style={{
            background: 'linear-gradient(180deg, rgba(23, 18, 38, 0.95), rgba(16, 12, 30, 0.98))',
            borderTop: '1px solid rgba(167, 139, 250, 0.2)',
          }}
        >
          {/* Mute Mic */}
          <button
            onClick={toggleCallMute}
            className={`p-3.5 rounded-full transition-all cursor-pointer ${
              activeCall.isMuted
                ? 'bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
            title={activeCall.isMuted ? 'Unmute' : 'Mute'}
          >
            {activeCall.isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Toggle Camera (Video Only) */}
          {isVideo && (
            <button
              onClick={toggleCallCamera}
              className={`p-3.5 rounded-full transition-all cursor-pointer ${
                activeCall.isCameraOff
                  ? 'bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
              title={activeCall.isCameraOff ? 'Turn Video On' : 'Turn Video Off'}
            >
              {activeCall.isCameraOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
            </button>
          )}

          {/* Speaker On / Off */}
          <button
            onClick={toggleCallSpeaker}
            className={`p-3.5 rounded-full transition-all cursor-pointer ${
              !activeCall.isSpeakerOn
                ? 'bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
            title={activeCall.isSpeakerOn ? 'Speaker On' : 'Speaker Muted'}
          >
            {activeCall.isSpeakerOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>

          {/* Red End Call Button */}
          <button
            onClick={endCall}
            className="p-3.5 px-6 rounded-full bg-red-600 hover:bg-red-500 text-white shadow-lg hover:shadow-red-500/40 transition-all flex items-center gap-2 font-bold text-xs cursor-pointer active:scale-95"
            title="End Call"
          >
            <PhoneOff className="w-5 h-5" />
            <span>End Call</span>
          </button>
        </div>
      </motion.div>
    </div>
  )
}
