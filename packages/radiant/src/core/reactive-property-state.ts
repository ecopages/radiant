import {
	createReactivePropertyMapping,
	type ReactiveAccessorDefinition,
	type ReactiveProperty,
	type ReactivePropertyOptions,
	validateReactivePropertyDefault,
} from './reactive-prop-core';
import type { ReactiveState } from './reactivity-contract';
import type { AttributeTypeConstant } from '../utils/attribute-utils';

export type ReactivePropertyStateHost = HTMLElement & {
	notifyUpdate(changedProperty: string, oldValue: unknown, value: unknown): void;
	createReactiveMember<T>(propertyName: string, initialValue: T): ReactiveState<T>;
	getReactiveMember<T = unknown>(propertyName: string): ReactiveState<T> | undefined;
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
		const config =
			this.properties.get(name) ??
			Array.from(this.properties.values()).find((property) => property.attribute === name);

		if (!config) {
			return;
		}

		const transformedValue = this.transformAttributeValue(newValue, config);

		Reflect.set(this.host, config.name, transformedValue);
	}

	/**
	 * @remarks
	 * A pre-upgrade own-property assignment is the initial signal value. Non-reflected
	 * attributes are consumed and dropped so a later `attributeChangedCallback` cannot
	 * fight the property. Reflected attributes stay until {@link completeInitialSync}
	 * so an empty `defaultValue` cannot strip an authored `value="ts"`.
	 */
	public create<T>(
		propertyName: string,
		options: ReactivePropertyOptions<T>,
		resolveInitialValue: (type: AttributeTypeConstant, attributeKey: string, defaultValue: unknown) => T,
		defineReactiveAccessor: (propertyName: string, config: ReactiveAccessorDefinition<T>) => void,
		createReactiveMember: <U>(propertyName: string, initialValue: U) => ReactiveState<U>,
	): void {
		const { type, attribute, reflect, defaultValue } = options;
		const attributeKey = attribute ?? propertyName;
		const hasPreUpgradeValue = this.preUpgradePropertyValues.has(propertyName);
		const preUpgradeValue = hasPreUpgradeValue ? (this.preUpgradePropertyValues.get(propertyName) as T) : undefined;

		validateReactivePropertyDefault(type, defaultValue);

		const initialValue: T | undefined = hasPreUpgradeValue
			? preUpgradeValue
			: resolveInitialValue(type, attributeKey, defaultValue);

		if (!reflect && this.host.hasAttribute(attributeKey)) {
			this.host.removeAttribute(attributeKey);
		}

		if (hasPreUpgradeValue && Object.prototype.hasOwnProperty.call(this.host, propertyName)) {
			Reflect.deleteProperty(this.host, propertyName);
		}

		const propertyMapping = createReactivePropertyMapping(propertyName, attributeKey, type, initialValue, reflect);

		this.register(propertyMapping);

		const existingMember = this.host.getReactiveMember<T>(propertyName);
		const signal = existingMember ?? createReactiveMember(propertyName, initialValue as T);

		if (existingMember && initialValue !== undefined) {
			existingMember.set(initialValue as T);
		}

		defineReactiveAccessor(propertyName, {
			bind: options.bind,
			signal,
			onSet: () => this.reflectValue(attributeKey, propertyMapping.reflect, propertyMapping, signal.get()),
		});
	}

	/**
	 * Adopts authored attributes, then reflects current values and emits the
	 * initial `@onUpdated`.
	 *
	 * @remarks
	 * Construction can run before parser/JSX attributes land. Reflecting
	 * `defaultValue` from the constructor would overwrite e.g. `variant="ghost"`
	 * or strip an authored `value="ts"` when `defaultValue` is `""`. First-connect
	 * adopts those attributes unless an own property was assigned before upgrade;
	 * this then reflects whatever the host actually holds.
	 */
	public completeInitialSync(): void {
		this.adoptAuthoredAttributes();

		for (const property of this.properties.values()) {
			const signal = this.host.getReactiveMember(property.name);
			if (!signal) {
				continue;
			}

			const currentValue = signal.get();
			if (currentValue === undefined) {
				continue;
			}

			this.reflectValue(property.attribute, property.reflect, property, currentValue);
			this.host.notifyUpdate(property.name, undefined, currentValue);
		}
	}

	/**
	 * @remarks
	 * Parser/JSX attributes often land after `constructor`. Skip properties that
	 * already hold a pre-upgrade own-property assignment so a different or empty
	 * attribute cannot overwrite it.
	 */
	private adoptAuthoredAttributes(): void {
		for (const property of this.properties.values()) {
			if (this.preUpgradePropertyValues.has(property.name)) {
				continue;
			}

			const currentValue = this.host.getAttribute(property.attribute);
			if (currentValue !== null) {
				this.applyAttributeChange(property.attribute, null, currentValue);
			}
		}
	}

	/**
	 * @remarks
	 * Boolean attributes are presence-based: removal must yield `false`, not `null`.
	 * Otherwise reflecting `false` → `removeAttribute` → `attributeChangedCallback`
	 * sets the property to `null`, and callers like `String(this.open)` become `"null"`.
	 */
	private transformAttributeValue(value: string | null, config: ReactiveProperty): unknown {
		if (value === null) {
			return config.type === Boolean ? false : value;
		}

		if (config.type === Boolean && value === '') {
			return true;
		}

		return config.converter.fromAttribute(value);
	}

	private reflectValue<T>(attributeKey: string, reflect: boolean, property: ReactiveProperty<T>, value: T): void {
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
