/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        r: {
          bg: "#1a1a1a",
          surf: "#242424",
          surf2: "#2e2e2e",
          border: "#3a3a3a",
          red: "#e63c23",
          "red-d": "#c0321c",
          amber: "#f6bc3f",
          green: "#5c30ff",
          text: "#f5f5f5",
          muted: "#888888",
          star: "#f6bc3f",
          pink: "#f791c3",
          purple: "#5c30ff",
        },
      },
      fontFamily: {
        display: ["var(--font-bebas)", "Impact", "sans-serif"],
        body: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      animation: {
        "fade-in": "fadeIn 0.2s ease-out",
        "slide-up": "slideUp 0.25s ease-out",
        "pulse-slow": "pulse 2.5s cubic-bezier(0.4,0,0.6,1) infinite",
        "now-playing": "nowPlaying 2s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: { from: { opacity: "0" }, to: { opacity: "1" } },
        slideUp: {
          from: { transform: "translateY(10px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        nowPlaying: {
          "0%, 100%": {
            transform: "scale(1)",
            textShadow: "0 0 0 rgba(230,60,35,0)",
          },
          "50%": {
            transform: "scale(1.03)",
            textShadow: "0 0 24px rgba(230,60,35,0.75)",
          },
        },
      },
    },
  },
  plugins: [],
};
