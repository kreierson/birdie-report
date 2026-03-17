/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        forest: {
          50: '#f0f7f1',
          100: '#dceede',
          200: '#b8ddb9',
          300: '#86c48a',
          400: '#55a65b',
          500: '#2d8a35',
          600: '#1a6e24',
          700: '#1a472a',
          800: '#163b22',
          900: '#12301c',
        },
      },
      fontFamily: {
        display: ['Georgia', 'serif'],
        body: ['system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
