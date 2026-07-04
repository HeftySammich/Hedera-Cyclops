import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(rootDir, 'src'),
    },
  },
  test: {
    globals: true,
    env: {
      AUTH_JWT_SECRET: 'test-secret-do-not-use-in-production',
    },
    setupFiles: ['./vitest.setup.ts'],
    // Component tests (*.test.tsx) run in jsdom; everything else in node.
    environmentMatchGlobs: [
      ['**/*.test.tsx', 'jsdom'],
    ],
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'tests/**/*.test.ts'],
  },
});
