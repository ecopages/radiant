import { ContextProvider } from '../../context-provider';
import type { ContextHostLike } from '../../context-host';
import { REACTIVE_HOST } from '../../../core/reactive-host';
import type { UnknownContext } from '../../types';
import type { ProvideContextOptions } from '../provide-context';

/**
 * Installs the `@provideContext` provider on a host field.
 *
 * @remarks
 * Standard adapters run this from `addInitializer`. Legacy adapters run it from post-construction
 * so class-field definition does not overwrite the provider.
 */
export function installContextProvider<T extends UnknownContext>(
	host: ContextHostLike,
	propertyKey: string,
	{ context, initialValue, hydrate, serialize }: ProvideContextOptions<T>,
): ContextProvider<T> {
	const hostRecord = host as ContextHostLike & Record<string, unknown>;
	const existing = hostRecord[propertyKey];

	if (existing instanceof ContextProvider) {
		return existing as ContextProvider<T>;
	}

	const provider = new ContextProvider<T>(host, {
		context,
		hydrationKey: propertyKey,
		initialValue,
		hydrate,
		serialize,
	});
	hostRecord[propertyKey] = provider;
	host[REACTIVE_HOST].ssrRegistry.registerContextProvider(propertyKey, provider);
	host.connectedContextCallback(context);
	return provider;
}
