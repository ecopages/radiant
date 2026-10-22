import { createQuery } from '../../helpers/create-query';
import type { QueryConfig } from '../query';
import { registerLegacyInstanceInitializer } from './instance-initializers';

export type QueryDecoratorHost = (Element | { host: Element }) & {
	registerConnectedCallback(callback: () => void): void;
};

export function query(options: QueryConfig): (proto: QueryDecoratorHost, propertyName: string | symbol) => void {
	return (proto: QueryDecoratorHost, propertyKey: string | symbol) => {
		registerLegacyInstanceInitializer(proto, (element) => {
			element.registerConnectedCallback(() => {
				const accessor = createQuery(element, options);

				Object.defineProperty(element, propertyKey, {
					get() {
						return accessor.value;
					},
					enumerable: true,
					configurable: true,
				});
			});
		});
	};
}
