/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'primary-purple': '#6B46C1',
        'secondary-green': '#10B981',
        'accent-orange': '#F59E0B',
        'danger-red': '#EF4444',
        'background-light': '#F8FAFC',
        'card-background': '#FFFFFF',
        'text-dark': '#1F2937',
        'text-light': '#6B7280',
        'gradient-blue-start': '#375DE5',
        'gradient-blue-end': '#6B7FEE',
      },
    },
  },
  plugins: [],
}

