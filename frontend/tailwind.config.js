/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Direct mapping to User Palette:
        // #1F242E (Dark Charcoal Slate)
        // #3B82F6 (Primary Electric Blue)
        // #60A5FA (Light Azure Blue)
        // #93C5FD (Soft Sky Blue)
        // #F3F4F6 (Crisp Off-White)
        palette: {
          dark: "#1F242E",
          surface: "#252B37",
          elevated: "#2A3241",
          border: "#333D50",
          blue: "#3B82F6",
          azure: "#60A5FA",
          sky: "#93C5FD",
          light: "#F3F4F6",
        },
        // Authentic Stitch HUD Architecture re-mapped to the 5-color palette
        stitch: {
          bg: "#1F242E",
          ink: "#171B23",
          panel: "#252B37",
          line: "rgba(147, 197, 253, 0.16)",
          cyan: "#3B82F6",
          cyanDeep: "#2563EB",
          tealFill: "rgba(59, 130, 246, 0.16)",
          lime: "#93C5FD",
          alert: "#EF4444",
          text2: "#93C5FD",
          text3: "#64748B",
          tracks: "#2C3443",
        },
        // aubergine mapped to dark palette architecture
        aubergine: {
          950: "#171B23",
          900: "#1F242E",
          850: "#252B37",
          DEFAULT: "#1F242E",
          800: "#2C3443",
          750: "#333C4E",
          700: "#3D475C",
          600: "#4C5972",
          500: "#5D6C88",
          400: "#7A8CA8",
          300: "#93C5FD",
        },
        // icesilver mapped to #F3F4F6 and #93C5FD
        icesilver: {
          50: "#FFFFFF",
          100: "#F3F4F6",
          200: "#E5E7EB",
          DEFAULT: "#F3F4F6",
          300: "#D1D5DB",
          400: "#93C5FD",
          500: "#60A5FA",
          600: "#64748B",
          700: "#475569",
          800: "#334155",
          900: "#252B37",
          950: "#1F242E",
        },
        // marigold mapped to #3B82F6 and #60A5FA
        marigold: {
          50: "#EFF6FF",
          100: "#DBEAFE",
          200: "#BFDBFE",
          300: "#93C5FD",
          400: "#60A5FA",
          500: "#3B82F6",
          DEFAULT: "#3B82F6",
          600: "#2563EB",
          700: "#1D4ED8",
          800: "#1E3A5F",
          900: "#172554",
        },
        // navy mapped to palette dark slate (#1F242E)
        navy: {
          950: "#171B23",
          900: "#1F242E",
          850: "#252B37",
          800: "#2C3443",
          750: "#333C4E",
          700: "#3D475C",
          600: "#4C5972",
        },
        // electric mapped to palette blues (#3B82F6, #60A5FA, #93C5FD)
        electric: {
          DEFAULT: "#3B82F6",
          200: "#BFDBFE",
          300: "#93C5FD",
          400: "#60A5FA",
          500: "#3B82F6",
          600: "#2563EB",
          700: "#1D4ED8",
        },
        // Risk Signaling: Alert Red, Soft Sky Medium, Primary Blue Low
        risk: {
          high: "#EF4444",
          highBg: "rgba(239, 68, 68, 0.16)",
          highBorder: "rgba(239, 68, 68, 0.45)",
          medium: "#60A5FA",
          mediumBg: "rgba(96, 165, 250, 0.16)",
          mediumBorder: "rgba(96, 165, 250, 0.45)",
          low: "#3B82F6",
          lowBg: "rgba(59, 130, 246, 0.14)",
          lowBorder: "rgba(59, 130, 246, 0.35)",
        }
      },
      borderRadius: {
        '2xl': '0.75rem',
        '3xl': '1rem',
        '4xl': '1.25rem',
      },
      fontFamily: {
        sans: ['"Titillium Web"', '-apple-system', 'BlinkMacSystemFont', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"Share Tech Mono"', '"SF Mono"', 'JetBrains Mono', 'monospace'],
        rajdhani: ['Rajdhani', 'sans-serif'],
        sharetech: ['"Share Tech Mono"', 'monospace'],
        titillium: ['"Titillium Web"', 'sans-serif'],
        krona: ['"Krona One"', 'sans-serif'],
      },
      boxShadow: {
        'glow-electric': '0 0 20px -2px rgba(59, 130, 246, 0.5)',
        'glow-marigold': '0 0 20px -2px rgba(59, 130, 246, 0.5)',
        'glow-cyan': '0 0 20px -2px rgba(96, 165, 250, 0.5)',
        'glow-blue': '0 0 20px -2px rgba(59, 130, 246, 0.5)',
        'glow-danger': '0 0 16px -2px rgba(239, 68, 68, 0.55)',
        'glow-lime': '0 0 16px -2px rgba(147, 197, 253, 0.45)',
        'glass': '0 8px 32px 0 rgba(15, 23, 42, 0.6)',
        'apple-card': '0 4px 20px 0 rgba(15, 23, 42, 0.5), inset 0 1px 0 0 rgba(147, 197, 253, 0.15)',
        'apple-card-hover': '0 8px 28px 0 rgba(59, 130, 246, 0.25), inset 0 1px 0 0 rgba(96, 165, 250, 0.4)',
      }
    },
  },
  plugins: [],
}
