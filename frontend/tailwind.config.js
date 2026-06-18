/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        scene: "#f5f5f5",
        primary: {
          DEFAULT: "#E40443",
          hover:   "#c00338",
          light:   "rgba(228,4,67,0.10)",
        },
        surface: {
          DEFAULT: "#ffffff",
          2: "#f9fafb",
          3: "#f3f4f6",
        },
        dark: {
          DEFAULT: "#140609",
          2:       "#1e0a0e",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to:   { opacity: "1", transform: "scale(1)" },
        },
        shimmer: {
          from: { backgroundPosition: "-200% center" },
          to:   { backgroundPosition: "200% center" },
        },
        pulse2: {
          "0%, 100%": { opacity: "1" },
          "50%":      { opacity: "0.4" },
        },
      },
      animation: {
        "fade-up":  "fade-up 0.45s cubic-bezier(.22,1,.36,1) both",
        "scale-in": "scale-in 0.3s cubic-bezier(.22,1,.36,1) both",
        shimmer:    "shimmer 1.6s linear infinite",
        pulse2:     "pulse2 2s ease-in-out infinite",
      },
      backgroundImage: {
        "grad-brand":  "linear-gradient(135deg, #E40443 0%, #ff6b9d 100%)",
        "grad-dark":   "linear-gradient(135deg, #140609 0%, #2a0c14 100%)",
        "grad-light":  "linear-gradient(135deg, #fff5f7 0%, #ffffff 100%)",
      },
    },
  },
  plugins: [],
};

