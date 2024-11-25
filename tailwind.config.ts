import type { Config } from "tailwindcss";
import rubricConfig from "./rubric.preset";

const tailwindConfig = {
  content: [
    "./src/**/*.tsx",
    "./node_modules/@rubriclab/ui/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [rubricConfig],
} satisfies Config;

export default tailwindConfig;
