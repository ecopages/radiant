import type { RenderedComponentPayload } from '@ecopages/radiant/server/render-component';
import {
	RENDERED_COMPONENT_ASSETS_HEADER,
	RENDERED_COMPONENT_CLIENT_MODULE_HEADER,
	RENDERED_COMPONENT_GENERATED_AT_HEADER,
	RENDERED_COMPONENT_TAG_NAME_HEADER,
	type RenderedComponentAsset,
} from '@ecopages/radiant/server/render-component';
import { loadRadiantClientModule } from 'virtual:radiant/client-module-registry';
import type { PlaygroundState } from './playground-state';

export const DEFAULT_SSR_ENDPOINT = '/api/ssr/radiant-component';

export async function loadServerMessageIntoState(state: PlaygroundState) {
	if (state.status === 'loading') {
		return;
	}

	state.status = 'loading';
	state.message = 'Calling Nitro...';

	try {
		const response = await fetch('/api/hello');

		if (!response.ok) {
			throw new Error(`Request failed with ${response.status}`);
		}

		const payload = (await response.json()) as {
			message: string;
			runtime: string;
			generatedAt: string;
		};

		state.status = 'ready';
		state.message = `${payload.message} via ${payload.runtime}`;
		state.serverTime = payload.generatedAt;
	} catch (error) {
		state.status = 'error';
		state.message = error instanceof Error ? error.message : 'Unknown error';
		state.serverTime = 'n/a';
	}
}

export async function loadSsrMarkupIntoState(state: PlaygroundState, endpoint = DEFAULT_SSR_ENDPOINT) {
	if (state.ssrStatus === 'loading') {
		return;
	}

	state.ssrStatus = 'loading';
	state.ssrLoadingEndpoint = endpoint;

	try {
		const payload = await requestRenderedComponent(endpoint);

		state.ssrStatus = 'ready';
		state.ssrLoadingEndpoint = '';
		state.ssrAssets = payload.assets ?? [];
		state.ssrGeneratedAt = payload.generatedAt;
		state.ssrMarkup = payload.markup;
		state.ssrTagName = payload.tagName;
	} catch (error) {
		state.ssrAssets = [];
		state.ssrStatus = 'error';
		state.ssrLoadingEndpoint = '';
		state.ssrGeneratedAt = 'n/a';
		state.ssrMarkup = error instanceof Error ? error.message : 'Unknown error';
	}
}

export async function requestRenderedComponent(endpoint: string): Promise<RenderedComponentPayload> {
	const response = await fetch(endpoint);

	if (!response.ok) {
		throw new Error(`Request failed with ${response.status}`);
	}

	const markup = await response.text();
	const tagName = response.headers.get(RENDERED_COMPONENT_TAG_NAME_HEADER) ?? extractTagNameFromMarkup(markup);
	const assets = readRenderedComponentAssets(
		response.headers.get(RENDERED_COMPONENT_ASSETS_HEADER),
		response.headers.get(RENDERED_COMPONENT_CLIENT_MODULE_HEADER),
	);
	await ensureFragmentAssets(tagName, assets);

	return {
		assets,
		generatedAt: response.headers.get(RENDERED_COMPONENT_GENERATED_AT_HEADER) ?? 'n/a',
		markup,
		tagName,
	};
}

function extractTagNameFromMarkup(markup: string): string {
	const template = document.createElement('template');
	template.innerHTML = markup.trim();
	const firstElement = template.content.firstElementChild;

	return firstElement?.tagName.toLowerCase() ?? 'unknown';
}

export function createClientPreviewContent(state: { ssrMarkup: string; ssrStatus: string }) {
	if (state.ssrStatus === 'error') {
		return state.ssrMarkup || 'Unknown error';
	}

	return createMarkupPreviewContent(state.ssrMarkup) ?? 'No SSR markup loaded yet.';
}

function createMarkupPreviewContent(markup: string) {
	if (!markup) {
		return undefined;
	}

	const template = document.createElement('template');
	template.innerHTML = markup;
	return Array.from(template.content.childNodes);
}

function readRenderedComponentAssets(
	serializedAssets: string | null,
	legacyClientModuleKey: string | null,
): readonly RenderedComponentAsset[] {
	if (serializedAssets) {
		return JSON.parse(serializedAssets) as RenderedComponentAsset[];
	}

	if (!legacyClientModuleKey) {
		return [];
	}

	return [{ kind: 'script-module', src: legacyClientModuleKey, stage: 'hydrate' }];
}

async function ensureFragmentAssets(tagName: string, assets: readonly RenderedComponentAsset[]) {
	for (const asset of assets) {
		switch (asset.kind) {
			case 'script-module':
				if (!customElements.get(tagName)) {
					await loadRadiantClientModule(asset.src);
				}
				break;

			case 'modulepreload':
				ensureHeadLink('modulepreload', asset.href);
				break;

			case 'style':
				ensureStylesheet(asset.href, asset.media);
				break;
		}
	}

	if (!customElements.get(tagName)) {
		throw new Error(`Missing fragment client module for ${tagName}.`);
	}

	await customElements.whenDefined(tagName);
}

function ensureHeadLink(rel: string, href: string) {
	const head = document.head;
	if (head.querySelector(`link[rel="${CSS.escape(rel)}"][href="${CSS.escape(href)}"]`)) {
		return;
	}

	const link = document.createElement('link');
	link.rel = rel;
	link.href = href;
	head.append(link);
}

function ensureStylesheet(href: string, media?: string) {
	const head = document.head;
	const escapedHref = CSS.escape(href);
	const selector = media
		? `link[rel="stylesheet"][href="${escapedHref}"][media="${CSS.escape(media)}"]`
		: `link[rel="stylesheet"][href="${escapedHref}"]`;

	if (head.querySelector(selector)) {
		return;
	}

	const link = document.createElement('link');
	link.rel = 'stylesheet';
	link.href = href;
	if (media) {
		link.media = media;
	}
	head.append(link);
}
