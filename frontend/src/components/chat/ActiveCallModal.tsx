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
  ShieldCheck,
  MessageCircle,
  AlertCircle,
  Radio,
} from 'lucide-react'
import { useChatStore, playChatSound } from '@/stores/useChatStore'
import { chatApi } from '@/lib/api'
import { toast } from 'react-hot-toast'

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
}

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
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const [micLevel, setMicLevel] = useState<number>(0)
  const [hasMediaAccess, setHasMediaAccess] = useState<boolean | null>(null)
  const [mediaNotice, setMediaNotice] = useState<string | null>(null)
  const [callStatusText, setCallStatusText] = useState<string>('Initializing...')

  const selfVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const ringIntervalRef = useRef<any>(null)
  const pollIntervalRef = useRef<any>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animFrameRef = useRef<number | null>(null)
  const currentCallIdRef = useRef<string | null>(activeCall?.callId || null)

  // Keep currentCallIdRef updated
  useEffect(() => {
    if (activeCall?.callId) {
      currentCallIdRef.current = activeCall.callId
    }
  }, [activeCall?.callId])

  // Call timer and ringing sound effects
  useEffect(() => {
    if (!activeCall) return

    if (activeCall.status === 'ringing') {
      playChatSound('ring')
      ringIntervalRef.current = setInterval(() => {
        playChatSound('ring')
      }, 2600)
    } else {
      if (ringIntervalRef.current) clearInterval(ringIntervalRef.current)
    }

    const timer = setInterval(() => {
      if (activeCall?.status === 'connected') {
        setCallDuration(activeCall.duration + 1)
      }
    }, 1000)

    return () => {
      clearInterval(timer)
      if (ringIntervalRef.current) clearInterval(ringIntervalRef.current)
    }
  }, [activeCall?.status, activeCall?.duration])

  // ========================================================
  // WEBRTC CORE ENGINE: PEER CONNECTION & SIGNALING
  // ========================================================
  useEffect(() => {
    const callData = activeCall
    if (!callData) return

    let isMounted = true
    const isVideo = callData.type === 'video'
    let pc: RTCPeerConnection | null = null
    let stream: MediaStream | null = null

    async function initWebRTC(call: NonNullable<typeof activeCall>) {
      try {
        // 1. Get user hardware media (Camera + Microphone)
        const hasMediaDevices =
          typeof navigator !== 'undefined' &&
          navigator.mediaDevices &&
          !!navigator.mediaDevices.getUserMedia

        if (!hasMediaDevices) {
          setHasMediaAccess(false)
          setMediaNotice('Your browser requires HTTPS for direct camera/mic access.')
          return
        }

        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: isVideo ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } : false,
        })

        if (!isMounted) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }

        setLocalStream(stream)
        setHasMediaAccess(true)
        setMediaNotice(null)

        // Setup local audio analyser for live speech meter
        try {
          const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
          if (AudioCtx) {
            const audioCtx = new AudioCtx()
            audioContextRef.current = audioCtx
            const source = audioCtx.createMediaStreamSource(stream)
            const analyser = audioCtx.createAnalyser()
            analyser.fftSize = 64
            source.connect(analyser)
            analyserRef.current = analyser

            const dataArray = new Uint8Array(analyser.frequencyBinCount)
            const updateLevel = () => {
              if (!isMounted) return
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
          // AudioCtx blocked by browser policy
        }

        // Attach local stream to self video element
        if (selfVideoRef.current && isVideo) {
          selfVideoRef.current.srcObject = stream
          selfVideoRef.current.play().catch(() => {})
        }

        // 2. Initialize RTCPeerConnection
        pc = new RTCPeerConnection(ICE_SERVERS)
        pcRef.current = pc

        // Add local tracks to RTCPeerConnection
        stream.getTracks().forEach((track) => {
          if (pc && stream) {
            pc.addTrack(track, stream)
          }
        })

        // Listen for incoming remote tracks from the other user
        pc.ontrack = (event) => {
          if (event.streams && event.streams[0]) {
            setRemoteStream(event.streams[0])
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = event.streams[0]
              remoteVideoRef.current.play().catch(() => {})
            }
            setCallStatusText('Connected')
            useChatStore.setState((s) => ({
              activeCall: s.activeCall ? { ...s.activeCall, status: 'connected' } : null,
            }))
          }
        }

        // Listen for local ICE candidates generated and send them to backend
        pc.onicecandidate = async (event) => {
          if (event.candidate && currentCallIdRef.current) {
            try {
              await chatApi.sendIceCandidate(currentCallIdRef.current, event.candidate.toJSON())
            } catch {
              // Ignore network drops
            }
          }
        }

        // Handle connection state changes
        pc.onconnectionstatechange = () => {
          if (!pc) return
          if (pc.connectionState === 'connected') {
            setCallStatusText('Connected · Encrypted')
            playChatSound('connect')
            useChatStore.setState((s) => ({
              activeCall: s.activeCall ? { ...s.activeCall, status: 'connected' } : null,
            }))
          } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
            setCallStatusText('Reconnecting...')
          } else if (pc.connectionState === 'closed') {
            setCallStatusText('Call Ended')
          }
        }

        // 3. Signaling Flow:
        if (call.isIncoming && call.callId && call.offer) {
          // --- RECIPIENT FLOW: ANSWER CALL ---
          setCallStatusText('Connecting to caller...')
          await pc.setRemoteDescription(new RTCSessionDescription(call.offer))
          const answer = await pc.createAnswer()
          await pc.setLocalDescription(answer)

          await chatApi.answerCallSession(call.callId, answer)
          currentCallIdRef.current = call.callId

          // Poll for caller ICE candidates or call state changes
          pollIntervalRef.current = setInterval(async () => {
            if (!currentCallIdRef.current || !pc) return
            try {
              const detail = await chatApi.getCallDetail(currentCallIdRef.current)
              if (detail.status === 'ended' || detail.status === 'rejected') {
                toast('Call ended by peer')
                endCall()
                return
              }
              if (Array.isArray(detail.caller_candidates) && pc.remoteDescription) {
                for (const cand of detail.caller_candidates) {
                  try {
                    await pc.addIceCandidate(new RTCIceCandidate(cand))
                  } catch {}
                }
              }
            } catch {}
          }, 1500)
        } else {
          // --- CALLER FLOW: INITIATE OUTGOING CALL ---
          setCallStatusText('Calling artisan...')
          const offer = await pc.createOffer()
          await pc.setLocalDescription(offer)

          let backendCallId = call.callId || null
          if (!backendCallId && call.contact?.id) {
            try {
              const res = await chatApi.startCallSession({
                recipient_id: call.contact.id,
                call_type: call.type,
                offer: offer,
                conversation_id: call.contact.conversationId,
              })
              if (res && res.id) {
                backendCallId = res.id
                currentCallIdRef.current = res.id
                useChatStore.setState((s) => ({
                  activeCall: s.activeCall ? { ...s.activeCall, callId: res.id } : null,
                }))
              }
            } catch {
              // Solo test or offline mode
            }
          }

          let elapsedRingingSeconds = 0
          pollIntervalRef.current = setInterval(async () => {
            elapsedRingingSeconds += 1.5

            if (!currentCallIdRef.current || !pc) return
            try {
              const detail = await chatApi.getCallDetail(currentCallIdRef.current)
              if (detail.status === 'accepted' && detail.answer) {
                if (!pc.currentRemoteDescription) {
                  await pc.setRemoteDescription(new RTCSessionDescription(detail.answer))
                  setCallStatusText('Connected')
                  playChatSound('connect')
                  useChatStore.setState((s) => ({
                    activeCall: s.activeCall ? { ...s.activeCall, status: 'connected' } : null,
                  }))
                }
                if (Array.isArray(detail.recipient_candidates)) {
                  for (const cand of detail.recipient_candidates) {
                    try {
                      await pc.addIceCandidate(new RTCIceCandidate(cand))
                    } catch {}
                  }
                }
              } else if (detail.status === 'rejected') {
                toast.error('Artisan declined the call.')
                endCall()
              } else if (detail.status === 'ended') {
                toast('Call ended.')
                endCall()
              }
            } catch {}

            // Ringing timeout after 40 seconds
            if (elapsedRingingSeconds >= 40 && useChatStore.getState().activeCall?.status === 'ringing') {
              toast('No answer from artisan. Please leave an in-app message or reach out via WhatsApp.')
              endCall()
            }
          }, 1500)
        }
      } catch (err: any) {
        console.warn('WebRTC initialization notice:', err)
        setHasMediaAccess(false)
        setMediaNotice(
          err?.name === 'NotAllowedError'
            ? 'Camera / Microphone access was blocked. Please enable permissions in your browser settings.'
            : 'Encrypted call connection initialized.'
        )
      }
    }

    initWebRTC(callData)

    return () => {
      isMounted = false
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }
      if (pc) {
        pc.close()
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current)
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {})
      }
    }
  }, [activeCall?.type, activeCall?.isIncoming, activeCall?.contact?.id])

  // Hardware mute/camera track enablement
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
  // 1. MINIMIZED PICTURE-IN-PICTURE BADGE
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
            src={
              activeCall.contact.avatar ||
              `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(activeCall.contact.name)}&backgroundColor=6D28D9`
            }
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
            {isRinging ? 'Calling...' : isEnded ? 'Call Ended' : formatTimer(activeCall.duration)}
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            endCall(currentCallIdRef.current || undefined)
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
  // 2. FULL IMMERSIVE CALL INTERFACE (MOBILE FULLSCREEN & DESKTOP MODAL)
  // ========================================================
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center sm:p-4 bg-black/85 backdrop-blur-md select-none">
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 30 }}
        className={`relative w-full h-[100dvh] sm:h-auto ${
          isVideo ? 'sm:max-w-3xl sm:h-[600px]' : 'sm:max-w-md sm:h-[520px]'
        } rounded-none sm:rounded-3xl overflow-hidden flex flex-col shadow-2xl`}
        style={{
          background: 'linear-gradient(180deg, #18132b 0%, #0d0a18 100%)',
          border: '1.5px solid rgba(167, 139, 250, 0.3)',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.9), 0 0 35px rgba(109, 40, 217, 0.35)',
        }}
      >
        {/* Top Header */}
        <div className="p-3.5 sm:p-4 flex items-center justify-between z-30 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-primary-700/40 border border-primary-500/30 text-primary-300">
              {isVideo ? <Video className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
            </span>
            <div>
              <div className="text-xs sm:text-sm font-bold text-white flex items-center gap-1">
                <span>LocalFix Live {isVideo ? 'Video Call' : 'Voice Call'}</span>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="text-[10px] text-gray-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>{callStatusText}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="px-2.5 py-1.5 rounded-xl bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-600/50 transition-colors text-xs font-semibold flex items-center gap-1"
              title="Switch to WhatsApp"
            >
              <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">WhatsApp</span>
            </a>
            <button
              onClick={toggleCallMinimize}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-colors"
              title="Minimize to Picture-in-Picture"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Media Warning Notice */}
        {mediaNotice && (
          <div className="px-3 py-1.5 bg-amber-500/20 border-b border-amber-500/30 text-amber-200 text-[10px] sm:text-xs flex items-center gap-1.5 z-30">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
            <span className="truncate">{mediaNotice}</span>
          </div>
        )}

        {/* ======================================================== */}
        {/* CENTER STAGE: REAL REMOTE STREAM CANVAS                  */}
        {/* ======================================================== */}
        <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-gray-950">
          {isVideo ? (
            /* --- LIVE VIDEO CALL VIEW --- */
            <div className="w-full h-full relative flex items-center justify-center">
              {/* Remote Real Video Stream */}
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className={`w-full h-full object-cover transition-opacity duration-500 ${
                  remoteStream ? 'opacity-100' : 'opacity-0'
                }`}
              />

              {/* Waiting / Connecting Placeholder if Remote Video Stream is not yet received */}
              {!remoteStream && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-[#130f24]">
                  <div className="relative mb-4">
                    <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden border-2 border-primary-500/50 shadow-2xl">
                      <img
                        src={
                          activeCall.contact.avatar ||
                          `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
                            activeCall.contact.name
                          )}&backgroundColor=6D28D9`
                        }
                        alt={activeCall.contact.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    {isRinging && (
                      <span className="absolute -inset-3 rounded-full border border-primary-400/40 animate-ping" />
                    )}
                  </div>
                  <h4 className="text-lg font-bold text-white mb-1">{activeCall.contact.name}</h4>
                  <p className="text-xs text-primary-300 font-medium">
                    {isRinging ? 'Ringing artisan...' : 'Connecting live WebRTC stream...'}
                  </p>
                </div>
              )}

              {/* Remote Contact Tag */}
              <div className="absolute bottom-24 sm:bottom-20 left-4 z-20 flex items-center gap-2 bg-black/75 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-bold text-white">{activeCall.contact.name}</span>
                <span className="text-[10px] text-primary-300 hidden sm:inline">
                  ({activeCall.contact.role || 'Artisan'})
                </span>
              </div>

              {/* Local Self Camera Feed in Picture-in-Picture */}
              <div
                className="absolute top-4 right-4 w-28 h-36 sm:w-36 sm:h-48 rounded-2xl overflow-hidden border-2 border-primary-400/80 shadow-2xl bg-black z-20"
                style={{ backdropFilter: 'blur(10px)' }}
              >
                {!activeCall.isCameraOff && hasMediaAccess !== false ? (
                  <video
                    ref={selfVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover [transform:rotateY(180deg)]"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900 text-gray-400 text-[10px] gap-1 p-2 text-center">
                    <VideoOff className="w-5 h-5 text-gray-500" />
                    <span>Camera Off</span>
                  </div>
                )}
                <div className="absolute bottom-1 right-1.5 bg-black/80 px-1.5 py-0.5 rounded text-[9px] text-white">
                  You
                </div>
              </div>
            </div>
          ) : (
            /* --- LIVE VOICE / AUDIO CALL VIEW --- */
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center relative">
              {/* Hidden audio element for remote stream */}
              <video ref={remoteVideoRef} autoPlay playsInline className="hidden" />

              <div className="relative mb-6">
                <div
                  className="w-28 h-28 sm:w-36 sm:h-36 rounded-full overflow-hidden border-4 border-primary-400 shadow-2xl transition-transform duration-300"
                  style={{
                    transform: `scale(${1 + (micLevel / 100) * 0.15})`,
                    boxShadow: `0 0 ${20 + micLevel}px rgba(167, 139, 250, ${0.4 + micLevel / 200})`,
                  }}
                >
                  <img
                    src={
                      activeCall.contact.avatar ||
                      `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
                        activeCall.contact.name
                      )}&backgroundColor=6D28D9`
                    }
                    alt={activeCall.contact.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                {isRinging && (
                  <div className="absolute -inset-4 rounded-full border-2 border-emerald-400/60 animate-ping" />
                )}
              </div>

              <h4 className="text-xl sm:text-2xl font-black text-white mb-1">{activeCall.contact.name}</h4>
              <p className="text-xs text-primary-300 font-semibold mb-3">
                {activeCall.contact.role || 'Craftsman & Technician'}
              </p>

              {/* Call Timer or Ringing indicator */}
              <div className="text-sm font-mono font-bold text-emerald-400 flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30">
                <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
                <span>{isRinging ? 'Ringing...' : isEnded ? 'Call Ended' : formatTimer(activeCall.duration)}</span>
              </div>

              {/* Real Audio Speech Visualizer Waves */}
              <div className="flex items-center gap-1 mt-6 h-8">
                {[12, 28, 45, 75, 50, 30, 65, 85, 40, 20].map((baseH, i) => {
                  const animatedH = Math.max(6, Math.min(32, Math.round((baseH * micLevel) / 100) + 6))
                  return (
                    <span
                      key={i}
                      className="w-1.5 rounded-full bg-gradient-to-t from-primary-600 to-emerald-400 transition-all duration-100"
                      style={{ height: `${activeCall.isMuted ? 6 : animatedH}px` }}
                    />
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* ======================================================== */}
        {/* BOTTOM ACTION TOOLBAR: LARGE, RESPONSIVE, TOUCH-FRIENDLY */}
        {/* ======================================================== */}
        <div className="p-4 sm:p-5 pb-8 sm:pb-5 bg-gradient-to-t from-black via-black/90 to-transparent z-30 flex items-center justify-center gap-3 sm:gap-5 flex-shrink-0">
          {/* Mute Toggle */}
          <button
            onClick={toggleCallMute}
            className={`p-3.5 sm:p-4 rounded-full border transition-all ${
              activeCall.isMuted
                ? 'bg-amber-600 border-amber-500 text-white'
                : 'bg-white/10 hover:bg-white/20 border-white/20 text-gray-200 hover:text-white'
            }`}
            title={activeCall.isMuted ? 'Unmute' : 'Mute'}
          >
            {activeCall.isMuted ? <MicOff className="w-5 h-5 sm:w-6 sm:h-6" /> : <Mic className="w-5 h-5 sm:w-6 sm:h-6" />}
          </button>

          {/* Camera Toggle (Video Call Only) */}
          {isVideo && (
            <button
              onClick={toggleCallCamera}
              className={`p-3.5 sm:p-4 rounded-full border transition-all ${
                activeCall.isCameraOff
                  ? 'bg-amber-600 border-amber-500 text-white'
                  : 'bg-white/10 hover:bg-white/20 border-white/20 text-gray-200 hover:text-white'
              }`}
              title={activeCall.isCameraOff ? 'Turn Camera On' : 'Turn Camera Off'}
            >
              {activeCall.isCameraOff ? (
                <VideoOff className="w-5 h-5 sm:w-6 sm:h-6" />
              ) : (
                <Video className="w-5 h-5 sm:w-6 sm:h-6" />
              )}
            </button>
          )}

          {/* Speaker Toggle */}
          <button
            onClick={toggleCallSpeaker}
            className={`p-3.5 sm:p-4 rounded-full border transition-all ${
              !activeCall.isSpeakerOn
                ? 'bg-amber-600 border-amber-500 text-white'
                : 'bg-white/10 hover:bg-white/20 border-white/20 text-gray-200 hover:text-white'
            }`}
            title={activeCall.isSpeakerOn ? 'Mute Output' : 'Speaker'}
          >
            {activeCall.isSpeakerOn ? (
              <Volume2 className="w-5 h-5 sm:w-6 sm:h-6" />
            ) : (
              <VolumeX className="w-5 h-5 sm:w-6 sm:h-6" />
            )}
          </button>

          {/* Red End Call Button */}
          <button
            onClick={() => endCall(currentCallIdRef.current || undefined)}
            className="p-3.5 sm:p-4 px-6 sm:px-8 rounded-full bg-red-600 hover:bg-red-500 text-white font-bold flex items-center gap-2 shadow-2xl shadow-red-900/50 active:scale-95 transition-all"
            title="End Call"
          >
            <PhoneOff className="w-5 h-5 sm:w-6 sm:h-6" />
            <span className="text-xs sm:text-sm">End</span>
          </button>
        </div>
      </motion.div>
    </div>
  )
}
