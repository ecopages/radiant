import type { ReactivePropertyOptions } from '../../core/reactive-prop-core.js';
import { registerReactivePropDefinition } from '../../core/reactive-prop-metadata';
import { isValueOfType } from '../../utils/attribute-utils';

type ReactivePropHost<P> = {
	createReactiveProp(propertyName: string, options: ReactivePropertyOptions<P>): void;
};

/**
 * Standard-decorator implementation for `@prop(...)`.
 *
 * The decorated host is expected to expose `createReactiveProp(...)`, which
 * lets both `RadiantElement` and `RadiantController` share the same public
 * decorator while keeping their runtime channels different.
 */
export function reactiveProp<P = unknown>({
	type,
	attribute,
	reflect,
	defaultValue,
	bind,
}: ReactivePropertyOptions<P>) {
	if (defaultValue !== undefined && !isValueOfType(type, defaultValue)) {
		throw new Error(`defaultValue does not match the expected type for ${type.name}`);
	}
	return function <T extends ReactivePropHost<P>, V>(_: undefined, context: ClassFieldDecoratorContext<T, V>) {
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
