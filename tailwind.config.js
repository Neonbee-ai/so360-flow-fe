import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const withComb = require('@so360/theme/src/withComb.cjs');

/** @type {import('tailwindcss').Config} */
export default withComb({
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        blue: {
          600: '#2563eb',
          500: '#3b82f6',
        },
      },
    },
  },
  plugins: [],
});
