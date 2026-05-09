import type { JsxRenderable } from '@ecopages/jsx';
import type { RenderToStringOptions } from '@ecopages/jsx/server';
import type { SsrSerializableContextProvider } from '../context/context-provider';
import type {
	RadiantElementServerRenderSsrCapable,
	RadiantElementTrackedRenderSsrCapable,
} from './radiant-component-ssr-registry';
import type { ReactiveProperty } from './radiant-element';
import type { SsrSerializableHydrationBinding } from './ssr-hydration-binding';

export const RADIANT_ELEMENT_SSR_HOST_BRIDGE = Symbol.for('@ecopages/radiant.element-ssr-host-bridge');

export type RadiantElementSsrHostBridge = RadiantElementServerRenderSsrCapable &
	RadiantElementTrackedRenderSsrCapable & {
		constructor: CustomElementConstructor;
		getAttribute(name: string): string | null;
		getAttributeNames(): string[];
		getAuthoredHydrationScriptMarkup(): string | undefined;
		getContextProviders(): SsrSerializableContextProvider[];
		getHydrationBindings(): SsrSerializableHydrationBinding[];
		getPropertyValue(name: string): unknown;
		getReactiveProperties(): ReactiveProperty[];
		getSlotProjectionScriptTag(): string | undefined;
		resolveTrackedRenderOutput(): { containsSlots: boolean; value: JsxRenderable };
		renderViewToString(options?: RenderToStringOptions): string;
	};

export type RadiantElementSsrHostSource = {
	constructor: CustomElementConstructor;
	getAttribute(name: string): string | null;
	getAttributeNames(): string[];
	getAuthoredHydrationScriptMarkup(): string | undefined;
	getContextProviders(): SsrSerializableContextProvider[];
	getHydrationBindings(): SsrSerializableHydrationBinding[];
	getPropertyValue(name: string): unknown;
	getReactiveProperties(): ReactiveProperty[];
	getSlotProjectionScriptTag(): string | undefined;
	resolveTrackedRenderOutput(): { containsSlots: boolean; value: JsxRenderable };
	renderViewToString(options?: RenderToStringOptions): string;
};

type RadiantElementSsrHostBridgeProvider = {
	[RADIANT_ELEMENT_SSR_HOST_BRIDGE]?: () => RadiantElementSsrHostBridge;
};

const ssrHostBridgeCache = new WeakMap<object, RadiantElementSsrHostBridge>();

export function getOrCreateRadiantElementSsrHostBridge(
	component: object,
	source: RadiantElementSsrHostSource,
): RadiantElementSsrHostBridge {
	const cachedBridge = ssrHostBridgeCache.get(component);

	if (cachedBridge) {
		return cachedBridge;
	}

	const bridge: RadiantElementSsrHostBridge = {
		constructor: source.constructor,
		getAttribute: (name) => source.getAttribute(name),
		getAttributeNames: () => source.getAttributeNames(),
		getAuthoredHydrationScriptMarkup: () => source.getAuthoredHydrationScriptMarkup(),
		getContextProviders: () => source.getContextProviders(),
		getHydrationBindings: () => source.getHydrationBindings(),
		getPropertyValue: (name) => source.getPropertyValue(name),
		getReactiveProperties: () => source.getReactiveProperties(),
		getSlotProjectionScriptTag: () => source.getSlotProjectionScriptTag(),
		resolveTrackedRenderOutput: () => source.resolveTrackedRenderOutput(),
		renderViewToString: (options) => source.renderViewToString(options),
	};

	ssrHostBridgeCache.set(component, bridge);
	return bridge;
}

export function resolveRadiantElementSsrHostBridge(component: object): RadiantElementSsrHostBridge | undefined {
	const bridgeProvider = component as RadiantElementSsrHostBridgeProvider;
	const providedBridge = bridgeProvider[RADIANT_ELEMENT_SSR_HOST_BRIDGE]?.();

	if (providedBridge) {
		return providedBridge;
	}

	if (isRadiantElementSsrHostBridge(component)) {
		return component;
	}

	return undefined;
}

function isRadiantElementSsrHostBridge(component: object): component is RadiantElementSsrHostBridge {
	return (
		typeof (component as { getAttribute?: unknown }).getAttribute === 'function' &&
		typeof (component as { getAuthoredHydrationScriptMarkup?: unknown }).getAuthoredHydrationScriptMarkup ===
			'function' &&
		typeof (component as { getContextProviders?: unknown }).getContextProviders === 'function' &&
		typeof (component as { getHydrationBindings?: unknown }).getHydrationBindings === 'function' &&
		typeof (component as { getPropertyValue?: unknown }).getPropertyValue === 'function' &&
		typeof (component as { getReactiveProperties?: unknown }).getReactiveProperties === 'function' &&
		typeof (component as { getSlotProjectionScriptTag?: unknown }).getSlotProjectionScriptTag === 'function' &&
		typeof (component as { resolveTrackedRenderOutput?: unknown }).resolveTrackedRenderOutput === 'function' &&
		typeof (component as { renderViewToString?: unknown }).renderViewToString === 'function'
	);
}
