import swc from 'unplugin-swc';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    swc.vite({
      jsc: {
        parser: {
          syntax: 'typescript',
          decorators: true,
        },
        transform: {
          decoratorMetadata: true,
          decoratorVersion: '2022-03',
          react: {
            runtime: 'automatic',
          },
        },
      },
    }),
  ],
});
