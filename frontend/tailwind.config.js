/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        crew: {
          bg: '#F4F2EC',
          surface: '#FFFEFA',
          'text-primary': '#263A32',
          'text-secondary': '#5D6B62',
          action: '#477461',
          'action-hover': '#3b6151',
          terracotta: '#C8795B',
          sand: '#D5B98A',
          border: '#E5E1D8',
          success: '#39815E',
          warning: '#9A5A20',
          danger: '#B9534B',
          info: '#526C85',
        },
      },
      fontFamily: {
        heading: ['Manrope', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        sm: '6px',
        DEFAULT: '10px',
        md: '10px',
        lg: '14px',
      },
      boxShadow: {
        subtle: '0 1px 3px 0 rgba(38, 58, 50, 0.05), 0 1px 2px 0 rgba(38, 58, 50, 0.03)',
        card: '0 2px 6px -1px rgba(38, 58, 50, 0.06), 0 1px 4px -1px rgba(38, 58, 50, 0.03)',
      },
    },
  },
  plugins: [],
}

