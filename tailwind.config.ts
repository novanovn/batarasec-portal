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
        background: "var(--color-background)",
        card: "var(--color-card)",
        border: "var(--color-border)",
        foreground: "var(--color-foreground)",
        accent: "var(--color-accent)",
        "accent-dark": "var(--color-accent-dark)",
        "accent-light": "var(--color-accent-light)",
        success: "var(--color-success)",
        warning: "var(--color-warning)",
        danger: "var(--color-danger)",
        muted: "var(--color-muted)",
        "muted-dark": "var(--color-muted-dark)",
      },
      borderRadius: {
        DEFAULT: "var(--radius)",
      },
    },
  },
  plugins: [],
};

export default config;
