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
        // えんがお ブランドカラー
        engao: {
          bg:      "#FAFAF7",
          green:   "#6BA368",
          "green-dark": "#557F52",
          "green-light": "#EBF3EA",
          yellow:  "#F4B860",
          "yellow-light": "#FDF3E0",
          text:    "#333333",
          sub:     "#777777",
          border:  "#E5E5E0",
        },
      },
    },
  },
  plugins: [],
};
export default config;
