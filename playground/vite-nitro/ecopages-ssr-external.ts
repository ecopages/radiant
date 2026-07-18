/**
 * Keep `@ecopages/*` as Node externals so SSR ambient state (ALS, adapters)
 * stays on one module instance. Pair with importing
 * `@ecopages/radiant/server/install-ssr-runtime` once at server boot, then
 * `renderComponent` / `renderToString`.
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
