import type { JsxRenderable } from '@ecopages/jsx';
import type { SsrSerializableContextProvider } from '../context/context-provider';
import type { ReactiveProperty } from './reactive-prop-core';
import type { ReactivePropDefinition } from './reactive-prop-metadata';
import type { RadiantElementRenderToStringOptions } from './radiant-element-ssr-registry';
import type { SsrSerializableHydrationBinding } from './ssr-hydration-binding';

/**
 * Unified SSR host shape shared by core resolution and server serialization.
 */
export type InternalRadiantSsrHost = {
	constructor: CustomElementConstructor;
	getAttribute(name: string): string | null;
	getAttributeNames(): string[];
	getAuthoredHydrationScriptMarkup?: () => string | undefined;
	getContextProviders: () => SsrSerializableContextProvider[];
	getHydrationBindings: () => SsrSerializableHydrationBinding[];
	getReactiveProperties: () => ReactiveProperty[];
	getReactivePropDefinitions: () => ReactivePropDefinition[];
	getPropertyValue: (name: string) => unknown;
	getSlotProjectionScriptTag?: () => string | undefined;
	resolveTrackedRenderOutput: () => { containsSlots: boolean; value: JsxRenderable };
	renderViewToString: (options?: RadiantElementRenderToStringOptions) => string;
};

export type RadiantElementSsrHostSource = InternalRadiantSsrHost;

export function resolveRadiantElementSsrHostSource(component: object): InternalRadiantSsrHost | undefined {
	if (isInternalRadiantSsrHost(component)) {
		return component;
	}

	return undefined;
}

export function isInternalRadiantSsrHost(component: object): component is InternalRadiantSsrHost {
	return (
		typeof component.constructor === 'function' &&
		typeof (component as { getAttribute?: unknown }).getAttribute === 'function' &&
		typeof (component as { getAttributeNames?: unknown }).getAttributeNames === 'function' &&
		typeof (component as { getAuthoredHydrationScriptMarkup?: unknown }).getAuthoredHydrationScriptMarkup ===
			'function' &&
		typeof (component as { getContextProviders?: unknown }).getContextProviders === 'function' &&
		typeof (component as { getHydrationBindings?: unknown }).getHydrationBindings === 'function' &&
		typeof (component as { getReactiveProperties?: unknown }).getReactiveProperties === 'function' &&
		typeof (component as { getSlotProjectionScriptTag?: unknown }).getSlotProjectionScriptTag === 'function' &&
		typeof (component as { resolveTrackedRenderOutput?: unknown }).resolveTrackedRenderOutput === 'function' &&
		typeof (component as { renderViewToString?: unknown }).renderViewToString === 'function'
	);
}
