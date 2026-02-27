/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'b-black': '#111111',
        'b-off': '#F9F8F6',
        'b-orange': '#E05C00',
        'b-mid': '#888885',
        'b-light': '#D8D6D2',
        'b-rule': '#EBEBEB',
        'b-white': '#FFFFFF',
      },
      fontFamily: {
        'display': ['Playfair Display', 'Georgia', 'serif'],
        'mono-bondy': ['DM Mono', 'monospace'],
        'body': ['DM Sans', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
