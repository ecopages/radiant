import type { EventEmitter } from '../tools';
import { hasHydrationMarkers, jsx, type JsxRenderable, type SubscribableJsxValue } from '@ecopages/jsx';
import type { RenderToStringOptions } from '@ecopages/jsx/server';
import type { SsrSerializableContextProvider } from '../context/context-provider';
import type { UnknownContext } from '../context/types';
import { runLegacyInstanceInitializers } from '../decorators/legacy/instance-initializers';
import { RenderRuntime, type RenderRuntimeHost } from './render-runtime';
import type { SsrSerializableHydrationBinding } from './ssr-hydration-binding';
import { ReactiveHost } from './reactive-host';
import { runSsrPreparationCallbacks } from './ssr-preparation';
import { isRadiantHydratorInstalled } from './radiant-hydrator-state';
import { getRadiantElementSsrRuntime } from './radiant-component-ssr-registry';
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

type RadiantRenderTarget = HTMLElement | ShadowRoot;
type RadiantInteractionTarget = HTMLElement | ShadowRoot;
type RadiantRenderSurface = {
	renderTarget: RadiantRenderTarget;
	interactionTarget: RadiantInteractionTarget;
	queryRoot: ParentNode;
};

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

type RadiantElementEventSubscription = RadiantElementEventListener & {
	target: EventTarget;
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
export type ReactiveBindingValue<
	Host extends object,
	Property extends StringPropertyKey<Host>,
> = Host[Property] extends JsxRenderable ? Host[Property] : JsxRenderable;

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
	readonly [Property in StringPropertyKey<Bindings>]: SubscribableJsxValue<ReactiveBindingValue<Bindings, Property>>;
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
	 * Registers a callback to run on each future host connection.
	 *
	 * The callback is only invoked from `connectedCallback()`. Registering it
	 * after the host is already connected does not invoke it immediately.
	 */
	registerConnectedCallback(callback: () => void): void;

	/**
	 * Registers a raw value reader for a reactive member so that tracked render
	 * dependencies can read the underlying value without triggering the public
	 * getter's dependency tracking.
	 */
	registerReactiveDependencyReader(property: string, read: () => unknown): void;

	/**
	 * Records a tracked read of a reactive member during a component render,
	 * allowing the signals runtime to re-render only the affected parts.
	 */
	trackReactiveRead(property: string): void;

	/**
	 * Renders a trusted HTML template string into the specified target element.
	 *
	 * **Security:** The `template` string is written to the DOM via `innerHTML`
	 * or `insertAdjacentHTML` without built-in sanitization. Callers are
	 * responsible for ensuring the input is trusted. Supply a `sanitize`
	 * function to transform the template before insertion.
	 *
	 * @param options - The rendering options.
	 * @param options.target - The target element to render the template into.
	 * @param options.template - The template string to render.
	 * @param options.insert - The position to insert the rendered template. (optional)
	 * @param options.sanitize - An optional function that transforms the template string before insertion.
	 */
	renderTemplate(options: {
		target: HTMLElement;
		template: string;
		insert?: RenderInsertPosition;
		sanitize?: (html: string) => string;
	}): void;

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
	getRef<T extends Element = Element>(ref: string, all: true): T[];
	getRef<T extends Element = Element>(ref: string, all?: false): T | null;
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
	/**
	 * Controls where the JSX render lifecycle mounts the component view.
	 *
	 * Subclasses can override this with `'shadow'` to force an internal open
	 * shadow root for client-side rendering. Host SSR helpers remain light-DOM
	 * only and throw when shadow render mode is enabled.
	 */
	protected readonly renderRootMode: 'light' | 'shadow' = 'light';
	public readonly bindings: ReactiveBindings<Bindings>;
	public readonly $: ReactiveBindings<Bindings>;
	private readonly reactiveHost: ReactiveHost<this, Bindings>;

	/**
	 * A map of property metadata objects, it contains useful information about the properties configured via decorators.
	 */
	private reactiveProperties = new Map<string, ReactiveProperty>();

	/**
	 * Registered context providers keyed by decorated property name.
	 */
	private contextProviders = new Map<string, SsrSerializableContextProvider>();

	/**
	 * Registered keyed hydration payload producers appended to SSR host output.
	 */
	private hydrationBindings = new Map<string, SsrSerializableHydrationBinding>();

	/**
	 * A map of event subscriptions used to manage event listeners on the Radiant element.
	 */
	private eventSubscriptions = new Map<string, RadiantElementEventSubscription>();

	/**
	 * A map for event emitters
	 */
	private eventEmitters = new Map<string, EventEmitter>();

	/**
	 * A flag indicating whether the element has been connected to the DOM.
	 */
	private elementReady = false;
	private isRendering = false;
	private isFirstConnectPending = false;
	private isRenderScheduled = false;
	private needsRender = false;
	private renderRuntime?: RenderRuntime;
	/**
	 * Snapshot of own-property values that existed before Radiant installs the
	 * reactive accessors for declared props.
	 *
	 * "Pre-upgrade" refers to the custom-element upgrade window where user code,
	 * SSR boot code, or another framework assigns `element.someProp = value`
	 * before the browser has finished constructing the final custom-element class
	 * instance with its accessors in place.
	 *
	 * Those early assignments land as plain own properties on the element. If we
	 * define a reactive accessor later without first capturing them, the accessor
	 * would either miss the assigned value or remain shadowed by the own property.
	 * `createReactiveProp()` consumes this snapshot so the early value becomes the
	 * prop's initial reactive state.
	 */
	private readonly preUpgradePropertyValues = new Map<string, unknown>();

	constructor() {
		super();
		for (const propertyName of Object.getOwnPropertyNames(this)) {
			this.preUpgradePropertyValues.set(propertyName, (this as Record<string, unknown>)[propertyName]);
		}

		this.reactiveHost = new ReactiveHost<this, Bindings>(
			this,
			{
				defineProperty: (target, property, descriptor) => Object.defineProperty(target, property, descriptor),
				getBindingTarget: (target) => Object.getPrototypeOf(target) ?? target,
				hasProperty: (target, property) => property in target,
				readProperty: (target, property) => (target as Record<string, unknown>)[property],
			},
			() => this.shouldAutoBindReactiveMembers(),
		);
		this.bindings = this.reactiveHost.bindings;
		this.$ = this.reactiveHost.$;
		runLegacyInstanceInitializers(this);
	}

	public get slotProjectionVersion(): number {
		return this.renderRuntime?.slotProjectionVersion ?? 0;
	}

	connectedCallback() {
		const isReconnectDuringPendingFirstConnect = this.isFirstConnectPending;

		this.elementReady = true;

		this.reactiveHost.connectHost();

		if (isReconnectDuringPendingFirstConnect) {
			return;
		}

		this.isFirstConnectPending = true;

		queueMicrotask(() => {
			this.isFirstConnectPending = false;

			if (!this.isConnected) {
				return;
			}

			if (!this.shouldRunRenderLifecycle()) {
				return;
			}

			const renderRuntime = this.getOrCreateRenderRuntime();
			renderRuntime.observeSlotProjection();

			if (shouldHydrateOnConnect(this)) {
				this.needsRender = false;
				this.hydrate();

				if (this.needsRender) {
					this.update();
				}

				return;
			}

			this.update();
		});
	}

	connectedContextCallback(_contextName: UnknownContext): void {}

	disconnectedCallback() {
		this.renderRuntime?.dispose();
		this.renderRuntime = undefined;
		this.removeAllSubscribedEvents();
		this.reactiveHost.disconnectHost();
	}

	public notifyUpdate(changedProperty: string, oldValue: unknown, value: unknown) {
		this.reactiveHost.notifyUpdate(changedProperty, oldValue, value);
	}

	private transformAttributeValue(value: string | null, config: any): unknown {
		return value !== null ? config?.converter.fromAttribute(value) : value;
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

	/**
	 * Renders a trusted HTML template string into the specified target element.
	 *
	 * **Security:** The `template` string is written to the DOM via `innerHTML`
	 * or `insertAdjacentHTML` without built-in sanitization. Callers are
	 * responsible for ensuring the input is trusted. Supply a `sanitize`
	 * function to transform the template before insertion.
	 */
	public renderTemplate({
		target = this,
		template,
		insert = 'replace',
		sanitize,
	}: {
		target: HTMLElement;
		template: string;
		insert?: RenderInsertPosition;
		sanitize?: (html: string) => string;
	}) {
		const html = sanitize ? sanitize(template) : template;
		switch (insert) {
			case 'replace':
				target.innerHTML = html;
				break;
			case 'beforeend':
				target.insertAdjacentHTML('beforeend', html);
				break;
			case 'afterbegin':
				target.insertAdjacentHTML('afterbegin', html);
				break;
			case 'beforebegin':
				target.insertAdjacentHTML('beforebegin', html);
				break;
			case 'afterend':
				target.insertAdjacentHTML('afterend', html);
				break;
		}
	}

	public render(): JsxRenderable {
		return jsx('slot', {});
	}

	private renderViewToString(options: RenderToStringOptions = {}): string {
		if (!this.shouldRunRenderLifecycle()) {
			return this.innerHTML;
		}

		this.prepareForSsr();

		return requireRadiantElementSsrRuntime().renderView(this, options);
	}

	public hydrate(): void {
		if (!this.shouldRunRenderLifecycle() || !this.isConnected || this.isRendering) {
			return;
		}

		const { renderTarget } = this.resolveRenderSurface();
		const renderRuntime = this.getOrCreateRenderRuntime();

		this.isRendering = true;

		try {
			renderRuntime.hydrate(renderTarget as HTMLElement);
		} finally {
			this.isRendering = false;
		}
	}

	public requestUpdate(): void {
		if (!this.shouldRunRenderLifecycle()) {
			return;
		}

		this.needsRender = true;

		if (this.isRenderScheduled) {
			return;
		}

		this.isRenderScheduled = true;

		queueMicrotask(() => {
			this.isRenderScheduled = false;

			if (!this.needsRender) {
				return;
			}

			this.update();
		});
	}

	public update(): void {
		if (!this.shouldRunRenderLifecycle()) {
			return;
		}

		const { renderTarget } = this.resolveRenderSurface();
		const renderRuntime = this.getOrCreateRenderRuntime();

		this.needsRender = true;

		if (!this.isConnected || this.isRendering) {
			return;
		}

		if (this.isFirstConnectPending && shouldHydrateOnConnect(this)) {
			return;
		}

		while (this.needsRender && this.isConnected) {
			this.needsRender = false;
			this.isRendering = true;

			try {
				renderRuntime.render(renderTarget as HTMLElement);
			} finally {
				this.isRendering = false;
			}
		}
	}

	public registerReactiveProperty(config: ReactiveProperty) {
		this.reactiveProperties.set(config.name, config);
	}

	protected getReactiveProperties(): ReactiveProperty[] {
		return Array.from(this.reactiveProperties.values());
	}

	public registerReactiveDependencyReader(property: string, read: () => unknown): void {
		this.reactiveHost.registerReactiveDependencyReader(property, read);
	}

	public registerContextProvider(name: string, provider: SsrSerializableContextProvider): void {
		this.contextProviders.set(name, provider);
		this.registerHydrationBinding(name, provider);
	}

	public registerHydrationBinding(name: string, binding: SsrSerializableHydrationBinding): void {
		this.hydrationBindings.set(name, binding);
	}

	protected getContextProviders(): SsrSerializableContextProvider[] {
		return Array.from(this.contextProviders.values());
	}

	protected getHydrationBindings(): SsrSerializableHydrationBinding[] {
		return Array.from(this.hydrationBindings.values());
	}

	/**
	 * Flushes any deferred SSR-only preparation work before the host is
	 * serialized.
	 *
	 * Radiant uses this to reapply SSR consumer state after construction so the
	 * first server render sees finalized fields, props, and authored content.
	 */
	protected prepareForSsr(): void {
		runSsrPreparationCallbacks(this);
	}

	/**
	 * Returns the default JSX binding policy for reactive members on this host.
	 *
	 * `RadiantElement` hosts default to automatic bindings for reactive members
	 * when no explicit `bind` option is supplied.
	 *
	 * Lower-level hosts can override this hook to opt out when they want binding
	 * creation to stay fully explicit across `@prop`, `@state`, and direct
	 * `createReactiveProp`/`createReactiveField` calls.
	 */
	protected shouldAutoBindReactiveMembers(): boolean {
		return true;
	}

	protected shouldRunRenderLifecycle(): boolean {
		return this.render !== RadiantElement.prototype.render;
	}

	/** Returns the DOM root used by client-side render and hydrate work. */
	protected getRenderTarget(): RadiantRenderTarget {
		if (this.renderRootMode !== 'shadow') {
			return this;
		}

		if (this.shadowRoot) {
			return this.shadowRoot;
		}

		if (typeof this.attachShadow !== 'function') {
			throw new Error('RadiantElement shadow render mode requires attachShadow().');
		}

		return this.attachShadow({ mode: 'open' });
	}

	public registerUpdateCallback(property: string, update: (...rest: any[]) => any): () => void {
		return this.reactiveHost.registerUpdateCallback(property, update);
	}

	public getReactiveBinding<Property extends StringPropertyKey<Bindings>>(
		property: Property,
	): SubscribableJsxValue<ReactiveBindingValue<Bindings, Property>> {
		return this.reactiveHost.getReactiveBinding(property);
	}

	public bind<Property extends StringPropertyKey<Bindings>>(
		property: Property,
	): SubscribableJsxValue<ReactiveBindingValue<Bindings, Property>> {
		return this.reactiveHost.bind(property);
	}

	public defineReactiveBinding(property: string, bind: ReactiveBindingOption = true): void {
		this.reactiveHost.defineReactiveBinding(property, bind);
	}

	public trackReactiveRead(property: string): void {
		this.reactiveHost.trackReactiveRead(property);
	}

	public subscribeEvents(events: RadiantElementEventListener[]): Array<() => void> {
		const unsubscribers: Array<() => void> = [];
		for (const event of events) {
			unsubscribers.push(this.subscribeEvent(event));
		}
		return unsubscribers;
	}

	public subscribeEvent(eventConfig: RadiantElementEventListener): () => void {
		const { interactionTarget } = this.resolveRenderSurface();
		const delegatedListener = (delegatedEvent: Event) => {
			if (delegatedEvent.target && (delegatedEvent.target as Element).matches(eventConfig.selector)) {
				eventConfig.listener.call(this, delegatedEvent);
			}
		};
		const subscriptionId = `${eventConfig.type}:${eventConfig.selector}`;
		interactionTarget.addEventListener(eventConfig.type, delegatedListener, eventConfig.options);
		this.eventSubscriptions.set(subscriptionId, {
			...eventConfig,
			listener: delegatedListener,
			target: interactionTarget,
		});

		return this.unsubscribeEvent.bind(this, subscriptionId);
	}

	private unsubscribeEvent(id: string): void {
		const eventSubscription = this.eventSubscriptions.get(id);
		if (eventSubscription) {
			eventSubscription.target.removeEventListener(
				eventSubscription.type,
				eventSubscription.listener,
				eventSubscription.options,
			);
			this.eventSubscriptions.delete(id);
		}
	}

	private removeAllSubscribedEvents(): void {
		for (const eventSubscription of this.eventSubscriptions.values()) {
			eventSubscription.target.removeEventListener(
				eventSubscription.type,
				eventSubscription.listener,
				eventSubscription.options,
			);
		}
		this.eventSubscriptions.clear();
	}

	/**
	 * Registers a callback that runs on every future disconnect.
	 */
	public registerCleanupCallback(callback: () => void): void {
		this.reactiveHost.registerCleanupCallback(callback);
	}

	/**
	 * Registers a callback that runs from `connectedCallback()` on future host
	 * connections.
	 *
	 * Registering after the host is already connected does not invoke the
	 * callback immediately.
	 */
	public registerConnectedCallback(callback: () => void): void {
		this.reactiveHost.registerConnectedCallback(callback);
	}

	public registerEventEmitter(name: string, emitter: EventEmitter) {
		this.eventEmitters.set(name, emitter);
	}

	public getRef<T extends Element = Element>(ref: string, all: true): T[];
	public getRef<T extends Element = Element>(ref: string, all?: false): T | null;
	public getRef<T extends Element = Element>(ref: string, all = false): T | T[] | null {
		const selector = `[data-ref="${ref}"]`;
		const { queryRoot } = this.resolveRenderSurface();
		if (all) {
			return Array.from(queryRoot.querySelectorAll(selector)) as T[];
		}
		return (queryRoot.querySelector(selector) as T) ?? null;
	}

	public getSlotElement<T extends Element = Element>(name?: string): T | null {
		return this.getOrCreateRenderRuntime().getSlotElement<T>(name);
	}

	public getSlotElements<T extends Element = Element>(name?: string): T[] {
		return this.getOrCreateRenderRuntime().getSlotElements<T>(name);
	}

	public createReactiveField<T>(propertyName: string, initialValue: T, options: ReactiveFieldOptions = {}): void {
		this.reactiveHost.createReactiveField(propertyName, initialValue, options);
	}

	/**
	 * Defines a reactive custom-element property backed by a Radiant accessor.
	 *
	 * When the host was assigned a value before upgrade, that pre-upgrade value is
	 * preferred over attribute parsing and `defaultValue` so early `.prop = value`
	 * writes survive into the reactive lifecycle.
	 */
	public createReactiveProp<T = unknown>(propertyName: string, options: ReactivePropertyOptions<T>): void {
		const { type, attribute, reflect, defaultValue } = options;
		const attributeKey = attribute ?? propertyName;
		const hasPreUpgradeValue = this.preUpgradePropertyValues.has(propertyName);
		const preUpgradeValue = hasPreUpgradeValue ? (this.preUpgradePropertyValues.get(propertyName) as T) : undefined;

		if (defaultValue !== undefined && !isValueOfType(type, defaultValue)) {
			throw new Error(`defaultValue does not match the expected type for ${type.name}`);
		}

		const initialValue: T | undefined = hasPreUpgradeValue
			? preUpgradeValue
			: (getInitialValue(this, type, attributeKey, defaultValue) as T);

		if (this.hasAttribute(attributeKey) && (!reflect || initialValue == null || initialValue === '')) {
			this.removeAttribute(attributeKey);
		}

		if (hasPreUpgradeValue && Object.prototype.hasOwnProperty.call(this, propertyName)) {
			Reflect.deleteProperty(this, propertyName);
		}

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

		const handleReflectRequest = (value: T) => {
			if (reflect) {
				if (value == null || value === '' || value === false) {
					this.removeAttribute(attributeKey);
				} else {
					const attributeValue = propertyMapping.converter.toAttribute(value);
					this.setAttribute(attributeKey, attributeValue);
				}
			}
		};

		this.reactiveHost.defineReactiveAccessor(propertyName, {
			bind: options.bind,
			getValue: () => this.reactiveProperties.get(propertyName)?.value as T | undefined,
			setValue: (newValue: T) => {
				this.reactiveProperties.set(propertyName, { ...propertyMapping, value: newValue });
				handleReflectRequest(newValue);
			},
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

	private getSlotProjectionScriptTag(): string | undefined {
		return this.getOrCreateRenderRuntime().getSlotProjectionScriptTag();
	}

	private getAuthoredHydrationScriptMarkup(): string | undefined {
		return this.getOrCreateRenderRuntime().getAuthoredHydrationScriptMarkup();
	}

	private resolveTrackedRenderOutput(): { containsSlots: boolean; value: JsxRenderable } {
		return this.getOrCreateRenderRuntime().resolveTrackedRenderOutput();
	}

	private getOrCreateRenderRuntime() {
		if (this.renderRuntime) {
			return this.renderRuntime;
		}

		this.renderRuntime = new RenderRuntime(this as RenderRuntimeHost);
		return this.renderRuntime;
	}

	private resolveRenderSurface(): RadiantRenderSurface {
		const renderTarget = this.getRenderTarget();
		const interactionTarget = renderTarget instanceof ShadowRoot ? renderTarget : this;

		return {
			interactionTarget,
			queryRoot: interactionTarget,
			renderTarget,
		};
	}
}

function requireRadiantElementSsrRuntime() {
	const runtime = getRadiantElementSsrRuntime();

	if (!runtime) {
		throw new Error(
			'Radiant SSR runtime is unavailable. Import `@ecopages/radiant/server/render-component` before using server rendering helpers.',
		);
	}

	return runtime;
}

function shouldHydrateOnConnect(component: HTMLElement): boolean {
	return isRadiantHydratorInstalled() && hasHydrationMarkers(component);
}
