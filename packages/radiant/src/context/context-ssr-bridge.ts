import type { SsrSerializableContextProvider } from './context-provider';
import type { UnknownContext } from './types';

type SsrContextProviderResolver = (context: UnknownContext) => SsrSerializableContextProvider | undefined;

const SSR_CONTEXT_PROVIDER_RESOLVER_SYMBOL = Symbol.for('@ecopages/radiant.ssr-context-provider-resolver');

type GlobalResolverScope = typeof globalThis & {
	[SSR_CONTEXT_PROVIDER_RESOLVER_SYMBOL]?: SsrContextProviderResolver;
};

function getGlobalResolverScope(): GlobalResolverScope {
	return globalThis as GlobalResolverScope;
}

/**
 * Installs the ambient SSR provider resolver used by shared context runtime helpers.
 *
 * Server-side rendering infrastructure owns the actual provider stack storage and
 * publishes a lookup function here so client/runtime code does not need to import
 * server-oriented modules.
 */
export function installSsrContextProviderResolver(resolver: SsrContextProviderResolver): void {
	getGlobalResolverScope()[SSR_CONTEXT_PROVIDER_RESOLVER_SYMBOL] = resolver;
}

/**
 * Resolves an ambient SSR provider when a server render has published one.
 */
export function resolveAmbientSsrContextProvider(context: UnknownContext): SsrSerializableContextProvider | undefined {
	return getGlobalResolverScope()[SSR_CONTEXT_PROVIDER_RESOLVER_SYMBOL]?.(context);
}
