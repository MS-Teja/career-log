import type { Config } from 'tailwindcss';

const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: token('bg'),
        surface: { DEFAULT: token('surface'), 2: token('surface-2') },
        ink: token('ink'),
        muted: token('muted'),
        border: { DEFAULT: token('border'), strong: token('border-strong') },
        accent: { DEFAULT: token('accent'), fg: token('accent-fg'), soft: token('accent-soft') },
        success: token('success'),
        danger: { DEFAULT: token('danger'), fg: token('danger-fg') },
        warning: token('warning'),
        cat: {
          dsa: token('cat-dsa'),
          core: token('cat-core'),
          design: token('cat-design'),
          aptitude: token('cat-aptitude'),
          behavioural: token('cat-behavioural'),
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['Fraunces', 'ui-serif', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      // Type scale: serif sizes for page titles and the notebook; sans sizes for the dashboard.
      fontSize: {
        display: ['3.25rem', { lineHeight: '1.08', letterSpacing: '-0.02em' }],
        page: ['2.125rem', { lineHeight: '1.15', letterSpacing: '-0.01em' }],
        section: ['1.5rem', { lineHeight: '1.25' }],
        card: ['1rem', { lineHeight: '1.4' }],
      },
      borderRadius: { DEFAULT: '8px' },
      maxWidth: { prose: '680px' },
      keyframes: {
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        'fade-in': { from: { opacity: '0', transform: 'translateY(4px)' }, to: { opacity: '1', transform: 'none' } },
      },
      animation: {
        'fade-in': 'fade-in 160ms ease-out',
      },
    },
  },
  plugins: [],
} satisfies Config;
