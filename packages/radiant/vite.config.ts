/// <reference types="vitest" />
import { defineConfig } from 'vite';
import standardConfig from './tsconfig.json';
import legacyConfig from './tsconfig.legacy.json';

const LEGACY_ENVIRONMENT = process.argv.includes('--legacy');
const tsconfigRaw = LEGACY_ENVIRONMENT ? JSON.stringify(legacyConfig) : JSON.stringify(standardConfig);

export default defineConfig({
  esbuild: {
    target: 'es2022',
    tsconfigRaw,
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
