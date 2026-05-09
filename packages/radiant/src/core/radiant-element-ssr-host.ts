import type { JsxRenderable } from '@ecopages/jsx';
import type { RenderToStringOptions } from '@ecopages/jsx/server';
import type { SsrSerializableContextProvider } from '../context/context-provider';
import type {
	RadiantElementRenderBridge,
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
		getHostSsrAttributes(): Record<string, string>;
		getHydrationBindings(): SsrSerializableHydrationBinding[];
		getPropertyValue(name: string): unknown;
		getReactiveProperties(): ReactiveProperty[];
		getSlotProjectionScriptTag(): string | undefined;
		resolveTrackedRenderOutput(): { containsSlots: boolean; value: JsxRenderable };
		resolveSsrRenderBridge(): RadiantElementRenderBridge;
		renderHost(): JsxRenderable;
		renderHostToString(options?: RenderToStringOptions): string;
		renderToString(options?: RenderToStringOptions): string;
	};

export type RadiantElementSsrHostSource = {
	constructor: CustomElementConstructor;
	getAttribute(name: string): string | null;
	getAttributeNames(): string[];
	getAuthoredHydrationScriptMarkup(): string | undefined;
	getContextProviders(): SsrSerializableContextProvider[];
	getHostSsrAttributes(): Record<string, string>;
	getHydrationBindings(): SsrSerializableHydrationBinding[];
	getReactiveProperties(): ReactiveProperty[];
	getSlotProjectionScriptTag(): string | undefined;
	resolveTrackedRenderOutput(): { containsSlots: boolean; value: JsxRenderable };
	resolveSsrRenderBridge(): RadiantElementRenderBridge;
	renderHost(): JsxRenderable;
	renderHostToString(options?: RenderToStringOptions): string;
	renderToString(options?: RenderToStringOptions): string;
} & Record<string, unknown>;

type RadiantElementSsrHostBridgeProvider = {
	[RADIANT_ELEMENT_SSR_HOST_BRIDGE]?: () => RadiantElementSsrHostBridge;
};

const ssrHostBridgeCache = new WeakMap<object, RadiantElementSsrHostBridge>();

export function getOrCreateRadiantElementSsrHostBridge(
	component: RadiantElementSsrHostSource,
): RadiantElementSsrHostBridge {
	const cachedBridge = ssrHostBridgeCache.get(component);

	if (cachedBridge) {
		return cachedBridge;
	}

	const bridge: RadiantElementSsrHostBridge = {
		constructor: component.constructor,
		getAttribute: (name) => component.getAttribute(name),
		getAttributeNames: () => component.getAttributeNames(),
		getAuthoredHydrationScriptMarkup: () => component.getAuthoredHydrationScriptMarkup(),
		getContextProviders: () => component.getContextProviders(),
		getHostSsrAttributes: () => component.getHostSsrAttributes(),
		getHydrationBindings: () => component.getHydrationBindings(),
		getPropertyValue: (name) => component[name],
		getReactiveProperties: () => component.getReactiveProperties(),
		getSlotProjectionScriptTag: () => component.getSlotProjectionScriptTag(),
		resolveTrackedRenderOutput: () => component.resolveTrackedRenderOutput(),
		resolveSsrRenderBridge: () => component.resolveSsrRenderBridge(),
		renderHost: () => component.renderHost(),
		renderHostToString: (options) => component.renderHostToString(options),
		renderToString: (options) => component.renderToString(options),
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
		typeof (component as { getHostSsrAttributes?: unknown }).getHostSsrAttributes === 'function' &&
		typeof (component as { getHydrationBindings?: unknown }).getHydrationBindings === 'function' &&
		typeof (component as { getReactiveProperties?: unknown }).getReactiveProperties === 'function' &&
		typeof (component as { getSlotProjectionScriptTag?: unknown }).getSlotProjectionScriptTag === 'function' &&
		typeof (component as { resolveTrackedRenderOutput?: unknown }).resolveTrackedRenderOutput === 'function' &&
		typeof (component as { resolveSsrRenderBridge?: unknown }).resolveSsrRenderBridge === 'function' &&
		typeof (component as { renderHost?: unknown }).renderHost === 'function' &&
		typeof (component as { renderHostToString?: unknown }).renderHostToString === 'function' &&
		typeof (component as { renderToString?: unknown }).renderToString === 'function'
	);
}
