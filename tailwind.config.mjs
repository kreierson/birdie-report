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
          950: '#0a1f11',
        },
        gold: {
          50: '#fdfbf3',
          100: '#faf3d9',
          200: '#f4e5a8',
          300: '#edd777',
          400: '#e6c94d',
          500: '#d4af37',
          600: '#b8922d',
          700: '#997324',
          800: '#7a5c1d',
          900: '#5c4516',
        },
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        body: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      typography: {
        DEFAULT: {
          css: {
            '--tw-prose-links': '#1a472a',
            '--tw-prose-quotes-border': '#d4af37',
            blockquote: {
              borderLeftColor: '#d4af37',
              fontStyle: 'normal',
            },
          },
        },
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
