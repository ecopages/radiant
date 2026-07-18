import { defineNitroConfig } from 'nitro/config';

export default defineNitroConfig({
	serverDir: './server',
	/**
	 * Keep `@ecopages/*` as Node externals so SSR ambient state (ALS, adapters)
	 * is module-local and not duplicated across Nitro chunks.
	 */
	rollupConfig: {
		external: [
			'@ecopages/jsx',
			'@ecopages/jsx/server',
			'@ecopages/jsx/client',
			'@ecopages/signals',
			'@ecopages/radiant',
			/^@ecopages\/jsx(?:\/|$)/,
			/^@ecopages\/radiant(?:\/|$)/,
			/^@ecopages\/signals(?:\/|$)/,
		],
	},
});
