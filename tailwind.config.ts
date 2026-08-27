import type { Config } from "tailwindcss";

// Tailwind v4 usa CSS-first config (@theme en src/app/globals.css) para colores y tema.
// Este archivo queda mínimo, solo para editores/plugins que aún esperan un config file.
const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
};

export default config;
