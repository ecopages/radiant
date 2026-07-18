import type { JsxRenderable } from '@ecopages/jsx';
import type { SsrSerializableContextProvider } from '../context/context-provider';
import type { ReactiveProperty } from './reactive-prop-core';
import type { ReactivePropDefinition } from './reactive-prop-metadata';
import type { SsrSerializableHydrationBinding } from './ssr-hydration-binding';

/**
 * Server-owned snapshot of host state used during Element Host serialization.
 *
 * Built by the server extractor from a live {@link RadiantElement}; the element
 * itself is not required to satisfy this shape via duck-typing.
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
};
