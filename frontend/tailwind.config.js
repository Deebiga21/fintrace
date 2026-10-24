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
        // #FFF5F5 (Soft Blush White Canvas)
        // #F7D6D0 (Soft Peach / Rose Bisque)
        // #E2B4BD (Dusty Rose Mauve)
        // #4A4A4A (Charcoal Slate Graphite)
        palette: {
          canvas: "#FFF5F5",
          surface: "#FFFFFF",
          elevated: "#FDF1F0",
          subtle: "#F7D6D0",
          border: "#E8C2BB",
          rose: "#E2B4BD",
          roseDark: "#B86B7A",
          charcoal: "#4A4A4A",
          charcoalMuted: "#6E6264",
          light: "#FFF5F5",
          dark: "#FFF5F5", // mapped for backwards compat
        },
        // Authentic Stitch HUD Architecture re-mapped to Light Rose Palette
        stitch: {
          bg: "#FFF5F5",
          ink: "#4A4A4A",
          panel: "#FFFFFF",
          line: "rgba(226, 180, 189, 0.35)",
          cyan: "#B86B7A",
          cyanDeep: "#A05565",
          tealFill: "rgba(226, 180, 189, 0.25)",
          lime: "#E2B4BD",
          alert: "#DC2626",
          text2: "#6E6264",
          text3: "#8A7D7F",
          tracks: "#F7D6D0",
        },
        // aubergine mapped to rose palette architecture
        aubergine: {
          950: "#FFF5F5",
          900: "#FFF5F5",
          850: "#FFFFFF",
          DEFAULT: "#FFF5F5",
          800: "#FDF1F0",
          750: "#F8E8E6",
          700: "#F7D6D0",
          600: "#E2B4BD",
          500: "#B86B7A",
          400: "#A05565",
          300: "#4A4A4A",
        },
        // icesilver mapped to charcoal text and light surfaces
        icesilver: {
          50: "#4A4A4A",
          100: "#4A4A4A",
          200: "#5A5455",
          DEFAULT: "#4A4A4A",
          300: "#6E6264",
          400: "#8A7D7F",
          500: "#B86B7A",
          600: "#E2B4BD",
          700: "#E8C2BB",
          800: "#F7D6D0",
          900: "#FFFFFF",
          950: "#FFF5F5",
        },
        // marigold mapped to dusty rose (#E2B4BD, #B86B7A)
        marigold: {
          50: "#FFF5F5",
          100: "#FDF1F0",
          200: "#F7D6D0",
          300: "#E2B4BD",
          400: "#C98694",
          500: "#B86B7A",
          DEFAULT: "#B86B7A",
          600: "#A05565",
          700: "#894452",
          800: "#6E3541",
          900: "#4A4A4A",
        },
        // navy mapped to light canvas (#FFF5F5) and white surfaces
        navy: {
          950: "#FFF5F5",
          900: "#FFF5F5",
          850: "#FFFFFF",
          800: "#FDF1F0",
          750: "#F8E8E6",
          700: "#F7D6D0",
          600: "#E8C2BB",
        },
        // electric mapped to palette dusty rose (#E2B4BD, #B86B7A)
        electric: {
          DEFAULT: "#B86B7A",
          200: "#F7D6D0",
          300: "#E2B4BD",
          400: "#C98694",
          500: "#B86B7A",
          600: "#A05565",
          700: "#894452",
        },
        // Risk Signaling: Alert Red, Peach/Rose Medium, Dusty Rose Low
        risk: {
          high: "#DC2626",
          highBg: "rgba(220, 38, 38, 0.12)",
          highBorder: "rgba(220, 38, 38, 0.4)",
          medium: "#B86B7A",
          mediumBg: "rgba(226, 180, 189, 0.35)",
          mediumBorder: "rgba(184, 107, 122, 0.45)",
          low: "#4A4A4A",
          lowBg: "rgba(247, 214, 208, 0.5)",
          lowBorder: "rgba(232, 194, 187, 0.7)",
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
        'glow-electric': '0 0 20px -2px rgba(226, 180, 189, 0.5)',
        'glow-marigold': '0 0 20px -2px rgba(184, 107, 122, 0.45)',
        'glow-cyan': '0 0 20px -2px rgba(226, 180, 189, 0.45)',
        'glow-azure': '0 0 20px -2px rgba(226, 180, 189, 0.45)',
        'glow-rose': '0 0 20px -2px rgba(226, 180, 189, 0.55)',
        'glow-blue': '0 0 20px -2px rgba(184, 107, 122, 0.45)',
        'glow-danger': '0 0 16px -2px rgba(220, 38, 38, 0.45)',
        'glow-lime': '0 0 16px -2px rgba(247, 214, 208, 0.6)',
        'glass': '0 8px 32px 0 rgba(74, 74, 74, 0.08)',
        'apple-card': '0 4px 20px 0 rgba(74, 74, 74, 0.06), inset 0 1px 0 0 rgba(255, 255, 255, 0.8)',
        'apple-card-hover': '0 8px 28px 0 rgba(184, 107, 122, 0.2), inset 0 1px 0 0 rgba(226, 180, 189, 0.5)',
      }
    },
  },
  plugins: [],
}
