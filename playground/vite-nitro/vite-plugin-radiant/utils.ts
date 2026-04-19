import { posix } from 'node:path';

export type RadiantAppLoadMode = 'ssr' | 'client-only';

/**
 * Generates the virtual module body for `virtual:radiant/components`.
 *
 * Emits an eager `import.meta.glob` that side-effect-imports every component entry
 * matching `componentGlob`, ensuring custom-element registrations execute at SSR startup.
 */
export function createComponentsModule(componentGlob: string): string {
	return `import.meta.glob(${JSON.stringify(componentGlob)}, { eager: true });
`;
}

/**
 * Generates the virtual module body for `virtual:radiant/client-module-registry`.
 *
 * Produces `hasRadiantClientModule` and `loadRadiantClientModule` backed by a lazy
 * `import.meta.glob` over `componentGlob`.
 */
export function createClientRegistryModule(componentGlob: string): string {
	return `const radiantClientModuleLoaders = import.meta.glob(${JSON.stringify(componentGlob)});

export function hasRadiantClientModule(moduleKey) {
	return moduleKey in radiantClientModuleLoaders;
}

export async function loadRadiantClientModule(moduleKey) {
	const loader = radiantClientModuleLoaders[moduleKey];

	if (!loader) {
		throw new Error(\`Unknown Radiant client module: \${moduleKey}.\`);
	}

	return loader();
}
`;
}

/**
 * Generates the virtual module body for `virtual:radiant/ssr-client-module-registry`.
 *
 * Produces `resolveRadiantSsrClientModuleKey`, which scans an eager `import.meta.glob`
 * of all component entries and returns the source path for a given constructor.
 * Results are memoized in a `WeakMap` keyed on the constructor.
 */
export function createSsrRegistryModule(componentGlob: string): string {
	return `import '@ecopages/radiant/server/render-component';

const radiantComponentModules = import.meta.glob(${JSON.stringify(componentGlob)}, { eager: true });
const radiantClientModuleKeyCache = new WeakMap();

export async function resolveRadiantSsrClientModuleKey(component) {
	const cachedModuleKey = radiantClientModuleKeyCache.get(component);

	if (cachedModuleKey) {
		return cachedModuleKey;
	}

	for (const [moduleKey, moduleExports] of Object.entries(radiantComponentModules)) {

		if (!Object.values(moduleExports).includes(component)) {
			continue;
		}

		radiantClientModuleKeyCache.set(component, moduleKey);
		return moduleKey;
	}

	return undefined;
}
`;
}

/**
 * Generates the virtual module body for `virtual:radiant/ssr-asset-registry`.
 *
 * Produces four exports:
 * - `resolveRadiantSsrAssets` — resolves the canonical asset list for a component (script-module entry).
 * - `resolveRadiantSsrAssetUrl` — returns the Vite-hashed URL for a component-colocated CSS path.
 * - `resolveRadiantSsrStyleAsset` — resolves a single CSS path to a `style` asset descriptor.
 * - `resolveRadiantSsrStyleAssets` — variadic form; silently omits unresolved paths, always returns an array.
 *
 * CSS URLs are resolved via an eager `import.meta.glob(..., { query: '?url' })` over `styleGlob`,
 * which Vite expands to Vite-hashed, browser-importable URLs at build time. Component-to-module
 * key resolution delegates to `virtual:radiant/ssr-client-module-registry`.
 *
 * @param styleGlob - Glob covering all `*.css` files under the component directory.
 */
export function createSsrAssetRegistryModule(styleGlob: string): string {
	return `import { resolveRadiantSsrClientModuleKey } from 'virtual:radiant/ssr-client-module-registry';

const radiantStyleAssetUrls = import.meta.glob(${JSON.stringify(styleGlob)}, { eager: true, import: 'default', query: '?url' });

export async function resolveRadiantSsrAssets(component) {
	const moduleKey = await resolveRadiantSsrClientModuleKey(component);

	if (!moduleKey) {
		return [];
	}

	return [{ kind: 'script-module', src: moduleKey, stage: 'hydrate' }];
}

export function resolveRadiantSsrAssetUrl(source) {
	return radiantStyleAssetUrls[normalizeRadiantAssetSource(source)];
}

export function resolveRadiantSsrStyleAsset(source, media) {
	const href = resolveRadiantSsrAssetUrl(source);

	if (!href) {
		return undefined;
	}

	return media ? { kind: 'style', href, media } : { kind: 'style', href };
}

export function resolveRadiantSsrStyleAssets(...styles) {
	const resolvedAssets = [];

	for (const style of styles) {
		const resolvedAsset = Array.isArray(style)
			? resolveRadiantSsrStyleAsset(style[0], style[1])
			: resolveRadiantSsrStyleAsset(style);

		if (resolvedAsset) {
			resolvedAssets.push(resolvedAsset);
		}
	}

	return resolvedAssets;
}

function normalizeRadiantAssetSource(source) {
	const normalizedSource = String(source).replaceAll('\\\\', '/');

	if (normalizedSource.startsWith('/')) {
		return normalizedSource;
	}

	return normalizedSource.startsWith('./') ? normalizedSource.slice(1) : normalizedSource;
}
`;
}

/**
 * Generates the virtual module body for `virtual:radiant/app-load-mode`.
 *
 * Produces `resolveRadiantAppLoadMode`, which reads the rendering mode from the
 * configured request header and URL search param, falling back to `appLoadMode`.
 */
export function createAppLoadModeModule({
	appLoadMode,
	appLoadModeHeader,
	clientOnlySearchParam,
}: {
	appLoadMode: RadiantAppLoadMode;
	appLoadModeHeader: string;
	clientOnlySearchParam: string;
}): string {
	return `export const defaultRadiantAppLoadMode = ${JSON.stringify(appLoadMode)};
export const RADIANT_APP_LOAD_MODE_HEADER = ${JSON.stringify(appLoadModeHeader)};
export const RADIANT_CLIENT_ONLY_SEARCH_PARAM = ${JSON.stringify(clientOnlySearchParam)};

const truthyRadiantFlags = new Set(['1', 'true', 'yes', 'on']);

export function resolveRadiantAppLoadMode(request) {
	const url = resolveRadiantRequestUrl(request);
	const headerMode = normalizeRadiantAppLoadMode(readRadiantHeader(request, RADIANT_APP_LOAD_MODE_HEADER));

	if (headerMode) {
		return headerMode;
	}

	const clientOnlyFlag = url.searchParams.get(RADIANT_CLIENT_ONLY_SEARCH_PARAM);

	if (clientOnlyFlag && truthyRadiantFlags.has(clientOnlyFlag.toLowerCase())) {
		return 'client-only';
	}

	return defaultRadiantAppLoadMode;
}

function resolveRadiantRequestUrl(request) {
	if (request instanceof URL) {
		return request;
	}

	if (typeof request === 'string') {
		return new URL(request, 'http://radiant.local');
	}

	if (request && typeof request.url === 'string') {
		return new URL(request.url, 'http://radiant.local');
	}

	return new URL('http://radiant.local');
}

function readRadiantHeader(request, headerName) {
	const headers = request && typeof request === 'object' ? request.headers : undefined;

	if (!headers) {
		return undefined;
	}

	if (typeof headers.get === 'function') {
		return headers.get(headerName);
	}

	if (typeof headers === 'object') {
		const directValue = headers[headerName] ?? headers[headerName.toLowerCase()];
		return Array.isArray(directValue) ? directValue[0] : directValue;
	}

	return undefined;
}

function normalizeRadiantAppLoadMode(value) {
	if (!value) {
		return undefined;
	}

	const normalizedValue = String(value).toLowerCase();

	if (normalizedValue === 'client-only') {
		return 'client-only';
	}

	if (normalizedValue === 'ssr') {
		return 'ssr';
	}

	if (truthyRadiantFlags.has(normalizedValue)) {
		return 'client-only';
	}

	return undefined;
}
`;
}

export function joinComponentGlob(componentDirectory: string, include: string): string {
	return posix.join('/', componentDirectory, include);
}

export function normalizeComponentDirectory(componentDirectory: string): string {
	return componentDirectory.replace(/^\/+|\/+$/g, '');
}

export function normalizeInclude(include: string): string {
	return include.replace(/^\/+/, '');
}

export function normalizeAppLoadMode(appLoadMode: RadiantAppLoadMode): RadiantAppLoadMode {
	return appLoadMode === 'client-only' ? 'client-only' : 'ssr';
}
