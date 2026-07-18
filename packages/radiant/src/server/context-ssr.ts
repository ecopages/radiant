import { getActiveSsrScopeValue, withActiveSsrScopeValue } from '@ecopages/jsx/server';
import type { SsrSerializableContextProvider } from '../context/context-provider';
import { installSsrContextProviderResolver } from '../context/context-ssr-bridge';
import type { ContextType, UnknownContext } from '../context/types';

type ProviderFrame = Map<UnknownContext, SsrSerializableContextProvider>;
type ProviderStack = readonly ProviderFrame[];

const SSR_PROVIDER_STACK_KEY = Symbol.for('@ecopages/radiant.ssr-provider-stack');

/**
 * Ensures an SSR provider stack exists on the active JSX SSR render scope.
 * Nested calls reuse the active stack. Call at render boundaries.
 */
export function runWithSsrProviderStack<T>(render: () => T): T {
	if (getActiveSsrScopeValue<ProviderStack>(SSR_PROVIDER_STACK_KEY) !== undefined) {
		return render();
	}

	return withActiveSsrScopeValue(SSR_PROVIDER_STACK_KEY, [], render);
}

/**
 * Runs work with one additional provider frame on the active SSR context stack.
 * Requires an active {@link runWithSsrProviderStack} boundary.
 */
export function withSsrContextProviders<T>(
	providers: readonly SsrSerializableContextProvider[],
	render: () => T,
): T {
	if (providers.length === 0) {
		return render();
	}

	const parent = getActiveSsrScopeValue<ProviderStack>(SSR_PROVIDER_STACK_KEY);

	if (parent === undefined) {
		throw new Error(
			'SSR context providers require runWithSsrProviderStack(...). Wrap the sync render snapshot at the render boundary.',
		);
	}

	const frame = new Map<UnknownContext, SsrSerializableContextProvider>();

	for (const provider of providers) {
		frame.set(provider.getContextKey(), provider);
	}

	return withActiveSsrScopeValue(SSR_PROVIDER_STACK_KEY, [...parent, frame], render);
}

/** Resolves the nearest SSR-visible provider for a context token (innermost first). */
export function resolveSsrContextProvider<T extends UnknownContext>(
	context: T,
): SsrSerializableContextProvider | undefined {
	const store = getActiveSsrScopeValue<ProviderStack>(SSR_PROVIDER_STACK_KEY);

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
