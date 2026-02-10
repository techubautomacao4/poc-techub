/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Techub Palette
        techub: {
          green: {
            DEFAULT: '#00FF00', // Principal
            light: '#E6FFE6',
            hover: '#32FF32',
            dark: '#006400',
          },
          gray: {
            50: '#F0F0F0', // Branco base
            100: '#E6E6E6',
            200: '#C8C8C8',
            300: '#B3B3B3',
            400: '#969696',
            500: '#828282',
            600: '#646464',
            700: '#505050',
            800: '#323232',
            900: '#1E1E1E',
            950: '#0A0A0A', // Preto base
          }
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
