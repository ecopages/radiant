import {
	type PropTransform,
	type ReactivePropertyOptions,
	validatePropertyOnlyReflection,
	validateReactivePropertyDefault,
} from '../../core/reactive-prop-core';
import type { ReactiveHostLike } from '../../core/reactive-host';
import { attributeNameForProp, registerReactivePropDefinition } from '../../core/reactive-prop-metadata';
import { isControllerHost } from '../../helpers/resolve-host-element';
import { registerLegacyInstanceInitializer, registerLegacyPostConstructionInitializer } from './instance-initializers';
import { bootstrapReactiveMember } from './member-bootstrap';
import type { ReactivePropHost } from '../standard/reactive-prop';

/**
 * Legacy-decorator implementation for `@prop(...)`.
 *
 * The decorated host is expected to expose `createReactiveProp(...)`, which
 * lets both `RadiantElement` and `RadiantController` share the same public
 * decorator while keeping their runtime channels different.
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

		/**
		 * @remarks
		 * A Controller Host has no construction-end hook, so this runs at its first connect and cannot tell a
		 * write made after `new` from a field initializer: both are an own data property. A defined own value that
		 * differs from the decorator default is replayed through the accessor once it exists, matching the standard
		 * decorators, where it is an ordinary write. As a consequence a legacy controller field initializer that
		 * differs from an explicit `defaultValue` wins over it, unlike on an Element Host.
		 */
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
				: phase === 'ssr' && ownStagingValue !== undefined && ownStagingValue !== defaultValue
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

			if (
				phase === 'connect' &&
				!wasAssigned &&
				isControllerHost(element) &&
				ownStagingValue !== undefined &&
				ownStagingValue !== resolvedDefaultValue
			) {
				Reflect.set(element, propertyName, ownStagingValue);
			}
		});
	};
}
