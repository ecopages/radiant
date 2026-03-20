import type { SsrSerializableContextProvider } from './context-provider';
import type { ContextType, UnknownContext } from './types';

const SSR_CONTEXT_PROVIDER_STACK_SYMBOL = Symbol.for('@ecopages/radiant.ssr-context-provider-stack');

function getSsrContextProviderStack(): Array<Map<UnknownContext, SsrSerializableContextProvider>> {
	const globalScope = globalThis as typeof globalThis & {
		[SSR_CONTEXT_PROVIDER_STACK_SYMBOL]?: Array<Map<UnknownContext, SsrSerializableContextProvider>>;
	};

	if (!globalScope[SSR_CONTEXT_PROVIDER_STACK_SYMBOL]) {
		globalScope[SSR_CONTEXT_PROVIDER_STACK_SYMBOL] = [];
	}

	return globalScope[SSR_CONTEXT_PROVIDER_STACK_SYMBOL];
}

export function withSsrContextProviders(providers: readonly SsrSerializableContextProvider[]): () => void {
	/**
	 * Pushes a temporary provider frame onto the SSR context stack.
	 *
	 * Callers must invoke the returned restore function after rendering the host
	 * subtree so nested SSR operations resolve the correct nearest provider and do
	 * not leak provider state into unrelated renders.
	 */
	if (providers.length === 0) {
		return () => undefined;
	}

	const ssrContextProviderStack = getSsrContextProviderStack();
	const frame = new Map<UnknownContext, SsrSerializableContextProvider>();

	for (const provider of providers) {
		frame.set(provider.getContextKey(), provider);
	}

	ssrContextProviderStack.push(frame);

	return () => {
		const lastFrame = ssrContextProviderStack.at(-1);

		if (lastFrame === frame) {
			ssrContextProviderStack.pop();
			return;
		}

		const frameIndex = ssrContextProviderStack.lastIndexOf(frame);

		if (frameIndex >= 0) {
			ssrContextProviderStack.splice(frameIndex, 1);
		}
	};
}

/**
 * Resolves the nearest SSR-visible provider for a given context token.
 *
 * Lookup walks the provider frames from innermost to outermost so nested host
 * serialization behaves the same way as runtime context resolution in the DOM.
 */
export function resolveSsrContextProvider<T extends UnknownContext>(
	context: T,
): SsrSerializableContextProvider | undefined {
	const ssrContextProviderStack = getSsrContextProviderStack();

	for (let index = ssrContextProviderStack.length - 1; index >= 0; index -= 1) {
		const provider = ssrContextProviderStack[index]?.get(context);

		if (provider) {
			return provider;
		}
	}

	return undefined;
}

/**
 * Resolves the current SSR-visible value for a given context token.
 *
 * This is the ergonomic helper consumed by SSR-aware decorators and component
 * render paths when they only need the context payload instead of the full
 * provider instance.
 */
export function resolveSsrContextValue<T extends UnknownContext>(context: T): ContextType<T> | undefined {
	const provider = resolveSsrContextProvider(context);

	if (!provider) {
		return undefined;
	}

	return provider.getContext() as ContextType<T>;
}
