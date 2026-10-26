import { isCustomElementSubtreeRoot } from '../hydration/hydration-subtree-policy.ts';
import { getJsxGlobalSymbol } from './global-symbol.ts';
import { serializeRenderable } from './serialize-renderable.ts';
import { createServerRenderedCustomElement as createServerRenderedIntrinsicCustomElement } from './server-rendered-custom-element.ts';
import {
	getActiveSsrRenderContext,
	type SsrRenderContext,
	withActiveSsrRenderContext,
	withActiveSsrScopeValue,
} from './ssr-render-scope.ts';
import type {
	JsxRenderable,
	ServerCustomElementRenderHook,
	ServerCustomElementRenderHookOptions,
	TemplateResultLike,
} from '../types/index.ts';

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
	/**
	 * The foreign namespace the output is inserted in, `svg` or `math`, when it is not HTML.
	 *
	 * @remarks Raw-text tags (`style`, `script`, `xmp`, ...) are ordinary elements there, so their text is
	 * entity-escaped. An SVG `foreignObject` in the output returns to HTML. Set it when the output is the content of
	 * an element inside `svg` or `math`, such as the view of a custom element the browser parses there.
	 */
	foreignContent?: 'svg' | 'math';
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
	foreignContent: RenderToStringOptions['foreignContent'];
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
		customElementRenderHookOwnsChildren: activeSsrContext?.customElementRenderHookOwnsChildren,
		renderChild: renderCustomElementLightDom,
		scopeValues: hydrationBindingScope.scopeValues,
	};
	const context: RenderContext = {
		ssr,
		hydrationBindingState: hydrationBindingScope.hydrationBindingState,
		foreignContent: options.foreignContent,
	};

	return withActiveSsrRenderContext(ssr, () => renderChild(value, context));
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
 *
 * @remarks By default the element's JSX children are applied as light DOM before the hook runs. With
 * `ownsChildren`, they are not: a hook that returns a render must call `context.applyChildren()` itself, at the
 * point where the children should serialize (for example inside the host's context providers). Elements the
 * hook does not claim get their children applied as usual.
 */
export function withServerCustomElementRenderHook<T>(
	hook: ServerCustomElementRenderHook,
	render: () => T,
	options: ServerCustomElementRenderHookOptions = {},
): T {
	return withSsrRenderOverrides(
		{ customElementRenderHook: hook, customElementRenderHookOwnsChildren: options.ownsChildren === true },
		render,
	);
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

function withSsrRenderOverrides<T>(overrides: Partial<SsrRenderContext>, render: () => T): T {
	const parentContext = getActiveSsrRenderContext();
	const nextContext: SsrRenderContext = {
		...parentContext,
		...overrides,
		hydrate: overrides.hydrate ?? parentContext?.hydrate ?? false,
	};

	return withActiveSsrRenderContext(nextContext, render);
}

/**
 * Resolves the hydrate binding state visible to the current `renderToString(...)`
 * call and returns the scope values that should flow into the nested SSR context.
 *
 * @remarks A new hydrate root without explicit binding state copies the parent
 * `scopeValues` map and never writes into it. Sibling roots in the same SSR
 * scope therefore each start at index 0. {@link withServerHydrationBindingState}
 * is the only way to share one namespace across sibling roots.
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
	const parentScopeValues = activeSsrContext?.scopeValues;
	const scopeValues = new Map(parentScopeValues);

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
		foreignContent: context.foreignContent,
		renderCustomElementTemplate: renderIntrinsicCustomElementTemplate,
	});
}

/**
 * Serializes JSX children handed to a nested custom element as its light DOM.
 *
 * @remarks
 * Always plain: client hydration skips custom-element subtrees
 * (`countHydrationMarkers`), so markers here would take indexes from the
 * enclosing render's namespace and shift every later sibling marker. They would
 * also make the nested host mistake authored light DOM for its own SSR output.
 * Nested hosts inside the children still render through the custom-element
 * hook, which follows the active hydrate policy with a fresh namespace.
 */
function renderCustomElementLightDom(
	value: JsxRenderable,
	foreignContent?: RenderToStringOptions['foreignContent'],
): string {
	return serializeRenderable(value, {
		mode: 'plain',
		foreignContent,
		renderCustomElementTemplate: renderIntrinsicCustomElementTemplate,
	});
}

/**
 * Renders a registered custom element template through the active hook or its own host renderer.
 *
 * @param foreignContent The foreign namespace the element sits in; its light DOM and view serialize in it.
 */
export function renderIntrinsicCustomElementTemplate(
	template: TemplateResultLike,
	foreignContent?: RenderToStringOptions['foreignContent'],
): string | undefined {
	if (!template.rootLocalName || !isCustomElementSubtreeRoot(template.rootLocalName) || !template.ssrIntrinsicProps) {
		return undefined;
	}

	const serverRenderedCustomElement = createServerRenderedIntrinsicCustomElement(
		template.rootLocalName,
		template.ssrIntrinsicProps,
		foreignContent,
	);

	if (!serverRenderedCustomElement) {
		return undefined;
	}

	return serializeRenderable(serverRenderedCustomElement, { mode: 'plain' });
}
