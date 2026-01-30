module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        claw: {
          primary: '#F97316',
          secondary: '#3B82F6',
          accent: '#10B981',
          dark: '#0F172A',
          light: '#1E293B'
        }
      }
    },
  },
  plugins: [],
}
