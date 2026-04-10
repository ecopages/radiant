import { posix } from 'node:path';

export type RadiantAppLoadMode = 'ssr' | 'client-only';

export function createComponentsModule(componentGlob: string): string {
	return `import.meta.glob(${JSON.stringify(componentGlob)}, { eager: true });
`;
}

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

export function createSsrRegistryModule(componentGlob: string): string {
	return `const radiantComponentModules = import.meta.glob(${JSON.stringify(componentGlob)}, { eager: true });
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
