import {
	type PropTransform,
	type ReactivePropertyOptions,
	validatePropertyOnlyReflection,
	validateReactivePropertyDefault,
} from '../../core/reactive-prop-core';
import type { ReactiveHostLike } from '../../core/reactive-host';
import { attributeNameForProp, registerReactivePropDefinition } from '../../core/reactive-prop-metadata';
import { registerLegacyInstanceInitializer, registerLegacyPostConstructionInitializer } from './instance-initializers';
import { bootstrapReactiveMember } from './member-bootstrap';
import { warnInitializerWithDefaultValue } from '../shared/initializer-default-warning';
import type { ReactivePropHost } from '../standard/reactive-prop';

/**
 * Legacy-decorator implementation for `@prop(...)`.
 *
 * The decorated host is expected to expose `createReactiveProp(...)`, which
 * lets both `RadiantElement` and `RadiantController` share the same public
 * decorator while keeping their runtime channels different.
 *
 * @remarks Setup runs when the most derived class's constructor ends, which `@customElement` and `@controller`
 * arrange, so an own value found then is a field initializer and behaves as under the standard decorators: a
 * differing `defaultValue` wins over it (and development builds warn), and a value the host held wins over both.
 * A later write goes through the accessor and wins over all of them. A class registered without those decorators
 * is set up at first connect, where an initializer and a write are indistinguishable; on a Controller Host
 * `RadiantController` treats any own value found then as the author's.
 */
export function reactiveProp<T = unknown>(propOptions: ReactivePropertyOptions<T>) {
	const { type, reflect, defaultValue, transform } = propOptions;
	const hasDefaultValue = 'defaultValue' in propOptions;
	validateReactivePropertyDefault(type, defaultValue, !!transform?.fromAttribute);

	return (target: ReactivePropHost<T>, propertyName: string) => {
		validatePropertyOnlyReflection(propertyName, propOptions as ReactivePropertyOptions<unknown>);
		const attributeKey = attributeNameForProp(propertyName, propOptions);
		const options: ReactivePropertyOptions<unknown> = {
			type,
			reflect,
			attribute: attributeKey ?? false,
			defaultValue,
			transform: transform as PropTransform<unknown> | undefined,
		};

		registerReactivePropDefinition(target, propertyName, options);

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
			const initializerValue = element[propertyName as keyof typeof element] as T | undefined;
			const bootstrapValue = (initializerValue ?? defaultValue) as T;
			bootstrapReactiveMember(element as unknown as ReactiveHostLike, propertyName, bootstrapValue);
		});

		registerLegacyPostConstructionInitializer(target, (element, phase) => {
			const host = element as ReactivePropHost<T> & Record<PropertyKey, unknown>;
			const initializerValue = element[propertyName as keyof typeof element] as T | undefined;
			const wasAssigned = host[ssrAssignedKey] === true;
			const ownStagingValue = Object.prototype.hasOwnProperty.call(element, propertyName)
				? ((element as Record<PropertyKey, unknown>)[propertyName] as T)
				: undefined;

			if (phase === 'constructed' && !wasAssigned) {
				warnInitializerWithDefaultValue(
					element,
					propertyName,
					ownStagingValue,
					defaultValue,
					target.constructor,
				);
			}

			const resolvedDefaultValue = wasAssigned
				? initializerValue
				: phase === 'ssr' && ownStagingValue !== undefined
					? ownStagingValue
					: defaultValue === undefined
						? initializerValue
						: defaultValue;

			element.createReactiveProp(propertyName, {
				type,
				reflect,
				attribute: attributeKey ?? false,
				transform,
				...((hasDefaultValue || resolvedDefaultValue !== undefined) && {
					defaultValue: resolvedDefaultValue,
				}),
			});
		});
	};
}
