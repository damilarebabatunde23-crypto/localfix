import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Heart, MessageSquare, Share2, Bookmark, Play, Pause,
  VolumeX, Volume2, ChevronUp, ChevronDown, Plus,
  Wrench, Send, MoreHorizontal, CheckCircle, TrendingUp,
  Users, Radio, Video, X, Sparkles, Upload, Film, Image as ImageIcon, Trash2,
  MapPin, Map, Navigation, Music2
} from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { useAppStore } from '@/stores/useAppStore'
import { feedApi, uploadApi } from '@/lib/api'
import toast from 'react-hot-toast'

const FEED_TABS = ['For You', 'Following', 'Nearby Repairs', 'Trending DIY', 'Official LocalFix']

const SKILL_CATEGORIES = [
  { name: 'Plumbing', icon: '🔧', clips: 340 },
  { name: 'Electrical', icon: '⚡', clips: 512 },
  { name: 'Carpentry', icon: '🪵', clips: 188 },
  { name: 'Finishing', icon: '🎨', clips: 210 },
]

const TRENDING_TOPICS = [
  '#PlumbingHacks', '#InverterSetup', '#LocalFix', '#DIYRepair', '#RoofSealant', '#TileGrouting',
]

const TOP_CRAFTSMEN: any[] = []
const DEFAULT_COMMENTS: any[] = []
const FALLBACK_VIDEOS: any[] = []

const LIKED_VIDEOS_STORAGE_KEY = 'localfix_feed_liked_videos'

function getLikedVideosSet(): Set<string> {
  try {
    const raw = localStorage.getItem(LIKED_VIDEOS_STORAGE_KEY)
    if (raw) {
      const arr = JSON.parse(raw)
      if (Array.isArray(arr)) return new Set(arr.map(String))
    }
  } catch {
    // ignore json parse error
  }
  return new Set<string>()
}

function saveLikedVideoId(id: string, liked: boolean) {
  try {
    const set = getLikedVideosSet()
    const idStr = String(id)
    if (liked) {
      set.add(idStr)
    } else {
      set.delete(idStr)
    }
    localStorage.setItem(LIKED_VIDEOS_STORAGE_KEY, JSON.stringify(Array.from(set)))
  } catch {
    // ignore storage error
  }
}

const LIKED_COMMENTS_STORAGE_KEY = 'localfix_feed_liked_comments'

function getLikedCommentsSet(): Set<string> {
  try {
    const raw = localStorage.getItem(LIKED_COMMENTS_STORAGE_KEY)
    if (raw) {
      const arr = JSON.parse(raw)
      if (Array.isArray(arr)) return new Set(arr.map(String))
    }
  } catch {
    // ignore
  }
  return new Set<string>()
}

function saveLikedCommentId(id: string, liked: boolean) {
  try {
    const set = getLikedCommentsSet()
    const idStr = String(id)
    if (liked) {
      set.add(idStr)
    } else {
      set.delete(idStr)
    }
    localStorage.setItem(LIKED_COMMENTS_STORAGE_KEY, JSON.stringify(Array.from(set)))
  } catch {
    // ignore
  }
}

function formatCount(n: number | undefined | null): string {
  if (n === undefined || n === null || isNaN(n)) return '0'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`
  return String(n)
}

function formatTime(secs: number | undefined | null): string {
  if (!secs || isNaN(secs)) return '0:00'
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function VideoFeedPage() {
  const navigate = useNavigate()
  const { locationName, user } = useAppStore()
  const [activeTab, setActiveTab] = useState('For You')
  const [isPlaying, setIsPlaying] = useState(true)
  const [isMuted, setIsMuted] = useState(false)
  const [commentText, setCommentText] = useState('')

  // Video state
  const [videos, setVideos] = useState<any[]>(() => {
    const localLiked = getLikedVideosSet()
    return FALLBACK_VIDEOS.map((v) => {
      const isVideoLiked = localLiked.has(String(v.id)) || Boolean(v.isLiked)
      return {
        ...v,
        isLiked: isVideoLiked,
        likes: v.likes + (isVideoLiked && !v.isLiked ? 1 : 0),
      }
    })
  })
  const [currentIndex, setCurrentIndex] = useState(0)
  const [comments, setComments] = useState<any[]>(() => {
    const localLikedComments = getLikedCommentsSet()
    return DEFAULT_COMMENTS.map((c) => {
      const isCommentLiked = localLikedComments.has(c.id)
      return {
        ...c,
        isLiked: isCommentLiked,
        likes: c.likes + (isCommentLiked ? 1 : 0),
      }
    })
  })
  const [isLiked, setIsLiked] = useState(() => {
    const localLiked = getLikedVideosSet()
    return localLiked.has(FALLBACK_VIDEOS[0]?.id || '') || Boolean(FALLBACK_VIDEOS[0]?.isLiked)
  })
  const [isSaved, setIsSaved] = useState(false)
  const [likesCount, setLikesCount] = useState(() => {
    const localLiked = getLikedVideosSet()
    const firstVid = FALLBACK_VIDEOS[0]
    const liked = localLiked.has(firstVid?.id || '') || Boolean(firstVid?.isLiked)
    return (firstVid?.likes || 14200) + (liked && !firstVid?.isLiked ? 1 : 0)
  })
  const [videoProgress, setVideoProgress] = useState(0)
  const [currentTimeSec, setCurrentTimeSec] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Interactive controls state
  const [isCommentsOpen, setIsCommentsOpen] = useState(false)
  const [isMapModalOpen, setIsMapModalOpen] = useState(false)
  const [showHeartAnim, setShowHeartAnim] = useState(false)
  const isScrollingRef = useRef(false)
  const touchStartYRef = useRef(0)
  const lastTapRef = useRef(0)

  // Upload Video Modal
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const videoFileInputRef = useRef<HTMLInputElement>(null)
  const [selectedVideoFile, setSelectedVideoFile] = useState<File | null>(null)
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null)
  const [uploadStatusMsg, setUploadStatusMsg] = useState('')

  const [uploadForm, setUploadForm] = useState({
    title: '',
    description: '',
    category: 'Plumbing',
    video_url: 'https://assets.mixkit.co/videos/preview/mixkit-repairing-a-pipe-fitting-41584-large.mp4',
    thumbnail_url: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Automatically extract a snapshot frame from the video so users never need to upload a separate image
  const generateVideoThumbnail = (file: File): Promise<Blob | null> => {
    return new Promise((resolve) => {
      try {
        const video = document.createElement('video')
        video.preload = 'metadata'
        video.muted = true
        video.playsInline = true
        const objUrl = URL.createObjectURL(file)
        video.src = objUrl

        video.onloadeddata = () => {
          video.currentTime = Math.min(1.0, (video.duration || 2) / 2)
        }

        video.onseeked = () => {
          try {
            const canvas = document.createElement('canvas')
            canvas.width = video.videoWidth || 640
            canvas.height = video.videoHeight || 360
            const ctx = canvas.getContext('2d')
            if (ctx) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
              canvas.toBlob(
                (blob) => {
                  URL.revokeObjectURL(objUrl)
                  resolve(blob)
                },
                'image/jpeg',
                0.85
              )
            } else {
              URL.revokeObjectURL(objUrl)
              resolve(null)
            }
          } catch {
            URL.revokeObjectURL(objUrl)
            resolve(null)
          }
        }

        video.onerror = () => {
          URL.revokeObjectURL(objUrl)
          resolve(null)
        }
      } catch {
        resolve(null)
      }
    })
  }

  const handleDeviceVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 100 * 1024 * 1024) {
        toast.error('Video file must be under 100MB')
        return
      }
      setSelectedVideoFile(file)
      const objUrl = URL.createObjectURL(file)
      setVideoPreviewUrl(objUrl)
      toast.success(`Loaded "${file.name}" (${(file.size / (1024 * 1024)).toFixed(1)}MB)`)
    }
  }

  // Load videos from backend with proper paginated array unwrapping
  async function loadVideos() {
    try {
      const res = await feedApi.getVideos({ tab: activeTab })
      const videoList = Array.isArray(res) ? res : res?.results || []
      const localLiked = getLikedVideosSet()
      if (videoList.length > 0) {
        const mapped = videoList.map((v: any) => {
          const idStr = String(v.id)
          const isVideoLiked = localLiked.has(idStr) || Boolean(v.is_liked)
          return {
            id: idStr,
            creator: {
              handle: v.creator_handle || `@${(v.creator_name || 'Artisan').replace(/\s+/g, '')}`,
              displayName: v.creator_name || 'Verified Craftsman',
              isPro: Boolean(v.creator_is_verified || v.is_official),
              yearsExp: 7,
              avatar: v.creator_avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=face',
            },
            thumbnail: v.thumbnail_url || 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=700&fit=crop',
            videoUrl: v.video_url || 'https://assets.mixkit.co/videos/preview/mixkit-repairing-a-pipe-fitting-41584-large.mp4',
            title: v.title,
            description: v.description || '',
            hashtags: Array.isArray(v.hashtags) && v.hashtags.length ? v.hashtags : ['#LocalFix', '#DIYRepair', '#ProHandyman'],
            category: v.category || '🔧 Repair Tutorial',
            location: v.location_name || 'Worldwide Hub',
            audio: 'Original Audio - LocalFix Craftsman Studio',
            likes: (v.likes_count ?? 1420) + (localLiked.has(idStr) && !v.is_liked ? 1 : 0),
            comments: v.comments_count ?? 88,
            shares: v.shares_count ?? 230,
            saves: v.saves_count ?? 145,
            duration: v.duration_seconds || 60,
            currentTime: 0,
            isWatching: 4200,
            isLiked: isVideoLiked,
            isSaved: Boolean(v.is_saved),
            nearbyWorker: {
              id: v.creator || '1',
              name: (v.creator_name || 'Tunde').split(' ')[0],
              distance: '1.4km',
              eta: '~25 min',
              calloutRate: 9500,
              isActive: true,
            },
          }
        })
        setVideos(mapped)
      } else {
        setVideos((prev) =>
          prev.map((v) => {
            const isVideoLiked = localLiked.has(String(v.id)) || Boolean(v.isLiked)
            return {
              ...v,
              isLiked: isVideoLiked,
            }
          })
        )
      }
    } catch (err) {
      console.warn('Using fallback videos:', err)
      const localLiked = getLikedVideosSet()
      setVideos((prev) =>
        prev.map((v) => ({
          ...v,
          isLiked: localLiked.has(String(v.id)) || Boolean(v.isLiked),
        }))
      )
    }
  }

  useEffect(() => {
    loadVideos()
  }, [activeTab])

  const video = videos[currentIndex] || null

  // Synchronize actual video playback with isPlaying and video changes
  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying) {
        const p = videoRef.current.play()
        if (p !== undefined) {
          p.catch(() => {
            // Autoplay policy prevented playback
          })
        }
      } else {
        videoRef.current.pause()
      }
    }
  }, [isPlaying, currentIndex, video?.videoUrl])

  // Update like/save and comments when current video changes
  useEffect(() => {
    if (!video) return
    const localLiked = getLikedVideosSet()
    const activeLiked = localLiked.has(String(video.id)) || Boolean(video.isLiked)
    setIsLiked(activeLiked)
    setIsSaved(Boolean(video.isSaved))
    setLikesCount(video.likes)

    async function loadComments() {
      try {
        const res = await feedApi.getComments(video.id)
        const commentsList = Array.isArray(res) ? res : res?.results || []
        const localLikedComments = getLikedCommentsSet()
        if (commentsList.length > 0) {
          setComments(
            commentsList.map((c: any) => {
              const idStr = String(c.id)
              const isCommentLiked = localLikedComments.has(idStr) || Boolean(c.is_liked)
              return {
                id: idStr,
                user: c.user_name || 'Neighbor',
                role: c.user_role === 'worker' ? 'CREATOR' : '',
                text: c.text,
                likes: (c.likes_count || 0) + (localLikedComments.has(idStr) && !c.is_liked ? 1 : 0),
                isLiked: isCommentLiked,
                time: c.created_at ? new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '10m ago',
                isPinned: Boolean(c.is_pinned),
                reply: c.replies?.[0]
                  ? {
                      user: c.replies[0].user_name || 'Artisan',
                      text: c.replies[0].text,
                      time: 'recently',
                      likes: c.replies[0].likes_count || 0,
                    }
                  : undefined,
              }
            })
          )
        } else {
          setComments(
            DEFAULT_COMMENTS.map((c) => {
              const isCommentLiked = localLikedComments.has(c.id)
              return {
                ...c,
                isLiked: isCommentLiked,
                likes: c.likes + (isCommentLiked ? 1 : 0),
              }
            })
          )
        }
      } catch {
        const localLikedComments = getLikedCommentsSet()
        setComments(
          DEFAULT_COMMENTS.map((c) => {
            const isCommentLiked = localLikedComments.has(c.id)
            return {
              ...c,
              isLiked: isCommentLiked,
              likes: c.likes + (isCommentLiked ? 1 : 0),
            }
          })
        )
      }
    }
    loadComments()
  }, [video?.id])

  const progress = video ? (video.currentTime / video.duration) * 100 : 50

  const handleToggleLike = async () => {
    const nextState = !isLiked
    const nextCount = nextState ? likesCount + 1 : Math.max(0, likesCount - 1)
    
    // 1. Immediately persist to localStorage so it stays liked/unliked when appearing again
    saveLikedVideoId(video.id, nextState)

    // 2. Immediately update local state
    setIsLiked(nextState)
    setLikesCount(nextCount)
    setVideos((prev) =>
      prev.map((v, i) =>
        i === currentIndex ? { ...v, isLiked: nextState, likes: nextCount } : v
      )
    )

    if (nextState) {
      toast.success('Liked! ❤️', { id: 'feed-like-toast', duration: 1500 })
    } else {
      toast.success('Unliked', { id: 'feed-like-toast', duration: 1500 })
    }

    // 3. Sync with backend API
    try {
      const res = await feedApi.toggleLike(video.id)
      if (res && typeof res.liked === 'boolean') {
        saveLikedVideoId(video.id, res.liked)
        setIsLiked(res.liked)
        setLikesCount(res.likes_count)
        setVideos((prev) =>
          prev.map((v, i) =>
            i === currentIndex ? { ...v, isLiked: res.liked, likes: res.likes_count } : v
          )
        )
      }
    } catch (err) {
      console.warn('Like optimistic fallback:', err)
    }
  }

  const handleToggleSave = async () => {
    const nextState = !isSaved
    setIsSaved(nextState)
    setVideos((prev) =>
      prev.map((v, i) =>
        i === currentIndex ? { ...v, isSaved: nextState } : v
      )
    )
    try {
      await feedApi.toggleSave(video.id)
      toast.success(nextState ? 'Saved to bookmarks!' : 'Removed from bookmarks')
    } catch {
      // optimistic
    }
  }

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href)
    toast.success('Fix link copied to clipboard!')
  }

  const handleLikeComment = async (commentId: string) => {
    const target = comments.find((c) => c.id === commentId)
    if (!target) return
    const nextState = !target.isLiked
    const nextCount = nextState ? (target.likes || 0) + 1 : Math.max(0, (target.likes || 0) - 1)

    // 1. Immediately persist locally
    saveLikedCommentId(commentId, nextState)

    // 2. Optimistically update state
    setComments((prev) =>
      prev.map((c) => (c.id === commentId ? { ...c, isLiked: nextState, likes: nextCount } : c))
    )

    if (nextState) {
      toast.success('Liked comment! ❤️', { id: `comment-like-${commentId}`, duration: 1200 })
    } else {
      toast.success('Unliked comment', { id: `comment-like-${commentId}`, duration: 1200 })
    }

    // 3. Sync with backend API
    try {
      const res = await feedApi.toggleCommentLike(commentId)
      if (res && typeof res.liked === 'boolean') {
        saveLikedCommentId(commentId, res.liked)
        setComments((prev) =>
          prev.map((c) => (c.id === commentId ? { ...c, isLiked: res.liked, likes: res.likes_count } : c))
        )
      }
    } catch (err) {
      console.warn('Comment like fallback:', err)
    }
  }

  const handleSendComment = async () => {
    if (!commentText.trim()) return
    const text = commentText.trim()
    setCommentText('')
    const authorName = user
      ? (`${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email?.split('@')[0] || 'You')
      : 'You'

    const newComment = {
      id: String(Date.now()),
      user: authorName,
      role: user?.role === 'worker' ? 'CREATOR' : '',
      text,
      likes: 0,
      time: 'Just now',
      isPinned: false,
    }

    // Immediately update UI
    setComments((prev) => [newComment, ...prev])
    setVideos((prev) =>
      prev.map((v, i) =>
        i === currentIndex ? { ...v, comments: (v.comments || 0) + 1 } : v
      )
    )
    toast.success('💬 Tip posted to community feed!')

    try {
      const res = await feedApi.addComment(video.id, text)
      if (res?.id) {
        setComments((prev) =>
          prev.map((c) => (c.id === newComment.id ? { ...c, id: String(res.id) } : c))
        )
      }
    } catch (err) {
      console.warn('Comment persist note:', err)
    }
  }

  const handleNextVideo = useCallback(() => {
    setCurrentIndex((prev) => Math.min(prev + 1, videos.length - 1))
  }, [videos.length])

  const handlePrevVideo = useCallback(() => {
    setCurrentIndex((prev) => Math.max(prev - 1, 0))
  }, [])

  // Keyboard navigation (arrows, space, mute)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return
      if (e.key === 'ArrowDown' || e.key === 'PageDown') {
        e.preventDefault()
        handleNextVideo()
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault()
        handlePrevVideo()
      } else if (e.key === ' ' || e.key === 'k') {
        e.preventDefault()
        setIsPlaying((prev) => !prev)
      } else if (e.key === 'm') {
        e.preventDefault()
        setIsMuted((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleNextVideo, handlePrevVideo])

  const handleVideoCardClick = () => {
    const now = Date.now()
    if (now - lastTapRef.current < 280) {
      // Double tap to like!
      if (!isLiked) {
        handleToggleLike()
      }
      setShowHeartAnim(true)
      setTimeout(() => setShowHeartAnim(false), 900)
    } else {
      setIsPlaying(!isPlaying)
    }
    lastTapRef.current = now
  }

  const handleCreateVideo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!uploadForm.title.trim()) {
      toast.error('Please enter a tutorial title')
      return
    }
    if (!selectedVideoFile && !uploadForm.video_url) {
      toast.error('Please select a video file from your device')
      return
    }
    setIsSubmitting(true)
    setUploadStatusMsg('Preparing upload...')

    try {
      let finalVideoUrl = uploadForm.video_url
      let finalThumbUrl = uploadForm.thumbnail_url

      // If user picked a video from their device, upload it to the backend
      if (selectedVideoFile) {
        setUploadStatusMsg('Uploading video file from your device...')
        try {
          const res = await uploadApi.uploadFile(selectedVideoFile)
          finalVideoUrl = res.full_url || res.url
        } catch {
          finalVideoUrl = videoPreviewUrl || uploadForm.video_url
        }

        // Auto-generate video cover snapshot from the video itself (like Facebook/TikTok)
        setUploadStatusMsg('Auto-capturing cover snapshot from video...')
        try {
          const thumbBlob = await generateVideoThumbnail(selectedVideoFile)
          if (thumbBlob) {
            const thumbFile = new File([thumbBlob], `cover_${Date.now()}.jpg`, { type: 'image/jpeg' })
            const thumbRes = await uploadApi.uploadFile(thumbFile)
            finalThumbUrl = thumbRes.full_url || thumbRes.url
          } else {
            finalThumbUrl = finalVideoUrl
          }
        } catch {
          finalThumbUrl = 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=700&fit=crop'
        }
      }

      setUploadStatusMsg('Publishing to LocalFix community feed...')
      await feedApi.createVideo({
        title: uploadForm.title,
        description: uploadForm.description,
        video_url: finalVideoUrl,
        thumbnail_url: finalThumbUrl,
        category: uploadForm.category,
        location_name: locationName,
      })

      toast.success('🎉 Your repair video has been published from your device!')
      setIsUploadModalOpen(false)
      setSelectedVideoFile(null)
      setVideoPreviewUrl(null)
      setUploadForm({
        title: '',
        description: '',
        category: 'Plumbing',
        video_url: 'https://assets.mixkit.co/videos/preview/mixkit-repairing-a-pipe-fitting-41584-large.mp4',
        thumbnail_url: '',
      })

      // Fetch fresh videos from backend database so new video stays permanently across reloads
      await loadVideos()
      setCurrentIndex(0)
    } catch (err: any) {
      toast.error(err.response?.data?.detail || err.message || 'Failed to publish video')
    } finally {
      setIsSubmitting(false)
      setUploadStatusMsg('')
    }
  }

  return (
    <div className="min-h-screen bg-dark-bg">
      {/* Feed tab bar */}
      <div
        className="sticky top-[64px] z-40 px-3 sm:px-4 py-2 flex items-center justify-between gap-2"
        style={{ background: 'rgba(23,19,38,0.9)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(167,139,250,0.1)' }}
      >
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar flex-1 min-w-0 py-0.5">
          {FEED_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all',
                activeTab === tab
                  ? 'bg-primary-700 text-white shadow-purple-sm'
                  : 'text-gray-400 hover:text-white'
              )}
              style={activeTab !== tab ? { background: 'rgba(167,139,250,0.08)' } : {}}
            >
              {tab === 'Nearby Repairs' && '🔧 '}
              {tab === 'Trending DIY' && '📈 '}
              {tab === 'Official LocalFix' && '🏢 '}
              {tab}
            </button>
          ))}
        </div>
        <div className="flex-shrink-0 flex items-center gap-2.5 ml-2">
          <div className="hidden md:flex items-center gap-1.5 text-xs text-gray-400">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="hidden xl:inline">12,800+ CRAFTSMEN ACTIVE / </span>
            <span>{locationName.split(',')[0]} Hub</span>
          </div>

          {/* Quick Share Video Button (Visible on all devices) */}
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white transition-all hover:brightness-110 active:scale-98 shadow-purple-sm"
            style={{ background: 'linear-gradient(135deg,#6D28D9,#7C3AED)' }}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Share Video</span>
          </button>
        </div>
      </div>

      {/* Main 3-column layout */}
      <div className="max-w-[1400px] mx-auto px-3 sm:px-4 pt-4 pb-28 lg:pb-8 grid grid-cols-1 lg:grid-cols-[240px_1fr_300px] gap-6">

        {/* Left sidebar */}
        <aside className="hidden lg:block space-y-5">
          {/* Share CTA */}
          <div className="glass-panel rounded-2xl p-4 border border-primary-500/20">
            <h3 className="text-white font-bold text-sm mb-1">Got a Fix to Share?</h3>
            <p className="text-gray-400 text-xs mb-3">Earn verified rep & neighborhood bookings</p>
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="w-full py-2 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all hover:brightness-110 active:scale-98"
              style={{ background: 'linear-gradient(135deg,#6D28D9,#A78BFA)', boxShadow: '0 4px 16px rgba(109,40,217,0.35)' }}
            >
              <Plus className="w-4 h-4" /> + Share Video
            </button>
          </div>

          {/* Browse Skills */}
          <div className="glass-panel rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-bold text-sm">Browse Skills</h3>
              <Wrench className="w-4 h-4 text-primary-400" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {SKILL_CATEGORIES.map((cat) => (
                <button
                  key={cat.name}
                  onClick={() => setActiveTab('Nearby Repairs')}
                  className="glass-panel rounded-xl p-2.5 text-left hover:border-primary-600/40 transition-all cursor-pointer"
                >
                  <div className="text-lg mb-1">{cat.icon}</div>
                  <div className="text-white text-xs font-semibold">{cat.name}</div>
                  <div className="text-gray-500 text-[10px]">{cat.clips} clips</div>
                </button>
              ))}
            </div>
          </div>

          {/* Trending topics */}
          <div className="glass-panel rounded-2xl p-4">
            <h3 className="text-white font-bold text-sm mb-3"># Trending Topics</h3>
            <div className="flex flex-wrap gap-1.5">
              {TRENDING_TOPICS.map((topic) => (
                <button
                  key={topic}
                  onClick={() => toast.success(`Showing results for ${topic}`)}
                  className="px-2.5 py-1 rounded-lg text-xs text-primary-300 hover:bg-primary-700/20 transition-colors"
                  style={{ background: 'rgba(109,40,217,0.1)', border: '1px solid rgba(109,40,217,0.2)' }}
                >
                  {topic}
                </button>
              ))}
            </div>
          </div>

          {/* Global Repair Radar Map Embed */}
          <div className="glass-panel rounded-2xl p-4 border border-primary-500/20">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-white font-bold text-xs flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-primary-400" /> Global Repair Radar
              </h3>
              <span className="text-[10px] text-emerald-400 font-semibold animate-pulse">● LIVE WORLDWIDE</span>
            </div>
            <div className="h-32 rounded-xl overflow-hidden border border-white/10 mb-2 relative">
              <iframe
                src="https://maps.google.com/maps?q=world&z=2&output=embed"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
                title="Global Radar Map Preview"
              />
            </div>
            <button
              onClick={() => setIsMapModalOpen(true)}
              className="w-full py-1.5 rounded-lg text-xs font-semibold text-primary-300 hover:text-white hover:bg-primary-700/20 transition-all border border-primary-500/30 text-center block"
            >
              Expand Global Map
            </button>
          </div>

          {/* Top Craftsmen */}
          <div className="glass-panel rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-bold text-sm">Top Craftsmen</h3>
              <span className="text-primary-400 text-xs font-semibold">LEADERBOARD</span>
            </div>
            <div className="space-y-3">
              {TOP_CRAFTSMEN.length === 0 ? (
                <div className="py-6 text-center text-gray-400 text-xs">
                  New verified craftsmen joining soon.
                </div>
              ) : (
                TOP_CRAFTSMEN.map((c) => (
                <div key={c.handle} className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-700 to-primary-400 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {c.handle[1]?.toUpperCase() || 'C'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-xs font-semibold truncate">{c.handle}</div>
                    <div className="flex items-center gap-1">
                      <span className="text-yellow-400 text-[10px]">⭐ {c.rating}</span>
                      <span className="text-gray-600 text-[10px]">·</span>
                      <span className="text-gray-500 text-[10px]">{c.fixes} fixes</span>
                    </div>
                  </div>
                  <button
                    onClick={() => toast.success(`Followed ${c.handle}`)}
                    className="px-2 py-0.5 rounded-full text-[10px] font-medium text-primary-300 hover:bg-primary-700/20 transition-all"
                    style={{ border: '1px solid rgba(109,40,217,0.3)' }}
                  >
                    Follow
                  </button>
                </div>
              )))}
            </div>
          </div>
        </aside>

        {/* Center: Video player & TikTok Interactive Experience */}
        <div className="space-y-4 flex flex-col items-center w-full">
          {!video ? (
            <div className="w-full max-w-[460px] h-[550px] glass-panel rounded-3xl p-8 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center mb-4">
                <Video className="w-8 h-8 text-primary-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">No Repair Videos Yet</h3>
              <p className="text-xs text-gray-400 max-w-xs mb-6">Be the first artisan or resident to post an on-site fix or DIY tutorial.</p>
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-bold transition-all shadow-md"
              >
                + Upload Repair Video
              </button>
            </div>
          ) : (
            <>
              {/* Top Video Navigation & Fix Counter Bar */}
              <div className="flex items-center justify-between w-full max-w-[460px] px-1 text-xs">
            <div className="flex items-center gap-2 font-semibold px-3.5 py-1.5 rounded-full bg-black/75 backdrop-blur-md border border-white/20 text-white shadow-md">
              <span className="text-primary-400 font-bold">Fix {currentIndex + 1} of {videos.length}</span>
              <span className="text-gray-400">·</span>
              <span className="text-gray-200 truncate max-w-[150px]">{video.category}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrevVideo}
                disabled={currentIndex === 0}
                className={cn(
                  "flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all active:scale-95 shadow-sm",
                  currentIndex === 0
                    ? "opacity-35 cursor-not-allowed bg-black/40 text-gray-400 border-white/10"
                    : "bg-black/70 hover:bg-black/90 text-white border-white/25 hover:border-primary-400 cursor-pointer"
                )}
                title={currentIndex === 0 ? "First fix" : "Previous Fix"}
              >
                <ChevronUp className="w-4 h-4 text-white" />
                <span>Prev</span>
              </button>
              <button
                type="button"
                onClick={handleNextVideo}
                disabled={currentIndex === videos.length - 1}
                className={cn(
                  "flex items-center gap-1 px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all active:scale-95 shadow-purple-sm",
                  currentIndex === videos.length - 1
                    ? "opacity-35 cursor-not-allowed bg-black/40 text-gray-400 border-white/10"
                    : "bg-primary-600 hover:bg-primary-500 text-white border-primary-400 cursor-pointer"
                )}
                title={currentIndex === videos.length - 1 ? "Last fix" : "Next Fix"}
              >
                <span>Next</span>
                <ChevronDown className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>

          {/* TikTok Layout: Centered Video Player + Overlaid Action Icons */}
          <div className="flex items-center justify-center gap-3 w-full">
            {/* Video Card */}
            <div
              className="relative w-full max-w-[460px] rounded-3xl overflow-hidden shadow-2xl bg-black border border-primary-500/30 aspect-[9/16] max-h-[78vh] min-h-[500px] select-none mx-auto"
            >
              {/* Real HTML5 Video element */}
              <video
                ref={videoRef}
                src={video.videoUrl}
                poster={video.thumbnail}
                playsInline
                loop
                muted={isMuted}
                onTimeUpdate={(e) => {
                  const v = e.currentTarget
                  if (v.duration) {
                    setVideoProgress((v.currentTime / v.duration) * 100)
                    setCurrentTimeSec(Math.floor(v.currentTime))
                  }
                }}
                className="absolute inset-0 w-full h-full object-cover bg-black"
              />

              {/* Gradient Overlays for optimal text and icon contrast */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-transparent to-black/50 pointer-events-none" />

              {/* Double-tap popping heart animation (TikTok style) */}
              <AnimatePresence>
                {showHeartAnim && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0, rotate: -15 }}
                    animate={{ scale: [0, 1.4, 1.1], opacity: [0, 1, 1], rotate: [0, -10, 0] }}
                    exit={{ scale: 1.6, opacity: 0 }}
                    transition={{ duration: 0.55, ease: 'easeOut' }}
                    className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none"
                  >
                    <Heart className="w-28 h-28 text-[#FE2C55] fill-[#FE2C55] drop-shadow-[0_0_35px_rgba(254,44,85,0.95)]" />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Top bar inside the video */}
              <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-30 pointer-events-none">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-white bg-black/70 backdrop-blur-md pointer-events-auto border border-white/20 shadow-lg">
                  <Play className="w-3.5 h-3.5 text-primary-400 fill-primary-400" />
                  <span>
                    {formatTime(currentTimeSec)} / {formatTime(video.duration)}
                  </span>
                </div>
                <div className="flex items-center gap-2 pointer-events-auto">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs text-emerald-300 font-bold bg-black/70 backdrop-blur-md border border-white/20 shadow-lg">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>{formatCount(video.isWatching || 4200)} live</span>
                  </div>
                  <button
                    className="p-1.5 rounded-full bg-black/70 backdrop-blur-md text-white border border-white/20 hover:bg-black/90 hover:border-white/40 transition-all shadow-lg active:scale-95 cursor-pointer"
                    onClick={() => setIsMuted(!isMuted)}
                    title={isMuted ? 'Unmute' : 'Mute'}
                    aria-label={isMuted ? 'Unmute' : 'Mute'}
                  >
                    {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-white" />}
                  </button>
                </div>
              </div>

              {/* Click / Double-click to play/pause or like hit-area */}
              <button
                type="button"
                className="absolute inset-0 z-10 flex items-center justify-center focus:outline-none cursor-pointer"
                onClick={handleVideoCardClick}
                aria-label={isPlaying ? 'Pause video' : 'Play video'}
              >
                <AnimatePresence>
                  {!isPlaying && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.6 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.6 }}
                      className="w-16 h-16 rounded-full flex items-center justify-center shadow-2xl bg-black/75 backdrop-blur-md border border-white/25 text-white"
                    >
                      <Play className="w-8 h-8 fill-white ml-1" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>

              {/* TikTok Right Action Rail (Overlaid inside video) */}
              <div className="absolute right-2.5 sm:right-3 bottom-14 sm:bottom-16 z-30 flex flex-col items-center gap-3 sm:gap-3.5 select-none pointer-events-auto">
                {/* Creator Avatar with Follow (+) Badge */}
                <div
                  className="relative group cursor-pointer mb-0.5"
                  onClick={(e) => {
                    e.stopPropagation()
                    navigate(`/workers/${video.nearbyWorker.id}`)
                  }}
                  title={`View ${video.creator.displayName}'s profile`}
                >
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full p-0.5 border-2 border-white shadow-xl bg-black overflow-hidden group-hover:scale-105 transition-transform">
                    <img
                      src={video.creator.avatar}
                      alt={video.creator.handle}
                      className="w-full h-full object-cover rounded-full"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      toast.success(`Followed ${video.creator.handle}!`)
                    }}
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-[#FE2C55] hover:bg-red-600 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-110 active:scale-90 cursor-pointer"
                    title={`Follow ${video.creator.handle}`}
                    aria-label="Follow creator"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  </button>
                </div>

                {/* TikTok Style Love / Heart Button */}
                <button
                  type="button"
                  onClick={handleToggleLike}
                  className="flex flex-col items-center gap-0.5 group transition-transform active:scale-75 cursor-pointer"
                  title={isLiked ? "Unlike (Already Liked)" : "Love video"}
                  aria-label={isLiked ? "Unlike video" : "Love video"}
                >
                  <div
                    className={cn(
                      "w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all duration-200 shadow-xl border backdrop-blur-md",
                      isLiked
                        ? "bg-[#FE2C55]/30 text-[#FE2C55] border-[#FE2C55] shadow-[0_0_24px_rgba(254,44,85,0.6)] scale-105"
                        : "bg-black/60 hover:bg-black/80 text-white border-white/25 hover:border-white/50"
                    )}
                  >
                    <motion.div
                      key={isLiked ? 'loved' : 'unloved'}
                      initial={{ scale: 0.6 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 600, damping: 15 }}
                    >
                      <Heart
                        className={cn(
                          "w-6 h-6 transition-colors",
                          isLiked
                            ? "fill-[#FE2C55] text-[#FE2C55] drop-shadow-[0_0_10px_rgba(254,44,85,0.9)]"
                            : "text-white fill-white/10 group-hover:scale-110 transition-transform"
                        )}
                      />
                    </motion.div>
                  </div>
                  <span className={cn(
                    "text-xs font-bold drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] transition-colors tracking-wide",
                    isLiked ? "text-[#FE2C55]" : "text-white"
                  )}>
                    {formatCount(likesCount)}
                  </span>
                </button>

                {/* Comments Button */}
                <button
                  type="button"
                  onClick={() => {
                    setIsCommentsOpen(true)
                    setTimeout(() => {
                      const el = document.getElementById('drawer-comment-input') || document.getElementById('feed-comment-input')
                      el?.focus()
                    }, 150)
                  }}
                  className="flex flex-col items-center gap-0.5 group transition-transform active:scale-90 cursor-pointer"
                  title="View comments"
                  aria-label="View comments"
                >
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-black/60 hover:bg-black/80 border border-white/25 hover:border-white/50 backdrop-blur-md flex items-center justify-center text-white transition-all shadow-xl group-hover:scale-105">
                    <MessageSquare className="w-6 h-6 text-white fill-white/10" />
                  </div>
                  <span className="text-xs font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] tracking-wide">
                    {formatCount(comments.length)}
                  </span>
                </button>

                {/* Bookmark / Save Button */}
                <button
                  type="button"
                  onClick={handleToggleSave}
                  className="flex flex-col items-center gap-0.5 group transition-transform active:scale-90 cursor-pointer"
                  title={isSaved ? "Saved to bookmarks" : "Bookmark fix"}
                  aria-label={isSaved ? "Saved to bookmarks" : "Bookmark fix"}
                >
                  <div className={cn(
                    "w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all shadow-xl border backdrop-blur-md",
                    isSaved
                      ? "bg-amber-500/30 text-amber-400 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.5)] scale-105"
                      : "bg-black/60 hover:bg-black/80 text-white border-white/25 hover:border-white/50"
                  )}>
                    <Bookmark className={cn("w-6 h-6", isSaved ? "fill-amber-400 text-amber-400" : "text-white fill-white/10 group-hover:scale-110 transition-transform")} />
                  </div>
                  <span className={cn(
                    "text-xs font-bold drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] transition-colors tracking-wide",
                    isSaved ? "text-amber-400" : "text-white"
                  )}>
                    {formatCount(video.saves)}
                  </span>
                </button>

                {/* Share Button */}
                <button
                  type="button"
                  onClick={handleShare}
                  className="flex flex-col items-center gap-0.5 group transition-transform active:scale-90 cursor-pointer"
                  title="Share fix link"
                  aria-label="Share fix link"
                >
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-black/60 hover:bg-black/80 border border-white/25 hover:border-white/50 backdrop-blur-md flex items-center justify-center text-white transition-all shadow-xl group-hover:scale-105">
                    <Share2 className="w-6 h-6 text-white fill-white/10" />
                  </div>
                  <span className="text-xs font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] tracking-wide">
                    {formatCount(video.shares)}
                  </span>
                </button>

                {/* Spinning Vinyl Audio Record Disc (TikTok signature) */}
                <div
                  className="w-10 h-10 sm:w-11 sm:h-11 rounded-full p-1 bg-black/80 border-2 border-white/30 shadow-xl flex items-center justify-center animate-spin [animation-duration:6s] mt-1 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation()
                    toast.success(`Playing audio: ${video.audio}`)
                  }}
                  title={video.audio}
                >
                  <div className="w-full h-full rounded-full overflow-hidden bg-gradient-to-tr from-purple-900 to-indigo-600 flex items-center justify-center">
                    <img src={video.creator.avatar} alt="sound" className="w-full h-full object-cover rounded-full" />
                  </div>
                </div>
              </div>

              {/* Bottom info overlay (with pr-16/pr-20 so text never overlaps right action buttons) */}
              <div className="absolute bottom-0 left-0 right-0 pl-3.5 sm:pl-4 pr-16 sm:pr-20 pb-3 sm:pb-4 pt-16 z-20 pointer-events-none bg-gradient-to-t from-black/95 via-black/75 to-transparent">
                {/* Category + location badge */}
                <div className="flex items-center gap-2 mb-1.5 flex-wrap pointer-events-auto">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold text-white bg-primary-600 shadow-md border border-primary-400/40">
                    {video.category}
                  </span>
                  {video.location && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-200 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] bg-black/50 backdrop-blur-sm px-2 py-0.5 rounded-md border border-white/15">
                      <MapPin className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                      <span className="truncate max-w-[130px]">{video.location}</span>
                    </span>
                  )}
                </div>

                {/* Creator row */}
                <div className="flex items-center gap-2 mb-1.5 pointer-events-auto">
                  <span className="text-white text-sm sm:text-base font-extrabold truncate drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]">
                    {video.creator.handle}
                  </span>
                  {video.creator.isPro && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-black tracking-wider text-white bg-primary-600 border border-primary-400/40 flex-shrink-0 shadow-sm">
                      PRO
                    </span>
                  )}
                  <button
                    onClick={() => toast.success(`Followed ${video.creator.handle}`)}
                    className="ml-auto px-2.5 py-0.5 rounded-full text-xs text-white font-bold bg-white/20 hover:bg-white/30 transition-all border border-white/40 flex-shrink-0 active:scale-95 shadow-sm cursor-pointer"
                  >
                    + Follow
                  </button>
                </div>

                {/* Title & tags */}
                <p className="text-white text-xs sm:text-sm font-semibold leading-snug line-clamp-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] mb-1">
                  {video.title}
                </p>
                {video.hashtags && video.hashtags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-1.5 pointer-events-auto">
                    {video.hashtags.map((h: string) => (
                      <span
                        key={h}
                        className="text-primary-300 text-xs font-bold drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] hover:text-primary-200 hover:underline cursor-pointer"
                        onClick={() => toast.success(`Topic: ${h}`)}
                      >
                        {h}
                      </span>
                    ))}
                  </div>
                )}

                {/* Audio line with Music2 icon */}
                <div className="flex items-center gap-1.5 text-xs text-gray-200 font-medium drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
                  <Music2 className="w-3.5 h-3.5 text-primary-400 animate-pulse flex-shrink-0" />
                  <span className="truncate">{video.audio}</span>
                </div>
              </div>

              {/* Video Progress Bar at the very bottom edge */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 z-30 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary-500 to-primary-300 transition-all duration-200"
                  style={{ width: `${videoProgress}%` }}
                />
              </div>
            </div>

            {/* Desktop-only floating Prev/Next Chevrons beside the video */}
            <div className="hidden lg:flex flex-col gap-2.5 self-center flex-shrink-0">
              <button
                type="button"
                onClick={handlePrevVideo}
                disabled={currentIndex === 0}
                className={cn(
                  "w-11 h-11 rounded-2xl flex items-center justify-center border shadow-xl transition-all",
                  currentIndex === 0
                    ? "opacity-30 cursor-not-allowed bg-black/40 text-gray-500 border-white/10"
                    : "bg-black/70 hover:bg-primary-600 text-white border-white/20 hover:border-primary-400 cursor-pointer active:scale-95"
                )}
                title="Previous Fix (Up arrow)"
                aria-label="Previous fix"
              >
                <ChevronUp className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={handleNextVideo}
                disabled={currentIndex === videos.length - 1}
                className={cn(
                  "w-11 h-11 rounded-2xl flex items-center justify-center border shadow-xl transition-all shadow-purple-sm",
                  currentIndex === videos.length - 1
                    ? "opacity-30 cursor-not-allowed bg-black/40 text-gray-400 border-white/10"
                    : "bg-primary-600 hover:bg-primary-500 text-white border-primary-400 cursor-pointer active:scale-95"
                )}
                title="Next Fix (Down arrow)"
                aria-label="Next fix"
              >
                <ChevronDown className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Worker CTA bar */}
          {video.nearbyWorker && (
            <div className="glass-panel rounded-2xl p-4 border border-primary-500/20 w-full max-w-[530px]">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-primary-400" />
                  <span className="text-white text-sm font-semibold">
                    Need rapid repair in {locationName.split(',')[0]}?
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMapModalOpen(true)}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold text-primary-300 hover:text-white bg-primary-950/70 border border-primary-500/30 flex items-center gap-1 transition-all"
                >
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Map</span>
                </button>
              </div>
              <p className="text-gray-400 text-xs mb-3 flex items-center justify-between">
                <span>{video.nearbyWorker.name} is active {video.nearbyWorker.distance} away from your pin</span>
                <span className="text-primary-300 font-medium">Est. {video.nearbyWorker.eta}</span>
              </p>
              <button
                onClick={() => navigate(`/book/${video.nearbyWorker.id}`)}
                className="w-full py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all hover:brightness-110 active:scale-98"
                style={{ background: 'linear-gradient(135deg,#6D28D9,#7C3AED)', boxShadow: '0 4px 16px rgba(109,40,217,0.4)' }}
              >
                📋 Request Direct Quote from {video.nearbyWorker.name}
              </button>
            </div>
          )}
          </>
          )}
        </div>

        {/* Right sidebar: Community Feed */}
        <aside className="hidden lg:flex flex-col gap-4">
          <div className="glass-panel rounded-2xl p-4 flex-1 flex flex-col" style={{ maxHeight: '80vh' }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-bold text-sm">Community Feed</h3>
              <div className="flex items-center gap-2">
                <span className="lf-badge-purple text-xs">{comments.length}</span>
                <button><MoreHorizontal className="w-4 h-4 text-gray-500" /></button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 pr-1">
              {comments.length === 0 ? (
                <div className="py-12 text-center text-gray-400 text-xs">
                  No community comments yet.
                </div>
              ) : (
                comments.map((comment) => (
                <div
                  key={comment.id}
                  className={cn('p-3 rounded-xl', comment.isPinned ? 'border border-primary-700/40' : '')}
                  style={{ background: comment.isPinned ? 'rgba(109,40,217,0.15)' : 'rgba(37,28,64,0.4)' }}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary-700 to-primary-400 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                      {comment.user ? (comment.user.startsWith('@') ? (comment.user[1] || 'U').toUpperCase() : comment.user[0].toUpperCase()) : 'U'}
                    </div>
                    <span className="text-white text-xs font-semibold">{comment.user}</span>
                    {comment.role === 'CREATOR' && (
                      <span
                        className="px-1.5 py-0.5 rounded text-[9px] font-bold text-white"
                        style={{ background: '#6D28D9' }}
                      >
                        CREATOR
                      </span>
                    )}
                    {comment.isPinned && (
                      <span className="text-primary-400 text-[9px] font-semibold ml-auto">Pinned Pro Tip</span>
                    )}
                    {comment.time && (
                      <span className="text-gray-600 text-[10px] ml-auto">{comment.time}</span>
                    )}
                  </div>
                  <p className="text-gray-300 text-xs leading-relaxed">{comment.text}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <button
                      type="button"
                      onClick={() => handleLikeComment(comment.id)}
                      className={cn(
                        "flex items-center gap-1.5 transition-all cursor-pointer group active:scale-90",
                        comment.isLiked ? "text-[#FE2C55]" : "text-gray-400 hover:text-red-400"
                      )}
                      title={comment.isLiked ? "Unlike comment" : "Like comment"}
                    >
                      <Heart
                        className={cn(
                          "w-4 h-4 transition-transform group-hover:scale-110",
                          comment.isLiked ? "fill-[#FE2C55] text-[#FE2C55] drop-shadow-[0_0_6px_rgba(254,44,85,0.7)]" : ""
                        )}
                      />
                      <span className={cn("text-xs font-bold", comment.isLiked ? "text-[#FE2C55]" : "text-gray-300")}>
                        {comment.likes || 0}
                      </span>
                    </button>
                    <button
                      onClick={() => setCommentText(`@${comment.user} `)}
                      className="text-primary-400 text-xs font-medium hover:underline"
                    >
                      Reply
                    </button>
                  </div>

                  {/* Reply */}
                  {comment.reply && (
                    <div
                      className="mt-2 ml-3 p-2 rounded-lg"
                      style={{ background: 'rgba(109,40,217,0.08)', borderLeft: '2px solid rgba(109,40,217,0.4)' }}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-primary-300 text-xs font-semibold">{comment.reply.user}</span>
                        <span className="text-gray-600 text-[10px]">{comment.reply.time}</span>
                      </div>
                      <p className="text-gray-400 text-xs">{comment.reply.text}</p>
                    </div>
                  )}
                </div>
              )))}
            </div>

            {/* Comment input */}
            <div className="mt-3 flex items-center gap-2">
              <input
                id="feed-comment-input"
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add community tip or ask worker..."
                className="flex-1 px-3 py-2 rounded-xl text-xs outline-none"
                style={{ background: 'rgba(37,28,64,0.6)', border: '1px solid rgba(167,139,250,0.2)', color: '#e2e0ff' }}
                onKeyDown={(e) => e.key === 'Enter' && handleSendComment()}
              />
              <button
                onClick={handleSendComment}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-white transition-all hover:scale-105 active:scale-95"
                style={{ background: 'linear-gradient(135deg,#6D28D9,#7C3AED)' }}
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </aside>
      </div>

      {/* Share / Upload Video Modal */}
      <AnimatePresence>
        {isUploadModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              className="glass-panel w-full max-w-lg max-h-[92vh] sm:max-h-[88vh] flex flex-col rounded-2xl sm:rounded-3xl border border-primary-500/30 shadow-purple-lg overflow-hidden my-auto"
              style={{ background: '#18122B' }}
            >
              {/* Sticky Header */}
              <div className="flex-shrink-0 flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-primary-700/25 bg-[#140e24]/90 backdrop-blur-sm">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-primary-700/40 flex items-center justify-center text-primary-300">
                    <Video className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-sm sm:text-base leading-tight">Share a Repair Fix</h3>
                    <p className="text-gray-400 text-[11px] sm:text-xs">Publish a tutorial for neighbors and clients</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsUploadModalOpen(false)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Form Body */}
              <form onSubmit={handleCreateVideo} className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 pr-3 sm:pr-5 scrollbar-thin">
                  <div>
                    <label className="text-xs font-semibold text-gray-300 mb-1 block">Tutorial Title</label>
                    <input
                      type="text"
                      required
                      value={uploadForm.title}
                      onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                      placeholder="e.g. Stop Overhead Tank Overflow in 2 Minutes"
                      className="w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm bg-dark-bg/60 border border-primary-700/30 text-white focus:outline-none focus:border-primary-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-300 mb-1 block">Trade Category</label>
                    <select
                      value={uploadForm.category}
                      onChange={(e) => setUploadForm({ ...uploadForm, category: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm bg-dark-bg/60 border border-primary-700/30 text-white focus:outline-none focus:border-primary-500"
                    >
                      <option value="Plumbing">Plumbing</option>
                      <option value="Electrical">Electrical</option>
                      <option value="Solar & Inverter">Solar & Inverter</option>
                      <option value="HVAC & AC">HVAC & AC</option>
                      <option value="Carpentry">Carpentry</option>
                      <option value="Painting">Painting</option>
                    </select>
                  </div>

                  {/* 1. Device Video Upload Section */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                        <Film className="w-4 h-4 text-primary-400" />
                        <span>Video Recording (From Your Device)</span>
                      </label>
                      {selectedVideoFile && (
                        <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full">
                          ✓ Selected ({(selectedVideoFile.size / (1024 * 1024)).toFixed(1)}MB)
                        </span>
                      )}
                    </div>

                    <input
                      type="file"
                      ref={videoFileInputRef}
                      onChange={handleDeviceVideoSelect}
                      accept="video/mp4,video/webm,video/quicktime,video/*"
                      className="hidden"
                    />

                    {videoPreviewUrl ? (
                      <div className="relative rounded-2xl overflow-hidden border border-primary-500/30 bg-black">
                        <video src={videoPreviewUrl} controls className="w-full max-h-36 sm:max-h-44 object-contain" />
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedVideoFile(null)
                            setVideoPreviewUrl(null)
                          }}
                          className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/70 text-red-400 hover:text-white"
                          title="Remove video"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => videoFileInputRef.current?.click()}
                        className="border-2 border-dashed border-primary-700/40 hover:border-primary-500/70 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all bg-primary-950/20 hover:bg-primary-950/40 text-center"
                      >
                        <div className="w-10 h-10 rounded-full bg-primary-700/30 text-primary-300 flex items-center justify-center">
                          <Upload className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-white text-xs font-bold">Click to Upload Video from Device</div>
                          <div className="text-gray-400 text-[11px]">Supports MP4, WebM, MOV (Max 100MB)</div>
                        </div>
                      </div>
                    )}
                    {selectedVideoFile && (
                      <div className="p-3 rounded-xl bg-primary-950/50 border border-primary-500/30 flex items-center gap-2.5 text-xs text-primary-200">
                        <Sparkles className="w-4 h-4 text-primary-400 flex-shrink-0" />
                        <span>
                          <strong>Instant Auto-Cover:</strong> LocalFix automatically extracts the video cover from your video just like Facebook and TikTok. No manual picture needed!
                        </span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-300 mb-1 block">Description & Pro Tip</label>
                    <textarea
                      rows={2}
                      value={uploadForm.description}
                      onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                      placeholder="Describe key tools used and safety precautions..."
                      className="w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm bg-dark-bg/60 border border-primary-700/30 text-white focus:outline-none focus:border-primary-500 resize-none"
                    />
                  </div>

                  {uploadStatusMsg && (
                    <div className="p-2.5 rounded-xl bg-primary-900/40 border border-primary-500/30 text-xs text-primary-200 flex items-center gap-2">
                      <div className="w-3.5 h-3.5 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
                      <span>{uploadStatusMsg}</span>
                    </div>
                  )}
                </div>

                {/* Sticky Action Footer */}
                <div className="flex-shrink-0 p-3.5 sm:p-5 pt-3 border-t border-primary-700/25 bg-[#140e24]/95 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsUploadModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white flex items-center justify-center gap-2 transition-all hover:brightness-110 active:scale-98 disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg,#6D28D9,#7C3AED)', boxShadow: '0 4px 16px rgba(109,40,217,0.4)' }}
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <Upload className="w-4 h-4 animate-bounce" />
                        Uploading...
                      </span>
                    ) : (
                      'Publish Fix'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Interactive Comments Drawer / Modal (for all screen sizes) */}
      <AnimatePresence>
        {isCommentsOpen && (
          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm cursor-pointer"
            onClick={() => setIsCommentsOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 120 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 120 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-[#19122c] border border-primary-500/30 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[680px] overflow-hidden cursor-default"
            >
              {/* Drawer Header */}
              <div className="p-4 border-b border-white/10 flex items-center justify-between bg-primary-950/40">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-primary-400" />
                  <h3 className="text-white font-bold text-base">Community Tips & Answers ({comments.length})</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCommentsOpen(false)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Comments List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin">
                {comments.length === 0 ? (
                  <div className="py-12 text-center text-gray-400 text-sm">
                    No community tips yet. Be the first to leave advice or ask an artisan!
                  </div>
                ) : (
                  comments.map((comment) => (
                    <div
                      key={comment.id}
                      className="p-3.5 rounded-2xl bg-white/5 border border-white/5 hover:border-primary-500/30 transition-all"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-600 to-primary-400 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {comment.user ? (comment.user.startsWith('@') ? (comment.user[1] || 'U').toUpperCase() : comment.user[0].toUpperCase()) : 'U'}
                          </div>
                          <span className="text-white text-xs font-bold">{comment.user}</span>
                          {comment.role === 'CREATOR' && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold text-white bg-primary-600 flex-shrink-0">
                              CREATOR
                            </span>
                          )}
                        </div>
                        <span className="text-gray-400 text-xs">{comment.time}</span>
                      </div>
                      <p className="text-gray-100 text-xs sm:text-sm leading-relaxed pl-9">{comment.text}</p>
                      <div className="flex items-center gap-4 pl-9 mt-2">
                        <button
                          type="button"
                          onClick={() => handleLikeComment(comment.id)}
                          className={cn(
                            "flex items-center gap-1.5 transition-all cursor-pointer group active:scale-90",
                            comment.isLiked ? "text-[#FE2C55]" : "text-gray-400 hover:text-red-400"
                          )}
                          title={comment.isLiked ? "Unlike comment" : "Like comment"}
                        >
                          <Heart
                            className={cn(
                              "w-4 h-4 transition-transform group-hover:scale-110",
                              comment.isLiked ? "fill-[#FE2C55] text-[#FE2C55] drop-shadow-[0_0_6px_rgba(254,44,85,0.7)]" : ""
                            )}
                          />
                          <span className={cn("text-xs font-bold", comment.isLiked ? "text-[#FE2C55]" : "text-gray-300")}>
                            {comment.likes || 0}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCommentText(`@${comment.user} `)
                            document.getElementById('drawer-comment-input')?.focus()
                          }}
                          className="text-primary-400 text-xs font-bold hover:underline"
                        >
                          Reply
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Drawer Comment Input Bar */}
              <div className="p-3.5 border-t border-white/10 bg-[#120b22] flex items-center gap-2">
                <input
                  id="drawer-comment-input"
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendComment()}
                  placeholder="Share a tip or ask the artisan..."
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-white/5 border border-primary-500/30 text-white placeholder-gray-400 text-xs sm:text-sm outline-none focus:border-primary-400"
                />
                <button
                  type="button"
                  onClick={handleSendComment}
                  className="p-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white transition-transform active:scale-95 shadow-lg flex items-center justify-center cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Embedded Google Maps Full Modal */}
      <AnimatePresence>
        {isMapModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              className="w-full max-w-4xl h-[85vh] bg-[#19122c] border border-primary-500/30 rounded-3xl shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="p-4 border-b border-white/10 flex items-center justify-between bg-primary-950/40">
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-emerald-400" />
                  <div>
                    <h3 className="text-white font-bold text-sm sm:text-base">Global Live Repair Radar & Service Map</h3>
                    <p className="text-gray-400 text-[11px]">Real-time GPS coverage across verified artisan hubs worldwide</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsMapModalOpen(false)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 relative">
                <iframe
                  src="https://maps.google.com/maps?q=world&z=2&output=embed"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="strict-origin-when-cross-origin"
                  title="Google Maps Worldwide Artisans Live"
                  className="w-full h-full"
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
