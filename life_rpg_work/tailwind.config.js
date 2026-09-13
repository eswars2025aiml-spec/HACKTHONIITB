/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
  safelist: [
    // Dynamic difficulty/attribute button colors used via template literals
    'bg-emerald-600',
    'bg-amber-600',
    'bg-orange-600',
    'bg-rose-600',
    'bg-sky-600',
    'bg-rose-600',
    'bg-emerald-600',
    'bg-amber-600',
    // Hover shadow variants for quest cards
    'hover:shadow-emerald-500/10',
    'hover:shadow-amber-500/10',
    'hover:shadow-orange-500/10',
    'hover:shadow-rose-500/20',
  ],
};
