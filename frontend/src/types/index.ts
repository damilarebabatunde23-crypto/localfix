// ============================================================
// LocalFix — Shared TypeScript Types
// ============================================================

export type UserRole = 'customer' | 'worker' | 'official' | 'admin' | 'moderator'
export type Theme = 'dark' | 'light' | 'system'

export interface User {
  id: string
  email: string
  phone?: string
  firstName: string
  lastName: string
  role: UserRole
  avatar?: string
  isVerified: boolean
  isEmailVerified: boolean
  location?: GeoPoint
  locationName?: string
  tier?: string
  bio?: string
  languages?: string[]
  worker_profile_id?: string
  createdAt: string
  updatedAt: string
}

export interface GeoPoint {
  lat: number
  lng: number
}

export interface ServiceCategory {
  id: string
  name: string
  slug: string
  icon: string
  color: string
  workerCount: number
  description: string
}

export interface WorkerProfile {
  id: string
  userId: string
  displayName: string
  avatar?: string
  profession: string
  skills: string[]
  bio: string
  yearsExperience: number
  serviceArea: string
  serviceRadius: number // km
  location: GeoPoint
  distanceKm?: number
  rating: number
  reviewCount: number
  completedJobs: number
  hourlyRate?: number
  calloutRate?: number
  currency: string
  isVerified: boolean
  verificationBadge?: string
  isOnline: boolean
  avgResponseMins: number
  portfolioImages: string[]
  specialisms: string[]
  isAvailable: boolean
  price?: string
}

export interface Booking {
  id: string
  customerId: string
  workerId: string
  worker?: WorkerProfile
  serviceType: string
  description: string
  location: GeoPoint
  locationAddress: string
  preferredDate: string
  status: BookingStatus
  quotedAmount?: number
  agreedAmount?: number
  platformFee?: number
  currency: string
  jobImages?: string[]
  createdAt: string
  updatedAt: string
  events: BookingEvent[]
}

export type BookingStatus =
  | 'draft'
  | 'requested'
  | 'quoted'
  | 'accepted'
  | 'awaiting_payment'
  | 'scheduled'
  | 'in_progress'
  | 'awaiting_approval'
  | 'completed'
  | 'cancelled'
  | 'disputed'
  | 'refunded'

export interface BookingEvent {
  id: string
  bookingId: string
  type: string
  description: string
  actorId: string
  createdAt: string
}

export interface MarketplaceListing {
  id: string
  sellerId: string
  seller?: {
    name: string
    avatar?: string
    isVerified: boolean
    badge?: string
  }
  title: string
  description: string
  category: string
  condition: 'brand_new' | 'like_new' | 'fair' | 'used'
  price: number
  currency: string
  images: string[]
  location: GeoPoint
  locationName: string
  distanceKm?: number
  status: 'available' | 'reserved' | 'sold' | 'removed'
  isInspectionReady: boolean
  pickupOptions: ('pickup' | 'delivery')[]
  createdAt: string
  updatedAt: string
}

export interface Video {
  id: string
  creatorId: string
  creator: {
    displayName: string
    avatar?: string
    isVerified: boolean
    profession?: string
    yearsExp?: number
  }
  videoUrl: string
  thumbnailUrl: string
  title: string
  description: string
  hashtags: string[]
  category: string
  locationName?: string
  likes: number
  comments: number
  shares: number
  saves: number
  views: number
  duration: number
  isLiked?: boolean
  isSaved?: boolean
  createdAt: string
}

export interface Message {
  id: string
  conversationId: string
  senderId: string
  content: string
  type: 'text' | 'image' | 'document' | 'voice' | 'system'
  mediaUrl?: string
  isRead: boolean
  createdAt: string
}

export interface Conversation {
  id: string
  participants: User[]
  lastMessage?: Message
  unreadCount: number
  relatedBookingId?: string
  updatedAt: string
}

export interface Notification {
  id: string
  userId: string
  type: string
  title: string
  body: string
  isRead: boolean
  data?: Record<string, unknown>
  createdAt: string
}

export interface PaginatedResponse<T> {
  results: T[]
  count: number
  next: string | null
  previous: string | null
}

export interface ApiError {
  message: string
  code?: string
  field?: string
}
