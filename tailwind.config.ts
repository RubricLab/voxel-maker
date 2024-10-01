import type { Config } from "tailwindcss";

const tailwindConfig = {
  content: ["./src/**/*.tsx", "./node_modules/@rubriclab/ui/**/*.tsx"],
  presets: [require("./rubric.preset.ts")],
} satisfies Config;

export default tailwindConfig;
