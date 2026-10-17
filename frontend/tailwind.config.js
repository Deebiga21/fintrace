/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: "#070B14",
          900: "#0B1120",
          850: "#0F172A",
          800: "#1E293B",
          750: "#243247",
          700: "#334155",
          600: "#475569",
        },
        electric: {
          300: "#7DD3FC",
          400: "#38BDF8",
          500: "#0EA5E9",
          600: "#0284C7",
        },
        risk: {
          high: "#EF4444",
          highBg: "rgba(239, 68, 68, 0.15)",
          highBorder: "rgba(239, 68, 68, 0.35)",
          medium: "#F59E0B",
          mediumBg: "rgba(245, 158, 11, 0.15)",
          mediumBorder: "rgba(245, 158, 11, 0.35)",
          low: "#10B981",
          lowBg: "rgba(16, 185, 129, 0.15)",
          lowBorder: "rgba(16, 185, 129, 0.35)",
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace']
      },
      boxShadow: {
        'glow-electric': '0 0 20px -3px rgba(56, 189, 248, 0.35)',
        'glow-danger': '0 0 20px -3px rgba(239, 68, 68, 0.4)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
      }
    },
  },
  plugins: [],
}
