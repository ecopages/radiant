import '@ecopages/radiant/server/install-light-dom-shim';
import {
	renderComponent,
	createRenderedComponentHeaders,
	type RenderComponentCallOptions,
	type RenderedComponentAsset,
	type RenderedComponent,
	type ServerRenderableComponent,
	type ServerRenderableComponentConstructor,
} from '@ecopages/radiant/server/render-component';
import { resolveRadiantSsrAssets } from 'virtual:radiant/ssr-asset-registry';
import '../src/components/radiant-counter.script';
import '../src/components/radiant-event-binding-lab.script';
import '../src/components/radiant-context-flow-shell.script';
import '../src/components/radiant-signal-release-board.script';
import '../src/components/radiant-slot-studio-board.script.tsx';

type StringKeyOf<T> = Extract<keyof T, string>;

/** Maps non-function own properties of a component instance to an optional partial for pre-render assignment. */
type RenderSsrComponentProps<T extends object> = Partial<{
	[Key in StringKeyOf<T> as T[Key] extends (...args: any[]) => any ? never : Key]: T[Key];
}>;

/**
 * Options for `renderSsrComponent`.
 *
 * Extends `RenderComponentCallOptions` but omits `resolveClientModuleSrc` (handled internally
 * by the framework adapter via `virtual:radiant/ssr-asset-registry`) and makes `initialize`
 * optional. The `props` shorthand assigns non-function component properties to the instance
 * before the SSR render executes.
 */
export type RenderSsrComponentOptions<T extends ServerRenderableComponent> = Omit<
	RenderComponentCallOptions<T>,
	'initialize' | 'resolveClientModuleSrc'
> & {
	initialize?: RenderComponentCallOptions<T>['initialize'];
	props?: RenderSsrComponentProps<T>;
};

/**
 * Framework-level SSR entry point for Radiant components in the Vite/Nitro adapter.
 *
 * Wraps `renderComponent` with two additions:
 * - `props` shorthand: non-function properties are assigned to the component instance before render.
 * - Asset merging: a `script-module` asset from `virtual:radiant/ssr-asset-registry` is merged
 *   with any `assets` and `resolveAssets` overrides supplied by the route, deduplicated by kind and key.
 */
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

/**
 * Merges two asset lists with deduplication by a content-derived key.
 *
 * `explicitAssets` are placed first; any asset in `resolvedAssets` whose key already
 * appears in `explicitAssets` is dropped. Key format: `kind:stage:src` for `script-module`,
 * `kind:href` for `modulepreload`, `kind:href:media` for `style`.
 */
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

/**
 * Wraps a `RenderedComponent` in a `Response` with the fragment HTML as the body and the
 * standard Radiant fragment headers (`x-radiant-tag-name`, `x-radiant-client-module`,
 * `x-radiant-assets`, `x-generated-at`) set via `createRenderedComponentHeaders`.
 */
export function createSsrResponse(rendered: RenderedComponent): Response {
	return new Response(rendered.markup, {
		headers: {
			'content-type': 'text/html; charset=utf-8',
			...createRenderedComponentHeaders(rendered.metadata),
		},
	});
}
