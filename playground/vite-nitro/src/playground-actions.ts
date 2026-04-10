import type { RenderedComponentPayload } from '@ecopages/radiant/server/render-component';
import {
	RENDERED_COMPONENT_CLIENT_MODULE_HEADER,
	RENDERED_COMPONENT_GENERATED_AT_HEADER,
	RENDERED_COMPONENT_TAG_NAME_HEADER,
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

	try {
		const payload = await requestRenderedComponent(endpoint);

		state.ssrStatus = 'ready';
		state.ssrGeneratedAt = payload.generatedAt;
		state.ssrMarkup = payload.markup;
		state.ssrTagName = payload.tagName;
	} catch (error) {
		state.ssrStatus = 'error';
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
	await ensureFragmentClientModule(tagName, response.headers.get(RENDERED_COMPONENT_CLIENT_MODULE_HEADER));

	return {
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

async function ensureFragmentClientModule(tagName: string, clientModuleKey: string | null) {
	if (customElements.get(tagName)) {
		return;
	}

	if (!clientModuleKey) {
		throw new Error(`Missing fragment client module for ${tagName}.`);
	}

	await loadRadiantClientModule(clientModuleKey);

	if (!customElements.get(tagName)) {
		throw new Error(`Client module ${clientModuleKey} did not register ${tagName}.`);
	}

	await customElements.whenDefined(tagName);
}
