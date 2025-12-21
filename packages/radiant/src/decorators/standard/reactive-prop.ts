import type { RadiantElement, ReactivePropertyOptions } from '../../core/radiant-element.js';

export function reactiveProp<P = unknown>({ type, attribute, reflect, defaultValue }: ReactivePropertyOptions<P>) {
	return function <T extends RadiantElement, V>(_: undefined, context: ClassFieldDecoratorContext<T, V>) {
		const propertyName = String(context.name);
		const attributeKey = attribute ?? propertyName;

		context.addInitializer(function (this: T) {
			this.createReactiveProp(propertyName, { type, reflect, attribute: attributeKey, defaultValue });
		});
	};
}
