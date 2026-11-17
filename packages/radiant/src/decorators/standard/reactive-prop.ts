import {
	type PropTransform,
	type ReactivePropertyOptions,
	validatePropertyOnlyReflection,
	validateReactivePropertyDefault,
} from '../../core/reactive-prop-core.js';
import {
	REACTIVE_PROP_METADATA,
	attributeNameForProp,
	type ReactivePropDefinition,
	registerReactivePropDefinition,
} from '../../core/reactive-prop-metadata';
import { warnInitializerWithDefaultValue } from '../shared/initializer-default-warning';

export type ReactivePropHost<P> = {
	createReactiveProp(propertyName: string, options: ReactivePropertyOptions<P>): void;
};

/**
 * Standard-decorator implementation for `@prop(...)`.
 *
 * The decorated host is expected to expose `createReactiveProp(...)`, which
 * lets both `RadiantElement` and `RadiantController` share the same public
 * decorator while keeping their runtime channels different.
 *
 * Prop metadata is written to `context.metadata` during class evaluation so
 * `@customElement` can populate `observedAttributes` before `customElements.define`.
 */
export function reactiveProp<P = unknown>(propOptions: ReactivePropertyOptions<P>) {
	const { type, reflect, defaultValue, transform } = propOptions;
	const hasDefaultValue = 'defaultValue' in propOptions;
	validateReactivePropertyDefault(type, defaultValue, !!transform?.fromAttribute);
	return function <T extends ReactivePropHost<P>>(_: undefined, context: ClassFieldDecoratorContext<T, P>) {
		const propertyName = String(context.name);
		validatePropertyOnlyReflection(propertyName, propOptions as ReactivePropertyOptions<unknown>);
		const attributeKey = attributeNameForProp(propertyName, propOptions);
		const initializerValueKey = Symbol(`@ecopages/radiant/reactive-prop:${propertyName}:initializer`);
		const options: ReactivePropertyOptions<unknown> = {
			type,
			reflect,
			attribute: attributeKey ?? false,
			defaultValue,
			transform: transform as PropTransform<unknown> | undefined,
		};

		const metadata = context.metadata as Record<symbol, ReactivePropDefinition[]> | null;
		if (metadata) {
			let definitions = metadata[REACTIVE_PROP_METADATA];
			if (!Object.hasOwn(metadata, REACTIVE_PROP_METADATA)) {
				definitions = definitions ? [...definitions] : [];
				metadata[REACTIVE_PROP_METADATA] = definitions;
			}

			if (!definitions.some((definition) => definition.name === propertyName)) {
				definitions.push({ name: propertyName, options });
			}
		}

		context.addInitializer(function (this: T) {
			const initializerValue = (this as T & Record<PropertyKey, P | undefined>)[initializerValueKey];
			const resolvedDefaultValue = defaultValue === undefined ? initializerValue : defaultValue;
			warnInitializerWithDefaultValue(
				() => declaringClass(this, context.metadata),
				propertyName,
				initializerValue,
				defaultValue,
			);

			registerReactivePropDefinition(this, propertyName, options);
			this.createReactiveProp(propertyName, {
				type,
				reflect,
				attribute: attributeKey ?? false,
				transform,
				...((hasDefaultValue || resolvedDefaultValue !== undefined) && { defaultValue: resolvedDefaultValue }),
			});
		});

		return function (this: T, value: P) {
			(this as Record<PropertyKey, P | undefined>)[initializerValueKey] = value;
			return value;
		};
	};
}

const METADATA_KEY: symbol = (Symbol as { metadata?: symbol }).metadata ?? Symbol.for('Symbol.metadata');

/**
 * Finds the class on `host`'s chain whose own decorator metadata is `metadata`, so a prop is attributed to the class
 * that declares it rather than the most derived one. Falls back to the host's constructor when the runtime attaches
 * no metadata.
 */
function declaringClass(host: object, metadata: object | null | undefined): Function {
	for (
		let prototype = Object.getPrototypeOf(host);
		prototype && prototype !== Object.prototype;
		prototype = Object.getPrototypeOf(prototype)
	) {
		const constructor = Object.getOwnPropertyDescriptor(prototype, 'constructor')?.value as Function | undefined;

		if (constructor && metadata && Object.getOwnPropertyDescriptor(constructor, METADATA_KEY)?.value === metadata) {
			return constructor;
		}
	}

	return host.constructor;
}
