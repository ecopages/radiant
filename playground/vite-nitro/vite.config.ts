import tailwindcss from '@tailwindcss/vite';
import { nitro } from 'nitro/vite';
import { defineConfig } from 'vite';
import standardConfig from './tsconfig.json';
import path from 'node:path';
import { radiantElements } from './vite-plugin-radiant';

export default defineConfig({
	plugins: [tailwindcss(), radiantElements(), nitro()],
	esbuild: {
		target: 'es2022',
		tsconfigRaw: JSON.stringify(standardConfig),
	},
	resolve: {
		alias: [{ find: '@', replacement: path.resolve(__dirname, 'src') }],
	},
});
