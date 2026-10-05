/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#1C1A17',
          soft: '#3D3A35',
          muted: '#6B665E',
          faint: '#A39C92',
        },
        paper: {
          DEFAULT: '#FAF7F2',
          warm: '#F4EFE7',
          deep: '#ECE5D9',
          line: '#E0D7C8',
        },
        clay: {
          50: '#FBF2EE',
          100: '#F5DDD3',
          200: '#EBBBA8',
          300: '#DC9378',
          400: '#C76F50',
          500: '#A8533B',
          600: '#8C4431',
          700: '#6F3626',
          800: '#53281D',
          900: '#3A1B14',
        },
        sage: {
          50: '#F4F6F1',
          100: '#E3E8DC',
          200: '#C5CDB8',
          400: '#8A9472',
          600: '#5C6745',
          800: '#3A422B',
        },
      },
      fontFamily: {
        serif: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        tightish: '-0.015em',
        wider2: '0.12em',
        widest2: '0.2em',
      },
      maxWidth: {
        content: '1400px',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.98)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'slide-in': {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.7s cubic-bezier(0.16, 1, 0.3, 1) both',
        'fade-in': 'fade-in 0.6s ease both',
        'scale-in': 'scale-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) both',
        'slide-in': 'slide-in 0.35s cubic-bezier(0.16, 1, 0.3, 1) both',
        'fade-up-d1': 'fade-up 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.08s both',
        'fade-up-d2': 'fade-up 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.16s both',
        'fade-up-d3': 'fade-up 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.24s both',
        'fade-up-d4': 'fade-up 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.32s both',
      },
    },
  },
  plugins: [],
};
