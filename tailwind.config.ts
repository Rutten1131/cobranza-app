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
        // Cinematographic Barbershop Palette
        primary: {
          DEFAULT: "#d97644",   // Cobre quemado
          dark: "#a8501f",      // Cobre profundo
          light: "#ec8a52",     // Cobre hover
        },
        accent: "#22C55E",      // Verde para estados "pagado"
        warning: "#eab308",
        danger: "#ef4444",
        surface: {
          DEFAULT: "#131110",   // Fondo de tarjetas
          secondary: "#1a1715", // Fondo de hover/inputs
          card: "#1a1715",
          dark: "#0a0807",
        },
        background: {
          primary: "#0a0807",   // Carbón cálido
          secondary: "#131110",
        },
        "text-main": "#f3ece1", // Crema
        "text-sub": "#a89e90",  // Texto secundario
        "text-muted": "#5c554c",// Placeholder
        border: {
          DEFAULT: "#2a2520",
          light: "#1f1c19",
        },
        card: "#1a1715",
      },
      fontFamily: {
        display: ["Fraunces", "serif"],
        body: ['"Space Grotesk"', "sans-serif"],
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
        xs: "4px",
        sm: "6px",
        md: "8px",
        lg: "12px",
        xl: "16px",
        pill: "9999px",
      },
      boxShadow: {
        card: "0 4px 20px rgba(0,0,0,0.4)",
        "card-sm": "0 2px 10px rgba(0,0,0,0.3)",
        modal: "0 20px 40px rgba(0,0,0,0.5)",
        glow: "0 0 20px rgba(217,118,68,0.3)",
        "glow-sm": "0 0 10px rgba(217,118,68,0.2)",
      },
      backdropBlur: {
        glass: "20px",
      },
    },
  },
  plugins: [],
};

export default config;