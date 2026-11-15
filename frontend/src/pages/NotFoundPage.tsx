import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Wrench, Home, Compass, ShoppingBag, Sparkles, ArrowLeft } from 'lucide-react'

export default function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-[80vh] bg-dark-bg text-white flex items-center justify-center px-4 py-16">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-panel max-w-lg w-full rounded-3xl p-8 sm:p-10 text-center relative overflow-hidden"
      >
        {/* Glow backdrop */}
        <div
          className="absolute -top-20 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full pointer-events-none opacity-30 blur-3xl"
          style={{ background: 'radial-gradient(circle, #7C3AED, transparent)' }}
        />

        <div className="w-20 h-20 rounded-3xl bg-primary-700/20 border border-primary-500/30 flex items-center justify-center mx-auto mb-6 text-primary-400 shadow-glow-sm">
          <Wrench className="w-10 h-10 -rotate-45" />
        </div>

        <div className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-primary-200 mb-2">
          404
        </div>
        <h1 className="text-2xl font-bold mb-3">Page Not Found</h1>
        <p className="text-gray-400 text-sm max-w-sm mx-auto mb-8 leading-relaxed">
          Looks like this pipe has a leak or the page you are looking for has been moved or doesn't exist.
        </p>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <Link
            to="/"
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-semibold bg-primary-700 hover:bg-primary-600 transition-colors"
          >
            <Home className="w-4 h-4" />
            <span>Home</span>
          </Link>
          <Link
            to="/map"
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
          >
            <Compass className="w-4 h-4" />
            <span>Explore Map</span>
          </Link>
          <Link
            to="/marketplace"
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Marketplace</span>
          </Link>
          <Link
            to="/assistant"
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-primary-300"
          >
            <Sparkles className="w-4 h-4" />
            <span>AI Assistant</span>
          </Link>
        </div>

        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-xs text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Go back to previous page</span>
        </button>
      </motion.div>
    </div>
  )
}
