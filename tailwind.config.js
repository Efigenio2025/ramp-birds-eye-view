/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ramp: {
          // Core surfaces
          bg: "#0E0F11",        // main background (steel black)
          panel: "#16181D",     // cards / panels
          border: "#262A33",    // borders / dividers

          // Text
          text: "#E6E7EB",      // primary text
          muted: "#A1A1AA",     // secondary / helper text

          // Status & actions
          blue: "#60A5FA",      // primary action
          amber: "#FBBF24",    // warning / at-risk
          red: "#F87171",      // critical / overdue
          green: "#4ADE80",    // good / complete
        },
      },
    },
  },
  plugins: [],
}
