/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,vue,html}'
  ],
  theme: {
    extend: {
      colors: {
        'canvas-slate-500': '#728295',
        'canvas-slate-600': '#485462',
        'canvas-slate-800': '#2B3136',
        'canvas-gray-500': '#707070',
        'canvas-sky-300': '#4AC1F0',
        'canvas-sky-500': '#00A0DF'
      }
    }
  },
  plugins: []
}
