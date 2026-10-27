import type { JsxRenderable, ServerCustomElementRenderHook } from '../types/index.ts';
import { createLazyNodeAsyncLocalStorage } from './lazy-async-local-storage.ts';

/**
 * Active server-render settings for one `renderToString(...)` call tree.
 * Frameworks attach extra render-scoped state via symbol-keyed `scopeValues`.
 */
export type SsrRenderContext = {
	hydrate: boolean;
	customElementRenderHook?: ServerCustomElementRenderHook;
	/** True when {@link customElementRenderHook} applies claimed elements' JSX children itself. */
	customElementRenderHookOwnsChildren?: boolean;
	/**
	 * Serializes nested custom-element light DOM as plain markup, still server-rendering nested custom elements.
	 * `foreignContent` is the foreign namespace the element sits in.
	 */
	renderChild?: (value: JsxRenderable, foreignContent?: 'svg' | 'math') => string;
	scopeValues?: Map<symbol, unknown>;
};

const getAsyncLocalStorage = createLazyNodeAsyncLocalStorage<SsrRenderContext>();

/** Internal. Prefer {@link getActiveSsrScopeValue} for framework state. */
export function getActiveSsrRenderContext(): SsrRenderContext | undefined {
	return getAsyncLocalStorage().getStore();
}

/**
 * Reads a symbol-keyed framework value from the active SSR render scope.
 * Prefer `Symbol.for('@your-package.namespace')` keys. Await I/O outside scope.
 */
export function getActiveSsrScopeValue<T>(key: symbol): T | undefined {
	return getActiveSsrRenderContext()?.scopeValues?.get(key) as T | undefined;
}

/** Internal. Prefer {@link withActiveSsrScopeValue} unless full context control is needed. */
export function withActiveSsrRenderContext<T>(context: SsrRenderContext, render: () => T): T {
	return getAsyncLocalStorage().run(context, render);
}

/**
 * Runs work with one additional symbol-keyed value on the active SSR render scope.
 * Sharing hydrate binding indexes across sibling roots requires
 * {@link withServerHydrationBindingState}. Await I/O outside the scope; wrap only
 * the synchronous render snapshot.
 */
export function withActiveSsrScopeValue<TValue, T>(key: symbol, value: TValue, render: () => T): T {
	const parentContext = getActiveSsrRenderContext();
	const scopeValues = new Map(parentContext?.scopeValues);

	scopeValues.set(key, value);

	return withActiveSsrRenderContext(
		{ ...parentContext, hydrate: parentContext?.hydrate ?? false, scopeValues },
		render,
	);
}
