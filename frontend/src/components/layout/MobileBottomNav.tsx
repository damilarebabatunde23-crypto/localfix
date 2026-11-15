import { Link, useLocation } from 'react-router-dom'
import { Home, Compass, Plus, MessageSquare, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/stores/useAppStore'

const BOTTOM_TABS = [
  { label: 'Home', icon: Home, path: '/' },
  { label: 'Explore', icon: Compass, path: '/map' },
  { label: 'Create', icon: Plus, path: '/create', isSpecial: true },
  { label: 'Messages', icon: MessageSquare, path: '/messages' },
  { label: 'Profile', icon: User, path: '/profile' },
]

export default function MobileBottomNav() {
  const location = useLocation()
  const { unreadMessages } = useAppStore()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden safe-area-inset-bottom"
      style={{
        background: 'rgba(23,19,38,0.95)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderTop: '1px solid rgba(167,139,250,0.12)',
      }}
    >
      <div className="flex items-center justify-around px-2 py-2">
        {BOTTOM_TABS.map((tab) => {
          const isActive = tab.path === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(tab.path)
          const Icon = tab.icon

          if (tab.isSpecial) {
            return (
              <Link key={tab.path} to={tab.path}
                className="flex flex-col items-center"
              >
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-glow"
                  style={{ background: 'linear-gradient(135deg, #6D28D9, #A78BFA)' }}
                >
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </Link>
            )
          }

          return (
            <Link
              key={tab.path}
              to={tab.path}
              className="flex flex-col items-center gap-1 px-3 py-1 relative"
            >
              <div className={cn(
                'relative p-2 rounded-xl transition-all duration-200',
                isActive ? 'bg-primary-700/30' : ''
              )}>
                <Icon className={cn('w-5 h-5 transition-colors', isActive ? 'text-primary-400' : 'text-gray-500')} />
                {tab.label === 'Messages' && unreadMessages > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary-600 text-white text-[9px] font-bold flex items-center justify-center">
                    {unreadMessages}
                  </span>
                )}
              </div>
              <span className={cn('text-[10px] font-medium', isActive ? 'text-primary-400' : 'text-gray-500')}>
                {tab.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
