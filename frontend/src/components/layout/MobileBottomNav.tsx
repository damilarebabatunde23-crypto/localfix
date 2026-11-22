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
  const { unreadMessages, theme } = useAppStore()
  const isDark = theme === 'dark'

  return (
    <nav
      aria-label="Mobile bottom navigation"
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden safe-bottom"
      style={{
        background: isDark ? 'rgba(23,19,38,0.95)' : 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderTop: isDark
          ? '1px solid rgba(167,139,250,0.14)'
          : '1px solid rgba(109,40,217,0.14)',
        boxShadow: isDark
          ? '0 -6px 24px rgba(0,0,0,0.35)'
          : '0 -6px 24px rgba(109,40,217,0.08)',
      }}
    >
      <div className="flex items-center justify-around px-1 pt-1.5 pb-1">
        {BOTTOM_TABS.map((tab) => {
          const isActive =
            tab.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(tab.path)
          const Icon = tab.icon

          if (tab.isSpecial) {
            return (
              <Link
                key={tab.path}
                to={tab.path}
                aria-label="Create post or reel"
                className="flex flex-col items-center justify-center min-w-[44px] min-h-[44px]"
              >
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-glow"
                  style={{ background: 'linear-gradient(135deg, #6D28D9, #A78BFA)' }}
                >
                  <Icon className="w-5 h-5 text-white" aria-hidden="true" />
                </div>
              </Link>
            )
          }

          return (
            <Link
              key={tab.path}
              to={tab.path}
              aria-current={isActive ? 'page' : undefined}
              className="flex flex-col items-center justify-center gap-0.5 px-2 py-1 min-w-[48px] min-h-[44px] relative"
            >
              <div
                className={cn(
                  'relative p-1.5 rounded-xl transition-all duration-200',
                  isActive
                    ? isDark
                      ? 'bg-primary-700/30'
                      : 'bg-primary-100'
                    : ''
                )}
              >
                <Icon
                  aria-hidden="true"
                  className={cn(
                    'w-5 h-5 transition-colors',
                    isActive
                      ? isDark
                        ? 'text-primary-400'
                        : 'text-primary-700'
                      : isDark
                      ? 'text-gray-400'
                      : 'text-gray-500'
                  )}
                />
                {tab.label === 'Messages' && unreadMessages > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-primary-600 text-white text-[9px] font-bold flex items-center justify-center">
                    {unreadMessages > 99 ? '99+' : unreadMessages}
                  </span>
                )}
              </div>
              <span
                className={cn(
                  'text-[10px] font-semibold leading-none',
                  isActive
                    ? isDark
                      ? 'text-primary-400'
                      : 'text-primary-700'
                    : isDark
                    ? 'text-gray-400'
                    : 'text-gray-500'
                )}
              >
                {tab.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
