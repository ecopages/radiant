import type { SsrSerializableContextProvider } from './context-provider';
import type { ContextType, UnknownContext } from './types';

type SsrContextProviderResolver = (context: UnknownContext) => SsrSerializableContextProvider | undefined;

let ssrContextProviderResolver: SsrContextProviderResolver | undefined;

/**
 * Installs the ambient SSR provider resolver used by shared context runtime helpers.
 *
 * Server-side rendering infrastructure owns the actual provider stack storage and
 * publishes a lookup function here so client/runtime code does not need to import
 * server-oriented modules. Module-local: SSR bundlers must resolve one radiant instance.
 */
export function installSsrContextProviderResolver(resolver: SsrContextProviderResolver): void {
	ssrContextProviderResolver = resolver;
}

/**
 * Resolves an ambient SSR provider when a server render has published one.
 */
export function resolveAmbientSsrContextProvider(context: UnknownContext): SsrSerializableContextProvider | undefined {
	return ssrContextProviderResolver?.(context);
}

/** Reads the nearest provider during SSR preparation. Returns undefined outside an active SSR provider scope. */
export function resolveSsrContextValue<T extends UnknownContext>(context: T): ContextType<T> | undefined {
	return resolveAmbientSsrContextProvider(context)?.getContext() as ContextType<T> | undefined;
}
