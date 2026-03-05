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
            DEFAULT: '#00D26A', // Principal (verde menos vibrante)
            light: '#E5F9ED',
            hover: '#00E676',
            dark: '#009045',
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
