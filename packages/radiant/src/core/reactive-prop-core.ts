import type { JsxRenderable, SubscribableJsxValue } from '@ecopages/jsx';
import {
	type AttributeTypeConstant,
	type ReadAttributeValueReturnType,
	type WriteAttributeValueReturnType,
	isValueOfType,
	readAttributeValue,
	writeAttributeValue,
} from '../utils/attribute-utils';

type StringPropertyKey<Value> = Extract<keyof Value, string>;

export interface ReactiveProperty<T = unknown> {
	type: AttributeTypeConstant;
	value?: T;
	initialValue?: T;
	name: string;
	attribute: string;
	converter: {
		fromAttribute: (value: string) => ReadAttributeValueReturnType;
		toAttribute: (value: any) => WriteAttributeValueReturnType;
	};
}

export type ReactivePropertyOptions<T> = {
	type: AttributeTypeConstant;
	reflect?: boolean;
	attribute?: string;
	defaultValue?: T;
	bind?: boolean | string;
};

export type ReactiveBindingOption = boolean | string;

export type ReactiveFieldOptions = {
	bind?: ReactiveBindingOption;
	/** When true, skip the initial notifyUpdate emitted while defining the field. */
	suppressInitialNotify?: boolean;
};

export type ReactiveField<T = unknown> = {
	name: string;
	value: T;
	initialValue: T;
};

export type ReactiveBindingValue<
	Host extends object,
	Property extends StringPropertyKey<Host>,
> = Host[Property] extends JsxRenderable ? Host[Property] : JsxRenderable;

export type ReactiveBindings<Bindings extends object> = {
	readonly [Property in StringPropertyKey<Bindings>]: SubscribableJsxValue<ReactiveBindingValue<Bindings, Property>>;
};

export type ReactiveAccessorDefinition<T> = {
	bind?: ReactiveBindingOption;
	getValue: () => T | undefined;
	setValue: (value: T) => void;
};

export function validateReactivePropertyDefault(type: AttributeTypeConstant, defaultValue: unknown): void {
	if (defaultValue !== undefined && !isValueOfType(type, defaultValue)) {
		throw new Error(`defaultValue does not match the expected type for ${type.name}`);
	}
}

export function createReactivePropertyMapping<T>(
	propertyName: string,
	attributeKey: string,
	type: AttributeTypeConstant,
	initialValue: T | undefined,
): ReactiveProperty<T> {
	return {
		type,
		name: propertyName,
		value: initialValue,
		initialValue,
		attribute: attributeKey,
		converter: {
			fromAttribute: (value) => readAttributeValue(value, type),
			toAttribute: (value) => writeAttributeValue(value, type),
		},
	};
}
