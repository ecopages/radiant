import type { JsxRenderable } from '@ecopages/jsx';
import { getActiveSsrRenderValue, type RenderToStringOptions, withActiveSsrRenderValue } from '@ecopages/jsx/server';

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
 * Shared SSR runtime contract carried on the active JSX SSR render scope.
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

const RADIANT_ELEMENT_SSR_RUNTIME_SYMBOL = Symbol.for('@ecopages/radiant.element-ssr-runtime');

/**
 * Reads the active Radiant SSR runtime from the current render scope.
 *
 * Returns `undefined` when no server render is currently in progress.
 */
export function getRadiantElementSsrRuntime(): RadiantElementSsrRuntime | undefined {
	return getActiveSsrRenderValue<RadiantElementSsrRuntime>(RADIANT_ELEMENT_SSR_RUNTIME_SYMBOL);
}

/**
 * Runs work within an active Radiant SSR runtime scope.
 *
 * The runtime remains visible across built entrypoint boundaries through the
 * active JSX SSR render scope, but only for the duration of the active render call.
 */
export function withRadiantElementSsrRuntime<T>(runtime: RadiantElementSsrRuntime, render: () => T): T {
	return withActiveSsrRenderValue(RADIANT_ELEMENT_SSR_RUNTIME_SYMBOL, runtime, render);
}
