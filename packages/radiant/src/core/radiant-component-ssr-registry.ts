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
	[RADIANT_COMPONENT_SSR_RUNTIME_SYMBOL]?: RadiantElementSsrRuntime[];
};

/**
 * Reads the active Radiant SSR runtime from the current render scope.
 *
 * Returns `undefined` when no server render is currently in progress.
 */
export function getRadiantElementSsrRuntime(): RadiantElementSsrRuntime | undefined {
	const runtimeStack = (globalThis as GlobalSsrRuntimeState)[RADIANT_COMPONENT_SSR_RUNTIME_SYMBOL];
	return runtimeStack?.[runtimeStack.length - 1];
}

/**
 * Runs work within an active Radiant SSR runtime scope.
 *
 * The runtime remains visible across built entrypoint boundaries through
 * `globalThis`, but only for the duration of the active render call.
 */
export function withRadiantElementSsrRuntime<T>(runtime: RadiantElementSsrRuntime, render: () => T): T {
	const runtimeState = globalThis as GlobalSsrRuntimeState;
	const runtimeStack = runtimeState[RADIANT_COMPONENT_SSR_RUNTIME_SYMBOL] ?? [];

	runtimeState[RADIANT_COMPONENT_SSR_RUNTIME_SYMBOL] = runtimeStack;
	runtimeStack.push(runtime);

	let result: T;

	try {
		result = render();
	} catch (error) {
		popRadiantElementSsrRuntime(runtimeState, runtimeStack);
		throw error;
	}

	if (result instanceof Promise) {
		return result.finally(() => popRadiantElementSsrRuntime(runtimeState, runtimeStack)) as T;
	}

	popRadiantElementSsrRuntime(runtimeState, runtimeStack);
	return result;
}

function popRadiantElementSsrRuntime(runtimeState: GlobalSsrRuntimeState, runtimeStack: RadiantElementSsrRuntime[]) {
	runtimeStack.pop();

	if (runtimeStack.length === 0) {
		delete runtimeState[RADIANT_COMPONENT_SSR_RUNTIME_SYMBOL];
	}
}
