import { getReactivePropDefinitions } from '../core/reactive-prop-metadata';
import { isRadiantElementSsrHost } from '../core/radiant-element-ssr-host-source';
import type { InternalRadiantSsrHost } from '../core/radiant-element-ssr-host';
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

	return {
		constructor: component.constructor as CustomElementConstructor,
		renderRootMode: component.renderRootMode,
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
