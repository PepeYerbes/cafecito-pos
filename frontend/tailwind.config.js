/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{html,ts}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          900: "#04151f",
          700: "#183a37",
          sand: "#efd6ac",
          flame: "#c44900",
          plum: "#432534",
        }
      }
    }
  },
  plugins: []
}