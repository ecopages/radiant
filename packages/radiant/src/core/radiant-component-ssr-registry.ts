import type { JsxRenderable } from '@ecopages/jsx';
import type { RenderToStringOptions } from '@ecopages/jsx/server';

export type RadiantElementRenderBridge = {
	renderHost?: () => JsxRenderable;
	renderHostToString?: (options?: RenderToStringOptions) => string;
};

/**
 * SSR host shape used by explicit server rendering entrypoints.
 *
 * Server-side attribute serialization is derived from ordinary host state in
 * the server pipeline rather than through a dedicated host SSR hook.
 */
export type RadiantElementServerRenderSsrCapable = object;

/**
 * SSR host shape required when the server runtime renders the tracked component
 * view directly.
 */
export type RadiantElementTrackedRenderSsrCapable = object;

/**
 * Shared SSR runtime contract registered on `globalThis`.
 *
 * Server entrypoints install one implementation that both direct component SSR
 * and nested JSX custom-element SSR can reuse without importing client-only
 * internals into every call site.
 */
export type RadiantElementSsrRuntime = {
	getHostAttributes(component: RadiantElementServerRenderSsrCapable): Record<string, string>;
	renderHost(component: RadiantElementServerRenderSsrCapable): JsxRenderable;
	renderHostToString(component: RadiantElementServerRenderSsrCapable, options?: RenderToStringOptions): string;
	resolveRenderBridge(component: object): RadiantElementRenderBridge | undefined;
	renderView(component: RadiantElementTrackedRenderSsrCapable, options?: RenderToStringOptions): string;
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
