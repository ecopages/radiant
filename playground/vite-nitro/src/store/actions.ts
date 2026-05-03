import type { RenderedComponentPayload } from '@ecopages/radiant/server/render-component';
import { type RenderedComponentAsset } from '@ecopages/radiant/server/render-component';
import {
	RADIANT_FRAGMENT_ASSETS_HEADER,
	RADIANT_FRAGMENT_GENERATED_AT_HEADER,
	RADIANT_FRAGMENT_HEADER,
} from '../../vite-plugin-radiant/nitro/fragment-transport';
import { ensureRadiantAssets } from '../../vite-plugin-radiant/runtime/client-assets';
import type { AppState } from './store';

export const DEFAULT_SSR_ENDPOINT = '/api/ssr/radiant-counter';

export async function loadServerMessage(store: AppState) {
	if (store.status === 'loading') {
		return;
	}

	store.status = 'loading';
	store.message = 'Calling Nitro...';

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

		store.status = 'ready';
		store.message = `${payload.message} via ${payload.runtime}`;
		store.serverTime = payload.generatedAt;
	} catch (error) {
		store.status = 'error';
		store.message = error instanceof Error ? error.message : 'Unknown error';
		store.serverTime = 'n/a';
	}
}

export async function loadSsrMarkup(store: AppState, endpoint = DEFAULT_SSR_ENDPOINT) {
	if (store.ssrStatus === 'loading') {
		return;
	}

	store.ssrStatus = 'loading';
	store.ssrLoadingEndpoint = endpoint;

	try {
		applyRenderedPayload(store, await requestRenderedComponent(endpoint));
	} catch (error) {
		store.ssrAssets = [];
		store.ssrGeneratedAt = 'n/a';
		store.ssrLoadingEndpoint = '';
		store.ssrMarkup = error instanceof Error ? error.message : 'Unknown error';
		store.ssrStatus = 'error';
	}
}

export async function requestRenderedComponent(endpoint: string): Promise<RenderedComponentPayload> {
	const response = await fetch(endpoint);

	if (!response.ok) {
		throw new Error(`Request failed with ${response.status}`);
	}

	const markup = await response.text();
	const isFragment = response.headers.get(RADIANT_FRAGMENT_HEADER) === '1';
	const tagName = extractTagNameFromMarkup(markup);
	const assets = isFragment ? readRenderedAssets(response.headers.get(RADIANT_FRAGMENT_ASSETS_HEADER)) : [];

	if (isFragment) {
		await ensureFragmentAssets(tagName, assets);
	}

	return {
		assets,
		generatedAt: response.headers.get(RADIANT_FRAGMENT_GENERATED_AT_HEADER) ?? 'n/a',
		markup,
		tagName,
	};
}

export function createClientPreview(store: { ssrMarkup: string; ssrStatus: string }) {
	if (store.ssrStatus === 'error') {
		return store.ssrMarkup || 'Unknown error';
	}

	return createMarkupPreview(store.ssrMarkup) ?? 'No SSR markup loaded yet.';
}

function applyRenderedPayload(store: AppState, payload: RenderedComponentPayload) {
	store.ssrAssets = payload.assets ?? [];
	store.ssrGeneratedAt = payload.generatedAt;
	store.ssrLoadingEndpoint = '';
	store.ssrMarkup = payload.markup;
	store.ssrStatus = 'ready';
	store.ssrTagName = payload.tagName;
}

function extractTagNameFromMarkup(markup: string): string {
	const template = document.createElement('template');
	template.innerHTML = markup.trim();
	return template.content.firstElementChild?.tagName.toLowerCase() ?? 'unknown';
}

function createMarkupPreview(markup: string) {
	if (!markup) {
		return undefined;
	}

	const template = document.createElement('template');
	template.innerHTML = markup;
	return Array.from(template.content.childNodes);
}

function readRenderedAssets(serializedAssets: string | null) {
	if (serializedAssets) {
		return JSON.parse(serializedAssets) as RenderedComponentAsset[];
	}

	return [];
}

async function ensureFragmentAssets(tagName: string, assets: readonly RenderedComponentAsset[]) {
	await ensureRadiantAssets({
		assets,
		usage: tagName.includes('-') ? { customElementTagNames: [tagName] } : undefined,
	});
}
