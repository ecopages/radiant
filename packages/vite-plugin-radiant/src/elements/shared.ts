import { posix } from 'node:path';
import picomatch from 'picomatch';

export type RadiantAppLoadMode = 'ssr' | 'client-only';

export const RADIANT_DOM_METADATA_QUERY = 'radiant-dom-metadata';

export const RADIANT_VIRTUAL_MODULES = {
	appLoadMode: 'virtual:radiant/app-load-mode',
	clientRegistry: 'virtual:radiant/client-module-registry',
	components: 'virtual:radiant/components',
	domRegistry: 'virtual:radiant/dom-module-registry',
	ssrAssetRegistry: 'virtual:radiant/ssr-asset-registry',
	ssrRegistry: 'virtual:radiant/ssr-client-module-registry',
} as const;

export type RadiantVirtualModuleName = keyof typeof RADIANT_VIRTUAL_MODULES;
export type RadiantVirtualModuleId = (typeof RADIANT_VIRTUAL_MODULES)[RadiantVirtualModuleName];

const resolvedRadiantVirtualModules = Object.fromEntries(
	Object.entries(RADIANT_VIRTUAL_MODULES).map(([name, id]) => [name, `\0${id}`]),
) as Record<RadiantVirtualModuleName, `\0${RadiantVirtualModuleId}`>;

const radiantVirtualModuleIdLookup = new Map<RadiantVirtualModuleId, `\0${RadiantVirtualModuleId}`>(
	Object.values(RADIANT_VIRTUAL_MODULES).map((id) => [id, `\0${id}`]),
);

export function getResolvedRadiantVirtualModule(name: RadiantVirtualModuleName): `\0${RadiantVirtualModuleId}` {
	return resolvedRadiantVirtualModules[name];
}

export function resolveRadiantVirtualModuleId(source: string): `\0${RadiantVirtualModuleId}` | undefined {
	return radiantVirtualModuleIdLookup.get(source as RadiantVirtualModuleId);
}

export function listResolvedRadiantVirtualModules(): readonly `\0${RadiantVirtualModuleId}`[] {
	return Object.values(resolvedRadiantVirtualModules);
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

export function normalizeComponentDirectory(componentDirectory: string): string {
	return componentDirectory.replace(/^\/+|\/+$/g, '');
}

export function normalizeInclude(include: string | string[]): string[] {
	const patterns = Array.isArray(include) ? include : [include];
	return patterns.map((pattern) => pattern.replace(/^\/+/, ''));
}

export function joinComponentGlobs(componentDirectory: string, includes: string[]): string | string[] {
	const globs = includes.map((include) => posix.join('/', componentDirectory, include));
	return globs.length === 1 ? globs[0]! : globs;
}

export function joinStyleGlobs(componentDirectory: string, styles: string | string[]): string | string[] {
	const patterns = Array.isArray(styles) ? styles : [styles];
	const globs = patterns.map((style) => posix.join('/', componentDirectory, style));
	return globs.length === 1 ? globs[0]! : globs;
}

export function serializeGlobPattern(pattern: string | string[]): string {
	return JSON.stringify(pattern);
}

export function normalizeAppLoadMode(appLoadMode: RadiantAppLoadMode): RadiantAppLoadMode {
	return appLoadMode === 'client-only' ? 'client-only' : 'ssr';
}

export function createComponentFileMatcher(
	rootDirectory: string,
	componentDirectory: string,
	includes: string[],
): (filePath: string) => boolean {
	const componentRoot = posix.join(rootDirectory, componentDirectory);
	const matchers = includes.map((include) =>
		picomatch(include, {
			dot: true,
			nocase: false,
		}),
	);

	return (filePath: string) => {
		if (!filePath.startsWith(componentRoot)) {
			return false;
		}

		const relativePath = posix.relative(componentRoot, filePath);
		return matchers.some((matcher) => matcher(relativePath));
	};
}

export function createComponentStyleFileMatcher(
	rootDirectory: string,
	componentDirectory: string,
	styles: string | string[],
): (filePath: string) => boolean {
	const componentRoot = posix.join(rootDirectory, componentDirectory);
	const patterns = Array.isArray(styles) ? styles : [styles];
	const matchers = patterns.map((pattern) =>
		picomatch(pattern.replace(/^\/+/, ''), {
			dot: true,
			nocase: false,
		}),
	);

	return (filePath: string) => {
		if (!filePath.startsWith(componentRoot)) {
			return false;
		}

		const relativePath = posix.relative(componentRoot, filePath);
		return matchers.some((matcher) => matcher(relativePath));
	};
}
