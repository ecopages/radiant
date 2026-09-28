import { installReactiveAttribute, type AttrOptions, type ReactiveAttributeHostLike } from '../shared/reactive-attr';

export function reactiveAttr<TValue = string | undefined>(options: AttrOptions<TValue> = {}) {
	return function <THost extends ReactiveAttributeHostLike>(
		target: undefined,
		context: ClassFieldDecoratorContext<THost, TValue>,
	) {
		void target;
		const propertyName = String(context.name);
		const initializerValueKey = Symbol(`@ecopages/radiant/attr:${propertyName}:initializer`);

		context.addInitializer(function (this: THost) {
			const initializerValue = (this as Record<PropertyKey, TValue | undefined>)[initializerValueKey];
			const defaultValue = (options.defaultValue === undefined ? initializerValue : options.defaultValue) as
				TValue | undefined;

			installReactiveAttribute(this, propertyName, {
				...options,
				defaultValue,
			});
		});

		return function (this: THost, value: TValue) {
			(this as Record<PropertyKey, TValue | undefined>)[initializerValueKey] = value;
			return value;
		};
	};
}
