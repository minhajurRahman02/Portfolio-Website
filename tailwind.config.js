/** Tokens live as CSS variables in src/styles/index.css so the light,
 *  dark and daylight palettes can swap at runtime. Tailwind reads them. */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        void: 'var(--void)',
        slab: 'var(--slab)',
        slab2: 'var(--slab-2)',
        ink: 'var(--ink)',
        dim: 'var(--dim)',
        indigo: 'var(--indigo)',
        violet: 'var(--violet)',
        accent: 'var(--accent)',
        accent2: 'var(--accent-2)',
        line: 'var(--line)',
      },
      fontFamily: {
        display: ['Clash Display', 'Bricolage Grotesque', 'Arial Black', 'system-ui', 'sans-serif'],
        body: ['Satoshi', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      maxWidth: { page: '1280px' },
    },
  },
  plugins: [],
};
