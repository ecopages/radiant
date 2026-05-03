import type { JsxRenderable } from '@ecopages/jsx';
import { renderToString as renderJsxToString } from '@ecopages/jsx/server';
import { withServerCustomElementRenderHook } from '@ecopages/jsx/server';
import type { RenderToStringOptions } from '@ecopages/jsx/server';
import { getReactivePropDefinitions } from '../core/reactive-prop-metadata';
import { RadiantElementSsrService } from '../core/radiant-component-ssr';
import {
	getRadiantElementSsrRuntime,
	registerRadiantElementSsrRuntime,
	type RadiantElementRenderBridge,
	type RadiantElementSsrCapable,
	type RadiantElementSsrRuntime,
} from '../core/radiant-component-ssr-registry';
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
	getReactiveProperties(): ReactiveProperty[];
	getSlotProjectionScriptTag(): string | undefined;
	resolveTrackedRenderOutput(): { containsSlots: boolean; value: JsxRenderable };
	renderToString(options?: RenderToStringOptions): string;
	resolveSsrRenderBridge(): RadiantElementRenderBridge;
};

const ACTIVE_SSR_HYDRATE_SYMBOL = Symbol.for('@ecopages/jsx.active-ssr-hydrate');
const hostAttributeResolutionInProgress = new WeakSet<object>();

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
 * Resolves the final host attribute map for a Radiant element.
 *
 * The recursion guard is required because `getHostSsrAttributes()` can itself
 * delegate back into the shared runtime. When that happens, the runtime falls
 * back to the raw SSR service attribute collector for the current call.
 */
function getRadiantElementHostSsrAttributes(component: RadiantElementSsrCapable): Record<string, string> {
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

/**
 * Adapts a `RadiantElement` instance to the shared `RadiantElementSsrService`
 * contract.
 *
 * Keeping this adapter local lets the base class shed its eager SSR service
 * instance while preserving the established host serialization behavior.
 */
function createRadiantElementSsrService(component: RadiantElementSsrCapable): RadiantElementSsrService {
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
		getPropertyValue: (name) => bridge[name],
		listAttributeNames: () => (typeof bridge.getAttributeNames === 'function' ? bridge.getAttributeNames() : []),
		getAttributeValue: (name) => bridge.getAttribute(name),
	});
}

/**
 * Installs a temporary JSX custom-element render hook that understands
 * `RadiantElement` SSR bridges.
 *
 * This makes nested intrinsic custom-element renders honor explicit host SSR
 * overrides instead of always falling back to the inherited JSX runtime path.
 */
function withRadiantServerCustomElementRenderBridge<T>(render: () => T): T {
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

/**
 * Resolves the SSR bridge exposed by a component instance, when present.
 */
function resolveRadiantElementRenderBridge(
	component: RadiantElementSsrCapable,
): RadiantElementRenderBridge | undefined {
	return component.resolveSsrRenderBridge?.();
}

/**
 * Reads the active JSX SSR hydrate flag from `globalThis`.
 *
 * Nested custom-element serialization mirrors the hydrate mode of the current
 * top-level render so host and child markup stay consistent.
 */
function isActiveSsrHydrateMode(): boolean {
	return (globalThis as typeof globalThis & Record<PropertyKey, unknown>)[ACTIVE_SSR_HYDRATE_SYMBOL] === true;
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
			const bridge = component as unknown as RadiantElementSsrHostBridge;

			return withRadiantServerCustomElementRenderBridge(() =>
				renderJsxToString(bridge.resolveTrackedRenderOutput().value, options),
			);
		},
	};

	registerRadiantElementSsrRuntime(runtime);
	return runtime;
}

ensureRadiantElementSsrRuntimeRegistered();
