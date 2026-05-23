/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}', './*.jsx', './components/**/*.{js,jsx}', './**/*.jsx'],
  theme: {
    extend: {
      colors: {
        // Strict palette — these are the only colors used in the UI.
        'arm-red': '#8B1A1A',
        'warm-bg': '#FAFAF9',
        'warm-border': '#E8E6E1',
        'warm-text': '#1A1917',     // primary text, buttons
        'warm-muted': '#6B6860',    // secondary text
        'warm-placeholder': '#9B9690', // placeholders, muted hints
      },
      fontFamily: {
        playfair: ['"Playfair Display"', 'Georgia', 'serif'],
        plex: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
}
