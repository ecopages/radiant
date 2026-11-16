import type { UnknownContext } from '../../../context/types';
import type { ContextHostLike } from '../../context-host';
import { registerLegacyPostConstructionInitializer } from '../../../decorators/legacy/instance-initializers';
import type { ProvideContextOptions } from '../provide-context';
import { installContextProvider } from '../shared/provide-context';

export function provideContext<T extends UnknownContext>(options: ProvideContextOptions<T>) {
	return (proto: ContextHostLike, propertyKey: string) => {
		registerLegacyPostConstructionInitializer(
			proto,
			(element) => {
				installContextProvider(element, propertyKey, options);
				element.registerConnectedCallback(() => {
					installContextProvider(element, propertyKey, options);
				});
			},
			propertyKey,
		);
	};
}
