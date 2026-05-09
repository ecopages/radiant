import type { JsxRenderable } from '@ecopages/jsx';
import type { RenderToStringOptions } from '@ecopages/jsx/server';
import type { SsrSerializableContextProvider } from '../context/context-provider';
import type {
	RadiantElementServerRenderSsrCapable,
	RadiantElementTrackedRenderSsrCapable,
} from './radiant-component-ssr-registry';
import type { ReactiveProperty } from './reactive-prop-core';
import type { SsrSerializableHydrationBinding } from './ssr-hydration-binding';

export type RadiantElementSsrHostSource = RadiantElementServerRenderSsrCapable &
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

export function resolveRadiantElementSsrHostSource(component: object): RadiantElementSsrHostSource | undefined {
	if (isRadiantElementSsrHostSource(component)) {
		return component;
	}

	return undefined;
}

function isRadiantElementSsrHostSource(component: object): component is RadiantElementSsrHostSource {
	return (
		typeof component.constructor === 'function' &&
		typeof (component as { getAttribute?: unknown }).getAttribute === 'function' &&
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
