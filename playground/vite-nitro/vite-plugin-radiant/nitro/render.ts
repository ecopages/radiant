import '@ecopages/radiant/server/install-light-dom-shim';
import {
	renderComponent,
	type RenderComponentCallOptions,
	type RenderedComponentAsset,
	type RenderedComponent,
	type RenderedComponentMetadata,
	type RenderedComponentPayload,
	type RenderedComponentWithPreview,
	type ServerRenderableComponent,
	type ServerRenderableComponentConstructor,
} from '@ecopages/radiant/server/render-component';
import {
	renderController,
	type RenderControllerCallOptions,
	type ServerRenderableControllerConstructor,
} from '@ecopages/radiant/server/render-controller';
import type { RadiantController } from '@ecopages/radiant';
import { resolveRadiantSsrAssets } from 'virtual:radiant/ssr-asset-registry';
import { createRadiantFragmentHeaders } from './fragment-transport';

type StringKeyOf<T> = Extract<keyof T, string>;

type RenderSsrComponentProps<T extends object> = Partial<{
	[Key in StringKeyOf<T> as T[Key] extends (...args: any[]) => any ? never : Key]: T[Key];
}>;

export type RenderSsrComponentOptions<T extends ServerRenderableComponent> = Omit<
	RenderComponentCallOptions<T>,
	'initialize' | 'resolveClientModuleSrc'
> & {
	initialize?: RenderComponentCallOptions<T>['initialize'];
	props?: RenderSsrComponentProps<T>;
};

export async function renderSsrComponent<T extends ServerRenderableComponent>(
	component: ServerRenderableComponentConstructor<T>,
	options: RenderSsrComponentOptions<T> = {},
): Promise<RenderedComponent> {
	const { assets, initialize, props, resolveAssets, ...renderOptions } = options;

	return renderComponent(component, {
		...renderOptions,
		initialize: (instance) => {
			if (props) {
				Object.assign(instance, props);
			}
			initialize?.(instance);
		},
		resolveAssets: async (target): Promise<readonly RenderedComponentAsset[]> => {
			return mergeRenderedComponentAssets(await resolveRadiantSsrAssets(target), [
				...(assets ?? []),
				...((await resolveAssets?.(target)) ?? []),
			]);
		},
	});
}

function mergeRenderedComponentAssets(
	explicitAssets: readonly RenderedComponentAsset[],
	resolvedAssets: readonly RenderedComponentAsset[],
): readonly RenderedComponentAsset[] {
	const mergedAssets: RenderedComponentAsset[] = [];
	const seenAssetKeys = new Set<string>();

	for (const asset of [...explicitAssets, ...resolvedAssets]) {
		const assetKey =
			asset.kind === 'script-module'
				? `${asset.kind}:${asset.stage ?? 'hydrate'}:${asset.src}`
				: asset.kind === 'modulepreload'
					? `${asset.kind}:${asset.href}`
					: `${asset.kind}:${asset.href}:${asset.media ?? ''}`;

		if (seenAssetKeys.has(assetKey)) {
			continue;
		}

		seenAssetKeys.add(assetKey);
		mergedAssets.push(asset);
	}

	return mergedAssets;
}

export function createSsrResponse(
	rendered: RenderedComponent | RenderedComponentPayload | RenderedComponentWithPreview,
	headers?: HeadersInit,
): Response {
	return createSsrFragmentResponse(rendered, headers);
}

export function createSsrFragmentResponse(
	rendered: RenderedComponent | RenderedComponentMetadata | RenderedComponentPayload | RenderedComponentWithPreview,
	headers?: HeadersInit,
): Response {
	const markup = 'markup' in rendered ? rendered.markup : '';

	return new Response(markup, {
		headers: {
			'content-type': 'text/html; charset=utf-8',
			...createRadiantFragmentHeaders(rendered),
			...Object.fromEntries(new Headers(headers).entries()),
		},
	});
}

export async function renderSsrComponentResponse<T extends ServerRenderableComponent>(
	component: ServerRenderableComponentConstructor<T>,
	options: RenderSsrComponentOptions<T> = {},
	headers?: HeadersInit,
): Promise<Response> {
	return createSsrFragmentResponse(await renderSsrComponent(component, options), headers);
}

export async function renderSsrControllerResponse<T extends RadiantController>(
	controller: ServerRenderableControllerConstructor<T>,
	options: RenderControllerCallOptions<T>,
	headers?: HeadersInit,
): Promise<Response> {
	return createSsrFragmentResponse(await renderController(controller, options), headers);
}
