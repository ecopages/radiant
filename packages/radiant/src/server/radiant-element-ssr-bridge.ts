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
import { assertLightDomSsrSupported } from './assert-light-dom-ssr';
import { RadiantElementSsrService } from './radiant-element-ssr-service';
import { runWithSsrProviderStack } from './context-ssr';
import './install-ssr-runtime';
import { isRadiantElementServerRenderable } from './radiant-element-ssr-extractor';
import type {
	RadiantElementRenderBridge,
	RadiantElementServerRenderSsrCapable,
	RadiantElementSsrRuntime,
	RadiantElementTrackedRenderSsrCapable,
} from '../core/radiant-element-ssr-registry';
import { withRadiantElementSsrRuntime } from '../core/radiant-element-ssr-registry';

let radiantElementSsrRuntime: RadiantElementSsrRuntime | undefined;

export function createRadiantElementSsrService(component: object): RadiantElementSsrService {
	return new RadiantElementSsrService(component, renderRadiantElementViewToString);
}

/** One host-serialization entry used by adapters and nested JSX custom-element SSR. */
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

export function renderRadiantElementHost(component: RadiantElementServerRenderSsrCapable): JsxRenderable {
	return {
		nodeType: 1,
		outerHTML: renderRadiantElementHostToString(component, { mode: 'hydrate' }),
	};
}

export function renderRegisteredRadiantElementHost(component: unknown): JsxRenderable | undefined {
	if (!isRadiantElementServerRenderable(component)) {
		return undefined;
	}

	return renderRadiantElementHost(component);
}

export function renderRegisteredRadiantElementHostToString(
	component: unknown,
	options: RenderToStringOptions = {},
): string | undefined {
	if (!isRadiantElementServerRenderable(component)) {
		return undefined;
	}

	return renderRadiantElementHostToString(component, options);
}

export function resolveRegisteredRadiantElementPreview(component: unknown, _markup: string): JsxRenderable | undefined {
	if (!isRadiantElementServerRenderable(component)) {
		return undefined;
	}

	return renderRadiantElementHost(component);
}

export function renderRadiantElementViewToString(
	component: RadiantElementTrackedRenderSsrCapable,
	options: RenderToStringOptions = {},
): string {
	assertLightDomSsrSupported(component);

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
	return isRadiantElementServerRenderable(component) ? component : undefined;
}

/**
 * Installs the JSX custom-element render hook so nested CEs serialize through
 * {@link renderRadiantElementHostToString} (same path as `renderComponent`).
 */
export function withRadiantServerCustomElementRenderBridge<T>(render: () => T): T {
	return withForcedServerCustomElementRendering(() =>
		withServerCustomElementRenderHook(({ instance }) => {
			if (!isRadiantElementServerRenderable(instance)) {
				return undefined;
			}

			return {
				nodeType: 1,
				get outerHTML() {
					return serializeNestedCustomElementHost(instance);
				},
			};
		}, render),
	);
}

function serializeNestedCustomElementHost(instance: RadiantElementServerRenderSsrCapable): string {
	const hydrate = isServerRenderHydrationActive();
	const options: RenderToStringOptions = { hydrate, mode: hydrate ? 'hydrate' : 'plain' };

	if (!hydrate) {
		return renderRadiantElementHostToString(instance, options);
	}

	return withServerHydrationBindingState(createServerHydrationBindingState(), () =>
		renderRadiantElementHostToString(instance, options),
	);
}

export function getRadiantElementTrackedRenderOutput(component: RadiantElementTrackedRenderSsrCapable): {
	containsSlots: boolean;
	value: JsxRenderable;
} {
	if (hasTrackedRenderOutput(component)) {
		return component.resolveTrackedRenderOutput();
	}

	throw new Error('Radiant SSR runtime requires tracked render output support on the component.');
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
	return withRadiantElementSsrRuntime(getOrCreateRadiantElementSsrRuntime(), () => runWithSsrProviderStack(render));
}
