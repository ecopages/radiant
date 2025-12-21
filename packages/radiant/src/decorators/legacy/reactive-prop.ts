import type { RadiantElement } from '../../core/radiant-element';
import { type AttributeTypeConstant, isValueOfType } from '../../utils/attribute-utils';

type ReactivePropertyOptions<T> = {
	type: AttributeTypeConstant;
	reflect?: boolean;
	attribute?: string;
	defaultValue?: T;
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
export function reactiveProp<T = unknown>({ type, attribute, reflect, defaultValue }: ReactivePropertyOptions<T>) {
	if (defaultValue !== undefined && !isValueOfType(type, defaultValue)) {
		throw new Error(`defaultValue does not match the expected type for ${type.name}`);
	}

	return (target: RadiantElement, propertyName: string) => {
		const attributeKey = attribute ?? propertyName;

		const originalConnectedCallback = target.connectedCallback;

		target.connectedCallback = function (this: RadiantElement) {
			originalConnectedCallback.call(this);
			this.createReactiveProp(propertyName, {
				type,
				reflect,
				attribute: attributeKey,
				defaultValue,
			});
		};
	};
}
