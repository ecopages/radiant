import type { JsxRenderable } from '@ecopages/jsx';
import { renderToString as renderJsxToString } from '@ecopages/jsx/server';
import type { RenderToStringOptions } from '@ecopages/jsx/server';
import {
	getRadiantElementSsrRuntime,
	registerRadiantElementSsrRuntime,
	type RadiantElementSsrCapable,
	type RadiantElementSsrRuntime,
} from '../core/radiant-component-ssr-registry';
import {
	createRadiantElementSsrService,
	getRadiantElementTrackedRenderOutput,
	getRadiantElementHostSsrAttributes,
	resolveRadiantElementRenderBridge,
	withRadiantServerCustomElementRenderBridge,
} from './radiant-component-ssr-bridge';

/**
 * Produces a JSX-compatible host preview for a Radiant element.
 *
 * The preview always serializes with hydration enabled because it is intended
 * for shell composition, where nested client islands must preserve hydration
 * markers when embedded into a larger SSR document.
 */
function renderRadiantElementHost(component: RadiantElementSsrCapable): JsxRenderable {
	return {
		nodeType: 1,
		outerHTML: renderRadiantElementHostToString(component, { mode: 'hydrate' }),
	};
}

/**
 * Serializes a Radiant element host through the shared SSR service.
 *
 * This path centralizes host serialization so direct component renders and
 * nested JSX custom-element renders follow the same attribute and hydration
 * rules.
 */
function renderRadiantElementHostToString(
	component: RadiantElementSsrCapable,
	options: RenderToStringOptions = {},
): string {
	return createRadiantElementSsrService(component).renderHostToString(
		options,
		getRadiantElementHostSsrAttributes(component),
	);
}

/**
 * Registers the shared Radiant SSR runtime if it is not already present.
 *
 * Server entrypoints call this eagerly so instance SSR methods, nested JSX
 * custom-element SSR, and portable server helpers all share one implementation
 * and one bridge-resolution strategy.
 */
export function ensureRadiantElementSsrRuntimeRegistered() {
	const existingRuntime = getRadiantElementSsrRuntime();

	if (existingRuntime) {
		return existingRuntime;
	}

	const runtime: RadiantElementSsrRuntime = {
		getHostAttributes: getRadiantElementHostSsrAttributes,
		renderHost: renderRadiantElementHost,
		renderHostToString: renderRadiantElementHostToString,
		resolveRenderBridge: resolveRadiantElementRenderBridge,
		renderView: (component, options = {}) => {
			return withRadiantServerCustomElementRenderBridge(() =>
				renderJsxToString(getRadiantElementTrackedRenderOutput(component).value, options),
			);
		},
	};

	registerRadiantElementSsrRuntime(runtime);
	return runtime;
}

ensureRadiantElementSsrRuntimeRegistered();
