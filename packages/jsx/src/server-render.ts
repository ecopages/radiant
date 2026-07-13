import { getJsxGlobalSymbol } from './global-symbol.ts';
import { resolveBindingShapeValue } from './renderable-guards.ts';
import {
	forEachNormalizedAttribute,
	shouldUseAttributeBindingByDefaultForElement,
	shouldUseBooleanAttributeBinding,
	type JsxRenderable,
	type TemplateResultLike,
} from './jsx-runtime.ts';
import { renderJsxRenderableToString } from './serialize-plain.ts';
import { serializeRenderable } from './serialize-renderable.ts';
import { createServerRenderedCustomElement as createServerRenderedIntrinsicCustomElement } from './server-rendered-custom-element.ts';
import {
	getActiveSsrRenderContext,
	type SsrRenderContext,
	withActiveSsrRenderContext,
	withActiveSsrScopeValue,
} from './ssr-render-scope.ts';
import type { ServerCustomElementRenderHook } from './types.ts';

/** Public vocabulary for the SSR output modes supported by `renderToString(...)`. */
export type RenderToStringMode = 'hydrate' | 'plain';

/** Options that control how JSX values are serialized during SSR. */
export type RenderToStringOptions = {
	/**
	 * When `true`, emits hydration binding markers alongside the serialized HTML
	 * so the DOM hydrator can reconnect listeners and property bindings without
	 * replacing the SSR DOM tree.
	 */
	hydrate?: boolean;
	/**
	 * Explicit SSR mode selection. Takes precedence over `hydrate` when both are present.
	 *
	 * - `'plain'` emits plain HTML without hydration binding markers.
	 * - `'hydrate'` emits HTML plus hydration binding markers.
	 */
	mode?: RenderToStringMode;
};

/**
 * Mutable hydrate binding namespace shared by one server-owned hydration root.
 *
 * Framework adapters can pass one state across multiple sibling
 * `renderToString(...)` calls when those renders belong to the same client-
 * owned root, or create a fresh state for a nested SSR root that hydrates
 * independently.
 */
export type ServerHydrationBindingState = {
	nextBindingIndex: number;
};

type RenderContext = {
	ssr: SsrRenderContext;
	hydrationBindingState: ServerHydrationBindingState;
};

type HydrationBindingScope = {
	hydrationBindingState: ServerHydrationBindingState;
	scopeValues?: Map<symbol, unknown>;
};

const ACTIVE_HYDRATION_BINDING_STATE_KEY = getJsxGlobalSymbol('hydration-binding-state');

/**
 * Serializes a Radiant JSX value into an HTML string.
 *
 * The renderer resolves keyed and subscribable wrappers transparently, reuses
 * cached interpolation metadata for template results, and optionally embeds
 * hydration descriptors when `options.mode === 'hydrate'`.
 *
 * @param value JSX value to serialize.
 * @param options Controls whether hydration metadata is emitted.
 * @returns HTML string representation of the provided JSX value.
 */
export function renderToString(value: JsxRenderable, options: RenderToStringOptions = {}): string {
	const hydrate = options.mode === 'hydrate' || (options.mode === undefined && options.hydrate === true);
	const activeSsrContext = getActiveSsrRenderContext();
	const hydrationBindingScope = getHydrationBindingScope(activeSsrContext, hydrate);
	const ssr: SsrRenderContext = {
		hydrate,
		customElementRenderHook: activeSsrContext?.customElementRenderHook,
		scopeValues: hydrationBindingScope.scopeValues,
	};

	return withActiveSsrRenderContext(ssr, () =>
		renderChild(value, {
			ssr,
			hydrationBindingState: hydrationBindingScope.hydrationBindingState,
		}),
	);
}

/** Returns whether the active SSR render scope is currently emitting hydration markers. */
export function isServerRenderHydrationActive(): boolean {
	return getActiveSsrRenderContext()?.hydrate === true;
}

/**
 * Runs work with a framework hook that can intercept intrinsic custom-element SSR.
 *
 * Frameworks use this to adapt richer host rendering models, such as
 * `RadiantElement`, without teaching the core JSX renderer about framework-
 * specific element classes.
 */
export function withServerCustomElementRenderHook<T>(hook: ServerCustomElementRenderHook, render: () => T): T {
	return withSsrRenderOverrides({ customElementRenderHook: hook }, render);
}

/** Creates a fresh hydrate binding namespace for one server-owned hydration root. */
export function createServerHydrationBindingState(): ServerHydrationBindingState {
	return { nextBindingIndex: 0 };
}

/**
 * Runs work with an explicit hydrate binding namespace attached to the active SSR scope.
 *
 * Framework integrations can use this to share one binding sequence across
 * sibling `renderToString(...)` calls that belong to the same client-owned root,
 * or to fork a fresh local sequence for nested SSR roots such as custom-element hosts.
 */
export function withServerHydrationBindingState<T>(state: ServerHydrationBindingState, render: () => T): T {
	return withActiveSsrScopeValue(ACTIVE_HYDRATION_BINDING_STATE_KEY, state, render);
}

/**
 * Legacy compatibility wrapper for older integrations that expected an explicit
 * "force custom-element SSR" toggle.
 *
 * The server-render pipeline now owns intrinsic custom-element SSR directly, so
 * this helper only preserves the old call shape and immediately runs `render()`.
 */
export function withForcedServerCustomElementRendering<T>(render: () => T): T {
	return render();
}

function withSsrRenderOverrides<T>(overrides: Partial<SsrRenderContext>, render: () => T): T {
	const parentContext = getActiveSsrRenderContext();
	const nextContext: SsrRenderContext = {
		hydrate: overrides.hydrate ?? parentContext?.hydrate ?? false,
		customElementRenderHook: overrides.customElementRenderHook ?? parentContext?.customElementRenderHook,
		scopeValues: parentContext?.scopeValues,
	};

	return withActiveSsrRenderContext(nextContext, render);
}

/**
 * Resolves the hydrate binding state visible to the current `renderToString(...)`
 * call and returns the scope values that should flow into the nested SSR context.
 */
function getHydrationBindingScope(
	activeSsrContext: SsrRenderContext | undefined,
	hydrate: boolean,
): HydrationBindingScope {
	if (!hydrate) {
		return {
			hydrationBindingState: { nextBindingIndex: 0 },
			scopeValues: activeSsrContext?.scopeValues,
		};
	}

	const activeBindingState = activeSsrContext?.scopeValues?.get(ACTIVE_HYDRATION_BINDING_STATE_KEY) as
		ServerHydrationBindingState | undefined;

	if (activeBindingState) {
		return {
			hydrationBindingState: activeBindingState,
			scopeValues: activeSsrContext?.scopeValues,
		};
	}

	const nextBindingState: ServerHydrationBindingState = { nextBindingIndex: 0 };
	const scopeValues = activeSsrContext?.scopeValues ?? new Map<symbol, unknown>();

	scopeValues.set(ACTIVE_HYDRATION_BINDING_STATE_KEY, nextBindingState);

	return {
		hydrationBindingState: nextBindingState,
		scopeValues,
	};
}

function renderChild(value: JsxRenderable, context: RenderContext): string {
	return serializeRenderable(value, {
		mode: context.ssr.hydrate ? 'hydrate' : 'plain',
		hydrationBindingState: context.hydrationBindingState,
		renderCustomElementTemplate: (template) => renderIntrinsicCustomElementTemplate(template),
	});
}

function renderIntrinsicCustomElementTemplate(template: TemplateResultLike): string | undefined {
	if (!template.rootLocalName?.includes('-') || !template.ssrIntrinsicProps) {
		return undefined;
	}

	const serverRenderedCustomElement = createServerRenderedIntrinsicCustomElement(
		template.rootLocalName,
		template.ssrIntrinsicProps,
		{
			forEachNormalizedAttribute,
			renderValueToString: renderJsxRenderableToString,
			resolveBindingShapeValue,
			shouldUseAttributeBindingByDefaultForElement,
			shouldUseBooleanAttributeBinding,
		},
	);

	if (!serverRenderedCustomElement) {
		return undefined;
	}

	return serializeRenderable(serverRenderedCustomElement, { mode: 'plain' });
}
