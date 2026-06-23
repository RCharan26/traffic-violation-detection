/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // TrafficVision AI brand tokens
        tvai: {
          bg:         '#050209',
          surface:    '#0c0a1a',
          'surface-2': '#100e22',
          text:       'hsl(40, 6%, 95%)',
          'text-sec': 'hsl(40, 6%, 82%)',
          accent:     '#2563EB',
          secondary:  '#60A5FA',
          success:    '#22C55E',
          warning:    '#F59E0B',
          danger:     '#EF4444',
        },
        // Blue brand palette
        primary: {
          50:  '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        slate: {
          850: '#1a2437',
        },
        surface:    '#0c0a1a',
        background: '#050209',
      },
      fontFamily: {
        sans:  ['"Instrument Sans"', 'Inter', 'system-ui', 'sans-serif'],
        serif: ['"Instrument Serif"', 'Georgia', 'serif'],
        mono:  ['"JetBrains Mono"', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        'card':        '0 1px 3px 0 rgba(0,0,0,0.5), 0 1px 2px -1px rgba(0,0,0,0.5)',
        'card-hover':  '0 4px 12px 0 rgba(0,0,0,0.6)',
        'elevated':    '0 10px 20px -4px rgba(0,0,0,0.7)',
        'glow-blue':   '0 0 20px rgba(37,99,235,0.25)',
        'glow-blue-lg':'0 0 40px rgba(37,99,235,0.2)',
        'inner-glow':  'inset 0 0 20px rgba(37,99,235,0.05)',
      },
      blur: {
        'glow': '82px',
      },
      animation: {
        'pulse-slow':    'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in-up':    'fadeInUp 0.5s ease-out forwards',
        'fade-in':       'fadeIn 0.35s ease-out forwards',
        'marquee':       'marquee 50s linear infinite',
        'float':         'float-y 5s ease-in-out infinite',
        'float-slow':    'float-y-slow 7s ease-in-out infinite',
        'glow-pulse':    'glow-pulse 4s ease-in-out infinite',
        'blink-dot':     'blink-dot 1.4s ease-in-out infinite',
        'bar-grow':      'bar-grow 0.8s ease-out forwards',
        'hero-scan':     'hero-scan 3s ease-in-out infinite',
        'slide-right':   'slide-in-right 0.6s ease-out forwards',
      },
      keyframes: {
        fadeInUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        marquee: {
          '0%':   { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'float-y': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-10px)' },
        },
        'float-y-slow': {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '33%':      { transform: 'translateY(-6px) rotate(0.5deg)' },
          '66%':      { transform: 'translateY(-12px) rotate(-0.5deg)' },
        },
        'glow-pulse': {
          '0%, 100%': { opacity: '0.18', transform: 'scale(1)' },
          '50%':      { opacity: '0.28', transform: 'scale(1.05)' },
        },
        'blink-dot': {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.2' },
        },
        'bar-grow': {
          from: { transform: 'scaleY(0)' },
          to:   { transform: 'scaleY(1)' },
        },
        'hero-scan': {
          '0%':   { top: '0%', opacity: '1' },
          '90%':  { opacity: '1' },
          '100%': { top: '100%', opacity: '0' },
        },
        'slide-in-right': {
          from: { opacity: '0', transform: 'translateX(20px)' },
          to:   { opacity: '1', transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
};
