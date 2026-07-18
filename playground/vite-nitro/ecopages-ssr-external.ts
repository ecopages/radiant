/**
 * Keep `@ecopages/*` as Node externals so SSR ambient state (ALS, adapters)
 * stays module-local and is not duplicated across Nitro/Vite SSR chunks.
 */
export const ECOPAGES_SSR_EXTERNAL = [
	'@ecopages/jsx',
	'@ecopages/jsx/server',
	'@ecopages/jsx/client',
	'@ecopages/signals',
	'@ecopages/radiant',
	/^@ecopages\/jsx(?:\/|$)/,
	/^@ecopages\/radiant(?:\/|$)/,
	/^@ecopages\/signals(?:\/|$)/,
] as const;
