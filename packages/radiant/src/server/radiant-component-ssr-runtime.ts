import {
	getRadiantElementSsrRuntime,
	registerRadiantElementSsrRuntime,
	type RadiantElementSsrRuntime,
} from '../core/radiant-component-ssr-registry';
import {
	getRadiantElementHostSsrAttributes,
	renderRadiantElementHost,
	renderRegisteredRadiantElementHostToString,
	renderRadiantElementHostToString,
	renderRadiantElementViewToString,
	resolveRadiantElementRenderBridge,
} from './radiant-component-ssr-bridge';

const SERVER_CUSTOM_ELEMENT_RENDER_HOOK_SYMBOL = Symbol.for('@ecopages/jsx.server-custom-element-render-hook');
const RADIANT_SERVER_CUSTOM_ELEMENT_RENDER_HOOK_SYMBOL = Symbol.for(
	'@ecopages/radiant.server-custom-element-render-hook',
);

type ServerCustomElementRenderHook = (context: {
	hydrate: boolean;
	instance: unknown;
}) => { nodeType: 1; outerHTML: string } | undefined;

/**
 * Registers the shared Radiant SSR runtime if it is not already present.
 *
 * Server entrypoints call this eagerly so instance SSR methods, nested JSX
 * custom-element SSR, and portable server helpers all share one implementation
 * and one bridge-resolution strategy.
 */
export function ensureRadiantElementSsrRuntimeRegistered() {
	ensureRadiantServerCustomElementRenderHookRegistered();

	const existingRuntime = getRadiantElementSsrRuntime();

	if (existingRuntime) {
		return existingRuntime;
	}

	const runtime: RadiantElementSsrRuntime = {
		getHostAttributes: getRadiantElementHostSsrAttributes,
		renderHost: renderRadiantElementHost,
		renderHostToString: renderRadiantElementHostToString,
		resolveRenderBridge: resolveRadiantElementRenderBridge,
		renderView: renderRadiantElementViewToString,
	};

	registerRadiantElementSsrRuntime(runtime);
	return runtime;
}

ensureRadiantElementSsrRuntimeRegistered();

function ensureRadiantServerCustomElementRenderHookRegistered(): void {
	const globalScope = globalThis as typeof globalThis & Record<PropertyKey, unknown>;
	const existingHook = globalScope[SERVER_CUSTOM_ELEMENT_RENDER_HOOK_SYMBOL];

	if (
		typeof existingHook === 'function' &&
		(existingHook as unknown as Record<PropertyKey, unknown>)[RADIANT_SERVER_CUSTOM_ELEMENT_RENDER_HOOK_SYMBOL] ===
			true
	) {
		return;
	}

	const previousHook =
		typeof existingHook === 'function' ? (existingHook as ServerCustomElementRenderHook) : undefined;
	const radiantHook: ServerCustomElementRenderHook = (context) => {
		const markup = renderRegisteredRadiantElementHostToString(context.instance, {
			hydrate: context.hydrate,
			mode: context.hydrate ? 'hydrate' : 'plain',
		});

		if (markup) {
			return {
				nodeType: 1,
				outerHTML: markup,
			};
		}

		return previousHook?.(context);
	};

	(radiantHook as unknown as Record<PropertyKey, unknown>)[RADIANT_SERVER_CUSTOM_ELEMENT_RENDER_HOOK_SYMBOL] = true;
	globalScope[SERVER_CUSTOM_ELEMENT_RENDER_HOOK_SYMBOL] = radiantHook;
}
