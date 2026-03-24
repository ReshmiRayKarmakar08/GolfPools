/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#e6faff',
          100: '#ccf4ff',
          200: '#99e9ff',
          300: '#66ddff',
          400: '#33d2ff',
          500: '#00c6ff',
          600: '#009fcc',
          700: '#007899',
          800: '#005066',
          900: '#002833',
        },
        dark: {
          50: '#e8e9f0',
          100: '#c5c7d8',
          200: '#9fa3be',
          300: '#797fa3',
          400: '#5a6190',
          500: '#3b437d',
          600: '#2e3570',
          700: '#1e2258',
          800: '#141940',
          900: '#0a0e28',
          950: '#060813',
        },
        accent: {
          gold: '#FFD700',
          coral: '#FF6B6B',
          mint: '#00E5CC',
          purple: '#8B5CF6',
        }
      },
      fontFamily: {
        display: ['var(--font-display)', 'serif'],
        body: ['var(--font-body)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-brand': 'linear-gradient(135deg, #00c6ff 0%, #0072ff 100%)',
        'gradient-dark': 'linear-gradient(135deg, #0a0e28 0%, #141940 50%, #1e2258 100%)',
        'gradient-gold': 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'slide-up': 'slideUp 0.5s ease-out',
        'fade-in': 'fadeIn 0.6s ease-out',
        'bounce-subtle': 'bounceSubtle 2s ease-in-out infinite',
        'levitate': 'levitate 6s ease-in-out infinite',
        'glow-pulse': 'glowPulse 3s ease-in-out infinite',
        'spin-slow': 'spin 8s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: 0 },
          '100%': { transform: 'translateY(0)', opacity: 1 },
        },
        fadeIn: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        levitate: {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '33%': { transform: 'translateY(-10px) rotate(1deg)' },
          '66%': { transform: 'translateY(-5px) rotate(-1deg)' },
        },
        glowPulse: {
          '0%, 100%': { opacity: 0.4, transform: 'scale(1)' },
          '50%': { opacity: 0.8, transform: 'scale(1.05)' },
        },
      },
      boxShadow: {
        'brand': '0 0 30px rgba(0, 198, 255, 0.3)',
        'brand-lg': '0 0 60px rgba(0, 198, 255, 0.4)',
        'gold': '0 0 30px rgba(255, 215, 0, 0.4)',
        'dark': '0 25px 50px rgba(0, 0, 0, 0.5)',
        'glass': 'inset 0 1px 0 rgba(255,255,255,0.1), 0 4px 20px rgba(0,0,0,0.3)',
        'elevated': '0 20px 60px rgba(0, 0, 0, 0.4), 0 0 40px rgba(0, 198, 255, 0.1)',
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
}
