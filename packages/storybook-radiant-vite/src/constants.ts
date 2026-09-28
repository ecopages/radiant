/** Shared constants for the Radiant Storybook SSR bridge. */
export const RADIANT_SSR_ENDPOINT = '/__radiant_ssr';

export const ROOT_INNER_ID = 'root-inner';

export const SSR_MOUNT_ID = 'radiant-ssr-mount';

export const CUSTOM_ELEMENT_TAG_NAME = Symbol.for('@ecopages/radiant.customElementTagName');

export type RadiantSsrRequestBody = {
	kind?: 'host' | 'jsx';
	/** Hint path for the Radiant `.script` module. Resolved on the server when missing or stale. */
	ssrModule?: string;
	ssrExport?: string;
	viewModule?: string;
	viewExport?: string;
	storyModule?: string;
	storyExport?: string;
	args?: Record<string, unknown>;
	mode?: 'hydrate' | 'plain';
};

export type RadiantSsrAsset = {
	kind: 'script-module' | 'modulepreload' | 'style';
	src?: string;
	href?: string;
	stage?: string;
	media?: string;
};

export type RadiantSsrResponseBody = {
	markup: string;
	tagName?: string;
	assets: readonly RadiantSsrAsset[];
	clientModuleSrc?: string;
	generatedAt?: string;
	error?: string;
};
