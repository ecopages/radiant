/// <reference types="vitest" />
import { defineConfig } from 'vite';

export default defineConfig({
  esbuild: {
    target: 'es2022',
  },
  test: {
    environmentMatchGlobs: [['test/**/*.test.*', 'happy-dom']],
    coverage: {
      provider: 'istanbul',
      include: ['src'],
      exclude: ['src/playground.tsx'],
    },
  },
});
