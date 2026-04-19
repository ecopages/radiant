import type { JsxRenderable } from '@ecopages/jsx';
import { renderToString as renderJsxToString } from '@ecopages/jsx/server';
import { withServerCustomElementRenderHook } from '@ecopages/jsx/server';
import type { RenderToStringOptions } from '@ecopages/jsx/server';
import { getReactivePropDefinitions } from '../core/reactive-prop-metadata';
import { RadiantComponentSsrService } from '../core/radiant-component-ssr';
import {
	getRadiantComponentSsrRuntime,
	registerRadiantComponentSsrRuntime,
	type RadiantComponentRenderBridge,
	type RadiantComponentSsrCapable,
	type RadiantComponentSsrRuntime,
} from '../core/radiant-component-ssr-registry';
import type { SsrSerializableContextProvider } from '../context/context-provider';
import type { ReactiveProperty } from '../core/radiant-element';
import type { SsrSerializableHydrationBinding } from '../core/ssr-hydration-binding';

type RadiantComponentSsrHostBridge = Record<string, unknown> & {
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
	resolveSsrRenderBridge(): RadiantComponentRenderBridge;
};

const ACTIVE_SSR_HYDRATE_SYMBOL = Symbol.for('@ecopages/jsx.active-ssr-hydrate');
const hostAttributeResolutionInProgress = new WeakSet<object>();

/**
 * Produces a JSX-compatible host preview for a Radiant component.
 *
 * The preview always serializes with hydration enabled because it is intended
 * for shell composition, where nested client islands must preserve hydration
 * markers when embedded into a larger SSR document.
 */
function renderRadiantComponentHost(component: RadiantComponentSsrCapable): JsxRenderable {
	return {
		nodeType: 1,
		outerHTML: renderRadiantComponentHostToString(component, { hydrate: true }),
	};
}

/**
 * Serializes a Radiant component host through the shared SSR service.
 *
 * This path centralizes host serialization so direct component renders and
 * nested JSX custom-element renders follow the same attribute and hydration
 * rules.
 */
function renderRadiantComponentHostToString(
	component: RadiantComponentSsrCapable,
	options: RenderToStringOptions = {},
): string {
	return createRadiantComponentSsrService(component).renderHostToString(
		options,
		getRadiantComponentHostSsrAttributes(component),
	);
}

/**
 * Resolves the final host attribute map for a Radiant component.
 *
 * The recursion guard is required because `getHostSsrAttributes()` can itself
 * delegate back into the shared runtime. When that happens, the runtime falls
 * back to the raw SSR service attribute collector for the current call.
 */
function getRadiantComponentHostSsrAttributes(component: RadiantComponentSsrCapable): Record<string, string> {
	const bridge = component as unknown as RadiantComponentSsrHostBridge;

	if (hostAttributeResolutionInProgress.has(component)) {
		return createRadiantComponentSsrService(component).getHostAttributes();
	}

	hostAttributeResolutionInProgress.add(component);

	try {
		return bridge.getHostSsrAttributes();
	} finally {
		hostAttributeResolutionInProgress.delete(component);
	}
}

/**
 * Adapts a `RadiantComponent` instance to the older `RadiantComponentSsrService`
 * contract.
 *
 * Keeping this adapter local lets the base class shed its eager SSR service
 * instance while preserving the established host serialization behavior.
 */
function createRadiantComponentSsrService(component: RadiantComponentSsrCapable): RadiantComponentSsrService {
	const bridge = component as unknown as RadiantComponentSsrHostBridge;

	return new RadiantComponentSsrService({
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
 * `RadiantComponent` SSR bridges.
 *
 * This makes nested intrinsic custom-element renders honor explicit host SSR
 * overrides instead of always falling back to the inherited JSX runtime path.
 */
function withRadiantServerCustomElementRenderBridge<T>(render: () => T): T {
	return withServerCustomElementRenderHook(({ instance }) => {
		const nestedBridge = resolveRadiantComponentRenderBridge(instance as unknown as RadiantComponentSsrCapable);

		if (!nestedBridge?.renderHostToString) {
			return undefined;
		}

		const renderHostToString = nestedBridge.renderHostToString;

		return {
			nodeType: 1,
			get outerHTML() {
				return renderHostToString({ hydrate: isActiveSsrHydrateMode() });
			},
		};
	}, render);
}

/**
 * Resolves the SSR bridge exposed by a component instance, when present.
 */
function resolveRadiantComponentRenderBridge(
	component: RadiantComponentSsrCapable,
): RadiantComponentRenderBridge | undefined {
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
export function ensureRadiantComponentSsrRuntimeRegistered() {
	const existingRuntime = getRadiantComponentSsrRuntime();

	if (existingRuntime) {
		return existingRuntime;
	}

	const runtime: RadiantComponentSsrRuntime = {
		getHostAttributes: getRadiantComponentHostSsrAttributes,
		renderHost: renderRadiantComponentHost,
		renderHostToString: renderRadiantComponentHostToString,
		resolveRenderBridge: resolveRadiantComponentRenderBridge,
		renderView: (component, options = {}) => {
			const bridge = component as unknown as RadiantComponentSsrHostBridge;

			return withRadiantServerCustomElementRenderBridge(() =>
				renderJsxToString(bridge.resolveTrackedRenderOutput().value, options),
			);
		},
	};

	registerRadiantComponentSsrRuntime(runtime);
	return runtime;
}

ensureRadiantComponentSsrRuntimeRegistered();
