import { ContextProvider } from '../../../context/context-provider';
import type { UnknownContext } from '../../../context/types';
import type { RadiantElement } from '../../../core/radiant-element';
import { registerLegacyInstanceInitializer } from '../../../decorators/legacy/instance-initializers';
import type { ProvideContextOptions } from '../provide-context';

export function provideContext<T extends UnknownContext>({ context, initialValue, hydrate }: ProvideContextOptions<T>) {
	return (proto: RadiantElement, propertyKey: string) => {
		const initializeProvider = (element: RadiantElement) => {
			if ((element as any)[propertyKey]) {
				return;
			}

			const provider = new ContextProvider<T>(element, {
				context,
				hydrationKey: propertyKey,
				initialValue,
				hydrate,
			});
			(element as any)[propertyKey] = provider;
			element.registerContextProvider(propertyKey, provider);
			element.connectedContextCallback(context);
		};

		registerLegacyInstanceInitializer(proto, initializeProvider);
		const originalConnectedCallback = proto.connectedCallback;

		proto.connectedCallback = function (this: RadiantElement) {
			initializeProvider(this);
			originalConnectedCallback.call(this);
		};
	};
}
