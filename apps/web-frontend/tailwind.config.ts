import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand palette — derived from the MA monogram (gold) + the Agent Boss identity (purple/blue)
        bg: {
          DEFAULT: "#0A0A0A",     // page background — near-black
          deep: "#050507",        // deepest section background
          surface: "#101013",     // card / surface
          elevated: "#16161B",    // raised surface (dropdowns, modals)
          subtle: "#1F1F26",      // hover, subtle separators
        },
        text: {
          DEFAULT: "#FAFAFA",
          muted: "#A1A1AA",
          dim: "#71717A",
          faint: "#52525B",
        },
        border: {
          DEFAULT: "#27272F",
          subtle: "#1F1F26",
          strong: "#3F3F46",
        },
        // Brand accents
        primary: {
          DEFAULT: "#8B5CF6",    // electric purple
          50: "#F5F3FF",
          100: "#EDE9FE",
          200: "#DDD6FE",
          300: "#C4B5FD",
          400: "#A78BFA",
          500: "#8B5CF6",
          600: "#7C3AED",
          700: "#6D28D9",
          800: "#5B21B6",
          900: "#4C1D95",
        },
        accent: {
          DEFAULT: "#3B82F6",    // electric blue
          50: "#EFF6FF",
          100: "#DBEAFE",
          200: "#BFDBFE",
          300: "#93C5FD",
          400: "#60A5FA",
          500: "#3B82F6",
          600: "#2563EB",
          700: "#1D4ED8",
          800: "#1E40AF",
          900: "#1E3A8A",
        },
        // Founder brand: gold accents from the MA monogram
        gold: {
          DEFAULT: "#D4AF37",
          light: "#F5D677",
          dark: "#A67C00",
        },
        // Semantic
        success: "#10B981",
        warning: "#F59E0B",
        danger: "#EF4444",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
        display: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        "brand-gradient": "linear-gradient(135deg, #8B5CF6 0%, #3B82F6 100%)",
        "brand-gradient-soft": "linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(59, 130, 246, 0.15) 100%)",
        "gold-gradient": "linear-gradient(135deg, #F5D677 0%, #D4AF37 50%, #A67C00 100%)",
      },
      boxShadow: {
        "glow-sm": "0 0 20px rgba(139, 92, 246, 0.15)",
        "glow-md": "0 0 40px rgba(139, 92, 246, 0.25)",
        "glow-lg": "0 0 80px rgba(139, 92, 246, 0.35)",
        "glow-accent-sm": "0 0 20px rgba(59, 130, 246, 0.15)",
        "glow-accent-md": "0 0 40px rgba(59, 130, 246, 0.25)",
        "card": "0 1px 0 rgba(255,255,255,0.04) inset, 0 0 0 1px rgba(255,255,255,0.04)",
        "card-hover": "0 1px 0 rgba(255,255,255,0.06) inset, 0 0 0 1px rgba(139, 92, 246, 0.3)",
      },
      animation: {
        "fade-in": "fadeIn 0.4s ease-out",
        "fade-in-up": "fadeInUp 0.5s ease-out",
        "scale-in": "scaleIn 0.3s ease-out",
        "shimmer": "shimmer 2s linear infinite",
        "pulse-slow": "pulse 3s ease-in-out infinite",
        "gradient-shift": "gradientShift 8s ease infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-1000px 0" },
          "100%": { backgroundPosition: "1000px 0" },
        },
        gradientShift: {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
      },
    },
  },
  plugins: [],
};

export default config;