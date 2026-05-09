import type { EventEmitter } from '../tools';
import { hasHydrationMarkers, jsx, type JsxRenderable, type SubscribableJsxValue } from '@ecopages/jsx';
import type { RenderToStringOptions } from '@ecopages/jsx/server';
import type { SsrSerializableContextProvider } from '../context/context-provider';
import type { UnknownContext } from '../context/types';
import { runLegacyInstanceInitializers } from '../decorators/legacy/instance-initializers';
import {
	createReactivePropertyMapping,
	type ReactiveAccessorDefinition,
	type ReactiveBindingOption,
	type ReactiveBindingValue,
	type ReactiveBindings,
	type ReactiveFieldOptions,
	type ReactiveProperty,
	type ReactivePropertyOptions,
	validateReactivePropertyDefault,
} from './reactive-prop-core';
import { RenderRuntime, type RenderRuntimeHost } from './render-runtime';
import type { SsrSerializableHydrationBinding } from './ssr-hydration-binding';
import { ReactiveHost } from './reactive-host';
import { runSsrPreparationCallbacks } from './ssr-preparation';
import { isRadiantHydratorInstalled } from './radiant-hydrator-state';
import { getRadiantElementSsrRuntime } from './radiant-component-ssr-registry';
import { type AttributeTypeConstant, getInitialValue } from '../utils/attribute-utils';

export type {
	ReactiveBindingOption,
	ReactiveBindingValue,
	ReactiveBindings,
	ReactiveField,
	ReactiveFieldOptions,
	ReactiveProperty,
	ReactivePropertyOptions,
} from './reactive-prop-core';

const RadiantElementBase = resolveRadiantElementBase();

type RadiantRenderTarget = HTMLElement | ShadowRoot;
type RadiantInteractionTarget = HTMLElement | ShadowRoot;
type RadiantRenderSurface = {
	renderTarget: RadiantRenderTarget;
	interactionTarget: RadiantInteractionTarget;
	queryRoot: ParentNode;
};
type ReactivePropertyStateHost = HTMLElement & {
	notifyUpdate(changedProperty: string, oldValue: unknown, value: unknown): void;
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

type StringPropertyKey<Value> = Extract<keyof Value, string>;

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
	private readonly reactivePropertyState: ReactivePropertyState;

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

	constructor() {
		super();
		this.reactivePropertyState = new ReactivePropertyState(this);

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

	attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
		if (oldValue === newValue || !this.elementReady) return;

		this.reactivePropertyState.applyAttributeChange(name, oldValue, newValue);
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
		this.reactivePropertyState.register(config);
	}

	protected getReactiveProperties(): ReactiveProperty[] {
		return this.reactivePropertyState.getAll();
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
		this.reactivePropertyState.create(
			propertyName,
			options,
			(type, attributeKey, defaultValue) => getInitialValue(this, type, attributeKey, defaultValue) as T,
			(name, config) => {
				this.reactiveHost.defineReactiveAccessor(name, config);
			},
		);
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

class ReactivePropertyState {
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
