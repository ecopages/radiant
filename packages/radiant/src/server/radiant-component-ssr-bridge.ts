import type { JsxRenderable } from '@ecopages/jsx';
import type { RenderToStringOptions } from '@ecopages/jsx/server';
import { renderToString as renderJsxToString } from '@ecopages/jsx/server';
import { withServerCustomElementRenderHook } from '@ecopages/jsx/server';
import { RadiantElementSsrService } from '../core/radiant-component-ssr';
import { resolveRadiantElementSsrHostBridge as resolveInternalRadiantElementSsrHostBridge } from '../core/radiant-element-ssr-host';
import type {
	RadiantElementRenderBridge,
	RadiantElementServerRenderSsrCapable,
	RadiantElementTrackedRenderSsrCapable,
} from '../core/radiant-component-ssr-registry';
import { extractRadiantElementServerRenderHost } from './radiant-component-ssr-extractor';

const ACTIVE_SSR_HYDRATE_SYMBOL = Symbol.for('@ecopages/jsx.active-ssr-hydrate');
const FORCE_SERVER_CUSTOM_ELEMENT_RENDER_SYMBOL = Symbol.for('@ecopages/jsx.force-server-custom-element-render');

export function createRadiantElementSsrService(
	component: RadiantElementServerRenderSsrCapable,
): RadiantElementSsrService {
	return new RadiantElementSsrService(extractRadiantElementServerRenderHost(component));
}

export function renderRadiantElementHost(component: RadiantElementServerRenderSsrCapable): JsxRenderable {
	return {
		nodeType: 1,
		outerHTML: renderRadiantElementHostToString(component, { mode: 'hydrate' }),
	};
}

export function renderRegisteredRadiantElementHost(component: unknown): JsxRenderable | undefined {
	if (isRadiantElementServerRenderable(component)) {
		return renderRadiantElementHost(component);
	}

	if (!isLegacyServerRenderable(component)) {
		return undefined;
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
	if (isRadiantElementServerRenderable(component)) {
		return renderRadiantElementHostToString(component, options);
	}

	if (!isLegacyServerRenderable(component)) {
		return undefined;
	}

	return component.renderHostToString(options);
}

export function resolveRegisteredRadiantElementPreview(component: unknown, markup: string): JsxRenderable | undefined {
	if (isRadiantElementServerRenderable(component)) {
		return renderRadiantElementHost(component);
	}

	if (!isLegacyServerRenderable(component)) {
		return undefined;
	}

	return component.renderHost?.() ?? { nodeType: 1, outerHTML: markup };
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
	return createRadiantElementSsrService(component).getHostAttributes();
}

export function resolveRadiantElementRenderBridge(component: object): RadiantElementRenderBridge | undefined {
	if (!isRadiantElementServerRenderable(component)) {
		return undefined;
	}

	return {
		renderHost: () => renderRadiantElementHost(component),
		renderHostToString: (options) => renderRadiantElementHostToString(component, options),
	};
}

export function resolveRadiantElementSsrHostBridge(component: object): object | undefined {
	return resolveInternalRadiantElementSsrHostBridge(component);
}

export function withRadiantServerCustomElementRenderBridge<T>(render: () => T): T {
	const globalScope = globalThis as typeof globalThis & Record<PropertyKey, unknown>;
	const previousForceServerRender = globalScope[FORCE_SERVER_CUSTOM_ELEMENT_RENDER_SYMBOL];
	globalScope[FORCE_SERVER_CUSTOM_ELEMENT_RENDER_SYMBOL] = true;

	try {
		return withServerCustomElementRenderHook(({ instance }) => {
			if (isRadiantElementServerRenderable(instance)) {
				return {
					nodeType: 1,
					get outerHTML() {
						const hydrate = isActiveSsrHydrateMode();
						const options: RenderToStringOptions = { hydrate, mode: hydrate ? 'hydrate' : 'plain' };

						return renderRadiantElementHostToString(instance, options);
					},
				};
			}

			if (!isLegacyServerRenderable(instance)) {
				return undefined;
			}

			const legacyInstance: { renderHostToString(options?: RenderToStringOptions): string } = instance;

			return {
				nodeType: 1,
				get outerHTML() {
					const hydrate = isActiveSsrHydrateMode();
					return legacyInstance.renderHostToString({ hydrate, mode: hydrate ? 'hydrate' : 'plain' });
				},
			};
		}, render);
	} finally {
		if (previousForceServerRender === undefined) {
			delete globalScope[FORCE_SERVER_CUSTOM_ELEMENT_RENDER_SYMBOL];
		} else {
			globalScope[FORCE_SERVER_CUSTOM_ELEMENT_RENDER_SYMBOL] = previousForceServerRender;
		}
	}
}

export function getRadiantElementTrackedRenderOutput(component: RadiantElementTrackedRenderSsrCapable): {
	containsSlots: boolean;
	value: JsxRenderable;
} {
	if (hasTrackedRenderOutput(component)) {
		return component.resolveTrackedRenderOutput();
	}

	const bridge = resolveInternalRadiantElementSsrHostBridge(component as object);

	if (!bridge) {
		throw new Error('Radiant SSR runtime requires tracked render output support on the component.');
	}

	return bridge.resolveTrackedRenderOutput();
}

function isActiveSsrHydrateMode(): boolean {
	return (globalThis as typeof globalThis & Record<PropertyKey, unknown>)[ACTIVE_SSR_HYDRATE_SYMBOL] === true;
}

function isRadiantElementServerRenderable(component: unknown): component is RadiantElementServerRenderSsrCapable {
	if (typeof component !== 'object' || component === null) {
		return false;
	}

	return resolveInternalRadiantElementSsrHostBridge(component) !== undefined;
}

function isLegacyServerRenderable(component: unknown): component is {
	renderHost?: () => JsxRenderable;
	renderHostToString(options?: RenderToStringOptions): string;
} {
	if (typeof component !== 'object' || component === null) {
		return false;
	}

	return typeof (component as { renderHostToString?: unknown }).renderHostToString === 'function';
}

function hasTrackedRenderOutput(component: unknown): component is {
	resolveTrackedRenderOutput(): { containsSlots: boolean; value: JsxRenderable };
} {
	if (typeof component !== 'object' || component === null) {
		return false;
	}

	return typeof (component as { resolveTrackedRenderOutput?: unknown }).resolveTrackedRenderOutput === 'function';
}
