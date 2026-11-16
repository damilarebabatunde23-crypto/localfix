import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | string, currency = 'USD'): string {
  const num = typeof amount === 'string' ? parseFloat(amount) || 0 : (amount || 0)
  if (currency === 'NGN') {
    return `₦${num.toLocaleString('en-NG', { maximumFractionDigits: 2 })}`
  }
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(num)
  } catch {
    return `${currency} ${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}m away`
  return `${km.toFixed(1)} km away`
}

export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0
  const R = 6371 // Radius of earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return parseFloat((R * c).toFixed(1))
}

export function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}min ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function randomAvatar(seed: string): string {
  // Use DiceBear avatars as placeholder
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}&backgroundColor=6D28D9`
}

export function randomWorkerPhoto(seed: number): string {
  // Realistic placeholder faces
  const photos = [
    'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?w=150&h=150&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&h=150&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=150&h=150&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1552058544-f2b08422138a?w=150&h=150&fit=crop&crop=face',
  ]
  return photos[seed % photos.length]
}

export const SERVICE_CATEGORIES = [
  { id: '1', name: 'Electrician', slug: 'electrician', icon: '⚡', color: '#F59E0B', workerCount: 47, description: 'Wiring, repairs, installations' },
  { id: '2', name: 'Plumber', slug: 'plumber', icon: '🔧', color: '#3B82F6', workerCount: 38, description: 'Pipes, leaks, borehole, taps' },
  { id: '3', name: 'AC & Fridge', slug: 'ac-fridge', icon: '❄️', color: '#06B6D4', workerCount: 29, description: 'Gas recharge, servicing, cleaning' },
  { id: '4', name: 'Carpenter', slug: 'carpenter', icon: '🪵', color: '#92400E', workerCount: 33, description: 'Carpentry, roofing, furniture' },
  { id: '5', name: 'Auto Mechanic', slug: 'mechanic', icon: '🚗', color: '#6B7280', workerCount: 41, description: 'Auto repairs, tires, servicing' },
  { id: '6', name: 'Painter & POP', slug: 'painter', icon: '🎨', color: '#EC4899', workerCount: 25, description: 'Painting, stucco, decoration' },
  { id: '7', name: 'Welder', slug: 'welder', icon: '🔩', color: '#EF4444', workerCount: 18, description: 'Welding, fabrication, gates' },
  { id: '8', name: 'Fumigation & Clean', slug: 'cleaning', icon: '🧹', color: '#10B981', workerCount: 22, description: 'Pest control, deep cleaning' },
  { id: '9', name: 'Appliances', slug: 'appliances', icon: '🖥️', color: '#8B5CF6', workerCount: 31, description: 'Washing machine, oven repair' },
  { id: '10', name: 'Phone / PC Tech', slug: 'tech-repair', icon: '📱', color: '#0EA5E9', workerCount: 44, description: 'Screen repair, data recovery' },
]

export interface WorldHub {
  name: string
  country: string
  coords: [number, number]
  zoom: number
  currency: string
}

export const WORLD_HUBS: WorldHub[] = [
  { name: 'Worldwide (Global Overview)', country: 'Global', coords: [20.0, 0.0], zoom: 2, currency: 'USD' },
  { name: 'New York', country: 'United States', coords: [40.7128, -74.0060], zoom: 12, currency: 'USD' },
  { name: 'London', country: 'United Kingdom', coords: [51.5074, -0.1278], zoom: 12, currency: 'GBP' },
  { name: 'Toronto', country: 'Canada', coords: [43.6532, -79.3832], zoom: 12, currency: 'CAD' },
  { name: 'Berlin', country: 'Germany', coords: [52.5200, 13.4050], zoom: 12, currency: 'EUR' },
  { name: 'Paris', country: 'France', coords: [48.8566, 2.3522], zoom: 12, currency: 'EUR' },
  { name: 'Tokyo', country: 'Japan', coords: [35.6762, 139.6503], zoom: 12, currency: 'JPY' },
  { name: 'Sydney', country: 'Australia', coords: [-33.8688, 151.2093], zoom: 12, currency: 'AUD' },
  { name: 'Dubai', country: 'United Arab Emirates', coords: [25.2048, 55.2708], zoom: 12, currency: 'AED' },
  { name: 'Lagos', country: 'Nigeria', coords: [6.5244, 3.3792], zoom: 12, currency: 'NGN' },
  { name: 'Nairobi', country: 'Kenya', coords: [-1.2921, 36.8219], zoom: 12, currency: 'KES' },
]

export const MOCK_WORKERS: any[] = []

export const MOCK_MARKETPLACE = [
  {
    id: 'm1', title: 'DeWalt 20V Max Hammer Drill + 2 Batteries', price: 120, currency: 'USD',
    condition: 'like_new' as const, category: 'Power Tools', locationName: 'Manhattan, New York • 1.4km away',
    status: 'available' as const, seller: { name: 'Samuel E.', isVerified: true, badge: 'Verified Carpenter' },
    images: ['https://images.unsplash.com/photo-1572981779307-38b8cabb2407?w=400&h=300&fit=crop'],
    distanceKm: 1.4, isInspectionReady: true, pickupOptions: ['pickup' as const, 'delivery' as const],
    description: 'Original brushless motor unit with dual charger and hard case. Rarely used on single residential drywall...',
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    sellerId: 'u5', location: { lat: 40.7128, lng: -74.0060 },
  },
  {
    id: 'm2', title: 'Makita 18V LXT Cordless Circular Saw Kit', price: 95, currency: 'GBP',
    condition: 'brand_new' as const, category: 'Power Tools', locationName: 'Camden, London • 2.2km away',
    status: 'available' as const, seller: { name: 'Oliver B.', isVerified: true, badge: 'Verified Craftsman' },
    images: ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop'],
    distanceKm: 2.2, isInspectionReady: true, pickupOptions: ['pickup' as const],
    description: 'Factory sealed cordless circular saw with precision guide rail. Surplus from construction project...',
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    sellerId: 'u6', location: { lat: 51.5074, lng: -0.1278 },
  },
  {
    id: 'm3', title: 'Bosch Professional Digital Laser Measure 50m', price: 65, currency: 'EUR',
    condition: 'brand_new' as const, category: 'Measuring Tools', locationName: 'Mitte, Berlin • 1.8km away',
    status: 'available' as const, seller: { name: 'Klaus M.', isVerified: true, badge: 'Verified Surveyor' },
    images: ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop'],
    distanceKm: 1.8, isInspectionReady: true, pickupOptions: ['pickup' as const],
    description: 'High-accuracy laser distance meter with Bluetooth sync to CAD floor plan apps.',
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    sellerId: 'u7', location: { lat: 52.5200, lng: 13.4050 },
  },
  {
    id: 'm4', title: 'Ridgid Style Hydraulic Pipe Press Tool', price: 160, currency: 'USD',
    condition: 'fair' as const, category: 'Plumbing Fixtures', locationName: 'Downtown Toronto • 0.9km away',
    status: 'available' as const, seller: { name: 'David M.', isVerified: true, badge: 'Master Plumber' },
    images: ['https://images.unsplash.com/photo-1572981779307-38b8cabb2407?w=400&h=300&fit=crop'],
    distanceKm: 0.9, isInspectionReady: true, pickupOptions: ['pickup' as const],
    description: 'Reliable pressure seal crimper. Minor paint scuffs on handle, mechanical seals pristine. Ideal for PEX & Copper...',
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    sellerId: 'u8', location: { lat: 43.6532, lng: -79.3832 },
  },
]

export function normalizeWorker(w: any): any {
  if (!w) return null
  const resolvedName =
    w.display_name ||
    w.displayName ||
    (w.user?.full_name) ||
    (w.user?.first_name ? `${w.user.first_name} ${w.user.last_name || ''}`.trim() : '') ||
    'Verified Artisan'
  const resolvedPhone =
    w.phone ||
    w.phone_number ||
    w.whatsapp_number ||
    w.whatsapp ||
    w.user?.phone ||
    '+234 800 000 0000'

  return {
    id: String(w.id),
    userId: w.user?.id ? String(w.user.id) : (w.userId || String(w.id)),
    displayName: resolvedName,
    avatar:
      w.avatar ||
      w.user?.resolved_avatar ||
      w.user?.avatar ||
      `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(resolvedName)}&backgroundColor=6D28D9`,
    profession: w.profession || w.category_name || 'Specialist Technician',
    phone: resolvedPhone,
    whatsapp: w.whatsapp_number || w.whatsapp || resolvedPhone,
    skills: w.skills || (w.category_name ? [w.category_name] : ['Artisan']),
    bio: w.bio || 'Vetted and verified LocalFix craftsman.',
    yearsExperience: w.years_experience ?? w.yearsExperience ?? 5,
    serviceArea: w.service_area || w.serviceArea || 'Metro Hub (Worldwide)',
    serviceRadius: w.service_radius_km ?? w.serviceRadius ?? 15,
    location: {
      lat: Number(w.latitude ?? w.location?.lat ?? 40.7128),
      lng: Number(w.longitude ?? w.location?.lng ?? -74.0060),
    },
    distanceKm: w.distanceKm ?? 1.5,
    rating: Number(w.rating !== undefined && w.rating !== null ? w.rating : 0),
    reviewCount: Number(w.review_count !== undefined && w.review_count !== null ? w.review_count : (w.reviewCount ?? 0)),
    completedJobs: Number(w.completed_jobs !== undefined && w.completed_jobs !== null ? w.completed_jobs : (w.completedJobs ?? 0)),
    languages: w.languages || w.user?.languages || ['English', 'Nigerian Pidgin'],
    calloutRate: Number(w.callout_rate ?? w.calloutRate ?? 75),
    currency: w.currency || 'USD',
    isVerified: Boolean(w.is_verified ?? w.isVerified ?? true),
    verificationBadge: w.verification_badge || w.verificationBadge || 'Vetted Pro',
    isOnline: Boolean(w.is_online ?? w.isOnline ?? true),
    avgResponseMins: Number(w.avg_response_mins ?? w.avgResponseMins ?? 10),
    portfolioImages: w.portfolio_items?.map((p: any) => p.image_url) || w.portfolioImages || [],
    specialisms: w.specialisms || ['Residential Maintenance', 'Rapid Diagnosis'],
    isAvailable: Boolean(w.is_available ?? w.isAvailable ?? true),
    price: w.price || `₦${Number(w.callout_rate ?? w.calloutRate ?? 8000).toLocaleString()} / callout`,
    portfolio_items: w.portfolio_items || [],
    reviews: w.reviews || [],
  }
}

