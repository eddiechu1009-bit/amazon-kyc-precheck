/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        amazon: {
          orange: '#FF9900',
          'orange-hover': '#E88B00',
          dark: '#232F3E',
          light: '#37475A',
          blue: '#146EB4',
          'blue-light': '#1A8FE3',
          success: '#067D62',
          warning: '#C7511F',
          danger: '#CC0C39',
        },
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.04)',
        'card-hover': '0 8px 24px -6px rgba(35, 47, 62, 0.12), 0 4px 10px -4px rgba(35, 47, 62, 0.08)',
        'cta': '0 6px 20px -4px rgba(255, 153, 0, 0.5)',
      },
      transitionDuration: {
        '250': '250ms',
      },
    },
  },
  plugins: [],
}
