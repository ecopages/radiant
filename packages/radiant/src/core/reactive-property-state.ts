import {
	createReactivePropertyMapping,
	type ReactiveAccessorDefinition,
	type ReactiveProperty,
	type ReactivePropertyOptions,
	validateReactivePropertyDefault,
} from './reactive-prop-core';
import { type AttributeTypeConstant } from '../utils/attribute-utils';

export type ReactivePropertyStateHost = HTMLElement & {
	notifyUpdate(changedProperty: string, oldValue: unknown, value: unknown): void;
};

export class ReactivePropertyState {
	private readonly properties = new Map<string, ReactiveProperty>();
	private readonly preUpgradePropertyValues = new Map<string, unknown>();

	constructor(private readonly host: ReactivePropertyStateHost) {
		for (const propertyName of Object.getOwnPropertyNames(host)) {
			this.preUpgradePropertyValues.set(propertyName, Reflect.get(host, propertyName));
		}
	}

	public register(config: ReactiveProperty): void {
		this.properties.set(config.name, config);
	}

	public getAll(): ReactiveProperty[] {
		return Array.from(this.properties.values());
	}

	public applyAttributeChange(name: string, oldValue: string | null, newValue: string | null): void {
		const config = this.properties.get(name);

		if (!config) {
			return;
		}

		const transformedValue = this.transformAttributeValue(newValue, config);
		const transformedOldValue = this.transformAttributeValue(oldValue, config);

		Reflect.set(this.host, config.attribute, transformedValue);
		this.host.notifyUpdate(name, transformedOldValue, transformedValue);
	}

	public create<T>(
		propertyName: string,
		options: ReactivePropertyOptions<T>,
		resolveInitialValue: (type: AttributeTypeConstant, attributeKey: string, defaultValue: unknown) => T,
		defineReactiveAccessor: (propertyName: string, config: ReactiveAccessorDefinition<T>) => void,
	): void {
		const { type, attribute, reflect, defaultValue } = options;
		const attributeKey = attribute ?? propertyName;
		const hasPreUpgradeValue = this.preUpgradePropertyValues.has(propertyName);
		const preUpgradeValue = hasPreUpgradeValue ? (this.preUpgradePropertyValues.get(propertyName) as T) : undefined;

		validateReactivePropertyDefault(type, defaultValue);

		const initialValue: T | undefined = hasPreUpgradeValue
			? preUpgradeValue
			: resolveInitialValue(type, attributeKey, defaultValue);

		if (this.host.hasAttribute(attributeKey) && (!reflect || initialValue == null || initialValue === '')) {
			this.host.removeAttribute(attributeKey);
		}

		if (hasPreUpgradeValue && Object.prototype.hasOwnProperty.call(this.host, propertyName)) {
			Reflect.deleteProperty(this.host, propertyName);
		}

		const propertyMapping = createReactivePropertyMapping(propertyName, attributeKey, type, initialValue);

		this.register(propertyMapping);

		defineReactiveAccessor(propertyName, {
			bind: options.bind,
			getValue: () => this.properties.get(propertyName)?.value as T | undefined,
			setValue: (newValue: T) => {
				this.properties.set(propertyName, { ...propertyMapping, value: newValue });
				this.reflectValue(attributeKey, reflect, propertyMapping, newValue);
			},
		});

		if (initialValue !== undefined) {
			queueMicrotask(() => {
				const currentValue = this.properties.get(propertyName)?.value as T | undefined;
				if (currentValue === undefined) {
					return;
				}

				this.reflectValue(attributeKey, reflect, propertyMapping, currentValue);
				this.host.notifyUpdate(propertyName, undefined, currentValue);
			});
		}
	}

	private transformAttributeValue(value: string | null, config: ReactiveProperty): unknown {
		return value !== null ? config.converter.fromAttribute(value) : value;
	}

	private reflectValue<T>(
		attributeKey: string,
		reflect: boolean | undefined,
		property: ReactiveProperty<T>,
		value: T,
	): void {
		if (!reflect) {
			return;
		}

		if (value == null || value === '' || value === false) {
			this.host.removeAttribute(attributeKey);
			return;
		}

		const attributeValue = property.converter.toAttribute(value);
		this.host.setAttribute(attributeKey, attributeValue);
	}
}
