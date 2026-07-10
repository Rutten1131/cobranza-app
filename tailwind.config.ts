import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dark Glassmorphism Palette
        primary: {
          DEFAULT: "#3F68FF",
          dark: "#2D4FD9",
          light: "#6D8CFF",
        },
        accent: "#22C55E",
        warning: "#F59E0B",
        danger: "#EF4444",
        surface: {
          DEFAULT: "#161E3A",
          secondary: "#1D2446",
          card: "#222A4B",
        },
        background: {
          primary: "#161E3A",
          secondary: "#1D2446",
        },
        "text-main": "#FFFFFF",
        "text-sub": "#B9C3E3",
        "text-muted": "#8B93B6",
        border: {
          DEFAULT: "rgba(255,255,255,0.06)",
          light: "rgba(255,255,255,0.12)",
        },
      },
      fontFamily: {
        display: ['"Plus Jakarta Sans"', "sans-serif"],
        body: ["Inter", "sans-serif"],
        mono: ['"JetBrains Mono"', "monospace"],
      },
      fontSize: {
        display: ["2.5rem", { lineHeight: "1.2", fontWeight: "700" }],
        h1: ["1.75rem", { lineHeight: "1.3", fontWeight: "700" }],
        h2: ["1.25rem", { lineHeight: "1.4", fontWeight: "600" }],
        body: ["1rem", { lineHeight: "1.5", fontWeight: "400" }],
        small: ["0.875rem", { lineHeight: "1.5", fontWeight: "400" }],
      },
      borderRadius: {
        xs: "8px",
        sm: "12px",
        md: "16px",
        lg: "20px",
        xl: "28px",
        pill: "9999px",
      },
      boxShadow: {
        card: "0 10px 30px rgba(0,0,0,0.35)",
        "card-sm": "0 4px 12px rgba(0,0,0,0.18)",
        modal: "0 20px 40px rgba(0,0,0,0.45)",
        glow: "0 0 25px rgba(80,120,255,0.45)",
        "glow-sm": "0 0 15px rgba(79,116,255,0.35)",
      },
      backdropBlur: {
        glass: "20px",
      },
    },
  },
  plugins: [],
};

export default config;