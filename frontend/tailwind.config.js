/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Authentic Stitch Cyberpunk HUD Design System Palette
        stitch: {
          bg: "#000000",
          ink: "#050505",
          panel: "#05080A",
          line: "#1B1F22",
          cyan: "#22D3E6",
          cyanDeep: "#0E7C86",
          tealFill: "#0B2E33",
          lime: "#D6E85A",
          alert: "#FF3B4E",
          text2: "#9AA0A6",
          text3: "#5A5F64",
          tracks: "#2A2D30",
        },
        // Mapped aubergine to Stitch deep black/panel architecture
        aubergine: {
          950: "#000000", // pure canvas
          900: "#05080A", // primary panel surface
          850: "#0B0F12", // elevated panel
          DEFAULT: "#05080A",
          800: "#12161A",
          750: "#181E24",
          700: "#222A32",
          600: "#2F3B46",
          500: "#3D4C5A",
          400: "#5A6E80",
          300: "#8097AC",
        },
        // Mapped icesilver to high-contrast HUD telemetry / white text
        icesilver: {
          50: "#FFFFFF",
          100: "#F0F4F6",
          200: "#E2E2E2",
          DEFAULT: "#E2E2E2",
          300: "#BBC9CB",
          400: "#9AA0A6",
          500: "#7A8188",
          600: "#5A5F64",
          700: "#3C4348",
          800: "#2A2D30",
          900: "#1B1F22",
          950: "#05080A",
        },
        // Mapped marigold to Stitch Electric Cyan & Lime
        marigold: {
          50: "#E6FCFF",
          100: "#B8F7FF",
          200: "#92F1FF",
          300: "#6CEEFF",
          400: "#31DAED",
          500: "#22D3E6", // Primary Electric Cyan
          DEFAULT: "#22D3E6",
          600: "#0E7C86",
          700: "#006973",
          800: "#0B2E33",
          900: "#00363C",
        },
        // Mapped legacy navy to Stitch pure black & panel surfaces
        navy: {
          950: "#000000",
          900: "#05080A",
          850: "#0B0F12",
          800: "#12161A",
          750: "#181E24",
          700: "#222A32",
          600: "#2F3B46",
        },
        // Mapped legacy electric to Stitch Electric Cyan
        electric: {
          200: "#92F1FF",
          300: "#6CEEFF",
          400: "#31DAED",
          500: "#22D3E6",
          600: "#0E7C86",
          700: "#006973",
        },
        // Stitch Risk Signaling: High = Alert Red (#FF3B4E), Medium = Lime (#D6E85A), Low = Cyan (#22D3E6)
        risk: {
          high: "#FF3B4E",
          highBg: "rgba(255, 59, 78, 0.16)",
          highBorder: "rgba(255, 59, 78, 0.45)",
          medium: "#D6E85A",
          mediumBg: "rgba(214, 232, 90, 0.16)",
          mediumBorder: "rgba(214, 232, 90, 0.45)",
          low: "#22D3E6",
          lowBg: "rgba(34, 211, 230, 0.14)",
          lowBorder: "rgba(34, 211, 230, 0.35)",
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
        'glow-electric': '0 0 16px -2px rgba(34, 211, 230, 0.45)',
        'glow-marigold': '0 0 16px -2px rgba(34, 211, 230, 0.45)',
        'glow-cyan': '0 0 16px -2px rgba(34, 211, 230, 0.45)',
        
        'glow-danger': '0 0 16px -2px rgba(255, 59, 78, 0.55)',
        'glow-lime': '0 0 16px -2px rgba(214, 232, 90, 0.45)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.7)',
        'apple-card': '0 4px 20px 0 rgba(0, 0, 0, 0.6), inset 0 1px 0 0 rgba(90, 95, 100, 0.2)',
        'apple-card-hover': '0 8px 28px 0 rgba(34, 211, 230, 0.2), inset 0 1px 0 0 rgba(34, 211, 230, 0.4)',
      }
    },
  },
  plugins: [],
}
