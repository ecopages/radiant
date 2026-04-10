import tailwindcss from '@tailwindcss/vite';
import { nitro } from 'nitro/vite';
import { defineConfig } from 'vite';
import standardConfig from './tsconfig.json';
import { radiantComponents } from './vite-plugin-radiant';

export default defineConfig({
	plugins: [tailwindcss(), radiantComponents(), nitro()],
	esbuild: {
		target: 'es2022',
		tsconfigRaw: JSON.stringify(standardConfig),
	},
});
