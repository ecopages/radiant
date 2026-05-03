import type { JsxRenderable } from '@ecopages/jsx';
import type { RenderToStringOptions } from '@ecopages/jsx/server';

/**
 * Optional SSR hooks exposed by `RadiantComponent` instances to the shared
 * server runtime.
 *
 * The bridge lets the runtime detect whether a component is still using the
 * inherited host SSR implementation or has taken ownership of host rendering
 * through explicit overrides.
 */
export type RadiantComponentRenderBridge = {
	renderHost?: () => JsxRenderable;
	renderHostToString?: (options?: RenderToStringOptions) => string;
};

/**
 * Runtime shape required by the shared Radiant SSR helpers.
 *
 * This is intentionally narrower than `RadiantComponent` itself so the server
 * runtime can stay decoupled from the full client base-class implementation.
 */
export type RadiantComponentSsrCapable = HTMLElement & {
	resolveSsrRenderBridge?: () => RadiantComponentRenderBridge;
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
export type RadiantComponentSsrRuntime = {
	getHostAttributes(component: RadiantComponentSsrCapable): Record<string, string>;
	renderHost(component: RadiantComponentSsrCapable): JsxRenderable;
	renderHostToString(component: RadiantComponentSsrCapable, options?: RenderToStringOptions): string;
	resolveRenderBridge(component: RadiantComponentSsrCapable): RadiantComponentRenderBridge | undefined;
	renderView(component: RadiantComponentSsrCapable, options?: RenderToStringOptions): string;
};

const RADIANT_COMPONENT_SSR_RUNTIME_SYMBOL = Symbol.for('@ecopages/radiant.component-ssr-runtime');

type GlobalSsrRuntimeState = typeof globalThis & {
	[RADIANT_COMPONENT_SSR_RUNTIME_SYMBOL]?: RadiantComponentSsrRuntime;
};

/**
 * Reads the currently registered Radiant SSR runtime from `globalThis`.
 *
 * Returns `undefined` when no server entrypoint has installed the runtime yet.
 */
export function getRadiantComponentSsrRuntime(): RadiantComponentSsrRuntime | undefined {
	return (globalThis as GlobalSsrRuntimeState)[RADIANT_COMPONENT_SSR_RUNTIME_SYMBOL];
}

/**
 * Registers the shared Radiant SSR runtime on `globalThis`.
 *
 * The latest registration wins, which keeps server adapters free to install
 * the runtime eagerly from their own explicit entrypoint.
 */
export function registerRadiantComponentSsrRuntime(runtime: RadiantComponentSsrRuntime): void {
	(globalThis as GlobalSsrRuntimeState)[RADIANT_COMPONENT_SSR_RUNTIME_SYMBOL] = runtime;
}
