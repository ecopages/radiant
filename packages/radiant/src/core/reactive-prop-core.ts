import type { JsxBindingSourceValue, JsxRenderable, SubscribableJsxValueWithAccess } from '@ecopages/jsx';
import type { ReactiveState } from './reactivity-contract';
import {
	type AttributeTypeConstant,
	defaultValueForType,
	isValueOfType,
	readAttributeValue,
	writeAttributeValue,
} from '../utils/attribute-utils';

type StringPropertyKey<Value> = Extract<keyof Value, string>;

/** Custom attribute ↔ property conversion for `@prop`. */
export type PropTransform<T> = {
	fromAttribute?: (value: string | null) => T;
	toAttribute?: (value: T) => string | null;
	fromProperty?: (value: unknown) => T;
};

export interface ReactiveProperty<T = unknown> {
	type: AttributeTypeConstant;
	initialValue?: T;
	/** Declared `@prop` default; `true` booleans serialize as `"true"` / `"false"` instead of HTML presence. */
	defaultValue?: T;
	name: string;
	attribute: string;
	reflect: boolean;
	converter: {
		fromAttribute: (value: string | null) => unknown;
		toAttribute: (value: unknown) => string | null;
	};
}

/** True-default booleans must round-trip `"false"` through SSR and client reflection. */
export function reflectsBooleanAsValue(property: Pick<ReactiveProperty, 'type' | 'defaultValue'>): boolean {
	return property.type === Boolean && property.defaultValue === true;
}

export type ReactivePropertyOptions<T, C extends AttributeTypeConstant = AttributeTypeConstant> = {
	/**
	 * Parses the attribute and serializes reflected values.
	 *
	 * @remarks
	 * `@prop` checks the field against it: `type: Number` needs a `number` field,
	 * `null` and `undefined` allowed, and a field of several parsed types, such as
	 * `string | number`, fits no constant, and neither does a field typed by a
	 * type parameter of a generic host. Standard decorators check the declared
	 * field; legacy decorators check only an explicit generic. A `transform.fromAttribute`
	 * parser owns the value type instead, and then `type` is not checked. The
	 * parser must be part of the option's type, so pass it inline or with
	 * `satisfies`: a value annotated as `PropTransform<T>` has it optional. The runtime
	 * checks `defaultValue` against `type` only without a parser, and accepts `null`.
	 */
	type: C;
	reflect?: boolean;
	attribute?: string;
	/**
	 * Value used when no attribute or earlier property write supplies one.
	 *
	 * @remarks Omit it for the type default (`0`, `''`, `null`). Pass
	 * `defaultValue: undefined` for a property that stays `undefined` until set.
	 */
	defaultValue?: T;
	bind?: boolean | string;
	/** Overrides default type converters for the attribute channel and optional JS writes. */
	transform?: PropTransform<T>;
};

export type ReactiveBindingOption = boolean | string;

export type ReactiveFieldOptions = {
	bind?: ReactiveBindingOption;
	/** When true, skip the initial notifyUpdate emitted while defining the field. */
	suppressInitialNotify?: boolean;
};

export type ReactiveBindingValue<
	Host extends object,
	Property extends StringPropertyKey<Host>,
> = Host[Property] extends JsxBindingSourceValue ? Host[Property] : JsxRenderable;

export type ReactiveBindings<Bindings extends object> = {
	readonly [Property in StringPropertyKey<Bindings>]: SubscribableJsxValueWithAccess<
		ReactiveBindingValue<Bindings, Property>
	>;
};

export type ReactiveAccessorDefinition<T> = {
	bind?: ReactiveBindingOption;
	signal: ReactiveState<T>;
	onSet?: (value: T) => void;
	/** Normalizes JS property writes before the reactive member is updated. */
	fromProperty?: (value: unknown) => T;
};

/**
 * Default used when no attribute or earlier write supplies a value.
 *
 * @remarks Omit `defaultValue` for the type default (`0`, `''`, `null`).
 * Booleans stay `undefined` until set unless `defaultValue` is passed.
 * `defaultValue: undefined` stays `undefined` instead of the type default.
 */
export function resolveReactiveDefault<T>(options: ReactivePropertyOptions<T>): T | undefined {
	if ('defaultValue' in options || options.type === Boolean) {
		return options.defaultValue;
	}
	return defaultValueForType(options.type) as T;
}

/**
 * Throws when `defaultValue` does not fit `type`.
 *
 * @remarks
 * `undefined` and `null` always pass: `null` is the type default of `Array` and
 * `Object`, and a `T | null` field may start empty. With a parser
 * (`hasParser`, from `transform.fromAttribute` or `converter.fromAttribute`) the
 * parser owns the value type and `type` only selects the attribute channel, so
 * the check is skipped.
 */
export function validateReactivePropertyDefault(
	type: AttributeTypeConstant,
	defaultValue: unknown,
	hasParser: boolean,
): void {
	if (!hasParser && defaultValue != null && !isValueOfType(type, defaultValue)) {
		throw new Error(`defaultValue does not match the expected type for ${type.name}`);
	}
}

/**
 * Builds the runtime attribute converter for a `@prop`.
 *
 * @remarks `PropTransform` is declaration-time. This converter is what
 * construction, `attributeChangedCallback`, reflection, and SSR consult.
 */
export function createPropConverter<T>(
	type: AttributeTypeConstant,
	transform?: PropTransform<T>,
): ReactiveProperty<T>['converter'] {
	return {
		fromAttribute: (value) => {
			if (transform?.fromAttribute) {
				return transform.fromAttribute(value);
			}
			if (value === null) {
				return type === Boolean ? false : value;
			}
			if (type === Boolean && value === '') {
				return true;
			}
			return readAttributeValue(value, type);
		},
		toAttribute: (value) => {
			const serialized = transform?.toAttribute
				? transform.toAttribute(value as T)
				: writeAttributeValue(value, type);
			return serialized == null || serialized === '' ? null : String(serialized);
		},
	};
}

export function createReactivePropertyMapping<T>(
	propertyName: string,
	attributeKey: string,
	type: AttributeTypeConstant,
	initialValue: T | undefined,
	reflect = false,
	transform?: PropTransform<T>,
): ReactiveProperty<T> {
	return {
		type,
		name: propertyName,
		initialValue,
		attribute: attributeKey,
		reflect,
		converter: createPropConverter(type, transform),
	};
}
