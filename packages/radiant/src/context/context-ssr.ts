import type { AsyncLocalStorage } from 'node:async_hooks';
import type { SsrSerializableContextProvider } from './context-provider';
import type { ContextType, UnknownContext } from './types';

type ProviderFrame = Map<UnknownContext, SsrSerializableContextProvider>;
type ProviderStack = ProviderFrame[];

const SSR_CONTEXT_PROVIDER_STACK_SYMBOL = Symbol.for('@ecopages/radiant.ssr-context-provider-stack');

let resolvedAsyncLocalStorage: AsyncLocalStorage<ProviderStack> | null | undefined;

function getAsyncLocalStorage(): AsyncLocalStorage<ProviderStack> | null {
	if (resolvedAsyncLocalStorage !== undefined) {
		return resolvedAsyncLocalStorage;
	}

	try {
		if (typeof globalThis.process !== 'undefined') {
			const { AsyncLocalStorage: ALS } = require('node:async_hooks') as typeof import('node:async_hooks');
			resolvedAsyncLocalStorage = new ALS<ProviderStack>();
			return resolvedAsyncLocalStorage;
		}
	} catch {
		/* not available */
	}

	resolvedAsyncLocalStorage = null;
	return null;
}

function getGlobalFallbackStack(): ProviderStack {
	const globalScope = globalThis as typeof globalThis & {
		[SSR_CONTEXT_PROVIDER_STACK_SYMBOL]?: ProviderStack;
	};

	if (!globalScope[SSR_CONTEXT_PROVIDER_STACK_SYMBOL]) {
		globalScope[SSR_CONTEXT_PROVIDER_STACK_SYMBOL] = [];
	}

	return globalScope[SSR_CONTEXT_PROVIDER_STACK_SYMBOL];
}

function getSsrContextProviderStack(): ProviderStack {
	return getAsyncLocalStorage()?.getStore() ?? getGlobalFallbackStack();
}

/**
 * Pushes a temporary provider frame onto the SSR context stack.
 *
 * When `AsyncLocalStorage` is available (Node.js, Bun), the callback runs in
 * an isolated async context so concurrent renders cannot corrupt each other.
 *
 * When `AsyncLocalStorage` is unavailable, the frame is pushed onto a global
 * stack and the returned restore function **must** be called synchronously
 * after the render completes. All code between the push and the restore must
 * complete without yielding to avoid interleaving with other renders.
 */
export function withSsrContextProviders(providers: readonly SsrSerializableContextProvider[]): () => void {
	if (providers.length === 0) {
		return () => undefined;
	}

	const frame = new Map<UnknownContext, SsrSerializableContextProvider>();

	for (const provider of providers) {
		frame.set(provider.getContextKey(), provider);
	}

	const als = getAsyncLocalStorage();

	if (als) {
		const parentStack = als.getStore() ?? [];
		const childStack = [...parentStack, frame];
		als.enterWith(childStack);

		return () => {
			als.enterWith(parentStack);
		};
	}

	const ssrContextProviderStack = getGlobalFallbackStack();
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
