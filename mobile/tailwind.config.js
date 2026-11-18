/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}", "./lib/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        navy: "#0F172A",
        surface: "#F8FAFC",
        "brand-slate": "#475569",
        "brand-sky": "#0284C7",
        "brand-emerald": "#16A34A",
        "brand-amber": "#D97706",
        "brand-rose": "#E11D48",
        "brand-border": "#E2E8F0",
      },
    },
  },
  plugins: [],
};
