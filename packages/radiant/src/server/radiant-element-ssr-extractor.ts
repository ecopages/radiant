import { getReactivePropDefinitions } from '../core/reactive-prop-metadata';
import { resolveRadiantElementSsrHostSource } from '../core/radiant-element-ssr-host';
import type { InternalRadiantSsrHost } from './internal-radiant-host';

export function toInternalRadiantSsrHost(component: object): InternalRadiantSsrHost {
	const source = resolveRadiantElementSsrHostSource(component);

	if (!source) {
		throw new Error('Radiant SSR runtime requires a server extraction host shape on the component.');
	}

	return {
		constructor: source.constructor,
		getAttribute: (name) => source.getAttribute(name),
		getAttributeNames: () => source.getAttributeNames(),
		getAuthoredHydrationScriptMarkup: () => source.getAuthoredHydrationScriptMarkup?.(),
		getContextProviders: () => source.getContextProviders(),
		getHydrationBindings: () => source.getHydrationBindings(),
		getReactiveProperties: () => source.getReactiveProperties(),
		getReactivePropDefinitions: () => getReactivePropDefinitions(component),
		getPropertyValue: (name) => Reflect.get(component, name),
		getSlotProjectionScriptTag: () => source.getSlotProjectionScriptTag?.(),
		resolveTrackedRenderOutput: () => source.resolveTrackedRenderOutput(),
		renderViewToString: (options) => source.renderViewToString(options),
	};
}
