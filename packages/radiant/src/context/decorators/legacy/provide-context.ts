import { ContextProvider } from '../../../context/context-provider';
import type { UnknownContext } from '../../../context/types';
import type { ContextHostLike } from '../../context-host';
import { registerLegacyPostConstructionInitializer } from '../../../decorators/legacy/instance-initializers';
import type { ProvideContextOptions } from '../provide-context';

export function provideContext<T extends UnknownContext>({
	context,
	initialValue,
	hydrate,
	serialize,
}: ProvideContextOptions<T>) {
	return (proto: ContextHostLike, propertyKey: string) => {
		const initializeProvider = (element: ContextHostLike) => {
			if ((element as any)[propertyKey]) {
				return;
			}

			const provider = new ContextProvider<T>(element, {
				context,
				hydrationKey: propertyKey,
				initialValue,
				hydrate,
				serialize,
			});
			(element as any)[propertyKey] = provider;
			element.registerContextProvider(propertyKey, provider);
			element.connectedContextCallback(context);
		};

		registerLegacyPostConstructionInitializer(proto, (element, _phase) => {
			initializeProvider(element);
			element.registerConnectedCallback(() => {
				initializeProvider(element);
			});
		});
	};
}
