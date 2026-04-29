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
        background: "var(--background)",
        foreground: "var(--foreground)",
        engao: {
          bg: "#FAFAF7",
          green: "#6BA368",
          "green-dark": "#527A50",
          "green-light": "#EAF2E9",
          orange: "#F4B860",
          "orange-dark": "#E09A30",
          "orange-light": "#FEF3DC",
          text: "#333333",
          sub: "#777777",
          border: "#E5E5E0",
          warn: "#E07020",
          danger: "#CC3333",
          "danger-light": "#FDE8E8",
        },
      },
    },
  },
  plugins: [],
};
export default config;
