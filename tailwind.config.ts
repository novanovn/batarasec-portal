import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#141416",
        card: "#1C1C1E",
        border: "#3F3F46",
        foreground: "#F4F4F5",
        accent: "#185FA5",
      },
    },
  },
  plugins: [],
};

export default config;
