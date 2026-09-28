import type { ConfigEnv, Plugin, UserConfig } from 'vite';
import { RADIANT_SSR_EXTERNAL_PACKAGES } from './ssr-externals';

export type RadiantJsxConfigOptions = {
	jsxImportSource?: string;
};

const defaultJsxImportSource = '@ecopages/jsx';

const optimizeDepsExclude = [
	'@ecopages/jsx',
	'@ecopages/jsx/server',
	'@ecopages/jsx/client',
	'@ecopages/signals',
	'@ecopages/radiant',
] as const;

/**
 * Radiant JSX defaults for Vite 8+ (OXC transform).
 */
export function createRadiantJsxConfig(options: RadiantJsxConfigOptions = {}): Pick<Plugin, 'name' | 'config'> {
	const jsxImportSource = options.jsxImportSource ?? defaultJsxImportSource;

	return {
		name: 'ecopages:radiant-jsx',
		config(_config, env: ConfigEnv) {
			return {
				oxc: {
					jsx: {
						runtime: 'automatic' as const,
						importSource: jsxImportSource,
						development: env.mode !== 'production',
					},
				},
			};
		},
	};
}

export function createRadiantSsrExternalsPlugin(): Plugin {
	return {
		name: 'ecopages:radiant-ssr-externals',
		enforce: 'pre',
		config(): UserConfig {
			return {
				resolve: {
					// pnpm may link workspace `@ecopages/*` packages through both
					// `packages/*/dist` and the virtual store. Signals keep module-local
					// ambient tracking state, so two physical copies silently break
					// Computed dependency tracking across Radiant and app code.
					dedupe: [...optimizeDepsExclude],
				},
				ssr: {
					external: [...RADIANT_SSR_EXTERNAL_PACKAGES] as UserConfig['ssr'] extends { external?: infer T }
						? T
						: never,
				},
				optimizeDeps: {
					exclude: [...optimizeDepsExclude],
				},
			};
		},
	};
}
