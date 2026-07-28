import { type ReactivePropertyOptions, validateReactivePropertyDefault } from '../../core/reactive-prop-core.js';
import {
	REACTIVE_PROP_METADATA,
	type ReactivePropDefinition,
	registerReactivePropDefinition,
} from '../../core/reactive-prop-metadata';

type ReactivePropHost<P> = {
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
export function reactiveProp<P = unknown>({
	type,
	attribute,
	reflect,
	defaultValue,
	bind,
}: ReactivePropertyOptions<P>) {
	validateReactivePropertyDefault(type, defaultValue);
	return function <T extends ReactivePropHost<P>, V>(_: undefined, context: ClassFieldDecoratorContext<T, V>) {
		const propertyName = String(context.name);
		const attributeKey = attribute ?? propertyName;
		const initializerValueKey = Symbol(`@ecopages/radiant/reactive-prop:${propertyName}:initializer`);
		const options: ReactivePropertyOptions<unknown> = {
			type,
			reflect,
			attribute: attributeKey,
			defaultValue,
			bind,
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
			const initializerValue = (this as T & Record<PropertyKey, V | undefined>)[initializerValueKey];
			const resolvedDefaultValue = (defaultValue === undefined ? initializerValue : defaultValue) as
				P | undefined;

			registerReactivePropDefinition(this, propertyName, options);
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
