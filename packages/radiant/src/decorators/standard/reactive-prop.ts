import type { RadiantElement, ReactivePropertyOptions } from '../../core/radiant-element.js';
import { registerReactivePropDefinition } from '../../core/reactive-prop-metadata';

export function reactiveProp<P = unknown>({
	type,
	attribute,
	reflect,
	defaultValue,
	bind,
}: ReactivePropertyOptions<P>) {
	return function <T extends RadiantElement, V>(_: undefined, context: ClassFieldDecoratorContext<T, V>) {
		const propertyName = String(context.name);
		const attributeKey = attribute ?? propertyName;
		const initializerValueKey = Symbol(`@ecopages/radiant/reactive-prop:${propertyName}:initializer`);

		context.addInitializer(function (this: T) {
			const initializerValue = (this as T & Record<PropertyKey, V | undefined>)[initializerValueKey];
			const resolvedDefaultValue = (defaultValue === undefined ? initializerValue : defaultValue) as
				| P
				| undefined;

			registerReactivePropDefinition(this, propertyName, {
				type,
				reflect,
				attribute: attributeKey,
				defaultValue,
				bind,
			});
			this.createReactiveProp(propertyName, {
				type,
				reflect,
				attribute: attributeKey,
				defaultValue: resolvedDefaultValue,
				bind,
			});
		});

		return function (this: T, value: V) {
			(this as Record<PropertyKey, V | undefined>)[initializerValueKey] = value;
			return value;
		};
	};
}
