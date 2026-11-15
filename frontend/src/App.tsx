import { Routes, Route, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { useAppStore } from '@/stores/useAppStore'

// Layout
import Navbar from '@/components/layout/Navbar'
import MobileBottomNav from '@/components/layout/MobileBottomNav'
import Footer from '@/components/layout/Footer'
import FacebookChatDock from '@/components/chat/FacebookChatDock'
import ActiveCallModal from '@/components/chat/ActiveCallModal'
import IncomingCallModal from '@/components/chat/IncomingCallModal'
import LocationPromptModal from '@/components/location/LocationPromptModal'

// Pages
import HomePage from '@/pages/HomePage'
import ExploreMapPage from '@/pages/ExploreMapPage'
import VideoFeedPage from '@/pages/VideoFeedPage'
import MarketplacePage from '@/pages/MarketplacePage'
import AuthPage from '@/pages/AuthPage'
import WorkerProfilePage from '@/pages/WorkerProfilePage'
import AIAssistantPage from '@/pages/AIAssistantPage'
import ChatPage from '@/pages/ChatPage'
import BookingPage from '@/pages/BookingPage'
import TrackingPage from '@/pages/TrackingPage'
import ProfilePage from '@/pages/ProfilePage'
import EscrowFundPage from '@/pages/EscrowFundPage'
import EscrowSettlementPage from '@/pages/EscrowSettlementPage'
import DisputeMediationPage from '@/pages/DisputeMediationPage'
import LiveMediationRoomPage from '@/pages/LiveMediationRoomPage'
import IndependentAuditPage from '@/pages/IndependentAuditPage'
import AppDownloadPage from '@/pages/AppDownloadPage'
import ContactPage from '@/pages/ContactPage'
import NotFoundPage from '@/pages/NotFoundPage'

// Pages that should NOT render the standard footer
const NO_FOOTER_ROUTES = ['/feed', '/messages', '/chat', '/assistant']
// Full-height pages (no footer, different layout)
const FULL_HEIGHT_ROUTES = ['/messages', '/chat', '/assistant']

export default function App() {
  const { theme } = useAppStore()
  const location = useLocation()

  // Apply theme class on mount & change
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') root.classList.add('dark')
    else root.classList.remove('dark')
  }, [theme])

  // Automatically let device acquire GPS on startup (no manual selection required)
  useEffect(() => {
    useAppStore.getState().requestGPSLocation().catch(() => {})
  }, [])

  const showFooter = !NO_FOOTER_ROUTES.some((r) => location.pathname.startsWith(r))
  const isFullHeight = FULL_HEIGHT_ROUTES.some((r) => location.pathname.startsWith(r))
  const isDedicatedChatPage = location.pathname.startsWith('/messages') || location.pathname.startsWith('/chat')

  return (
    <div className={`min-h-screen ${isFullHeight ? 'flex flex-col overflow-hidden' : ''}`}>
      <Navbar />

      <main className={isFullHeight ? 'flex-1 overflow-hidden' : ''}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/services" element={<HomePage />} />
          <Route path="/map" element={<ExploreMapPage />} />
          <Route path="/feed" element={<VideoFeedPage />} />
          <Route path="/marketplace" element={<MarketplacePage />} />
          <Route path="/marketplace/:id" element={<MarketplacePage />} />
          <Route path="/login" element={<AuthPage />} />
          <Route path="/register" element={<AuthPage />} />
          <Route path="/workers/:id" element={<WorkerProfilePage />} />
          <Route path="/users/:id" element={<WorkerProfilePage />} />
          <Route path="/book/:workerId" element={<BookingPage />} />
          <Route path="/booking/:bookingCode" element={<BookingPage />} />
          <Route path="/tracking" element={<TrackingPage />} />
          <Route path="/tracking/:bookingCode" element={<TrackingPage />} />
          <Route path="/escrow/fund" element={<EscrowFundPage />} />
          <Route path="/escrow/fund/:id" element={<EscrowFundPage />} />
          <Route path="/escrow/settlement" element={<EscrowSettlementPage />} />
          <Route path="/escrow/settlement/:id" element={<EscrowSettlementPage />} />
          <Route path="/disputes" element={<DisputeMediationPage />} />
          <Route path="/disputes/:id" element={<DisputeMediationPage />} />
          <Route path="/mediation" element={<DisputeMediationPage />} />
          <Route path="/mediation/room" element={<LiveMediationRoomPage />} />
          <Route path="/mediation/room/:id" element={<LiveMediationRoomPage />} />
          <Route path="/mediation/audit" element={<IndependentAuditPage />} />
          <Route path="/disputes/:id/audit" element={<IndependentAuditPage />} />
          <Route path="/messages" element={<ChatPage />} />
          <Route path="/messages/new" element={<ChatPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/chat/:id" element={<ChatPage />} />
          <Route path="/assistant" element={<AIAssistantPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/app" element={<AppDownloadPage />} />
          <Route path="/download" element={<AppDownloadPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/support" element={<ContactPage />} />
          <Route path="/post-job" element={<HomePage />} />
          <Route path="/create" element={<VideoFeedPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>

      {/* Global Facebook-style Messenger Dock (hidden when on dedicated full-screen /chat or /messages) */}
      {!isDedicatedChatPage && <FacebookChatDock />}

      {/* Global Interactive Audio & Video Call Modal */}
      <ActiveCallModal />

      {/* Global Incoming Call Alert & Answer Modal */}
      <IncomingCallModal />

      {/* Global Location Activation Modal (prompts every user to turn on location) */}
      <LocationPromptModal />

      {showFooter && <Footer />}
      {!isDedicatedChatPage && <MobileBottomNav />}
    </div>
  )
}
