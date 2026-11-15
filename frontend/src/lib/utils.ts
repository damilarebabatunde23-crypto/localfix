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

export const MOCK_WORKERS = [
  {
    id: '1', userId: 'u1', displayName: 'Alex Chen', avatar: randomWorkerPhoto(0),
    profession: 'Master Electrician & EV Charging Specialist', skills: ['Solar & Electrical'],
    bio: 'Certified master electrician specializing in commercial panel upgrades, smart subpanels, and residential Tesla/Level-2 EV chargers.',
    yearsExperience: 11, serviceArea: 'New York & Tri-State Area', serviceRadius: 25,
    location: { lat: 40.7128, lng: -74.0060 }, distanceKm: 1.2,
    rating: 4.98, reviewCount: 142, completedJobs: 280,
    calloutRate: 85, currency: 'USD', isVerified: true,
    verificationBadge: 'Licensed Master Electrician', isOnline: true, avgResponseMins: 8,
    portfolioImages: [], specialisms: ['Smart Panel Upgrades', 'Tesla Wall Connectors', 'Commercial 3-Phase'],
    isAvailable: true, price: '$85 / callout',
  },
  {
    id: '2', userId: 'u2', displayName: 'Marcus Sterling', avatar: randomWorkerPhoto(1),
    profession: 'Commercial HVAC & Hydronic Heat Pumps', skills: ['HVAC'],
    bio: 'Gas Safe registered engineer specializing in central boiler replacements, air-source heat pumps, and underfloor hydronics.',
    yearsExperience: 14, serviceArea: 'Greater London & South East', serviceRadius: 30,
    location: { lat: 51.5074, lng: -0.1278 }, distanceKm: 2.1,
    rating: 4.95, reviewCount: 118, completedJobs: 210,
    calloutRate: 75, currency: 'GBP', isVerified: true,
    verificationBadge: 'Gas Safe Registered', isOnline: true, avgResponseMins: 11,
    portfolioImages: [], specialisms: ['Heat Pump Retrofit', 'Boiler Diagnostics', 'Hydronic Balancing'],
    isAvailable: true, price: '£75 / callout',
  },
  {
    id: '3', userId: 'u3', displayName: 'David Miller', avatar: randomWorkerPhoto(2),
    profession: 'Licensed Master Plumber & Backflow Prevention', skills: ['Plumbing'],
    bio: 'Red Seal certified plumber specializing in high-pressure drain jetting, tankless water heater installation, and trenchless pipe repairs.',
    yearsExperience: 12, serviceArea: 'Greater Toronto Area (GTA)', serviceRadius: 35,
    location: { lat: 43.6532, lng: -79.3832 }, distanceKm: 3.4,
    rating: 4.93, reviewCount: 96, completedJobs: 175,
    calloutRate: 95, currency: 'CAD', isVerified: true,
    verificationBadge: 'Red Seal Certified', isOnline: true, avgResponseMins: 15,
    portfolioImages: [], specialisms: ['Tankless Heaters', 'Trenchless Pipe Relining', 'Hydro-Jetting'],
    isAvailable: true, price: '$95 CAD / callout',
  },
  {
    id: '4', userId: 'u4', displayName: 'Elena Rostova', avatar: randomWorkerPhoto(3),
    profession: 'Precision Solar PV & Battery Storage Engineer', skills: ['Solar & Electrical'],
    bio: 'TÜV-certified solar technician specializing in rooftop micro-inverters, grid-tied lithium battery banks, and solar safety audits.',
    yearsExperience: 9, serviceArea: 'Berlin & Brandenburg', serviceRadius: 40,
    location: { lat: 52.5200, lng: 13.4050 }, distanceKm: 1.8,
    rating: 4.97, reviewCount: 88, completedJobs: 140,
    calloutRate: 70, currency: 'EUR', isVerified: true,
    verificationBadge: 'TÜV Rheinland Certified', isOnline: true, avgResponseMins: 10,
    portfolioImages: [], specialisms: ['Enphase Micro-Inverters', 'Powerwall 3 Systems', 'Grid-Tie Safety'],
    isAvailable: true, price: '€70 / callout',
  },
  {
    id: '5', userId: 'u5', displayName: 'Kenji Takahashi', avatar: randomWorkerPhoto(4),
    profession: 'Smart Water Tech & Architectural Plumbing', skills: ['Plumbing'],
    bio: 'Specialist in digital thermostatic mixing systems, seismic-rated flexible plumbing, and high-efficiency heat pump boilers.',
    yearsExperience: 13, serviceArea: 'Tokyo Metropolitan Hub', serviceRadius: 20,
    location: { lat: 35.6762, lng: 139.6503 }, distanceKm: 2.5,
    rating: 4.99, reviewCount: 164, completedJobs: 320,
    calloutRate: 10000, currency: 'JPY', isVerified: true,
    verificationBadge: 'Tokyo Licensed Master', isOnline: true, avgResponseMins: 7,
    portfolioImages: [], specialisms: ['Smart Bath Systems', 'Seismic Water Lines', 'Ultrasonic Leak Detection'],
    isAvailable: true, price: '¥10,000 / callout',
  },
  {
    id: '6', userId: 'u6', displayName: 'Jean-Pierre Dubois', avatar: randomWorkerPhoto(5),
    profession: 'Artisan Woodwork, Custom Cabinetry & Joinery', skills: ['Carpentry'],
    bio: 'Compagnons du Devoir trained master craftsman specializing in bespoke hardwood cabinetry, structural restoration, and custom furniture.',
    yearsExperience: 16, serviceArea: 'Île-de-France & Paris Metro', serviceRadius: 25,
    location: { lat: 48.8566, lng: 2.3522 }, distanceKm: 2.2,
    rating: 4.94, reviewCount: 78, completedJobs: 135,
    calloutRate: 80, currency: 'EUR', isVerified: true,
    verificationBadge: 'Compagnon Artisan', isOnline: false, avgResponseMins: 20,
    portfolioImages: [], specialisms: ['Bespoke Oak Cabinetry', 'Structural Beam Repair', 'French Polish'],
    isAvailable: true, price: '€80 / callout',
  },
  {
    id: '7', userId: 'u7', displayName: 'Liam Hemsworth', avatar: randomWorkerPhoto(6),
    profession: 'Solar Inverter Arrays & Emergency Electrical', skills: ['Solar & Electrical'],
    bio: 'Clean Energy Council accredited designer and installer for residential and off-grid solar systems throughout NSW.',
    yearsExperience: 10, serviceArea: 'Sydney Metro & Eastern Suburbs', serviceRadius: 30,
    location: { lat: -33.8688, lng: 151.2093 }, distanceKm: 3.1,
    rating: 4.92, reviewCount: 105, completedJobs: 190,
    calloutRate: 110, currency: 'AUD', isVerified: true,
    verificationBadge: 'CEC Accredited Pro', isOnline: true, avgResponseMins: 12,
    portfolioImages: [], specialisms: ['Fronius Inverters', 'Off-Grid Hybrid Battery', 'Switchboard Compliance'],
    isAvailable: true, price: '$110 AUD / callout',
  },
  {
    id: '8', userId: 'u8', displayName: 'Tariq Al-Mansoor', avatar: randomWorkerPhoto(7),
    profession: 'Smart Home Automation & Variable Refrigerant HVAC', skills: ['HVAC'],
    bio: 'Certified KNX and VRF HVAC technician providing ultra-luxury smart climate control and chiller automation.',
    yearsExperience: 11, serviceArea: 'Dubai Marina, Downtown & Palm', serviceRadius: 30,
    location: { lat: 25.2048, lng: 55.2708 }, distanceKm: 2.9,
    rating: 4.96, reviewCount: 130, completedJobs: 245,
    calloutRate: 250, currency: 'AED', isVerified: true,
    verificationBadge: 'KNX Certified Specialist', isOnline: true, avgResponseMins: 9,
    portfolioImages: [], specialisms: ['VRF Chiller Controls', 'KNX Smart Living', 'Precision Duct Zoning'],
    isAvailable: true, price: '250 AED / callout',
  },
  {
    id: '9', userId: 'u9', displayName: 'Tunde Adewale', avatar: randomWorkerPhoto(0),
    profession: 'Master Solar & Inverter Specialist', skills: ['Solar & Electrical'],
    bio: 'Expert in solar installation, lithium battery racks, inverter setup, and smart distribution boards.',
    yearsExperience: 9, serviceArea: 'Ikeja GRA & Lekki Phase 1', serviceRadius: 20,
    location: { lat: 6.6018, lng: 3.3515 }, distanceKm: 1.4,
    rating: 4.96, reviewCount: 64, completedJobs: 148,
    calloutRate: 12000, currency: 'NGN', isVerified: true,
    verificationBadge: 'Vetted Pro', isOnline: true, avgResponseMins: 9,
    portfolioImages: [], specialisms: ['Lithium Battery Racks', 'Smart Distribution Boards', 'Wiring Audit'],
    isAvailable: true, price: '₦12,000 / callout',
  },
  {
    id: '10', userId: 'u10', displayName: 'Amina Hassan', avatar: randomWorkerPhoto(3),
    profession: 'Borehole Pumps & Smart Solar Water Pumping', skills: ['Plumbing'],
    bio: 'Licensed water systems engineer with expertise in solar submersible pumps, reverse osmosis purification, and plumbing diagnostics.',
    yearsExperience: 8, serviceArea: 'Nairobi Central & Westlands', serviceRadius: 25,
    location: { lat: -1.2921, lng: 36.8219 }, distanceKm: 2.6,
    rating: 4.91, reviewCount: 52, completedJobs: 98,
    calloutRate: 3500, currency: 'KES', isVerified: true,
    verificationBadge: 'Licensed Water Engineer', isOnline: true, avgResponseMins: 14,
    portfolioImages: [], specialisms: ['Grundfos Solar Pumps', 'RO Water Treatment', 'PPR Pressure Piping'],
    isAvailable: true, price: '3,500 KES / callout',
  },
]

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

