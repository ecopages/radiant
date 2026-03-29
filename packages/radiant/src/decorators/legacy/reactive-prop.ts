import type { RadiantElement } from '../../core/radiant-element';
import { registerReactivePropDefinition } from '../../core/reactive-prop-metadata';
import { type AttributeTypeConstant, isValueOfType } from '../../utils/attribute-utils';

type ReactivePropertyOptions<T> = {
	type: AttributeTypeConstant;
	reflect?: boolean;
	attribute?: string;
	defaultValue?: T;
	bind?: boolean | string;
};

/**
 * A decorator to define a reactive property.
 * Every time the property changes, the `updated` method will be called.
 * @param options The options for the reactive property.
 * @param options.type The type of the property value.
 * @param options.reflect Whether to reflect the property to the attribute.
 * @param options.attribute The name of the attribute.
 * @param options.defaultValue The default value of the property.
 */
export function reactiveProp<T = unknown>({
	type,
	attribute,
	reflect,
	defaultValue,
	bind,
}: ReactivePropertyOptions<T>) {
	if (defaultValue !== undefined && !isValueOfType(type, defaultValue)) {
		throw new Error(`defaultValue does not match the expected type for ${type.name}`);
	}

	return (target: RadiantElement, propertyName: string) => {
		const attributeKey = attribute ?? propertyName;
		registerReactivePropDefinition(target, propertyName, {
			type,
			reflect,
			attribute: attributeKey,
			defaultValue,
			bind,
		});

		const ssrStoreKey = Symbol.for(`@ecopages/radiant.ssr-prop:${propertyName}`);

		Object.defineProperty(target, propertyName, {
			get(this: RadiantElement & Record<PropertyKey, unknown>) {
				return this[ssrStoreKey] ?? defaultValue;
			},
			set(this: RadiantElement & Record<PropertyKey, unknown>, value: T) {
				this[ssrStoreKey] = value;
			},
			configurable: true,
			enumerable: true,
		});

		const originalConnectedCallback = target.connectedCallback;

		target.connectedCallback = function (this: RadiantElement) {
			const initializerValue = this[propertyName as keyof typeof this] as T | undefined;
			const resolvedDefaultValue = defaultValue === undefined ? initializerValue : defaultValue;

			originalConnectedCallback.call(this);
			this.createReactiveProp(propertyName, {
				type,
				reflect,
				attribute: attributeKey,
				defaultValue: resolvedDefaultValue,
				bind,
			});
		};
	};
}
