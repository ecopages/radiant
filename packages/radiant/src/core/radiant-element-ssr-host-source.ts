import type { JsxRenderable } from '@ecopages/jsx';
import type { SsrSerializableContextProvider } from '../context/context-provider';
import type { ReactiveProperty } from './reactive-prop-core';
import type { SsrSerializableHydrationBinding } from './ssr-hydration-binding';
import { RADIANT_ELEMENT_BRAND } from './radiant-element-brand';

/**
 * Branded Element Host surface read by the server SSR pipeline.
 *
 * Lives in core so client-safe registry types and server extractors share one
 * contract without importing {@link RadiantElement} (HTMLElement at init).
 */
export type RadiantElementSsrHostSource = {
	constructor: Function;
	readonly renderRootMode: 'light' | 'shadow';
	getAttribute(name: string): string | null;
	getAttributeNames(): string[];
	getAuthoredHydrationScriptMarkup(): string | undefined;
	getContextProviders(): SsrSerializableContextProvider[];
	getHydrationBindings(): SsrSerializableHydrationBinding[];
	getReactiveProperties(): ReactiveProperty[];
	getSlotProjectionScriptTag(): string | undefined;
	resolveTrackedRenderOutput(): { containsSlots: boolean; value: JsxRenderable };
};

export type BrandedRadiantElementSsrHost = RadiantElementSsrHostSource & {
	readonly [RADIANT_ELEMENT_BRAND]: true;
};

export type RadiantElementViewRenderSource = Pick<
	RadiantElementSsrHostSource,
	'resolveTrackedRenderOutput' | 'renderRootMode'
>;

/** True when the value is a branded Radiant Element Host the server can serialize. */
export function isRadiantElementSsrHost(component: unknown): component is BrandedRadiantElementSsrHost {
	return typeof component === 'object' && component !== null && RADIANT_ELEMENT_BRAND in component;
}
