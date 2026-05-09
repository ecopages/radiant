import type { JsxRenderable } from '@ecopages/jsx';
import type { RenderToStringOptions } from '@ecopages/jsx/server';
import { withServerCustomElementRenderHook } from '@ecopages/jsx/server';
import { getReactivePropDefinitions } from '../core/reactive-prop-metadata';
import { RadiantElementSsrService } from '../core/radiant-component-ssr';
import type { RadiantElementRenderBridge, RadiantElementSsrCapable } from '../core/radiant-component-ssr-registry';
import type { SsrSerializableContextProvider } from '../context/context-provider';
import type { ReactiveProperty } from '../core/radiant-element';
import type { SsrSerializableHydrationBinding } from '../core/ssr-hydration-binding';

type RadiantElementSsrHostBridge = Record<string, unknown> & {
	constructor: CustomElementConstructor;
	getAttribute(name: string): string | null;
	getAttributeNames?(): string[];
	getAuthoredHydrationScriptMarkup(): string | undefined;
	getContextProviders(): SsrSerializableContextProvider[];
	getHostSsrAttributes(): Record<string, string>;
	getHydrationBindings(): SsrSerializableHydrationBinding[];
	getPropertyValue(name: string): unknown;
	getReactiveProperties(): ReactiveProperty[];
	getSlotProjectionScriptTag(): string | undefined;
	resolveTrackedRenderOutput(): { containsSlots: boolean; value: JsxRenderable };
	renderToString(options?: RenderToStringOptions): string;
	resolveSsrRenderBridge(): RadiantElementRenderBridge;
};

type RadiantElementSsrRenderViewBridge = {
	resolveTrackedRenderOutput(): { containsSlots: boolean; value: JsxRenderable };
};

const ACTIVE_SSR_HYDRATE_SYMBOL = Symbol.for('@ecopages/jsx.active-ssr-hydrate');
const hostAttributeResolutionInProgress = new WeakSet<object>();

export function createRadiantElementSsrService(component: RadiantElementSsrCapable): RadiantElementSsrService {
	const bridge = component as unknown as RadiantElementSsrHostBridge;

	return new RadiantElementSsrService({
		constructor: bridge.constructor,
		getAuthoredHydrationScriptMarkup: () => bridge.getAuthoredHydrationScriptMarkup(),
		getHydrationBindings: () => bridge.getHydrationBindings(),
		getSlotProjectionScriptTag: () => bridge.getSlotProjectionScriptTag(),
		renderToString: (options) => bridge.renderToString(options),
		getContextProviders: () => bridge.getContextProviders(),
		getReactiveProperties: () => bridge.getReactiveProperties(),
		getReactivePropDefinitions: () => getReactivePropDefinitions(component),
		getPropertyValue: (name) => bridge.getPropertyValue(name),
		listAttributeNames: () => (typeof bridge.getAttributeNames === 'function' ? bridge.getAttributeNames() : []),
		getAttributeValue: (name) => bridge.getAttribute(name),
	});
}

export function getRadiantElementHostSsrAttributes(component: RadiantElementSsrCapable): Record<string, string> {
	const bridge = component as unknown as RadiantElementSsrHostBridge;

	if (hostAttributeResolutionInProgress.has(component)) {
		return createRadiantElementSsrService(component).getHostAttributes();
	}

	hostAttributeResolutionInProgress.add(component);

	try {
		return bridge.getHostSsrAttributes();
	} finally {
		hostAttributeResolutionInProgress.delete(component);
	}
}

export function withRadiantServerCustomElementRenderBridge<T>(render: () => T): T {
	return withServerCustomElementRenderHook(({ instance }) => {
		const nestedBridge = resolveRadiantElementRenderBridge(instance as unknown as RadiantElementSsrCapable);

		if (!nestedBridge?.renderHostToString) {
			return undefined;
		}

		const renderHostToString = nestedBridge.renderHostToString;

		return {
			nodeType: 1,
			get outerHTML() {
				const hydrate = isActiveSsrHydrateMode();
				return renderHostToString({ hydrate, mode: hydrate ? 'hydrate' : 'plain' });
			},
		};
	}, render);
}

export function resolveRadiantElementRenderBridge(
	component: RadiantElementSsrCapable,
): RadiantElementRenderBridge | undefined {
	return component.resolveSsrRenderBridge?.();
}

export function getRadiantElementTrackedRenderOutput(
	component: RadiantElementSsrCapable,
): { containsSlots: boolean; value: JsxRenderable } {
	if (!isRadiantElementSsrRenderViewBridge(component)) {
		throw new Error('Radiant SSR runtime requires resolveTrackedRenderOutput() on the component bridge.');
	}

	return component.resolveTrackedRenderOutput();
}

function isActiveSsrHydrateMode(): boolean {
	return (globalThis as typeof globalThis & Record<PropertyKey, unknown>)[ACTIVE_SSR_HYDRATE_SYMBOL] === true;
}

function isRadiantElementSsrRenderViewBridge(component: object): component is RadiantElementSsrRenderViewBridge {
	return (
		'resolveTrackedRenderOutput' in component &&
		typeof (component as { resolveTrackedRenderOutput?: unknown }).resolveTrackedRenderOutput === 'function'
	);
}