/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        burgundy: {
          50: '#FAF4F5',
          100: '#F4E7E9',
          200: '#E8CCD0',
          300: '#D4A4AC',
          400: '#B06471',
          500: '#843241',
          600: '#64222C',
          700: '#4E1A22',
          800: '#3E1A1E', // Official EthnizCouture Logo Background
          850: '#341418',
          900: '#2B0C10', // Deep Royal Velvet
          950: '#1A080B', // Imperial Night
        },
        maroon: {
          50: '#FAF2F4',
          100: '#F5E4E8',
          200: '#ECCDD4',
          400: '#B8324F',
          600: '#7E192F',
          700: '#4E1A22',
          800: '#3E1A1E',
          900: '#2B0C10',
          950: '#1A080B',
        },
        gold: {
          50: '#FAF8F3',
          100: '#F5EFE3',
          200: '#EBDDC3',
          300: '#DFC89D', // Light Gold Text on Dark
          400: '#D4B87C',
          500: '#C6A15D', // Official EthnizCouture Logo Champagne Gold
          600: '#A9833D',
          700: '#84642C', // Antique Accessible Gold on Light Canvas
          800: '#644A1E',
        },
        ivory: {
          50: '#FCFBF9',
          100: '#FAF7F2', // Official Canvas
          200: '#F5EFE6',
          300: '#E8DEC8', // Warm Refined Border
          400: '#DFD2BE',
        },
        charcoal: {
          700: '#403B3C',
          800: '#2D2829',
          900: '#1A1A1A', // Primary Text
          950: '#0F0D0E',
        },
        brand: {
          burgundy: '#3E1A1E',
          deep: '#2B0C10',
          night: '#1A080B',
          gold: '#C6A15D',
          goldLight: '#DFC89D',
          goldAntique: '#84642C',
          ivory: '#FAF7F2',
          charcoal: '#1A1A1A',
          border: '#E8DEC8',
        }
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', 'Playfair Display', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'luxury': '0 10px 30px -10px rgba(62, 26, 30, 0.08)',
        'luxury-hover': '0 20px 40px -15px rgba(62, 26, 30, 0.12)',
        'gold-glow': '0 0 25px rgba(198, 161, 93, 0.2)',
        'bottom-bar': '0 -4px 20px rgba(0, 0, 0, 0.08)',
      }
    },
  },
  plugins: [],
}
