import { installQueryField, type QueryDecoratorHost } from '../shared/query';
import { registerLegacyPostConstructionInitializer } from './instance-initializers';

export type { QueryDecoratorHost };

export function query(
	selector: string,
	all: boolean,
): (proto: QueryDecoratorHost, propertyName: string | symbol) => void {
	return (proto: QueryDecoratorHost, propertyKey: string | symbol) => {
		registerLegacyPostConstructionInitializer(proto, (element) => {
			installQueryField(element, propertyKey, selector, all);
		});
	};
}
