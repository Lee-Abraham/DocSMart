import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}"],
  theme: {
    extend: {
        colors: {
          bg: "var(--bg)",
          surface: "var(--surface)",
          brand: "var(--brand)",
          textPrimary: "var(--text-primary)",
          textSecondary: "var(--text-secondary)",
          borderSubtle: "var(--border-subtle)",
        },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;