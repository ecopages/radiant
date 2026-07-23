import type {
	RenderedComponent,
	RenderedComponentMetadata,
	RenderedComponentPayload,
	RenderedComponentWithPreview,
} from '@ecopages/radiant/server/render-component';
import {
	RADIANT_FRAGMENT_ASSETS_HEADER,
	RADIANT_FRAGMENT_GENERATED_AT_HEADER,
	RADIANT_FRAGMENT_HEADER,
} from './headers';

export {
	RADIANT_FRAGMENT_ASSETS_HEADER,
	RADIANT_FRAGMENT_GENERATED_AT_HEADER,
	RADIANT_FRAGMENT_HEADER,
} from './headers';

export function createRadiantFragmentHeaders(
	render: RenderedComponent | RenderedComponentMetadata | RenderedComponentPayload | RenderedComponentWithPreview,
): Record<string, string> {
	const metadata = toRenderedFragmentMetadata(render);

	return {
		[RADIANT_FRAGMENT_HEADER]: '1',
		...(metadata.assets.length > 0 ? { [RADIANT_FRAGMENT_ASSETS_HEADER]: JSON.stringify(metadata.assets) } : {}),
		[RADIANT_FRAGMENT_GENERATED_AT_HEADER]: metadata.generatedAt,
	};
}

function toRenderedFragmentMetadata(
	render: RenderedComponent | RenderedComponentMetadata | RenderedComponentPayload | RenderedComponentWithPreview,
): RenderedComponentMetadata {
	if ('metadata' in render) {
		return render.metadata;
	}

	if ('markup' in render) {
		return {
			assets: render.assets ?? [],
			clientModuleUrl: undefined,
			generatedAt: render.generatedAt,
			tagName: render.tagName,
		};
	}

	return render;
}
