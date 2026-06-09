/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        pogo: {
          blue: '#0A4FA8',
          gold: '#FFD700',
          dark: '#0D1117',
          card: '#161B22',
          border: '#30363D',
          text: '#C9D1D9',
          muted: '#8B949E',
          accent: '#1F6FEB',
          success: '#3FB950',
          warning: '#D29922',
          danger: '#F85149',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
