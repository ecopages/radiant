import { getReactivePropDefinitions } from '../core/reactive-prop-metadata';
import { resolveRadiantElementSsrHostBridge } from '../core/radiant-element-ssr-host';
import type { RadiantElementServerRenderSsrCapable } from '../core/radiant-component-ssr-registry';
import type { RadiantElementSsrHost } from '../core/radiant-component-ssr';

export function extractRadiantElementServerRenderHost(
	component: RadiantElementServerRenderSsrCapable,
): RadiantElementSsrHost {
	const bridge = resolveRadiantElementSsrHostBridge(component as object);

	if (!bridge) {
		throw new Error('Radiant SSR runtime requires a server extraction host shape on the component.');
	}

	return {
		constructor: bridge.constructor,
		getAuthoredHydrationScriptMarkup: () => bridge.getAuthoredHydrationScriptMarkup(),
		getContextProviders: () => bridge.getContextProviders(),
		getHydrationBindings: () => bridge.getHydrationBindings(),
		getSlotProjectionScriptTag: () => bridge.getSlotProjectionScriptTag(),
		renderViewToString: (options) => bridge.renderViewToString(options),
		getReactiveProperties: () => bridge.getReactiveProperties(),
		getReactivePropDefinitions: () => getReactivePropDefinitions(component),
		getPropertyValue: (name) => bridge.getPropertyValue(name),
		listAttributeNames: () => bridge.getAttributeNames(),
		getAttributeValue: (name) => bridge.getAttribute(name),
	};
}
