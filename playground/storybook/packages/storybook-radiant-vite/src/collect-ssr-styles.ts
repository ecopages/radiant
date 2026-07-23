import type { ModuleNode, ViteDevServer } from 'vite';
import type { RadiantSsrAsset } from './constants';
import { normalizeSsrModulePath, toViteSsrModulePath } from './ssr-module-path';

/** Preview globals required for Tailwind tokens used by component CSS. */
const STORYBOOK_GLOBAL_STYLE_MODULES = ['/src/styles/tailwind.css'] as const;

function isCssModuleId(id: string): boolean {
	return (id.split('?')[0] ?? id).endsWith('.css');
}

/**
 * Href for `<link rel="stylesheet">` in Storybook SSR previews.
 *
 * Use Vite-processed CSS URLs (no `?direct`). Raw/direct CSS breaks Tailwind v4
 * `@reference` / `@apply` authoring used by radiant-ui component stylesheets.
 */
export function toStylesheetLinkHref(href: string): string {
	const normalized = normalizeSsrModulePath(href);
	return normalized.split('?')[0] ?? normalized;
}

export function styleModuleCandidatesFromSourceModule(modulePath: string): string[] {
	const file = (modulePath.split('?')[0] ?? modulePath).replace(/\\/g, '/');

	if (isCssModuleId(file)) {
		return [file];
	}

	const base = file.replace(/\.(?:script\.)?(?:tsx?|jsx?)$/, '');
	if (!base || base === file) {
		return [];
	}

	return [`${base}.css`];
}

async function resolveStyleModulePath(server: ViteDevServer, modulePath: string): Promise<string | null> {
	const normalized = normalizeSsrModulePath(modulePath);

	try {
		const resolved = await server.pluginContainer.resolveId(normalized, undefined, { ssr: true });
		if (!resolved) {
			return null;
		}

		const id = typeof resolved === 'string' ? resolved : resolved.id;
		return toViteSsrModulePath(id, server.config.root);
	} catch {
		return null;
	}
}

function pushStyleAsset(seen: Set<string>, assets: RadiantSsrAsset[], href: string): void {
	const normalizedHref = toStylesheetLinkHref(href);
	if (seen.has(normalizedHref)) {
		return;
	}

	seen.add(normalizedHref);
	assets.push({ kind: 'style', href: normalizedHref });
}

function visitImportedStyles(
	server: ViteDevServer,
	mod: ModuleNode | undefined,
	seen: Set<string>,
	assets: RadiantSsrAsset[],
): void {
	if (!mod) {
		return;
	}

	for (const imported of mod.importedModules) {
		const id = imported.url ?? imported.id;
		if (!id) {
			continue;
		}

		if (isCssModuleId(id)) {
			pushStyleAsset(seen, assets, toViteSsrModulePath(id.split('?')[0]!, server.config.root));
		}

		visitImportedStyles(server, imported, seen, assets);
	}
}

async function findModuleNode(server: ViteDevServer, modulePath: string): Promise<ModuleNode | undefined> {
	const normalized = normalizeSsrModulePath(modulePath);
	const byUrl = server.moduleGraph.getModuleByUrl(normalized);
	if (byUrl) {
		return byUrl;
	}

	const resolved = await server.pluginContainer.resolveId(normalized, undefined, { ssr: true });
	if (!resolved) {
		return undefined;
	}

	const id = typeof resolved === 'string' ? resolved : resolved.id;
	return server.moduleGraph.getModuleById(id);
}

async function collectStylesForModule(
	server: ViteDevServer,
	modulePath: string,
	seen: Set<string>,
	assets: RadiantSsrAsset[],
): Promise<void> {
	const normalized = normalizeSsrModulePath(modulePath);
	if (!normalized) {
		return;
	}

	try {
		await server.ssrLoadModule(normalized);
	} catch {
		// Continue with co-located fallbacks when the entry cannot be evaluated.
	}

	visitImportedStyles(server, await findModuleNode(server, normalized), seen, assets);

	for (const candidate of styleModuleCandidatesFromSourceModule(normalized)) {
		const resolved = await resolveStyleModulePath(server, candidate);
		if (!resolved) {
			continue;
		}

		pushStyleAsset(seen, assets, resolved);
		visitImportedStyles(server, await findModuleNode(server, resolved), seen, assets);
	}
}

/**
 * Collect stylesheet dependencies for SSR static previews.
 * Walks the Vite module graph from the view/script entries and falls back to co-located `*.css`.
 */
export async function collectSsrStyleAssets(
	server: ViteDevServer,
	entryModulePaths: readonly string[],
	options: { includeGlobalStyles?: boolean } = {},
): Promise<RadiantSsrAsset[]> {
	const assets: RadiantSsrAsset[] = [];
	const seen = new Set<string>();
	const entries = [...new Set(entryModulePaths.map(normalizeSsrModulePath).filter(Boolean))];

	if (options.includeGlobalStyles) {
		for (const globalStyle of STORYBOOK_GLOBAL_STYLE_MODULES) {
			await collectStylesForModule(server, globalStyle, seen, assets);
		}
	}

	for (const entry of entries) {
		await collectStylesForModule(server, entry, seen, assets);
	}

	return assets;
}
