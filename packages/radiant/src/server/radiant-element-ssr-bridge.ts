import type { JsxRenderable } from '@ecopages/jsx';
import type { RenderToStringOptions } from '@ecopages/jsx/server';
import { renderToString as renderJsxToString } from '@ecopages/jsx/server';
import {
	createServerHydrationBindingState,
	isServerRenderHydrationActive,
	withForcedServerCustomElementRendering,
	withServerCustomElementRenderHook,
	withServerHydrationBindingState,
} from '@ecopages/jsx/server';
import { RadiantElementSsrService } from './radiant-element-ssr-service';
import { resolveRadiantElementSsrHostSource as resolveInternalRadiantElementSsrHostSource } from '../core/radiant-element-ssr-host';
import type {
	RadiantElementRenderBridge,
	RadiantElementServerRenderSsrCapable,
	RadiantElementSsrRuntime,
	RadiantElementTrackedRenderSsrCapable,
} from '../core/radiant-element-ssr-registry';
import { withRadiantElementSsrRuntime } from '../core/radiant-element-ssr-registry';

let radiantElementSsrRuntime: RadiantElementSsrRuntime | undefined;

export function createRadiantElementSsrService(component: object): RadiantElementSsrService {
	return new RadiantElementSsrService(component);
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
	return withServerRadiantElementSsrRuntime(() =>
		createRadiantElementSsrService(component).renderHostToString(
			options,
			getRadiantElementHostSsrAttributes(component),
		),
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
	return withServerRadiantElementSsrRuntime(() =>
		withRadiantServerCustomElementRenderBridge(() =>
			renderJsxToString(getRadiantElementTrackedRenderOutput(component).value, options),
		),
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
	return resolveInternalRadiantElementSsrHostSource(component);
}

export function withRadiantServerCustomElementRenderBridge<T>(render: () => T): T {
	return withForcedServerCustomElementRendering(() =>
		withServerCustomElementRenderHook(({ instance }) => {
			if (isRadiantElementServerRenderable(instance)) {
				return {
					nodeType: 1,
					get outerHTML() {
						const hydrate = isServerRenderHydrationActive();
						const options: RenderToStringOptions = { hydrate, mode: hydrate ? 'hydrate' : 'plain' };

						if (!hydrate) {
							return renderRadiantElementHostToString(instance, options);
						}

						return withServerHydrationBindingState(createServerHydrationBindingState(), () =>
							renderRadiantElementHostToString(instance, options),
						);
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
					const hydrate = isServerRenderHydrationActive();

					if (!hydrate) {
						return legacyInstance.renderHostToString({ hydrate, mode: hydrate ? 'hydrate' : 'plain' });
					}

					return withServerHydrationBindingState(createServerHydrationBindingState(), () =>
						legacyInstance.renderHostToString({ hydrate, mode: hydrate ? 'hydrate' : 'plain' }),
					);
				},
			};
		}, render),
	);
}

export function getRadiantElementTrackedRenderOutput(component: RadiantElementTrackedRenderSsrCapable): {
	containsSlots: boolean;
	value: JsxRenderable;
} {
	if (hasTrackedRenderOutput(component)) {
		return component.resolveTrackedRenderOutput();
	}

	const source = resolveInternalRadiantElementSsrHostSource(component);

	if (!source) {
		throw new Error('Radiant SSR runtime requires tracked render output support on the component.');
	}

	return source.resolveTrackedRenderOutput();
}

function isRadiantElementServerRenderable(component: unknown): component is RadiantElementServerRenderSsrCapable {
	if (typeof component !== 'object' || component === null) {
		return false;
	}

	return resolveInternalRadiantElementSsrHostSource(component) !== undefined;
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

export function getOrCreateRadiantElementSsrRuntime(): RadiantElementSsrRuntime {
	if (radiantElementSsrRuntime) {
		return radiantElementSsrRuntime;
	}

	radiantElementSsrRuntime = {
		getHostAttributes: getRadiantElementHostSsrAttributes,
		renderHost: renderRadiantElementHost,
		renderHostToString: renderRadiantElementHostToString,
		resolveRenderBridge: resolveRadiantElementRenderBridge,
		renderView: renderRadiantElementViewToString,
	};

	return radiantElementSsrRuntime;
}

export function withServerRadiantElementSsrRuntime<T>(render: () => T): T {
	return withRadiantElementSsrRuntime(getOrCreateRadiantElementSsrRuntime(), render);
}
