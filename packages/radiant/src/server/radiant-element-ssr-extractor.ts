import { getReactivePropDefinitions } from '../core/reactive-prop-metadata';
import { resolveRadiantElementSsrHostSource } from '../core/radiant-element-ssr-host';
import type { RadiantElementServerRenderSsrCapable } from '../core/radiant-element-ssr-registry';
import type { RadiantElementSsrHost } from '../core/radiant-element-ssr-service';

export function extractRadiantElementServerRenderHost(
	component: RadiantElementServerRenderSsrCapable,
): RadiantElementSsrHost {
	const source = resolveRadiantElementSsrHostSource(component);

	if (!source) {
		throw new Error('Radiant SSR runtime requires a server extraction host shape on the component.');
	}

	return {
		constructor: source.constructor,
		getAuthoredHydrationScriptMarkup: () => source.getAuthoredHydrationScriptMarkup(),
		getContextProviders: () => source.getContextProviders(),
		getHydrationBindings: () => source.getHydrationBindings(),
		getSlotProjectionScriptTag: () => source.getSlotProjectionScriptTag(),
		renderViewToString: (options) => source.renderViewToString(options),
		getReactiveProperties: () => source.getReactiveProperties(),
		getReactivePropDefinitions: () => getReactivePropDefinitions(component),
		getPropertyValue: (name) => Reflect.get(component, name),
		listAttributeNames: () => source.getAttributeNames(),
		getAttributeValue: (name) => source.getAttribute(name),
	};
}
