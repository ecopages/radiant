import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import type { Plugin } from 'vite';
import { globalsNameReferenceMap } from 'storybook/internal/preview/globals';

const require = createRequire(import.meta.url);

type GlobalScope = typeof globalThis & Record<string, unknown>;

/**
 * Resolve a Storybook preview package from this plugin, then from `process.cwd()`.
 *
 * @remarks
 * `storybook` is a peer. `require.resolve` from this file can fail under pnpm; the
 * Storybook app's working directory is the fallback.
 */
export function resolvePreviewPackage(
	specifier: string,
	resolveImpl: NodeJS.RequireResolve = require.resolve,
): string {
	try {
		return resolveImpl(specifier);
	} catch {
		return resolveImpl(specifier, { paths: [process.cwd()] });
	}
}

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
	resolvePackage: (specifier: string) => string = resolvePreviewPackage,
): Promise<void> {
	await Promise.all(
		Object.entries(globalsNameReferenceMap).map(async ([specifier, globalName]) => {
			if (scope[globalName] != null) {
				return;
			}

			try {
				const resolved = resolvePackage(specifier);
				scope[globalName] = await import(pathToFileURL(resolved).href);
			} catch {
				// Optional preview packages (e.g. docs blocks) may be absent.
			}
		}),
	);
}

/**
 * Install preview globals on the Vite Node process before any `ssrLoadModule`.
 *
 * @remarks
 * No `transform` hook — client modules keep iframe globals from preview runtime.
 * Assignments are Node `globalThis` only and skip names that are already set.
 */
export function radiantSsrPreviewGlobalsPlugin(): Plugin {
	let installPromise: Promise<void> | undefined;
	const ensureInstalled = () => (installPromise ??= installStorybookPreviewGlobals());

	return {
		name: 'ecopages:radiant-ssr-preview-globals',
		enforce: 'pre',
		configResolved: ensureInstalled,
		configureServer: ensureInstalled,
		buildStart: ensureInstalled,
	};
}
