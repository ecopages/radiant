import tailwindcss from '@tailwindcss/vite';
import { nitro } from 'nitro/vite';
import { defineConfig, type Plugin } from 'vite';
import standardConfig from './tsconfig.json';
import path from 'node:path';
import { ECOPAGES_SSR_EXTERNAL } from './ecopages-ssr-external';
import { radiantElements } from './vite-plugin-radiant';

/**
 * Nitro's production vite environment sets `resolve.noExternal: true`, which
 * inlines workspace packages and duplicates SSR ambient state. Force a single
 * Node-resolved instance of `@ecopages/*` instead.
 */
function externalizeEcopagesForSsr(): Plugin {
	return {
		name: 'externalize-ecopages-for-ssr',
		enforce: 'post',
		configEnvironment(name) {
			if (name !== 'nitro' && name !== 'ssr') {
				return;
			}

			return {
				resolve: {
					external: [...ECOPAGES_SSR_EXTERNAL],
				},
			};
		},
	};
}

export default defineConfig({
	plugins: [tailwindcss(), radiantElements(), nitro(), externalizeEcopagesForSsr()],
	esbuild: {
		target: 'es2022',
		tsconfigRaw: JSON.stringify(standardConfig),
	},
	resolve: {
		alias: [{ find: '@', replacement: path.resolve(__dirname, 'src') }],
	},
});
