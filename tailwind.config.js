/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html","./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'rgb(var(--color-primary) / <alpha-value>)',
          dark: 'rgb(var(--color-primary-dark) / <alpha-value>)',
          light: 'rgb(var(--color-primary-light) / <alpha-value>)',
        },
        secondary: 'rgb(var(--color-secondary) / <alpha-value>)',
        accent: 'rgb(var(--color-accent) / <alpha-value>)',
        cbg: 'rgb(var(--color-bg) / <alpha-value>)'
      },
      fontFamily: {
        sans: ['var(--site-font-family)'],
        zh: ['var(--site-font-family-zh)'],
        en: ['var(--site-font-family-en)']
      }
    }
  },
  plugins: []
}
