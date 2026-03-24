import type { EventEmitter } from '../tools';
import { createSubscribableJsxValue, type JsxRenderable, type SubscribableJsxValue } from '@ecopages/jsx';
import type { SsrSerializableContextProvider } from '../context/context-provider';
import type { UnknownContext } from '../context/types';
import { runLegacyInstanceInitializers } from '../decorators/legacy/instance-initializers';
import {
	type AttributeTypeConstant,
	type ReadAttributeValueReturnType,
	type WriteAttributeValueReturnType,
	getInitialValue,
	isValueOfType,
	readAttributeValue,
	writeAttributeValue,
} from '../utils/attribute-utils';

const RadiantElementBase = resolveRadiantElementBase();

function resolveRadiantElementBase(): typeof HTMLElement {
	if (typeof HTMLElement !== 'undefined') {
		return HTMLElement;
	}

	throw new Error(
		"RadiantElement requires HTMLElement. Install '@ecopages/radiant/server/light-dom-shim' before importing Radiant components in SSR.",
	);
}

/**
 * Possible positions to insert a rendered template.
 */
export type RenderInsertPosition = 'replace' | 'beforebegin' | 'afterbegin' | 'beforeend' | 'afterend';

/**
 * Represents a Radiant element event listener.
 */
export type RadiantElementEventListener = {
	selector: string;
	type: string;
	listener: EventListener;
	options?: AddEventListenerOptions;
};

/**
 * Represents a property metadata object.
 */
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

/**
 * Represents the options for a reactive property.
 */
export type ReactivePropertyOptions<T> = {
	type: AttributeTypeConstant;
	reflect?: boolean;
	attribute?: string;
	defaultValue?: T;
	/**
	 * Exposes a JSX binding companion for the reactive property.
	 *
	 * - `true` creates a `$propertyName` accessor.
	 * - a string creates a custom accessor with that name.
	 * - `undefined` defers to the host default.
	 *
	 * The generated accessor returns a subscribable JSX child value so JSX can
	 * patch only the affected child part when the property changes.
	 */
	bind?: boolean | string;
};

export type ReactiveBindingOption = boolean | string;

export type ReactiveFieldOptions = {
	/**
	 * Exposes a JSX binding companion for the reactive field.
	 *
	 * - `true` creates a `$fieldName` accessor.
	 * - a string creates a custom accessor with that name.
	 * - `undefined` defers to the host default.
	 */
	bind?: ReactiveBindingOption;
};

export type ReactiveField<T = unknown> = {
	name: string;
	value: T;
	initialValue: T;
};

type StringPropertyKey<Value> = Extract<keyof Value, string>;

/**
 * Value type produced by a JSX binding for a selected reactive member.
 *
 * Bindings preserve the original property type when it is already renderable by
 * the Ecopages JSX runtime. For non-renderable values, the binding falls back
 * to the broader `JsxRenderable` contract consumed by the renderer.
 */
export type ReactiveBindingValue<Host extends object, Property extends StringPropertyKey<Host>> =
	Host[Property] extends JsxRenderable ? Host[Property] : JsxRenderable;

/**
 * Namespace of cached JSX bindings keyed by the explicit bindable shape.
 *
 * Radiant exposes this namespace twice on every host:
 *
 * - `host.bindings.key` for the explicit form
 * - `host.$.key` for the short form
 *
 * Both aliases resolve through the same cached binding objects as
 * `host.bind('key')`.
 */
export type ReactiveBindings<Bindings extends object> = {
	readonly [Property in StringPropertyKey<Bindings>]: SubscribableJsxValue<
		ReactiveBindingValue<Bindings, Property>
	>;
};

/**
 * Represents an interface for a Radiant element.
 * @typeParam Bindings - Explicit internal bindable shape used to type `bind()` and `getReactiveBinding()`.
 *
 * This shape describes which reactive members are exposed through `bindings`,
 * `$`, and `bind(...)`. It does not automatically define the public JSX
 * attribute contract for the custom element.
 */
export interface IRadiantElement<Bindings extends object = {}> {
	/**
	 * Namespace of cached JSX bindings keyed by the explicit bindable shape.
	 */
	readonly bindings: ReactiveBindings<Bindings>;

	/**
	 * Short alias for {@link bindings}.
	 */
	readonly $: ReactiveBindings<Bindings>;

	/**
	 * Called when a property of the element is updated.
	 * @param changedProperty - The name of the changed property.
	 * @param oldValue - The old value of the property.
	 * @param newValue - The new value of the property.
	 */
	notifyUpdate(changedProperty: string, oldValue: unknown, newValue: unknown): void;

	/**
	 * Subscribes to a Radiant element event.
	 * @param event - The event listener to subscribe to.
	 */
	subscribeEvent(event: RadiantElementEventListener): void;

	/**
	 * Registers a callback to be invoked when a reactive property or field changes.
	 *
	 * @returns A cleanup function that unregisters the callback.
	 */
	registerUpdateCallback(property: string, update: (...rest: any[]) => any): () => void;

	/**
	 * Returns a subscribable JSX child binding for a reactive property or field.
	 *
	 * Prefer `this.bindings.key` or `this.$.key` in JSX render code when you want
	 * property access syntax without string literals.
	 */
	bind<Property extends StringPropertyKey<Bindings>>(
		property: Property,
	): SubscribableJsxValue<ReactiveBindingValue<Bindings, Property>>;

	/**
	 * Returns a subscribable JSX child binding for a reactive property or field.
	 *
	 * This is the primitive lookup used by `bind()`, `bindings.key`, and `$.key`.
	 */
	getReactiveBinding<Property extends StringPropertyKey<Bindings>>(
		property: Property,
	): SubscribableJsxValue<ReactiveBindingValue<Bindings, Property>>;

	/**
	 * Defines a stable JSX binding companion accessor for a reactive member.
	 *
	 * Companion bindings create properties such as `$count` directly on the host.
	 * Prefer the `bindings` or `$` namespace for new code when you want typed,
	 * explicit access to the configured bindable shape.
	 */
	defineReactiveBinding(property: string, bind?: ReactiveBindingOption): void;

	/**
	 * Subscribes to multiple Radiant element events.
	 * @param events - The array of event listeners to subscribe to.
	 */
	subscribeEvents(events: RadiantElementEventListener[]): void;

	/**
	 * It adds a callback to be executed when the Radiant element is disconnected from the DOM.
	 */
	registerCleanupCallback(callback: () => void): void;

	/**
	 * Renders a template into the specified target element.
	 * @param options - The rendering options.
	 * @param options.target - The target element to render the template into.
	 * @param options.template - The template string to render.
	 * @param options.insert - The position to insert the rendered template. (optional)
	 */
	renderTemplate(options: { target: HTMLElement; template: string; insert?: RenderInsertPosition }): void;

	/**
	 * Called when the Radiant element is connected to a context.
	 * @param context - The connected context.
	 */
	connectedContextCallback(context: UnknownContext): void;

	/**
	 * Gets a reference to a child element by its data-ref attribute.
	 * @param ref - The data-ref attribute value of the element to get.
	 * @param all - Whether to get all elements with the specified data-ref attribute value.
	 * @returns The element with the specified data-ref attribute value, an array of elements or null if no element was found.
	 */
	getRef<T extends Element = Element>(ref: string, all: boolean): T | T[];
}

/**
 * A base class for creating custom elements with reactive properties and event subscriptions.
 * @typeParam Bindings - Explicit internal bindable shape. Include only the
 * prop/state keys that JSX bindings should accept.
 *
 * Prefer a separate public props type for custom-element JSX declarations when
 * the external attribute contract differs from the component's internal
 * reactive state. Reuse the same type only when the public props and bindable
 * members are intentionally identical.
 * @extends HTMLElement
 * @implements IRadiantElement<Bindings>
 */
export class RadiantElement<Bindings extends object = {}>
	extends RadiantElementBase
	implements IRadiantElement<Bindings>
{
	public readonly bindings: ReactiveBindings<Bindings>;
	public readonly $: ReactiveBindings<Bindings>;

	/**
	 * A map of property metadata objects, it contains useful information about the properties configured via decorators.
	 */
	private reactiveProperties = new Map<string, ReactiveProperty>();

	/**
	 * A map of reactive fields, it contains the reactive fields configured via decorators.
	 */
	private reactiveFields = new Map<string, ReactiveField>();

	/**
	 * Stable subscribable JSX bindings keyed by reactive property name.
	 */
	private reactiveBindings = new Map<string, SubscribableJsxValue>();

	/**
	 * Registered context providers keyed by decorated property name.
	 */
	private contextProviders = new Map<string, SsrSerializableContextProvider>();

	/**
	 * A map of property update callbacks. These callbacks are called when a property is updated.
	 */
	private updateCallbacks = new Map<string, Set<(...rest: any[]) => any>>();

	/**
	 * A map of event subscriptions used to manage event listeners on the Radiant element.
	 */
	private eventSubscriptions = new Map<string, RadiantElementEventListener>();

	/**
	 * A map for event emitters
	 */
	private eventEmitters = new Map<string, EventEmitter>();

	/**
	 * An array of cleanup callbacks to be executed when the Radiant element is disconnected from the DOM.
	 */
	private onDisconnectedCallback: (() => void)[] = [];

	/**
	 * A flag indicating whether the element has been connected to the DOM.
	 */
	private elementReady = false;

	constructor() {
		super();
		const bindingNamespace = this.createReactiveBindingNamespace();
		this.bindings = bindingNamespace;
		this.$ = bindingNamespace;
		runLegacyInstanceInitializers(this);
	}

	private createReactiveBindingNamespace(): ReactiveBindings<Bindings> {
		return new Proxy(Object.create(null) as ReactiveBindings<Bindings>, {
			get: (_target, property) => {
				if (typeof property !== 'string') {
					return undefined;
				}

				return this.getReactiveBinding(property as StringPropertyKey<Bindings>);
			},
		}) as ReactiveBindings<Bindings>;
	}

	connectedCallback() {
		this.elementReady = true;
	}

	connectedContextCallback(_contextName: UnknownContext): void {}

	disconnectedCallback() {
		this.removeAllSubscribedEvents();
		for (const cleanup of this.onDisconnectedCallback) {
			cleanup();
		}
	}

	public notifyUpdate(changedProperty: string, oldValue: unknown, value: unknown) {
		if (!this.updateCallbacks || oldValue === value) return;
		const updates = this.updateCallbacks.get(changedProperty);

		if (updates) {
			for (const update of updates) {
				update();
			}
		}
	}

	private transformAttributeValue(value: string | null, config: any): unknown {
		return value ? config?.converter.fromAttribute(value) : value;
	}

	attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
		if (oldValue === newValue || !this.elementReady) return;

		if (this.reactiveProperties.has(name)) {
			const config = this.reactiveProperties.get(name);

			const transformedValue = this.transformAttributeValue(newValue, config);
			const transformedOldValue = this.transformAttributeValue(oldValue, config);

			const key = config ? config.attribute : name;
			(this as any)[key] = transformedValue;
			this.notifyUpdate(name, transformedOldValue, transformedValue);
		}
	}

	public renderTemplate({
		target = this,
		template,
		insert = 'replace',
	}: {
		target: HTMLElement;
		template: string;
		insert?: RenderInsertPosition;
	}) {
		switch (insert) {
			case 'replace':
				target.innerHTML = template;
				break;
			case 'beforeend':
				target.insertAdjacentHTML('beforeend', template);
				break;
			case 'afterbegin':
				target.insertAdjacentHTML('afterbegin', template);
				break;
		}
	}

	public registerReactiveProperty(config: ReactiveProperty) {
		this.reactiveProperties.set(config.name, config);
	}

	protected getReactiveProperties(): ReactiveProperty[] {
		return Array.from(this.reactiveProperties.values());
	}

	public registerReactiveField<T>(config: ReactiveField<T>) {
		this.reactiveFields.set(config.name, config);
	}

	public registerContextProvider(name: string, provider: SsrSerializableContextProvider): void {
		this.contextProviders.set(name, provider);
	}

	protected getContextProviders(): SsrSerializableContextProvider[] {
		return Array.from(this.contextProviders.values());
	}

	/**
	 * Returns the default JSX binding policy for reactive members on this host.
	 *
	 * Plain `RadiantElement` instances keep binding opt-in. JSX-first hosts such
	 * as `RadiantComponent` override this hook to opt into automatic bindings for
	 * `@prop`, `@state`, and direct `createReactiveProp`/`createReactiveField`
	 * calls when no explicit `bind` option is supplied.
	 */
	protected shouldAutoBindReactiveMembers(): boolean {
		return false;
	}

	public registerUpdateCallback(property: string, update: (...rest: any[]) => any): () => void {
		if (!this.updateCallbacks.has(property)) {
			this.updateCallbacks.set(property, new Set());
		}

		const callbacks = this.updateCallbacks.get(property)!;
		callbacks.add(update);

		return () => {
			callbacks.delete(update);

			if (callbacks.size === 0) {
				this.updateCallbacks.delete(property);
			}
		};
	}

	public getReactiveBinding<Property extends StringPropertyKey<Bindings>>(
		property: Property,
	): SubscribableJsxValue<ReactiveBindingValue<Bindings, Property>> {
		const cachedBinding = this.reactiveBindings.get(property);

		if (cachedBinding) {
			return cachedBinding as SubscribableJsxValue<ReactiveBindingValue<Bindings, Property>>;
		}

		const host = this as unknown as Record<string, unknown>;
		const binding = createSubscribableJsxValue<ReactiveBindingValue<Bindings, Property>>({
			getValue: () => host[property] as ReactiveBindingValue<Bindings, Property>,
			subscribe: (notify) =>
				this.registerUpdateCallback(property, () => {
					notify(host[property] as ReactiveBindingValue<Bindings, Property>);
				}),
		});

		this.reactiveBindings.set(property, binding);
		return binding;
	}

	public bind<Property extends StringPropertyKey<Bindings>>(
		property: Property,
	): SubscribableJsxValue<ReactiveBindingValue<Bindings, Property>> {
		return this.getReactiveBinding(property) as SubscribableJsxValue<ReactiveBindingValue<Bindings, Property>>;
	}

	public defineReactiveBinding(property: string, bind: ReactiveBindingOption = true): void {
		const bindingPropertyName = typeof bind === 'string' ? bind : bind ? `$${property}` : undefined;

		if (!bindingPropertyName || Object.prototype.hasOwnProperty.call(this, bindingPropertyName)) {
			return;
		}

		Object.defineProperty(this, bindingPropertyName, {
			get: function (this: RadiantElement<Bindings>) {
				return this.getReactiveBinding(property as StringPropertyKey<Bindings>);
			},
			enumerable: false,
			configurable: true,
		});
	}

	public subscribeEvents(events: RadiantElementEventListener[]): Array<() => void> {
		const unsubscribers: Array<() => void> = [];
		for (const event of events) {
			unsubscribers.push(this.subscribeEvent(event));
		}
		return unsubscribers;
	}

	public subscribeEvent(eventConfig: RadiantElementEventListener): () => void {
		const delegatedListener = (delegatedEvent: Event) => {
			if (delegatedEvent.target && (delegatedEvent.target as Element).matches(eventConfig.selector)) {
				eventConfig.listener.call(this, delegatedEvent);
			}
		};
		const subscriptionId = `${eventConfig.type}:${eventConfig.selector}`;
		this.addEventListener(eventConfig.type, delegatedListener, eventConfig.options);
		this.eventSubscriptions.set(subscriptionId, {
			...eventConfig,
			listener: delegatedListener,
		});

		return this.unsubscribeEvent.bind(this, subscriptionId);
	}

	private unsubscribeEvent(id: string): void {
		const eventSubscription = this.eventSubscriptions.get(id);
		if (eventSubscription) {
			this.removeEventListener(eventSubscription.type, eventSubscription.listener, eventSubscription.options);
			this.eventSubscriptions.delete(id);
		}
	}

	private removeAllSubscribedEvents(): void {
		for (const eventSubscription of this.eventSubscriptions.values()) {
			this.removeEventListener(eventSubscription.type, eventSubscription.listener, eventSubscription.options);
		}
		this.eventSubscriptions.clear();
	}

	public registerCleanupCallback(callback: () => void): void {
		this.onDisconnectedCallback.push(callback);
	}

	public registerEventEmitter(name: string, emitter: EventEmitter) {
		this.eventEmitters.set(name, emitter);
	}

	public getRef<T extends Element = Element>(ref: string, all: true): T[];
	public getRef<T extends Element = Element>(ref: string, all?: false): T;
	public getRef<T extends Element = Element>(ref: string, all = false): T | T[] {
		const selector = `[data-ref="${ref}"]`;
		let result: T | T[];
		if (all) {
			result = Array.from(this.querySelectorAll(selector)) as T[];
			if (result.length === 0) result = [];
		} else {
			result = this.querySelector(selector) as T;
			if (!result) {
				const fragment = document.createDocumentFragment();
				result = fragment as unknown as T;
			}
		}
		return result;
	}

	public createReactiveField<T>(propertyName: string, initialValue: T, options: ReactiveFieldOptions = {}): void {
		const bind = options.bind ?? this.shouldAutoBindReactiveMembers();
		const reactiveField: ReactiveField<T> = {
			name: propertyName,
			value: initialValue,
			initialValue: initialValue,
		};

		this.registerReactiveField(reactiveField);
		this.defineReactiveBinding(propertyName, bind);

		Object.defineProperty(this, propertyName, {
			get(this: RadiantElement) {
				return this.reactiveFields.get(propertyName)?.value ?? undefined;
			},
			set(this: RadiantElement, newValue: T) {
				const oldValue = this.reactiveFields.get(propertyName)?.value;
				if (oldValue !== newValue) {
					this.reactiveFields.set(propertyName, { ...reactiveField, value: newValue });
					this.notifyUpdate(propertyName, oldValue, newValue);
				}
			},
			enumerable: true,
			configurable: true,
		});

		this.notifyUpdate(propertyName, undefined, initialValue);
	}

	public createReactiveProp<T = unknown>(propertyName: string, options: ReactivePropertyOptions<T>): void {
		const { type, attribute, reflect, defaultValue } = options;
		const bind = options.bind ?? this.shouldAutoBindReactiveMembers();
		const attributeKey = attribute ?? propertyName;

		if (defaultValue !== undefined && !isValueOfType(type, defaultValue)) {
			throw new Error(`defaultValue does not match the expected type for ${type.name}`);
		}

		const initialValue: T | undefined = getInitialValue(this, type, attributeKey, defaultValue) as T;

		const propertyMapping: ReactiveProperty<T> = {
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

		this.registerReactiveProperty(propertyMapping);
		this.defineReactiveBinding(propertyName, bind);

		const handleReflectRequest = (value: T) => {
			if (reflect) {
				const attributeValue = propertyMapping.converter.toAttribute(value);
				this.setAttribute(attributeKey, attributeValue);
			}
		};

		Object.defineProperty(this, propertyName, {
			get: function (this: RadiantElement) {
				return this.reactiveProperties.get(propertyName)?.value ?? undefined;
			},
			set: function (this: RadiantElement, newValue: T) {
				const oldValue = this.reactiveProperties.get(propertyName)?.value;
				if (oldValue !== newValue) {
					this.reactiveProperties.set(propertyName, { ...propertyMapping, value: newValue });
					handleReflectRequest(newValue);
					this.notifyUpdate(propertyName, oldValue, newValue);
				}
			},
			enumerable: true,
			configurable: true,
		});

		if (initialValue !== undefined) {
			queueMicrotask(() => {
				const currentValue = this.reactiveProperties.get(propertyName)?.value as T | undefined;
				if (currentValue === undefined) {
					return;
				}

				handleReflectRequest(currentValue);
				this.notifyUpdate(propertyName, undefined, currentValue);
			});
		}
	}
}
