import type { AsyncLocalStorage } from 'node:async_hooks';
import type { SsrSerializableContextProvider } from '../context/context-provider';
import { installSsrContextProviderResolver } from '../context/context-ssr-bridge';
import type { ContextType, UnknownContext } from '../context/types';

type ProviderFrame = Map<UnknownContext, SsrSerializableContextProvider>;
type ProviderStack = ProviderFrame[];

let resolvedAsyncLocalStorage: AsyncLocalStorage<ProviderStack> | null | undefined;

/**
 * Lazily resolves `AsyncLocalStorage` from `node:async_hooks`.
 *
 * The dynamic `require` is necessary because browser-based SSR tests import
 * this server-oriented module directly. A top-level static import would break
 * those browser bundles even though normal application SSR runs on the server.
 *
 * On the server (Node.js, Bun, Cloudflare Workers) the import always succeeds.
 * In browser test environments where SSR rendering is exercised without a real
 * server, the fallback global stack is used instead.
 */
function getAsyncLocalStorage(): AsyncLocalStorage<ProviderStack> | null {
	if (resolvedAsyncLocalStorage !== undefined) {
		return resolvedAsyncLocalStorage;
	}

	try {
		const { AsyncLocalStorage: ALS } = require('node:async_hooks') as typeof import('node:async_hooks');
		resolvedAsyncLocalStorage = new ALS<ProviderStack>();
		return resolvedAsyncLocalStorage;
	} catch {
		resolvedAsyncLocalStorage = null;
		return null;
	}
}

const SSR_CONTEXT_FALLBACK_STACK_SYMBOL = Symbol.for('@ecopages/radiant.ssr-context-fallback-stack');

function getFallbackStack(): ProviderStack {
	const g = globalThis as typeof globalThis & { [SSR_CONTEXT_FALLBACK_STACK_SYMBOL]?: ProviderStack };
	g[SSR_CONTEXT_FALLBACK_STACK_SYMBOL] ??= [];
	return g[SSR_CONTEXT_FALLBACK_STACK_SYMBOL];
}

/**
 * Pushes a temporary provider frame onto the SSR context stack.
 *
 * On the server, each call creates an isolated `AsyncLocalStorage` context so
 * concurrent renders cannot corrupt each other.
 *
 * In browser test environments where `AsyncLocalStorage` is unavailable, a
 * synchronous global stack is used as a fallback.
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

	const stack = getFallbackStack();
	stack.push(frame);

	return () => {
		const index = stack.lastIndexOf(frame);
		if (index >= 0) stack.splice(index, 1);
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
	const store = getAsyncLocalStorage()?.getStore() ?? getFallbackStack();

	for (let index = store.length - 1; index >= 0; index -= 1) {
		const provider = store[index]?.get(context);

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

installSsrContextProviderResolver((context) => resolveSsrContextProvider(context));
