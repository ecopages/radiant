import type { Plugin, UserConfig } from 'vite';
import { version as viteVersion } from 'vite';
import { RADIANT_SSR_EXTERNAL_PACKAGES } from './ssr-externals';

export type RadiantJsxConfigOptions = {
	jsxImportSource?: string;
	/** When using `decorators: 'babel'`, keep the esbuild shim on ECMAScript decorators. */
	useBabelDecorators?: boolean;
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
 * Vite 8+ resolves the transform through `oxc` and, when `esbuild` transform options are
 * also present, ignores them with a warning — so the two configs can't be set together on
 * that range. Earlier Vite majors (peer range down to 5) don't recognize `oxc` at all and
 * need the `esbuild` config to actually take effect. Feature-detecting the host project's
 * installed Vite major picks the one config that both applies and stays warning-free.
 */
function supportsOxcTransform(): boolean {
	const major = Number(viteVersion.split('.')[0]);
	return Number.isFinite(major) && major >= 8;
}

/**
 * Radiant JSX defaults for whichever transform the host project's Vite major actually uses.
 */
export function createRadiantJsxConfig(options: RadiantJsxConfigOptions = {}): Pick<Plugin, 'name' | 'config'> {
	const jsxImportSource = options.jsxImportSource ?? defaultJsxImportSource;
	const experimentalDecorators = options.useBabelDecorators ? false : undefined;

	return {
		name: 'ecopages:radiant-jsx',
		config() {
			const transformConfig = supportsOxcTransform()
				? {
						oxc: {
							jsx: {
								runtime: 'automatic' as const,
								importSource: jsxImportSource,
								development: process.env.NODE_ENV !== 'production',
							},
						},
					}
				: {
						esbuild: {
							target: 'es2022' as const,
							jsx: 'automatic' as const,
							jsxImportSource,
							tsconfigRaw: JSON.stringify({
								compilerOptions: {
									target: 'ES2022',
									useDefineForClassFields: true,
									module: 'ESNext',
									jsx: 'react-jsx',
									jsxImportSource,
									...(experimentalDecorators === false ? { experimentalDecorators: false } : {}),
								},
							}),
						},
					};

			return {
				...transformConfig,
				build: {
					target: 'es2022',
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
