import { type ReactivePropertyOptions, validateReactivePropertyDefault } from '../../core/reactive-prop-core';
import { registerReactivePropDefinition } from '../../core/reactive-prop-metadata';
import { registerLegacyInstanceInitializer, registerLegacyPostConstructionInitializer } from './instance-initializers';

type ReactivePropHost<T> = {
	createReactiveMember<U>(propertyName: string, initialValue: U): unknown;
	createReactiveProp(propertyName: string, options: ReactivePropertyOptions<T>): void;
	defineReactiveBinding(property: string, bind?: boolean | string): void;
	getReactiveMember<U = unknown>(propertyName: string): { get(): U } | undefined;
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
	validateReactivePropertyDefault(type, defaultValue);

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
		const ssrAssignedKey = Symbol.for(`@ecopages/radiant.ssr-prop-assigned:${propertyName}`);

		Object.defineProperty(target, propertyName, {
			get(this: ReactivePropHost<T> & Record<PropertyKey, unknown>) {
				return this[ssrStoreKey] ?? defaultValue;
			},
			set(this: ReactivePropHost<T> & Record<PropertyKey, unknown>, value: T) {
				this[ssrStoreKey] = value;
				this[ssrAssignedKey] = true;
			},
			configurable: true,
			enumerable: true,
		});

		registerLegacyInstanceInitializer(target, (element) => {
			const host = element as ReactivePropHost<T>;
			if (host.getReactiveMember(propertyName)) {
				return;
			}

			const initializerValue = element[propertyName as keyof typeof element] as T | undefined;
			const bootstrapValue = (initializerValue ?? defaultValue) as T;
			host.createReactiveMember(propertyName, bootstrapValue);

			if (bind !== undefined && bind !== false) {
				host.defineReactiveBinding(propertyName, bind);
			}
		});

		registerLegacyPostConstructionInitializer(target, (element, phase) => {
			const host = element as ReactivePropHost<T> & Record<PropertyKey, unknown>;
			const initializerValue = element[propertyName as keyof typeof element] as T | undefined;
			const wasAssigned = host[ssrAssignedKey] === true;
			const hasOwnStagingValue = Object.prototype.hasOwnProperty.call(element, propertyName);
			const ownStagingValue = hasOwnStagingValue
				? ((element as Record<PropertyKey, unknown>)[propertyName] as T)
				: undefined;
			const resolvedDefaultValue = wasAssigned
				? initializerValue
				: phase === 'ssr' && hasOwnStagingValue && ownStagingValue !== defaultValue
					? ownStagingValue
					: defaultValue === undefined
						? initializerValue
						: defaultValue;

			element.createReactiveProp(propertyName, {
				type,
				reflect,
				attribute: attributeKey,
				defaultValue: resolvedDefaultValue,
				bind,
			});
		});
	};
}
