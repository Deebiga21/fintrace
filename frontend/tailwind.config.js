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
        // Editorial dark language (theme-invariant; see index.css)
        canvas: {
          DEFAULT: 'var(--canvas)',
          raised: 'var(--canvas-raised)',
        },
        ink: {
          DEFAULT: 'var(--ink)',
          muted: 'var(--ink-muted)',
          faint: 'var(--ink-faint)',
        },
        rule: {
          DEFAULT: 'var(--rule)',
          strong: 'var(--rule-strong)',
        },
        spec: 'var(--spec)',
        // Legacy page accents. The older screens were designed against this
        // ramp; defining it here means their buttons/rings/glows render
        // instead of silently falling back to nothing.
        electric: {
          200: '#9BEFF8',
          300: '#5ADCEA',
          400: '#1FC8DB',
          500: '#12A7B8',
          600: '#0E7C89',
          700: '#0B6B77',
          800: '#084F58',
          900: '#063B42',
          950: '#062E33',
        },
        // Legacy page surfaces. Several older screens still reference these
        // steps; map them onto the editorial canvas so panels are never
        // transparent, instead of duplicating a second palette.
        navy: {
          950: '#0B0B0F',
          900: '#0B0B0F',
          850: '#101117',
          800: '#15161D',
          700: '#1C1E27',
          600: '#262833',
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
        serif: ['"Instrument Serif"', '"Playfair Display"', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', '"SF Mono"', 'monospace'],
        display: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'card-dark': '0 4px 20px -2px rgba(0, 0, 0, 0.45)',
        'card-light': '0 4px 20px -2px rgba(11, 11, 15, 0.05)',
        'glow-turquoise': '0 0 20px -2px rgba(31, 200, 219, 0.35)',
        'glow-turquoise-light': '0 0 20px -2px rgba(14, 159, 179, 0.25)',
        'glow-yellow': '0 0 20px -2px rgba(255, 210, 63, 0.4)',
        'glow-rose': '0 0 22px -6px rgba(31, 200, 219, 0.45)',
        'glow-danger': '0 0 22px -6px rgba(255, 92, 108, 0.45)',
        'glow-emerald': '0 0 22px -6px rgba(34, 197, 94, 0.40)',
      }
    },
  },
  plugins: [],
}
