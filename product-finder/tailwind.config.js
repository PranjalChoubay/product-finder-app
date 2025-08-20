/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",  // scan all React files
  ],
  darkMode: 'class',
  theme: {
    extend: {}, // you can add custom colors, fonts, etc. later
  },
  plugins: [],
}
