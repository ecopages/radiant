import type { JsxBindingSourceValue, JsxRenderable, SubscribableJsxValueWithAccess } from '@ecopages/jsx';
import type { ReactiveState } from './reactivity-contract';
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
	initialValue?: T;
	name: string;
	attribute: string;
	reflect: boolean;
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
	reflect = false,
): ReactiveProperty<T> {
	return {
		type,
		name: propertyName,
		initialValue,
		attribute: attributeKey,
		reflect,
		converter: {
			fromAttribute: (value) => readAttributeValue(value, type),
			toAttribute: (value) => writeAttributeValue(value, type),
		},
	};
}
