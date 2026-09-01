/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./public/**/*.{html,js}", "./server.js"],
  theme: {
    extend: {
      colors: {
        ink: "#061329",
        navy: "#082B4A",
        teal: "#1A8087",
        gold: "#D6A73D",
        cream: "#F6F0E7"
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["Manrope", "Inter", "ui-sans-serif", "system-ui", "sans-serif"]
      }
    }
  },
  plugins: []
}
