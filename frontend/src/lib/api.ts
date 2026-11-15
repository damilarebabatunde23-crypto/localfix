import axios from 'axios'
import { useAppStore } from '@/stores/useAppStore'

export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Attach Bearer token from Zustand store
api.interceptors.request.use((config) => {
  const token = useAppStore.getState().accessToken
  // Only attach valid JWT tokens (avoids sending legacy placeholder strings)
  if (token && typeof token === 'string' && token.includes('.') && token !== 'demo-jwt-token-verified') {
    if (!config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`
    }
  } else if (config.headers?.Authorization) {
    delete config.headers.Authorization
  }
  return config
})

// Auto-handle 401 refresh or graceful anonymous retry
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true

      const refreshToken = localStorage.getItem('localfix-refresh')
      const isRealToken = refreshToken && typeof refreshToken === 'string' && refreshToken.includes('.') && refreshToken !== 'demo-jwt-token-verified'

      if (isRealToken) {
        try {
          const res = await axios.post(`${API_BASE_URL}/auth/token/refresh/`, {
            refresh: refreshToken,
          })
          if (res.data?.access) {
            useAppStore.getState().setAccessToken(res.data.access)
            originalRequest.headers.Authorization = `Bearer ${res.data.access}`
            return api(originalRequest)
          }
        } catch {
          // Refresh token expired or invalid - clear session
          useAppStore.getState().logout()
        }
      } else {
        // No valid refresh token - clear session
        useAppStore.getState().logout()
      }

      // If the request was a safe GET request or public feed interaction,
      // retry anonymously without Authorization so page loads and feed features don't fail!
      if (
        originalRequest.method?.toLowerCase() === 'get' ||
        originalRequest.url?.includes('/feed/') ||
        originalRequest.url?.includes('/marketplace/items/')
      ) {
        if (originalRequest.headers?.Authorization) {
          delete originalRequest.headers.Authorization
        }
        return api(originalRequest)
      }
    }
    return Promise.reject(error)
  }
)

// ==========================================
// 1. AUTH API
// ==========================================
export const authApi = {
  login: async (email: string, password: string) => {
    const res = await api.post('/auth/login/', { email, password })
    return res.data // { access, refresh }
  },
  register: async (data: {
    first_name: string
    last_name: string
    email: string
    phone?: string
    role: string
    password: string
    confirm_password: string
    location_name?: string
    bio?: string
    employer_type?: string
    profession?: string
    category_id?: string
    years_experience?: number
    callout_rate?: number
    service_area?: string
    specialisms?: string[]
  }) => {
    const res = await api.post('/auth/register/', data)
    return res.data
  },
  getProfile: async () => {
    const res = await api.get('/auth/profile/')
    return res.data
  },
  updateProfile: async (data: Partial<{
    first_name: string
    last_name: string
    phone: string
    location_name: string
    latitude: number
    longitude: number
    bio: string
    avatar_url: string
    languages: string[]
  }>) => {
    const res = await api.put('/auth/profile/', data)
    return res.data
  },
  getUser: async (id: string) => {
    const res = await api.get(`/auth/users/${id}/`)
    return res.data
  },
  getNotifications: async () => {
    const res = await api.get('/auth/notifications/')
    return res.data
  },
  markNotificationRead: async (id: string) => {
    const res = await api.post(`/auth/notifications/${id}/read/`)
    return res.data
  },
  markAllNotificationsRead: async () => {
    const res = await api.post('/auth/notifications/read-all/')
    return res.data
  },
  googleAuth: async (data: {
    credential?: string
    email?: string
    first_name?: string
    last_name?: string
    avatar_url?: string
    role?: string
    location_name?: string
  }) => {
    const res = await api.post('/auth/google/', data)
    return res.data // { user, tokens: { access, refresh }, is_new_user, message }
  },
  submitContactInquiry: async (data: {
    name: string
    email: string
    phone?: string
    department?: string
    subject: string
    message: string
    attachment_url?: string
  }) => {
    const res = await api.post('/auth/contact/', data)
    return res.data // { message, ticket_number, created_at }
  },
}

// ==========================================
// 2. SERVICES & WORKERS API
// ==========================================
export const servicesApi = {
  getCategories: async () => {
    const res = await api.get('/services/categories/')
    return res.data
  },
  getWorkers: async (params?: { category?: string; search?: string; verified?: boolean }) => {
    const res = await api.get('/services/workers/', { params })
    return Array.isArray(res.data) ? res.data : (res.data?.results || [])
  },
  getWorkerDetail: async (id: string) => {
    const res = await api.get(`/services/workers/${id}/`)
    return res.data
  },
}

// ==========================================
// 3. BOOKINGS API
// ==========================================
export const bookingsApi = {
  getBookings: async () => {
    const res = await api.get('/bookings/')
    return res.data
  },
  createBooking: async (data: {
    worker: string
    service_type: string
    description: string
    location_address: string
    preferred_date: string
    agreed_amount: number | string
    payment_method?: 'escrow' | 'direct_settlement'
    currency?: string
  }) => {
    const res = await api.post('/bookings/', data)
    return res.data
  },
  getBookingDetail: async (bookingCode: string) => {
    const res = await api.get(`/bookings/${bookingCode}/`)
    return res.data
  },
  updateStatus: async (bookingCode: string, status: string, note?: string) => {
    const res = await api.post(`/bookings/${bookingCode}/status/`, { status, note })
    return res.data
  },
  requestPriceAdjustment: async (
    bookingCode: string,
    data: {
      parts_cost: number | string
      labor_cost: number | string
      reason: string
      proof_url?: string
    }
  ) => {
    const res = await api.post(`/bookings/${bookingCode}/price-adjustment/request/`, data)
    return res.data
  },
  respondPriceAdjustment: async (
    bookingCode: string,
    decision: 'approved' | 'declined',
    note?: string
  ) => {
    const res = await api.post(`/bookings/${bookingCode}/price-adjustment/respond/`, { decision, note })
    return res.data
  },
  confirmDirectPayment: async (
    bookingCode: string,
    data?: { party?: string; method?: string; note?: string }
  ) => {
    const res = await api.post(`/bookings/${bookingCode}/direct-payment/confirm/`, data || {})
    return res.data
  },
  updateLiveLocation: async (
    bookingCode: string,
    data: {
      latitude: number
      longitude: number
      speed?: number
      heading?: number
      transit_status?: 'idle' | 'dispatched' | 'en_route' | 'arrived'
    }
  ) => {
    const res = await api.post(`/bookings/${bookingCode}/live-location/`, data)
    return res.data
  },
}

// ==========================================
// 4. ESCROW CUSTODY & WALLET API
// ==========================================
export const escrowApi = {
  getVaults: async () => {
    const res = await api.get('/escrow/vaults/')
    return res.data
  },
  getVaultDetail: async (vaultReference: string) => {
    const res = await api.get(`/escrow/vaults/${vaultReference}/`)
    return res.data
  },
  fundVault: async (data: {
    worker_id: string
    total_amount: number | string
    service_description: string
    booking_code?: string
    payment_channel?: string
    client_refund_nuban?: string
    settlement_nuban?: string
  }) => {
    const res = await api.post('/escrow/vaults/fund/', data)
    return res.data
  },
  releaseEscrow: async (vaultReference: string, otp: string, settlementNuban?: string) => {
    const res = await api.post(`/escrow/vaults/${vaultReference}/release/`, {
      otp,
      settlement_nuban: settlementNuban,
    })
    return res.data
  },
  cancelEscrow: async (vaultReference: string, reason?: string, clientNuban?: string) => {
    const res = await api.post(`/escrow/vaults/${vaultReference}/cancel/`, {
      reason,
      client_nuban: clientNuban,
    })
    return res.data
  },
  getWallet: async () => {
    const res = await api.get('/escrow/wallet/')
    return res.data
  },
}

// ==========================================
// 5. DISPUTES & FORENSIC ARBITRATION API
// ==========================================
export const disputesApi = {
  getDisputes: async () => {
    const res = await api.get('/disputes/')
    return res.data
  },
  getDisputeDetail: async (caseNumber: string) => {
    const res = await api.get(`/disputes/${caseNumber}/`)
    return res.data
  },
  getRoomData: async (caseNumber: string) => {
    const res = await api.get(`/disputes/${caseNumber}/room/`)
    return res.data
  },
  getForensicAudit: async (caseNumber: string) => {
    const res = await api.get(`/disputes/${caseNumber}/audit/`)
    return res.data
  },
  sendMessage: async (caseNumber: string, content: string, attachmentUrl?: string) => {
    const res = await api.post(`/disputes/${caseNumber}/messages/`, {
      content,
      attachment_url: attachmentUrl,
    })
    return res.data
  },
  executeRestitution: async (caseNumber: string) => {
    const res = await api.post(`/disputes/${caseNumber}/restitution/`)
    return res.data
  },
}

// ==========================================
// 6. MARKETPLACE API
// ==========================================
export const marketplaceApi = {
  getItems: async (params?: {
    category?: string
    condition?: string
    search?: string
    min_price?: number | string
    max_price?: number | string
    seller_id?: string
  }) => {
    const res = await api.get('/marketplace/items/', { params })
    return res.data
  },
  getItemDetail: async (id: string) => {
    const res = await api.get(`/marketplace/items/${id}/`)
    return res.data
  },
  createItem: async (data: {
    title: string
    description: string
    category: string
    condition: string
    price: number | string
    location_name?: string
    images?: string[]
    pickup_options?: string[]
  }) => {
    const res = await api.post('/marketplace/items/', data)
    return res.data
  },
  toggleSave: async (id: string) => {
    const res = await api.post(`/marketplace/items/${id}/toggle-save/`)
    return res.data
  },
  getSavedItems: async () => {
    const res = await api.get('/marketplace/saved/')
    return res.data
  },
  getCategories: async () => {
    const res = await api.get('/marketplace/categories/')
    return res.data
  },
}

// ==========================================
// 7. VIDEO FEED API
// ==========================================
export const feedApi = {
  getVideos: async (params?: { tab?: string; category?: string; search?: string }) => {
    const res = await api.get('/feed/videos/', { params })
    return res.data
  },
  createVideo: async (data: {
    title: string
    description?: string
    video_url: string
    thumbnail_url: string
    category?: string
    location_name?: string
  }) => {
    const res = await api.post('/feed/videos/', data)
    return res.data
  },
  getVideoDetail: async (id: string) => {
    const res = await api.get(`/feed/videos/${id}/`)
    return res.data
  },
  toggleLike: async (id: string) => {
    const res = await api.post(`/feed/videos/${id}/like/`)
    return res.data
  },
  toggleSave: async (id: string) => {
    const res = await api.post(`/feed/videos/${id}/save/`)
    return res.data
  },
  getComments: async (id: string) => {
    const res = await api.get(`/feed/videos/${id}/comments/`)
    return res.data
  },
  addComment: async (id: string, text: string) => {
    const res = await api.post(`/feed/videos/${id}/comments/`, { text })
    return res.data
  },
  toggleCommentLike: async (id: string) => {
    const res = await api.post(`/feed/comments/${id}/like/`)
    return res.data
  },
}

// ==========================================
// 8. DIRECT CHAT API
// ==========================================
export const chatApi = {
  getConversations: async () => {
    const res = await api.get('/chat/conversations/')
    return res.data
  },
  startConversation: async (data: { recipient_id?: string; worker_id?: string; booking_id?: string }) => {
    const res = await api.post('/chat/conversations/', data)
    return res.data
  },
  getConversationDetail: async (id: string) => {
    const res = await api.get(`/chat/conversations/${id}/`)
    return res.data
  },
  getMessages: async (id: string) => {
    const res = await api.get(`/chat/conversations/${id}/messages/`)
    return res.data
  },
  sendMessage: async (id: string, content: string, mediaUrl?: string, messageType = 'text') => {
    const res = await api.post(`/chat/conversations/${id}/messages/`, {
      content,
      media_url: mediaUrl,
      message_type: messageType,
    })
    return res.data
  },
  markRead: async (id: string) => {
    const res = await api.post(`/chat/conversations/${id}/read/`)
    return res.data
  },
  // WebRTC Real-Time Call Signaling
  startCallSession: async (data: { recipient_id: string; call_type: 'audio' | 'video'; offer: any; conversation_id?: string }) => {
    const res = await api.post('/chat/calls/start/', data)
    return res.data
  },
  getActiveIncomingCall: async () => {
    const res = await api.get('/chat/calls/active/')
    return res.data
  },
  getCallDetail: async (id: string) => {
    const res = await api.get(`/chat/calls/${id}/`)
    return res.data
  },
  answerCallSession: async (id: string, answer: any) => {
    const res = await api.post(`/chat/calls/${id}/answer/`, { answer })
    return res.data
  },
  sendIceCandidate: async (id: string, candidate: any) => {
    const res = await api.post(`/chat/calls/${id}/ice-candidate/`, { candidate })
    return res.data
  },
  endCallSession: async (id: string, status = 'ended') => {
    const res = await api.post(`/chat/calls/${id}/end/`, { status })
    return res.data
  },
}

// ==========================================
// 9. AI ASSISTANT API
// ==========================================
export const assistantApi = {
  sendChat: async (
    message: string,
    sessionId?: string,
    currency?: string,
    location?: string,
    photoUrl?: string
  ) => {
    const res = await api.post('/assistant/chat/', {
      message,
      session_id: sessionId,
      currency: currency || 'USD',
      location: location || 'Worldwide (Global Dispatch)',
      photo_url: photoUrl,
    })
    return res.data
  },
  getPrompts: async () => {
    const res = await api.get('/assistant/prompts/')
    return res.data
  },
}

// ==========================================
// 10. DEVICE FILE & MEDIA UPLOAD API
// ==========================================
export const uploadApi = {
  uploadFile: async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    const res = await api.post('/upload/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return res.data // { url, full_url, filename, size, content_type }
  },
}

