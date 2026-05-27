/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        scene: "#020817",
        surface: {
          DEFAULT: "#0b1121",
          2: "#111827",
          3: "#1a2236",
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
      },
      animation: {
        "fade-up":  "fade-up 0.45s cubic-bezier(.22,1,.36,1) both",
        "scale-in": "scale-in 0.3s cubic-bezier(.22,1,.36,1) both",
        shimmer:    "shimmer 1.6s linear infinite",
      },
      backgroundImage: {
        "grad-brand":
          "linear-gradient(135deg, #a78bfa 0%, #818cf8 50%, #38bdf8 100%)",
        "grad-blue":
          "linear-gradient(135deg, #818cf8 0%, #38bdf8 100%)",
        "grad-indigo-sky":
          "linear-gradient(135deg, rgba(129,140,248,0.35) 0%, rgba(56,189,248,0.25) 100%)",
      },
    },
  },
  plugins: [],
};

