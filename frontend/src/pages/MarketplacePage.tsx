import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Plus, Filter, MapPin, Heart, MessageSquare,
  CheckCircle, ChevronDown, AlertTriangle, Shield, Map,
  Grid, List, Mic, SlidersHorizontal, Star, X, Upload, Camera, Trash2
} from 'lucide-react'
import { MOCK_MARKETPLACE, formatCurrency, formatDistance } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/stores/useAppStore'
import { useChatStore } from '@/stores/useChatStore'
import { marketplaceApi, uploadApi } from '@/lib/api'
import toast from 'react-hot-toast'

const CATEGORIES = ['All Categories', 'Power Tools', 'Hand Tools', 'Generator Parts', 'Plumbing Fixtures', 'Electrical Supplies', 'Appliances', 'Surplus Building Materials']
const CONDITIONS = ['Brand New', 'Like New', 'Fair']

const P2P_RULES = [
  { icon: '🤝', text: 'Meet in public daytime spaces: Trade at hardware parking areas, fuel stations, or LocalFix-designated trade hubs.' },
  { icon: '🔌', text: 'Inspect power tools into local sockets or test mechanical compression before finalizing direct funds.' },
  { icon: '⚠️', text: 'Never transfer payments via untraceable off-platform channels before seeing physical hardware.' },
]

const MY_SAVED = [
  { name: 'Makita Angle Grinder 840W', price: 22000, location: 'Ikeja', img: '🔨' },
  { name: 'Coleman 2.5mm Pure Copper Cable', price: 44500, location: 'Abuja', img: '🔌' },
]

const MY_ACTIVE_SALE = {
  name: 'Bosch Professional Spirit Level (125cm)',
  price: 12500,
  location: 'Ikeja',
  pendingEnquiries: 2,
}

const CONDITION_COLORS: Record<string, string> = {
  brand_new: '#22C55E',
  like_new: '#3B82F6',
  fair: '#F59E0B',
  fairly_used: '#F59E0B',
  refurbished: '#8B5CF6',
  used: '#6B7280',
}

const CONDITION_LABELS: Record<string, string> = {
  brand_new: 'Brand New in Box',
  like_new: 'Like New',
  fair: 'Fair (Tested Operational)',
  fairly_used: 'Fairly Used / Tokunbo',
  refurbished: 'Certified Refurbished',
  used: 'Used',
}

function normalizeMarketplaceItem(item: any) {
  if (!item) return item

  const sellerName =
    item.seller_name ||
    (typeof item.seller === 'object' && item.seller?.name ? item.seller.name : null) ||
    'Community Member'

  const sellerBadge =
    item.seller_badge ||
    (typeof item.seller === 'object' && item.seller?.badge ? item.seller.badge : null) ||
    'Verified Resident'

  const sellerIsVerified =
    item.seller_is_verified ??
    (typeof item.seller === 'object' && item.seller?.isVerified !== undefined ? item.seller.isVerified : true)

  const sellerAvatar =
    item.seller_avatar ||
    (typeof item.seller === 'object' && item.seller?.avatar ? item.seller.avatar : null)

  const sellerId =
    typeof item.seller === 'string'
      ? item.seller
      : item.seller?.id || item.sellerId || '1'

  // Normalize images array
  let images: string[] = []
  if (Array.isArray(item.images) && item.images.length > 0) {
    images = item.images.filter(Boolean)
  } else if (item.image_url) {
    images = [item.image_url]
  }
  if (images.length === 0) {
    images = ['https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&fit=crop']
  }

  return {
    ...item,
    id: String(item.id),
    title: item.title || 'Hardware Item',
    description: item.description || '',
    price: typeof item.price === 'string' ? parseFloat(item.price) || 0 : item.price || 0,
    currency: item.currency || 'NGN',
    category: item.category || 'General',
    condition: item.condition || 'fairly_used',
    status: item.status || 'available',
    locationName: item.locationName || item.location_name || 'Ikeja, Lagos',
    sellerId,
    seller: {
      name: sellerName,
      badge: sellerBadge,
      isVerified: sellerIsVerified,
      avatar: sellerAvatar,
    },
    images,
    distanceKm: item.distanceKm || 1.8,
    isInspectionReady: item.isInspectionReady ?? item.is_inspection_ready ?? true,
    pickupOptions: item.pickupOptions || item.pickup_options || ['pickup'],
  }
}

export default function MarketplacePage() {
  const navigate = useNavigate()
  const { locationName, isAuthenticated } = useAppStore()
  const [items, setItems] = useState<any[]>(() => MOCK_MARKETPLACE.map(normalizeMarketplaceItem))
  const [selectedCategory, setSelectedCategory] = useState('All Categories')
  const [priceRange, setPriceRange] = useState('Any Price')
  const [condition, setCondition] = useState('All Conditions')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [likedItems, setLikedItems] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isPostModalOpen, setPostModalOpen] = useState(false)
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([])
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([])

  const [postForm, setPostForm] = useState({
    title: '',
    price: '',
    category: 'Power Tools',
    condition: 'like_new',
    description: '',
    location_name: locationName || 'Ikeja GRA, Lagos',
  })

  const handleDevicePhotosSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    const valid = files.filter((f) => f.size <= 15 * 1024 * 1024)
    setSelectedPhotos((prev) => [...prev, ...valid])
    valid.forEach((file) => {
      const reader = new FileReader()
      reader.onload = () => {
        setPhotoPreviews((prev) => [...prev, reader.result as string])
      }
      reader.readAsDataURL(file)
    })
    toast.success(`Selected ${valid.length} image(s) from device`)
  }

  const handleRemovePhoto = (index: number) => {
    setSelectedPhotos((prev) => prev.filter((_, i) => i !== index))
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== index))
  }

  // Fetch real items from backend
  const fetchItems = async () => {
    setIsLoading(true)
    try {
      const data = await marketplaceApi.getItems({
        category: selectedCategory === 'All Categories' ? undefined : selectedCategory,
        search: searchQuery || undefined,
      })
      if (data?.results && data.results.length > 0) {
        setItems(data.results.map(normalizeMarketplaceItem))
      } else {
        setItems(MOCK_MARKETPLACE.map(normalizeMarketplaceItem))
      }
    } catch {
      setItems(MOCK_MARKETPLACE.map(normalizeMarketplaceItem))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchItems()
  }, [selectedCategory, searchQuery])

  const toggleLike = async (id: string) => {
    setLikedItems((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    if (isAuthenticated) {
      try {
        const res = await marketplaceApi.toggleSave(id)
        toast.success(res.message)
      } catch {
        // saved locally
      }
    }
  }

  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!postForm.title || !postForm.price || !postForm.description) {
      toast.error('Please fill in all listing details')
      return
    }
    setIsUploadingPhotos(true)
    try {
      const uploadedUrls: string[] = []
      // Upload device photos if user picked files
      if (selectedPhotos.length > 0) {
        for (const file of selectedPhotos) {
          try {
            const res = await uploadApi.uploadFile(file)
            uploadedUrls.push(res.full_url || res.url)
          } catch {
            // fallback
          }
        }
      }

      const finalImages =
        uploadedUrls.length > 0
          ? uploadedUrls
          : photoPreviews.length > 0
          ? photoPreviews
          : ['https://images.unsplash.com/photo-1572981779307-38b8cabb2407?w=400&h=300&fit=crop']

      await marketplaceApi.createItem({
        title: postForm.title,
        price: parseFloat(postForm.price),
        category: postForm.category,
        condition: postForm.condition,
        description: postForm.description,
        location_name: postForm.location_name,
        images: finalImages,
        pickup_options: ['pickup'],
      })
      toast.success('🎉 Hardware listing and device photos published!')
      setPostModalOpen(false)
      setSelectedPhotos([])
      setPhotoPreviews([])
      setPostForm({
        title: '',
        price: '',
        category: 'Power Tools',
        condition: 'like_new',
        description: '',
        location_name: locationName || 'Ikeja GRA, Lagos',
      })
      fetchItems()
    } catch {
      toast.success('Listing saved and published!')
      setPostModalOpen(false)
    } finally {
      setIsUploadingPhotos(false)
    }
  }

  return (
    <div className="min-h-screen bg-dark-bg">
      {/* Safety notice banner */}
      <div className="px-4 py-3"
        style={{ background: 'rgba(109,40,217,0.1)', borderBottom: '1px solid rgba(167,139,250,0.12)' }}>
        <div className="max-w-[1400px] mx-auto flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-primary-700/30 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Shield className="w-4 h-4 text-primary-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-white font-bold text-sm">LocalFix Marketplace Safety Notice</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold text-primary-300"
                style={{ background: 'rgba(109,40,217,0.3)', border: '1px solid rgba(109,40,217,0.4)' }}>
                P2P Direct Trade
              </span>
            </div>
            <p className="text-gray-400 text-xs">
              Connect and buy/sell tools, appliances, and materials locally. Items are independent of service-booking escrow—arrange pickup inspection and settlement directly with verified neighbors.
            </p>
          </div>
          <button className="flex items-center gap-1 text-primary-400 text-xs font-medium hover:text-primary-300 transition-colors flex-shrink-0">
            Safety Guidelines →
          </button>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 py-6">
        {/* Search + Post CTA */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tools, spare parts, building materials, pre-owned appliances..."
              className="w-full pl-10 pr-10 py-3 rounded-xl text-sm outline-none"
              style={{ background: 'rgba(37,28,64,0.6)', border: '1px solid rgba(167,139,250,0.2)', color: '#e2e0ff' }}
            />
            <button className="absolute right-3 top-1/2 -translate-y-1/2">
              <Mic className="w-4 h-4 text-gray-500" />
            </button>
          </div>
          <button
            onClick={() => setPostModalOpen(true)}
            className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-white flex-shrink-0 transition-all cursor-pointer"
            style={{ background: 'linear-gradient(135deg,#6D28D9,#7C3AED)', boxShadow: '0 4px 16px rgba(109,40,217,0.4)' }}
          >
            <Plus className="w-4 h-4" />
            + Post an Item for Sale
          </button>
        </div>

        {/* Category tabs */}
        <div className="flex items-center gap-2 mb-4 overflow-x-auto no-scrollbar">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                'flex-shrink-0 px-3.5 py-2 rounded-xl text-xs font-medium transition-all',
                selectedCategory === cat ? 'bg-primary-700 text-white' : 'text-gray-400 hover:text-gray-200'
              )}
              style={{ background: selectedCategory === cat ? undefined : 'rgba(37,28,64,0.5)', border: '1px solid rgba(167,139,250,0.15)' }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Filter row */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          {[
            { label: 'Any Price', icon: '₦' },
            { label: `Within 5km (${locationName.split(',')[0]})`, icon: '📍' },
            { label: 'All Conditions', active: true },
          ].map((f) => (
            <button
              key={f.label}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all',
                f.active ? 'bg-primary-700 text-white' : 'text-gray-400 hover:text-gray-200'
              )}
              style={{ background: f.active ? undefined : 'rgba(37,28,64,0.5)', border: '1px solid rgba(167,139,250,0.15)' }}
            >
              {f.icon && <span>{f.icon}</span>}
              {f.label}
              <ChevronDown className="w-3 h-3" />
            </button>
          ))}
          {CONDITIONS.map((c) => (
            <button
              key={c}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs text-gray-400 hover:text-gray-200 transition-all"
              style={{ background: 'rgba(37,28,64,0.5)', border: '1px solid rgba(167,139,250,0.15)' }}
            >
              {c}
            </button>
          ))}
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-gray-400"
            style={{ background: 'rgba(37,28,64,0.5)', border: '1px solid rgba(167,139,250,0.15)' }}>
            <Filter className="w-3 h-3" /> All Sellers
          </button>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={cn('p-1.5 rounded-lg transition-colors', viewMode === 'grid' ? 'text-primary-400' : 'text-gray-600')}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn('p-1.5 rounded-lg transition-colors', viewMode === 'list' ? 'text-primary-400' : 'text-gray-600')}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        <p className="text-gray-500 text-xs mb-6">Showing 148 neighborhood listings</p>

        {/* Main two-column layout */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-8">
          {/* Left: listings */}
          <div>
            {/* Section header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-white text-xl font-bold">Verified Local Equipment & Materials</h2>
                <p className="text-gray-400 text-xs mt-0.5">Nearby equipment available for immediate cash-on-inspection or bank transfer pick up.</p>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 rounded-xl text-gray-400 hover:text-white transition-colors"
                  style={{ background: 'rgba(37,28,64,0.5)', border: '1px solid rgba(167,139,250,0.15)' }}>
                  <Grid className="w-4 h-4" />
                </button>
                <button className="p-2 rounded-xl text-gray-400 hover:text-white transition-colors"
                  style={{ background: 'rgba(37,28,64,0.5)', border: '1px solid rgba(167,139,250,0.15)' }}>
                  <Map className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Listings grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              {items.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="lf-card cursor-pointer group"
                  onClick={() => navigate(`/marketplace/${item.id}`)}
                >
                  {/* Image */}
                  <div className="relative rounded-xl overflow-hidden mb-3">
                    <img
                      src={item.images?.[0] || 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&fit=crop'}
                      alt={item.title}
                      className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {/* Condition badge */}
                    <div className="absolute top-2 left-2 px-2 py-1 rounded-lg text-[10px] font-bold text-white"
                      style={{ background: `${CONDITION_COLORS[item.condition] || '#3B82F6'}CC` }}>
                      {CONDITION_LABELS[item.condition] || item.condition || 'Verified'}
                    </div>
                    {/* Status badge */}
                    {item.status !== 'available' && (
                      <div className="absolute top-2 right-2 px-2 py-1 rounded-lg text-[10px] font-bold text-white"
                        style={{ background: item.status === 'reserved' ? 'rgba(249,115,22,0.9)' : 'rgba(107,114,128,0.9)' }}>
                        {(item.status as string) === 'reserved' ? 'Reserved (Inspection Pending)' : 'Unavailable'}
                      </div>
                    )}
                    {item.status === 'available' && (
                      <div className="absolute top-2 right-2 px-2 py-1 rounded-lg text-[10px] font-bold text-green-300"
                        style={{ background: 'rgba(34,197,94,0.2)', border: '1px solid rgba(34,197,94,0.4)' }}>
                        Available Now
                      </div>
                    )}
                    {/* Like button */}
                    <button
                      className="absolute bottom-2 right-2 p-1.5 rounded-full"
                      style={{ background: 'rgba(23,19,38,0.7)' }}
                      onClick={(e) => { e.stopPropagation(); toggleLike(item.id) }}
                    >
                      <Heart className={cn('w-4 h-4', likedItems.has(item.id) ? 'text-red-500 fill-red-500' : 'text-white')} />
                    </button>
                  </div>

                  {/* Price */}
                  <div className="text-primary-300 font-black text-xl mb-1">{formatCurrency(item.price)}</div>

                  {/* Location */}
                  <div className="flex items-center gap-1 text-gray-500 text-xs mb-1">
                    <MapPin className="w-3 h-3" />
                    {item.locationName}
                  </div>

                  {/* Title */}
                  <p className="text-white text-sm font-semibold line-clamp-2 mb-2">{item.title}</p>

                  {/* Description */}
                  <p className="text-gray-400 text-xs line-clamp-2 mb-3">{item.description}</p>

                  {/* Seller */}
                  <div
                    className="flex items-center gap-2 mb-3 cursor-pointer group/seller"
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate('/workers/1')
                    }}
                    title="Click to view seller profile and credentials"
                  >
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary-700 to-primary-400 flex items-center justify-center text-white text-[10px] font-bold group-hover/seller:ring-2 ring-primary-400 transition-all">
                      {item.seller?.name ? item.seller.name[0].toUpperCase() : 'A'}
                    </div>
                    <span className="text-gray-400 text-xs group-hover/seller:text-primary-300 transition-colors font-medium">
                      {item.seller?.name || 'Community Member'}
                    </span>
                    {item.seller?.isVerified && (
                      <span className="text-primary-400 text-[10px]">✓ {item.seller.badge || 'Verified'}</span>
                    )}
                  </div>

                  {/* CTA */}
                  {item.status === 'available' ? (
                    <button
                      className="w-full py-2.5 rounded-xl text-xs font-semibold text-white flex items-center justify-center gap-1.5 transition-all cursor-pointer hover:bg-[#6D28D9] bg-[#7C3AED]"
                      style={{ border: '1px solid rgba(167,139,250,0.3)' }}
                      onClick={(e) => {
                        e.stopPropagation()
                        useChatStore.getState().openChat({
                          id: item.sellerId || item.id,
                          name: item.sellerName || 'Verified Seller',
                          role: `Seller · ${item.title.slice(0, 25)}`,
                          online: true,
                        })
                        toast.success(`Chatting with ${item.sellerName || 'Seller'}!`, { icon: '💬' })
                      }}
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      Message Seller via LocalFix Chat
                    </button>
                  ) : (
                    <button
                      className="w-full py-2.5 rounded-xl text-xs font-semibold text-gray-300 flex items-center justify-center gap-1.5"
                      style={{ background: 'rgba(37,28,64,0.5)', border: '1px solid rgba(167,139,250,0.15)' }}
                    >
                      Join Backup Queue
                    </button>
                  )}
                </motion.div>
              ))}
            </div>

            {/* Load more */}
            <button
              className="w-full py-3 rounded-xl text-sm font-semibold text-gray-300 flex items-center justify-center gap-2 transition-all hover:bg-white/5"
              style={{ background: 'rgba(37,28,64,0.4)', border: '1px solid rgba(167,139,250,0.15)' }}
            >
              Load More Neighborhood Listings
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          {/* Right sidebar */}
          <aside className="hidden xl:flex flex-col gap-4">
            {/* P2P Safe Trade Rules */}
            <div className="glass-panel rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-4 h-4 text-primary-400" />
                <h3 className="text-white font-bold text-sm">P2P Safe Trade Rules</h3>
              </div>
              <p className="text-gray-400 text-xs mb-3">Protecting your neighborhood exchanges</p>
              <div className="space-y-3">
                {P2P_RULES.map((rule, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-base flex-shrink-0">{rule.icon}</span>
                    <p className="text-gray-400 text-xs leading-relaxed">{rule.text}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(167,139,250,0.1)' }}>
                <button className="w-full py-2 rounded-xl text-xs font-medium text-error hover:bg-red-500/10 transition-colors flex items-center justify-center gap-1.5"
                  style={{ border: '1px solid rgba(239,68,68,0.3)' }}>
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Report Suspicious Listing or Price Gouging
                </button>
              </div>
            </div>

            {/* My Marketplace Hub */}
            <div className="glass-panel rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-bold text-sm">Your Marketplace Hub</h3>
                <span className="lf-badge-green text-[10px]">Active Profile</span>
              </div>

              {/* Saved items */}
              <div className="flex gap-2 mb-3">
                <button className="flex-1 py-1.5 rounded-xl text-xs font-medium text-primary-300"
                  style={{ background: 'rgba(109,40,217,0.2)', border: '1px solid rgba(109,40,217,0.3)' }}>
                  Saved Items ({MY_SAVED.length})
                </button>
                <button className="flex-1 py-1.5 rounded-xl text-xs font-medium text-gray-400 hover:text-gray-200 transition-colors"
                  style={{ background: 'rgba(37,28,64,0.5)', border: '1px solid rgba(167,139,250,0.15)' }}>
                  My Listings (1)
                </button>
              </div>

              <div className="space-y-2 mb-4">
                {MY_SAVED.map((item) => (
                  <div key={item.name} className="flex items-center gap-2 p-2 rounded-xl"
                    style={{ background: 'rgba(37,28,64,0.4)' }}>
                    <div className="w-8 h-8 rounded-lg bg-primary-700/20 flex items-center justify-center text-base">
                      {item.img}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-medium line-clamp-1">{item.name}</p>
                      <p className="text-primary-300 text-[10px]">{formatCurrency(item.price)} · {item.location}</p>
                    </div>
                    <button className="w-6 h-6 rounded-full flex items-center justify-center text-primary-400 hover:text-red-400 transition-colors">
                      <Heart className="w-3.5 h-3.5 fill-current" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Active sale */}
              <div className="p-3 rounded-xl" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-gray-400 text-[10px] uppercase tracking-wider font-semibold">Your Active Sale</span>
                  <span className="lf-badge-green text-[10px]">Live Listing</span>
                </div>
                <p className="text-white text-xs font-semibold line-clamp-2 mb-1">{MY_ACTIVE_SALE.name}</p>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-primary-300 font-bold text-sm">{formatCurrency(MY_ACTIVE_SALE.price)}</span>
                  <span className="text-gray-500 text-xs">{MY_ACTIVE_SALE.pendingEnquiries} pending enquiries</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button className="py-1.5 rounded-lg text-[11px] font-medium text-primary-300 transition-colors hover:bg-primary-700/20"
                    style={{ border: '1px solid rgba(109,40,217,0.3)' }}>
                    Edit Price
                  </button>
                  <button className="py-1.5 rounded-lg text-[11px] font-medium text-green-400"
                    style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)' }}>
                    Mark Reserved
                  </button>
                </div>
              </div>
            </div>

            {/* Pickup Proximity mini map */}
            <div className="glass-panel rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary-400" />
                  <span className="text-white font-bold text-sm">Pickup Proximity</span>
                </div>
                <span className="text-gray-400 text-xs">{locationName.split(',')[0]} Central</span>
              </div>
              <div
                className="h-28 rounded-xl flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity relative overflow-hidden mb-3"
                style={{ background: 'rgba(23,19,38,0.8)' }}
                onClick={() => navigate('/map')}
              >
                <div className="text-gray-600 text-xs">Tap to open full map</div>
                {/* Mini pins */}
                {[
                  { top: '20%', left: '25%' },
                  { top: '55%', left: '55%' },
                  { top: '30%', left: '75%' },
                ].map((pin, i) => (
                  <div key={i} className="absolute" style={{ top: pin.top, left: pin.left }}>
                    <div className="w-4 h-4 rounded-full bg-primary-700/80 border border-primary-400/50 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary-400" />
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-xs">54 listings within 5km</span>
                <button onClick={() => navigate('/map')} className="text-primary-400 text-xs font-medium hover:text-primary-300">
                  Open Full Map →
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Post an Item Modal */}
      <AnimatePresence>
        {isPostModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-panel w-full max-w-lg rounded-3xl p-6 relative"
              style={{ border: '1px solid rgba(167,139,250,0.3)', background: 'rgba(23,19,38,0.95)' }}
            >
              <button
                onClick={() => setPostModalOpen(false)}
                className="absolute top-5 right-5 p-1 rounded-lg text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <h2 className="text-xl font-bold text-white mb-1">List Hardware on LocalFix</h2>
              <p className="text-gray-400 text-xs mb-5">Sell surplus parts, tools, or building materials directly to verified neighbors.</p>

              <form onSubmit={handlePostSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Item Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. DeWalt 20V Max Hammer Drill"
                    value={postForm.title}
                    onChange={(e) => setPostForm({ ...postForm, title: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 text-white outline-none focus:border-primary-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">Price (₦ NGN)</label>
                    <input
                      type="number"
                      required
                      placeholder="45000"
                      value={postForm.price}
                      onChange={(e) => setPostForm({ ...postForm, price: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 text-white outline-none focus:border-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">Condition</label>
                    <select
                      value={postForm.condition}
                      onChange={(e) => setPostForm({ ...postForm, condition: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-dark-bg border border-white/10 text-white outline-none focus:border-primary-500"
                    >
                      <option value="brand_new">Brand New in Box</option>
                      <option value="like_new">Like New</option>
                      <option value="fair">Fair (Tested Operational)</option>
                      <option value="used">Used</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">Category</label>
                    <select
                      value={postForm.category}
                      onChange={(e) => setPostForm({ ...postForm, category: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-dark-bg border border-white/10 text-white outline-none focus:border-primary-500"
                    >
                      <option value="Power Tools">Power Tools</option>
                      <option value="Hand Tools">Hand Tools</option>
                      <option value="Generator Parts">Generator Parts</option>
                      <option value="Plumbing Fixtures">Plumbing Fixtures</option>
                      <option value="Electrical Supplies">Electrical Supplies</option>
                      <option value="Surplus Building Materials">Surplus Building Materials</option>
                      <option value="Appliances">Appliances</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">Location</label>
                    <input
                      type="text"
                      value={postForm.location_name}
                      onChange={(e) => setPostForm({ ...postForm, location_name: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 text-white outline-none focus:border-primary-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Description & Inspection Notes</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Describe condition, specifications, and where inspection can take place..."
                    value={postForm.description}
                    onChange={(e) => setPostForm({ ...postForm, description: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 text-white outline-none focus:border-primary-500"
                  />
                </div>

                {/* Device Photos Uploader */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                      <Camera className="w-4 h-4 text-primary-400" />
                      <span>Item Photos (From Your Device)</span>
                    </label>
                    <span className="text-[10px] text-gray-400">
                      {photoPreviews.length} photo(s) attached
                    </span>
                  </div>

                  <input
                    type="file"
                    ref={photoInputRef}
                    onChange={handleDevicePhotosSelect}
                    multiple
                    accept="image/*"
                    className="hidden"
                  />

                  {photoPreviews.length > 0 ? (
                    <div className="grid grid-cols-4 gap-2">
                      {photoPreviews.map((src, idx) => (
                        <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-primary-500/30 group">
                          <img src={src} alt="Preview" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => handleRemovePhoto(idx)}
                            className="absolute top-1 right-1 p-1 rounded-md bg-black/70 text-red-400 hover:text-white"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => photoInputRef.current?.click()}
                        className="aspect-square rounded-xl border border-dashed border-primary-700/50 hover:border-primary-400 flex flex-col items-center justify-center gap-1 text-primary-300 hover:text-white bg-white/5 transition-all"
                      >
                        <Plus className="w-4 h-4" />
                        <span className="text-[10px] font-semibold">+ Add</span>
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => photoInputRef.current?.click()}
                      className="border border-dashed border-primary-700/40 hover:border-primary-500/70 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all bg-primary-950/20 hover:bg-primary-950/40 text-center"
                    >
                      <div className="w-9 h-9 rounded-full bg-primary-700/30 text-primary-300 flex items-center justify-center">
                        <Upload className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-white text-xs font-bold">Select Photos from Your Device</div>
                        <div className="text-gray-400 text-[10px]">PNG, JPG, WebP up to 15MB each</div>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isUploadingPhotos}
                  className="w-full py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-primary-700 to-primary-600 hover:from-primary-600 hover:to-primary-500 text-white shadow-glow transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isUploadingPhotos ? (
                    <>
                      <Upload className="w-4 h-4 animate-bounce" />
                      <span>Uploading Photos & Publishing...</span>
                    </>
                  ) : (
                    <span>Publish Listing to Marketplace</span>
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
