/// <reference types="vite/client" />

declare module 'virtual:radiant/client-module-registry' {
	export function hasRadiantClientModule(moduleKey: string): boolean;
	export function loadRadiantClientModule(moduleKey: string): Promise<Record<string, unknown>>;
}

declare module 'virtual:radiant/ssr-client-module-registry' {
	import type {
		ServerRenderableComponent,
		ServerRenderableComponentConstructor,
	} from '@ecopages/radiant/server/render-component';

	export function resolveRadiantSsrClientModuleKey<TComponent extends ServerRenderableComponent>(
		component: ServerRenderableComponentConstructor<TComponent>,
	): Promise<string | undefined>;
}

declare module 'virtual:radiant/app-load-mode' {
	export type RadiantAppLoadMode = 'ssr' | 'client-only';
	export const defaultRadiantAppLoadMode: RadiantAppLoadMode;
	export const RADIANT_APP_LOAD_MODE_HEADER: string;
	export const RADIANT_CLIENT_ONLY_SEARCH_PARAM: string;
	export function resolveRadiantAppLoadMode(request: Request | URL | string): RadiantAppLoadMode;
}
