/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}', './*.jsx', './components/**/*.{js,jsx}', './**/*.jsx'],
  theme: {
    extend: {
      colors: {
        'arm-red': '#8B1A1A',
        'arm-red-light': '#A52A2A',
        'warm-bg': '#FAFAF9',
        'warm-border': '#E8E6E1',
        'warm-text': '#1A1917',
        'warm-muted': '#6B6860',
      },
      fontFamily: {
        playfair: ['"Playfair Display"', 'Georgia', 'serif'],
        plex: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
