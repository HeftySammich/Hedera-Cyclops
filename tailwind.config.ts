import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Near-black background / off-white text / sage accent / terminal highlight.
        base: '#0a0a0a',
        panel: '#111111',
        ink: '#d4d4d4',
        muted: '#8a8a8a',
        sage: '#7c9885',
        terminal: '#39ff14',
      },
      fontFamily: {
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      keyframes: {
        blink: {
          '0%, 49%': { opacity: '1' },
          '50%, 100%': { opacity: '0' },
        },
        flicker: {
          '0%, 100%': { opacity: '0.06' },
          '50%': { opacity: '0.1' },
        },
      },
      animation: {
        blink: 'blink 1s step-end infinite',
        flicker: 'flicker 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
