import tailwindcss from '@tailwindcss/vite';
import { nitro } from 'nitro/vite';
import { defineConfig } from 'vite';
import standardConfig from './tsconfig.json';

export default defineConfig({
	plugins: [tailwindcss(), nitro()],
	esbuild: {
		target: 'es2022',
		tsconfigRaw: JSON.stringify(standardConfig),
	},
});
