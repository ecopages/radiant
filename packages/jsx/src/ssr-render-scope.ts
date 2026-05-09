import type { ServerCustomElementRenderHook } from './types.ts';

export type SsrRenderContext = {
	hydrate: boolean;
	forceServerCustomElementRender: boolean;
	customElementRenderHook?: ServerCustomElementRenderHook;
};

const ACTIVE_SSR_RENDER_SCOPE_SYMBOL = Symbol.for('@ecopages/jsx.active-ssr-render-scope');

type GlobalSsrRenderScopeState = typeof globalThis & {
	[ACTIVE_SSR_RENDER_SCOPE_SYMBOL]?: SsrRenderContext[];
};

export function getActiveSsrRenderContext(): SsrRenderContext | undefined {
	const scopeStack = (globalThis as GlobalSsrRenderScopeState)[ACTIVE_SSR_RENDER_SCOPE_SYMBOL];
	return scopeStack?.[scopeStack.length - 1];
}

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

function popSsrRenderScope(globalScope: GlobalSsrRenderScopeState, scopeStack: SsrRenderContext[]): void {
	scopeStack.pop();

	if (scopeStack.length === 0) {
		delete globalScope[ACTIVE_SSR_RENDER_SCOPE_SYMBOL];
	}
}
