import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        boss: {
          bg: "#0a0a14",
          panel: "#13131f",
          border: "#262638",
          accent: "#8b5cf6",
          accent2: "#3b82f6",
          text: "#e5e7eb",
          muted: "#9ca3af",
        },
      },
      fontFamily: {
        display: ["ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "monospace"],
      },
      backgroundImage: {
        "boss-gradient":
          "radial-gradient(circle at 20% 0%, rgba(139,92,246,0.18), transparent 40%), radial-gradient(circle at 80% 100%, rgba(59,130,246,0.18), transparent 40%)",
      },
      boxShadow: {
        glow: "0 0 30px rgba(139,92,246,0.35)",
        glowBlue: "0 0 30px rgba(59,130,246,0.35)",
      },
      keyframes: {
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 20px rgba(139,92,246,0.4)" },
          "50%": { boxShadow: "0 0 35px rgba(139,92,246,0.7)" },
        },
      },
      animation: {
        pulseGlow: "pulseGlow 3s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
