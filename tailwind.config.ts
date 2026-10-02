import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./content/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // rgb(var(--x) / <alpha-value>) rather than a bare hex var, so opacity
        // modifiers such as bg-ink/60 and bg-surface/90 actually compile.
        plane: "rgb(var(--plane-rgb) / <alpha-value>)",
        surface: {
          DEFAULT: "rgb(var(--surface-rgb) / <alpha-value>)",
          sunken: "rgb(var(--surface-sunken-rgb) / <alpha-value>)",
        },
        ink: {
          DEFAULT: "rgb(var(--ink-rgb) / <alpha-value>)",
          2: "rgb(var(--ink-2-rgb) / <alpha-value>)",
          3: "rgb(var(--ink-3-rgb) / <alpha-value>)",
        },
        line: {
          DEFAULT: "rgb(var(--line-rgb) / <alpha-value>)",
          strong: "rgb(var(--line-strong-rgb) / <alpha-value>)",
        },
        series: "var(--series-1)",
        positive: "var(--positive)",
        warning: "var(--warning)",
        critical: "var(--critical)",
      },
      borderRadius: {
        md: "6px",
        lg: "10px",
        xl: "14px",
      },
      fontSize: {
        display: ["44px", { lineHeight: "1.06", letterSpacing: "-0.03em", fontWeight: "700" }],
        "display-lg": ["60px", { lineHeight: "1.02", letterSpacing: "-0.035em", fontWeight: "700" }],
      },
      boxShadow: {
        card: "0 1px 2px rgba(10,10,10,0.04)",
        pop: "0 8px 30px rgba(10,10,10,0.12)",
      },
    },
  },
  plugins: [],
};

export default config;
