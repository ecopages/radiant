import { getJsxGlobalSymbol } from './global-symbol.ts';
import type { ServerCustomElementRenderHook } from './types.ts';

/**
 * Active server-render settings propagated through a single `renderToString(...)`
 * call tree.
 *
 * The JSX SSR pipeline owns only the generic switches it understands directly,
 * such as hydration mode and the custom-element render hook. Frameworks that
 * need extra render-scoped state can attach symbol-keyed values to
 * `scopeValues` so nested renders can read them without introducing package-
 * specific fields into this core context type.
 */
export type SsrRenderContext = {
	hydrate: boolean;
	customElementRenderHook?: ServerCustomElementRenderHook;
	scopeValues?: Map<symbol, unknown>;
};

const ACTIVE_SSR_RENDER_SCOPE_SYMBOL = getJsxGlobalSymbol('active-ssr-render-scope');

type GlobalSsrRenderScopeState = typeof globalThis & {
	[ACTIVE_SSR_RENDER_SCOPE_SYMBOL]?: SsrRenderContext[];
};

export function getActiveSsrRenderContext(): SsrRenderContext | undefined {
	const scopeStack = (globalThis as GlobalSsrRenderScopeState)[ACTIVE_SSR_RENDER_SCOPE_SYMBOL];
	return scopeStack?.[scopeStack.length - 1];
}

/**
 * Reads a symbol-keyed framework value from the active SSR render scope.
 *
 * This is the escape hatch used by higher-level packages, such as Radiant, to
 * carry framework-owned server state through nested JSX renders without falling
 * back to process-global storage.
 */
export function getActiveSsrScopeValue<T>(key: symbol): T | undefined {
	return getActiveSsrRenderContext()?.scopeValues?.get(key) as T | undefined;
}

/**
 * Runs work within the provided active SSR render scope.
 *
 * Scope state is stacked so nested SSR calls inherit the current render state
 * and automatically restore the parent scope on exit.
 */
export function withActiveSsrRenderContext<T>(context: SsrRenderContext, render: () => T): T {
	const globalScope = globalThis as GlobalSsrRenderScopeState;
	const scopeStack = globalScope[ACTIVE_SSR_RENDER_SCOPE_SYMBOL] ?? [];

	globalScope[ACTIVE_SSR_RENDER_SCOPE_SYMBOL] = scopeStack;
	scopeStack.push(context);

	let result: T;

	try {
		result = render();
	} catch (error) {
		popSsrRenderScope(globalScope, scopeStack);
		throw error;
	}

	if (result instanceof Promise) {
		return result.finally(() => popSsrRenderScope(globalScope, scopeStack)) as T;
	}

	popSsrRenderScope(globalScope, scopeStack);
	return result;
}

/**
 * Runs work with one additional symbol-keyed framework value attached to the
 * active SSR render scope.
 *
 * Parent scope values remain visible unless the same symbol key is replaced in
 * the nested scope.
 */
export function withActiveSsrScopeValue<TValue, T>(key: symbol, value: TValue, render: () => T): T {
	const parentContext = getActiveSsrRenderContext();
	const scopeValues = new Map(parentContext?.scopeValues);

	scopeValues.set(key, value);

	return withActiveSsrRenderContext(
		{
			hydrate: parentContext?.hydrate ?? false,
			customElementRenderHook: parentContext?.customElementRenderHook,
			scopeValues,
		},
		render,
	);
}

function popSsrRenderScope(globalScope: GlobalSsrRenderScopeState, scopeStack: SsrRenderContext[]): void {
	scopeStack.pop();

	if (scopeStack.length === 0) {
		delete globalScope[ACTIVE_SSR_RENDER_SCOPE_SYMBOL];
	}
}
