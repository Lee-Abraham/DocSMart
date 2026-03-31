import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#F9FAFB",
        brand: "#2563EB",
        accent: "#0F766E",
        textPrimary: "#111827",
        textSecondary: "#6B7280",
        borderSubtle: "#E5E7EB",

      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;