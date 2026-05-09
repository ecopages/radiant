import type { JsxRenderable } from '@ecopages/jsx';
import type { RenderToStringOptions } from '@ecopages/jsx/server';
import { renderToString as renderJsxToString } from '@ecopages/jsx/server';
import { withServerCustomElementRenderHook } from '@ecopages/jsx/server';
import { getReactivePropDefinitions } from '../core/reactive-prop-metadata';
import { RadiantElementSsrService } from '../core/radiant-component-ssr';
import { resolveRadiantElementSsrHostBridge, type RadiantElementSsrHostBridge } from '../core/radiant-element-ssr-host';
import { getRadiantElementSsrRuntime } from '../core/radiant-component-ssr-registry';
import type {
	RadiantElementHydrationSsrCapable,
	RadiantElementRenderBridge,
	RadiantElementServerRenderSsrCapable,
	RadiantElementTrackedRenderSsrCapable,
} from '../core/radiant-component-ssr-registry';

const ACTIVE_SSR_HYDRATE_SYMBOL = Symbol.for('@ecopages/jsx.active-ssr-hydrate');
const hostAttributeResolutionInProgress = new WeakSet<object>();

export function createRadiantElementSsrService(
	component: RadiantElementServerRenderSsrCapable,
): RadiantElementSsrService {
	const bridge = getRadiantElementSsrHostBridge(component);

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

export function renderRadiantElementHost(component: RadiantElementHydrationSsrCapable): JsxRenderable {
	return {
		nodeType: 1,
		outerHTML: renderRadiantElementHostToString(component, { mode: 'hydrate' }),
	};
}

export function renderRegisteredRadiantElementHost(component: unknown): JsxRenderable | undefined {
	if (!isRadiantElementHydrationSsrCapable(component)) {
		return undefined;
	}

	const bridge = resolveRadiantElementRenderBridge(component);

	if (bridge?.renderHost) {
		return bridge.renderHost();
	}

	if (bridge?.renderHostToString) {
		return { nodeType: 1, outerHTML: bridge.renderHostToString({ mode: 'hydrate' }) };
	}

	return component.renderHost?.() ?? { nodeType: 1, outerHTML: component.renderHostToString({ mode: 'hydrate' }) };
}

export function renderRadiantElementHostToString(
	component: RadiantElementServerRenderSsrCapable,
	options: RenderToStringOptions = {},
): string {
	return createRadiantElementSsrService(component).renderHostToString(
		options,
		getRadiantElementHostSsrAttributes(component),
	);
}

export function renderRegisteredRadiantElementHostToString(
	component: unknown,
	options: RenderToStringOptions = {},
): string | undefined {
	if (!isRadiantElementHydrationSsrCapable(component)) {
		return undefined;
	}

	const bridge = resolveRadiantElementRenderBridge(component);

	if (bridge?.renderHostToString) {
		return bridge.renderHostToString(options);
	}

	return component.renderHostToString(options);
}

export function resolveRegisteredRadiantElementPreview(component: unknown, markup: string): JsxRenderable | undefined {
	if (!isRadiantElementHydrationSsrCapable(component)) {
		return undefined;
	}

	const bridge = resolveRadiantElementRenderBridge(component);

	if (!bridge) {
		return component.renderHost?.() ?? { nodeType: 1, outerHTML: markup };
	}

	if (!bridge.renderHostToString && bridge.renderHost) {
		return { nodeType: 1, outerHTML: markup };
	}

	return bridge.renderHost?.() ?? component.renderHost?.() ?? { nodeType: 1, outerHTML: markup };
}

export function renderRadiantElementViewToString(
	component: RadiantElementTrackedRenderSsrCapable,
	options: RenderToStringOptions = {},
): string {
	return withRadiantServerCustomElementRenderBridge(() =>
		renderJsxToString(getRadiantElementTrackedRenderOutput(component).value, options),
	);
}

export function getRadiantElementHostSsrAttributes(
	component: RadiantElementServerRenderSsrCapable,
): Record<string, string> {
	const bridge = getRadiantElementSsrHostBridge(component);

	if (hostAttributeResolutionInProgress.has(bridge)) {
		return createRadiantElementSsrService(component).getHostAttributes();
	}

	hostAttributeResolutionInProgress.add(bridge);

	try {
		return bridge.getHostSsrAttributes();
	} finally {
		hostAttributeResolutionInProgress.delete(bridge);
	}
}

export function withRadiantServerCustomElementRenderBridge<T>(render: () => T): T {
	return withServerCustomElementRenderHook(({ instance }) => {
		if (!isRadiantElementHydrationSsrCapable(instance)) {
			return undefined;
		}

		const nestedBridge = resolveRadiantElementRenderBridge(instance);

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
	component: RadiantElementHydrationSsrCapable,
): RadiantElementRenderBridge | undefined {
	return component.resolveSsrRenderBridge?.();
}

export function getRegisteredRadiantElementRenderBridge(component: unknown): RadiantElementRenderBridge | undefined {
	if (!isRadiantElementHydrationSsrCapable(component)) {
		return undefined;
	}

	return getRadiantElementSsrRuntime()?.resolveRenderBridge(component);
}

export function getRadiantElementTrackedRenderOutput(component: RadiantElementTrackedRenderSsrCapable): {
	containsSlots: boolean;
	value: JsxRenderable;
} {
	if (typeof component.resolveTrackedRenderOutput === 'function') {
		return component.resolveTrackedRenderOutput();
	}

	const bridge = resolveRadiantElementSsrHostBridge(component as object);

	if (!bridge) {
		throw new Error('Radiant SSR runtime requires tracked render output support on the component.');
	}

	return bridge.resolveTrackedRenderOutput();
}

function isActiveSsrHydrateMode(): boolean {
	return (globalThis as typeof globalThis & Record<PropertyKey, unknown>)[ACTIVE_SSR_HYDRATE_SYMBOL] === true;
}

function getRadiantElementSsrHostBridge(component: object): RadiantElementSsrHostBridge {
	const bridge = resolveRadiantElementSsrHostBridge(component);

	if (!bridge) {
		throw new Error('Radiant SSR runtime requires a full SSR host bridge on the component.');
	}

	return bridge;
}

function isRadiantElementHydrationSsrCapable(component: unknown): component is RadiantElementHydrationSsrCapable {
	if (typeof component !== 'object' || component === null) {
		return false;
	}

	return (
		typeof (component as { renderToString?: unknown }).renderToString === 'function' &&
		typeof (component as { renderHostToString?: unknown }).renderHostToString === 'function'
	);
}
