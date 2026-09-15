import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        plane: "var(--plane)",
        surface: {
          DEFAULT: "var(--surface)",
          sunken: "var(--surface-sunken)",
        },
        ink: {
          DEFAULT: "var(--ink)",
          2: "var(--ink-2)",
          3: "var(--ink-3)",
        },
        line: {
          DEFAULT: "var(--line)",
          strong: "var(--line-strong)",
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
