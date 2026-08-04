import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#5E6AD2",
          hover: "#4F5ABF",
          light: "#ECEEFB",
        },
        success: "#2DA44E",
        warning: "#BF8700",
        danger: "#CF222E",
        border: "#E1E4E8",
        muted: "#656D76",
        surface: "#FFFFFF",
        bg: "#F6F8FA",
        sidebar: "#FFFFFF",
        text: "#1F2328",
      },
      borderRadius: {
        sm: "3px",
        md: "5px",
        lg: "6px",
        xl: "8px",
      },
      fontFamily: {
        sans: [
          "var(--font-inter)",
          "var(--font-noto-sans-jp)",
          "Hiragino Sans",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
