import { getReactivePropDefinitions } from '../../core/reactive-prop-metadata';
import { REACTIVE_HOST } from '../../core/reactive-host';
import { isRadiantElementSsrHost } from '../../core/radiant-element-ssr-host-source';
import type { InternalRadiantSsrHost } from '../../core/radiant-element-ssr-host';
/**
 * Builds the private SSR host snapshot from a Radiant Element Host.
 * Extraction stays in the server layer; detection uses {@link RADIANT_ELEMENT_BRAND}.
 */
export function toInternalRadiantSsrHost(component: object): InternalRadiantSsrHost {
	if (!isRadiantElementSsrHost(component)) {
		throw new Error(
			'Radiant SSR runtime requires a RadiantElement host. Import a Radiant server SSR entrypoint and pass a RadiantElement instance.',
		);
	}

	const internals = component[REACTIVE_HOST];

	return {
		constructor: component.constructor as CustomElementConstructor,
		getAttribute: (name) => component.getAttribute(name),
		getAttributeNames: () => component.getAttributeNames(),
		getAuthoredHydrationScriptMarkup: () => component.getAuthoredHydrationScriptMarkup(),
		getContextProviders: () => internals.ssrRegistry.getContextProviders(),
		getHydrationBindings: () => internals.ssrRegistry.getHydrationBindings(),
		getReactiveProperties: () => component.getReactiveProperties(),
		getReactivePropDefinitions: () => getReactivePropDefinitions(component),
		getPropertyValue: (name) => Reflect.get(component, name),
		getSlotProjectionScriptTag: () => component.getSlotProjectionScriptTag(),
		resolveTrackedRenderOutput: () => component.resolveTrackedRenderOutput(),
		flushPostSyncCallbacks: () => internals.flushPostSyncCallbacks(),
		prepareForSsr: () => component.prepareForSsr(),
	};
}
