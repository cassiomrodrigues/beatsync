/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './App.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        oled: {
          bg: '#000000',
          card: '#000000',
          elevated: '#000000',
          border: '#1F1F1F',
          text: '#F5F5F5',
          secondary: '#A0A0A0',
          muted: '#666666',
          accent: '#00E5FF',
        },
        day: {
          bg: '#F8FAFC',
          card: '#FFFFFF',
          elevated: '#F1F5F9',
          border: '#CBD5E1',
          text: '#0F172A',
          secondary: '#334155',
          muted: '#64748B',
          accent: '#0284C7',
        },
      },
      height: {
        dvh: '100dvh',
        svh: '100svh',
      },
    },
  },
  plugins: [],
};
