/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        studio: {
          bg: '#0c0e14',
          panel: '#141821',
          card: '#1b202c',
          border: '#283042',
          accent: '#38bdf8',
          draw: '#fb923c',
          rec: '#f43f5e',
          good: '#34d399',
        },
      },
    },
  },
  plugins: [],
};
