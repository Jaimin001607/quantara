import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg:       "#08090d",
        surface:  "#12131a",
        border:   "#1f2030",
        accent:   "#6366f1",
        accent2:  "#818cf8",
        gold:     "#f59e0b",
        emerald:  "#10b981",
        crimson:  "#ef4444",
        sky:      "#3b82f6",
        violet:   "#8b5cf6",
        muted:    "#4b5280",
        muted2:   "#6b7280",
        ink:      "#e2e8f0",
        ink2:     "#94a3b8",
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      borderRadius: {
        xl2: "16px",
        xl3: "20px",
      },
    },
  },
  plugins: [],
};

export default config;
