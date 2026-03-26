import { resolve } from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import { nitro } from 'nitro/vite';
import { defineConfig } from 'vite';
import standardConfig from './tsconfig.json';

export default defineConfig({
	plugins: [tailwindcss(), nitro()],
	resolve: {
		alias: [
			{
				find: '@ecopages/jsx/jsx-dev-runtime',
				replacement: resolve(__dirname, '../../packages/jsx/jsx-dev-runtime.ts'),
			},
			{
				find: '@ecopages/jsx/jsx-runtime',
				replacement: resolve(__dirname, '../../packages/jsx/jsx-runtime.ts'),
			},
			{
				find: '@ecopages/radiant/tools/stringify-typed',
				replacement: resolve(__dirname, '../../packages/radiant/src/tools/stringify-typed.ts'),
			},
			{
				find: '@ecopages/radiant/server/light-dom-shim',
				replacement: resolve(__dirname, '../../packages/radiant/src/server/light-dom-shim.ts'),
			},
			{
				find: '@ecopages/jsx',
				replacement: resolve(__dirname, '../../packages/jsx/index.ts'),
			},
			{
				find: '@ecopages/radiant',
				replacement: resolve(__dirname, '../../packages/radiant/src/index.ts'),
			},
		],
	},
	esbuild: {
		target: 'es2022',
		tsconfigRaw: JSON.stringify(standardConfig),
	},
});
