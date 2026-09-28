/// <reference types="vite/client" />

declare module 'virtual:radiant/components' {}

declare module 'virtual:radiant/client-module-registry' {
	export function hasRadiantClientModule(moduleKey: string): boolean;
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

	export function resolveRadiantSsrAssetUrl(source: string): string | undefined;

	export function resolveRadiantSsrStyleAsset(
		source: string,
		media?: string,
	): Extract<RenderedComponentAsset, { kind: 'style' }> | undefined;

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
