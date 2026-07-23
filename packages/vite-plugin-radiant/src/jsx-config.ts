import type { Plugin, UserConfig } from 'vite';
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
 * Merge Radiant JSX defaults for both Vite 7 (`esbuild`) and Vite 8 (`oxc`).
 */
export function createRadiantJsxConfig(options: RadiantJsxConfigOptions = {}): Pick<Plugin, 'name' | 'config'> {
	const jsxImportSource = options.jsxImportSource ?? defaultJsxImportSource;
	const experimentalDecorators = options.useBabelDecorators ? false : undefined;

	return {
		name: 'ecopages:radiant-jsx',
		config() {
			return {
				esbuild: {
					target: 'es2022',
					jsx: 'automatic',
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
				oxc: {
					jsx: {
						runtime: 'automatic',
						importSource: jsxImportSource,
						development: process.env.NODE_ENV !== 'production',
					},
				},
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
