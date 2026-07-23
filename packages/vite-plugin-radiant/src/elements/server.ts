export function createComponentsModule(componentGlob: string | string[]): string {
	return `import.meta.glob(${serializeGlob(componentGlob)}, { eager: true });
`;
}

export function createSsrRegistryModule(componentGlob: string | string[], metadataQuery: string): string {
	return `const CUSTOM_ELEMENT_TAG_NAME = Symbol.for('@ecopages/radiant.customElementTagName');

const radiantDomModuleMetadata = import.meta.glob(${serializeGlob(componentGlob)}, {
	eager: true,
	import: 'default',
	query: ${JSON.stringify(`?${metadataQuery}`)},
});
const radiantClientModuleKeyCache = new WeakMap();
const radiantElementModuleKeys = new Map();
const radiantControllerModuleKeys = new Map();

for (const [moduleKey, metadata] of Object.entries(radiantDomModuleMetadata)) {
	for (const tagName of metadata.customElementTagNames ?? []) {
		radiantElementModuleKeys.set(String(tagName).toLowerCase(), moduleKey);
	}

	for (const identifier of metadata.controllerIdentifiers ?? []) {
		radiantControllerModuleKeys.set(identifier, moduleKey);
	}
}

export function resolveRadiantSsrClientModuleKeyByTagName(tagName) {
	return radiantElementModuleKeys.get(String(tagName).toLowerCase());
}

export function resolveRadiantSsrClientModuleKeyByControllerIdentifier(identifier) {
	return radiantControllerModuleKeys.get(String(identifier));
}

export async function resolveRadiantSsrClientModuleKey(component) {
	const cachedModuleKey = radiantClientModuleKeyCache.get(component);

	if (cachedModuleKey) {
		return cachedModuleKey;
	}

	const tagName = component?.[CUSTOM_ELEMENT_TAG_NAME];

	if (typeof tagName === 'string') {
		const moduleKey = resolveRadiantSsrClientModuleKeyByTagName(tagName);

		if (moduleKey) {
			radiantClientModuleKeyCache.set(component, moduleKey);
			return moduleKey;
		}
	}

	return undefined;
}
`;
}

export function createSsrAssetRegistryModule(styleGlob: string | string[]): string {
	return `import {
	resolveRadiantSsrClientModuleKey,
	resolveRadiantSsrClientModuleKeyByControllerIdentifier,
	resolveRadiantSsrClientModuleKeyByTagName,
} from 'virtual:radiant/ssr-client-module-registry';

const radiantStyleAssetUrls = import.meta.glob(${serializeGlob(styleGlob)}, { eager: true, import: 'default', query: '?url' });

export async function resolveRadiantSsrAssets(component) {
	const moduleKey = await resolveRadiantSsrClientModuleKey(component);

	return createRadiantSsrScriptAssets(moduleKey);
}

export async function resolveRadiantSsrAssetsForCustomElementTag(tagName) {
	return createRadiantSsrScriptAssets(resolveRadiantSsrClientModuleKeyByTagName(tagName));
}

export async function resolveRadiantSsrAssetsForControllerIdentifier(identifier) {
	return createRadiantSsrScriptAssets(resolveRadiantSsrClientModuleKeyByControllerIdentifier(identifier));
}

export async function resolveRadiantDocumentAssets(documentUsage = {}) {
	const resolvedAssets = [];
	const seenAssetKeys = new Set();

	for (const tagName of documentUsage.customElementTagNames ?? []) {
		appendUniqueRadiantAssets(
			resolvedAssets,
			await resolveRadiantSsrAssetsForCustomElementTag(tagName),
			seenAssetKeys,
		);
	}

	for (const identifier of documentUsage.controllerIdentifiers ?? []) {
		appendUniqueRadiantAssets(
			resolvedAssets,
			await resolveRadiantSsrAssetsForControllerIdentifier(identifier),
			seenAssetKeys,
		);
	}

	return resolvedAssets;
	}

function createRadiantSsrScriptAssets(moduleKey) {
	if (!moduleKey) {
		return [];
	}

	return [{ kind: 'script-module', src: moduleKey, stage: 'hydrate' }];
}

function appendUniqueRadiantAssets(target, assets, seenAssetKeys) {
	for (const asset of assets) {
		const assetKey =
			asset.kind === 'script-module'
				? asset.kind + ':' + (asset.stage ?? 'hydrate') + ':' + asset.src
				: asset.kind === 'modulepreload'
					? asset.kind + ':' + asset.href
					: asset.kind + ':' + asset.href + ':' + (asset.media ?? '');

		if (seenAssetKeys.has(assetKey)) {
			continue;
		}

		seenAssetKeys.add(assetKey);
		target.push(asset);
	}
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

function serializeGlob(pattern: string | string[]): string {
	return JSON.stringify(pattern);
}
