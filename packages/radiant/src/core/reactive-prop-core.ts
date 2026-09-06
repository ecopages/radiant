import type { JsxBindingSourceValue, JsxRenderable, SubscribableJsxValueWithAccess } from '@ecopages/jsx';
import type { ReactiveState } from './reactivity-contract';
import {
	type AttributeTypeConstant,
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
	name: string;
	attribute: string;
	reflect: boolean;
	converter: {
		fromAttribute: (value: string | null) => unknown;
		toAttribute: (value: unknown) => string | null;
	};
}

export type ReactivePropertyOptions<T> = {
	type: AttributeTypeConstant;
	reflect?: boolean;
	attribute?: string;
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

export function validateReactivePropertyDefault(type: AttributeTypeConstant, defaultValue: unknown): void {
	if (defaultValue !== undefined && !isValueOfType(type, defaultValue)) {
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
