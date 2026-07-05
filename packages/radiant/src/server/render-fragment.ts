import type {
	RenderedComponent,
	RenderedComponentPayload,
	RenderedComponentWithPreview,
} from './render-component';

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
