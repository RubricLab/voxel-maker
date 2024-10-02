import type { Config } from "tailwindcss";

const rubricConfig = {
  content: ["./node_modules/@rubriclab/ui/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "rubricui-primary": "rgb(var(--rubricui-primary) / <alpha-value>)",
        "rubricui-contrast": "rgb(var(--rubricui-contrast) / <alpha-value>)",
      },
      transitionDuration: {
        "rubricui-duration": "300ms",
      },
      keyframes: {
        "rubricui-loading-rotate": {
          "0%": { transform: "rotate(0deg)" },
          "25%": { transform: "rotate(90deg)" },
          "50%": { transform: "rotate(180deg)" },
          "75%": { transform: "rotate(270deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "rubricui-loading-rotate":
          "rubricui-loading-rotate 1s steps(1) infinite",
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;

export default rubricConfig;
