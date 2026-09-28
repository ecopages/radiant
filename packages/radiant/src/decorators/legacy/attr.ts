import { installReactiveAttribute, type AttrOptions, type ReactiveAttributeHostLike } from '../shared/reactive-attr';
import { registerLegacyInstanceInitializer } from './instance-initializers';

export function reactiveAttr<TValue = string | undefined>(options: AttrOptions<TValue> = {}) {
	return (target: ReactiveAttributeHostLike, propertyName: string) => {
		const installedKey = Symbol(`@ecopages/radiant/attr:${propertyName}:installed`);

		registerLegacyInstanceInitializer(target, (host) => {
			(host as ReactiveAttributeHostLike).registerConnectedCallback(() => {
				if ((host as unknown as Record<PropertyKey, unknown>)[installedKey]) {
					return;
				}

				const initializerValue = (host as unknown as Record<PropertyKey, TValue | undefined>)[propertyName];
				const defaultValue = (options.defaultValue === undefined ? initializerValue : options.defaultValue) as
					TValue | undefined;

				installReactiveAttribute(host as ReactiveAttributeHostLike, propertyName, {
					...options,
					defaultValue,
				});

				(host as unknown as Record<PropertyKey, unknown>)[installedKey] = true;
			});
		});
	};
}
