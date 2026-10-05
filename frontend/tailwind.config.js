/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{html,js}",
    "./js/**/*.js",
    "./index.html"
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          900: "#0F172A", // Primary Dark Navy
          800: "#1E293B",
          700: "#334155",
        },
        emerald: {
          500: "#10B981", // Accent Emerald
          600: "#059669",
          50: "#ECFDF5",
        },
        surface: "#F8FAFC",
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        soft: "0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)",
        card: "0 4px 6px -1px rgba(0, 0, 0, 0.04), 0 2px 4px -2px rgba(0, 0, 0, 0.04)",
      },
      borderRadius: {
        DEFAULT: "8px",
        card: "12px",
      }
    },
  },
  plugins: [],
}
