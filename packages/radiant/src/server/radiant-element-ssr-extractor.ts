import { getReactivePropDefinitions } from '../core/reactive-prop-metadata';
import { RADIANT_ELEMENT_BRAND } from '../core/radiant-element-brand';
import type { InternalRadiantSsrHost } from '../core/radiant-element-ssr-host';
import type { JsxRenderable } from '@ecopages/jsx';
import type { SsrSerializableContextProvider } from '../context/context-provider';
import type { ReactiveProperty } from '../core/reactive-prop-core';
import type { SsrSerializableHydrationBinding } from '../core/ssr-hydration-binding';

/**
 * Ordinary Element Host methods the server pipeline reads.
 * Kept local so the extractor never imports {@link RadiantElement} (that class
 * requires HTMLElement at module init — after the light-DOM shim).
 */
type RadiantElementHostSource = {
	constructor: Function;
	getAttribute(name: string): string | null;
	getAttributeNames(): string[];
	getAuthoredHydrationScriptMarkup(): string | undefined;
	getContextProviders(): SsrSerializableContextProvider[];
	getHydrationBindings(): SsrSerializableHydrationBinding[];
	getReactiveProperties(): ReactiveProperty[];
	getSlotProjectionScriptTag(): string | undefined;
	resolveTrackedRenderOutput(): { containsSlots: boolean; value: JsxRenderable };
};

/** True when the value is a branded Radiant Element Host the server can serialize. */
export function isRadiantElementServerRenderable(component: unknown): component is RadiantElementHostSource {
	return typeof component === 'object' && component !== null && RADIANT_ELEMENT_BRAND in component;
}

/**
 * Builds the private SSR host snapshot from a Radiant Element Host.
 * Extraction stays in the server layer; detection uses {@link RADIANT_ELEMENT_BRAND}.
 */
export function toInternalRadiantSsrHost(component: object): InternalRadiantSsrHost {
	if (!isRadiantElementServerRenderable(component)) {
		throw new Error(
			'Radiant SSR runtime requires a RadiantElement host. Import a Radiant server SSR entrypoint and pass a RadiantElement instance.',
		);
	}

	return {
		constructor: component.constructor as CustomElementConstructor,
		getAttribute: (name) => component.getAttribute(name),
		getAttributeNames: () => component.getAttributeNames(),
		getAuthoredHydrationScriptMarkup: () => component.getAuthoredHydrationScriptMarkup(),
		getContextProviders: () => component.getContextProviders(),
		getHydrationBindings: () => component.getHydrationBindings(),
		getReactiveProperties: () => component.getReactiveProperties(),
		getReactivePropDefinitions: () => getReactivePropDefinitions(component),
		getPropertyValue: (name) => Reflect.get(component, name),
		getSlotProjectionScriptTag: () => component.getSlotProjectionScriptTag(),
		resolveTrackedRenderOutput: () => component.resolveTrackedRenderOutput(),
	};
}
