/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // The one TourOps accent. Mirrors apps/web/src/lib/brand.ts.
        brand: {
          DEFAULT: '#0d6e52',
          50: '#f0f7f4',
          100: '#d9ebe4',
          600: '#0d6e52',
          700: '#0b5c45',
        },
        navy: '#1c3a5e',
      },
    },
  },
  plugins: [],
};
