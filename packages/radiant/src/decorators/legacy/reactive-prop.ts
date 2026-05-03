import type { ReactivePropertyOptions } from '../../core/radiant-element';
import { registerReactivePropDefinition } from '../../core/reactive-prop-metadata';
import { isValueOfType } from '../../utils/attribute-utils';
import { registerLegacyInstanceInitializer } from './instance-initializers';

type ReactivePropHost<T> = {
	createReactiveProp(propertyName: string, options: ReactivePropertyOptions<T>): void;
	registerConnectedCallback(callback: () => void): void;
};

/**
 * Legacy-decorator implementation for `@prop(...)`.
 *
 * The decorated host is expected to expose `createReactiveProp(...)`, which
 * lets both `RadiantElement` and `RadiantController` share the same public
 * decorator while keeping their runtime channels different.
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

	return (target: ReactivePropHost<T>, propertyName: string) => {
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
			get(this: ReactivePropHost<T> & Record<PropertyKey, unknown>) {
				return this[ssrStoreKey] ?? defaultValue;
			},
			set(this: ReactivePropHost<T> & Record<PropertyKey, unknown>, value: T) {
				this[ssrStoreKey] = value;
			},
			configurable: true,
			enumerable: true,
		});

		registerLegacyInstanceInitializer(target, (element) => {
			element.registerConnectedCallback(() => {
				const initializerValue = element[propertyName as keyof typeof element] as T | undefined;
				const resolvedDefaultValue = defaultValue === undefined ? initializerValue : defaultValue;

				element.createReactiveProp(propertyName, {
					type,
					reflect,
					attribute: attributeKey,
					defaultValue: resolvedDefaultValue,
					bind,
				});
			});
		});
	};
}
