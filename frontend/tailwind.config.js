/** @type {import("tailwindcss").Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Plus Jakarta Sans", "Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["Fira Code", "JetBrains Mono", "monospace"],
      },
      colors: {
        obsidian: {
          950: "#07080c",
          900: "#0c0e14",
          850: "#11141c",
          800: "#151822",
          750: "#1a1e2b",
          700: "#222736",
          600: "#2e3447"
        },
        lime: {
          300: "#d6ff5e",
          400: "#c4ff33",
          500: "#b8ff22",
          600: "#9ee605",
          700: "#7fb800"
        },
        coral: {
          400: "#ff6b4a",
          500: "#f04438",
          600: "#d92d20"
        }
      },
      borderRadius: {
        "3xl": "24px",
        "4xl": "32px",
        "5xl": "40px"
      },
      boxShadow: {
        glowLime: "0 0 30px rgba(184, 255, 34, 0.35)",
        tablet: "0 25px 70px -15px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.08)",
        cardDark: "0 4px 20px -2px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
        cardWhite: "0 10px 30px -5px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.04)"
      }
    },
  },
  plugins: [],
}