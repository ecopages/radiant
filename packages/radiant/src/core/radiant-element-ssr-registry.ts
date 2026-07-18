import type { JsxRenderable } from '@ecopages/jsx';
import type { InternalRadiantSsrHost } from './radiant-element-ssr-host';

/** Core-local render options so client code never imports `@ecopages/jsx/server`. */
export type RadiantElementRenderToStringOptions = {
	hydrate?: boolean;
	mode?: 'plain' | 'hydrate';
};

export type RadiantElementRenderBridge = {
	renderHost?: () => JsxRenderable;
	renderHostToString?: (options?: RadiantElementRenderToStringOptions) => string;
};

export type RadiantElementServerRenderSsrCapable = Omit<InternalRadiantSsrHost, 'constructor'> & {
	constructor: Function;
};

export type RadiantElementTrackedRenderSsrCapable = RadiantElementServerRenderSsrCapable;

export type RadiantElementSsrRuntime = {
	getHostAttributes(component: InternalRadiantSsrHost): Record<string, string>;
	renderHost(component: InternalRadiantSsrHost): JsxRenderable;
	renderHostToString(component: InternalRadiantSsrHost, options?: RadiantElementRenderToStringOptions): string;
	resolveRenderBridge(component: object): RadiantElementRenderBridge | undefined;
	renderView(component: InternalRadiantSsrHost, options?: RadiantElementRenderToStringOptions): string;
};

/** JSX SSR scope adapters installed by the server layer into client-safe core. */
export type RadiantElementSsrScopeAdapters = {
	get<T>(key: symbol): T | undefined;
	withValue<TValue, T>(key: symbol, value: TValue, render: () => T): T;
};

const RADIANT_ELEMENT_SSR_RUNTIME_SYMBOL = Symbol.for('@ecopages/radiant.element-ssr-runtime');

let scopeAdapters: RadiantElementSsrScopeAdapters | undefined;

/**
 * Called once from Radiant server SSR modules; client bundles never install this.
 * Module-local: SSR bundlers must resolve one `@ecopages/radiant` instance (do not inline duplicates).
 */
export function installRadiantElementSsrScopeAdapters(adapters: RadiantElementSsrScopeAdapters): void {
	scopeAdapters = adapters;
}

export function getRadiantElementSsrRuntime(): RadiantElementSsrRuntime | undefined {
	return scopeAdapters?.get<RadiantElementSsrRuntime>(RADIANT_ELEMENT_SSR_RUNTIME_SYMBOL);
}

export function withRadiantElementSsrRuntime<T>(runtime: RadiantElementSsrRuntime, render: () => T): T {
	if (!scopeAdapters) {
		throw new Error(
			'Radiant element SSR runtime requires the server scope adapters. Import a Radiant server SSR entrypoint before rendering.',
		);
	}

	if (scopeAdapters.get<RadiantElementSsrRuntime>(RADIANT_ELEMENT_SSR_RUNTIME_SYMBOL) === runtime) {
		return render();
	}

	return scopeAdapters.withValue(RADIANT_ELEMENT_SSR_RUNTIME_SYMBOL, runtime, render);
}
