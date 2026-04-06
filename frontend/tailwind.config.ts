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
        bg:       "#f7f8fc",
        surface:  "#ffffff",
        border:   "#e4e8f2",
        accent:   "#5b5fc7",
        accent2:  "#4f46e5",
        gold:     "#d97706",
        green:    "#059669",
        red:      "#dc2626",
        blue:     "#2563eb",
        purple:   "#7c3aed",
        muted:    "#9ca3af",
        muted2:   "#6b7280",
        ink:      "#0f172a",
        ink2:     "#475569",
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
