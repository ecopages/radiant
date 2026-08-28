import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import type { Plugin } from 'vite';
import { globalsNameReferenceMap } from 'storybook/internal/preview/globals';

const require = createRequire(import.meta.url);

function resolvePreviewPackage(specifier: string): string {
	try {
		return require.resolve(specifier);
	} catch {
		return require.resolve(specifier, { paths: [process.cwd()] });
	}
}

type GlobalScope = typeof globalThis & Record<string, unknown>;

/**
 * Storybook's Vite plugin rewrites `storybook/test` (and sibling preview packages)
 * to free identifiers such as `__STORYBOOK_MODULE_TEST__`. The preview iframe
 * assigns those on `globalThis` from `storybook/preview/runtime`.
 *
 * Radiant SSR evaluates story modules in Node via `ssrLoadModule`, including
 * play helpers that import `storybook/test`. Install the same real packages on
 * `globalThis` so SSR matches the browser instead of stubbing or rewriting files.
 */
export async function installStorybookPreviewGlobals(
	scope: GlobalScope = globalThis as GlobalScope,
): Promise<void> {
	for (const [specifier, globalName] of Object.entries(globalsNameReferenceMap)) {
		if (scope[globalName]) {
			continue;
		}

		try {
			const resolved = resolvePreviewPackage(specifier);
			scope[globalName] = await import(pathToFileURL(resolved).href);
		} catch {
			// Optional preview packages (e.g. docs blocks) may be absent.
		}
	}
}

export function radiantSsrPreviewGlobalsPlugin(): Plugin {
	let installed = false;

	const ensureInstalled = async () => {
		if (installed) {
			return;
		}
		await installStorybookPreviewGlobals();
		installed = true;
	};

	return {
		name: 'ecopages:radiant-ssr-preview-globals',
		enforce: 'pre',
		async configResolved() {
			await ensureInstalled();
		},
		async configureServer() {
			await ensureInstalled();
		},
		async buildStart() {
			await ensureInstalled();
		},
	};
}
