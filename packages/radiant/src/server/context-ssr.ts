import { createLazyNodeAsyncLocalStorage } from '@ecopages/jsx/server';
import type { SsrSerializableContextProvider } from '../context/context-provider';
import { installSsrContextProviderResolver } from '../context/context-ssr-bridge';
import type { ContextType, UnknownContext } from '../context/types';

type ProviderFrame = Map<UnknownContext, SsrSerializableContextProvider>;
type ProviderStack = ProviderFrame[];

const getAsyncLocalStorage = createLazyNodeAsyncLocalStorage<ProviderStack>();

/**
 * Runs work inside an SSR provider-stack ALS scope.
 * Nested {@link withSsrContextProviders} frames share one mutable stack; nested
 * calls reuse the active store. Call at render boundaries.
 */
export function runWithSsrProviderStack<T>(render: () => T): T {
	const als = getAsyncLocalStorage();
	const active = als.getStore();

	if (active) {
		return render();
	}

	return als.run([], render);
}

/**
 * Pushes a temporary provider frame onto the active SSR context stack.
 * Requires an active {@link runWithSsrProviderStack} boundary.
 */
export function withSsrContextProviders(providers: readonly SsrSerializableContextProvider[]): () => void {
	if (providers.length === 0) {
		return () => undefined;
	}

	const store = getAsyncLocalStorage().getStore();

	if (!store) {
		throw new Error(
			'SSR context providers require runWithSsrProviderStack(...). Wrap the sync render snapshot at the render boundary.',
		);
	}

	const frame = new Map<UnknownContext, SsrSerializableContextProvider>();

	for (const provider of providers) {
		frame.set(provider.getContextKey(), provider);
	}

	store.push(frame);

	return () => {
		const index = store.lastIndexOf(frame);
		if (index >= 0) {
			store.splice(index, 1);
		}
	};
}

/** Resolves the nearest SSR-visible provider for a context token (innermost first). */
export function resolveSsrContextProvider<T extends UnknownContext>(
	context: T,
): SsrSerializableContextProvider | undefined {
	const store = getAsyncLocalStorage().getStore();

	if (!store) {
		return undefined;
	}

	for (let index = store.length - 1; index >= 0; index -= 1) {
		const provider = store[index]?.get(context);

		if (provider) {
			return provider;
		}
	}

	return undefined;
}

/** Resolves the current SSR-visible value for a context token. */
export function resolveSsrContextValue<T extends UnknownContext>(context: T): ContextType<T> | undefined {
	const provider = resolveSsrContextProvider(context);

	if (!provider) {
		return undefined;
	}

	return provider.getContext() as ContextType<T>;
}

installSsrContextProviderResolver((context) => resolveSsrContextProvider(context));
