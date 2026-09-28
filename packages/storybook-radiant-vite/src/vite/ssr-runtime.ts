import type { Plugin } from 'vite';

const SSR_RUNTIME_IMPORT = "import '@ecopages/radiant/server/install-ssr-runtime';\n";

function shouldPrependSsrRuntime(id: string): boolean {
	const file = id.split('?')[0] ?? id;
	return /\.(?:script|stories)\.(?:[cm]?[tj]sx?)$/.test(file) && !file.includes('node_modules');
}

/**
 * Ensures Radiant's SSR runtime boots before element and story modules are evaluated in Vite SSR.
 */
export function radiantSsrRuntimePlugin(): Plugin {
	return {
		name: 'ecopages:radiant-ssr-runtime',
		enforce: 'pre',
		transform(code, id, options) {
			if (!options?.ssr || !shouldPrependSsrRuntime(id)) {
				return null;
			}

			if (code.includes('install-ssr-runtime')) {
				return null;
			}

			return {
				code: `${SSR_RUNTIME_IMPORT}${code}`,
				map: null,
			};
		},
	};
}
