/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Fintech Theme Palette with CSS Variables for seamless instant toggle
        fintech: {
          bg: 'var(--bg-app)',
          surface: 'var(--bg-surface)',
          card: 'var(--bg-card)',
          elevated: 'var(--bg-elevated)',
          border: 'var(--border-color)',
          borderSubtle: 'var(--border-subtle)',
          text: 'var(--text-primary)',
          muted: 'var(--text-muted)',
          primary: 'var(--primary)',
          primaryHover: 'var(--primary-hover)',
          primarySubtle: 'var(--primary-subtle)',
          accent: 'var(--accent)',
          accentText: 'var(--accent-text)',
          gain: 'var(--status-gain)',
          loss: 'var(--status-loss)',
        },
        // Direct Dark Theme Colors
        darkTheme: {
          bg: '#0B0B0F',
          surface: '#15161D',
          elevated: '#1C1E27',
          border: '#262833',
          text: '#FFFFFF',
          muted: '#9CA3AF',
          primary: '#1FC8DB',
          accent: '#FFD23F',
        },
        // Direct Light Theme Colors
        lightTheme: {
          bg: '#FFFFFF',
          surface: '#F5F7FA',
          elevated: '#FFFFFF',
          border: '#E5E7EB',
          text: '#0B0B0F',
          muted: '#6B7280',
          primary: '#0E9FB3',
          accent: '#FFD23F',
        },
        // Status Indicators
        finStatus: {
          gain: '#22C55E',
          loss: '#FF5C6C',
        },
        // Brand references
        turquoise: {
          dark: '#1FC8DB',
          light: '#0E9FB3',
          DEFAULT: '#1FC8DB',
        },
        gold: {
          DEFAULT: '#FFD23F',
          hover: '#FFE066',
        }
      },
      borderRadius: {
        'card': '14px',
        'card-lg': '16px',
        '2xl': '1rem',
        '3xl': '1.25rem',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"SF Mono"', 'monospace'],
        display: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'card-dark': '0 4px 20px -2px rgba(0, 0, 0, 0.45)',
        'card-light': '0 4px 20px -2px rgba(11, 11, 15, 0.05)',
        'glow-turquoise': '0 0 20px -2px rgba(31, 200, 219, 0.35)',
        'glow-turquoise-light': '0 0 20px -2px rgba(14, 159, 179, 0.25)',
        'glow-yellow': '0 0 20px -2px rgba(255, 210, 63, 0.4)',
      }
    },
  },
  plugins: [],
}
