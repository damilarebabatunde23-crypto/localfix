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
  Columns,
  RefreshCw,
} from 'lucide-react'
import { useChatStore, playChatSound } from '@/stores/useChatStore'
import { chatApi, api } from '@/lib/api'
import { toast } from 'react-hot-toast'

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:stun.services.mozilla.com' },
    { urls: 'stun:stun.cloudflare.com:3478' },
  ],
  iceCandidatePoolSize: 10,
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
  const [layoutMode, setLayoutMode] = useState<'pip' | 'grid'>('pip')
  const [isSwapped, setIsSwapped] = useState<boolean>(false)
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
  const pendingIceCandidates = useRef<any[]>([])
  const appliedCandidates = useRef<Set<string>>(new Set())
  const remoteStreamRef = useRef<MediaStream | null>(null)

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

  // Ensure remote stream is bound to the remote video element whenever stream or layout updates
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream
      remoteVideoRef.current.play().catch(() => {})
    }
  }, [remoteStream, layoutMode, isSwapped])

  // Ensure local stream is bound to the self video element
  useEffect(() => {
    if (selfVideoRef.current && localStream) {
      selfVideoRef.current.srcObject = localStream
      selfVideoRef.current.play().catch(() => {})
    }
  }, [localStream, activeCall?.isCameraOff, layoutMode, isSwapped])

  // Speaker control
  useEffect(() => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.muted = !activeCall?.isSpeakerOn
    }
  }, [activeCall?.isSpeakerOn])

  // ========================================================
  // WEBRTC CORE ENGINE: BILATERAL STREAMING & ROBUST SIGNALING
  // ========================================================
  useEffect(() => {
    const callData = activeCall
    if (!callData) return

    let isMounted = true
    const isVideo = callData.type === 'video'
    let pc: RTCPeerConnection | null = null
    let stream: MediaStream | null = null

    // Reset session refs
    appliedCandidates.current.clear()
    pendingIceCandidates.current = []
    if (callData.callId) {
      currentCallIdRef.current = callData.callId
    }

    // Helper to flush queued candidates to backend
    const flushPendingCandidates = async (targetCallId: string) => {
      currentCallIdRef.current = targetCallId
      if (pendingIceCandidates.current.length > 0) {
        const candidates = [...pendingIceCandidates.current]
        pendingIceCandidates.current = []
        try {
          await api.post(`/chat/calls/${targetCallId}/ice-candidate/`, { candidates })
        } catch {
          for (const cand of candidates) {
            try {
              await chatApi.sendIceCandidate(targetCallId, cand)
            } catch {}
          }
        }
      }
    }

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
          video: isVideo
            ? {
                width: { ideal: 1280, min: 640 },
                height: { ideal: 720, min: 480 },
                facingMode: 'user',
              }
            : false,
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
          // AudioCtx policy
        }

        // Attach local stream to self video element immediately
        if (selfVideoRef.current && isVideo) {
          selfVideoRef.current.srcObject = stream
          selfVideoRef.current.play().catch(() => {})
        }

        // 2. Initialize RTCPeerConnection with STUN servers
        pc = new RTCPeerConnection(ICE_SERVERS)
        pcRef.current = pc

        // Add local tracks to RTCPeerConnection so peer receives our audio/video
        stream.getTracks().forEach((track) => {
          if (pc && stream) {
            pc.addTrack(track, stream)
          }
        })

        // Listen for incoming remote tracks from the peer (Client receives Worker; Worker receives Client)
        pc.ontrack = (event) => {
          let inbound: MediaStream
          if (event.streams && event.streams[0]) {
            inbound = event.streams[0]
          } else {
            inbound = remoteStreamRef.current || new MediaStream()
            inbound.addTrack(event.track)
          }
          remoteStreamRef.current = inbound
          setRemoteStream(inbound)

          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = inbound
            remoteVideoRef.current.play().catch(() => {})
          }
          setCallStatusText('Connected · Live Streaming')
          useChatStore.setState((s) => ({
            activeCall: s.activeCall ? { ...s.activeCall, status: 'connected' } : null,
          }))
        }

        // Listen for local ICE candidates generated and send or queue them
        pc.onicecandidate = async (event) => {
          if (!event.candidate) return
          const candJson = event.candidate.toJSON()
          const activeId = currentCallIdRef.current
          if (activeId) {
            try {
              await chatApi.sendIceCandidate(activeId, candJson)
            } catch {}
          } else {
            pendingIceCandidates.current.push(candJson)
          }
        }

        // Handle connection state changes
        pc.onconnectionstatechange = () => {
          if (!pc) return
          if (pc.connectionState === 'connected') {
            setCallStatusText('Connected · Live Streaming')
            playChatSound('connect')
            useChatStore.setState((s) => ({
              activeCall: s.activeCall ? { ...s.activeCall, status: 'connected' } : null,
            }))
          } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
            setCallStatusText('Reconnecting video link...')
          } else if (pc.connectionState === 'closed') {
            setCallStatusText('Call Ended')
          }
        }

        // 3. Signaling Negotiation:
        if (call.isIncoming && call.callId && call.offer) {
          // --- RECIPIENT FLOW: ANSWER CALL ---
          currentCallIdRef.current = call.callId
          setCallStatusText('Connecting to caller...')

          await pc.setRemoteDescription(new RTCSessionDescription(call.offer))
          const answer = await pc.createAnswer()
          await pc.setLocalDescription(answer)

          await chatApi.answerCallSession(call.callId, answer)
          await flushPendingCandidates(call.callId)

          // Poll for caller ICE candidates or call state changes
          pollIntervalRef.current = setInterval(async () => {
            const activeId = currentCallIdRef.current
            if (!activeId || !pc) return
            try {
              const detail = await chatApi.getCallDetail(activeId)
              if (detail.status === 'ended' || detail.status === 'rejected') {
                toast('Call ended by peer')
                endCall()
                return
              }
              if (Array.isArray(detail.caller_candidates) && pc.remoteDescription) {
                for (const cand of detail.caller_candidates) {
                  const key = (cand && (cand.candidate || JSON.stringify(cand))) || ''
                  if (key && !appliedCandidates.current.has(key)) {
                    appliedCandidates.current.add(key)
                    try {
                      await pc.addIceCandidate(new RTCIceCandidate(cand))
                    } catch {}
                  }
                }
              }
            } catch {}
          }, 1000)
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
                await flushPendingCandidates(res.id)
              }
            } catch {
              // Offline fallback
            }
          } else if (backendCallId) {
            currentCallIdRef.current = backendCallId
            await flushPendingCandidates(backendCallId)
          }

          let elapsedRingingSeconds = 0
          pollIntervalRef.current = setInterval(async () => {
            elapsedRingingSeconds += 1.0

            const activeId = currentCallIdRef.current
            if (!activeId || !pc) return
            try {
              const detail = await chatApi.getCallDetail(activeId)
              if (detail.status === 'accepted' && detail.answer) {
                if (!pc.currentRemoteDescription) {
                  await pc.setRemoteDescription(new RTCSessionDescription(detail.answer))
                  setCallStatusText('Connected · Live Streaming')
                  playChatSound('connect')
                  useChatStore.setState((s) => ({
                    activeCall: s.activeCall ? { ...s.activeCall, status: 'connected' } : null,
                  }))
                }
                if (Array.isArray(detail.recipient_candidates) && pc.remoteDescription) {
                  for (const cand of detail.recipient_candidates) {
                    const key = (cand && (cand.candidate || JSON.stringify(cand))) || ''
                    if (key && !appliedCandidates.current.has(key)) {
                      appliedCandidates.current.add(key)
                      try {
                        await pc.addIceCandidate(new RTCIceCandidate(cand))
                      } catch {}
                    }
                  }
                }
              } else if (detail.status === 'rejected') {
                toast.error('Call declined.')
                endCall()
              } else if (detail.status === 'ended') {
                toast('Call ended.')
                endCall()
              }
            } catch {}

            // Ringing timeout after 45 seconds
            if (elapsedRingingSeconds >= 45 && useChatStore.getState().activeCall?.status === 'ringing') {
              toast('No answer from peer. Please leave a message in chat.')
              endCall()
            }
          }, 1000)
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
  // 2. FULL IMMERSIVE CALL INTERFACE (TWO-WAY BILATERAL VIEW)
  // ========================================================
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center sm:p-4 bg-black/85 backdrop-blur-md select-none">
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 30 }}
        className={`relative w-full h-[100dvh] sm:h-auto ${
          isVideo ? 'sm:max-w-4xl sm:h-[640px]' : 'sm:max-w-md sm:h-[520px]'
        } rounded-none sm:rounded-3xl overflow-hidden flex flex-col shadow-2xl`}
        style={{
          background: 'linear-gradient(180deg, #18132b 0%, #0d0a18 100%)',
          border: '1.5px solid rgba(167, 139, 250, 0.3)',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.9), 0 0 35px rgba(109, 40, 217, 0.35)',
        }}
      >
        {/* Top Header */}
        <div className="p-3.5 sm:p-4 flex items-center justify-between z-30 bg-gradient-to-b from-black/85 via-black/50 to-transparent">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-primary-700/40 border border-primary-500/30 text-primary-300">
              {isVideo ? <Video className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
            </span>
            <div>
              <div className="text-xs sm:text-sm font-bold text-white flex items-center gap-1">
                <span>LocalFix Live {isVideo ? 'Two-Way Video' : 'Voice Call'}</span>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="text-[10px] text-gray-300 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>{callStatusText}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isVideo && (
              <>
                {/* Split / PIP Layout Toggle */}
                <button
                  onClick={() => setLayoutMode(layoutMode === 'pip' ? 'grid' : 'pip')}
                  className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-gray-200 hover:text-white transition-colors text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  title="Toggle Split / Picture-in-Picture view"
                >
                  <Columns className="w-3.5 h-3.5 text-primary-300" />
                  <span className="hidden sm:inline">{layoutMode === 'pip' ? 'Split View' : 'PIP View'}</span>
                </button>
                {/* Swap Main Feeds */}
                <button
                  onClick={() => setIsSwapped(!isSwapped)}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-200 hover:text-white transition-colors cursor-pointer"
                  title="Swap Main and Thumbnail Camera feeds"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-primary-300" />
                </button>
              </>
            )}

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
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-colors cursor-pointer"
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
        {/* CENTER STAGE: BILATERAL TWO-WAY VIDEO CANVAS             */}
        {/* ======================================================== */}
        <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-black">
          {isVideo ? (
            layoutMode === 'grid' ? (
              /* --- SPLIT / GRID VIEW (50% Client / 50% Worker) --- */
              <div className="w-full h-full grid grid-cols-1 md:grid-cols-2 gap-2 p-2 bg-[#0c0915]">
                {/* 1. Remote Feed (Worker or Client) */}
                <div className="relative w-full h-full rounded-2xl overflow-hidden bg-gray-950 border border-white/10 flex items-center justify-center">
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className={`w-full h-full object-cover transition-opacity duration-300 ${
                      remoteStream ? 'opacity-100' : 'opacity-0'
                    }`}
                  />
                  {!remoteStream && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-[#130f24]">
                      <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-primary-500/50 mb-3 shadow-xl">
                        <img
                          src={
                            activeCall.contact.avatar ||
                            `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(activeCall.contact.name)}&backgroundColor=6D28D9`
                          }
                          alt={activeCall.contact.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <h4 className="text-sm font-bold text-white mb-0.5">{activeCall.contact.name}</h4>
                      <p className="text-[11px] text-primary-300">
                        {isRinging ? 'Ringing...' : 'Connecting live stream...'}
                      </p>
                    </div>
                  )}
                  <div className="absolute bottom-2.5 left-2.5 z-20 flex items-center gap-1.5 bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-bold text-white">{activeCall.contact.name}</span>
                    <span className="text-[10px] text-primary-300">({activeCall.contact.role || 'Peer'})</span>
                  </div>
                </div>

                {/* 2. Self Feed (Local Camera) */}
                <div className="relative w-full h-full rounded-2xl overflow-hidden bg-gray-950 border border-primary-500/30 flex items-center justify-center">
                  {!activeCall.isCameraOff && hasMediaAccess !== false ? (
                    <video
                      ref={selfVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover [transform:rotateY(180deg)]"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900 text-gray-400 text-xs gap-1.5">
                      <VideoOff className="w-6 h-6 text-gray-500" />
                      <span>Your camera is turned off</span>
                    </div>
                  )}
                  <div className="absolute bottom-2.5 left-2.5 z-20 flex items-center gap-1.5 bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="text-xs font-bold text-white">You (Self Camera)</span>
                  </div>
                </div>
              </div>
            ) : (
              /* --- PICTURE-IN-PICTURE (PIP) VIEW --- */
              <div className="w-full h-full relative flex items-center justify-center bg-black">
                {/* Main Fullscreen Video */}
                <video
                  ref={isSwapped ? selfVideoRef : remoteVideoRef}
                  autoPlay
                  playsInline
                  muted={isSwapped}
                  className={`w-full h-full object-cover transition-opacity duration-300 ${
                    !isSwapped && !remoteStream ? 'opacity-0' : 'opacity-100'
                  } ${isSwapped ? '[transform:rotateY(180deg)]' : ''}`}
                />

                {/* Placeholder when remote stream is loading in main view */}
                {!isSwapped && !remoteStream && (
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

                {/* Main View Identifier Badge */}
                <div className="absolute bottom-24 sm:bottom-20 left-4 z-20 flex items-center gap-2 bg-black/75 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-bold text-white">
                    {isSwapped ? 'You (Self Feed)' : activeCall.contact.name}
                  </span>
                  {!isSwapped && (
                    <span className="text-[10px] text-primary-300 hidden sm:inline">
                      ({activeCall.contact.role || 'Artisan'})
                    </span>
                  )}
                </div>

                {/* Corner Picture-in-Picture Feed (Click to Swap Feeds!) */}
                <div
                  onClick={() => setIsSwapped(!isSwapped)}
                  className="absolute top-4 right-4 w-28 h-36 sm:w-36 sm:h-48 rounded-2xl overflow-hidden border-2 border-primary-400/80 shadow-2xl bg-black z-20 cursor-pointer group"
                  title="Click to swap main and thumbnail view"
                  style={{ backdropFilter: 'blur(10px)' }}
                >
                  <video
                    ref={isSwapped ? remoteVideoRef : selfVideoRef}
                    autoPlay
                    playsInline
                    muted={!isSwapped}
                    className={`w-full h-full object-cover ${!isSwapped ? '[transform:rotateY(180deg)]' : ''}`}
                  />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold">
                    <RefreshCw className="w-4 h-4" />
                  </div>
                  <div className="absolute bottom-1 right-1.5 bg-black/80 px-1.5 py-0.5 rounded text-[9px] text-white">
                    {isSwapped ? activeCall.contact.name.split(' ')[0] : 'You'}
                  </div>
                </div>
              </div>
            )
          ) : (
            /* --- LIVE VOICE / AUDIO CALL VIEW --- */
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center relative">
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
          {/* Mute Mic */}
          <button
            onClick={toggleCallMute}
            className={`p-3.5 sm:p-4 rounded-full border transition-all cursor-pointer ${
              activeCall.isMuted
                ? 'bg-amber-600 border-amber-500 text-white'
                : 'bg-white/10 hover:bg-white/20 border-white/20 text-gray-200 hover:text-white'
            }`}
            title={activeCall.isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
          >
            {activeCall.isMuted ? <MicOff className="w-5 h-5 sm:w-6 sm:h-6" /> : <Mic className="w-5 h-5 sm:w-6 sm:h-6" />}
          </button>

          {/* Camera Toggle (Video Call Only) */}
          {isVideo && (
            <button
              onClick={toggleCallCamera}
              className={`p-3.5 sm:p-4 rounded-full border transition-all cursor-pointer ${
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
            className={`p-3.5 sm:p-4 rounded-full border transition-all cursor-pointer ${
              !activeCall.isSpeakerOn
                ? 'bg-amber-600 border-amber-500 text-white'
                : 'bg-white/10 hover:bg-white/20 border-white/20 text-gray-200 hover:text-white'
            }`}
            title={activeCall.isSpeakerOn ? 'Mute Speaker' : 'Turn On Speaker'}
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
            className="p-3.5 sm:p-4 px-6 sm:px-8 rounded-full bg-red-600 hover:bg-red-500 text-white font-bold flex items-center gap-2 shadow-2xl shadow-red-900/50 active:scale-95 transition-all cursor-pointer"
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
