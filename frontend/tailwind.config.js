/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#EAF3FF',
          100: '#D8E8FF',
          200: '#B9D2FF',
          300: '#7FB3FF',
          400: '#5B90F4',
          500: '#2F6FED',
          600: '#1F57C8',
          700: '#134074',
          800: '#102F57',
          900: '#0B2545',
        },
        teal: {
          50: '#F0FDFA',
          100: '#DDF8F4',
          200: '#CDEFEA',
          300: '#8FE0D6',
          400: '#43CDBD',
          500: '#14B8A6',
          600: '#0F9083',
          700: '#0F766E',
          800: '#115E59',
          900: '#134E4A',
        },
        coral: {
          50: '#FFF5F4',
          100: '#FFE5E3',
          200: '#FFC9C6',
          300: '#FFA8A3',
          400: '#FA7A73',
          500: '#F25F5C',
          600: '#D94B48',
          700: '#B93A37',
          800: '#8F2B29',
          900: '#6D2220',
        },
        sand: {
          200: '#F3E9D2',
        },
        seafoam: {
          200: '#CDEFEA',
        },
        kelp: {
          600: '#4D7C0F',
        },
      },
    },
  },
  plugins: [],
}
