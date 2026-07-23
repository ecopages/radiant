import tailwindcss from '@tailwindcss/vite';
import { nitro } from 'nitro/vite';
import { radiantSsr } from '@ecopages/vite-plugin-radiant';
import { defineConfig, type PluginOption } from 'vite';
import path from 'node:path';

export default defineConfig({
	plugins: [tailwindcss(), nitro(), ...(radiantSsr() as PluginOption[])],
	resolve: {
		alias: [{ find: '@', replacement: path.resolve(__dirname, 'src') }],
	},
});
