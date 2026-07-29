import type { RenderToStringOptions } from '@ecopages/jsx/server';
import {
	scriptModuleAsset,
	type RenderedComponent,
	type RenderedComponentAsset,
	type RenderedComponentPayload,
	type RenderedComponentWithPreview,
} from './render-types';

/** Returns the current time for deterministic SSR metadata in tests. */
export function createDefaultRenderTimestamp(): Date {
	return new Date();
}

/** Converts a canonical render result into a flat transport payload. */
export function toRenderedComponentPayload(
	render: RenderedComponentWithPreview | RenderedComponent,
): RenderedComponentPayload {
	if ('metadata' in render) {
		return {
			assets: render.metadata.assets,
			clientModuleSrc: render.metadata.clientModuleUrl,
			generatedAt: render.metadata.generatedAt,
			markup: render.markup,
			tagName: render.metadata.tagName,
		};
	}

	const { preview: _preview, ...payload } = render;
	return payload;
}

/** Adds preview fields to a canonical render result. */
export function toRenderedComponentWithPreview(render: RenderedComponent): RenderedComponentWithPreview {
	return {
		assets: render.metadata.assets,
		clientModuleSrc: render.metadata.clientModuleUrl,
		generatedAt: render.metadata.generatedAt,
		markup: render.markup,
		preview: render.preview,
		tagName: render.metadata.tagName,
	};
}

export function mergeRenderedComponentAssets(
	assets: readonly RenderedComponentAsset[],
	clientModuleSrc: string | undefined,
): readonly RenderedComponentAsset[] {
	if (!clientModuleSrc) {
		return assets;
	}

	if (assets.some((asset) => asset.kind === 'script-module' && asset.src === clientModuleSrc)) {
		return assets;
	}

	return [scriptModuleAsset(clientModuleSrc), ...assets];
}

export function resolvePrimaryClientModuleSrc(assets: readonly RenderedComponentAsset[]): string | undefined {
	return assets.find((asset) => asset.kind === 'script-module')?.src;
}

export function normalizeRenderOptions(options: RenderToStringOptions | undefined): RenderToStringOptions {
	if (options?.mode !== undefined || options?.hydrate !== undefined) {
		return options;
	}

	return {
		...options,
		mode: 'hydrate',
	};
}
