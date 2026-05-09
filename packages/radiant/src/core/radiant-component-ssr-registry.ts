import type { JsxRenderable } from '@ecopages/jsx';
import type { RenderToStringOptions } from '@ecopages/jsx/server';

/**
 * Optional SSR hooks exposed by `RadiantElement` instances to the shared
 * server runtime.
 *
 * The bridge lets the runtime detect whether a component is still using the
 * inherited host SSR implementation or has taken ownership of host rendering
 * through explicit overrides.
 */
export type RadiantElementRenderBridge = {
	renderHost?: () => JsxRenderable;
	renderHostToString?: (options?: RenderToStringOptions) => string;
};

/**
 * Runtime shape required by the shared Radiant SSR helpers.
 *
 * This is intentionally narrower than `RadiantElement` itself so the server
 * runtime can stay decoupled from the full client base-class implementation.
 */
export type RadiantElementSsrCapable = {
	resolveSsrRenderBridge?: () => RadiantElementRenderBridge;
	getHostSsrAttributes?: () => Record<string, string>;
	renderToString(options?: RenderToStringOptions): string;
	renderHost?(): JsxRenderable;
	renderHostToString(options?: RenderToStringOptions): string;
};

/**
 * Shared SSR runtime contract registered on `globalThis`.
 *
 * Server entrypoints install one implementation that both direct component SSR
 * and nested JSX custom-element SSR can reuse without importing client-only
 * internals into every call site.
 */
export type RadiantElementSsrRuntime = {
	getHostAttributes(component: RadiantElementSsrCapable): Record<string, string>;
	renderHost(component: RadiantElementSsrCapable): JsxRenderable;
	renderHostToString(component: RadiantElementSsrCapable, options?: RenderToStringOptions): string;
	resolveRenderBridge(component: RadiantElementSsrCapable): RadiantElementRenderBridge | undefined;
	renderView(component: RadiantElementSsrCapable, options?: RenderToStringOptions): string;
};

const RADIANT_COMPONENT_SSR_RUNTIME_SYMBOL = Symbol.for('@ecopages/radiant.component-ssr-runtime');

type GlobalSsrRuntimeState = typeof globalThis & {
	[RADIANT_COMPONENT_SSR_RUNTIME_SYMBOL]?: RadiantElementSsrRuntime;
};

/**
 * Reads the currently registered Radiant SSR runtime from `globalThis`.
 *
 * Returns `undefined` when no server entrypoint has installed the runtime yet.
 */
export function getRadiantElementSsrRuntime(): RadiantElementSsrRuntime | undefined {
	return (globalThis as GlobalSsrRuntimeState)[RADIANT_COMPONENT_SSR_RUNTIME_SYMBOL];
}

/**
 * Registers the shared Radiant SSR runtime on `globalThis`.
 *
 * The latest registration wins, which keeps server adapters free to install
 * the runtime eagerly from their own explicit entrypoint.
 */
export function registerRadiantElementSsrRuntime(runtime: RadiantElementSsrRuntime): void {
	(globalThis as GlobalSsrRuntimeState)[RADIANT_COMPONENT_SSR_RUNTIME_SYMBOL] = runtime;
}
