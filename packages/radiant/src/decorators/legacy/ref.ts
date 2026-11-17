import { installRefField, type RefDecoratorHost, type RefFieldConfig } from '../shared/ref';
import { registerLegacyPostConstructionInitializer } from './instance-initializers';

export function ref(config: RefFieldConfig): (proto: RefDecoratorHost, propertyName: string | symbol) => void {
	return (proto: RefDecoratorHost, propertyKey: string | symbol) => {
		registerLegacyPostConstructionInitializer(proto, (element) => {
			installRefField(element, String(propertyKey), config);
		});
	};
}
