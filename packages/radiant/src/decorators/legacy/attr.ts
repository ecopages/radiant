import { installReactiveAttribute, type AttrOptions, type ReactiveAttributeHostLike } from '../shared/reactive-attr';
import { registerLegacyPostConstructionInitializer } from './instance-initializers';

export function reactiveAttr<TValue = string | undefined>(options: AttrOptions<TValue> = {}) {
	return (target: ReactiveAttributeHostLike, propertyName: string) => {
		registerLegacyPostConstructionInitializer(
			target,
			(host) => {
				const initializerValue = (host as unknown as Record<PropertyKey, TValue | undefined>)[propertyName];
				const defaultValue = (options.defaultValue === undefined ? initializerValue : options.defaultValue) as
					TValue | undefined;

				installReactiveAttribute(host as ReactiveAttributeHostLike, propertyName, {
					...options,
					defaultValue,
				});
			},
			propertyName,
		);
	};
}
