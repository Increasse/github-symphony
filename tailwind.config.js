/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'symphony-dark': '#0a0a0f',
        'symphony-purple': '#8b5cf6',
        'symphony-gold': '#fbbf24',
      }
    },
  },
  plugins: [],
}