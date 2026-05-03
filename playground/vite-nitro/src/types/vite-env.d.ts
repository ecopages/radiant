/// <reference types="vite/client" />

declare module 'virtual:radiant/components' {}

declare module 'virtual:radiant/client-module-registry' {
	/**
	 * Returns `true` when the Vite module map contains an entry for `moduleKey`.
	 * Call before `loadRadiantClientModule` to avoid throwing on unknown keys.
	 */
	export function hasRadiantClientModule(moduleKey: string): boolean;

	/**
	 * Lazily imports the client entry module identified by `moduleKey`.
	 * Throws when `moduleKey` is not present in the Vite module map.
	 */
	export function loadRadiantClientModule(moduleKey: string): Promise<Record<string, unknown>>;
}

declare module 'virtual:radiant/dom-module-registry' {
	export function resolveRadiantElementModuleKey(tagName: string): string | undefined;
	export function resolveRadiantControllerModuleKey(identifier: string): string | undefined;
	export function loadRadiantDomModules(root?: ParentNode): Promise<string[]>;
}

declare module 'virtual:radiant/ssr-client-module-registry' {
	import type {
		ServerRenderableComponent,
		ServerRenderableComponentConstructor,
	} from '@ecopages/radiant/server/render-component';

	/**
	 * Resolves the Vite-normalized source path for the module file that exports `component`.
	 *
	 * The returned string is the browser-importable client entry key that Vite emits into
	 * the asset graph. Returns `undefined` when the constructor is not found in the SSR
	 * module glob. Results are memoized in a `WeakMap` keyed on the constructor.
	 */
	export function resolveRadiantSsrClientModuleKey<TComponent extends ServerRenderableComponent>(
		component: ServerRenderableComponentConstructor<TComponent>,
	): Promise<string | undefined>;

	export function resolveRadiantSsrClientModuleKeyByTagName(tagName: string): string | undefined;
	export function resolveRadiantSsrClientModuleKeyByControllerIdentifier(identifier: string): string | undefined;
}

declare module 'virtual:radiant/ssr-asset-registry' {
	import type {
		RenderedComponentAsset,
		ServerRenderableComponent,
		ServerRenderableComponentConstructor,
	} from '@ecopages/radiant/server/render-component';

	/**
	 * Resolves the canonical `RenderedComponentAsset` list for a component constructor.
	 *
	 * Always includes a `script-module` asset pointing to the Vite-resolved client entry.
	 * Returns an empty array when the component is not found in the SSR module registry.
	 *
	 * Called automatically by the framework adapter in `vite-plugin-radiant/nitro/render.ts`. Routes do not
	 * need to call this directly unless bypassing the adapter layer.
	 */
	export function resolveRadiantSsrAssets<TComponent extends ServerRenderableComponent>(
		component: ServerRenderableComponentConstructor<TComponent>,
	): Promise<readonly RenderedComponentAsset[]>;

	export function resolveRadiantSsrAssetsForCustomElementTag(
		tagName: string,
	): Promise<readonly RenderedComponentAsset[]>;

	export function resolveRadiantSsrAssetsForControllerIdentifier(
		identifier: string,
	): Promise<readonly RenderedComponentAsset[]>;

	export function resolveRadiantDocumentAssets(documentUsage?: {
		customElementTagNames?: readonly string[];
		controllerIdentifiers?: readonly string[];
	}): Promise<readonly RenderedComponentAsset[]>;
	/**
	 * Returns the Vite-hashed, browser-importable URL for a component-colocated CSS file.
	 *
	 * Returns `undefined` when `source` is not covered by the style glob configured in the
	 * Vite plugin (`componentDirectory/**\/*.css`).
	 *
	 * @param source - Workspace-root-relative path, e.g. `/src/components/counter.css`.
	 *   A leading `./` is normalized automatically.
	 */
	export function resolveRadiantSsrAssetUrl(source: string): string | undefined;

	/**
	 * Resolves a single component-colocated CSS file into a `RenderedComponentAsset` of
	 * kind `'style'`.
	 *
	 * Returns `undefined` when the source path is not covered by the configured style glob,
	 * removing the need for conditional guards at the call site. Use the plural form
	 * `resolveRadiantSsrStyleAssets` when the `assets:` prop is the target.
	 *
	 * @param source - Workspace-root-relative path, e.g. `/src/components/counter.css`.
	 * @param media - Optional CSS media query applied to the resulting `<link>` element.
	 */
	export function resolveRadiantSsrStyleAsset(
		source: string,
		media?: string,
	): Extract<RenderedComponentAsset, { kind: 'style' }> | undefined;

	/**
	 * Resolves one or more component-colocated CSS files into a `RenderedComponentAsset[]`
	 * of kind `'style'`. Always returns a clean array safe to pass directly to `assets:`.
	 *
	 * Each argument is either a bare source path string or a `[source, media]` tuple.
	 * Entries whose source path is not covered by the configured style glob are silently
	 * omitted so the return value never contains `undefined`.
	 *
	 * @example
	 * ```ts
	 * assets: resolveRadiantSsrStyleAssets(
	 *   '/src/components/counter.css',
	 *   ['/src/components/counter-print.css', 'print'],
	 * ),
	 * ```
	 */
	export function resolveRadiantSsrStyleAssets(
		...styles: readonly (string | readonly [source: string, media: string])[]
	): readonly Extract<RenderedComponentAsset, { kind: 'style' }>[];
}

declare module 'virtual:radiant/app-load-mode' {
	export type RadiantAppLoadMode = 'ssr' | 'client-only';
	export const defaultRadiantAppLoadMode: RadiantAppLoadMode;
	export const RADIANT_APP_LOAD_MODE_HEADER: string;
	export const RADIANT_CLIENT_ONLY_SEARCH_PARAM: string;
	export function resolveRadiantAppLoadMode(request: Request | URL | string): RadiantAppLoadMode;
}
