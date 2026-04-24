/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      boxShadow: {
        card: '0 14px 36px rgba(15, 23, 42, 0.05)',
        active: '0 10px 30px rgba(44, 103, 246, 0.28)',
      },
    },
  },
  plugins: [],
};
