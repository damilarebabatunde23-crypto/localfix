/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Brand tokens
        primary: {
          DEFAULT: '#6D28D9',
          50: '#F5F3FF',
          100: '#EDE9FE',
          200: '#DDD6FE',
          300: '#C4B5FD',
          400: '#A78BFA',
          500: '#8B5CF6',
          600: '#7C3AED',
          700: '#6D28D9',
          800: '#5B21B6',
          900: '#4C1D95',
        },
        secondary: '#A78BFA',
        'soft-violet': '#EDE9FE',
        'dark-bg': '#171326',
        'dark-surface': '#1E1533',
        'dark-card': '#251C40',
        'light-bg': '#FAF9FF',
        'light-surface': '#F3F0FF',
        success: '#22C55E',
        error: '#EF4444',
        warning: '#F59E0B',
        border: 'rgba(167, 139, 250, 0.2)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'glass': '0 8px 32px rgba(109, 40, 217, 0.15), inset 0 1px 0 rgba(255,255,255,0.1)',
        'glass-sm': '0 4px 16px rgba(109, 40, 217, 0.1), inset 0 1px 0 rgba(255,255,255,0.08)',
        'clay': '6px 6px 20px rgba(109, 40, 217, 0.2), -2px -2px 10px rgba(255,255,255,0.05)',
        'clay-inset': 'inset 2px 2px 8px rgba(0,0,0,0.3), inset -1px -1px 4px rgba(255,255,255,0.05)',
        'glow': '0 0 20px rgba(109, 40, 217, 0.5)',
        'glow-sm': '0 0 10px rgba(109, 40, 217, 0.3)',
        'purple-lg': '0 20px 60px rgba(109, 40, 217, 0.3)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      animation: {
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'shimmer': 'shimmer 1.5s ease-in-out infinite',
        'spin-slow': 'spin 3s linear infinite',
      },
      keyframes: {
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 10px rgba(109, 40, 217, 0.3)' },
          '50%': { boxShadow: '0 0 25px rgba(109, 40, 217, 0.6)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      backgroundImage: {
        'gradient-purple': 'linear-gradient(135deg, #6D28D9 0%, #A78BFA 100%)',
        'gradient-dark': 'linear-gradient(135deg, #171326 0%, #251C40 100%)',
        'gradient-glass': 'linear-gradient(135deg, rgba(109,40,217,0.15) 0%, rgba(167,139,250,0.05) 100%)',
        'shimmer-gradient': 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 50%, transparent 100%)',
      },
    },
  },
  plugins: [],
}
